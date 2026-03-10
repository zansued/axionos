// SurfaceSwitcher – native AxionOS mode pivot with framer-motion animations.
// Supports Builder / Owner modes with role-aware access.

import * as React from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ChevronDown, Rocket, Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanonicalRole, NavGroups } from "@/lib/permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SurfaceId = "builder" | "owner";

interface Surface {
  id: SurfaceId;
  label: string;
  description: string;
  icon: React.ElementType;
  colorVar: string;
}

// ─── Surface metadata ────────────────────────────────────────────────────────

const ALL_SURFACES: Surface[] = [
  {
    id: "builder",
    label: "Builder Mode",
    description: "Build and ship your initiatives",
    icon: Rocket,
    colorVar: "--surface-product", // mantendo a cor antiga p/ nao quebrar CSS
  },
  {
    id: "owner",
    label: "Owner Mode",
    description: "System governance & operations",
    icon: Shield,
    colorVar: "--surface-platform", // mantendo a cor antiga
  },
];

const ROLE_SURFACE_ACCESS: Record<CanonicalRole, SurfaceId[]> = {
  end_user: ["builder"],
  operator: ["builder"],
  tenant_owner: ["builder", "owner"],
  platform_reviewer: ["builder", "owner"],
  platform_admin: ["builder", "owner"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAllowedSurfaces(role: CanonicalRole): Surface[] {
  const allowedIds = ROLE_SURFACE_ACCESS[role];
  return ALL_SURFACES.filter((s) => allowedIds.includes(s.id));
}

export function getSurfaceForRoute(path: string, navGroups: NavGroups): SurfaceId {
  const normalized = path.split("?")[0].split("#")[0];
  if (navGroups.owner.some((i) => i.url === normalized)) return "owner";
  return "builder";
}

export function getSurfaceMetadata(id: SurfaceId): Surface {
  return ALL_SURFACES.find((s) => s.id === id) ?? ALL_SURFACES[0];
}

// ─── Animated icon ───────────────────────────────────────────────────────────

function AnimatedIcon({
  icon: Icon,
  isActive,
  colorVar,
}: {
  icon: React.ElementType;
  isActive: boolean;
  colorVar: string;
}) {
  return (
    <motion.div
      className="relative h-4 w-4 shrink-0"
      initial={false}
      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Icon className="h-4 w-4" />
      {isActive && (
        <motion.div
          className="absolute inset-0"
          style={{ color: `hsl(var(${colorVar}))` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Click-away hook ─────────────────────────────────────────────────────────

function useClickAway(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) {
  React.useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// ─── SurfaceSwitcher ─────────────────────────────────────────────────────────

interface SurfaceSwitcherProps {
  role: CanonicalRole;
  activeSurface: SurfaceId;
  onSurfaceChange: (surface: SurfaceId) => void;
  collapsed?: boolean;
}

export function SurfaceSwitcher({
  role,
  activeSurface,
  onSurfaceChange,
  collapsed = false,
}: SurfaceSwitcherProps) {
  const allowedSurfaces = React.useMemo(() => getAllowedSurfaces(role), [role]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<SurfaceId | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useClickAway(dropdownRef as React.RefObject<HTMLElement>, () => setIsOpen(false));

  const selectedSurface =
    allowedSurfaces.find((s) => s.id === activeSurface) ?? allowedSurfaces[0];

  // Single-surface users see a static badge
  if (allowedSurfaces.length === 1) {
    if (collapsed) {
      return (
        <div
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `hsl(var(${selectedSurface.colorVar}) / 0.12)` }}
        >
          <selectedSurface.icon
            className="h-4 w-4"
            style={{ color: `hsl(var(${selectedSurface.colorVar}))` }}
          />
        </div>
      );
    }
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: `hsl(var(${selectedSurface.colorVar}) / 0.08)` }}
      >
        <selectedSurface.icon
          className="h-4 w-4"
          style={{ color: `hsl(var(${selectedSurface.colorVar}))` }}
        />
        <span className="text-sm font-medium text-sidebar-foreground">
          {selectedSurface.label}
        </span>
      </div>
    );
  }

  // Collapsed mode: icon chip
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
        style={{ backgroundColor: `hsl(var(${selectedSurface.colorVar}) / 0.12)` }}
      >
        <selectedSurface.icon
          className="h-4 w-4"
          style={{ color: `hsl(var(${selectedSurface.colorVar}))` }}
        />
      </button>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all",
            "border-sidebar-border bg-sidebar hover:bg-sidebar-accent/50",
            isOpen && "bg-sidebar-accent/60"
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="flex items-center gap-2.5">
            <AnimatedIcon
              icon={selectedSurface.icon}
              isActive
              colorVar={selectedSurface.colorVar}
            />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {selectedSurface.label}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {selectedSurface.description}
              </span>
            </span>
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-2 flex h-5 w-5 items-center justify-center"
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full z-50 mt-1.5"
            >
              <div className="rounded-xl border border-sidebar-border bg-sidebar p-1.5 shadow-xl">
                <div className="mb-1 px-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                  Switch Mode
                </div>
                <div className="space-y-0.5">
                  {allowedSurfaces.map((surface) => {
                    const isActive = selectedSurface.id === surface.id;
                    const isHovered = hovered === surface.id;
                    return (
                      <motion.button
                        type="button"
                        key={surface.id}
                        onClick={() => {
                          onSurfaceChange(surface.id);
                          setIsOpen(false);
                        }}
                        onHoverStart={() => setHovered(surface.id)}
                        onHoverEnd={() => setHovered(null)}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                          isActive
                            ? "bg-sidebar-accent"
                            : isHovered
                            ? "bg-sidebar-accent/60"
                            : "hover:bg-sidebar-accent/40"
                        )}
                        style={
                          isActive
                            ? { backgroundColor: `hsl(var(${surface.colorVar}) / 0.12)` }
                            : undefined
                        }
                      >
                        <AnimatedIcon
                          icon={surface.icon}
                          isActive={isActive || isHovered}
                          colorVar={surface.colorVar}
                        />
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium text-sidebar-accent-foreground">
                            {surface.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {surface.description}
                          </span>
                        </div>
                        {isActive && (
                          <Check
                            className="h-3.5 w-3.5"
                            style={{ color: `hsl(var(${surface.colorVar}))` }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
