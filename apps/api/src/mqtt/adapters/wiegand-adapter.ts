import type { ProtocolAdapter } from "./protocol-adapter.interface";
import type { DoorStateEvent, BadgeReadEvent, DoorStatePayload, BadgeReadPayload } from "../mqtt.types";

const WIEGAND_STATE_MAP: Record<string, string> = {
  "0": "locked",
  "1": "unlocked",
  "2": "held-open",
  "3": "forced",
  "4": "unsecured",
  "99": "desynchronized",
  locked: "locked",
  unlocked: "unlocked",
  "held-open": "held-open",
  'held_open': "held-open",
  forced: "forced",
  unsecured: "unsecured",
  breached: "forced",
  desynchronized: "desynchronized",
};

/**
 * Wiegand protocol adapter (Phase 1 minimum, D-02).
 * Normalizes Wiegand-formatted MQTT payloads from door controllers.
 *
 * Expected topic format: site/{siteId}/door/{doorId}/state
 * Expected payload format: { state: string, sequence: number, timestamp?: string }
 *
 * Also handles reader badge reads on: site/{siteId}/reader/{readerId}/badge
 */
export class WiegandAdapter implements ProtocolAdapter {
  readonly manufacturer = "wiegand";

  validate(rawPayload: unknown): boolean {
    if (!rawPayload || typeof rawPayload !== "object") return false;
    const p = rawPayload as Record<string, unknown>;
    // Must have at minimum either a state or badgeNumber + sequence
    return (typeof p.state === "string" && typeof p.sequence === "number") ||
           (typeof p.badgeNumber === "string" && typeof p.sequence === "number");
  }

  normalizeDoorState(rawTopic: string, rawPayload: unknown): DoorStateEvent {
    const payload = rawPayload as DoorStatePayload;
    const topicParts = rawTopic.split("/");
    const siteId = topicParts[1] || "";
    const doorId = topicParts[3] || "";

    const rawState = String(payload.state ?? "").toLowerCase();
    const normalizedState = WIEGAND_STATE_MAP[rawState] ?? payload.state ?? "locked";

    return {
      doorId: doorId || payload.deviceId || payload.controller_id || "",
      siteId: siteId,
      state: normalizedState,
      sequence: payload.sequence,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    };
  }

  normalizeBadgeRead(rawTopic: string, rawPayload: unknown): BadgeReadEvent {
    const payload = rawPayload as BadgeReadPayload;
    const topicParts = rawTopic.split("/");
    const siteId = topicParts[1] || "";
    const readerId = topicParts[3] || payload.deviceId || "";

    return {
      siteId: siteId,
      readerId: readerId,
      badgeNumber: payload.badgeNumber,
      sequence: payload.sequence,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    };
  }
}
