// src/context/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, type LoginPayload } from "../services/authService";

export type UserRole = "superadmin" | "admin" | "agent" | "hr" | "manager" | "employee";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(() => authService.getUser());

  const homeByRole = (role: UserRole) => {
    if (role === "superadmin") return "/superadmin";
    if (role === "admin") return "/admin";
    if (role === "hr") return "/hr";
    if (role === "manager") return "/manager";
    return "/employee";
  };

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    setUser(res.user);
    nav(homeByRole(res.user.role), { replace: true });
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    nav("/login", { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }
  return ctx;
}
