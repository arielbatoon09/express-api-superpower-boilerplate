import argon2 from 'argon2';

/**
 * Hashes a plain text password asynchronously using the argon2 hashing algorithm.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/**
 * Verifies a plain text password against a stored argon2 hash asynchronously.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}
