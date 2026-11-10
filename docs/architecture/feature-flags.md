# Feature Flag Governance and Lifecycle Specification

**Status**: Active  
**Authoritative Registry**: `src/services/flags/feature-flag-registry.ts`  
**CI Linter**: `scripts/check-flag-expiry.ts`

---

## 1. Principles

1. **Centralized Authority**: No `process.env.ENABLE_*` may be queried directly in React components. All reads must go through `featureFlagRegistry.isEnabled('FLAG_NAME')`.
2. **Strict Metadata**: Every flag definition must supply `default`, `phase`, `category`, `owner`, `behaviorWhenOff`, `createdAt`, `expiresAt`, and `description`.
3. **Fail-Closed Semantics**:
   - `503`: Return RFC 9457 Problem Details HTTP 503 error envelope.
   - `404`: Return route unmounted / not found.
   - `noop`: Transparent fallback or disabled optimization.
4. **Lifecycle Expiry**: Flags are not permanent architecture. They must be removed or promoted to core within their defined expiry horizon.

---

## 2. API Usage

### 2.1 Reading a Flag
```typescript
import { featureFlagRegistry } from '@/services/flags/feature-flag-registry';

if (featureFlagRegistry.isEnabled('ENABLE_LEAN_BEAM')) {
  // Execute speculative tactic branch
}
```

### 2.2 React Component Hook
```typescript
import { useExternalStore } from 'react';
import { featureFlagRegistry } from '@/services/flags/feature-flag-registry';

export function MyComponent() {
  const flags = useExternalStore(
    featureFlagRegistry.subscribe,
    featureFlagRegistry.getSnapshot
  );

  return flags.ENABLE_ACTIVITY_BAR ? <ActivityBar /> : null;
}
```

---

## 3. Linter and Verification

```bash
# Check flag expiry and metadata completeness
npm run check-flag-expiry:strict
```
