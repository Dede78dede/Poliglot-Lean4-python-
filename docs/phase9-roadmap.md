# Phase 9 Research & Next-Generation Roadmap

**Polyglot Code Studio — Strategic Technology Assessment**  
**Evaluation Date**: October 15, 2026  
**Horizon**: Phases 9 through 11  

---

## 1. Executive Summary

With Phase 7 (Collaborative Proof Engineering & Archon Horizon Workspaces) and Phase 8 (Layered Proof Automation, Superposition Provers, Cloud Metaprogramming, Skeptical CAS) completed, Polyglot Code Studio provides an end-to-end environment for modern mathematics.

This roadmap presents a **scored multi-criteria evaluation** of 5 major candidates for Phase 9 to guide subsequent development cycles.

---

## 2. Multi-Criteria Evaluation Methodology

Candidates are evaluated across four weighted dimensions:
- **Mathematician Value (35%)**: Utility in accelerating formalization, proof clarity, and mathematical insight.
- **Python Developer Synergy (25%)**: Alignment with scientific computing, NumPy/WASM workflows, and hybrid verification.
- **Technical Feasibility & Stability (20%)**: Upstream package maturity, license, and toolchain stability with Lean `v4.35.0-rc4`.
- **Architectural Cohesion (20%)**: Reusability of existing Tier 5 CAS storage, Archon workspaces, and 5-term verification gates.

---

## 3. Scored Candidate Evaluation Matrix

| Candidate | Mathematician Value (1-10) | Python Synergy (1-10) | Feasibility (1-10) | Cohesion (1-10) | Weighted Score (10.0) | Priority Ranking |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Paperproof-Style Interactive Proof Playback** | 9.5 | 8.0 | 9.0 | 9.5 | **9.03** | **P0 (Immediate)** |
| **2. Semantic Refactoring & Definition Extraction** | 9.0 | 8.5 | 8.0 | 9.0 | **8.68** | **P1 (Next)** |
| **3. Multi-Workspace Cross-Project Orchestration** | 8.5 | 7.5 | 8.5 | 9.0 | **8.35** | **P1 (Next)** |
| **4. ML Dataset Extraction from Proof Traces** | 8.0 | 9.5 | 7.5 | 8.5 | **8.38** | **P2 (Strategic)** |
| **5. VCVio Visual Category Theory Canvas** | 8.5 | 5.5 | 6.5 | 6.5 | **7.05** | **P3 (Exploratory)** |

---

## 4. Detailed Candidate Analysis

### 4.1 Candidate 1: Paperproof-Style Interactive Proof Playback (Score: 9.03 — P0)
- **Concept**: Interactive step-by-step visual scrubbing through tactic states, showing hypotheses being created, mutated, and consumed across time.
- **Why It Wins**: Dramatically lowers the learning curve for mathematicians transitioning from paper proofs to Lean 4. Provides immediate visual intuition for how tactics transform goal trees.
- **Implementation Strategy**: Consume the `ProofLineState` extracted by Phase 8 AXLE / Pantograph to render a graphical timeline in the bottom dock.

### 4.2 Candidate 2: Semantic Refactoring & Definition Extraction (Score: 8.68 — P1)
- **Concept**: Automated extraction of shared lemmas across theorems, automatic generalization of types (e.g. generalizing from `ℝ` to arbitrary complete Archimedean fields), and safe renaming across multi-file projects.
- **Synergy**: Builds directly on the `blueprint-extractor` and `blueprint-sync` engines developed in Phases 7 & 8.

### 4.3 Candidate 3: Multi-Workspace Cross-Project Orchestration (Score: 8.35 — P1)
- **Concept**: Connecting independent Archon workspaces under a shared super-ledger, allowing projects like Liquid Tensor to import and verify lemmas from Topology or Algebra workspaces with cross-workspace cache deduplication.
- **Synergy**: Seamless extension of Phase 7 `WorkspaceStore` and Tier 5 Content-Addressed Storage.

### 4.4 Candidate 4: ML Dataset Extraction from Proof Traces (Score: 8.38 — P2)
- **Concept**: Exporting Lean 4 proof trajectories and Python test witness histories into standardized JSONL formats for fine-tuning open-weights models (DeepSeek-Prover, Leanstral, Llama 3 Math).
- **Synergy**: High value for AI/ML researchers in the Python ecosystem.

### 4.5 Candidate 5: VCVio Visual Category Theory Canvas (Score: 7.05 — P3)
- **Concept**: 2D graphical commutative diagram editor that compiles string diagrams and functorial transformations into Lean 4 category theory terms.
- **Assessment**: Mathematically elegant, but narrower in scope and technically complex to align with general algebra.

---

## 5. Phase 9 Execution Blueprint

Based on this assessment, the recommended roadmap for **Phase 9** is:
1. **Milestone 9.1**: Paperproof-Style Interactive Proof Playback & Goal Evolution Visualizer.
2. **Milestone 9.2**: Semantic Refactoring Engine (Lemma Extraction & Generalization).
3. **Milestone 9.3**: Multi-Workspace Cross-Ledger Import and Export.
