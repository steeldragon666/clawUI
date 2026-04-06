import { Bird, Briefcase, Globe, Camera } from 'lucide-react';

const PLATFORM_MAP: Record<string, { icon: typeof Bird; color: string; label: string }> = {
  x:         { icon: Bird,      color: '#00e5ff', label: 'X' },
  twitter:   { icon: Bird,      color: '#00e5ff', label: 'X' },
  linkedin:  { icon: Briefcase, color: '#0088ff', label: 'LinkedIn' },
  facebook:  { icon: Globe,     color: '#3b82f6', label: 'Facebook' },
  meta:      { icon: Globe,     color: '#3b82f6', label: 'Meta' },
  instagram: { icon: Camera,    color: '#ffb300', label: 'Instagram' },
};

interface PlatformIconProps {
  platform?: string;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function PlatformIcon({ platform = '', size = 14, showLabel = false, className = '' }: PlatformIconProps) {
  const key = platform.toLowerCase();
  const config = PLATFORM_MAP[key] || { icon: Globe, color: '#6b6b8a', label: platform || 'Unknown' };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} style={{ color: config.color }}>
      <Icon size={size} />
      {showLabel && <span className="font-mono text-[9px] uppercase tracking-wider">{config.label}</span>}
    </span>
  );
}
