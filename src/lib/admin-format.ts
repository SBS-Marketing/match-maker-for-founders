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

/** „vor 3 Min“ · „vor 2 Std“ · „gestern“ · „vor 4 Tagen“. */
export function relativeDE(iso: string | null | undefined, fallback = "nie eingeloggt"): string {
  if (!iso) return fallback;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return fallback;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.round(hours / 24);
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

/** „TT.MM. HH:mm“ */
export function dateTimeDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Fälligkeit: „heute“, „morgen“, „Fr“ (diese Woche), sonst „12.08.“ */
export function dueLabelDE(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff > 1 && diff < 7) return WEEKDAY_SHORT[d.getDay()]!;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

/** true, wenn die Fälligkeit heute ist oder in der Vergangenheit liegt. */
export function isDueSoon(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return startOf(d) <= startOf(new Date());
}
