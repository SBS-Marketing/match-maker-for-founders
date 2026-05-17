import type { ServiceIconName } from "@/data/services";
import type { JSX } from "react";

const PATHS: Record<ServiceIconName, JSX.Element> = {
  people: (
    <>
      <circle cx="8" cy="9" r="3.2" />
      <circle cx="16" cy="9" r="3.2" />
      <path d="M2.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M11.5 19c.7-3 3-4.5 5.5-4.5s4.5 1.5 5 4.5" />
    </>
  ),
  gavel: <path d="m4 18 7-7M9.5 15.5 17 8M6 6l8 8M13 2l8 8M3 22h10" />,
  ledger: (
    <>
      <path d="M5 3h11l3 3v15H5Z" />
      <path d="M9 8h7M9 12h7M9 16h4" />
    </>
  ),
  seal: (
    <>
      <path d="m12 2 2.4 1.7 2.9-.5.9 2.8 2.5 1.6-.5 2.9 1.7 2.4-1.7 2.4.5 2.9-2.5 1.6-.9 2.8-2.9-.5L12 22l-2.4-1.7-2.9.5-.9-2.8L3.3 16.4 3.8 13.5 2.1 11.1 3.8 8.7 3.3 5.8l2.5-1.6.9-2.8 2.9.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "arrow-up": <path d="M5 21v-7a7 7 0 0 1 14 0v7M9 9l3-4 3 4" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  spark2: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
  wand: (
    <>
      <path d="M15 4 4 15l3 3L18 7Z" />
      <path d="M14 5h3v3M19 11v2M21 12h-2M18 15v2M20 17h-2" />
    </>
  ),
  sparkles: <path d="M5 3v4M3 5h4M19 14v6M16 17h6M11 4l1.5 4.5L17 10l-4.5 1.5L11 16l-1.5-4.5L5 10l4.5-1.5Z" />,
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  flag: <path d="M5 21V3M5 4h12l-2 4 2 4H5" />,
  rocket: (
    <>
      <path d="M14 4c4 0 6 2 6 6 0 5-7 11-7 11s-7-6-7-11c0-4 2-6 6-6" />
      <circle cx="12" cy="10" r="2" />
      <path d="m9 19-2 3M15 19l2 3" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3M3 12v5c0 1.7 2.7 3 6 3" />
      <ellipse cx="15" cy="14" rx="6" ry="3" />
      <path d="M9 14v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4Z" fill="currentColor" />
    </>
  ),
  sparkle: <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />,
  cal: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  shield: <path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />,
  note: (
    <>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M16 4v3h3" />
    </>
  ),
  check2: <path d="m5 12 5 5L20 7" />,
  plus2: <path d="M12 5v14M5 12h14" />,
  arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowDR: <path d="M7 7h10v10M7 17 17 7" />,
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9h.01M18 15h.01" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
};

export function ServiceIcon({
  name,
  size = 18,
  stroke = 1.7,
  className,
}: {
  name: ServiceIconName;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
