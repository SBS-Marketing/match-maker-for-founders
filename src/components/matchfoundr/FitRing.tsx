import { motion } from "framer-motion";

interface FitSegment {
  label: string;
  value: number; // 0-100
  color: string;
}

interface FitRingProps {
  score: number;
  segments: FitSegment[];
  size?: number;
  strokeWidth?: number;
}

export function FitRing({
  score,
  segments,
  size = 120,
  strokeWidth = 10,
}: FitRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const gap = 4; // gap between segments in degrees
  const totalGap = gap * segments.length;
  const totalDegrees = 360 - totalGap;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(21,20,15,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map((seg, i) => {
          const segDegrees = (seg.value / 100) * totalDegrees;
          const segLength = (segDegrees / 360) * circumference;
          const dashArray = `${segLength} ${circumference - segLength}`;
          const dashOffset = -offset;
          offset += segLength + (gap / 360) * circumference;

          return (
            <motion.circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: dashArray }}
              transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
            />
          );
        })}
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[28px] font-semibold leading-none tracking-tight"
          style={{ color: "var(--ember)" }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span
          className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
          style={{ color: "var(--smoke)" }}
        >
          Match
        </span>
      </div>
    </div>
  );
}

export function FitRingLegend({ segments }: { segments: FitSegment[] }) {
  return (
    <div className="flex flex-col gap-2">
      {segments.map((seg) => (
        <div key={seg.label} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: seg.color }}
          />
          <span className="flex-1 text-[12px] text-[var(--ink)]">{seg.label}</span>
          <span className="font-mono text-[11px] font-medium" style={{ color: seg.color }}>
            {seg.value}%
          </span>
        </div>
      ))}
    </div>
  );
}
