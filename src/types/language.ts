/**
 * Discriminated union and types for supported languages.
 * Uses const arrays and derived types instead of TS enums (erasableSyntaxOnly compliant).
 */

export const SUPPORTED_LANGUAGES = ['python', 'lean4'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export interface LanguageInfo {
  readonly id: SupportedLanguage;
  readonly displayName: string;
  readonly monacoId: string;
  readonly fileExtension: string;
  readonly defaultTabSize: number;
  readonly executionMode: 'client' | 'server';
  readonly versionLabel: string;
  readonly description: string;
}
