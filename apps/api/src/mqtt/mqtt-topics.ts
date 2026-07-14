/**
 * Centralized MQTT topic builders (D-01, Pitfall 10).
 * All topic patterns are defined here to avoid hardcoded strings.
 */
export const MqttTopics = {
  doorState: (siteId: string, doorId: string) =>
    `site/${siteId}/door/${doorId}/state`,

  readerBadge: (siteId: string, readerId: string) =>
    `site/${siteId}/reader/${readerId}/badge`,

  controllerHealth: (siteId: string, controllerId: string) =>
    `site/${siteId}/controller/${controllerId}/health`,

  // Wildcard subscriptions
  allDoorStates: () => "site/+/door/+/state",
  allReaderBadges: () => "site/+/reader/+/badge",
  allControllerHealth: () => "site/+/controller/+/health",

  // API status topic
  apiStatus: () => "oversight/api/status",
} as const;
