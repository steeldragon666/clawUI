import type { ReactNode } from 'react';

type BadgeVariant = 'cyan' | 'magenta' | 'green' | 'amber' | 'red' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  outline?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  cyan: 'text-neon-cyan border-neon-cyan bg-[rgba(0,240,255,0.1)]',
  magenta: 'text-neon-magenta border-neon-magenta bg-[rgba(255,0,170,0.1)]',
  green: 'text-neon-green border-neon-green bg-[rgba(0,255,136,0.1)]',
  amber: 'text-neon-amber border-neon-amber bg-[rgba(255,170,0,0.1)]',
  red: 'text-neon-red border-neon-red bg-[rgba(255,34,68,0.1)]',
  neutral: 'text-secondary border-secondary bg-[rgba(255,255,255,0.05)]',
};

const outlineVariantStyles: Record<BadgeVariant, string> = {
  cyan: 'text-neon-cyan border-neon-cyan glow-cyan',
  magenta: 'text-neon-magenta border-neon-magenta glow-magenta',
  green: 'text-neon-green border-neon-green glow-green',
  amber: 'text-neon-amber border-neon-amber glow-amber',
  red: 'text-neon-red border-neon-red glow-red',
  neutral: 'text-secondary border-border-subtle',
};

export function Badge({ variant, children, className = '', outline = false }: BadgeProps) {
  const base = 'inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border rounded-sm';
  const style = outline ? outlineVariantStyles[variant] : variantStyles[variant];

  return (
    <span className={`${base} ${style} ${className}`}>
      {children}
    </span>
  );
}
