"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User, UserRole, AuthContextValue } from "./types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Mock users for simulation
const mockUsers: Record<UserRole, User> = {
  partner: {
    id: "1",
    name: "Ana García",
    email: "ana@partner.com",
    role: "partner",
  },
  reno_construction_manager: {
    id: "2",
    name: "Carlos Martínez",
    email: "carlos@reno.com",
    role: "reno_construction_manager",
  },
  reno_admin: {
    id: "3",
    name: "María López",
    email: "maria@reno-admin.com",
    role: "reno_admin",
  },
  super_admin: {
    id: "4",
    name: "Super Admin",
    email: "admin@vistral.com",
    role: "super_admin",
  },
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem("userRole") as UserRole | null;
    if (storedRole && mockUsers[storedRole]) {
      setUser(mockUsers[storedRole]);
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole) => {
    if (mockUsers[role]) {
      const newUser = mockUsers[role];
      setUser(newUser);
      localStorage.setItem("userRole", role);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}







