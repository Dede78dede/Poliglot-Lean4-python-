# Phase 12 Deferred Items & Evaluation Triggers

This document tracks technical capabilities evaluated during Phase 12 research that are formally deferred to subsequent phases, specifying the exact trigger conditions required for evaluation.

---

## 1. Proof-State Snapshotting (DSP Pipeline)

- **Source**: "Keep the Proof State Live: Snapshotting for Efficient Tactic Search in Lean 4" (arXiv:2605.25556, Austin Shen & Yunong Shi, 2026-05-25).
- **Core Value**: Captures elaborated proof state and branches without theorem-body re-elaboration (5.6–50× wall-time speedup).
- **Deferral Rationale**: Requires a patched Lean binary and custom JSON-RPC methods (`dspSnapshotPing`, `dspSnapshotCapture`, `dspSnapshotBranch`). As stated by the authors: *"The patched Lean binary and the Snapshot-DSP pipeline will be released as open source upon publication"*. As of Phase 12, `A2DR1/Lean_Snapshot` is not yet available as open source.
- **Trigger**: When `A2DR1/Lean_Snapshot` is published as open source with tagged releases, evaluate for inclusion in Phase 13.

---

## 2. LeanDojo Integration

- **Source**: LeanDojo v4.20.0 (`lean-dojo/LeanDojo`).
- **Core Value**: Programmatic tracing and extraction of Lean 4 Mathlib AST environments.
- **Deferral Rationale**: Polyglot Code Studio is a dual-runtime editor and formal verification studio, not a model pre-training cluster. Tracing Mathlib requires Python `<3.13`, 32 GB RAM, and ~1 hour compute per run.
- **Trigger**: If a local fine-tuning or dataset distillation pipeline is introduced in Phase 13+.

---

## 3. Kubernetes Helm Chart & Multi-User Isolation

- **Deferral Rationale**: Current self-hosted distribution targets single-node developer workstations and server instances running rootless container sandboxes. Multi-tenant cluster isolation is scheduled for enterprise roadmap.
- **Trigger**: Phase 13 enterprise deployment milestone.
