# Polyglot Code Studio — Diátaxis Documentation Architecture

Polyglot Code Studio organizes its technical documentation following the **Diátaxis framework**, cleanly separating user documentation into four fundamental modes:

```
                  PRACTICAL CRAFT
                        ▲
                        │
       Tutorials        │       How-To Guides
    (Learning-Oriented) │      (Task-Oriented)
                        │
◄───────────────────────┼───────────────────────► THEORETICAL KNOWLEDGE
                        │
       Explanation      │         Reference
(Understanding-Oriented)│  (Information-Oriented)
                        │
                        ▼
```

## Documentation Map

| Mode | Location | Target Audience | Primary Focus |
|---|---|---|---|
| **Tutorials** | [`docs/diataxis/tutorials/`](./tutorials/) | New users & students | Getting started with dual-runtime Python 3.14 & Lean 4 |
| **How-To Guides** | [`docs/diataxis/how-to/`](./how-to/) | Practicing mathematicians & engineers | Solving real tasks: blueprint DAG sync, conflict resolution |
| **Reference** | [`docs/diataxis/reference/`](./reference/) | All developers | Complete dictionary: 62 commands, keybindings, when-clause syntax |
| **Explanation** | [`docs/diataxis/explanation/`](./explanation/) | Architects & reviewers | Conceptual architecture: 5-term kernel verification & zero-sorry gates |

---

## The Four Principles

1. **Tutorials are lessons**: They take learners by the hand through a structured series of steps to build initial competence. They don't explain all options.
2. **How-To Guides are recipes**: They guide developers in solving a specific problem or achieving a specific outcome in their day-to-day work.
3. **Reference is a dictionary**: It describes the machinery objectively, exhaustively, and without narrative steps.
4. **Explanation is background**: It discusses why things are the way they are, comparing trade-offs, architecture, and theoretical underpinnings.
