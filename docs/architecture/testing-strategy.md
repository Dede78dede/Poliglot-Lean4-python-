# Testing Discipline & Mocking Strategy Architecture (M4)

**Document ID**: PCS-ARCH-TESTING-STRATEGY  
**Version**: 1.0.0  
**Status**: APPROVED & CODIFIED  

---

## 1. Principles of Testing Discipline

Polyglot Code Studio adheres to strict testing discipline to prevent test fragility and epistemic dilution:

### Allowed Mock Boundaries
- **Network Boundaries**: Mock Service Worker (`msw`) intercepts HTTP requests at the protocol layer.
- **Worker & WebAssembly Boundaries**: Web Worker (`Worker`) and Pyodide sandboxes may use controlled test doubles.
- **Filesystem Boundaries**: In-memory virtual filesystem (`memfs` or test fixtures).
- **Time**: `vi.useFakeTimers()` for controlled clock advancing.

### Forbidden Mocks
- **Internal Domain & Pure Functions**: `vi.mock()` is strictly forbidden on:
  - `verification-formula.ts`
  - `hybrid-adjudicator.ts`
  - `session-manager.ts`
  - `policy.ts`
  - `zip-validator.ts`
  - `proof-outcome.ts`
- Tests must assert on actual **behavior and return values**, never on internal spy counts.

---

## 2. Test Runner Isolation & Sanitation

`vitest.config.ts` enforces automatic mock sanitation between test cases:
```typescript
test: {
  restoreMocks: true,
  clearMocks: true,
}
```
This guarantees that spies, timers, and stubs cannot leak state across test suites.
