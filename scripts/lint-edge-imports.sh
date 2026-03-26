#!/bin/bash
# Sprint 74 — Edge Function Import Governance Linter
# Run: bash scripts/lint-edge-imports.sh
# Returns exit code 1 if violations found

set -euo pipefail

FUNCTIONS_DIR="supabase/functions"
VIOLATIONS=0
CHECKED=0

echo "🔍 Edge Function Import Governance Check"
echo "========================================="

# Patterns that are prohibited in actual import statements
check_file() {
  local file="$1"
  local has_violation=0

  # Check for esm.sh imports
  if grep -nE "^import .+ from ['\"]https://esm\.sh/" "$file" 2>/dev/null; then
    echo "  ❌ [no-esm-sh] Use npm: specifier instead"
    has_violation=1
  fi

  # Check for deno.land/x imports  
  if grep -nE "^import .+ from ['\"]https://deno\.land/x/" "$file" 2>/dev/null; then
    echo "  ❌ [no-deno-land-x] Use npm: specifier instead"
    has_violation=1
  fi

  # Check for deno.land/std imports
  if grep -nE "^import .+ from ['\"]https://deno\.land/std" "$file" 2>/dev/null; then
    echo "  ❌ [no-deno-land-std] Use jsr:@std/ or Deno native APIs"
    has_violation=1
  fi

  # Check for legacy serve import
  if grep -nE "^import \{ serve \} from" "$file" 2>/dev/null; then
    echo "  ❌ [no-legacy-serve] Use Deno.serve() native"
    has_violation=1
  fi

  return $has_violation
}

for file in $(find "$FUNCTIONS_DIR" -name "*.ts" -not -path "*node_modules*"); do
  CHECKED=$((CHECKED + 1))
  if ! check_file "$file" > /dev/null 2>&1; then
    continue
  fi
  
  # Re-run with output for violations
  output=$(check_file "$file" 2>/dev/null || true)
  if [ -n "$output" ]; then
    echo ""
    echo "📄 $file"
    check_file "$file" 2>/dev/null || true
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

echo ""
echo "========================================="
echo "Checked: $CHECKED files"

if [ $VIOLATIONS -gt 0 ]; then
  echo "❌ Found violations in $VIOLATIONS file(s)"
  exit 1
else
  echo "✅ All files pass import governance"
  exit 0
fi
