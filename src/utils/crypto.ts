/**
 * Web Crypto API encryption utilities
 * Uses AES-GCM with PBKDF2 key derivation from a user passphrase
 * Secrets are write-only — never rendered plaintext in the UI
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

/**
 * Derive an AES-GCM key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt) as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 } as AesDerivedKeyParams,
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a plaintext string using AES-GCM with PBKDF2
 * Returns base64-encoded salt:iv:ciphertext string
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );

  // Combine salt + iv + ciphertext and encode as base64
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded salt:iv:ciphertext string using AES-GCM with PBKDF2
 */
export async function decrypt(encryptedData: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt multiple string fields in an object
 */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  passphrase: string,
): Promise<T> {
  const result = { ...obj };
  await Promise.all(
    fields.map(async (field) => {
      const value = obj[field];
      if (typeof value === 'string') {
        (result as Record<string, unknown>)[field as string] = await encrypt(value, passphrase);
      }
    }),
  );
  return result;
}

/**
 * Mask a secret for display (show first 4 and last 4 chars)
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 12) {
    return '*'.repeat(secret.length);
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
