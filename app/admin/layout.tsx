import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh bg-[#f7f7fb] text-slate-900">
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
