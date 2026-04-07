import { redirect } from "next/navigation";

import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.brandId || !session.user.role) {
    redirect("/login");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      brandId: session.user.brandId,
    },
    select: {
      isActive: true,
      brand: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.isActive || !user.brand.isActive) {
    redirect("/login");
  }

  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
