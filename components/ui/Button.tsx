import React from 'react';

interface ButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'outline';
}

export function ButtonPrimary({ children, className = '', ...props }: ButtonProps) {
  return (
    <a
      {...props}
      className={`btn-primary ${className}`}
    >
      {children}
    </a>
  );
}

export function ButtonOutline({ children, className = '', ...props }: ButtonProps) {
  return (
    <a
      {...props}
      className={`btn-outline ${className}`}
    >
      {children}
    </a>
  );
}