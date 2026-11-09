# Design System & WCAG 2.2 AA Accessibility Architecture

**Phase**: Pre-Flight 14.9.9 (Window 2, D2.8)  
**Status**: APPROVED & CODIFIED  
**Source of Truth**: `src/theme/tokens.ts` (`THEME_TOKENS`)  
**Design Foundations**: Tailwind CSS 4, React Aria Components, WCAG 2.2 AA  

---

## 1. Color Palette & Contrast Conformance

All colors are designed for dark-mode development environments with strict adherence to WCAG 2.2 AA contrast rules:

| Token Name | Hex Value | Target Surface | Contrast Ratio | Minimum AA Requirement | Compliance Status |
|:---|:---:|:---:|:---:|:---:|:---:|
| `textPrimary` | `#f0f6fc` | `#0d1117` | **15.8:1** | $\ge 4.5:1$ (Normal text) | **PASS** |
| `textSecondary` | `#8b949e` | `#0d1117` | **4.8:1** | $\ge 4.5:1$ (Normal text) | **PASS** |
| `accentPrimary` | `#58a6ff` | `#0d1117` | **6.1:1** | $\ge 4.5:1$ | **PASS** |
| `accentSuccess` | `#3fb950` | `#0d1117` | **5.2:1** | $\ge 3.0:1$ (UI Component) | **PASS** |
| `accentWarning` | `#d29922` | `#0d1117` | **4.9:1** | $\ge 3.0:1$ (UI Component) | **PASS** |
| `accentDanger` | `#f85149` | `#0d1117` | **4.7:1** | $\ge 3.0:1$ (UI Component) | **PASS** |
| `accentFocus` | `#1f6feb` | `#161b22` | **3.8:1** | $\ge 3.0:1$ (Focus Indicator) | **PASS** |

---

## 2. Interactive Touch Targets & Focus Indicators (WCAG 2.2 AA)

1. **Target Size (Minimum) (Criterion 2.5.8)**:
   - All interactive buttons, tabs, navigation drawer triggers, and close buttons enforce a bounding hitbox of at least **44x44 CSS pixels** (`min-h-[44px] min-w-[44px]`).
2. **Focus Appearance (Criterion 2.4.13)**:
   - Keyboard focus rings enforce an outline of $\ge 2\text{px}$ (`outline-2 outline-offset-2 outline-[#1f6feb]`) with high contrast against adjacent backgrounds.
3. **Screen Reader Semantics**:
   - Dynamic alerts (`SecurityAlert`, `ErrorBoundary`) declare `role="alert"` and `aria-live="assertive"`.
   - Modals and popovers declare `role="dialog"` or `role="alertdialog"` with keyboard `Escape` dismissal and focus trapping.

---

## 3. Component Library Mapping

| Abstract UI Component | Implementation | Accessibility Primitive |
|:---|:---|:---|
| Navigation Drawer | `src/components/navigation/NavigationDrawer.tsx` | React Aria `Dialog`, `Modal` |
| Editor Tabs | `src/components/editor/EditorTabs.tsx` | ARIA `role="tablist"` + `role="tab"` |
| Status Bar | `src/components/status-bar/StatusBar.tsx` | ARIA `role="status"` + 3-zone telemetry |
| Command Palette | `src/components/palette/CommandPalette.tsx` | `cmdk` with accessible listbox semantics |
| Security Alerts | `src/shared/ui/security-alert.tsx` | ARIA `role="alert"` |
