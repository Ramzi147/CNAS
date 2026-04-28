// src/components/ui/KPICard.tsx
import { Box, Card, CardContent, Typography } from "@mui/material";
import React from "react";
import { colors } from "../../styles/constants";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "error" | "info";
  onClick?: () => void;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = "primary",
  onClick,
  loading = false,
}) => {
  const colorMap = {
    primary: colors.primary[600],
    success: colors.success[600],
    warning: colors.warning[600],
    error: colors.error[600],
    info: colors.info[600],
  };

  const bgColorMap = {
    primary: colors.primary[50],
    success: colors.success[50],
    warning: colors.warning[50],
    error: colors.error[50],
    info: colors.info[50],
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease-in-out",
        "&:hover": onClick
          ? {
              transform: "translateY(-4px)",
              boxShadow: "0 16px 24px rgba(0, 0, 0, 0.12)",
            }
          : undefined,
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: colors.neutral[600],
                mb: 1,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {title}
            </Typography>

            {loading ? (
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700 }}>—</Typography>
            ) : (
              <Typography
                sx={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: colors.neutral[900],
                  mb: 0.5,
                }}
              >
                {value}
              </Typography>
            )}

            {subtitle && (
              <Typography sx={{ fontSize: "0.75rem", color: colors.neutral[500] }}>
                {subtitle}
              </Typography>
            )}

            {trend && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color:
                      trend === "up"
                        ? colors.success[600]
                        : trend === "down"
                          ? colors.error[600]
                          : colors.neutral[500],
                  }}
                >
                  {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                </Typography>
                {trendValue && (
                  <Typography sx={{ fontSize: "0.75rem", color: colors.neutral[500] }}>
                    {trendValue}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                backgroundColor: bgColorMap[color],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colorMap[color],
                fontSize: "1.5rem",
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default KPICard;
