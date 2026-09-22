import type { NextAuthConfig } from "next-auth";

/**
 * Provider-free config shared with the proxy. The proxy only reads the JWT,
 * so it must not pull in argon2 or Prisma; those live in auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  logger: {
    // A wrong password is an expected outcome, not a server error worth a stack trace.
    error(error) {
      // Match on `type`: class names are minified in production builds.
      if ("type" in error && error.type === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  callbacks: {
    // Keep the token minimal: user id (sub) and display name only.
    jwt({ token, user }) {
      if (user?.id) return { sub: user.id, name: user.name };
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.name = token.name ?? "";
      return session;
    },
  },
} satisfies NextAuthConfig;
