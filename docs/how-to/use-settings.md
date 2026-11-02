# How-To: Configure Polyglot Studio Settings

The Settings interface in Polyglot Code Studio provides comprehensive control over the editor, appearance, toolchains, AI providers, and feature flags.

---

## 1. Opening Settings

- Press `Ctrl+,` (or `Cmd+,` on macOS).
- Alternatively, select **Preferences > Settings** from the Menu Bar, or click the **Settings** gear icon in the Activity Bar.

---

## 2. Navigating the 12 Categories

| Category | Description |
|---|---|
| **Editor** | Font size, tab spacing, word wrap, bracket pair colorization, sticky scroll, minimap, auto-save delay. |
| **Appearance** | Dark slate, Light, High Contrast themes; compact activity bar layout; side panel positioning. |
| **Runtime** | Pyodide WASM version (0.27.2), Lean toolchain default, container health polling interval. |
| **AI Providers** | Enabled toggles, model selections, pricing matrices, and secure Token Vault credential entry. |
| **Feature Flags** | 45 typed flags with phase indicators, category badges, and experimental alerts. |
| **MCP Server** | Native Streamable HTTP server toggle, bearer token rotation, and gateway routing. |
| **Toolchain** | Matrix of 11 installed Lean 4 toolchains. |
| **Keybindings** | Keyboard shortcut configuration and conflict detection. |
| **Chat & Prover** | Default AI provider, system prompt, max autonomous tool calls (50), and auto-archive idle threshold. |
| **5-Tier Memory** | Memory tier quotas (L1-L5), cache eviction, and cold storage exports. |
| **Privacy & Data** | Local-first verification and zero-telemetry confirmation. |
| **Advanced** | Debug mode, structured log levels, and settings JSON export/import. |

---

## 3. Immediate Apply & 5-Second Undo Toast

- All setting modifications take effect immediately across open Monaco editor instances and VFS stores.
- A **5-second undo toast** appears at the bottom of the screen upon modification. Clicking **Undo** immediately restores the previous state.

---

## 4. Resetting Defaults & Credential Protection

- Click **Reset Section** at the top right of any category to revert only that section to canonical defaults.
- Resetting all settings preserves all API keys and tokens stored in the **Token Vault**, preventing accidental credential deletion.

---

## 5. Export and Import

- Click **Export JSON** to backup configuration to `polyglot-settings.json`.
- Click **Import JSON** to load a settings configuration. Imported JSON is strictly validated using Zod; unknown or malformed properties are rejected to prevent state corruption.

---

*Last verified: 2026-10-29*
