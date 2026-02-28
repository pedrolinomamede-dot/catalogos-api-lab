import type { Session } from "next-auth";

export function getBrandScope(session: Session | null) {
  return session?.user?.brandId ?? null;
}
