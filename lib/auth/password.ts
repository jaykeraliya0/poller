import "server-only";
import { argon2id, hash, verify } from "argon2";

export function hashPassword(password: string): Promise<string> {
  return hash(password, { type: argon2id });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same argon2 work as a real check, so a login for an unknown
 * email takes as long as a wrong password and can't reveal which emails exist.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
  return false;
}
