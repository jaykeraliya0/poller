import type { ActionFailure } from "./errors";

/**
 * State for forms driven by useActionState. On failure we echo back the
 * submitted (non-secret) values, because React resets uncontrolled forms
 * after an action and the user shouldn't lose their input.
 */
export type FormState<Values> = (ActionFailure & { values?: Partial<Values> }) | null;

export function formValues<K extends string>(formData: FormData, keys: readonly K[]) {
  return Object.fromEntries(
    keys.map((key) => [key, typeof formData.get(key) === "string" ? (formData.get(key) as string) : ""]),
  ) as Record<K, string>;
}
