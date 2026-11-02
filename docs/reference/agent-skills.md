# Reference: Agent Skills Bundle (AAIF Standard)

Polyglot Code Studio adheres to the **AAIF Agent Skills standard** (agentskills.io, donated to Linux Foundation 2026-10-22) to export tool usage patterns to CLI and IDE agents.

---

## 1. Supported Targets
- **Claude Code**: `.claude/skills/<name>/SKILL.md` (YAML frontmatter + markdown instructions).
- **Codex CLI**: `.agents/skills/<name>/SKILL.md`.
- **Cursor**: `.cursor/rules/<name>.mdc`.

---

## 2. Canonical Skills
1. `polyglot-prove-theorem`: Formal Lean 4 theorem formulation, solver queries, and kernel verification.
2. `polyglot-import-paper`: Academic LaTeX paper ingestion, citation extraction, and span ledger linking.
3. `polyglot-search-mathlib`: Semantic and RRF search across the Mathlib theorem library.
4. `polyglot-generate-blueprint`: Topological sorting and `sorry_using` stub synthesis for blueprints.
5. `polyglot-distribute-code`: RO-Crate 1.3 packaging and LSpec CI generation.

---

## 3. Strict Size Invariants
- `name`: Max 64 characters (violating raises `SKILL_NAME_TOO_LONG`, HTTP 422).
- `description`: Max 1024 characters (violating raises `SKILL_DESCRIPTION_TOO_LONG`, HTTP 422).
- `body`: Max 500 lines (violating raises `SKILL_BODY_TOO_LONG`, HTTP 422).

---

## 4. Regeneration
To regenerate skills after editing canonical assets in `assets/skills/`:
```bash
npx tsx scripts/generate-skills.ts
```
Manifest is saved in `.polyglot-skills-manifest.json`.
