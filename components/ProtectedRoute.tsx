"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const router = useRouter();

  const normalizedAllowedRoles = allowedRoles
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
  const userRole = user?.role?.trim().toLowerCase() ?? "";
  const hasAllowedRole =
    normalizedAllowedRoles.length === 0 || normalizedAllowedRoles.includes(userRole);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    if (!hasAllowedRole) {
      logout();
      router.push("/");
    }
  }, [hasAllowedRole, isAuthenticated, isLoading, logout, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAllowedRole) {
    return null;
  }

  return <>{children}</>;
}
