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
      throw new Error(error?.message || 'Credenciais inválidas');
    }

    const user = mapSupabaseUser(data.user);
    observability.trackEvent({ name: 'login_success', category: 'ecommerce', properties: { email: user.email, role: user.role } });
    
    return { user, token: data.session.access_token };
  },

  /** 
   * Register a new user (customer or admin).
   */
  async signUp(data: SignUpData, secretKey?: string): Promise<User> {
    let role = 'customer';

    if (secretKey) {
      if (secretKey === import.meta.env.VITE_ADMIN_SECRET_KEY) {
        role = 'admin';
      } else {
        throw new Error('Chave de autorização de Admin inválida.');
      }
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: role,
        },
      },
    });

    if (error || !authData.user) {
      observability.captureException(error || new Error('Signup failed'));
      throw new Error(error?.message || 'Erro ao criar conta');
    }

    const user = mapSupabaseUser(authData.user);
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
