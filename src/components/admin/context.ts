// Shell-Kontext: Badge-Zähler + kontextabhängige Topbar-Aktionen.

import { createContext, useContext, useEffect } from "react";
import type { PendingCounts } from "@/hooks/admin/useAdminData";

export type SectionActions = {
  newLabel?: string;
  onNew?: () => void;
  onExport?: () => void;
};

export type AdminShellValue = {
  pending: PendingCounts | undefined;
  setActions: (actions: SectionActions) => void;
};

export const AdminShellContext = createContext<AdminShellValue>({
  pending: undefined,
  setActions: () => {},
});

export function useAdminShell(): AdminShellValue {
  return useContext(AdminShellContext);
}

/** Registriert „Neu“/„Export“ der aktiven Sektion in der Topbar. */
export function useSectionActions(actions: SectionActions, deps: unknown[]): void {
  const { setActions } = useAdminShell();
  useEffect(() => {
    setActions(actions);
    return () => setActions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
