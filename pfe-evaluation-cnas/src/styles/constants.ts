// src/styles/constants.ts
// Design system constants for consistent styling

export const colors = {
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  secondary: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
  },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  success: {
    50: "#f0fdf4",
    200: "#bbf7d0",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    900: "#14532d",
  },
  warning: {
    50: "#fffbeb",
    200: "#fde68a",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    900: "#78350f",
  },
  error: {
    50: "#fef2f2",
    200: "#fecaca",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    900: "#7f1d1d",
  },
  info: {
    50: "#f0f9ff",
    200: "#bae6fd",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    900: "#0c4a6e",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  xs: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
  sm: "0 6px 18px rgba(15, 23, 42, 0.08)",
  md: "0 16px 32px rgba(15, 23, 42, 0.12)",
  lg: "0 24px 48px rgba(15, 23, 42, 0.14)",
  xl: "0 32px 64px rgba(15, 23, 42, 0.18)",
};

export const transitions = {
  fast: "0.15s ease-in-out",
  base: "0.2s ease-in-out",
  slow: "0.3s ease-in-out",
};

export const roleColors = {
  superadmin: { bg: colors.error[50], text: colors.error[700], border: colors.error[200] },
  admin: { bg: colors.primary[50], text: colors.primary[700], border: colors.primary[200] },
  hr: { bg: colors.secondary[50], text: colors.secondary[700], border: colors.secondary[200] },
  manager: { bg: colors.warning[50], text: colors.warning[700], border: colors.warning[200] },
  employee: { bg: colors.success[50], text: colors.success[700], border: colors.success[200] },
};

export const statusColors = {
  draft: { bg: colors.neutral[100], text: colors.neutral[700], border: colors.neutral[300] },
  in_progress: { bg: colors.warning[50], text: colors.warning[700], border: colors.warning[200] },
  open: { bg: colors.info[50], text: colors.info[700], border: colors.info[200] },
  submitted: { bg: colors.warning[50], text: colors.warning[700], border: colors.warning[200] },
  manager_validated: { bg: colors.secondary[50], text: colors.secondary[700], border: colors.secondary[200] },
  hr_validated: { bg: colors.success[50], text: colors.success[700], border: colors.success[200] },
  closed: { bg: colors.neutral[100], text: colors.neutral[700], border: colors.neutral[300] },
  rejected: { bg: colors.error[50], text: colors.error[700], border: colors.error[200] },
};

export const performanceColors = {
  insufficient: colors.error[600],
  average: colors.warning[600],
  good: colors.secondary[600],
  excellent: colors.success[600],
};

export const getPerformanceColor = (score: number): string => {
  if (score < 50) return performanceColors.insufficient;
  if (score < 70) return performanceColors.average;
  if (score < 85) return performanceColors.good;
  return performanceColors.excellent;
};

export const getPerformanceLabel = (score: number): string => {
  if (score < 50) return "Insuffisant";
  if (score < 70) return "Moyen";
  if (score < 85) return "Bon";
  return "Excellent";
};
