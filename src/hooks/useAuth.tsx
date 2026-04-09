import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user';

interface AuthUser {
  name: string;
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (role: UserRole, password?: string) => boolean;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  login: () => false,
  logout: () => {},
  changePassword: () => false,
});

let ADMIN_PASSWORD = 'admin123';
const ADMIN_PASSWORD_STORAGE_KEY = 'tata_admin_password';
const AUTH_STORAGE_KEY = 'tata_attendance_auth';

// Predefined users
const USERS: Record<UserRole, AuthUser> = {
  admin: {
    name: 'HR Admin',
    role: 'admin',
    email: 'admin@tatamotors.com',
  },
  user: {
    name: 'Employee',
    role: 'user',
    email: 'user@tatamotors.com',
  },
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore session from localStorage and load saved password
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed.role === 'admin' || parsed.role === 'user') {
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }

    // Load saved admin password if exists
    const savedPassword = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
    if (savedPassword) {
      ADMIN_PASSWORD = savedPassword;
    }
  }, []);

  const login = (role: UserRole, password?: string): boolean => {
    if (role === 'admin') {
      if (password !== ADMIN_PASSWORD) return false;
    }
    const authUser = USERS[role];
    setUser(authUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const changePassword = (oldPassword: string, newPassword: string): boolean => {
    // Only admin can change password
    if (user?.role !== 'admin') return false;

    // Verify old password
    if (oldPassword !== ADMIN_PASSWORD) return false;

    // Validate new password (at least 6 characters)
    if (newPassword.length < 6) return false;

    // New password cannot be same as old
    if (oldPassword === newPassword) return false;

    // Update in-memory password
    ADMIN_PASSWORD = newPassword;

    // Save to localStorage
    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, newPassword);

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
