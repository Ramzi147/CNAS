/**
 * Vue d'ensemble du fichier : main.tsx
 * Role : point de demarrage du frontend React et point de montage de l'application.
 * Module : socle frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// global styles (reset + shared tokens) and UI toolkit
import "./index.css";
import "./App.css";         // contains login + legacy helpers
import "./styles/app.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

