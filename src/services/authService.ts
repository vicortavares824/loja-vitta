// src/services/authService.ts
import type { LoginCredentials, SignUpData, User, UserRole } from '../types/ecommerce';
import { observability } from './observability';
import { supabase } from '../config/supabase';

/**
 * Resolves a Supabase user to our local User type.
 * Role is fetched from the `profiles` table (server-side source of truth),
 * with a fallback to user_metadata for JWT compatibility during refresh lag.
 */
async function resolveUserWithRole(supabaseUser: any): Promise<User> {
  const meta = supabaseUser.user_metadata || {};

  // Fetch the authoritative role from the profiles table (never trusts the client)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', supabaseUser.id)
    .single();

  const role: UserRole = (profile?.role as UserRole) || (meta.role as UserRole) || 'customer';

  return {
    id: supabaseUser.id,
    name: meta.name || supabaseUser.email?.split('@')[0] || 'Usuário',
    email: supabaseUser.email || '',
    role,
  };
}

/**
 * Lightweight sync mapper for cases where we already have a confirmed session
 * (e.g. onAuthStateChange events) and need a fast, non-async mapping.
 */
function mapSupabaseUser(supabaseUser: any): User {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name: meta.name || supabaseUser.email?.split('@')[0] || 'Usuário',
    email: supabaseUser.email || '',
    role: (meta.role as UserRole) || 'customer',
  };
}

export const authService = {
  /**
   * Attempt to log in with email/password.
   * After sign-in, fetches role from profiles table so admins are recognised
   * immediately even if the JWT hasn't been refreshed yet.
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.user || !data.session) {
      observability.captureException(error || new Error('Login failed'));
      const msg = error?.message || 'Credenciais inválidas';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.');
      }
      throw new Error(msg);
    }

    // Resolve role from the profiles table (server-side source of truth)
    const user = await resolveUserWithRole(data.user);
    observability.trackEvent({ name: 'login_success', category: 'ecommerce', properties: { email: user.email, role: user.role } });

    return { user, token: data.session.access_token };
  },

  /**
   * Register a new user.
   * Admin promotion is validated ENTIRELY server-side via the `promote_to_admin` RPC.
   * The secret key is NEVER compared on the client — no exposure in the bundle.
   */
  async signUp(data: SignUpData, secretKey?: string): Promise<User> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: 'customer', // Always starts as customer; admin promotion is server-side only
        },
      },
    });

    if (error || !authData.user) {
      observability.captureException(error || new Error('Signup failed'), { context: 'authService.signUp', email: data.email });
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('sending confirmation email') || msg.toLowerCase().includes('email')) {
        throw new Error(
          'Não foi possível enviar o e-mail de confirmação. ' +
          'Verifique se o endereço está correto ou tente novamente em alguns minutos.'
        );
      }
      throw new Error(msg || 'Erro ao criar conta');
    }

    // If a secret key was provided, promote to admin via server-side RPC
    // The key is validated ONLY on the Supabase database — never on the client
    if (secretKey) {
      const { data: promoted, error: rpcError } = await supabase.rpc('promote_to_admin', {
        provided_key: secretKey,
      });

      if (rpcError || !promoted) {
        // Wrong key — sign the user out; account remains but as 'customer'
        await supabase.auth.signOut();
        throw new Error('Chave de autorização inválida. Conta não criada como administrador.');
      }
    }

    // Resolve user with confirmed role (from profiles table)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user
      ? await resolveUserWithRole(session.user)
      : mapSupabaseUser(authData.user);

    observability.trackEvent({ name: 'signup_success', category: 'ecommerce', properties: { email: user.email, role: user.role } });
    return user;
  },

  /**
   * Logout the current user.
   */
  async logout() {
    await supabase.auth.signOut();
    observability.trackEvent({ name: 'logout', category: 'ecommerce' });
  },

  /**
   * Resend signup confirmation email.
   */
  async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) {
      observability.captureException(error);
      throw new Error(error.message || 'Erro ao reenviar e-mail de confirmação.');
    }
  },

  /**
   * Get the current authenticated user session (if any).
   * Called on initial load to restore session with the correct role.
   */
  async getCurrentUser(): Promise<{ user: User; token: string } | null> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || !session.user) {
      return null;
    }

    const user = await resolveUserWithRole(session.user);
    return { user, token: session.access_token };
  },
};
