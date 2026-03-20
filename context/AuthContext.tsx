"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { cookieStore } from "@/lib/cookies";
import { authAPI, AuthUser } from "@/lib/api";

type User = AuthUser;

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

  useEffect(() => {
    async function initializeAuth() {
      const storedToken = cookieStore.getToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authAPI.profile(storedToken);
        const fullName = [
          profile.person.firstName,
          profile.person.middleName,
          profile.person.firstLastname,
          profile.person.secondLastname,
        ]
          .filter(Boolean)
          .join(" ");

        setToken(storedToken);
        setUser({
          id: profile.id,
          email: profile.email,
          personId: profile.person.id,
          fullName,
          role: profile.role.name,
          status: profile.status,
        });
      } catch {
        cookieStore.removeToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    void initializeAuth();
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
