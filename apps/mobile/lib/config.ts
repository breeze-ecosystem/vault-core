import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; streamUrl?: string }
  | undefined;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function ensureApiSuffix(url: string): string {
  return url.endsWith("/api") ? url : `${url}/api`;
}

const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl;

const rawStreamUrl =
  process.env.EXPO_PUBLIC_STREAM_URL ??
  extra?.streamUrl;

export const API_URL = rawApiUrl
  ? ensureApiSuffix(normalizeUrl(rawApiUrl))
  : "http://localhost:4000/api";

export const STREAM_URL = rawStreamUrl
  ? normalizeUrl(rawStreamUrl)
  : "http://localhost:8080";

export const IS_CONFIG_VALID = !!(rawApiUrl && rawStreamUrl);

if (!rawApiUrl) {
  console.warn(
    "[config] EXPO_PUBLIC_API_URL is not defined. Set it in .env, eas.json, or app.json extra.apiUrl."
  );
}
if (!rawStreamUrl) {
  console.warn(
    "[config] EXPO_PUBLIC_STREAM_URL is not defined. Set it in .env, eas.json, or app.json extra.streamUrl."
  );
}
