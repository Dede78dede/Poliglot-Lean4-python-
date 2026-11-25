import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  LogOut,
  Users,
  X,
  RefreshCw,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import {
  APP_ROLES,
  ROLE_LABELS,
  ROLE_LIST,
  type AppRole,
  type PublicUserAccount,
} from '../../services/auth/roles';
import {
  createUserAccount,
  createVaultToken,
  deleteUserAccount,
  fetchUsers,
  fetchVaultTokens,
  revokeVaultToken,
  rotateVaultToken,
  updateUserRoleRequest,
  type VaultTokenSummary,
} from '../../services/auth/api-client';

export interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps): React.JSX.Element | null {
  const auth = useAuthContext();
  const [authTab, setAuthTab] = useState<'session' | 'users' | 'tokens'>('session');
  const [loginMode, setLoginMode] = useState<'credentials' | 'token' | 'passcode'>('credentials');

  // Login / Bootstrap form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [rawTokenInput, setRawTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin Users & Tokens management
  const [users, setUsers] = useState<readonly PublicUserAccount[]>([]);
  const [tokens, setTokens] = useState<readonly VaultTokenSummary[]>([]);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>(APP_ROLES.VERIFIER);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenRole, setNewTokenRole] = useState<AppRole>(APP_ROLES.VERIFIER);
  const [newlyIssuedToken, setNewlyIssuedToken] = useState<string | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  const isAdminSession = auth.authenticated && auth.activeRole === APP_ROLES.ADMIN;

  useEffect(() => {
    if (!isOpen || !auth.authenticated) return;
    if (authTab === 'users' && isAdminSession) {
      void fetchUsers()
        .then(setUsers)
        .catch((err) => setAdminFeedback(err instanceof Error ? err.message : String(err)));
    } else if (authTab === 'tokens') {
      void fetchVaultTokens()
        .then(setTokens)
        .catch((err) => setAdminFeedback(err instanceof Error ? err.message : String(err)));
    }
  }, [auth.authenticated, authTab, isAdminSession, isOpen]);

  if (!isOpen) return null;

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await auth.bootstrapAdmin({ username, displayName: displayName || undefined, password });
    setSubmitting(false);
    if (ok) {
      setPassword('');
      onClose();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    let ok = false;
    if (loginMode === 'token') {
      ok = await auth.loginWithToken(rawTokenInput);
      setRawTokenInput('');
    } else if (loginMode === 'passcode') {
      ok = await auth.login({ passcode });
      setPasscode('');
    } else {
      ok = await auth.login({ username, password });
      setPassword('');
    }
    setSubmitting(false);
    if (ok) {
      onClose();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    try {
      await createUserAccount({
        username: newUserUsername,
        displayName: newUserDisplayName || undefined,
        password: newUserPassword,
        role: newUserRole,
      });
      setNewUserUsername('');
      setNewUserDisplayName('');
      setNewUserPassword('');
      setUsers(await fetchUsers());
      setAdminFeedback('Utente creato con successo.');
    } catch (err: unknown) {
      setAdminFeedback(err instanceof Error ? err.message : String(err));
    }
  };

  const handleIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    setNewlyIssuedToken(null);
    try {
      const issued = await createVaultToken({
        name: newTokenName || 'Workspace Token',
        role: newTokenRole,
        expiresInHours: 24,
      });
      setNewlyIssuedToken(issued.rawToken);
      setNewTokenName('');
      setTokens(await fetchVaultTokens());
    } catch (err: unknown) {
      setAdminFeedback(err instanceof Error ? err.message : String(err));
    }
  };

  const rank: Record<AppRole, number> = {
    viewer: 0,
    collaborator: 1,
    verifier: 2,
    admin: 3,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sessione e Gestione Accessi RBAC"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {auth.requiresBootstrap && !auth.authenticated
                  ? 'Configurazione Iniziale Amministratore'
                  : auth.authenticated
                  ? 'Profilo Sessione, Ruolo & Token Vault'
                  : 'Accesso Polyglot Code Studio'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Token di sessione cifrato in memoria runtime · Controllo RBAC granulare
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra accesso"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {auth.authenticated && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-slate-800 bg-slate-950/40 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setAuthTab('session')}
              className={`min-h-[40px] px-3 rounded-lg font-medium transition-colors ${
                authTab === 'session' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              Sessione & Ruolo
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('tokens')}
              className={`min-h-[40px] px-3 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                authTab === 'tokens' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Token Vault
            </button>
            {isAdminSession && (
              <button
                type="button"
                onClick={() => setAuthTab('users')}
                className={`min-h-[40px] px-3 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  authTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Utenti & Ruoli
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {auth.error && (
            <div role="alert" className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{auth.error}</span>
            </div>
          )}

          {adminFeedback && (
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800 text-blue-200">
              {adminFeedback}
            </div>
          )}

          {/* Unauthenticated Bootstrap / Login */}
          {!auth.authenticated && auth.requiresBootstrap && (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 leading-relaxed">
                Nessun account amministratore registrato nel vault locale. Crea il primo account Admin per proteggere le rotte <code className="font-mono text-blue-300">/api/v1/*</code>.
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="bootstrap-username" className="block text-slate-300 mb-1 font-medium">
                    Username Admin
                  </label>
                  <input
                    id="bootstrap-username"
                    type="text"
                    required
                    minLength={2}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="bootstrap-display" className="block text-slate-300 mb-1 font-medium">
                    Nome visualizzato
                  </label>
                  <input
                    id="bootstrap-display"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Workspace Administrator"
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="bootstrap-password" className="block text-slate-300 mb-1 font-medium">
                    Password (min 8 caratteri)
                  </label>
                  <input
                    id="bootstrap-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Creazione...' : 'Crea Amministratore ed Entra'}</span>
              </button>
            </form>
          )}

          {!auth.authenticated && !auth.requiresBootstrap && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex gap-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setLoginMode('credentials')}
                  className={`min-h-[40px] px-3 rounded-lg font-medium ${
                    loginMode === 'credentials' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Utente e Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode('token')}
                  className={`min-h-[40px] px-3 rounded-lg font-medium ${
                    loginMode === 'token' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Token Vault Bearer
                </button>
                {auth.envPasscodeConfigured && (
                  <button
                    type="button"
                    onClick={() => setLoginMode('passcode')}
                    className={`min-h-[40px] px-3 rounded-lg font-medium ${
                      loginMode === 'passcode' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Passcode Admin
                  </button>
                )}
              </div>

              {loginMode === 'credentials' && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="login-username" className="block text-slate-300 mb-1 font-medium">
                      Username
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="block text-slate-300 mb-1 font-medium">
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {loginMode === 'token' && (
                <div>
                  <label htmlFor="login-token" className="block text-slate-300 mb-1 font-medium">
                    Bearer Token dal Vault
                  </label>
                  <input
                    id="login-token"
                    type="password"
                    required
                    value={rawTokenInput}
                    onChange={(e) => setRawTokenInput(e.target.value)}
                    placeholder="Incolla token Bearer..."
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}

              {loginMode === 'passcode' && (
                <div>
                  <label htmlFor="login-passcode" className="block text-slate-300 mb-1 font-medium">
                    Passcode Amministratore Ambiente
                  </label>
                  <input
                    id="login-passcode"
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
              >
                {submitting ? 'Verifica...' : 'Accedi al Workspace'}
              </button>
            </form>
          )}

          {/* Authenticated Session & Role Switcher */}
          {auth.authenticated && authTab === 'session' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{auth.user?.displayName}</div>
                    <div className="text-xs font-mono text-slate-400">
                      @{auth.user?.username} · Token {auth.tokenId ?? 'session'}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-blue-400 font-semibold uppercase">
                      {auth.activeRole}
                    </div>
                    <div className="text-[11px] text-slate-500">Base: {auth.baseRole}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Cambia Ruolo Operativo Sessione
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROLE_LIST.map((r) => {
                    const baseRank = rank[auth.baseRole ?? APP_ROLES.VIEWER];
                    const disabled = auth.baseRole !== APP_ROLES.ADMIN && rank[r] > baseRank;
                    const active = auth.activeRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={disabled}
                        onClick={() => void auth.switchRole(r)}
                        className={`min-h-[44px] px-3 py-2 rounded-lg border text-left transition-colors ${
                          active
                            ? 'border-blue-500 bg-blue-600/20 text-white font-semibold'
                            : disabled
                            ? 'border-slate-800 bg-slate-950/30 text-slate-600 cursor-not-allowed'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{ROLE_LABELS[r]}</span>
                          {active && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Permessi Attivi ({auth.permissions.length})
                </div>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {auth.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => void auth.logout()}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 font-medium flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnetti e Revoca Sessione</span>
                </button>
              </div>
            </div>
          )}

          {/* Token Vault Management */}
          {auth.authenticated && authTab === 'tokens' && (
            <div className="space-y-4">
              <form onSubmit={handleIssueToken} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="Nome API token..."
                  className="px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                />
                <select
                  aria-label="Ruolo nuovo token"
                  value={newTokenRole}
                  onChange={(e) => setNewTokenRole(e.target.value as AppRole)}
                  className="px-3 py-2 min-h-[44px] rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                >
                  {ROLE_LIST.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Genera Token</span>
                </button>
              </form>

              {newlyIssuedToken && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 space-y-1">
                  <div className="text-emerald-300 font-semibold">
                    Nuovo token emesso (copialo ora, non verrà mostrato di nuovo):
                  </div>
                  <code className="block font-mono text-[11px] break-all text-white select-all">
                    {newlyIssuedToken}
                  </code>
                </div>
              )}

              <div className="space-y-2">
                {tokens.map((tok) => (
                  <div
                    key={tok.id}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">
                        {tok.name}{' '}
                        <span className="font-mono text-[11px] text-blue-400">
                          [{tok.role ?? 'admin'}]
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {tok.id} {tok.revokedAt ? '· REVOCATO' : tok.expiresAt ? `· Scade: ${tok.expiresAt.slice(0, 16)}` : ''}
                      </div>
                    </div>
                    {isAdminSession && !tok.revokedAt && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const rotated = await rotateVaultToken(tok.id);
                            setNewlyIssuedToken(rotated.newRawToken);
                            setTokens(await fetchVaultTokens());
                          }}
                          title="Ruota token"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded border border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await revokeVaultToken(tok.id);
                            setTokens(await fetchVaultTokens());
                          }}
                          title="Revoca token"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded border border-rose-800 hover:bg-rose-950 text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Users CRUD */}
          {auth.authenticated && authTab === 'users' && isAdminSession && (
            <div className="space-y-4">
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <input
                  type="text"
                  required
                  minLength={2}
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="Username"
                  className="px-3 py-2 min-h-[44px] rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
                <input
                  type="text"
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                  placeholder="Nome visualizzato"
                  className="px-3 py-2 min-h-[44px] rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password (min 8 char)"
                  className="px-3 py-2 min-h-[44px] rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Ruolo nuovo utente"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as AppRole)}
                    className="flex-1 px-3 py-2 min-h-[44px] rounded bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  >
                    Crea
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{u.displayName}</div>
                      <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        aria-label={`Ruolo utente ${u.username}`}
                        value={u.role}
                        onChange={async (e) => {
                          try {
                            await updateUserRoleRequest(u.id, e.target.value as AppRole);
                            setUsers(await fetchUsers());
                          } catch (err: unknown) {
                            setAdminFeedback(err instanceof Error ? err.message : String(err));
                          }
                        }}
                        className="px-2 py-1.5 min-h-[40px] rounded bg-slate-900 border border-slate-700 text-slate-100"
                      >
                        {ROLE_LIST.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteUserAccount(u.id);
                            setUsers(await fetchUsers());
                          } catch (err: unknown) {
                            setAdminFeedback(err instanceof Error ? err.message : String(err));
                          }
                        }}
                        aria-label={`Elimina utente ${u.username}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded border border-rose-800 hover:bg-rose-950 text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
