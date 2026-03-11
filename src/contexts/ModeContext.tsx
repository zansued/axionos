/**
 * ModeContext — Global mode state for AxionOS.
 * Tracks whether the user is in Builder Mode or Owner Mode.
 * Derived from the current route namespace (/builder/* vs /owner/*).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type AppMode = "builder" | "owner";

interface ModeContextValue {
  mode: AppMode;
  isBuilder: boolean;
  isOwner: boolean;
  modeLabel: string;
  modeDescription: string;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "builder",
  isBuilder: true,
  isOwner: false,
  modeLabel: "Builder Mode",
  modeDescription: "Build and ship your initiatives",
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const value = useMemo<ModeContextValue>(() => {
    const mode: AppMode = pathname.startsWith("/owner") ? "owner" : "builder";
    return {
      mode,
      isBuilder: mode === "builder",
      isOwner: mode === "owner",
      modeLabel: mode === "owner" ? "Owner Mode" : "Builder Mode",
      modeDescription: mode === "owner"
        ? "System governance & operations"
        : "Build and ship your initiatives",
    };
  }, [pathname]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  return useContext(ModeContext);
}
