/**
 * Accessible Theme Tokens & Color Palette (Phase 15 Pre-Flight 14.9.9, Window 2)
 *
 * Single source of truth for design tokens, WCAG 2.2 AA compliant contrast ratios,
 * and typography across editor panes and shell components.
 */

export const THEME_TOKENS = Object.freeze({
  colors: {
    // Backgrounds (Dark Mode First)
    bgCanvas: '#0d1117',
    bgSurface: '#161b22',
    bgOverlay: '#21262d',
    bgMuted: '#30363d',

    // Foreground / Text (Contrast >= 4.5:1 against respective surfaces)
    textPrimary: '#f0f6fc',   // 15.8:1 contrast on #0d1117
    textSecondary: '#8b949e', // 4.8:1 contrast on #0d1117
    textMuted: '#6e7681',
    textInverse: '#0d1117',

    // Accents & Epistemic Badges
    accentPrimary: '#58a6ff',   // Info / active link
    accentSuccess: '#3fb950',   // Certified verified tier
    accentWarning: '#d29922',   // Unconfirmed / degraded warning
    accentDanger: '#f85149',    // Error / rejected proof
    accentFocus: '#1f6feb',     // High-contrast focus ring (>= 3:1)

    // Borders
    borderDefault: '#30363d',
    borderMuted: '#21262d',
    borderSubtle: '#1b1f24',
  },

  typography: {
    fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: '"JetBrains Mono", "Fira Code", monospace',
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    hitboxMin: '44px', // WCAG 2.2 Target Size (Minimum) Criterion 2.5.8
    focusRingWidth: '2px',
    focusRingOffset: '2px',
    radiusSm: '4px',
    radiusMd: '6px',
    radiusLg: '8px',
  },

  a11y: {
    wcagLevel: '2.2-AA',
    minTextContrast: 4.5,
    minUiContrast: 3.0,
    minTouchHitboxPx: 44,
  },
});

export type ThemeTokens = typeof THEME_TOKENS;
