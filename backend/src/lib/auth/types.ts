export type UserRole = "admin" | "manager" | "user" | "viewer";

export type Permission =
  | "leads.view" | "leads.edit" | "leads.delete"
  | "projecthub.view" | "projecthub.edit" | "projecthub.delete" | "projecthub.admin"
  | "team.view" | "team.edit"
  | "meetings.view" | "meetings.edit" | "meetings.delete"
  | "kb.view" | "kb.edit" | "kb.delete"
  | "intake.view" | "intake.edit" | "intake.admin"
  | "content.view" | "content.edit" | "content.publish"
  | "customers.view" | "customers.edit" | "customers.billing"
  | "support.view" | "support.edit" | "support.delete" | "support.admin"
  | "diagnostics.view" | "diagnostics.run"
  | "ai.use" | "ai.admin"
  | "admin.access" | "reports.view";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "leads.view", "leads.edit", "leads.delete",
    "projecthub.view", "projecthub.edit", "projecthub.delete", "projecthub.admin",
    "team.view", "team.edit",
    "meetings.view", "meetings.edit", "meetings.delete",
    "kb.view", "kb.edit", "kb.delete",
    "intake.view", "intake.edit", "intake.admin",
    "content.view", "content.edit", "content.publish",
    "customers.view", "customers.edit", "customers.billing",
    "support.view", "support.edit", "support.delete", "support.admin",
    "diagnostics.view", "diagnostics.run",
    "ai.use", "ai.admin",
    "admin.access", "reports.view",
  ],
  manager: [
    "leads.view", "leads.edit",
    "projecthub.view", "projecthub.edit",
    "team.view",
    "meetings.view", "meetings.edit", "meetings.delete",
    "kb.view", "kb.edit",
    "intake.view", "intake.edit",
    "content.view", "content.edit", "content.publish",
    "customers.view", "customers.edit",
    "support.view", "support.edit", "support.delete",
    "ai.use", "reports.view",
  ],
  user: [
    "leads.view", "leads.edit",
    "projecthub.view", "projecthub.edit",
    "team.view",
    "meetings.view", "meetings.edit",
    "kb.view",
    "intake.view", "intake.edit",
    "content.view", "content.edit",
    "customers.view",
    "support.view", "support.edit",
    "ai.use",
  ],
  viewer: [
    "leads.view",
    "projecthub.view",
    "team.view",
    "meetings.view",
    "kb.view",
    "intake.view",
    "content.view",
    "customers.view",
    "support.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
