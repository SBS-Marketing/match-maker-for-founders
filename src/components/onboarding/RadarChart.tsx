import type { AssessmentScores } from "../../../onboarding/assessment";

const AXES: { key: keyof AssessmentScores; label: string }[] = [
  { key: "risk", label: "Risiko" },
  { key: "structure", label: "Struktur" },
  { key: "decision", label: "Entscheidung" },
  { key: "leadership", label: "Führung" },
  { key: "commitment", label: "Commitment" },
  { key: "feedback", label: "Feedback" },
];

export function RadarChart({ scores, size = 260 }: { scores: AssessmentScores; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 32;
  const n = AXES.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 5) * r;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };

  const labelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (r + 20), y: cy + Math.sin(angle) * (r + 20) };
  };

  const polygon = AXES.map((axis, i) => {
    const p = point(i, scores[axis.key] ?? 3);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <polygon
          key={level}
          points={AXES.map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            const dist = (level / 5) * r;
            return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(21,20,15,0.08)"
          strokeWidth={1}
        />
      ))}
      {AXES.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="rgba(21,20,15,0.08)"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(226,81,28,0.25)"
        stroke="#E2511C"
        strokeWidth={2}
      />
      {AXES.map((axis, i) => {
        const p = point(i, scores[axis.key] ?? 3);
        return <circle key={axis.key} cx={p.x} cy={p.y} r={3} fill="#E2511C" />;
      })}
      {AXES.map((axis, i) => {
        const lp = labelPoint(i);
        return (
          <text
            key={axis.key}
            x={lp.x}
            y={lp.y}
            fontSize={11}
            fill="#15140f"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: "Geist Mono, monospace" }}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
