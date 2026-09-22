import { z } from "zod";

export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254, "Email is too long"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
});

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(60, "Name must be 60 characters or fewer"),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });
