/**
 * In-Memory Bearer Session Client
 *
 * Security Invariant:
 * Session Bearer tokens are held strictly in JavaScript runtime memory
 * and never persisted to localStorage or sessionStorage.
 */

import type { AppPermission, AppRole, PublicUserAccount } from './roles';
import type { PolyglotSettings } from '../settings/settings-types';

let inMemoryBearerToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export function setSessionBearerToken(token: string | null): void {
  inMemoryBearerToken = token && token.trim().length > 0 ? token.trim() : null;
}

export function getSessionBearerToken(): string | null {
  return inMemoryBearerToken;
}

export function registerUnauthorizedHandler(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (inMemoryBearerToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryBearerToken}`);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isPublicAuthRoute =
    urlStr.includes('/api/v1/auth/login') ||
    urlStr.includes('/api/v1/auth/bootstrap') ||
    urlStr.includes('/api/v1/auth/status');

  if (response.status === 401 && !isPublicAuthRoute && inMemoryBearerToken) {
    inMemoryBearerToken = null;
    for (const listener of unauthorizedListeners) {
      try {
        listener();
      } catch {
        // Isolate subscriber error
      }
    }
  }

  return response;
}

export interface AuthStatusResponse {
  readonly requiresBootstrap: boolean;
  readonly envPasscodeConfigured: boolean;
  readonly userCount: number;
}

export interface LoginSessionResponse {
  readonly authenticated: boolean;
  readonly token: string;
  readonly tokenId: string;
  readonly expiresAt: string | null;
  readonly user: PublicUserAccount;
  readonly activeRole: AppRole;
  readonly baseRole: AppRole;
  readonly permissions: readonly AppPermission[];
}

export interface CurrentSessionResponse {
  readonly authenticated: boolean;
  readonly requiresBootstrap: boolean;
  readonly user: PublicUserAccount;
  readonly activeRole: AppRole;
  readonly baseRole: AppRole;
  readonly tokenId: string | null;
  readonly permissions: readonly AppPermission[];
}

export interface VaultTokenSummary {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly userId?: string;
  readonly role?: AppRole;
  readonly baseRole?: AppRole;
  readonly authType?: 'session' | 'api-key';
  readonly expiresAt?: string;
  readonly revokedAt?: string;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!response.ok) {
    const errObj = data as { detail?: string; message?: string; title?: string };
    throw new Error(errObj.detail || errObj.message || errObj.title || `HTTP ${response.status}`);
  }
  return data as T;
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const res = await fetch('/api/v1/auth/status', { headers: { Accept: 'application/json' } });
  return parseJsonOrThrow<AuthStatusResponse>(res);
}

export async function bootstrapAdminAccount(payload: {
  username: string;
  displayName?: string;
  password: string;
}): Promise<LoginSessionResponse> {
  const res = await fetch('/api/v1/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<LoginSessionResponse>(res);
}

export async function loginWithCredentials(payload: {
  username?: string;
  password?: string;
  passcode?: string;
}): Promise<LoginSessionResponse> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow<LoginSessionResponse>(res);
}

export async function fetchCurrentSession(): Promise<CurrentSessionResponse> {
  const res = await authorizedFetch('/api/v1/auth/me');
  return parseJsonOrThrow<CurrentSessionResponse>(res);
}

export async function logoutSession(): Promise<void> {
  if (!inMemoryBearerToken) return;
  try {
    await authorizedFetch('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    inMemoryBearerToken = null;
  }
}

export async function switchSessionRole(role: AppRole): Promise<{
  readonly success: boolean;
  readonly activeRole: AppRole;
  readonly baseRole: AppRole;
  readonly permissions: readonly AppPermission[];
}> {
  const res = await authorizedFetch('/api/v1/auth/switch-role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  return parseJsonOrThrow(res);
}

export async function fetchUsers(): Promise<readonly PublicUserAccount[]> {
  const res = await authorizedFetch('/api/v1/auth/users');
  const data = await parseJsonOrThrow<{ users: PublicUserAccount[] }>(res);
  return data.users;
}

export async function createUserAccount(payload: {
  username: string;
  displayName?: string;
  password: string;
  role: AppRole;
}): Promise<PublicUserAccount> {
  const res = await authorizedFetch('/api/v1/auth/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await parseJsonOrThrow<{ user: PublicUserAccount }>(res);
  return data.user;
}

export async function updateUserRoleRequest(userId: string, role: AppRole): Promise<PublicUserAccount> {
  const res = await authorizedFetch(`/api/v1/auth/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  const data = await parseJsonOrThrow<{ user: PublicUserAccount }>(res);
  return data.user;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const res = await authorizedFetch(`/api/v1/auth/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  await parseJsonOrThrow(res);
}

export async function fetchVaultTokens(): Promise<readonly VaultTokenSummary[]> {
  const res = await authorizedFetch('/api/v1/auth/tokens');
  const data = await parseJsonOrThrow<{ tokens: VaultTokenSummary[] }>(res);
  return data.tokens;
}

export async function createVaultToken(payload: {
  name: string;
  role?: AppRole;
  expiresInHours?: number;
}): Promise<{ id: string; rawToken: string; expiresAt: string | null }> {
  const res = await authorizedFetch('/api/v1/auth/tokens', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res);
}

export async function rotateVaultToken(tokenId: string): Promise<{ id: string; newRawToken: string; expiresAt?: string }> {
  const res = await authorizedFetch(`/api/v1/auth/tokens/${encodeURIComponent(tokenId)}/rotate`, {
    method: 'POST',
  });
  return parseJsonOrThrow(res);
}

export async function revokeVaultToken(tokenId: string): Promise<void> {
  const res = await authorizedFetch(`/api/v1/auth/tokens/${encodeURIComponent(tokenId)}/revoke`, {
    method: 'POST',
  });
  await parseJsonOrThrow(res);
}

export async function fetchServerSettings(): Promise<{
  settings: PolyglotSettings;
  editable: boolean;
}> {
  const res = await authorizedFetch('/api/v1/settings');
  return parseJsonOrThrow(res);
}

export async function saveServerSettings(settings: PolyglotSettings): Promise<PolyglotSettings> {
  const res = await authorizedFetch('/api/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  const data = await parseJsonOrThrow<{ success: boolean; settings: PolyglotSettings }>(res);
  return data.settings;
}
