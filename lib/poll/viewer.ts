import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/guards";
import { VOTER_TOKEN_COOKIE, createVoterToken, voterTokenCookieOptions } from "@/lib/voter-token";
import type { VoterIdentity } from "./votes";

/** Identity for reading (pages): no token yet means no guest vote yet. */
export async function readVoterIdentity(): Promise<VoterIdentity> {
  const [user, store] = await Promise.all([getCurrentUser(), cookies()]);
  return {
    userId: user?.id ?? null,
    userName: user?.name ?? null,
    voterToken: store.get(VOTER_TOKEN_COOKIE)?.value ?? "",
  };
}

/** Identity for writing (actions): issues a voter token if the proxy didn't. */
export async function ensureVoterIdentity(): Promise<VoterIdentity> {
  const identity = await readVoterIdentity();
  if (identity.voterToken) return identity;
  const voterToken = createVoterToken();
  await setVoterToken(voterToken);
  return { ...identity, voterToken };
}

export async function setVoterToken(token: string) {
  (await cookies()).set(VOTER_TOKEN_COOKIE, token, voterTokenCookieOptions);
}
