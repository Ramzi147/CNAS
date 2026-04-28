// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth, type UserRole } from "../../context/AuthContext";

export type SidebarProps = {
  role: UserRole | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
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

  const defaultDash = (() => {
    if (role === "admin") return "/admin";
    if (role === "hr") return "/hr";
    if (role === "manager") return "/manager";
    if (role === "employee") return "/employee";
    return "/dashboard";
  })();

  const links: { to: string; label: string; icon: string }[] = [
    { to: defaultDash, label: "Tableau de bord", icon: "🏠" },
    { to: "/profile", label: "Profil", icon: "👤" },
    { to: "/evaluations", label: "Évaluations", icon: "📝" },
    { to: "/organization", label: "Organisation", icon: "🏢" },
  ];

  if (role === "admin") {
    links.push({ to: "/admin", label: "Espace Admin", icon: "🛠" });
  }
  if (role === "hr") {
    links.push({ to: "/hr", label: "Espace RH", icon: "👥" });
  }
  if (role === "manager") {
    links.push({ to: "/manager", label: "Espace Manager", icon: "📋" });
  }
  if (role === "employee") {
    links.push({ to: "/employee", label: "Espace Employé", icon: "👤" });
  }

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-top">
        <div className="sb-card">
          <div className="sb-user">
            <div className="sb-avatar">{initials}</div>
            <div className="sb-user-text">
              <div className="sb-user-name">{user?.fullName ?? "Invité"}</div>
              <div className="sb-user-mail">{user?.email ?? ""}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-links">
        <nav className="sb-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) => `sb-link${isActive ? " active" : ""}`}
            >
              <span className="sb-ico">{l.icon}</span>
              <span className="sb-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          onClick={onLogout}
          className="sb-logout"
          type="button"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}