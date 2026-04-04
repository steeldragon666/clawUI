interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  variant?: 'cyan' | 'green' | 'amber' | 'magenta';
  className?: string;
}

export function ProgressBar({ value, max = 100, label, variant = 'cyan', className = '' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Determine color based on variant or automatically based on threshold if variant not strictly enforced
  let colorClass = 'bg-neon-cyan';
  let glowClass = 'glow-cyan';
  
  if (variant === 'amber' || percentage >= 80) { colorClass = 'bg-neon-amber'; glowClass = 'glow-amber'; }
  if (variant === 'magenta' || percentage >= 95) { colorClass = 'bg-neon-magenta'; glowClass = 'glow-magenta'; }
  if (variant === 'green') { colorClass = 'bg-neon-green'; glowClass = 'glow-green'; }

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-end text-[10px] font-mono text-secondary">
          <span className="uppercase tracking-widest">{label}</span>
          <span className="tabular-nums">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-[#1e1e2d] rounded-sm overflow-hidden border border-border-subtle relative">
        <div 
          className={`h-full ${colorClass} ${glowClass} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
