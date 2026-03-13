/**
 * Sidebar — Lightweight framer-motion sidebar for AxionOS.
 * Hover-to-expand on desktop, slide-over on mobile.
 * Adapted from Aceternity UI pattern for React Router.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Constants ───────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH_EXPANDED = "13.5rem";
const SIDEBAR_WIDTH_COLLAPSED = "4rem";

// ─── Context ─────────────────────────────────────────────────────────────────

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// ─── Mobile detection ────────────────────────────────────────────────────────

function useIsMobileSidebar() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

// ─── SidebarProvider ─────────────────────────────────────────────────────────

export function SidebarProvider({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) {
  const [openState, setOpenState] = React.useState(true);
  const isMobile = useIsMobileSidebar();

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, isMobile }}>
      <div
        className="flex min-h-svh w-full bg-background"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH_EXPANDED,
            "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// ─── Sidebar (wraps Desktop + Mobile) ────────────────────────────────────────

export function Sidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  collapsible?: string; // kept for compat, ignored
}) {
  return (
    <>
      <DesktopSidebar className={className}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
}

// ─── DesktopSidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, animate } = useSidebar();

  return (
    <motion.div
      className={cn(
        "h-svh hidden md:flex md:flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0 overflow-hidden",
        className
      )}
      animate={{
        width: animate ? (open ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED) : SIDEBAR_WIDTH_EXPANDED,
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      style={{ position: "sticky", top: 0 }}
    >
      {children}
    </motion.div>
  );
}

// ─── MobileSidebar ───────────────────────────────────────────────────────────

function MobileSidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="flex h-11 items-center px-4 md:hidden bg-sidebar border-b border-sidebar-border w-full fixed top-0 z-40">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground"
          onClick={() => setOpen(!open)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Slide-over panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[90] md:hidden"
              onClick={() => setOpen(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={cn(
                "fixed inset-y-0 left-0 w-[16rem] bg-sidebar text-sidebar-foreground z-[100] flex flex-col md:hidden border-r border-sidebar-border",
                className
              )}
            >
              <div className="flex items-center justify-end p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── SidebarTrigger (for Topbar compat) ──────────────────────────────────────

export function SidebarTrigger({ className }: { className?: string }) {
  const { setOpen, open } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={() => setOpen(!open)}
    >
      <Menu className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

// ─── Convenience layout sub-components ───────────────────────────────────────
// These keep the existing AppSidebar code working with minimal changes.

export const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overflow-x-hidden", className)} {...props} />
  )
);
SidebarContent.displayName = "SidebarContent";

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
  )
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full text-sm", className)} {...props} />
  )
);
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />
  )
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("relative", className)} {...props} />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild) {
    // Render the single child directly
    return <>{children}</>;
  }
  return (
    <button ref={ref} className={cn("flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-sidebar-accent", className)} {...props}>
      {children}
    </button>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 p-2", className)} {...props} />
  )
);
SidebarFooter.displayName = "SidebarFooter";
