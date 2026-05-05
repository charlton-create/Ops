"use client";

import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({
  children,
  userName,
  userColor,
}: {
  children: React.ReactNode;
  userName: string;
  userColor: string;
}) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar userName={userName} userColor={userColor} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
