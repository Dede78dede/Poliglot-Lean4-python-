# How-To: Project Automations, Scaffolding & RO-Crate Export

Polyglot Code Studio includes automated workflows, research-grade project scaffolding, and auto-archiving.

---

## 1. Project Scaffolding Wizard (`Ctrl+Shift+N`)

To initialize a new project:
1. Press `Ctrl+Shift+N` (or `Cmd+Shift+N`) or choose **File > New Project...**.
2. Select from **8 canonical templates**:
   - **Python Minimal**: Clean Python 3.14 on Pyodide.
   - **Python Scientific (NumPy)**: Matrix operations and linear algebra.
   - **Python Data Analysis (Pandas)**: DataFrames and data manipulation.
   - **Symbolic Algebra (SymPy)**: Symbolic mathematics and differential calculus.
   - **Lean 4 Starter**: Bare Lean 4 formal logic project.
   - **Lean 4 Mathlib Starter**: Pre-configured Mathlib4 theorem proving project.
   - **Lean 4 Proof Demo**: Demonstrations of induction, calc blocks, and omega tactics.
   - **Dual-Runtime Hybrid Pipeline**: Python SymPy feeding directly into Lean 4 formal verification.
3. Review the included files (`lakefile.toml`/`pyproject.toml`, `README.md`, `ro-crate-metadata.json`) and click **Create & Initialize Project**.

---

## 2. LLM-Driven Auto-Archive on Idle

When `ENABLE_AGENTIC_AUTOMATION=true` and `autoArchiveEnabled=true`:
- If the workspace remains idle, the system analyzes VFS contents.
- Build artifacts and caches are excluded (`.lake/`, `__pycache__/`, `.git/`, `node_modules/`, `.trash/`).
- An interactive notification toast appears: `"Workspace Auto-Archive Proposed for N files"`.
- Click **Accept & Archive** to create a snapshot, or **Dismiss** to reject.

---

## 3. RO-Crate Project Export Bundle (`.polyglot`)

To produce a full research-grade archive:
- Send `POST /api/v1/projects/:id/export-bundle`.
- The system generates a `.polyglot` ZIP package containing:
  - `vfs/`: Clean project source code.
  - `meta/settings.json`: Workspace configuration.
  - `meta/feature-flags.json`: Active feature flags.
  - `meta/audit-log.json`: Verification and cryptographic audit entries.
  - `meta/bibliography.json`: Mathematical citations.
  - `meta/blueprint-dag.json`: Blueprint dependency graph.
  - `manifest.json` & `ro-crate-metadata.json`: RO-Crate 1.1 compliant metadata.
- Computes SHA-256 integrity digest and displays file size prior to download.

---

## 4. Scheduled Workflows (Opt-In)

Under **Settings > Advanced > Scheduled Workflows**, three maintenance jobs can be enabled:
1. **Nightly Proof Check**: Runs `lake build` and `lake check --paranoid` across all Lean 4 modules at 02:00 local time.
2. **Weekly Archive**: Archives a VFS snapshot weekly, strictly enforcing a 4-snapshot retention FIFO rotation.
3. **Weekly Dependency Audit**: Verifies `requirements.txt` and `lakefile.toml` against known vulnerability databases and toolchain releases.

---

*Last verified: 2026-10-29*
