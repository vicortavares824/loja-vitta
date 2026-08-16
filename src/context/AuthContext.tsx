// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    // 1. Initial session check
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

    // 2. Listen for Supabase Auth state changes (e.g. token refresh, logout from other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        // We can just rely on the session provided by the event
        const user: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'customer'
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
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      // The state update will be handled by onAuthStateChange, but we can wait for the login to succeed.
      await authService.login(credentials);
      return true;
    } catch (e: any) {
      // Errors are already captured by authService, but we capture the top level one just in case
      observability.captureException(e);
      return false;
    }
  };

  const logout = () => {
    authService.logout(); // The state update will be handled by onAuthStateChange event 'SIGNED_OUT'
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
