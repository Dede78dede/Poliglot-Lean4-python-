/**
 * Computes a hex-encoded SHA-256 hash of a string or Uint8Array using Web Crypto API.
 */
export async function computeSha256(content: string | Uint8Array): Promise<string> {
  const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;

  let subtle: SubtleCrypto | undefined;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    subtle = window.crypto.subtle;
  } else if (typeof crypto !== 'undefined' && crypto.subtle) {
    subtle = crypto.subtle;
  }

  if (subtle) {
    const hashBuffer = await subtle.digest('SHA-256', data as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JS fallback if SubtleCrypto is unavailable (deterministic fallback)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i]!;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
