import { z } from "zod";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254, "Email is too long"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(60, "Name must be 60 characters or fewer"),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`),
});

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
