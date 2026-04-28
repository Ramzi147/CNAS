import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import type { ToastOptions } from "react-toastify";

type NotificationType = "success" | "error" | "warning" | "info";
type NotificationOptions = Omit<ToastOptions, "type">;

type HistoryItem = {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
};

export interface NotificationConfig extends NotificationOptions {
  type?: NotificationType;
  message: string;
}

export const useNotification = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const notify = useCallback((config: NotificationConfig | string) => {
    const notifyConfig: NotificationConfig = typeof config === "string" ? { message: config, type: "info" } : config;
    const { type = "info", message, autoClose, ...options } = notifyConfig;
    const toastOptions = { autoClose: autoClose ?? 3000, ...options };

    switch (type) {
      case "success":
        toast.success(message, toastOptions);
        break;
      case "error":
        toast.error(message, toastOptions);
        break;
      case "warning":
        toast.warning(message, toastOptions);
        break;
      default:
        toast.info(message, toastOptions);
        break;
    }

    const notification: HistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
    };

    setHistory((previous) => [notification, ...previous].slice(0, 10));
  }, []);

  const success = useCallback((message: string, options?: NotificationOptions) => {
    notify({ message, ...(options ?? {}), type: "success" });
  }, [notify]);

  const error = useCallback((message: string, options?: NotificationOptions) => {
    notify({ message, ...(options ?? {}), type: "error" });
  }, [notify]);

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    notify({ message, ...(options ?? {}), type: "warning" });
  }, [notify]);

  const info = useCallback((message: string, options?: NotificationOptions) => {
    notify({ message, ...(options ?? {}), type: "info" });
  }, [notify]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    notify,
    success,
    error,
    warning,
    info,
    history,
    clearHistory,
  };
};
