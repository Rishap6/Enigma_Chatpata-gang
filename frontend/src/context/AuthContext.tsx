import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Family } from '../types';
import { authService } from '../services/authService';
import { familyService } from '../services/familyService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeFamily: Family | null;
  setActiveFamily: (family: Family | null) => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  switchDemoUser: (userType?: 'demo' | 'other_user') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize or fetch current user if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const me = await authService.getMe();
          setUser(me);
          // Load user's families and set the first one active if not set
          const families = await familyService.listFamilies();
          if (families.length > 0) {
            setActiveFamily(families[0]);
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      } else {
        // Auto-login to demo user on first arrival so user immediately sees functional app!
        try {
          const authData = await authService.demoLogin('demo');
          localStorage.setItem('access_token', authData.access_token);
          setToken(authData.access_token);
          setUser(authData.user);
          const families = await familyService.listFamilies();
          if (families.length > 0) {
            setActiveFamily(families[0]);
          }
        } catch (err) {
          console.warn('Backend not yet ready or demo login failed:', err);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      const families = await familyService.listFamilies();
      setActiveFamily(families.length > 0 ? families[0] : null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register(email, password, fullName);
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setActiveFamily(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoUser = async (userType: 'demo' | 'other_user' = 'demo') => {
    setIsLoading(true);
    try {
      const data = await authService.demoLogin(userType);
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      const families = await familyService.listFamilies();
      setActiveFamily(families.length > 0 ? families[0] : null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setActiveFamily(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeFamily,
        setActiveFamily,
        isLoading,
        login,
        register,
        switchDemoUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
