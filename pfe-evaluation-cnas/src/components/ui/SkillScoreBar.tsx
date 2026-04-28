// src/components/ui/SkillScoreBar.tsx
import { Box, Typography } from "@mui/material";
import React from "react";
import { getPerformanceColor, colors } from "../../styles/constants";

interface SkillScoreBarProps {
  name: string;
  score: number;
  maxScore?: number;
  weight?: number;
  description?: string;
  size?: "small" | "medium" | "large";
}

const SkillScoreBar: React.FC<SkillScoreBarProps> = ({
  name,
  score,
  maxScore = 5,
  weight,
  description,
  size = "medium",
}) => {
  const percentage = (score / maxScore) * 100;
  const color = getPerformanceColor((score / maxScore) * 100);

  const sizeMap = {
    small: { gap: 0.5, barHeight: 4, fontSize: "0.75rem", titleSize: "0.75rem" },
    medium: { gap: 1, barHeight: 6, fontSize: "0.875rem", titleSize: "0.875rem" },
    large: { gap: 1.5, barHeight: 8, fontSize: "1rem", titleSize: "1rem" },
  };

  const sizeStyle = sizeMap[size];

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: sizeStyle.gap }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: sizeStyle.titleSize,
              fontWeight: 600,
              color: colors.neutral[900],
              mb: 0.25,
            }}
          >
            {name}
          </Typography>
          {description && (
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: colors.neutral[500],
                fontStyle: "italic",
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              fontSize: sizeStyle.fontSize,
              fontWeight: 700,
              color: color,
              minWidth: "2.5rem",
              textAlign: "right",
            }}
          >
            {score}/{maxScore}
          </Typography>
          {weight && (
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: colors.neutral[500],
                fontWeight: 500,
              }}
            >
              ({weight}%)
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          height: sizeStyle.barHeight,
          backgroundColor: colors.neutral[200],
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: 4,
            transition: "width 0.3s ease-in-out",
          }}
        />
      </Box>
    </Box>
  );
};

export default SkillScoreBar;
