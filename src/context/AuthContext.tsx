import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PrivacySettings } from '../types';
import { api } from '../services/api';

export const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'PUBLIC',
  emailVisibility: 'CONNECTIONS_ONLY',
  socialLinksVisibility: 'PUBLIC',
};

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (name: string, username: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  updateProfile: (updated: Partial<User>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Validate session against authoritative backend on mount
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('boring_auth_token');
    if (!token) {
      setCurrentUser(null);
      return;
    }

    const syncUser = async () => {
      try {
        const res = await api.auth.getMe();
        if (isMounted && res.user) {
          setCurrentUser(res.user);
        } else if (isMounted) {
          localStorage.removeItem('boring_auth_token');
          localStorage.removeItem('molecule_current_user');
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem('boring_auth_token');
          localStorage.removeItem('molecule_current_user');
          setCurrentUser(null);
        }
      }
    };
    syncUser();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('molecule_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('molecule_current_user');
    }
  }, [currentUser]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(email, password || 'password123');
      if (res.token) {
        localStorage.setItem('boring_auth_token', res.token);
      }
      setCurrentUser(res.user);
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Unable to connect to Boring services. Please ensure the backend server is running.');
    }
  };

  const signup = async (
    name: string,
    username: string,
    email: string,
    password?: string
  ): Promise<boolean> => {
    try {
      const res = await api.auth.signup(name, username, email, password || 'password123');
      if (res.token) {
        localStorage.setItem('boring_auth_token', res.token);
      }
      setCurrentUser(res.user);
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Unable to connect to Boring services. Please ensure the backend server is running.');
    }
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    localStorage.removeItem('boring_auth_token');
    localStorage.removeItem('molecule_current_user');
    setCurrentUser(null);
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.auth.switchUser(userId);
      if (res.user) {
        setCurrentUser(res.user);
      }
    } catch (err: any) {
      throw new Error(err.message || 'User switch failed');
    }
  };

  const updateProfile = async (updated: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await api.profile.updateProfile(updated);
      if (res.user) {
        setCurrentUser(prev => ({ ...(prev || currentUser), ...res.user }));
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update profile on backend');
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!currentUser) return;
    try {
      const res = await api.profile.updatePrivacy(settings);
      if (res.privacy) {
        setCurrentUser(prev => prev ? {
          ...prev,
          privacy_settings: {
            profileVisibility: res.privacy.profile_visibility,
            emailVisibility: res.privacy.email_visibility,
            socialLinksVisibility: res.privacy.social_links_visibility,
          }
        } : null);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update privacy settings');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        signup,
        logout,
        switchUser,
        updateProfile,
        updatePrivacySettings,
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
