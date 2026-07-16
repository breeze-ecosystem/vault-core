import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PendingIncident {
  photoUri?: string;
  photoUris?: string[];
  notes?: string;
  timestamp: number;
}

export interface PendingDoorAction {
  id: string;
  doorId: string;
  action: "open" | "close" | "lock";
  queuedAt: number;
}

const CHECK_IN_KEY = "check_in_time";
const CAMERAS_KEY = "cached_cameras";
const REFRESH_KEY = "last_refresh";
const INCIDENT_QUEUE_KEY = "incident_queue";
const DOOR_ACTIONS_KEY = "pending_door_actions";

export const OfflineStorage = {
  async saveCheckInTime(timestamp: number): Promise<void> {
    try {
      await SecureStore.setItemAsync(CHECK_IN_KEY, String(timestamp));
    } catch (e) {
      console.warn("[OfflineStorage] saveCheckInTime failed:", e);
    }
  },

  async getCheckInTime(): Promise<number | null> {
    try {
      const val = await SecureStore.getItemAsync(CHECK_IN_KEY);
      return val ? Number(val) : null;
    } catch (e) {
      console.warn("[OfflineStorage] getCheckInTime failed:", e);
      return null;
    }
  },

  async clearCheckInTime(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CHECK_IN_KEY);
    } catch (e) {
      console.warn("[OfflineStorage] clearCheckInTime failed:", e);
    }
  },

  async cacheCameraList(cameras: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CAMERAS_KEY, JSON.stringify(cameras));
    } catch (e) {
      console.warn("[OfflineStorage] cacheCameraList failed:", e);
    }
  },

  async getCachedCameraList(): Promise<unknown[] | null> {
    try {
      const data = await AsyncStorage.getItem(CAMERAS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn("[OfflineStorage] getCachedCameraList failed:", e);
      return null;
    }
  },

  async getLastRefreshTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch (e) {
      console.warn("[OfflineStorage] getLastRefreshTime failed:", e);
      return null;
    }
  },

  async setLastRefreshTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_KEY, new Date().toISOString());
    } catch (e) {
      console.warn("[OfflineStorage] setLastRefreshTime failed:", e);
    }
  },

  async queueIncident(incident: PendingIncident): Promise<void> {
    try {
      const existing = await this.getPendingIncidents();
      existing.push({
        ...incident,
        id: Date.now().toString(),
        queuedAt: Date.now(),
      });
      await AsyncStorage.setItem(INCIDENT_QUEUE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn("[OfflineStorage] queueIncident failed:", e);
    }
  },

  async getPendingIncidents(): Promise<PendingIncident[]> {
    try {
      const data = await AsyncStorage.getItem(INCIDENT_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("[OfflineStorage] getPendingIncidents failed:", e);
      return [];
    }
  },

  async clearPendingIncidents(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INCIDENT_QUEUE_KEY);
    } catch (e) {
      console.warn("[OfflineStorage] clearPendingIncidents failed:", e);
    }
  },

};

// ─── Door action offline queue (standalone exports) ───

export async function queueDoorAction(action: Omit<PendingDoorAction, "id" | "queuedAt">): Promise<void> {
  try {
    const pending = await getPendingDoorActions();
    pending.push({
      ...action,
      id: Date.now().toString(),
      queuedAt: Date.now(),
    });
    await AsyncStorage.setItem(DOOR_ACTIONS_KEY, JSON.stringify(pending));
  } catch (e) {
    console.warn("[OfflineStorage] queueDoorAction failed:", e);
  }
}

export async function getPendingDoorActions(): Promise<PendingDoorAction[]> {
  try {
    const raw = await AsyncStorage.getItem(DOOR_ACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[OfflineStorage] getPendingDoorActions failed:", e);
    return [];
  }
}

export async function clearPendingDoorActions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DOOR_ACTIONS_KEY);
  } catch (e) {
    console.warn("[OfflineStorage] clearPendingDoorActions failed:", e);
  }
}

export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  try {
    const doorActions = await getPendingDoorActions();
    for (const action of doorActions) {
      try {
        const { controlDoor } = await import("./api");
        await controlDoor(action.doorId, action.action);
        synced++;
      } catch {
        failed++;
      }
    }
    if (synced > 0) {
      await clearPendingDoorActions();
    }
  } catch (e) {
    console.warn("[OfflineStorage] sync door actions failed:", e);
  }

  try {
    const incidents = await OfflineStorage.getPendingIncidents();
    for (const incident of incidents) {
      try {
        synced++;
      } catch {
        failed++;
      }
    }
    if (synced > 0) {
      await OfflineStorage.clearPendingIncidents();
    }
  } catch (e) {
    console.warn("[OfflineStorage] sync incidents failed:", e);
  }

  return { synced, failed };
}
