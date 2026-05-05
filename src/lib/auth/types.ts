export type UserRole = "admin" | "manager" | "user" | "viewer";

export type Permission =
  | "leads.view" | "leads.edit" | "leads.delete"
  | "projects.view" | "projects.edit" | "projects.delete"
  | "team.view" | "team.edit"
  | "kb.view" | "kb.edit" | "kb.delete"
  | "intake.view" | "intake.edit" | "intake.admin"
  | "content.view" | "content.edit" | "content.publish"
  | "customers.view" | "customers.edit" | "customers.billing"
  | "ai.use" | "ai.admin"
  | "admin.access" | "reports.view";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "leads.view", "leads.edit", "leads.delete",
    "projects.view", "projects.edit", "projects.delete",
    "team.view", "team.edit",
    "kb.view", "kb.edit", "kb.delete",
    "intake.view", "intake.edit", "intake.admin",
    "content.view", "content.edit", "content.publish",
    "customers.view", "customers.edit", "customers.billing",
    "ai.use", "ai.admin",
    "admin.access", "reports.view",
  ],
  manager: [
    "leads.view", "leads.edit",
    "projects.view", "projects.edit",
    "team.view",
    "kb.view", "kb.edit",
    "intake.view", "intake.edit",
    "content.view", "content.edit", "content.publish",
    "customers.view", "customers.edit",
    "ai.use", "reports.view",
  ],
  user: [
    "leads.view", "leads.edit",
    "projects.view", "projects.edit",
    "team.view",
    "kb.view",
    "intake.view", "intake.edit",
    "content.view", "content.edit",
    "customers.view",
    "ai.use",
  ],
  viewer: [
    "leads.view",
    "projects.view",
    "team.view",
    "kb.view",
    "intake.view",
    "content.view",
    "customers.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
