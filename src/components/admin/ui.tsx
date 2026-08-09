// ─────────────────────────────────────────────────────────────
// Admin-Primitive (Warm Signal). Alle Bausteine nutzen die
// CSS-Variablen aus `.admin-shell` in src/styles.css.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export type Accent = "ember" | "indigo" | "green" | "amber" | "red" | "soft";

export const ACCENT: Record<Accent, { color: string; tint: string }> = {
  ember: { color: "var(--a-ember)", tint: "var(--a-ember-tint)" },
  indigo: { color: "var(--a-indigo)", tint: "var(--a-indigo-tint)" },
  green: { color: "var(--a-green)", tint: "var(--a-green-tint)" },
  amber: { color: "var(--a-amber)", tint: "var(--a-amber-tint)" },
  red: { color: "var(--a-red)", tint: "var(--a-red-tint)" },
  soft: { color: "var(--a-smoke)", tint: "var(--a-soft)" },
};

// ── Card ─────────────────────────────────────────────────────

export function AdminCard({
  children,
  padding = 16,
  className = "",
  style,
}: {
  children: ReactNode;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`admin-glass ${className}`}
      style={{
        background: "var(--a-surface)",
        border: "1px solid var(--a-border)",
        outline: "1px solid var(--a-border-soft)",
        outlineOffset: -1,
        borderRadius: 16,
        boxShadow: "var(--a-shadow)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AdminCardHead({
  icon: Icon,
  accent = "ember",
  title,
  sub,
  right,
}: {
  icon?: LucideIcon;
  accent?: Accent;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: ACCENT[accent].tint,
              color: "var(--a-ink)",
            }}
          >
            <Icon size={15} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <p
            className="truncate"
            style={{ fontSize: 14.5, fontWeight: 650, color: "var(--a-ink)" }}
          >
            {title}
          </p>
          {sub && (
            <p className="truncate" style={{ fontSize: 12, color: "var(--a-faint)" }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── KPI ──────────────────────────────────────────────────────

export type Delta = { dir: "up" | "down" | "flat"; label: string };

export function AdminKpi({
  icon: Icon,
  accent = "ember",
  label,
  value,
  unit,
  action,
  delta,
  compare,
}: {
  icon: LucideIcon;
  accent?: Accent;
  label: string;
  value: string;
  unit?: string;
  action?: ReactNode;
  delta?: Delta;
  compare?: string;
}) {
  return (
    <AdminCard padding={0}>
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{ borderBottom: "1px solid var(--a-border-soft)" }}
      >
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: ACCENT[accent].tint,
            color: "var(--a-ink)",
          }}
        >
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <span
          className="truncate"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--a-ink-soft)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 px-3.5 pt-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className="admin-num"
            style={{ fontSize: 29, fontWeight: 600, letterSpacing: "-0.035em" }}
          >
            {value}
          </span>
          {unit && <span style={{ fontSize: 12.5, color: "var(--a-faint)" }}>{unit}</span>}
        </div>
        {action}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 pb-3 pt-2">
        {delta ? (
          <span
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color:
                delta.dir === "up"
                  ? "var(--a-green)"
                  : delta.dir === "down"
                    ? "var(--a-red)"
                    : "var(--a-faint)",
            }}
          >
            {delta.dir === "up" && <ArrowUpRight size={13} strokeWidth={1.75} />}
            {delta.dir === "down" && <ArrowDownRight size={13} strokeWidth={1.75} />}
            {delta.dir === "flat" && (
              <span
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 2,
                  borderRadius: 2,
                  background: "var(--a-faint)",
                }}
              />
            )}
            {delta.label}
          </span>
        ) : (
          <span />
        )}
        {compare && (
          <span className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
            {compare}
          </span>
        )}
      </div>
    </AdminCard>
  );
}

// ── Pills ────────────────────────────────────────────────────

