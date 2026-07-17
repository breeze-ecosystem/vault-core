export interface PTZPreset {
  token: string;
  name: string;
  snapshotUrl: string | null;
}

export interface PTZCapabilities {
  hasPtz: boolean;
  absoluteMove: boolean;
  continuousMove: boolean;
  relativeMove: boolean;
  presets: boolean;
}
