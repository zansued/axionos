/**
 * Marketplace Pilot Policy Enforcer — Sprint 60
 * Evaluates pilot activity against exposure, trust, and policy controls.
 */

export interface PolicyEventSummary {
  total_events: number;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  violation_rate: number;
  participant_violation_rate: number;
  capability_violation_rate: number;
  top_violations: string[];
}

export function summarizePolicyEvents(
  events: any[],
  participantCount: number,
  capabilityCount: number
): PolicyEventSummary {
  let pass = 0, warn = 0, fail = 0;
  const violationDescriptions: string[] = [];

  for (const e of events) {
    if (e.policy_result === 'pass') pass++;
    else if (e.policy_result === 'warn') warn++;
    else if (e.policy_result === 'fail') { fail++; violationDescriptions.push(e.description || 'unknown'); }
  }

  const total = events.length || 1;

  return {
    total_events: events.length,
    pass_count: pass,
    warn_count: warn,
    fail_count: fail,
    violation_rate: Math.round((fail / total) * 10000) / 10000,
    participant_violation_rate: participantCount > 0 ? Math.round((fail / participantCount) * 10000) / 10000 : 0,
    capability_violation_rate: capabilityCount > 0 ? Math.round((fail / capabilityCount) * 10000) / 10000 : 0,
    top_violations: violationDescriptions.slice(0, 5),
  };
}
