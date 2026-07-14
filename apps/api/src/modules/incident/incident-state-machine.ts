export enum IncidentStatus {
  OPEN = "open",
  TRIAGE = "triage",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.TRIAGE, IncidentStatus.CLOSED],
  [IncidentStatus.TRIAGE]: [IncidentStatus.INVESTIGATING, IncidentStatus.CLOSED],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING],
  [IncidentStatus.CLOSED]: [],
};

export class IllegalIncidentTransitionError extends Error {
  constructor(
    public readonly incidentId: string,
    public readonly currentStatus: string,
    public readonly proposedStatus: string,
  ) {
    super(
      `Illegal incident transition for ${incidentId}: ${currentStatus} → ${proposedStatus}`,
    );
    this.name = "IllegalIncidentTransitionError";
  }
}

export class IncidentStateMachine {
  validateTransition(current: string, proposed: string): string {
    if (current === proposed) return proposed;

    const allowed = VALID_TRANSITIONS[current as IncidentStatus];
    if (!allowed || !allowed.includes(proposed as IncidentStatus)) {
      throw new IllegalIncidentTransitionError("", current, proposed);
    }

    return proposed;
  }
}
