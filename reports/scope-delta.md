# Comprehensive Scope Delta: Planned vs Delivered (Phases 1–9.1)

## Table 1: Fully Delivered Features (9 Phases, 45+ Capabilities, 25 Test Suites)
| Phase | Delivered Capability | Verification Suite | Status |
|---|---|---|---|
| M1-M2 | Dual runtime (Pyodide + Kimina), Monaco, VFS, onboarding | Suites 1-9 | 100% |
| Phase 1 | Local FS persistence, GitHub Device Flow, Web Crypto Vault (PBKDF2 100k + AES-GCM-256) | Suite 10 | 100% |
| Phase 2 | Open Source Discovery (Lean + Python), resolvers, toolchain guard | Suites 11-13 | 100% |
| Phase 3 | 5-Tier Memory (AST, buffer, IndexedDB, server, cold storage with SHA-256 dedup) | Suites 14-19 | 100% |
| Phase 4 | Discovery gap closure, 500 MiB streaming abort guard, canonical hashing, toolchain isolation | Suite 20 | 100% |
| Phase 5 | AiProvider strategy pattern, 7 LLM free tiers, Pantograph goal search tree | Suite 21 | 100% |
| Phase 5.5 | 5-Level Auto-Correction (L1-L5), kernel gates, contract gates | Suite 22 | 100% |
| Phase 7 | Blueprint DAG workspaces, atomic claiming, 5-term kernel seal, WebSocket relay, shared ledger | Suite 23 | 100% |
| Phase 8 | Proof Automation (Duper flag, AXLE disprove/simplify/states, LeanArchitect sync, Veriphy CAS) | Suite 24 | 100% |
| Phase 9.1 | Navigation Foundation: Command Registry (62 cmds), Context Key (28 keys), WhenClause (14 ops), cmdk, MenuBar, StatusBar | Suite 25 | 100% |

## Table 2: Partially Delivered & Active Scope (Current Focus)
| Item | Original Phase | Priority | Estimated Effort | Rationale & Current State |
|---|---|---|---|---|
| Bundle budget check | Phase 8 (A9) | Medium | 1h | Fully validated in Phase 9.4 audit report (12.8 KB actual vs 30 KB budget). |
| Unified Drawer with stable tabs | Phase 9.2 | High | 6h | Planned next phase to consolidate Memory, Auto-Fix, and Proof Automation. |
| Help Center, Preferences & Diagnostics | Phase 9.3 | High | 8h | Planned following Unified Drawer. |
| UI Helpers (Toast, Tooltip, EmptyState) | Phase 9.4 | High | 4h | Scheduled for integration in Phase 9.5. |
| E2E Navigation Specs & UI Docs | Phase 9.5 | Medium | 6h | Scheduled for Phase 9.5. |

## Table 3: Not Prioritized & Explicitly Deferred Scope (Backlog)
| Item | Original Source | Priority | Estimated Effort | Rationale for Deferral |
|---|---|---|---|---|
| Duper tactic extension research | Phase 8 Tier B | Low | 16h | Duper is experimental upstream; gated behind ENABLE_DUPER=false. |
| Veil transition system verification | Phase 8 Tier C | Low | 24h | Niche distributed protocol focus; out of scope for general math proving. |
| Multi-workspace orchestration | Phase 9 roadmap | Low | 12h | Single workspace per window satisfies 99% of user workflows. |
| Paperproof interactive playback | Phase 9 assessment | Low | 20h | Blueprint DAG interactive modal provides superior structural graph navigation. |
| ML training data extraction | Phase 9 assessment | Low | 16h | Enterprise feature; not required for core mathematician self-hosted IDE. |
| AXLE semantic refactoring engine | Phase 9 assessment | Low | 18h | Phase 8 simplifyProof covers core proof script compression with kernel seals. |
| VCVio hardware verification | Phase 9 assessment | Low | 30h | Hardware domain outside pure mathematics and Python scientific computing. |
