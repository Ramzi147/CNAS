/**
 * Vue d'ensemble du fichier : AuthContext.tsx
 * Role : contexte React qui centralise la session, l'utilisateur connecte et les actions d'authentification.
 * Module : authentification frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

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

// Ce provider expose la session a tout le frontend.
// Il centralise la connexion, la deconnexion et la redirection
// vers le bon dashboard selon le role de l'utilisateur.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(() => authService.getUser());

  // Cette table de routage evite de disperser la logique de redirection
  // dans chaque page de connexion ou de rafraichissement de session.
  const homeByRole = (role: UserRole) => {
    if (role === "superadmin") return "/superadmin";
    if (role === "admin") return "/admin";
    if (role === "hr") return "/hr";
    if (role === "manager") return "/manager";
    return "/employee";
  };

  // Entree principale de l'authentification frontend :
  // on delegue l'appel API au service, puis on hydrate le contexte React.
  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    setUser(res.user);
    nav(homeByRole(res.user.role), { replace: true });
  };

  // La deconnexion nettoie l'etat local et renvoie l'utilisateur
  // vers une route neutre pour eviter d'afficher des pages protegees.
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

// Ce hook sert de point d'entree unique pour acceder a la session.
// L'erreur explicite aide a reperer vite un composant rendu hors provider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit Ãªtre utilisÃ© dans AuthProvider");
  }
  return ctx;
}


