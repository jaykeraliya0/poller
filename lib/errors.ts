import { z } from "zod";

export const ErrorCode = {
  VALIDATION: "VALIDATION",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  NOT_FOUND: "NOT_FOUND",
  POLL_CLOSED: "POLL_CLOSED",
  ALREADY_CLOSED: "ALREADY_CLOSED",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  NOT_INVITED: "NOT_INVITED",
  EMAIL_UNVERIFIED: "EMAIL_UNVERIFIED",
  ALREADY_VOTED: "ALREADY_VOTED",
  VOTE_CHANGE_DISABLED: "VOTE_CHANGE_DISABLED",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Field path (e.g. `options.2.label`) → messages. */
export type FieldErrors = Record<string, string[]>;

const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "Please fix the highlighted fields.",
  UNAUTHENTICATED: "Please sign in to continue.",
  NOT_FOUND: "We couldn't find that poll.",
  POLL_CLOSED: "This poll has closed. Your answers weren't submitted.",
  ALREADY_CLOSED: "This poll is already closed.",
  LOGIN_REQUIRED: "Sign in to vote on this poll.",
  NOT_INVITED: "This poll is private and you haven't been invited.",
  EMAIL_UNVERIFIED: "Confirm your email address to open private polls you've been invited to.",
  ALREADY_VOTED: "You've already voted on this poll.",
  VOTE_CHANGE_DISABLED: "The poll owner has turned off changing votes.",
  CONFLICT: "That change conflicts with existing votes.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL: "Something went wrong. Please try again.",
};

type ErrorDetails = { fieldErrors?: FieldErrors; retryAfter?: number };

/** Expected, user-facing failure. Anything else is treated as INTERNAL. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, message?: string, details: ErrorDetails = {}) {
    super(message ?? DEFAULT_ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = details.fieldErrors;
    this.retryAfter = details.retryAfter;
  }
}

export type ActionFailure = {
  ok: false;
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfter?: number;
};

export type ActionResult<T = void> = { ok: true; data: T } | ActionFailure;

export function ok(): { ok: true; data: void };
export function ok<T>(data: T): { ok: true; data: T };
export function ok<T>(data?: T): { ok: true; data: T | undefined } {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message?: string, details: ErrorDetails = {}): ActionFailure {
  return {
    ok: false,
    code,
    message: message ?? DEFAULT_ERROR_MESSAGES[code],
    ...(details.fieldErrors && { fieldErrors: details.fieldErrors }),
    ...(details.retryAfter !== undefined && { retryAfter: details.retryAfter }),
  };
}

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function validationError(error: z.ZodError): AppError {
  return new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: toFieldErrors(error) });
}

/**
 * Converts a thrown value into an ActionFailure. Framework control-flow errors
 * (redirect, notFound) must be rethrown by the caller before this runs.
 */
export function toActionFailure(error: unknown): ActionFailure {
  if (error instanceof AppError) {
    return fail(error.code, error.message, {
      fieldErrors: error.fieldErrors,
      retryAfter: error.retryAfter,
    });
  }
  if (error instanceof z.ZodError) {
    return fail(ErrorCode.VALIDATION, undefined, { fieldErrors: toFieldErrors(error) });
  }
  console.error("[action] unexpected error", error);
  return fail(ErrorCode.INTERNAL);
}
