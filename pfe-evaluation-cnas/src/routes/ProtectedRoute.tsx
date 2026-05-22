/**
 * Vue d'ensemble du fichier : ProtectedRoute.tsx
 * Role : garde de navigation qui bloque les routes selon l'authentification et le role.
 * Module : navigation frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

// src/routes/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allow?: UserRole[]; // si vide => tous les rÃ´les connectÃ©s
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

  // pas connectÃ© => login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // connectÃ© mais pas autorisÃ© => renvoie vers son espace
  if (allow && allow.length > 0) {
    const ok = allow.includes(user.role);
    if (!ok) {
      return <Navigate to={homeByRole(user.role)} replace />;
    }
  }

  return <>{children}</>;
}


