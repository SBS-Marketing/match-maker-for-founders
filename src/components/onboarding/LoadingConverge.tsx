import { CopilotMark } from "@/components/Copilot";

export function LoadingConverge({ label = "Dein Plan wird erstellt…" }: { label?: string }) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
      <div className="converge-pulse">
        <CopilotMark size={72} color="#15140f" spark="#E2511C" />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink)]/60">
        {label}
      </p>
      <style>{`
        .converge-pulse {
          animation: converge-pulse 1.5s ease-in-out infinite;
        }
        @keyframes converge-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
