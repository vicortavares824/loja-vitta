// src/context/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthState, LoginCredentials } from '../types/ecommerce';
import { authService } from '../services/authService';
import { observability } from '../services/observability';
import { supabase } from '../config/supabase';

interface AuthContextProps extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /**
   * Resolves the authoritative role from the `profiles` table.
   * Falls back to user_metadata so the UI is never blocked if the DB is slow.
   */
  const resolveRole = useCallback(async (userId: string, metaRole?: string): Promise<string> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      return profile?.role ?? metaRole ?? 'customer';
    } catch {
      return metaRole ?? 'customer';
    }
  }, []);

  useEffect(() => {
    // 1. Restore existing session on initial mount
    authService.getCurrentUser().then(session => {
      if (session) {
        setState({
          user: session.user,
          token: session.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // 2. React to Supabase Auth state changes (login, logout, token refresh, other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        // Resolve role from profiles table to catch recently-promoted admins
        const role = await resolveRole(session.user.id, session.user.user_metadata?.role);

        const user: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: role as User['role'],
        };

        setState({
          user,
          token: session.access_token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveRole]);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const result = await authService.login(credentials);
      // Eagerly update state so the UI responds immediately without waiting
      // for the onAuthStateChange event (which fires shortly after)
      setState({
        user: result.user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (e: any) {
      observability.captureException(e);
      throw e;
    }
  };

  const logout = () => {
    authService.logout(); // State update handled by onAuthStateChange 'SIGNED_OUT'
  };

  const isAdmin = state.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
