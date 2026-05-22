/**
 * Vue d'ensemble du fichier : App.tsx
 * Role : point d'entree visuel qui assemble le routage principal du frontend.
 * Module : socle frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

// src/App.tsx
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import theme from "./styles/theme";
import AppRoutes from "./routes/AppRoutes";
import "./styles/global.css";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
}


