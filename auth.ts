import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { verifyCredentials } from "@/lib/auth/users";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) => verifyCredentials(credentials),
    }),
  ],
});
