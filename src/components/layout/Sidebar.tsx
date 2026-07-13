"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_ITEMS, NAV_SECTIONS } from "@/lib/constants/navigation";

const ICONS: Record<string, string> = {
  dashboard: "📊",
  intake: "📋",
  pipeline: "🔄",
  leads: "🎯",
  accounts: "🏢",
  projects: "📁",
  calendar: "📅",
  team: "👥",
  kb: "📚",
  admin: "⚙️",
  "eagle-kpi": "🦅",
};

export function Sidebar({ userName, userColor }: { userName: string; userColor: string }) {
  const pathname = usePathname();

  const grouped = NAV_SECTIONS.map((section) => ({
    ...section,
    items: NAV_ITEMS.filter((item) => item.section === section.id),
  }));

  return (
    <aside className="w-[260px] min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold text-white">CAT-I OPS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {grouped.map((section) => (
          <div key={section.id} className="mb-1">
            {section.label && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 pt-4 pb-1">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.route || pathname.startsWith(item.route + "/");
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  }`}
                >
                  <span
                    className="w-5 h-5 flex items-center justify-center rounded text-xs"
                    style={isActive ? { color: item.sectionColor } : undefined}
                  >
                    {ICONS[item.id] || "•"}
                  </span>
                  {item.label}
                  {isActive && (
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: item.sectionColor }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: userColor }}
          >
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 hover:text-gray-300 text-xs"
            title="Sign out"
          >
            ↗
          </button>
        </div>
      </div>
    </aside>
  );
}
