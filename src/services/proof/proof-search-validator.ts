export interface ProofSearchValidationResult {
  readonly valid: boolean;
  readonly errorCode?: 'QUERY_TOO_LONG' | 'CONTROL_CHARACTERS_NOT_ALLOWED' | 'UNBALANCED_DELIMITERS' | 'EMPTY_QUERY';
  readonly message?: string;
}

/**
 * Validates and sanitizes proof search queries (Sprint B, B2):
 * - Max 10,000 characters
 * - Reject ASCII control characters [\x00-\x1F]
 * - Reject unbalanced parentheses, brackets, or braces (), [], {}
 */
export function validateProofSearchQuery(query: string): ProofSearchValidationResult {
  if (typeof query !== 'string') {
    return {
      valid: false,
      errorCode: 'EMPTY_QUERY',
      message: 'Query must be a string.',
    };
  }

  // 1. Length check: max 10,000 characters
  if (query.length > 10_000) {
    return {
      valid: false,
      errorCode: 'QUERY_TOO_LONG',
      message: `Query exceeds maximum length of 10,000 characters (received ${query.length}).`,
    };
  }

  // 2. Reject ASCII control characters [\x00-\x1F]
  // Reject all non-printable ASCII control codes
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(query) || /[\x00-\x1F]/.test(query.replace(/[\r\n\t]/g, ''))) {
    return {
      valid: false,
      errorCode: 'CONTROL_CHARACTERS_NOT_ALLOWED',
      message: 'Control characters in range \\x00-\\x1F are strictly prohibited.',
    };
  }

  // 3. Balanced parentheses, brackets, and braces check
  const stack: { char: string; index: number }[] = [];
  const opening = new Set(['(', '[', '{']);
  const matchingPairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  for (let i = 0; i < query.length; i++) {
    const char = query[i]!;
    if (opening.has(char)) {
      stack.push({ char, index: i });
    } else if (char in matchingPairs) {
      const expectedOpening = matchingPairs[char];
      if (stack.length === 0 || stack[stack.length - 1]!.char !== expectedOpening) {
        return {
          valid: false,
          errorCode: 'UNBALANCED_DELIMITERS',
          message: `Unbalanced delimiter detected: unexpected "${char}" at index ${i}.`,
        };
      }
      stack.pop();
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]!;
    return {
      valid: false,
      errorCode: 'UNBALANCED_DELIMITERS',
      message: `Unbalanced delimiter detected: unclosed "${unclosed.char}" at index ${unclosed.index}.`,
    };
  }

  return { valid: true };
}
