/**
 * Vue d'ensemble du fichier : SidebarClean.tsx
 * Role : menu lateral principal qui expose la navigation selon le role.
 * Module : mise en page frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import {
  Apartment,
  Assessment,
  Badge,
  BarChart,
  CalendarMonth,
  Dashboard,
  FactCheck,
  Grading,
  ManageAccounts,
  People,
  Person,
  Plagiarism,
  Shield,
  Work,
} from "@mui/icons-material";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth, type UserRole } from "../../context/AuthContext";

type SidebarProps = {
  role: UserRole | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function SidebarClean({
  role,
  onLogout,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();

  const initials = useMemo(() => {
    const name = user?.fullName?.trim() ?? "Utilisateur";
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [user?.fullName]);

  const home =
    role === "superadmin"
      ? "/superadmin"
      : role === "admin"
      ? "/admin"
      : role === "hr"
      ? "/hr"
      : role === "manager"
      ? "/manager"
      : "/employee";

  const roleText =
    role === "superadmin"
      ? "Administrateur"
      : role === "admin"
      ? "Administrateur"
      : role === "hr"
      ? "Ressources humaines"
      : role === "manager"
      ? "Manager"
      : "Employe";

  const links: { to: string; label: string; icon: React.ReactNode }[] = [
    { to: home, label: "Tableau de bord", icon: <Dashboard /> },
    { to: "/profile", label: "Profil", icon: <Person /> },
    { to: "/evaluations", label: "Evaluations", icon: <FactCheck /> },
  ];

  if (role === "superadmin" || role === "admin" || role === "hr" || role === "manager" || role === "employee" || role === "agent") {
    links.push({ to: "/self-evaluations", label: "Auto-evaluation", icon: <Grading /> });
  }

  if (role === "employee" || role === "agent") {
    links.push({ to: "/compliance", label: "Mes demandes", icon: <Shield /> });
  }

  if (role === "manager") {
    links.push({ to: "/compliance?requestType=contestation", label: "Contestations equipe", icon: <Shield /> });
  }

  if (role === "superadmin" || role === "admin" || role === "hr") {
    if (role === "superadmin" || role === "admin") {
      links.push({ to: "/users-access", label: "Utilisateurs", icon: <People /> });
    }
    links.push({ to: "/campaigns", label: "Campagnes", icon: <CalendarMonth /> });
    links.push({ to: "/organization", label: "Organisation", icon: <Apartment /> });
    links.push({ to: "/job-profiles", label: "Postes & profils", icon: <Work /> });
    links.push({ to: "/form-versions", label: "Versions formulaires", icon: <FactCheck /> });
    links.push({ to: "/rankings", label: "Comparaisons", icon: <Assessment /> });
    links.push({ to: "/reports", label: "Rapports", icon: <BarChart /> });
    links.push({ to: "/compliance", label: "Conformite", icon: <Shield /> });
    links.push({ to: "/audit-log", label: "Audit log", icon: <Plagiarism /> });
  }

  if (role === "manager") {
    links.push({ to: "/campaigns", label: "Campagnes", icon: <CalendarMonth /> });
  }

  if (role === "superadmin" || role === "admin" || role === "hr" || role === "manager") {
    links.push({ to: "/daily-followup", label: "Suivi quotidien", icon: <CalendarMonth /> });
    if (role === "manager") {
      links.push({ to: "/reports", label: "Rapports", icon: <BarChart /> });
    }
  }

  if (role === "superadmin") {
    links.push({ to: "/superadmin", label: "Vue Super Admin", icon: <Shield /> });
    links.push({ to: "/hr", label: "Vue RH", icon: <BarChart /> });
    links.push({ to: "/manager", label: "Vue Responsable", icon: <ManageAccounts /> });
    links.push({ to: "/employee", label: "Vue Employe", icon: <Badge /> });
  }

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-top">
        <div className="sb-card">
          <div className="sb-user">
            <div className="sb-avatar">{initials}</div>
            <div className="sb-user-text">
              <div className="sb-user-name" title={user?.fullName ?? "Invite"}>{user?.fullName ?? "Invite"}</div>
              <div className="sb-user-mail" title={user?.email ?? ""}>{user?.email ?? ""}</div>
            </div>
          </div>
          <div className="sb-role-chip">{roleText}</div>
        </div>
      </div>

      <div className="sidebar-links">
        <div className="sb-section-title">Navigation</div>
        <nav className="sb-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) => `sb-link${isActive ? " active" : ""}`}
            >
              <span className="sb-ico">{link.icon}</span>
              <span className="sb-label" title={link.label}>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="sb-logout" type="button">
          Deconnexion
        </button>
      </div>
    </aside>
  );
}




