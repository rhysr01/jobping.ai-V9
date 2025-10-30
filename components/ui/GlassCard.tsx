import { ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';

interface GlassCardProps extends Omit<MotionProps, 'children'> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  hover?: boolean | 'lift' | 'scale';
}

/**
 * Reusable glass morphism card component with consistent hover effects
 * Supports both static and animated (motion) variants
 */
export default function GlassCard({ 
  children, 
  className = '', 
  variant = 'subtle',
  hover = true,
  ...motionProps 
}: GlassCardProps) {
  const baseClasses = 'rounded-2xl border transition-all duration-300 shadow-base backdrop-blur-sm';
  
  const variants = {
    subtle: 'bg-glass-subtle border-border-subtle hover:border-border-default hover:shadow-[0_4px_12px_rgba(255,255,255,0.04)]',
    default: 'bg-glass-default border-border-default hover:border-border-elevated hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)]',
    elevated: 'bg-glass-elevated border-border-elevated hover:border-border-elevated shadow-elev-1 hover:shadow-[0_8px_24px_rgba(255,255,255,0.08)]',
  };

  const hoverEffects = {
    lift: { y: -4 },
    scale: { scale: 1.02 },
    true: { scale: 1.02, y: -2 },
  };

  const motionHover = hover 
    ? { 
        whileHover: hoverEffects[hover === true ? 'true' : hover] || hoverEffects.true,
        transition: { duration: 0.3 }
      }
    : {};

  const Component = motion.div;

  return (
    <Component 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...motionHover}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
