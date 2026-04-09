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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  login: () => false,
  logout: () => {},
});

const ADMIN_PASSWORD = 'admin123';
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

  // Restore session from localStorage
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
