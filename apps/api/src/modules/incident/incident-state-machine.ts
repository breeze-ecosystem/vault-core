import { BadRequestException } from "@nestjs/common";

export enum IncidentStatus {
  OPEN = "open",
  TRIAGE = "triage",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

/**
 * Valid lifecycle transitions for incident management (INC-05).
 * Follows pattern from DoorStateMachine (D-04).
 */
export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.TRIAGE, IncidentStatus.CLOSED],
  [IncidentStatus.TRIAGE]: [IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING],
  [IncidentStatus.CLOSED]: [], // Terminal state — no transitions out
};

/**
 * State machine that enforces the strict incident lifecycle.
 * OPEN → TRIAGE → INVESTIGATING → RESOLVED → CLOSED
 * With allowed shortcuts: OPEN→CLOSED, TRIAGE→CLOSED, RESOLVED→INVESTIGATING
 */
export class IncidentStateMachine {
  /**
   * Validate a proposed status transition.
   * Throws BadRequestException if the transition is not allowed.
   */
  validateTransition(current: string, proposed: string): string {
    if (current === proposed) return proposed;

    const allowed = VALID_TRANSITIONS[current as IncidentStatus];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown incident status: ${current}`,
      );
    }
    if (!allowed.includes(proposed as IncidentStatus)) {
      throw new BadRequestException(
        `Invalid transition from ${current} to ${proposed}. ` +
        `Allowed transitions from ${current}: [${allowed.join(", ")}]`,
      );
    }

    return proposed;
  }
}
