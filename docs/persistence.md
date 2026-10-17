# Persistence & Security Architecture (Polyglot Code Studio)

## 1. Multi-Tier Persistence Strategy

Polyglot Code Studio provides zero-data-loss guarantees across client and server tiers:

1. **Client-Side Persistence (Tier 3)**:
   - Built on browser IndexedDB (`polyglot_studio_vfs`) and native Origin Private File System (OPFS).
   - In Chromium & Firefox: Large binaries and WASM assets are streamed into OPFS directories with explicit stream closing (`await writable.close()`).
   - In WebKit (Safari / WebKitGTK ephemeral contexts): Seamlessly demotes to IndexedDB object stores (Playwright #42579).
   - Real-time debounced auto-sync (200ms debounce with Last-Write-Wins conflict resolution).

2. **Server Workspace Persistence (Tier 4)**:
   - Dedicated session workspaces under `/projects_store/{sessionId}`.
   - 72-hour sliding TTL with automatic cleanup.
   - Pinned workspaces (`isPinned: true`) are immune from TTL deletion.

3. **Remote Git Synchronization**:
   - Integration with GitHub API via standard Git operations.
   - Conflict avoidance through unique branch naming:
     `sync-conflict-${Date.now()}-${randomUUID}`
   - Automatic merge and fast-forward handling with visual status feedback.

---

## 2. GitHub Device Flow Authentication

For secure terminal-less authentication, the studio implements the canonical OAuth 2.0 GitHub Device Authorization Flow (RFC 8628):

1. **Device Code Request**:
   - Client sends `POST /api/v1/auth/github/device/code` (client_id: configured in env).
   - GitHub returns `device_code`, `user_code`, `verification_uri` (`https://github.com/login/device`), and polling `interval`.
2. **User Authorization**:
   - Studio displays the human-readable 8-character `user_code` and opens the authorization URL in a safe popup/tab.
3. **Token Exchange & Polling**:
   - Server polls GitHub endpoint until authorization is granted or code expires.
   - Handles `authorization_pending`, `slow_down`, and `expired_token` error states according to RFC 8628 specs.
   - On success, GitHub issues an OAuth Personal Access Token with repository scope (`repo`).

---

## 3. Client Token Vault (AES-GCM-256)

Tokens are never saved in cleartext or in `localStorage`:

- **Web Crypto Encryption**: All credentials and tokens are encrypted with AES-256-GCM before storage.
- **Key Derivation**: Keys are derived from a user passphrase using PBKDF2 (100,000 iterations, SHA-256, unique cryptographic salt).
- **Session Memory Protection**: In-memory decryption keys are wiped on session lock or idle timeout.
- **Vary Header Isolation**: All HTTP requests authenticated via the vault send `Vary: Authorization` to prevent CDN or browser cache poisoning across multi-user environments.
