// src/components/ui/StatusBadge.tsx
import { Box, Typography } from "@mui/material";
import React from "react";
import { statusColors, roleColors, performanceColors, getPerformanceLabel } from "../../styles/constants";

type StatusType = "draft" | "in_progress" | "open" | "submitted" | "manager_validated" | "hr_validated" | "closed" | "rejected";
type RoleType = "superadmin" | "admin" | "hr" | "manager" | "employee";

interface StatusBadgeProps {
  status?: StatusType;
  role?: RoleType;
  performanceScore?: number;
  size?: "small" | "medium" | "large";
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  role,
  performanceScore,
  size = "medium",
  label,
}) => {
  let bgColor = "#f3f4f6";
  let textColor = "#374151";
  let displayLabel = label || "";

  if (status) {
    const statusStyle = statusColors[status] || statusColors.draft;
    bgColor = statusStyle.bg;
    textColor = statusStyle.text;
    displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  } else if (role) {
    const roleStyle = roleColors[role] || roleColors.employee;
    bgColor = roleStyle.bg;
    textColor = roleStyle.text;
    displayLabel = label || role.toUpperCase();
  } else if (performanceScore !== undefined) {
    const perfLabel = getPerformanceLabel(performanceScore);
    let perfColor = performanceColors.insufficient;
    if (performanceScore < 50) perfColor = performanceColors.insufficient;
    else if (performanceScore < 70) perfColor = performanceColors.average;
    else if (performanceScore < 85) perfColor = performanceColors.good;
    else perfColor = performanceColors.excellent;

    bgColor = `${perfColor}15`;
    textColor = perfColor;
    displayLabel = `${perfLabel} (${performanceScore}/100)`;
  }

  const sizeMap = {
    small: { px: 1.5, py: 0.5, fontSize: "0.75rem" },
    medium: { px: 2, py: 0.75, fontSize: "0.875rem" },
    large: { px: 2.5, py: 1, fontSize: "1rem" },
  };

  const sizeStyle = sizeMap[size];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: sizeStyle.px,
        py: sizeStyle.py,
        backgroundColor: bgColor,
        borderRadius: 1,
        border: `1px solid ${textColor}30`,
      }}
    >
      <Typography
        sx={{
          fontSize: sizeStyle.fontSize,
          fontWeight: 500,
          color: textColor,
          textTransform: "capitalize",
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
};

export default StatusBadge;
