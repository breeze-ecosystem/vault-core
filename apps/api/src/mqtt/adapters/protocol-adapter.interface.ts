import type { DoorStateEvent, BadgeReadEvent } from "../mqtt.types";

/**
 * D-02: Protocol adapter abstraction.
 * Each manufacturer's protocol has its own adapter that normalizes
 * raw MQTT payloads to standard DoorStateEvent / BadgeReadEvent formats.
 */
export interface ProtocolAdapter {
  /** Manufacturer identifier (e.g., "wiegand", "osdp", "hid") */
  readonly manufacturer: string;

  /** Normalize a raw MQTT payload to the standard DoorStateEvent format */
  normalizeDoorState(rawTopic: string, rawPayload: unknown): DoorStateEvent;

  /** Normalize a badge read event to the standard BadgeReadEvent format */
  normalizeBadgeRead(rawTopic: string, rawPayload: unknown): BadgeReadEvent;

  /** Validate that this message conforms to the expected schema */
  validate(rawPayload: unknown): boolean;
}
