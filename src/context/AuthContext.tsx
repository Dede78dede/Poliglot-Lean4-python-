import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  APP_ROLES,
  hasPermission as roleHasPermission,
  type AppPermission,
  type AppRole,
  type PublicUserAccount,
} from '../services/auth/roles';
import {
  bootstrapAdminAccount,
  fetchAuthStatus,
  fetchCurrentSession,
  fetchServerSettings,
  getSessionBearerToken,
  loginWithCredentials,
  logoutSession,
  registerUnauthorizedHandler,
  setSessionBearerToken,
  switchSessionRole,
  type LoginSessionResponse,
} from '../services/auth/api-client';
import { settingsStore } from '../services/settings/settings-store';

export interface AuthContextValue {
  readonly loading: boolean;
  readonly authenticated: boolean;
  readonly requiresBootstrap: boolean;
  readonly envPasscodeConfigured: boolean;
  readonly user: PublicUserAccount | null;
  readonly activeRole: AppRole | null;
  readonly baseRole: AppRole | null;
  readonly permissions: readonly AppPermission[];
  readonly tokenId: string | null;
  readonly expiresAt: string | null;
  readonly error: string | null;
  readonly isAuthModalOpen: boolean;
  readonly openAuthModal: () => void;
  readonly closeAuthModal: () => void;
  readonly refreshStatus: () => Promise<void>;
  readonly bootstrapAdmin: (input: { username: string; displayName?: string; password: string }) => Promise<boolean>;
  readonly login: (input: { username?: string; password?: string; passcode?: string }) => Promise<boolean>;
  readonly loginWithToken: (rawToken: string) => Promise<boolean>;
  readonly logout: () => Promise<void>;
  readonly switchRole: (role: AppRole) => Promise<boolean>;
  readonly hasPermission: (permission: AppPermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [requiresBootstrap, setRequiresBootstrap] = useState<boolean>(false);
  const [envPasscodeConfigured, setEnvPasscodeConfigured] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<PublicUserAccount | null>(null);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [baseRole, setBaseRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<readonly AppPermission[]>([]);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const syncSettingsFromServer = useCallback(async () => {
    try {
      const { settings } = await fetchServerSettings();
      settingsStore.applyServerSettings(settings);
    } catch {
      // Offline or unauthenticated fallback uses local store
    }
  }, []);

  const applyLoginPayload = useCallback(
    (payload: LoginSessionResponse) => {
      setSessionBearerToken(payload.token);
      setAuthenticated(true);
      setRequiresBootstrap(false);
      setUser(payload.user);
      setActiveRole(payload.activeRole);
      setBaseRole(payload.baseRole);
      setPermissions(payload.permissions);
      setTokenId(payload.tokenId);
      setExpiresAt(payload.expiresAt);
      setError(null);
      setIsAuthModalOpen(false);
      void syncSettingsFromServer();
    },
    [syncSettingsFromServer]
  );

  const clearSessionState = useCallback(() => {
    setSessionBearerToken(null);
    setAuthenticated(false);
    setUser(null);
    setActiveRole(null);
    setBaseRole(null);
    setPermissions([]);
    setTokenId(null);
    setExpiresAt(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await fetchAuthStatus();
      setRequiresBootstrap(status.requiresBootstrap);
      setEnvPasscodeConfigured(status.envPasscodeConfigured);

      if (getSessionBearerToken()) {
        try {
          const me = await fetchCurrentSession();
          setAuthenticated(true);
          setUser(me.user);
          setActiveRole(me.activeRole);
          setBaseRole(me.baseRole);
          setPermissions(me.permissions);
          setTokenId(me.tokenId);
          setError(null);
          void syncSettingsFromServer();
        } catch {
          clearSessionState();
        }
      }
    } catch {
      // Server unreachable (e.g., isolated component test); keep non-blocking state
    } finally {
      setLoading(false);
    }
  }, [clearSessionState, syncSettingsFromServer]);

  useEffect(() => {
    void refreshStatus();
    const unsubscribe = registerUnauthorizedHandler(() => {
      clearSessionState();
      setIsAuthModalOpen(true);
      setError('Sessione scaduta o non autorizzata. Effettua nuovamente l’accesso.');
    });
    return unsubscribe;
  }, [refreshStatus, clearSessionState]);

  const bootstrapAdmin = useCallback(
    async (input: { username: string; displayName?: string; password: string }): Promise<boolean> => {
      setError(null);
      try {
        const res = await bootstrapAdminAccount(input);
        applyLoginPayload(res);
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Bootstrap fallito');
        return false;
      }
    },
    [applyLoginPayload]
  );

  const login = useCallback(
    async (input: { username?: string; password?: string; passcode?: string }): Promise<boolean> => {
      setError(null);
      try {
        const res = await loginWithCredentials(input);
        applyLoginPayload(res);
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Credenziali non valide');
        return false;
      }
    },
    [applyLoginPayload]
  );

  const loginWithToken = useCallback(
    async (rawToken: string): Promise<boolean> => {
      setError(null);
      setSessionBearerToken(rawToken);
      try {
        const me = await fetchCurrentSession();
        setAuthenticated(true);
        setRequiresBootstrap(me.requiresBootstrap);
        setUser(me.user);
        setActiveRole(me.activeRole);
        setBaseRole(me.baseRole);
        setPermissions(me.permissions);
        setTokenId(me.tokenId);
        setIsAuthModalOpen(false);
        void syncSettingsFromServer();
        return true;
      } catch (err: unknown) {
        clearSessionState();
        setError(err instanceof Error ? err.message : 'Token Vault non valido o scaduto');
        return false;
      }
    },
    [clearSessionState, syncSettingsFromServer]
  );

  const logout = useCallback(async () => {
    await logoutSession();
    clearSessionState();
    setError(null);
    await refreshStatus();
  }, [clearSessionState, refreshStatus]);

  const switchRole = useCallback(async (role: AppRole): Promise<boolean> => {
    setError(null);
    try {
      const updated = await switchSessionRole(role);
      setActiveRole(updated.activeRole);
      setBaseRole(updated.baseRole);
      setPermissions(updated.permissions);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cambio ruolo negato');
      return false;
    }
  }, []);

  const hasPermission = useCallback(
    (permission: AppPermission): boolean => {
      if (!authenticated) return false;
      return roleHasPermission(activeRole ?? APP_ROLES.VIEWER, permission);
    },
    [activeRole, authenticated]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      authenticated,
      requiresBootstrap,
      envPasscodeConfigured,
      user,
      activeRole,
      baseRole,
      permissions,
      tokenId,
      expiresAt,
      error,
      isAuthModalOpen,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false),
      refreshStatus,
      bootstrapAdmin,
      login,
      loginWithToken,
      logout,
      switchRole,
      hasPermission,
    }),
    [
      loading,
      authenticated,
      requiresBootstrap,
      envPasscodeConfigured,
      user,
      activeRole,
      baseRole,
      permissions,
      tokenId,
      expiresAt,
      error,
      isAuthModalOpen,
      refreshStatus,
      bootstrapAdmin,
      login,
      loginWithToken,
      logout,
      switchRole,
      hasPermission,
    ]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useOptionalAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}

