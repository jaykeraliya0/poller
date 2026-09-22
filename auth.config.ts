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
    // Keep the token minimal: user id (sub), display name, and when they signed in.
    // `authAt` survives token refreshes (unlike `iat`), so a password reset can
    // reject every session that signed in before it.
    jwt({ token, user }) {
      if (user?.id) return { sub: user.id, name: user.name, authAt: Date.now() };
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.name = token.name ?? "";
      session.authAt = typeof token.authAt === "number" ? token.authAt : null;
      return session;
    },
  },
} satisfies NextAuthConfig;
