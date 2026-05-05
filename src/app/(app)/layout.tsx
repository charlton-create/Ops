import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "./AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      userName={session.user.name ?? "User"}
      userColor={(session.user as any).color ?? "#6B7280"}
    >
      {children}
    </AppShell>
  );
}
