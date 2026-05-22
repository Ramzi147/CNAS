/**
 * Vue d'ensemble du fichier : notificationAPI.ts
 * Role : service frontend qui encapsule les appels HTTP vers le backend.
 * Module : services API frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import api from "./api";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "success" | "danger";
  link: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};

export const notificationAPI = {
  list: () => api.get<{ success: boolean; data: AppNotification[] }>("/notifications"),
  markRead: (id: string) => api.post<{ success: boolean; data: AppNotification }>(`/notifications/${id}/read`),
};


