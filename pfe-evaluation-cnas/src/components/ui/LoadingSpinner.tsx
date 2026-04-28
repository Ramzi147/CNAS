// src/components/ui/LoadingSpinner.tsx
import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  color = 'var(--primary)',
  className = ''
}: LoadingSpinnerProps) {
  return (
    <div
      className={`loading-spinner ${size} ${className}`}
      style={{ '--spinner-color': color } as React.CSSProperties}
    >
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
    </div>
  );
}