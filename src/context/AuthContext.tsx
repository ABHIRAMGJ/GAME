import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { api, getStoredToken, setStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginAsGuest: (customName?: string) => Promise<User>;
  register: (data: { username: string; fullName: string; email: string; password: string; confirmPassword: string; avatar?: string }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateUser: (user: User) => void;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  setAuthModalMode: (mode: 'login' | 'register' | 'forgot') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Load session on startup
  useEffect(() => {
    async function restoreSession() {
      const stored = getStoredToken();
      if (!stored) {
        // Fallback: auto-log in as demo player Abhiram if desired, or leave unauthenticated with easy login
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.me();
        setUser(res.user);
        setToken(stored);
      } catch (err) {
        console.warn('Session expired or invalid, clearing:', err);
        setStoredToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (identifier: string, password: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      const res = await api.login({ identifier, password, rememberMe });
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async (customName?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.guestLogin(customName);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthModalOpen(false);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { username: string; fullName: string; email: string; password: string; confirmPassword: string; avatar?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setAuthModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      await api.logoutAll();
    } catch (e) {
      // Ignore
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginAsGuest,
        register,
        logout,
        logoutAll,
        updateUser,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
