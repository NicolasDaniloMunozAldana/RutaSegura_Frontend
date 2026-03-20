"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { cookieStore } from "@/lib/cookies";
import { authAPI } from "@/lib/api";

interface User {
  id: number;
  email: string;
  personId: number;
  fullName: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from cookie
  useEffect(() => {
    const storedToken = cookieStore.getToken();
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { accessToken, user: userData } = response;

      cookieStore.setToken(accessToken);
      setToken(accessToken);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    cookieStore.removeToken();
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
