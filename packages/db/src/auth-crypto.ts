import crypto from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !password) return false;
  if (!stored.startsWith('scrypt:')) {
    try {
      const pBuf = Buffer.from(password);
      const sBuf = Buffer.from(stored);
      if (pBuf.length !== sBuf.length) return false;
      return crypto.timingSafeEqual(pBuf, sBuf);
    } catch {
      return password === stored;
    }
  }
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const cBuf = Buffer.from(computedHash, 'hex');
    const eBuf = Buffer.from(expectedHash, 'hex');
    if (cBuf.length !== eBuf.length) return false;
    return crypto.timingSafeEqual(cBuf, eBuf);
  } catch {
    return false;
  }
}

/**
 * Generates RFC 6238 TOTP Secret and verification helper (HMAC-SHA1, 30s step, 6 digits).
 */
export function generateTotpSecret(): { secret: string; otpauthUrl: string } {
  const bytes = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += base32Chars[bytes[i] % 32];
  }
  const otpauthUrl = `otpauth://totp/E3-EOS:user?secret=${secret}&issuer=E3-EOS&algorithm=SHA1&digits=6&period=30`;
  return { secret, otpauthUrl };
}

export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim();
  const timeStep = Math.floor(Date.now() / 1000 / 30);

  // Check window of -1, 0, +1 steps for clock skew
  for (let window = -1; window <= 1; window++) {
    const expected = computeTotp(secret, timeStep + window);
    if (cleanToken === expected) return true;
  }
  return false;
}

function computeTotp(secret: string, counter: number): string {
  // Decode Base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32Chars.indexOf(secret.charAt(i).toUpperCase());
    if (val >= 0) bits += val.toString(2).padStart(5, '0');
  }
  const keyBytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    keyBytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(keyBytes);

  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}
