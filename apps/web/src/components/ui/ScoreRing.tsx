import { cn } from '@/lib/utils';

type ScoreRingProps = {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
};

const getScoreColor = (score: number) => {
  if (score >= 80) return '#2DD4BF';
  if (score >= 60) return '#F59E0B';
  return '#F87171';
};

export const ScoreRing = ({ score, size = 112, strokeWidth = 10, label = 'Score', className }: ScoreRingProps) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeScore / 100) * circumference;
  const color = getScoreColor(safeScore);

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--foreground) / 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold text-[rgb(var(--foreground))]">{safeScore}</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted-foreground))]">
          {label}
        </div>
      </div>
    </div>
  );
};
