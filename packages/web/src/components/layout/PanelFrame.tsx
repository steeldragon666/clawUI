import type { ReactNode } from 'react';

interface PanelFrameProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function PanelFrame({ title, children, className = '', headerRight }: PanelFrameProps) {
  return (
    <div className={`glass-panel hud-corners scanlines flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          {title}
        </h2>
        {headerRight}
      </div>
      <div className="flex-1 overflow-hidden p-3">
        {children}
      </div>
    </div>
  );
}
