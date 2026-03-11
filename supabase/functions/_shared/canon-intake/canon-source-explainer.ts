/**
 * Canon Source Explainer — Sprint 139
 * Provides human-readable explanations of the canon intake system.
 */

export function explainCanonIntake() {
  return {
    purpose: "The Canon Intake & Source Governance system ensures all knowledge entering AxionOS canon is properly sourced, evaluated, and governed.",
    principles: [
      "No external source may directly become canon",
      "All ingested material enters as candidate knowledge first",
      "All source access remains auditable",
      "Tenant isolation is enforced at every level",
      "No source may bypass governance or mutate system rules",
    ],
    source_types: {
      external_documentation: "Official documentation from external platforms or frameworks",
      internal_runtime_learning: "Patterns discovered during system runtime execution",
      internal_postmortem: "Knowledge extracted from incident postmortems",
      official_framework_docs: "Authoritative framework or library documentation",
      technical_reference: "Technical specifications, RFCs, or standards",
      methodology_reference: "Methodology guides (e.g., agile, DDD, event-sourcing)",
    },
    trust_tiers: {
      unknown: "Source not yet evaluated — strictest review posture",
      provisional: "Partially evaluated — candidate-only ingestion",
      verified: "Evaluated with positive track record — standard review",
      trusted: "High confidence — light review, promotable candidates",
    },
    lifecycle: [
      "1. Source is registered with type and domain",
      "2. Trust profile is created and evaluated",
      "3. Sync runs collect candidate knowledge",
      "4. Candidates enter intake queue as pending",
      "5. Review determines validation status",
      "6. Approved candidates may be promoted to canon (separate governance)",
    ],
    agent_roles: {
      canon_intake_agent: "Collects and registers candidate knowledge from sources",
      source_sync_agent: "Executes sync runs against registered sources",
      source_trust_evaluator: "Assesses and maintains source trust profiles",
    },
  };
}

export function explainSourceTrust(tier: string, score: number): string {
  const descriptions: Record<string, string> = {
    unknown: `Source trust is unknown (score: ${score}/100). Strict manual review required for all candidates.`,
    provisional: `Source is provisional (score: ${score}/100). Candidates accepted but require manual review before any promotion.`,
    verified: `Source is verified (score: ${score}/100). Candidates undergo standard review and may be promoted.`,
    trusted: `Source is trusted (score: ${score}/100). Light review posture, candidates are promotable.`,
  };
  return descriptions[tier] || `Trust tier "${tier}" with score ${score}/100.`;
}
