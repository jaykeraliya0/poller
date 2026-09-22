let counter = 0;

/**
 * Stable React keys for draft list items (options, slots). A counter rather
 * than crypto.randomUUID, which is missing on insecure origins like LAN IPs.
 */
export function draftKey(): string {
  counter += 1;
  return `draft-${counter}`;
}

