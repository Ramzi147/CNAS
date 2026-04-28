import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Logout,
  Menu as MenuIcon,
  NotificationsNone,
  Search,
  Settings,
} from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { colors, roleColors } from "../../styles/constants";

interface ModernTopbarProps {
  onMenuClick: () => void;
}

const ModernTopbar = ({ onMenuClick }: ModernTopbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!user) {
    return null;
  }

  const roleStyle = roleColors[user.role as keyof typeof roleColors] || roleColors.employee;

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "rgba(248, 250, 252, 0.95)",
          color: colors.neutral[900],
          borderBottom: `1px solid ${colors.neutral[200]}`,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
          backdropFilter: "blur(12px)",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            <IconButton onClick={onMenuClick} sx={{ color: colors.neutral[800], display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
            <TextField
              placeholder="Rechercher une evaluation, un profil ou un employe"
              size="small"
              fullWidth
              sx={{ maxWidth: 420 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: colors.neutral[500] }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton sx={{ color: colors.neutral[700] }}>
              <Badge badgeContent={2} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Box
              onClick={(event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 999,
                border: `1px solid ${colors.neutral[200]}`,
                backgroundColor: colors.neutral[50],
                cursor: "pointer",
              }}
            >
              <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.fullName}</Typography>
                <Typography sx={{ fontSize: "0.7rem", color: roleStyle.text, textTransform: "uppercase" }}>
                  {user.role}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: roleStyle.text, width: 34, height: 34 }}>
                {user.fullName.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => { navigate("/profile"); setAnchorEl(null); }}>
          <Settings sx={{ mr: 1 }} />
          Mon profil
        </MenuItem>
        <MenuItem onClick={() => { logout(); setAnchorEl(null); }} sx={{ color: colors.error[700] }}>
          <Logout sx={{ mr: 1 }} />
          Deconnexion
        </MenuItem>
      </Menu>
    </>
  );
};

export default ModernTopbar;
