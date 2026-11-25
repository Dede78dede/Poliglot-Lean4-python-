/**
 * Role-Based Access Control (RBAC) Roles & Permissions
 * Shared zero-dependency definitions safe for both Express backend and React frontend.
 */

export const APP_ROLES = {
  ADMIN: 'admin',
  VERIFIER: 'verifier',
  COLLABORATOR: 'collaborator',
  VIEWER: 'viewer',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_LIST: readonly AppRole[] = [
  APP_ROLES.ADMIN,
  APP_ROLES.VERIFIER,
  APP_ROLES.COLLABORATOR,
  APP_ROLES.VIEWER,
] as const;

export const ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  admin: 'Admin',
  verifier: 'Verifier',
  collaborator: 'Collaborator',
  viewer: 'Viewer',
};

export type AppPermission =
  | 'workspace:read'
  | 'workspace:export'
  | 'files:write'
  | 'blueprint:claim'
  | 'proof:read'
  | 'proof:propose'
  | 'proof:verify'
  | 'ai:use'
  | 'search:read'
  | 'settings:read'
  | 'settings:write'
  | 'secrets:manage'
  | 'users:manage'
  | 'tokens:manage'
  | 'telemetry:read';

export const ROLE_PERMISSIONS: Readonly<Record<AppRole, readonly AppPermission[]>> = {
  admin: [
    'workspace:read',
    'workspace:export',
    'files:write',
    'blueprint:claim',
    'proof:read',
    'proof:propose',
    'proof:verify',
    'ai:use',
    'search:read',
    'settings:read',
    'settings:write',
    'secrets:manage',
    'users:manage',
    'tokens:manage',
    'telemetry:read',
  ],
  verifier: [
    'workspace:read',
    'workspace:export',
    'files:write',
    'blueprint:claim',
    'proof:read',
    'proof:propose',
    'proof:verify',
    'ai:use',
    'search:read',
    'settings:read',
    'telemetry:read',
  ],
  collaborator: [
    'workspace:read',
    'files:write',
    'blueprint:claim',
    'proof:read',
    'proof:propose',
    'ai:use',
    'search:read',
    'settings:read',
    'telemetry:read',
  ],
  viewer: [
    'workspace:read',
    'proof:read',
    'search:read',
    'settings:read',
    'telemetry:read',
  ],
};

export function isValidAppRole(value: unknown): value is AppRole {
  return (
    value === APP_ROLES.ADMIN ||
    value === APP_ROLES.VERIFIER ||
    value === APP_ROLES.COLLABORATOR ||
    value === APP_ROLES.VIEWER
  );
}

export function hasRole(userRole: AppRole | undefined, allowedRoles: readonly AppRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function hasPermission(userRole: AppRole | undefined, permission: AppPermission): boolean {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole].includes(permission);
}

export interface PublicUserAccount {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: AppRole;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt?: string;
}

export interface AuthSessionPayload {
  readonly authenticated: boolean;
  readonly requiresBootstrap: boolean;
  readonly user: PublicUserAccount | null;
  readonly activeRole: AppRole | null;
  readonly tokenId: string | null;
  readonly expiresAt: string | null;
  readonly permissions: readonly AppPermission[];
}
