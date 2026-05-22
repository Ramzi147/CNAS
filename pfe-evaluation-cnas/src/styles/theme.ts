/**
 * Vue d'ensemble du fichier : theme.ts
 * Role : definitions de theme partagees par le frontend.
 * Module : theme et styles frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1e40af",
      light: "#3b82f6",
      dark: "#1e3a8a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0891b2",
      light: "#06b6d4",
      dark: "#0e7490",
      contrastText: "#ffffff",
    },
    success: {
      main: "#059669",
      light: "#10b981",
      dark: "#047857",
    },
    warning: {
      main: "#d97706",
      light: "#f59e0b",
      dark: "#b45309",
    },
    error: {
      main: "#dc2626",
      light: "#ef4444",
      dark: "#b91c1c",
    },
    info: {
      main: "#0284c7",
      light: "#0ea5e9",
      dark: "#0369a1",
    },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#172033",
      secondary: "#5b6475",
      disabled: "#b4bcc8",
    },
    divider: "#e2e8f0",
    action: {
      hover: "#eef4ff",
      selected: "#dbeafe",
      disabled: "#cbd5e1",
    },
  },
  typography: {
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h4: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h5: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: "0.875rem",
      fontWeight: 600,
      lineHeight: 1.5,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.6,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },
  shape: {
    borderRadius: 14,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(circle at top left, rgba(219, 234, 254, 0.9), transparent 32%), #f5f7fb",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 18px",
          boxShadow: "none",
        },
        contained: {
          boxShadow: "0 10px 24px rgba(30, 64, 175, 0.18)",
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          "& .MuiTableHead-root": {
            backgroundColor: "#f8fafc",
          },
          "& .MuiTableCell-head": {
            color: "#172033",
            fontWeight: 700,
            borderBottom: "1px solid #e2e8f0",
          },
          "& .MuiTableRow-root:hover": {
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
        },
      },
    },
  },
});

export default theme;


