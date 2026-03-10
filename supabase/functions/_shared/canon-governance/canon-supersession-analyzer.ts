/**
 * Canon Supersession Analyzer — Sprint 115
 * Analyzes supersession relationships between canon entries.
 */

export interface SupersessionLink {
  predecessor_id: string;
  successor_id: string;
  supersession_type: "full" | "partial" | "extension";
  reason: string;
}

export interface SupersessionAnalysis {
  chain_length: number;
  current_entry_id: string;
  is_terminal: boolean;
  supersession_chain: string[];
  rationale: string;
}

export function analyzeSupersessionChain(
  entryId: string,
  links: Array<{ predecessor_entry_id: string; successor_entry_id: string }>
): SupersessionAnalysis {
  const chain: string[] = [entryId];
  let current = entryId;
  const visited = new Set<string>();

  // Follow successor chain
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    const next = links.find(l => l.predecessor_entry_id === current);
    if (!next) break;
    chain.push(next.successor_entry_id);
    current = next.successor_entry_id;
  }

  const isTerminal = !links.some(l => l.predecessor_entry_id === current);

  return {
    chain_length: chain.length,
    current_entry_id: current,
    is_terminal: isTerminal,
    supersession_chain: chain,
    rationale: chain.length > 1
      ? `Entry has been superseded ${chain.length - 1} time(s). Current version: ${current}`
      : "Entry has not been superseded.",
  };
}
