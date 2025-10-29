import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '' 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors';
  
  const variants = {
    default: 'bg-white/5 border-white/10 text-zinc-300',
    success: 'bg-green-500/10 border-green-500/20 text-green-300',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    brand: 'bg-brand-500/10 border-brand-500/20 text-brand-300'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
