/**
 * Vue d'ensemble du fichier : Login.tsx
 * Role : page de connexion qui declenche l'authentification utilisateur.
 * Module : interface utilisateur.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import cnasLogo from "../assets/cnas-logo.png";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err?.message ?? "Erreur de connexion.");
      setLoading(false);
    }
  };

  return (
    <div className="simple-login">
      <div className="simple-login__panel">
        <div className="simple-login__header">
          <img src={cnasLogo} alt="CNAS" className="simple-login__logo" />
          <div>
            <div className="simple-login__eyebrow">Plateforme CNAS</div>
            <h1 className="simple-login__title">Connexion</h1>
            <p className="simple-login__subtitle">
              Authentification obligatoire avant acces aux espaces Admin, DRH, Responsable et Employe.
            </p>
          </div>
        </div>

        <form className="simple-login__form" onSubmit={onSubmit}>
          <label className="simple-login__label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="simple-login__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre.email@cnas.dz"
            required
          />

          <label className="simple-login__label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            className="simple-login__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            required
          />

          {error && <div className="simple-login__error">{error}</div>}

          <button className="simple-login__submit" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}


