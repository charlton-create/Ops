"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useTeam, type TeamMember } from "@/lib/hooks/useTeam";
import { ROLE_PERMISSIONS, type UserRole, type Permission } from "@/lib/auth/types";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-950 text-red-400 border-red-900",
  manager: "bg-blue-950 text-blue-400 border-blue-900",
  user: "bg-green-950 text-green-400 border-green-900",
  viewer: "bg-gray-800 text-gray-400 border-gray-700",
};

const USER_ROLES: Record<string, UserRole> = {
  Aisha: "admin", Suresh: "admin",
  Artem: "manager", Charlton: "manager", Tiffini: "manager",
  David: "user", Igor: "user", Ahilan: "user", Yael: "user",
};

type Section = "users" | "data";

export default function AdminPage() {
  const [section, setSection] = useState<Section>("users");

  const SECTIONS: { id: Section; icon: string; label: string; desc: string }[] = [
    { id: "users", icon: "👥", label: "User / Access", desc: "Manage users, roles, and permissions" },
    { id: "data", icon: "🗄️", label: "Data Configuration", desc: "Data sources, tables, and field mapping" },
  ];

  return (
    <div>
      <Header title="Admin" icon="⚙️" subtitle="System Configuration & Access Control" gradient="from-gray-700 to-gray-600" />

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`text-left px-5 py-4 rounded-xl border transition-all ${
              section === s.id
                ? "bg-gray-800 border-purple-500/50 ring-1 ring-purple-500/20"
                : "bg-gray-900 border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-white font-semibold">{s.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {section === "users" && <UserAccessSection />}
      {section === "data" && <DataConfigSection />}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// USER / ACCESS SECTION
// ═══════════════════════════════════════════════════
function UserAccessSection() {
  const { data: team } = useTeam();
  const [tab, setTab] = useState<"users" | "roles" | "activity">("users");
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>(USER_ROLES);

  function handleRoleChange(name: string, role: UserRole) {
    setUserRoles((prev) => ({ ...prev, [name]: role }));
    setEditingUser(null);
  }

  return (
    <>
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit mb-5">
        {(["users", "roles", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors capitalize ${
              tab === t ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "activity" ? "Activity Log" : t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{team?.length ?? 0} team members</p>
            <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <span>+</span> Invite User
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {team?.map((member) => {
                  const role = userRoles[member.name] ?? "viewer";
                  const isEditing = editingUser === member.name;
                  return (
                    <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: member.color ?? "#6B7280" }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <span className="text-white font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{member.email}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={role}
                            onChange={(e) => handleRoleChange(member.name, e.target.value as UserRole)}
                            onBlur={() => setEditingUser(null)}
                            autoFocus
                            className="bg-gray-800 border border-gray-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-purple-500"
                          >
                            {(["admin", "manager", "user", "viewer"] as const).map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`text-xs px-2 py-0.5 rounded cursor-pointer border ${ROLE_COLORS[role]}`}
                            onClick={() => setEditingUser(member.name)}
                            title="Click to change role"
                          >
                            {role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{member.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            member.status === "online"
                              ? "bg-green-950 text-green-400"
                              : member.status === "away"
                              ? "bg-yellow-950 text-yellow-400"
                              : "bg-gray-800 text-gray-500"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingUser(isEditing ? null : member.name)}
                            className="text-xs text-gray-500 hover:text-purple-400 px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors"
                          >
                            Edit
                          </button>
                          <button className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors">
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Roles</p>
            {(["admin", "manager", "user", "viewer"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedRole === role
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium capitalize">{role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>
                    {ROLE_PERMISSIONS[role].length}
                  </span>
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
                {Object.entries(userRoles)
                  .filter(([, r]) => r === selectedRole)
                  .map(([name]) => {
                    const member = team?.find((t) => t.name === name);
                    return (
                      <div key={name} className="flex items-center gap-1.5 bg-gray-800 px-2 py-1 rounded-lg">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: member?.color ?? "#6B7280" }}
                        >
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

      {tab === "activity" && <ActivityLog />}
    </>
  );
}

function ActivityLog() {
  const LOGS = [
    { user: "Charlton", action: "Updated role for David", target: "user → manager", time: "2 min ago", type: "role" },
    { user: "Aisha", action: "Invited new user", target: "yael@cat-i.ai", time: "1 hr ago", type: "invite" },
    { user: "Suresh", action: "Revoked access for", target: "former-employee@cat-i.ai", time: "3 hrs ago", type: "revoke" },
    { user: "Charlton", action: "Updated data table", target: "Bottling Production", time: "Yesterday", type: "data" },
    { user: "Aisha", action: "Connected data source", target: "NetSuite", time: "2 days ago", type: "data" },
    { user: "Suresh", action: "Updated permissions for", target: "manager role", time: "3 days ago", type: "role" },
  ];

  const TYPE_COLORS: Record<string, string> = {
    role: "bg-blue-950 text-blue-400",
    invite: "bg-green-950 text-green-400",
    revoke: "bg-red-950 text-red-400",
    data: "bg-purple-950 text-purple-400",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
        <p className="text-gray-500 text-xs mt-0.5">Admin actions and system events</p>
      </div>
      <div className="divide-y divide-gray-800/50">
        {LOGS.map((log, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white">
              {log.user.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">
                <span className="text-white font-medium">{log.user}</span> {log.action}{" "}
                <span className="text-purple-400">{log.target}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{log.time}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium ${TYPE_COLORS[log.type]}`}>
              {log.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DATA CONFIGURATION SECTION
// ═══════════════════════════════════════════════════
type DataTab = "sources" | "tables";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string;
  icon: string;
  tables: string[];
}

interface TableColumn {
  name: string;
  type: string;
  required: boolean;
  editable: boolean;
}

interface DataTable {
  id: string;
  name: string;
  source: string;
  rowCount: number;
  lastUpdated: string;
  columns: TableColumn[];
  rows: Record<string, string | number>[];
}

const DATA_SOURCES: DataSource[] = [
  { id: "netsuite", name: "NetSuite", type: "ERP / SuiteTalk API", status: "disconnected", lastSync: "Never", icon: "🔗", tables: ["bottling_production", "straw_production", "warehouse_ops"] },
  { id: "csv", name: "CSV Upload", type: "File Import", status: "connected", lastSync: "Today 09:14 AM", icon: "📄", tables: ["bottling_production"] },
  { id: "eagle-kpi", name: "Eagle KPI", type: "Internal Dashboard", status: "connected", lastSync: "Live", icon: "🦅", tables: ["bottling_production", "straw_production", "warehouse_ops"] },
];

const DATA_TABLES: DataTable[] = [
  {
    id: "bottling",
    name: "Bottling Production",
    source: "Eagle KPI",
    rowCount: 312,
    lastUpdated: "2026-05-30",
    columns: [
      { name: "date", type: "date", required: true, editable: false },
      { name: "line", type: "text", required: true, editable: true },
      { name: "good_units", type: "number", required: true, editable: true },
      { name: "total_units", type: "number", required: true, editable: true },
      { name: "ideal_rate_per_hr", type: "number", required: false, editable: true },
      { name: "planned_minutes", type: "number", required: false, editable: true },
      { name: "downtime_minutes", type: "number", required: true, editable: true },
      { name: "downtime_reason", type: "text", required: false, editable: true },
    ],
    rows: [
      { date: "2026-05-30", line: "Line 1", good_units: 4850, total_units: 4920, ideal_rate_per_hr: 680, planned_minutes: 480, downtime_minutes: 35, downtime_reason: "Changeover" },
      { date: "2026-05-30", line: "Line 2", good_units: 4720, total_units: 4780, ideal_rate_per_hr: 660, planned_minutes: 480, downtime_minutes: 42, downtime_reason: "Mechanical" },
      { date: "2026-05-30", line: "Line 3", good_units: 3210, total_units: 3260, ideal_rate_per_hr: 700, planned_minutes: 450, downtime_minutes: 55, downtime_reason: "Material Shortage" },
      { date: "2026-05-30", line: "Line 4", good_units: 3080, total_units: 3140, ideal_rate_per_hr: 640, planned_minutes: 460, downtime_minutes: 68, downtime_reason: "Quality Hold" },
      { date: "2026-05-29", line: "Line 1", good_units: 4910, total_units: 4960, ideal_rate_per_hr: 680, planned_minutes: 480, downtime_minutes: 28, downtime_reason: "CIP / Cleaning" },
      { date: "2026-05-29", line: "Line 2", good_units: 4650, total_units: 4710, ideal_rate_per_hr: 660, planned_minutes: 480, downtime_minutes: 48, downtime_reason: "Operator" },
    ],
  },
  {
    id: "straw",
    name: "Straw Production",
    source: "Eagle KPI",
    rowCount: 234,
    lastUpdated: "2026-05-30",
    columns: [
      { name: "date", type: "date", required: true, editable: false },
      { name: "line", type: "text", required: true, editable: true },
      { name: "good_units", type: "number", required: true, editable: true },
      { name: "total_units", type: "number", required: true, editable: true },
      { name: "ideal_rate_per_hr", type: "number", required: false, editable: true },
      { name: "planned_minutes", type: "number", required: false, editable: true },
      { name: "downtime_minutes", type: "number", required: true, editable: true },
      { name: "downtime_reason", type: "text", required: false, editable: true },
      { name: "resin_used_kg", type: "number", required: true, editable: true },
      { name: "resin_std_kg", type: "number", required: true, editable: true },
    ],
    rows: [
      { date: "2026-05-30", line: "Extruder A", good_units: 810000, total_units: 824000, ideal_rate_per_hr: 52000, planned_minutes: 480, downtime_minutes: 32, downtime_reason: "Mechanical", resin_used_kg: 346.1, resin_std_kg: 330.8 },
      { date: "2026-05-30", line: "Extruder B", good_units: 790000, total_units: 808000, ideal_rate_per_hr: 50000, planned_minutes: 470, downtime_minutes: 45, downtime_reason: "Changeover", resin_used_kg: 339.4, resin_std_kg: 322.0 },
      { date: "2026-05-30", line: "Extruder C", good_units: 760000, total_units: 782000, ideal_rate_per_hr: 48000, planned_minutes: 460, downtime_minutes: 52, downtime_reason: "Quality Hold", resin_used_kg: 328.4, resin_std_kg: 310.2 },
    ],
  },
  {
    id: "warehouse",
    name: "Warehouse Ops",
    source: "Eagle KPI",
    rowCount: 90,
    lastUpdated: "2026-05-30",
    columns: [
      { name: "date", type: "date", required: true, editable: false },
      { name: "receipts_on_time", type: "number", required: true, editable: true },
      { name: "receipts_total", type: "number", required: true, editable: true },
      { name: "dock_to_stock_hrs", type: "number", required: true, editable: true },
      { name: "shipments_on_time", type: "number", required: true, editable: true },
      { name: "shipments_total", type: "number", required: true, editable: true },
      { name: "lines_shipped", type: "number", required: true, editable: true },
      { name: "lines_ordered", type: "number", required: true, editable: true },
      { name: "pick_lines_per_hr", type: "number", required: false, editable: true },
      { name: "inv_accuracy_pct", type: "number", required: false, editable: true },
      { name: "inventory_turns", type: "number", required: false, editable: true },
      { name: "days_on_hand", type: "number", required: false, editable: true },
      { name: "stockouts", type: "number", required: false, editable: true },
    ],
    rows: [
      { date: "2026-05-30", receipts_on_time: 38, receipts_total: 41, dock_to_stock_hrs: 3.2, shipments_on_time: 92, shipments_total: 96, lines_shipped: 508, lines_ordered: 512, pick_lines_per_hr: 76, inv_accuracy_pct: 99.6, inventory_turns: 11.2, days_on_hand: 32, stockouts: 1 },
      { date: "2026-05-29", receipts_on_time: 35, receipts_total: 38, dock_to_stock_hrs: 3.8, shipments_on_time: 88, shipments_total: 91, lines_shipped: 495, lines_ordered: 500, pick_lines_per_hr: 74, inv_accuracy_pct: 99.5, inventory_turns: 11.0, days_on_hand: 33, stockouts: 2 },
    ],
  },
];

function DataConfigSection() {
  const [tab, setTab] = useState<DataTab>("sources");

  return (
    <>
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit mb-5">
        {([
          { id: "sources" as const, label: "Data Sources" },
          { id: "tables" as const, label: "Data Tables" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.id ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sources" && <DataSourcesTab />}
      {tab === "tables" && <DataTablesTab />}
    </>
  );
}

function DataSourcesTab() {
  const STATUS_STYLES: Record<string, string> = {
    connected: "bg-green-950 text-green-400",
    disconnected: "bg-gray-800 text-gray-500",
    error: "bg-red-950 text-red-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{DATA_SOURCES.length} configured sources</p>
        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <span>+</span> Add Source
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DATA_SOURCES.map((src) => (
          <div key={src.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{src.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{src.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium ${STATUS_STYLES[src.status]}`}>
                      {src.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{src.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-500 hover:text-purple-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors">
                  Configure
                </button>
                {src.status === "connected" && (
                  <button className="text-xs text-gray-500 hover:text-green-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors">
                    Sync Now
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Sync</p>
                  <p className="text-sm text-gray-300">{src.lastSync}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tables</p>
                  <p className="text-sm text-gray-300">{src.tables.length}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {src.tables.map((t) => (
                  <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTablesTab() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<DataTable[]>(DATA_TABLES);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const active = tables.find((t) => t.id === selectedTable);

  function handleCellEdit(tableId: string, rowIdx: number, col: string, value: string) {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const newRows = [...t.rows];
        const colDef = t.columns.find((c) => c.name === col);
        newRows[rowIdx] = {
          ...newRows[rowIdx],
          [col]: colDef?.type === "number" ? (parseFloat(value) || 0) : value,
        };
        return { ...t, rows: newRows };
      })
    );
    setEditingCell(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{tables.length} data tables</p>
        <div className="flex items-center gap-2">
          {active && (
            <button
              onClick={() => setShowSchema(!showSchema)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                showSchema
                  ? "bg-purple-950 border-purple-800 text-purple-400"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Schema
            </button>
          )}
        </div>
      </div>

      {/* Table selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => { setSelectedTable(t.id === selectedTable ? null : t.id); setShowSchema(false); setEditingCell(null); }}
            className={`text-left px-4 py-3 rounded-xl border transition-all ${
              selectedTable === t.id
                ? "bg-gray-800 border-purple-500/50 ring-1 ring-purple-500/20"
                : "bg-gray-900 border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-medium text-sm">{t.name}</p>
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{t.columns.length} cols</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{t.rowCount.toLocaleString()} rows</span>
              <span>·</span>
              <span>Source: {t.source}</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Updated {t.lastUpdated}</p>
          </button>
        ))}
      </div>

      {/* Schema view */}
      {active && showSchema && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">{active.name} — Schema</h3>
              <p className="text-gray-500 text-xs mt-0.5">Column definitions and field configuration</p>
            </div>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded uppercase font-medium">
              Admin only
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-2.5 font-medium text-xs">Column Name</th>
                <th className="px-4 py-2.5 font-medium text-xs">Type</th>
                <th className="px-4 py-2.5 font-medium text-xs">Required</th>
                <th className="px-4 py-2.5 font-medium text-xs">Editable</th>
              </tr>
            </thead>
            <tbody>
              {active.columns.map((col) => (
                <tr key={col.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2.5">
                    <code className="text-purple-400 text-xs bg-purple-950/50 px-1.5 py-0.5 rounded">{col.name}</code>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{col.type}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${col.required ? "text-yellow-400" : "text-gray-600"}`}>
                      {col.required ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs ${col.editable ? "text-green-400" : "text-gray-600"}`}>
                      {col.editable ? "Yes" : "Locked"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data table view (editable for admin) */}
      {active && !showSchema && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">{active.name} — Data</h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Showing {active.rows.length} of {active.rowCount.toLocaleString()} rows · Click any editable cell to modify
              </p>
            </div>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded uppercase font-medium">
              Admin edit
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  {active.columns.map((col) => (
                    <th key={col.name} className="px-3 py-2.5 font-medium text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {col.name}
                        {!col.editable && <span className="text-gray-600" title="Locked">🔒</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    {active.columns.map((col) => {
                      const isEditing = editingCell?.row === ri && editingCell?.col === col.name;
                      const val = row[col.name];
                      return (
                        <td key={col.name} className="px-3 py-2">
                          {isEditing ? (
                            <input
                              autoFocus
                              defaultValue={String(val)}
                              onBlur={(e) => handleCellEdit(active.id, ri, col.name, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCellEdit(active.id, ri, col.name, (e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="bg-gray-800 border border-purple-500 text-white text-xs px-2 py-1 rounded w-full focus:outline-none"
                            />
                          ) : (
                            <span
                              className={`text-xs tabular-nums ${
                                col.editable
                                  ? "text-gray-200 cursor-pointer hover:text-purple-400 hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors"
                                  : "text-gray-500"
                              }`}
                              onClick={() => col.editable && setEditingCell({ row: ri, col: col.name })}
                              title={col.editable ? "Click to edit" : "Read-only"}
                            >
                              {typeof val === "number" ? val.toLocaleString() : val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-800 flex items-center justify-between">
            <p className="text-[10px] text-gray-600">
              Changes are held in-session. Connect a data source to persist edits.
            </p>
            <button className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
