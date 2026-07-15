import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const ORGANIZATION_KEY = "organization";
const ORGANIZATIONS_KEY = "organizations";

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  // Synchronous access for initial route check
  // Note: In production, use async pattern with context/state
  try {
    return SecureStore.getItem(ACCESS_TOKEN_KEY);
  } catch (e) {
    console.warn("[auth-storage] getAccessToken error:", e);
    return null;
  }
}

export async function getAccessTokenAsync(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshTokenAsync(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getUserAsync() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[auth-storage] getUserAsync error:", e);
    return null;
  }
}

export async function saveOrganization(org: object) {
  await SecureStore.setItemAsync(ORGANIZATION_KEY, JSON.stringify(org));
}

export async function getOrganizationAsync() {
  const raw = await SecureStore.getItemAsync(ORGANIZATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveOrganizations(orgs: object[]) {
  await SecureStore.setItemAsync(ORGANIZATIONS_KEY, JSON.stringify(orgs));
}

export async function getOrganizationsAsync() {
  const raw = await SecureStore.getItemAsync(ORGANIZATIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(ORGANIZATION_KEY);
  await SecureStore.deleteItemAsync(ORGANIZATIONS_KEY);
}
