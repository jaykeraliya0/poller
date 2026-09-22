import { customAlphabet } from "nanoid";

// Lowercase, no look-alike characters (0/o, 1/l/i), so links survive being read aloud.
const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";

const SLUG_LENGTH = 10;

export const createSlug = customAlphabet(alphabet, SLUG_LENGTH);

export function isValidSlug(value: string): boolean {
  return value.length === SLUG_LENGTH && [...value].every((char) => alphabet.includes(char));
}
