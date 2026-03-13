import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Build trigger: fix-env-loading-v4
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OnboardingProvider } from "@/components/OnboardingGuide";
import { I18nProvider } from "@/contexts/I18nContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsManager } from "@/components/KeyboardShortcutsManager";

// ─── Route modules ──────────────────────────────────────────────────────────
import { AuthRoute } from "@/routes/guards";
import { BuilderRoutes } from "@/routes/builder-routes";
import { OwnerRoutes } from "@/routes/owner-routes";
import { LegacyRedirects } from "@/routes/legacy-redirects";
import { Dashboard, Auth, NotFound } from "@/routes/lazy-pages";

// ─── Config ─────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Suspense fallback ──────────────────────────────────────────────────────

function PageLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <OrgProvider>
                  <PipelineProvider>
                    <WorkspaceProvider>
                      <ModeProvider>
                        <OnboardingProvider>
                          <CommandPalette />
                          <KeyboardShortcutsManager />
                          <Suspense fallback={<PageLoadingFallback />}>
                            <Routes>
                              {/* Auth & Landing */}
                              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                              <Route path="/" element={<Dashboard />} />

                              {/* Builder Mode — /builder/* */}
                              {BuilderRoutes()}

                              {/* Owner Mode — /owner/* */}
                              {OwnerRoutes()}

                              {/* Legacy Redirects */}
                              {LegacyRedirects()}

                              {/* Catch-all */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </OnboardingProvider>
                      </ModeProvider>
                    </WorkspaceProvider>
                  </PipelineProvider>
                </OrgProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
