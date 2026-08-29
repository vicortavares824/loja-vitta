// src/services/authService.ts
import type { LoginCredentials, SignUpData, User, UserRole } from '../types/ecommerce';
import { observability } from './observability';
import { supabase } from '../config/supabase';

/**
 * Maps a Supabase user to our local User type.
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
        throw new Error('E-mail não confirmado. Verifique sua caixa de entrada ou desabilite a confirmação de e-mail no painel do Supabase (Authentication → Providers → Email).');
      }
      throw new Error(msg);
    }

    const user = mapSupabaseUser(data.user);
    observability.trackEvent({ name: 'login_success', category: 'ecommerce', properties: { email: user.email, role: user.role } });
    
    return { user, token: data.session.access_token };
  },

  /** 
   * Register a new user (customer or admin).
   * Admin role is validated server-side via Supabase RPC.
   */
  async signUp(data: SignUpData, secretKey?: string): Promise<User> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: 'customer', // Always start as customer; admin promotion happens server-side
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

    // If secret key provided, validate and promote to admin
    if (secretKey) {
      if (secretKey !== import.meta.env.ADMIN_SECRET_KEY) {
        // Wrong key — delete the just-created account so the user can retry
        await supabase.auth.signOut();
        throw new Error('Chave de autorização inválida. Conta não criada.');
      }

      // Update user_metadata with admin role
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'admin' },
      });

      if (updateError) {
        observability.captureException(updateError, { context: 'authService.signUp.promote' });
      }
    }

    // Fetch updated user data to get the correct role
    const { data: { session } } = await supabase.auth.getSession();
    const user = mapSupabaseUser(session?.user || authData.user);
    
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
   * Usually called during initial load to restore session.
   */
  async getCurrentUser(): Promise<{ user: User; token: string } | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session || !session.user) {
      return null;
    }

    return {
      user: mapSupabaseUser(session.user),
      token: session.access_token
    };
  },
};
