/**
 * Canon Runtime Explainer — Sprint 141
 * Human-readable explanations for canon runtime retrieval.
 */

export function explainCanonRuntime() {
  return {
    purpose: "Canon Runtime Retrieval enables agents to consult canonical intelligence before and during task execution.",
    how_it_works: [
      "1. Agent receives task with canon retrieval context",
      "2. System queries canon library by domain, stack, practice type, and task context",
      "3. Results are ranked by relevance and applicability",
      "4. Top entries are injected into the agent's working context",
      "5. Agent applies canon guidance during execution",
      "6. Application outcomes are recorded for feedback loop",
    ],
    retrieval_dimensions: {
      domain: "Knowledge domain (e.g., frontend, backend, infrastructure)",
      stack: "Technology stack scope (e.g., react, node, postgres)",
      task_type: "Type of task being performed (e.g., implementation, validation, repair)",
      practice_type: "Type of practice sought (e.g., pattern, anti-pattern, checklist)",
      validation_context: "Validation rules and quality criteria",
      repair_context: "Error patterns and fix strategies",
      coordination_context: "Multi-agent collaboration patterns",
    },
    fallback_postures: {
      degrade_gracefully: "Continue execution without canon — log absence",
      warn_and_continue: "Log warning and continue with defaults",
      require_manual_review: "Pause and request human review",
      abort: "Stop execution if canon is unavailable (rare, high-stakes only)",
    },
    agent_use_cases: {
      architecture: "Consult architecture patterns and guidelines before design decisions",
      build: "Apply implementation patterns, templates, and checklists during coding",
      validation: "Check against validation rules and known anti-patterns",
      evolution: "Reference migration notes and methodology guidelines",
      coordination: "Apply coordination patterns and best practices for multi-agent work",
    },
    safety: [
      "Canon informs but does not override governance",
      "Canon absence degrades gracefully by default",
      "Retrieval is bounded and explainable",
      "Deprecated or blocked entries are never injected",
      "All retrieval is auditable",
    ],
  };
}

export function explainRetrievalSession(entries_retrieved: number, entries_applied: number, status: string): string {
  if (status === "completed") {
    return `Session completed: ${entries_retrieved} entries retrieved, ${entries_applied} applied to execution context.`;
  }
  if (status === "active") {
    return `Session active: ${entries_retrieved} entries retrieved so far.`;
  }
  return `Session ${status}: ${entries_retrieved} entries retrieved.`;
}
