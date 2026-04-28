import {
  Apartment,
  Assessment,
  BarChart,
  CheckCircle,
  Dashboard,
  Edit,
  Logout,
  People,
  Settings,
  Shield,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { colors, roleColors } from "../../styles/constants";

export const SIDEBAR_WIDTH = 296;

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const ModernSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const home =
    user.role === "superadmin"
      ? "/superadmin"
      : user.role === "admin"
        ? "/admin"
        : user.role === "hr"
          ? "/hr"
          : user.role === "manager"
            ? "/manager"
            : "/employee";

  const items: NavItem[] = [
    { label: "Tableau de bord", path: home, icon: <Dashboard /> },
    { label: "Evaluations", path: "/evaluations", icon: <Assessment /> },
    { label: "Profil", path: "/profile", icon: <Settings /> },
  ];

  if (["superadmin", "admin", "hr"].includes(user.role)) {
    items.push({ label: "Organisation", path: "/organization", icon: <Apartment /> });
    items.push({ label: "Postes et profils", path: "/job-profiles", icon: <BarChart /> });
  }

  if (["superadmin", "admin"].includes(user.role)) {
    items.push({ label: "Utilisateurs", path: "/users-access", icon: <Shield /> });
  }

  if (user.role === "manager") {
    items.push({ label: "Mon equipe", path: "/manager", icon: <People /> });
  }

  if (["employee", "agent"].includes(user.role)) {
    items.push({ label: "Mes actions", path: "/employee", icon: <Edit /> });
    items.push({ label: "Resultats", path: "/evaluations?status=hr_validated", icon: <CheckCircle /> });
  }

  const roleStyle = roleColors[user.role as keyof typeof roleColors] || roleColors.employee;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          p: 2,
          backgroundColor: colors.neutral[50],
          borderRight: `1px solid ${colors.neutral[200]}`,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: colors.primary[50], border: `1px solid ${colors.primary[200]}` }}>
          <Typography sx={{ fontWeight: 700, color: colors.primary[800] }}>CNAS</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: colors.neutral[600] }}>
            Evaluation des competences et performances
          </Typography>
        </Box>

        <List sx={{ py: 2, flex: 1 }}>
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  sx={{
                    borderRadius: 3,
                    bgcolor: active ? colors.primary[100] : "transparent",
                    color: active ? colors.primary[800] : colors.neutral[700],
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: roleStyle.bg, border: `1px solid ${roleStyle.border}` }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: roleStyle.text }}>{user.fullName.charAt(0).toUpperCase()}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 600, color: roleStyle.text }}>{user.fullName}</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: roleStyle.text, opacity: 0.9, textTransform: "uppercase" }}>
                {user.role}
              </Typography>
            </Box>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colors.success[500], boxShadow: `0 0 0 4px ${colors.success[50]}` }} />
          </Stack>
        </Box>

        <List sx={{ pt: 1 }}>
          <ListItem disablePadding>
            <ListItemButton onClick={() => navigate("/profile")} sx={{ borderRadius: 3 }}>
              <ListItemIcon><Settings /></ListItemIcon>
              <ListItemText primary="Parametres" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={logout} sx={{ borderRadius: 3, color: colors.error[700] }}>
              <ListItemIcon sx={{ color: "inherit" }}><Logout /></ListItemIcon>
              <ListItemText primary="Deconnexion" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default ModernSidebar;
