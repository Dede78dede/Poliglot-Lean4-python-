/**
 * Computes a cryptographic hex-encoded SHA-256 hash using Web Crypto API or node:crypto.
 * Fail-closed: never falls back to non-cryptographic pseudo-hashing.
 */
export async function computeSha256(content: string | Uint8Array): Promise<string> {
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;

  let subtle: SubtleCrypto | undefined;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    subtle = window.crypto.subtle;
  } else if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    subtle = globalThis.crypto.subtle;
  }

  if (subtle) {
    const hashBuffer = await subtle.digest('SHA-256', data as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  } catch {
    throw new Error('CRYPTO_UNAVAILABLE: Cryptographic SHA-256 digest unavailable in current runtime.');
  }
}
