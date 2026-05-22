/**
 * Vue d'ensemble du fichier : FadeIn.tsx
 * Role : composant d'animation simple pour l'apparition progressive des blocs UI.
 * Module : composants UI frontend.
 * Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
 */

// src/components/ui/FadeIn.tsx
import React, { useEffect, useRef, useState } from 'react';
import './FadeIn.css';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  className?: string;
  once?: boolean;
  threshold?: number;
}

export default function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  duration = 600,
  className = '',
  once = true,
  threshold = 0.1
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay, once, threshold]);

  return (
    <div
      ref={elementRef}
      className={`fade-in ${direction} ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        '--fade-duration': `${duration}ms`,
        '--fade-delay': `${delay}ms`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

