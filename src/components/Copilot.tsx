export function CopilotMark({ size = 18, color = "currentColor", spark = "var(--ember)" }: { size?: number; color?: string; spark?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <path d="M5 6l5 6-5 6" />
      <path d="M11 6l5 6-5 6" />
      <circle cx="20" cy="12" r="1.6" fill={spark} stroke="none" />
    </svg>
  );
}

export function AITag({ children = "AI", tone = "light" }: { children?: React.ReactNode; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-mono uppercase"
      style={{
        padding: "3px 9px",
        fontSize: 10,
        letterSpacing: "0.14em",
        background: dark ? "rgba(255,255,255,0.08)" : "var(--ink)",
        color: dark ? "rgba(255,255,255,0.75)" : "var(--cream)",
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "none",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--ember)" }}
      />
      {children}
    </span>
  );
}

export function ThinkingTrace({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div
      className="flex items-center gap-2 font-mono"
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(21,20,15,0.04)",
        border: `1px dashed ${dark ? "rgba(255,255,255,0.12)" : "rgba(21,20,15,0.12)"}`,
        fontSize: 11,
        color: dark ? "rgba(255,255,255,0.55)" : "var(--smoke)",
      }}
    >
      <span
        className="inline-block h-1 w-1 rounded-full"
        style={{ background: "var(--ember)" }}
      />
      <span>{children}</span>
    </div>
  );
}

export function FitScore({ value, label = "fit" }: { value: number; label?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-semibold leading-none tracking-tight text-[var(--ember)]" style={{ fontSize: 18 }}>
        {value}
      </span>
      <span className="font-mono text-[10px] text-[var(--smoke)]">{label}</span>
    </span>
  );
}
