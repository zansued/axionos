/**
 * Delegation Lifecycle Manager
 * Manages delegation validity, expiration, and revocation posture.
 */

export interface Delegation {
  id: string;
  delegated_to_ref: string;
  delegated_from_ref: string;
  delegation_type: string;
  start_at: string;
  end_at: string | null;
  revocation_status: string;
}

export interface DelegationPosture {
  isActive: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  remainingHours: number | null;
  status: string;
}

export function evaluateDelegation(d: Delegation, now: Date = new Date()): DelegationPosture {
  if (d.revocation_status === "revoked") {
    return { isActive: false, isExpired: false, isRevoked: true, remainingHours: null, status: "revoked" };
  }

  if (d.end_at) {
    const end = new Date(d.end_at);
    if (end < now) {
      return { isActive: false, isExpired: true, isRevoked: false, remainingHours: 0, status: "expired" };
    }
    const hours = Math.round((end.getTime() - now.getTime()) / 3600000);
    return { isActive: true, isExpired: false, isRevoked: false, remainingHours: hours, status: "active" };
  }

  return { isActive: true, isExpired: false, isRevoked: false, remainingHours: null, status: "active_indefinite" };
}

export function filterActiveDelegations(delegations: Delegation[], now: Date = new Date()): Delegation[] {
  return delegations.filter(d => evaluateDelegation(d, now).isActive);
}
