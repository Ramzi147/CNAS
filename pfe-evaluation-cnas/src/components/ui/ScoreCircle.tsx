// src/components/ui/ScoreCircle.tsx
import { Box, CircularProgress, Typography } from "@mui/material";
import React from "react";
import { getPerformanceColor, getPerformanceLabel, colors } from "../../styles/constants";

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  onClick?: () => void;
}

const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  maxScore = 100,
  size = "medium",
  showLabel = true,
  onClick,
}) => {
  const percentage = (score / maxScore) * 100;
  const color = getPerformanceColor(score);
  const label = getPerformanceLabel(score);

  const sizeMap = {
    small: { width: 60, thickness: 3, fontSize: "0.875rem" },
    medium: { width: 100, thickness: 4, fontSize: "1.25rem" },
    large: { width: 140, thickness: 5, fontSize: "1.75rem" },
  };

  const sizeStyle = sizeMap[size];

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease-in-out",
        "&:hover": onClick
          ? {
              transform: "scale(1.05)",
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: sizeStyle.width,
          height: sizeStyle.width,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          variant="determinate"
          value={100}
          size={sizeStyle.width}
          thickness={sizeStyle.thickness}
          sx={{ color: colors.neutral[200], position: "absolute" }}
        />
        <CircularProgress
          variant="determinate"
          value={percentage}
          size={sizeStyle.width}
          thickness={sizeStyle.thickness}
          sx={{ color, position: "absolute" }}
        />
        <Box sx={{ textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: sizeStyle.fontSize,
              fontWeight: 700,
              color: colors.neutral[900],
            }}
          >
            {score}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.625rem",
              color: colors.neutral[500],
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 500,
            }}
          >
            / {maxScore}
          </Typography>
        </Box>
      </Box>

      {showLabel && (
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default ScoreCircle;
