import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string } & DefaultSession["user"];
    /** Epoch ms of the sign-in that created this session; null for sessions from before it was tracked. */
    authAt: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    authAt?: number;
  }
}
