import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      brandId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    brandId: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    brandId?: string;
    role?: UserRole;
  }
}
