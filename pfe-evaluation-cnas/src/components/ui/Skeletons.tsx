// src/components/ui/TableSkeleton.tsx
import { Box, Skeleton, Stack, TableRow, TableCell, Typography, Button } from "@mui/material";
import React from "react";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 5 }) => {
  return Array.from({ length: rows }).map((_, rowIdx) => (
    <TableRow key={rowIdx}>
      {Array.from({ length: cols }).map((_, colIdx) => (
        <TableCell key={colIdx}>
          <Skeleton variant="text" width="80%" />
        </TableCell>
      ))}
    </TableRow>
  ));
};

// src/components/ui/CardSkeleton.tsx
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, idx) => (
        <Box key={idx}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        </Box>
      ))}
    </Stack>
  );
};

// src/components/ui/ErrorFallback.tsx
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
      }}
    >
      <Typography variant="h4" sx={{ mb: 2, color: "#dc2626" }}>
        Une erreur est survenue
      </Typography>
      <Typography sx={{ color: "#666", mb: 4, textAlign: "center" }}>
        {error.message || "Impossible de charger la page"}
      </Typography>
      <Button variant="contained" onClick={resetError}>
        Réessayer
      </Button>
    </Box>
  );
};

export default null;
