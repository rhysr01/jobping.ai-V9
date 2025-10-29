import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
}

export default function GlassCard({ children, className = '', variant = 'default' }: GlassCardProps) {
  const baseClasses = 'rounded-2xl border transition-colors';
  
  const variants = {
    default: 'bg-white/5 border-white/10 hover:border-white/20',
    elevated: 'bg-white/10 border-white/15 hover:border-white/25 shadow-elev-1',
    subtle: 'bg-white/3 border-white/8 hover:border-white/15'
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
