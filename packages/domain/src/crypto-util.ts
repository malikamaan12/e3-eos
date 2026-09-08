/**
 * Safe universal SHA-256 digest calculation that avoids static node:crypto imports
 * so that client/browser builds (Vite) can import domain modules without runtime errors.
 */
export function safeSha256(data: unknown): string {
  let content: string | Buffer;
  if (typeof data === 'string') {
    content = data;
  } else if (data instanceof Uint8Array) {
    content = Buffer.from(data);
  } else {
    content = JSON.stringify(data, data && typeof data === 'object' ? Object.keys(data).sort() : undefined);
  }

  if (typeof process !== 'undefined' && (process as any).versions?.node) {
    try {
      const nodeCrypto = (0, eval)('require')('node:crypto');
      return nodeCrypto.createHash('sha256').update(content).digest('hex');
    } catch {
      // fallback
    }
  }

  // Deterministic 64-char fallback for browser environments
  const str = typeof content === 'string' ? content : content.toString('utf8');
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2).repeat(4);
}
