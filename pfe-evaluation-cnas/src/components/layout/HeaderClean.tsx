import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import cnasLogo from "../../assets/cnas-logo.png";
import { notificationAPI } from "../../services/notificationAPI";

type HeaderNotification = {
  id: string;
  text: string;
  time: string;
  to: string;
};

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "Espace Administration";
  if (pathname.startsWith("/superadmin")) return "Espace Administration";
  if (pathname.startsWith("/hr")) return "Espace RH";
  if (pathname.startsWith("/manager")) return "Espace Responsable";
  if (pathname.startsWith("/employee") || pathname.startsWith("/agent")) return "Espace Employe";
  if (pathname.startsWith("/evaluations")) return "Evaluations";
  if (pathname.startsWith("/campaigns")) return "Campagnes";
  if (pathname.startsWith("/profile")) return "Profil";
  if (pathname.startsWith("/organization")) return "Organisation";
  if (pathname.startsWith("/job-profiles")) return "Postes et profils";
  if (pathname.startsWith("/form-versions")) return "Versions formulaires";
  if (pathname.startsWith("/daily-followup")) return "Suivi quotidien";
  if (pathname.startsWith("/rankings")) return "Comparaisons metier";
  if (pathname.startsWith("/reports")) return "Rapports";
  if (pathname.startsWith("/compliance")) return "Conformite";
  if (pathname.startsWith("/audit-log")) return "Audit log";
  return "Plateforme CNAS";
}

function roleLabel(role?: string) {
  if (role === "superadmin") return "Administrateur";
  if (role === "admin") return "Administrateur";
  if (role === "hr") return "Ressources humaines";
  if (role === "manager") return "Responsable hierarchique";
  if (role === "employee" || role === "agent") return "Employe";
  return "Invite";
}

function homeByRole(role?: string) {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  if (role === "hr") return "/hr";
  if (role === "manager") return "/manager";
  return "/employee";
}

function resolveSearchTarget(raw: string, role?: string) {
  const q = raw.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (!q) return null;

  if (q.includes("profil") || q.includes("compte")) return `/profile?q=${encodeURIComponent(raw)}`;
  if (q.includes("poste") || q.includes("critere") || q.includes("profil evaluation")) {
    return `/job-profiles?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("version") || q.includes("formulaire")) {
    return `/form-versions?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("campagne")) {
    return `/campaigns?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("rapport") || q.includes("reporting")) {
    return `/reports?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("suivi") || q.includes("presence") || q.includes("retard") || q.includes("absence")) {
    return `/daily-followup?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("classement") || q.includes("comparaison") || q.includes("famille")) {
    return `/rankings?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("audit") || q.includes("log") || q.includes("trace")) {
    return `/audit-log?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("conform") || q.includes("registre") || q.includes("dpd") || q.includes("contestation")) {
    return `/compliance?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("orga") || q.includes("service") || q.includes("structure") || q.includes("agence")) {
    return `/organization?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("eval") || q.includes("score") || q.includes("periode")) {
    return `/evaluations?q=${encodeURIComponent(raw)}`;
  }
  if (q.includes("admin")) return `/admin?q=${encodeURIComponent(raw)}`;
  if (q.includes("rh")) return `/hr?q=${encodeURIComponent(raw)}`;
  if (q.includes("manager")) return `/manager?q=${encodeURIComponent(raw)}`;
  if (q.includes("employ") || q.includes("agent")) return `/employee?q=${encodeURIComponent(raw)}`;
  if (q.includes("dashboard") || q.includes("tableau")) {
    return `${homeByRole(role)}?q=${encodeURIComponent(raw)}`;
  }

  return `/evaluations?q=${encodeURIComponent(raw)}`;
}

export default function HeaderClean({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const pageTitle = useMemo(() => titleFromPath(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    notificationAPI
      .list()
      .then((res) => {
        setNotifications(
          res.data.data.map((item) => ({
            id: item.id,
            text: `${item.title} - ${item.message}`,
            time: new Date(item.createdAt).toLocaleString(),
            to: item.link || "/dashboard",
          }))
        );
      })
      .catch(() => setNotifications([]));
  }, [isAuthenticated]);

  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = resolveSearchTarget(query, user?.role);
    if (!target) return;
    navigate(target);
  };

  return (
    <header className="hdr">
      <div className="hdr__left">
        {onMenuToggle && (
          <button className="hdr__menu" type="button" onClick={onMenuToggle} aria-label="Ouvrir le menu">
            <span />
            <span />
            <span />
          </button>
        )}

        <button className="hdr__brand" type="button" onClick={() => navigate(homeByRole(user?.role))}>
          <img className="hdr__brand-logo" src={cnasLogo} alt="CNAS" />
          <div className="hdr__brand-text">
            <div className="hdr__brand-name">CNAS</div>
            <div className="hdr__brand-sub">Evaluation des competences et performances</div>
          </div>
        </button>

        <div className="hdr__title">
          <div className="hdr__title-kicker">Espace</div>
          <div className="hdr__title-main" title={pageTitle}>{pageTitle}</div>
          <div className="hdr__title-sub" title={roleLabel(user?.role)}>{roleLabel(user?.role)}</div>
        </div>
      </div>

      <div className="hdr__center">
        <form className="hdr-search" onSubmit={handleSearch}>
          <span className="hdr-search__icon">RG</span>
          <input
            className="hdr-search__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une evaluation, un profil, un audit ou un registre..."
            aria-label="Recherche"
          />
          <button className="hdr-search__button" type="submit">
            Rechercher
          </button>
        </form>
      </div>

      <div className="hdr__right">
        <button className="hdr__icon" type="button" title="Notifications" onClick={() => setNotifOpen((prev) => !prev)}>
          <span className="hdr__icon-bell">NT</span>
          {notifications.length > 0 ? <span className="hdr__notif-dot" /> : null}
        </button>

        {notifOpen ? (
          <div className="hdr-notif">
            <div className="hdr-notif__title">Notifications</div>
            {notifications.length === 0 ? (
              <div className="hdr-notif__empty">Aucune nouvelle alerte pour le moment.</div>
            ) : (
              <div className="hdr-notif__list">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    className="hdr-notif__item"
                    type="button"
                    onClick={async () => {
                      await notificationAPI.markRead(item.id).catch(() => undefined);
                      setNotifications((current) => current.filter((row) => row.id !== item.id));
                      navigate(item.to);
                    }}
                  >
                    <span className="hdr-notif__text">{item.text}</span>
                    <span className="hdr-notif__time">{item.time}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="hdr-user">
          <div className="hdr-user__avatar">{(user?.fullName?.[0] ?? "U").toUpperCase()}</div>
          <div className="hdr-user__meta">
            <div className="hdr-user__name" title={user?.fullName ?? "Invite"}>{user?.fullName ?? "Invite"}</div>
            <div className="hdr-user__role" title={roleLabel(user?.role)}>{roleLabel(user?.role)}</div>
          </div>
        </div>

        {isAuthenticated ? (
          <button className="hdr__logout" type="button" onClick={logout}>
            <span>OUT</span>
            <span className="hdr__logout-label">Deconnexion</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