export function AdminPills<T extends string>({
  options,
  value,
  onChange,
  dotOn,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  dotOn?: T;
}) {
  return (
    <div
      className="inline-flex items-center gap-1"
      style={{ background: "var(--a-deep)", borderRadius: 11, padding: 3 }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 transition"
            style={{
              borderRadius: 9,
              fontSize: 12.5,
              fontWeight: active ? 650 : 550,
              color: active ? "var(--a-ink)" : "var(--a-smoke)",
              background: active ? "var(--a-surface-solid)" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(23,21,15,0.10)" : "none",
            }}
          >
            {dotOn === option.value && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: "var(--a-ember)",
                  display: "inline-block",
                }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────

export function AdminBadge({
  children,
  variant = "soft",
  mono = false,
}: {
  children: ReactNode;
  variant?: Accent;
  mono?: boolean;
}) {
  const isSoft = variant === "soft";
  return (
    <span
      className={mono ? "font-mono" : ""}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        borderRadius: 7,
        padding: "3px 8px",
        fontSize: 11.5,
        fontWeight: 600,
        background: ACCENT[variant].tint,
        color: isSoft ? "var(--a-smoke)" : ACCENT[variant].color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── Bar ──────────────────────────────────────────────────────

export function AdminBar({
  value,
  height = 8,
  color = "var(--a-ember)",
  track = "var(--a-deep)",
}: {
  value: number;
  height?: number;
  color?: string;
  track?: string;
}) {
  return (
    <span
      style={{
        display: "block",
        height,
        borderRadius: 99,
        background: track,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          borderRadius: 99,
          background: color,
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      />
    </span>
  );
}

// ── Dot area ─────────────────────────────────────────────────

export function AdminDotArea({
  data,
  labels,
  rows = 22,
  color = "var(--a-ember)",
  height = 132,
}: {
  data: number[];
  labels?: string[];
  rows?: number;
  color?: string;
  height?: number;
}) {
  const cols = Math.max(1, data.length);
  const max = Math.max(...data, 0.0000001);
  return (
    <div>
      <svg
        viewBox={`0 0 ${cols * 10} ${rows * 10}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
        aria-hidden="true"
      >
        {data.map((v, col) =>
          Array.from({ length: rows }, (_, r) => {
            const filledCount = Math.round((v / max) * rows);
            const filled = r >= rows - filledCount;
            return (
              <circle
                key={`${col}-${r}`}
                cx={col * 10 + 5}
                cy={r * 10 + 5}
                r={3}
                fill={filled ? color : "rgba(23,21,15,0.07)"}
              />
            );
          }),
        )}
      </svg>
      {labels && labels.length > 0 && (
        <div
          className="mt-1.5 flex justify-between"
          style={{ fontSize: 11, color: "var(--a-faint)" }}
        >
          {labels.map((l, i) => (
            <span key={`${l}-${i}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Waffle ───────────────────────────────────────────────────

export function AdminWaffle({ shares }: { shares: { share: number; color: string }[] }) {
  const total = 140;
  const cells: string[] = [];
  for (const s of shares) {
    const n = Math.round(s.share * total);
    for (let i = 0; i < n && cells.length < total; i++) cells.push(s.color);
  }
  while (cells.length < total) cells.push("rgba(23,21,15,0.07)");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(20, 1fr)",
        gap: 3,
      }}
    >
      {cells.slice(0, total).map((c, i) => (
        <span key={i} style={{ paddingTop: "100%", background: c, borderRadius: 3 }} />
      ))}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────

function gridTemplate(cols: string): string {
  return cols
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => (/^[\d.]+fr$/.test(c) ? `minmax(70px, ${c})` : c))
    .join(" ");
}

export function AdminTable({
  cols,
  head,
  children,
}: {
  cols: string;
  head: ReactNode[];
  children: ReactNode;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 640, borderRadius: 13, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate(cols),
            background: "var(--a-soft)",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--a-faint)",
          }}
        >
          {head.map((h, i) => (
            <div key={i} style={{ padding: "9px 14px", minWidth: 0, overflow: "hidden" }}>
              {h}
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminRow({ cols, cells }: { cols: string; cells: ReactNode[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridTemplate(cols),
        borderTop: "1px solid var(--a-border-soft)",
        fontSize: 13,
        alignItems: "center",
      }}
    >
      {cells.map((c, i) => (
        <div key={i} style={{ padding: "11px 14px", minWidth: 0, overflow: "hidden" }}>
          {c}
        </div>
      ))}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function AdminAvatar({
  name,
  size = 30,
  accent = "indigo",
}: {
  name: string | null | undefined;
  size?: number;
  accent?: Accent;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: ACCENT[accent].tint,
        color: ACCENT[accent].color,
        fontSize: size * 0.38,
        fontWeight: 650,
      }}
    >
      {initials(name)}
    </span>
  );
}

// ── Toggle ───────────────────────────────────────────────────

export function AdminToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 99,
        background: checked ? "var(--a-ember)" : "rgba(23,21,15,0.16)",
        position: "relative",
        transition: "background 160ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 16,
          height: 16,
          borderRadius: 99,
          background: "#fff",
          transition: "left 160ms ease",
          boxShadow: "0 1px 2px rgba(23,21,15,0.25)",
        }}
      />
    </button>
  );
}

// ── Button ───────────────────────────────────────────────────

export type BtnVariant = "primary" | "ember" | "ghost" | "quiet";

const BTN_STYLE: Record<BtnVariant, CSSProperties> = {
  primary: { background: "var(--a-ink)", color: "#fff", border: "1px solid var(--a-ink)" },
  ember: { background: "var(--a-ember)", color: "#fff", border: "1px solid var(--a-ember)" },
  ghost: {
    background: "var(--a-surface-solid)",
    color: "var(--a-ink)",
    border: "1px solid var(--a-border-soft)",
  },
  quiet: { background: "transparent", color: "var(--a-smoke)", border: "1px solid transparent" },
};

export function AdminBtn({
  children,
  icon: Icon,
  variant = "ghost",
  onClick,
  type = "button",
  disabled,
  title,
}: {
  children?: ReactNode;
  icon?: LucideIcon;
  variant?: BtnVariant;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        borderRadius: 10,
        padding: children ? "7px 11px" : 7,
        fontSize: 12.5,
        fontWeight: 600,
        ...BTN_STYLE[variant],
      }}
    >
      {Icon && <Icon size={14} strokeWidth={1.75} />}
      {children}
    </button>
  );
}

// ── Zustände ─────────────────────────────────────────────────

export function AdminLoading({ label = "Lade…" }: { label?: string }) {
  return (
    <p className="py-8 text-center" style={{ fontSize: 13, color: "var(--a-smoke)" }}>
      {label}
    </p>
  );
}

export function AdminEmpty({ label = "Noch keine Einträge" }: { label?: string }) {
  return (
    <p className="py-8 text-center" style={{ fontSize: 13, color: "var(--a-faint)" }}>
      {label}
    </p>
  );
}
