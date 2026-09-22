import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode, validationError } from "@/lib/errors";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";

export type AuthUser = { id: string; name: string; email: string };

const EMAIL_TAKEN = "An account with this email already exists";

export async function registerUser(input: unknown): Promise<AuthUser> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const { name, email, password } = parsed.data;

  const emailTaken = () =>
    new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: { email: [EMAIL_TAKEN] } });

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) throw emailTaken();

  try {
    return await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    // Two sign-ups racing for the same email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw emailTaken();
    }
    throw error;
  }
}

/**
 * Used by the Credentials provider. Unknown email and wrong password both
 * return null after the same amount of hashing work.
 */
export async function verifyCredentials(input: unknown): Promise<AuthUser | null> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (!user) return verifyAgainstDummy(password).then(() => null);
  if (!(await verifyPassword(user.passwordHash, password))) return null;

  return { id: user.id, name: user.name, email: user.email };
}
