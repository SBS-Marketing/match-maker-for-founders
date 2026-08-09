// Formatierung + CSV-Export für den Admin-Bereich.

export function formatUsd(v: number): string {
  return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

export function formatUsd2(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function formatTokens(v: number): string {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)} M`
    : v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : String(v);
}

export function formatDateDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "–"
    : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function shortDateDE(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

/** „vor 6 Std“ · „5 Tage“ — deutsch, kurz. */
export function waitedSince(iso: string | null): string {
  if (!iso) return "–";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "–";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 Tag" : `${days} Tage`;
}

/** Excel-DE-freundliches CSV: UTF-8 mit BOM, Semikolon-getrennt. */
export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
