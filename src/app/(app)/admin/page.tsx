"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useTeam } from "@/lib/hooks/useTeam";
import { ROLE_PERMISSIONS, type UserRole } from "@/lib/auth/types";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-950 text-red-400",
  manager: "bg-blue-950 text-blue-400",
  user: "bg-green-950 text-green-400",
  viewer: "bg-gray-800 text-gray-400",
};

const USER_ROLES: Record<string, UserRole> = {
  Aisha: "admin", Suresh: "admin",
  Artem: "manager", Charlton: "manager", Tiffini: "manager",
  David: "user", Igor: "user", Ahilan: "user", Yael: "user",
};

type Tab = "users" | "roles" | "integrations";

export default function AdminPage() {
  const { data: team } = useTeam();
  const [tab, setTab] = useState<Tab>("users");
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");

  return (
    <div>
      <Header title="Settings" icon="⚙️" subtitle="Administration" gradient="from-gray-600 to-gray-500" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit mb-6">
        {(["users", "roles", "integrations"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${tab === t ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {team?.map((member) => {
                const role = USER_ROLES[member.name] ?? "viewer";
                return (
                  <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: member.color ?? "#6B7280" }}>
                          {member.name.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{member.email}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>{role}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{member.role}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${member.status === "online" ? "bg-green-950 text-green-400" : member.status === "away" ? "bg-yellow-950 text-yellow-400" : "bg-gray-800 text-gray-500"}`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Roles</p>
            {(["admin", "manager", "user", "viewer"] as const).map((role) => (
              <button key={role} onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedRole === role ? "bg-gray-800 border-gray-700" : "bg-gray-900 border-gray-800 hover:border-gray-700"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium capitalize">{role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>{ROLE_PERMISSIONS[role].length}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{ROLE_PERMISSIONS[role].length} permissions</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3 capitalize">{selectedRole} Permissions</h3>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_PERMISSIONS[selectedRole].map((perm) => (
                <div key={perm} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">{perm.replace(".", " › ")}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">Users with this role:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(USER_ROLES).filter(([, r]) => r === selectedRole).map(([name]) => {
                  const member = team?.find((t) => t.name === name);
                  return (
                    <div key={name} className="flex items-center gap-1.5 bg-gray-800 px-2 py-1 rounded-lg">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: member?.color ?? "#6B7280" }}>
                        {name.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-300">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Zoho Books", desc: "Invoice & billing management", status: "connected", icon: "📊" },
            { name: "Google Calendar", desc: "Calendar sync", status: "not connected", icon: "📅" },
            { name: "Gmail", desc: "Email integration", status: "not connected", icon: "📧" },
            { name: "Google Sheets", desc: "MES data export", status: "not connected", icon: "📋" },
            { name: "Slack", desc: "Team notifications", status: "not connected", icon: "💬" },
            { name: "AWS SES", desc: "Campaign email delivery", status: "not connected", icon: "✉️" },
          ].map((integration) => (
            <div key={integration.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <p className="text-white font-medium">{integration.name}</p>
                    <p className="text-gray-500 text-xs">{integration.desc}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded ${integration.status === "connected" ? "bg-green-950 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                  {integration.status}
                </span>
                <button className="text-xs text-purple-400 hover:text-purple-300">
                  {integration.status === "connected" ? "Configure" : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
