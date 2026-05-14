import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; streamUrl?: string }
  | undefined;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

const rawApiUrl =
  extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://oversight-api.digitsoftafrica.com";

const rawStreamUrl =
  extra?.streamUrl ??
  process.env.EXPO_PUBLIC_STREAM_URL ??
  "https://oversight-stream.digitsoftafrica.com";

export const API_URL = normalizeUrl(rawApiUrl);

export const STREAM_URL = normalizeUrl(rawStreamUrl);
