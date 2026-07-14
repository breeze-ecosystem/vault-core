import { BadRequestException } from "@nestjs/common";

export enum IncidentStatus {
  OPEN = "open",
  TRIAGE = "triage",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  CLOSED = "closed",
  IN_PROGRESS = "in_progress",  // Maintenance tickets only
}

/**
 * Valid lifecycle transitions for incident management (INC-05).
 * Follows pattern from DoorStateMachine (D-04).
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.TRIAGE, IncidentStatus.CLOSED],
  [IncidentStatus.TRIAGE]: [IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING],
  [IncidentStatus.CLOSED]: [], // Terminal state — no transitions out
  [IncidentStatus.IN_PROGRESS]: [], // Not used for incidents; included for type completeness
};

/**
 * Valid lifecycle transitions for maintenance tickets (WFL-01).
 * Simplified lifecycle: OPEN → IN_PROGRESS → RESOLVED → CLOSED
 */
export const MAINTENANCE_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.IN_PROGRESS, IncidentStatus.CLOSED],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
  // Incident-only statuses are not used for maintenance
  [IncidentStatus.TRIAGE]: [],
  [IncidentStatus.INVESTIGATING]: [],
};

/**
 * State machine that enforces the strict incident lifecycle.
 * INCIDENT: OPEN → TRIAGE → INVESTIGATING → RESOLVED → CLOSED
 * MAINTENANCE: OPEN → IN_PROGRESS → RESOLVED → CLOSED
 */
export class IncidentStateMachine {
  /**
   * Validate a proposed status transition.
   * Accepts optional ticketType to select the correct transition map.
   * Throws BadRequestException if the transition is not allowed.
   */
  validateTransition(current: string, proposed: string, ticketType?: string): string {
    if (current === proposed) return proposed;

    const transitions = ticketType === "MAINTENANCE_TICKET"
      ? MAINTENANCE_TRANSITIONS
      : INCIDENT_TRANSITIONS;

    const allowed = transitions[current as IncidentStatus];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown status: ${current}`,
      );
    }
    if (!allowed.includes(proposed as IncidentStatus)) {
      throw new BadRequestException(
        `Invalid transition from ${current} to ${proposed} for ${ticketType || "SECURITY_INCIDENT"}. ` +
        `Allowed: [${allowed.join(", ")}]`,
      );
    }

    return proposed;
  }
}
