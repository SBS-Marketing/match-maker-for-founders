import { Link } from "@tanstack/react-router";
import type { Service } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";

export function ServiceChip({ service, size = "sm" }: { service: Service; size?: "sm" | "md" }) {
  const small = size === "sm";
  return (
    <span
      className="inline-flex items-center font-medium text-[var(--ink)]"
      style={{
        gap: small ? 6 : 8,
        padding: small ? "4px 10px 4px 6px" : "6px 14px 6px 8px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(21,20,15,0.08)",
        fontSize: small ? 11.5 : 13,
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full text-[var(--cream)]"
        style={{
          width: small ? 18 : 22,
          height: small ? 18 : 22,
          background: service.hue,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }}
      >
        <ServiceIcon name={service.icon} size={small ? 11 : 13} stroke={2} />
      </span>
      {service.short}
    </span>
  );
}

export function ServiceTile({
  service,
  accented = false,
  compact = false,
}: {
  service: Service;
  accented?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      to={service.route}
      className="group relative block overflow-hidden transition hover:-translate-y-0.5"
      style={{
        padding: compact ? 16 : 22,
        borderRadius: compact ? 16 : 20,
        background: accented
          ? `linear-gradient(155deg, ${service.hue}f2, ${service.hue}cc)`
          : "rgba(251,250,247,0.62)",
        backdropFilter: "blur(22px) saturate(140%)",
        border: accented
          ? "1px solid rgba(255,230,210,0.4)"
          : "1px solid rgba(255,255,255,0.7)",
        boxShadow: accented
          ? `0 18px 36px -14px ${service.hue}66, inset 0 1px 0 rgba(255,255,255,0.3)`
          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 14px 32px -16px rgba(21,20,15,0.18)",
        color: accented ? "var(--cream)" : "var(--ink)",
        minHeight: compact ? 100 : 170,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 12,
      }}
    >
      {/* glyph backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: -10,
          bottom: -14,
          opacity: accented ? 0.18 : 0.07,
          color: accented ? "var(--cream)" : service.hue,
        }}
      >
        <ServiceIcon name={service.icon} size={compact ? 100 : 130} stroke={1.4} />
      </div>

      <span
        className="inline-flex items-center justify-center text-[var(--cream)]"
        style={{
          width: compact ? 30 : 36,
          height: compact ? 30 : 36,
          borderRadius: 10,
          background: accented ? "rgba(255,255,255,0.18)" : service.hue,
          border: accented ? "1px solid rgba(255,255,255,0.25)" : "none",
          boxShadow: accented ? "none" : `0 6px 14px -6px ${service.hue}aa`,
        }}
      >
        <ServiceIcon name={service.icon} size={compact ? 16 : 19} stroke={2} />
      </span>

      <div
        className="font-semibold leading-tight tracking-tight"
        style={{ fontSize: compact ? 15 : 19 }}
      >
        {service.label}
      </div>

      {!compact && (
        <div
          className="leading-snug"
          style={{ fontSize: 13, color: accented ? "rgba(255,255,255,0.82)" : "var(--smoke)" }}
        >
          {service.blurb}
        </div>
      )}

      <div className="mt-auto flex items-baseline justify-between">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.14em",
            color: accented ? "rgba(255,255,255,0.7)" : "var(--smoke)",
          }}
        >
          {service.count} aktiv
        </span>
        <ServiceIcon name="arrowR" size={14} stroke={2} />
      </div>
    </Link>
  );
}
