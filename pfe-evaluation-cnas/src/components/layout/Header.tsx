// src/components/layout/Header.tsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import cnasLogo from "../../assets/cnas-logo.png";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "Espace Admin";
  if (pathname.startsWith("/hr")) return "Espace RH";
  if (pathname.startsWith("/manager")) return "Espace Manager";
  if (pathname.startsWith("/employee")) return "Espace Employé";
  if (pathname.startsWith("/evaluations")) return "Évaluations";
  if (pathname.startsWith("/profile")) return "Profil";
  if (pathname.startsWith("/organization")) return "Organisation";
  return "Plateforme CNAS";
}

function roleLabel(role?: string) {
  if (role === "admin") return "Admin";
  if (role === "hr") return "RH";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Employé";
  return "Invité";
}

function resolveSearchTarget(raw: string, role?: string) {
  const q = raw.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  if (!q) return null;

  if (q.includes("eval")) return `/evaluations?q=${encodeURIComponent(raw)}`;
  if (q.includes("profil") || q.includes("compte")) return `/profile?q=${encodeURIComponent(raw)}`;
  if (q.includes("orga") || q.includes("service") || q.includes("structure")) {
    return `/organization?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("admin")) return `/admin?q=${encodeURIComponent(raw)}`;
  if (q.includes("rh")) return `/hr?q=${encodeURIComponent(raw)}`;
  if (q.includes("manager")) return `/manager?q=${encodeURIComponent(raw)}`;
  if (q.includes("employ")) return `/employee?q=${encodeURIComponent(raw)}`;
  if (q.includes("dashboard") || q.includes("tableau")) {
    if (role === "admin") return `/admin?q=${encodeURIComponent(raw)}`;
    if (role === "hr") return `/hr?q=${encodeURIComponent(raw)}`;
    if (role === "manager") return `/manager?q=${encodeURIComponent(raw)}`;
    return `/employee?q=${encodeURIComponent(raw)}`;
  }

  return `/evaluations?q=${encodeURIComponent(raw)}`;
}

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [searchInfo, setSearchInfo] = useState("");

  const pageTitle = useMemo(() => titleFromPath(location.pathname), [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const target = resolveSearchTarget(query, user?.role);
    if (!target) return;

    setSearchInfo(`Recherche : ${query}`);
    navigate(target);
  };

  const handleLogoClick = () => {
    if (user?.role === "admin") navigate("/admin");
    else if (user?.role === "hr") navigate("/hr");
    else if (user?.role === "manager") navigate("/manager");
    else navigate("/employee");
  };

  return (
    <header className="hdr">
      <div className="hdr__left">
        {onMenuToggle && (
          <button
            className="hdr__menu"
            type="button"
            onClick={onMenuToggle}
            aria-label="Ouvrir le menu"
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <button className="hdr__brand" type="button" onClick={handleLogoClick}>
          <img className="hdr__brand-logo" src={cnasLogo} alt="CNAS" />
          <div className="hdr__brand-text">
            <div className="hdr__brand-name">CNAS</div>
            <div className="hdr__brand-sub">Évaluation des compétences & performances</div>
          </div>
        </button>

        <div className="hdr__title">
          <div className="hdr__title-kicker">📌 Espace</div>
          <div className="hdr__title-main">{pageTitle}</div>
        </div>
      </div>

      <div className="hdr__center">
        <form className="hdr-search" onSubmit={handleSearch}>
          <span className="hdr-search__icon">🔎</span>
          <input
            className="hdr-search__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : évaluations, profil, dashboard..."
            aria-label="Recherche"
          />
          <button className="hdr-search__button" type="submit">
            Rechercher
          </button>
        </form>
        {searchInfo ? <div className="hdr-search__hint">{searchInfo}</div> : null}
      </div>

      <div className="hdr__right">
        <button className="hdr__icon" type="button" title="Notifications">
          <span className="hdr__icon-bell">🔔</span>
          <span className="hdr__notif-dot" />
        </button>

        <div className="hdr-user">
          <div className="hdr-user__avatar">
            {(user?.fullName?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="hdr-user__meta">
            <div className="hdr-user__name">{user?.fullName ?? "Invité"}</div>
            <div className="hdr-user__role">{roleLabel(user?.role)}</div>
          </div>
        </div>

        {isAuthenticated ? (
          <button className="hdr__logout" type="button" onClick={logout}>
            <span>🚪</span>
            <span className="hdr__logout-label">Déconnexion</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}