/**
 * Smart Context Window — AST-like parser for TypeScript/React
 *
 * Extracts only the public API surface of each file:
 *   - export statements (types, interfaces, functions, components, constants)
 *   - import statements (to understand dependencies)
 *   - function signatures (without body)
 *   - component props types
 *
 * This reduces token usage by ~60-80% while preserving all information
 * needed for cross-file integration.
 */

export interface ExtractedContext {
  filePath: string;
  imports: string[];
  exports: ExportedSymbol[];
  /** Compact representation for AI prompts */
  compact: string;
  /** Original size vs compact size */
  compressionRatio: number;
}

export interface ExportedSymbol {
  kind: "type" | "interface" | "function" | "component" | "const" | "enum" | "class" | "hook";
  name: string;
  signature: string;
}

/**
 * Extract the public API surface from a TypeScript/React file.
 * Works via regex-based parsing (no runtime AST needed in Deno edge functions).
 */
export function extractSmartContext(filePath: string, content: string): ExtractedContext {
  const originalSize = content.length;
  const lines = content.split("\n");

  const imports: string[] = [];
  const exports: ExportedSymbol[] = [];
  const sections: string[] = [];

  // ── 1. Extract imports ──
  const importLines: string[] = [];
  let inMultilineImport = false;
  let multilineBuffer = "";

  for (const line of lines) {
    if (inMultilineImport) {
      multilineBuffer += " " + line.trim();
      if (line.includes("}") || line.includes("from")) {
        importLines.push(multilineBuffer.trim());
        inMultilineImport = false;
        multilineBuffer = "";
      }
      continue;
    }
    if (/^\s*import\s/.test(line)) {
      if (line.includes("from") && (line.includes(";") || line.includes("'"))) {
        importLines.push(line.trim());
      } else {
        inMultilineImport = true;
        multilineBuffer = line.trim();
      }
    }
  }
  imports.push(...importLines);

  // ── 2. Extract exported types & interfaces ──
  const typeRegex = /^export\s+(?:type|interface)\s+(\w+)(?:<[^>]*>)?\s*(?:=\s*([^;{]+)|(?:\{|extends))/gm;
  let match;
  while ((match = typeRegex.exec(content)) !== null) {
    const name = match[1];
    // Extract the full type/interface block
    const block = extractBlock(content, match.index);
    exports.push({
      kind: content.slice(match.index).startsWith("export type") ? "type" : "interface",
      name,
      signature: block,
    });
  }

  // ── 3. Extract exported functions & hooks ──
  const funcRegex = /^export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^\n{]+))?/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[1];
    const params = match[2].trim();
    const returnType = match[3]?.trim() || "void";
    const kind = name.startsWith("use") ? "hook" : "function";
    exports.push({
      kind,
      name,
      signature: `export function ${name}(${params}): ${returnType}`,
    });
  }

  // ── 4. Extract arrow function exports ──
  const arrowRegex = /^export\s+const\s+(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(?:(?:async\s+)?\(([^)]*)\)\s*(?::\s*[^=>\n]+)?\s*=>|(?:async\s+)?(?:function|\(([^)]*)\)))/gm;
  while ((match = arrowRegex.exec(content)) !== null) {
    const name = match[1];
    const typeAnnotation = match[2]?.trim();
    const isComponent = /^[A-Z]/.test(name);
    const isHook = name.startsWith("use");

    // Extract the signature line
    const lineEnd = content.indexOf("\n", match.index);
    const sigLine = content.slice(match.index, lineEnd > 0 ? lineEnd : match.index + 200).trim();

    // For components, try to find Props type
    let propsInfo = "";
    if (isComponent) {
      const propsMatch = sigLine.match(/\(\s*\{[^}]*\}:\s*(\w+)/);
      if (propsMatch) propsInfo = ` (props: ${propsMatch[1]})`;
    }

    exports.push({
      kind: isComponent ? "component" : isHook ? "hook" : "const",
      name,
      signature: typeAnnotation
        ? `export const ${name}: ${typeAnnotation}`
        : `export const ${name}${propsInfo}`,
    });
  }

  // ── 5. Extract exported enums ──
  const enumRegex = /^export\s+(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/gm;
  while ((match = enumRegex.exec(content)) !== null) {
    exports.push({
      kind: "enum",
      name: match[1],
      signature: `export enum ${match[1]} { ${match[2].trim()} }`,
    });
  }

  // ── 6. Extract exported classes ──
  const classRegex = /^export\s+(?:abstract\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+(?:extends|implements)\s+[^{]+)?\s*\{/gm;
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[1];
    // Extract public methods
    const classBlock = extractBlock(content, match.index);
    const publicMethods = extractPublicMethods(classBlock);
    exports.push({
      kind: "class",
      name,
      signature: publicMethods || `export class ${name} { ... }`,
    });
  }

  // ── 7. Extract default exports ──
  const defaultExportMatch = content.match(/^export\s+default\s+(?:function\s+)?(\w+)/m);
  if (defaultExportMatch) {
    const name = defaultExportMatch[1];
    if (!exports.some(e => e.name === name)) {
      exports.push({
        kind: /^[A-Z]/.test(name) ? "component" : "const",
        name,
        signature: `export default ${name}`,
      });
    }
  }

  // ── 8. Extract re-exports ──
  const reExportRegex = /^export\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/gm;
  while ((match = reExportRegex.exec(content)) !== null) {
    const symbols = match[1].trim();
    const from = match[2];
    imports.push(`export { ${symbols} } from "${from}"`);
  }

  // ── Build compact representation ──
  if (imports.length > 0) {
    sections.push("// imports");
    sections.push(...imports);
  }

  if (exports.length > 0) {
    sections.push("");
    sections.push("// public API");
    for (const exp of exports) {
      sections.push(exp.signature);
    }
  }

  const compact = `--- ${filePath} ---\n${sections.join("\n")}`;
  const compactSize = compact.length;
  const compressionRatio = originalSize > 0 ? 1 - (compactSize / originalSize) : 0;

  return { filePath, imports, exports, compact, compressionRatio };
}

/**
 * Extract a block (type/interface/class body) starting from a position.
 * Returns up to 500 chars to keep context small.
 */
function extractBlock(content: string, startIndex: number): string {
  const lineEnd = content.indexOf("\n", startIndex);
  const firstLine = content.slice(startIndex, lineEnd > 0 ? lineEnd : startIndex + 200);

  // For single-line types (type X = ...)
  if (firstLine.includes("=") && firstLine.includes(";")) {
    return firstLine.trim();
  }

  // For multi-line (interface/type with {})
  let braceDepth = 0;
  let end = startIndex;
  let started = false;

  for (let i = startIndex; i < content.length && i < startIndex + 2000; i++) {
    if (content[i] === "{") { braceDepth++; started = true; }
    if (content[i] === "}") { braceDepth--; }
    if (started && braceDepth === 0) { end = i + 1; break; }
    if (content[i] === ";" && !started) { end = i + 1; break; }
  }

  if (end <= startIndex) end = Math.min(startIndex + 300, content.length);

  const block = content.slice(startIndex, end).trim();
  // Truncate very large blocks but keep signature
  if (block.length > 500) {
    const lines = block.split("\n");
    return lines.slice(0, 15).join("\n") + "\n  // ... (truncated)";
  }
  return block;
}

/**
 * Extract public method signatures from a class body.
 */
function extractPublicMethods(classBlock: string): string {
  const methods: string[] = [];
  const methodRegex = /(?:public\s+|(?:async\s+))?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\n{]+))?/g;
  let match;
  while ((match = methodRegex.exec(classBlock)) !== null) {
    const name = match[1];
    if (["constructor", "if", "for", "while", "switch", "return"].includes(name)) continue;
    methods.push(`  ${name}(${match[2].trim()}): ${match[3]?.trim() || "void"}`);
  }
  if (methods.length === 0) return "";

  const className = classBlock.match(/class\s+(\w+)/)?.[1] || "Class";
  return `class ${className} {\n${methods.join("\n")}\n}`;
}

