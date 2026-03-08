/**
 * Product Opportunity Watchlist Manager — Sprint 55
 * Manages deferred or monitor-state opportunities without losing evidence lineage.
 */

export interface WatchlistItem {
  id: string;
  governance_state: string;
  watchlist_relevance_score: number;
  confidence_score: number;
  expected_value_score: number;
  last_signal_date?: string;
  evidence_links: any[];
}

export interface WatchlistAction {
  item_id: string;
  recommended_action: string;
  rationale: string[];
}

export function evaluateWatchlist(items: WatchlistItem[]): WatchlistAction[] {
  const watchlistItems = items.filter(i => ["monitor", "deferred"].includes(i.governance_state));

  return watchlistItems.map(item => {
    const rationale: string[] = [];
    let action = "keep_monitoring";

    // Signal strengthened
    if (item.confidence_score > 0.6 && item.expected_value_score > 0.6) {
      action = "re_evaluate_for_promotion";
      rationale.push("Signal strength improved — consider re-ranking");
    }

    // Stale signal
    if (item.last_signal_date) {
      const daysSince = (Date.now() - new Date(item.last_signal_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        action = "archive_stale";
        rationale.push(`No signal updates in ${Math.floor(daysSince)} days`);
      }
    }

    // Very low relevance
    if (item.watchlist_relevance_score < 0.1 && item.confidence_score < 0.2) {
      action = "archive_low_relevance";
      rationale.push("Watchlist relevance too low to justify continued monitoring");
    }

    if (rationale.length === 0) rationale.push("Still within monitoring thresholds");

    return { item_id: item.id, recommended_action: action, rationale };
  });
}
