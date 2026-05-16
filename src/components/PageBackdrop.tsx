type Variant = "sunrise" | "dusk";

export function PageBackdrop({ variant = "sunrise" }: { variant?: Variant }) {
  const dusk = variant === "dusk";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: dusk ? "#1f1b16" : "var(--paper)" }}
    >
      {/* Blob 1 — ember sun */}
      <div
        className="absolute"
        style={{
          top: dusk ? "-30%" : "-25%",
          right: dusk ? "auto" : "-15%",
          left: dusk ? "-15%" : "auto",
          width: "70%",
          height: "85%",
          background: `radial-gradient(closest-side, rgba(226,81,28,${dusk ? 0.55 : 0.42}), transparent 65%)`,
          filter: `blur(${dusk ? 90 : 70}px)`,
        }}
      />
      {/* Blob 2 — peach */}
      <div
        className="absolute"
        style={{
          bottom: "-20%",
          left: dusk ? "auto" : "-15%",
          right: dusk ? "-15%" : "auto",
          width: dusk ? "55%" : "60%",
          height: dusk ? "60%" : "70%",
          background: `radial-gradient(closest-side, rgba(240,132,58,${dusk ? 0.3 : 0.32}), transparent 65%)`,
          filter: `blur(${dusk ? 100 : 90}px)`,
        }}
      />
      {/* Blob 3 — cream halo */}
      <div
        className="absolute"
        style={{
          top: dusk ? "30%" : "25%",
          left: dusk ? "auto" : "18%",
          right: dusk ? "10%" : "auto",
          width: dusk ? "40%" : "55%",
          height: dusk ? "50%" : "60%",
          background: `radial-gradient(closest-side, rgba(252,228,213,${dusk ? 0.2 : 0.65}), transparent 65%)`,
          filter: `blur(${dusk ? 110 : 100}px)`,
        }}
      />
      {/* Blob 4 — deep ember accent (sunrise only) */}
      {!dusk && (
        <div
          className="absolute"
          style={{
            top: "8%",
            left: "-5%",
            width: "28%",
            height: "32%",
            background: "radial-gradient(closest-side, rgba(178,59,14,0.22), transparent 65%)",
            filter: "blur(80px)",
          }}
        />
      )}

      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: dusk
            ? "linear-gradient(rgba(251,250,247,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(251,250,247,0.045) 1px, transparent 1px)"
            : "linear-gradient(rgba(21,20,15,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(21,20,15,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Noise overlay */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.35, mixBlendMode: "overlay" }}
      >
        <filter id="mf-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#mf-noise)" />
      </svg>
    </div>
  );
}
