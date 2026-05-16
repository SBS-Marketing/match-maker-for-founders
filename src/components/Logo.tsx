type Props = {
  size?: number;
  className?: string;
};

export function IconMF({ size = 28, className }: Props) {
  const w = size * 1.4;
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 140 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 14 L62 50 L8 86"
        stroke="var(--ink)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M132 14 L78 50 L132 86"
        stroke="var(--ember)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="50" r="6" fill="var(--ink)" />
    </svg>
  );
}

export function Wordmark({ size = 22, className }: Props) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.035em",
        color: "var(--ink)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      matchfoundr<span style={{ color: "var(--ember)" }}>.</span>
    </span>
  );
}

export function Lockup({
  layout = "horizontal",
  size = 24,
  className,
}: { layout?: "horizontal" | "stacked"; size?: number; className?: string }) {
  if (layout === "stacked") {
    return (
      <div className={className} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: size * 0.45 }}>
        <IconMF size={size * 1.4} />
        <Wordmark size={size * 1.05} />
      </div>
    );
  }
  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45 }}>
      <IconMF size={size} />
      <Wordmark size={size * 1.05} />
    </div>
  );
}
