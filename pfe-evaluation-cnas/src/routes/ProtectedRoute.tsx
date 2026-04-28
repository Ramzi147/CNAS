// src/routes/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allow?: UserRole[]; // si vide => tous les rôles connectés
};

export default function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const homeByRole = (role: UserRole) => {
    if (role === "superadmin") return "/superadmin";
    if (role === "admin") return "/admin";
    if (role === "hr") return "/hr";
    if (role === "manager") return "/manager";
    return "/employee";
  };

  // pas connecté => login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // connecté mais pas autorisé => renvoie vers son espace
  if (allow && allow.length > 0) {
    const ok = allow.includes(user.role);
    if (!ok) {
      return <Navigate to={homeByRole(user.role)} replace />;
    }
  }

  return <>{children}</>;
}
