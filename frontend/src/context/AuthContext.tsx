import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sp_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.me();
      setUser(response.data);
    } catch {
      localStorage.removeItem('sp_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    const response = await authAPI.login(email, password);
    const newToken = response.data.access_token;
    localStorage.setItem('sp_token', newToken);
    setToken(newToken);
    const userRes = await authAPI.me();
    setUser(userRes.data);
  } catch (error) {
    localStorage.removeItem('sp_token');
    setToken(null);
    setUser(null);
    throw error;
  } finally {
    setLoading(false);
  }
};


  const register = async (data: { name: string; email: string; password: string; role?: string }) => {
    setLoading(true);
    try {
      const response = await authAPI.register(data);
      const newToken = response.data.access_token;
      localStorage.setItem('sp_token', newToken);
      setToken(newToken);
      const userRes = await authAPI.me();
      setUser(userRes.data);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sp_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
