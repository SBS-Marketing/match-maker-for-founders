type Variant = "sunrise" | "dusk";

export function PageBackdrop({ variant = "sunrise" }: { variant?: Variant }) {
  const dusk = variant === "dusk";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: dusk ? "var(--ink)" : "var(--canvas)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: dusk
            ? "linear-gradient(180deg, rgba(255,255,255,0.035), transparent 34%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(250,248,243,0) 42%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: dusk ? "rgba(255,255,255,0.08)" : "var(--ruled-soft)" }}
      />
    </div>
  );
}
