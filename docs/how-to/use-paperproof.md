# How-To: Paperproof Proof-Tree Playback

Paperproof interactive proof-tree visualization allows developers and researchers to step chronologically through tactic applications and observe goal state transitions.

*Last verified: 2026-10-29*

---

## 1. Overview & Architecture

Paperproof operates via stdio transport to `uvx paperproof-mcp` hosted inside the `leanflow-runner` container.
- Exposes two tools:
  - `lean_proof_structure`: Extracts goal, hypothesis, and tactic AST nodes.
  - `lean_proof_steps`: Generates chronological stepping frames with diff descriptions.
- Gated by feature flag: `ENABLE_PAPERPROOF_PLAYBACK=true` (or legacy `ENABLE_PAPERPROOF`).

---

## 2. Using Proof Playback in FEMEV Drawer

1. Open the **FEMEV Drawer** from the bottom activity bar or by pressing `Ctrl+J`.
2. Select the **Paperproof** tab.
3. Choose a theorem or place the cursor inside a Lean declaration in Monaco.
4. Click **Generate Proof Tree**:
   - The interactive canvas renders the graph of goals.
   - Use playback controls: **Previous Step**, **Next Step**, **Play/Pause**, and **Reset**.
   - Review goal diffs highlighting created hypotheses, rewritten terms, and closed subgoals.

---

## 3. Epistemic Boundary

Paperproof visualization is purely diagnostic and pedagogical:
- Visual proof trees never promote proof statuses or synthesize truth claims.
- Only Lean 4 kernel verification (`SEAL_KERNEL_VERIFIED_TIER5`) certifies formal correctness.
