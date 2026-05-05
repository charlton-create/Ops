export type NavSection = "top" | "sales" | "customers" | "team" | "admin";

export interface NavItem {
  id: string;
  label: string;
  route: string;
  sectionColor: string;
  section: NavSection;
}

export const NAV_SECTIONS: { id: NavSection; label: string }[] = [
  { id: "top", label: "" },
  { id: "sales", label: "Sales" },
  { id: "customers", label: "Customers" },
  { id: "team", label: "Team" },
  { id: "admin", label: "Admin" },
];

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", route: "/dashboard", sectionColor: "#A02195", section: "top" },
  { id: "intake", label: "Intake", route: "/intake/mes", sectionColor: "#0D9488", section: "sales" },
  { id: "pipeline", label: "Pipeline", route: "/pipeline", sectionColor: "#1A56DB", section: "sales" },
  { id: "leads", label: "Leads", route: "/leads", sectionColor: "#1A56DB", section: "sales" },
  { id: "accounts", label: "Accounts", route: "/customers", sectionColor: "#059669", section: "customers" },
  { id: "projects", label: "Projects", route: "/projects", sectionColor: "#D97706", section: "customers" },
  { id: "calendar", label: "Calendar", route: "/calendar", sectionColor: "#0D9488", section: "customers" },
  { id: "team", label: "Team Hub", route: "/team", sectionColor: "#39219F", section: "team" },
  { id: "kb", label: "Knowledge Base", route: "/kb", sectionColor: "#21799F", section: "team" },
  { id: "admin", label: "Settings", route: "/admin", sectionColor: "#6B7280", section: "admin" },
];
