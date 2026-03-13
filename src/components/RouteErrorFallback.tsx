/**
 * RouteErrorFallback — Shows a user-friendly error when a lazy route fails to load.
 * Provides retry capability without requiring a full page reload.
 */
import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { reportError } from "@/lib/observability";

interface Props {
  error?: Error;
  resetError?: () => void;
}

export function RouteErrorFallback({ error, resetError }: Props) {
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  }, [resetError]);

  // Report on mount
  useState(() => {
    reportError(error ?? new Error("Route render failed"), {
      source: "lazy",
      severity: "fatal",
      metadata: { route: location.pathname },
    });
  });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Não foi possível carregar esta página
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocorreu um erro ao carregar o conteúdo. Isso pode ser causado por uma conexão instável ou
        uma atualização recente do sistema.
      </p>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {retrying ? "Recarregando…" : "Tentar novamente"}
      </button>
    </div>
  );
}
