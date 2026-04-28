// src/components/layout/ModernLayout.tsx
import { Box, Container } from "@mui/material";
import { useState } from "react";
import ModernSidebar, { SIDEBAR_WIDTH } from "./ModernSidebar";
import ModernTopbar from "./ModernTopbar";
import { colors } from "../../styles/constants";

interface ModernLayoutProps {
  children: React.ReactNode;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: colors.neutral[50] }}>
      {/* Sidebar */}
      <ModernSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          ml: { xs: 0, sm: `${SIDEBAR_WIDTH}px` },
        }}
      >
        {/* Topbar */}
        <ModernTopbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            mt: 8,
            overflow: "auto",
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
          }}
        >
          <Container maxWidth="xl" sx={{ width: "100%", p: 0 }}>
            {children}
          </Container>
        </Box>

        {/* Footer (optional) */}
        <Box
          component="footer"
          sx={{
            backgroundColor: colors.neutral[100],
            borderTop: `1px solid ${colors.neutral[200]}`,
            py: 2,
            px: 3,
            textAlign: "center",
            color: colors.neutral[600],
            fontSize: "0.75rem",
            mt: "auto",
          }}
        >
          © 2026 CNAS - Plateforme d'Évaluation des Ressources Humaines
        </Box>
      </Box>
    </Box>
  );
};

export default ModernLayout;