/**
 * Build a compact context string from multiple files.
 * This is the main entry point for the orchestrator.
 *
 * @param files Map of filePath → content
 * @param targetFile The file being generated (gets full dependency context)
 * @param maxTokenBudget Approximate char limit for the entire context
 */
export function buildSmartContextWindow(
  files: Record<string, string>,
  targetFile: string,
  directDeps: string[],
  maxTokenBudget = 12000,
): { context: string; stats: ContextStats } {
  const stats: ContextStats = {
    totalFiles: Object.keys(files).length,
    includedFiles: 0,
    originalChars: 0,
    compactChars: 0,
    compressionRatio: 0,
  };

  const sections: string[] = [];
  let currentSize = 0;

  // Priority 1: Direct dependencies — use FULL compact context
  for (const dep of directDeps) {
    if (!files[dep]) continue;
    const extracted = extractSmartContext(dep, files[dep]);
    stats.originalChars += files[dep].length;
    stats.compactChars += extracted.compact.length;

    if (currentSize + extracted.compact.length < maxTokenBudget * 0.6) {
      sections.push(extracted.compact);
      currentSize += extracted.compact.length;
      stats.includedFiles++;
    }
  }

  // Priority 2: Other files — just exports (no imports)
  const remaining = Object.entries(files)
    .filter(([fp]) => fp !== targetFile && !directDeps.includes(fp))
    .sort(([a], [b]) => {
      // Prioritize types, hooks, services over components/pages
      const priority = (p: string) => {
        if (p.includes("/types")) return 0;
        if (p.includes("/hooks/")) return 1;
        if (p.includes("/services/") || p.includes("/lib/")) return 2;
        if (p.includes("/components/ui/")) return 3;
        if (p.includes("/components/")) return 4;
        return 5;
      };
      return priority(a) - priority(b);
    });

  for (const [fp, content] of remaining) {
    if (currentSize >= maxTokenBudget) break;
    const extracted = extractSmartContext(fp, content);
    stats.originalChars += content.length;

    // Ultra-compact: just the export signatures
    const exportOnly = extracted.exports.map(e => e.signature).join("\n");
    const mini = `--- ${fp} ---\n${exportOnly}`;
    stats.compactChars += mini.length;

    if (mini.length > 20 && currentSize + mini.length < maxTokenBudget) {
      sections.push(mini);
      currentSize += mini.length;
      stats.includedFiles++;
    }
  }

  stats.compressionRatio = stats.originalChars > 0
    ? Math.round((1 - stats.compactChars / stats.originalChars) * 100)
    : 0;

  const context = sections.join("\n\n");
  return { context, stats };
}

export interface ContextStats {
  totalFiles: number;
  includedFiles: number;
  originalChars: number;
  compactChars: number;
  compressionRatio: number;
  semanticMatches?: number;
}

/**
 * Build smart context augmented with semantic search results.
 * Semantic matches are injected as priority between direct deps and remaining files.
 */
export function buildSmartContextWithSemantic(
  files: Record<string, string>,
  targetFile: string,
  directDeps: string[],
  semanticFiles: string[],
  maxTokenBudget = 12000,
): { context: string; stats: ContextStats } {
  // Merge semantic files into directDeps (deduped), giving them second priority
  const allPriority = [...new Set([...directDeps, ...semanticFiles])];
  const result = buildSmartContextWindow(files, targetFile, allPriority, maxTokenBudget);
  result.stats.semanticMatches = semanticFiles.length;
  return result;
}
