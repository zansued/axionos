/**
 * Route-to-pageKey mapping for automatic PageGuidanceShell in AppShell.
 * Now delegates to the centralized route registry.
 */

import { getPageKeyFromRoute as _getPageKeyFromRoute } from "@/lib/routes";

export function getPageKeyFromRoute(pathname: string): string | null {
  return _getPageKeyFromRoute(pathname);
}
