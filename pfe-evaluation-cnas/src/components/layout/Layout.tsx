// src/components/layout/Layout.tsx
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./Layout.css";
import { useAuth } from "../../context/AuthContext";


export default function Layout() {
  const { user, logout } = useAuth();


  return (
    <div className="app-shell">
      <Sidebar role={user?.role ?? null} onLogout={logout} />

      <div className="main">
        <Header />

        <main className="content" aria-label="Contenu principal">
          {/* petit bandeau visuel optionnel */}
          <div
            className="card"
            style={{
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 950 }}>
                👋 Bonjour, {user?.fullName ?? "—"}
              </div>
              <div className="muted" style={{ fontWeight: 700 }}>
                Vous êtes connecté(e) à la plateforme d’évaluation CNAS.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="badge">
                {user?.role ? user.role.toUpperCase() : "GUEST"}
              </span>
              <span className="badge soft">Sécurisé • JWT</span>
            </div>
          </div>

          {/* Ici s’affichent les pages : AdminDashboard, Profile, etc. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}