/**
 * Vue d'ensemble du fichier : api.ts
 * Role : service frontend qui encapsule les appels HTTP vers le backend.
 * Module : services API frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Ajoute automatiquement le token si prÃ©sent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cnas_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

