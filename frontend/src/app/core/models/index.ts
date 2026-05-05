// Team
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  color: string;
  status: 'online' | 'away' | 'offline';
  tz: string;
  city: string;
  utcOffset: number;
  email: string;
}

// Note (first-class object)
export interface Note {
  id: number;
  author: string;
  content: string;
  createdAt: string; // ISO timestamp
}

// Lead sub-types
export interface LeadContact {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface LeadAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface LeadAttachment {
  id: number;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  addedBy: string;
  downloadUrl?: string;
}

// Lead
export interface Lead {
  id: number;
  company: string;
  contact: string;
  title: string;
  stage: PipelineStage;
  value: number;
  probability: number; // Win probability percentage
  modules: string[];
  certifications: string[];
  facilities: number;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  lastActivity: string;
  nextAction: string;
  source: string;
  notes: Note[];
  industry: string;
  email: string;
  phone: string;
  expansions: DealExpansion[];
  convertedToCustomer?: boolean;
  stageEnteredAt?: string;       // ISO timestamp when current stage started
  slaOverrideHigh?: boolean;     // Manual high-priority override
  timerDurationHours?: number;   // Custom countdown duration (defaults to STAGE_SLA_HOURS[stage])
  // CRM extended fields
  contacts?: LeadContact[];
  address?: LeadAddress;
  timezone?: string;
  attachments?: LeadAttachment[];
  // Intake link
  intakeStatus?: 'not_started' | 'in_progress' | 'completed';
  intakeUpdatedAt?: string;
}

// Intake Submission (completed prospective customer intake form)
export interface IntakeSubmission {
  id: number;
  submittedAt: string;       // ISO timestamp
  updatedAt: string;         // ISO timestamp
  status: 'draft' | 'submitted' | 'reviewed';
  interviewedBy: string;     // Team member name
  leadId?: number;           // If converted to a lead
  // Company
  companyName: string;
  industry: string;
  facilities: number;
  employees: number;
  // Contact
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  // Compliance
  certifications: string[];
  gfsiBenchmarked: string;
  lastAuditDate: string;
  biggestChallenge: string;
  // Interest
  modulesOfInterest: string[];
  timeline: string;
  source: string;
  notes: string;
  comments?: Note[];
}

// Customer (converted from Lead)
export interface Customer {
  id: number;
  leadId: number; // Original lead reference
  company: string;
  contact: string;
  title: string;
  email: string;
  phone: string;
  industry: string;
  modules: string[];
  certifications: string[];
  facilities: number;
  owner: string; // Account manager
  contractValue: number;
  annualRevenue: number;
  contractStart: string;
  contractEnd: string;
  renewalDate: string;
  status: CustomerStatus;
  billingStatus: BillingStatus;
  zohoCustomerId?: string;
  zohoInvoices: ZohoInvoice[];
  notes: Note[];
  createdAt: string;
  zohoSync?: ZohoSyncMeta;
}

export interface ZohoSyncMeta {
  lastSyncAt?: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'local_only';
  zohoModifiedAt?: string;
}

export type CustomerStatus = 'active' | 'onboarding' | 'churned' | 'paused';
export type BillingStatus = 'current' | 'pending' | 'overdue' | 'paid';

export interface ZohoInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partially_paid';
  zohoUrl?: string;
}

export const CUSTOMER_STATUS_BADGES: Record<CustomerStatus, string> = {
  active: 'green',
  onboarding: 'blue',
  churned: 'red',
  paused: 'yellow'
};

export const BILLING_STATUS_BADGES: Record<BillingStatus, string> = {
  current: 'green',
  pending: 'yellow',
  overdue: 'red',
  paid: 'green'
};

// Stage-based probability defaults
export const STAGE_PROBABILITIES: Record<PipelineStage, number> = {
  'Discovery':  10,
  'Intake':     25,
  'Demo':       55,
  'Follow-up':  75,
  'Closed Won': 100,
  'Closed Lost': 0,
  'Closed Failed': 0,
};

export interface DealExpansion {
  modules: string[];
  value: number;
  date: string;
}

export type PipelineStage =
  | 'Discovery'
  | 'Intake'
  | 'Demo'
  | 'Follow-up'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Closed Failed';

/** Ordered list — first 4 are active stages, last 3 are terminal */
export const PIPELINE_STAGES: PipelineStage[] = [
  'Discovery', 'Intake', 'Demo', 'Follow-up', 'Closed Won', 'Closed Lost', 'Closed Failed'
];

/** Allowed forward transitions — enforced by tryAdvanceLead */
export const PIPELINE_TRANSITIONS: Partial<Record<PipelineStage, PipelineStage[]>> = {
  'Discovery': ['Intake'],
  'Intake':    ['Demo'],
  'Demo':      ['Follow-up'],
  'Follow-up': ['Closed Won', 'Closed Lost', 'Closed Failed'],
};

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; badge: string }> = {
  'Discovery':    { bg: '#ECFEFF', text: '#0891B2', badge: 'cyan' },
  'Intake':       { bg: '#E0E7FF', text: '#4F46E5', badge: 'indigo' },
  'Demo':         { bg: '#FEF3C7', text: '#D97706', badge: 'yellow' },
  'Follow-up':    { bg: '#FFF7ED', text: '#EA580C', badge: 'orange' },
  'Closed Won':   { bg: '#ECFDF5', text: '#059669', badge: 'green' },
  'Closed Lost':  { bg: '#FFF1F2', text: '#E11D48', badge: 'red' },
  'Closed Failed':{ bg: '#FEF2F2', text: '#991B1B', badge: 'gray' },
};

export const STAGE_NEXT_ACTIONS: Record<string, string[]> = {
  'Discovery': [
    'Schedule discovery call',
    'Send intro email',
    'Send case study',
    'Request technical specs',
    'Confirm pain points',
    'Book follow-up meeting',
  ],
  'Intake': [
    'Schedule MES Intake call',
    'Complete MES Intake interview',
    'Review intake responses',
    'Send intake summary',
    'Confirm module selection',
  ],
  'Demo': [
    'Deliver product demo',
    'Prepare custom demo environment',
    'Send demo recording',
    'Follow up on demo feedback',
    'Schedule technical deep-dive',
  ],
  'Follow-up': [
    'Send proposal',
    'Revise proposal',
    'Awaiting client review',
    'Schedule follow-up call',
    'Clarify pricing questions',
    'Escalate to decision-maker',
    'Send contract',
    'Final review — close deal',
  ],
  'Closed Won': [
    'Begin onboarding',
    'Schedule kickoff call',
    'Send welcome package',
  ],
  'Closed Lost': [
    'Log loss reason',
    'Schedule re-engagement',
    'Archive deal',
  ],
  'Closed Failed': [
    'Log failure reason',
    'Review deal post-mortem',
    'Archive deal',
  ],
};

// Stage descriptions for the pipeline legend
export const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  'Discovery':  'Prospect identified — qualifying fit and gathering initial context',
  'Intake':     'MES Intake interview in progress — capturing operational requirements',
  'Demo':       'Product demonstration scheduled or completed',
  'Follow-up':  'Post-demo follow-up — addressing questions and moving toward close',
  'Closed Won': 'Contract signed and payment terms agreed',
  'Closed Lost':  'Opportunity lost — capture reason for future reference',
  'Closed Failed':'Deal failed due to external factors — document and archive',
};

// SLA configuration: hours allowed per stage before warning
export const STAGE_SLA_HOURS: Record<PipelineStage, number> = {
  'Discovery':  48,
  'Intake':     72,
  'Demo':       96,
  'Follow-up':  120,
  'Closed Won':    0,
  'Closed Lost':   0,
  'Closed Failed': 0,
};

// ─── Project Hub (MEDIC Six Sigma) ──────────────────────────────────────────

export type HubProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'blocked' | 'completed';
export type HubProjectType = 'upgrade' | 'fix' | 'qa' | 'general' | 'customer' | 'product' | 'marketing' | 'compliance';
export type HubTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type MedicPhase = 'M' | 'E' | 'D' | 'I' | 'C';

export interface HubSubtask {
  id: number;
  taskId: number;
  title: string;
  assignee: string;
  dueDate?: string | null;
  status: HubTaskStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HubTask {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  phase: MedicPhase;
  status: HubTaskStatus;
  responsible: string;
  accountable: string;
  informed?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  sortOrder: number;
  subtasks: HubSubtask[];
  createdAt: string;
  updatedAt: string;
}

export interface HubProject {
  id: number;
  name: string;
  description?: string | null;
  type: HubProjectType;
  status: HubProjectStatus;
  currentPhase: MedicPhase;
  ownerId?: number | null;
  ownerName?: string | null;
  ownerLabel?: string | null;
  ownerColor?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  tasks: HubTask[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicPhaseMeta {
  id: MedicPhase;
  name: string;
  desc: string;
}

export const MEDIC_PHASES: MedicPhaseMeta[] = [
  { id: 'M', name: 'Map+Measure',       desc: 'Scope the problem, baseline current state, define metrics' },
  { id: 'E', name: 'Explore+Evaluate',  desc: 'Investigate root causes, evaluate options, gather data' },
  { id: 'D', name: 'Define+Describe',   desc: 'Formalize the solution, document specs, gain alignment' },
  { id: 'I', name: 'Implement+Improve', desc: 'Execute the change, iterate, refine in production' },
  { id: 'C', name: 'Control+Conform',   desc: 'Lock in the gain, monitor compliance, close out' },
];

export const HUB_PROJECT_TYPES: { id: HubProjectType; label: string }[] = [
  { id: 'upgrade',    label: 'Major Upgrade' },
  { id: 'fix',        label: 'Error Fix' },
  { id: 'qa',         label: 'QA Testing' },
  { id: 'general',    label: 'General Project' },
  { id: 'customer',   label: 'Customer Onboarding' },
  { id: 'product',    label: 'Product Development' },
  { id: 'marketing',  label: 'Marketing' },
  { id: 'compliance', label: 'Compliance' },
];

export const HUB_PROJECT_STATUSES: { id: HubProjectStatus; label: string; bg: string; color: string }[] = [
  { id: 'planning',    label: 'Planning',    bg: '#F3F4F6', color: '#4B5563' },
  { id: 'in_progress', label: 'In Progress', bg: '#E8EFFF', color: '#1A56DB' },
  { id: 'on_hold',     label: 'On Hold',     bg: '#FEF3C7', color: '#B45309' },
  { id: 'blocked',     label: 'Blocked',     bg: '#FFE4E6', color: '#BE123C' },
  { id: 'completed',   label: 'Completed',   bg: '#D1FAE5', color: '#047857' },
];

export const HUB_TASK_STATUSES: { id: HubTaskStatus; label: string; bg: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',       bg: '#F3F4F6', color: '#4B5563' },
  { id: 'in_progress', label: 'In Progress', bg: '#E8EFFF', color: '#1A56DB' },
  { id: 'blocked',     label: 'Blocked',     bg: '#FFE4E6', color: '#BE123C' },
  { id: 'done',        label: 'Done',        bg: '#D1FAE5', color: '#047857' },
];

// User/Admin Management
export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  permissions: Permission[];
  lastLogin?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type Permission =
  | 'leads.view' | 'leads.edit' | 'leads.delete'
  | 'projecthub.view' | 'projecthub.edit' | 'projecthub.delete' | 'projecthub.admin'
  | 'team.view' | 'team.edit'
  | 'kb.view' | 'kb.edit' | 'kb.delete'
  | 'intake.view' | 'intake.edit' | 'intake.admin'
  | 'content.view' | 'content.edit' | 'content.publish'
  | 'customers.view' | 'customers.edit' | 'customers.billing'
  | 'support.view' | 'support.edit' | 'support.delete' | 'support.admin'
  | 'ai.use' | 'ai.admin'
  | 'admin.access' | 'reports.view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['leads.view', 'leads.edit', 'leads.delete', 'projecthub.view', 'projecthub.edit', 'projecthub.delete', 'projecthub.admin', 'team.view', 'team.edit', 'kb.view', 'kb.edit', 'kb.delete', 'intake.view', 'intake.edit', 'intake.admin', 'content.view', 'content.edit', 'content.publish', 'customers.view', 'customers.edit', 'customers.billing', 'support.view', 'support.edit', 'support.delete', 'support.admin', 'ai.use', 'ai.admin', 'admin.access', 'reports.view'],
  manager: ['leads.view', 'leads.edit', 'projecthub.view', 'projecthub.edit', 'team.view', 'kb.view', 'kb.edit', 'intake.view', 'intake.edit', 'content.view', 'content.edit', 'content.publish', 'customers.view', 'customers.edit', 'support.view', 'support.edit', 'support.delete', 'ai.use', 'reports.view'],
  user: ['leads.view', 'leads.edit', 'projecthub.view', 'projecthub.edit', 'team.view', 'kb.view', 'intake.view', 'intake.edit', 'content.view', 'content.edit', 'customers.view', 'support.view', 'support.edit', 'ai.use'],
  viewer: ['leads.view', 'projecthub.view', 'team.view', 'kb.view', 'intake.view', 'content.view', 'customers.view', 'support.view']
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'leads.view': 'View Leads',
  'leads.edit': 'Edit Leads',
  'leads.delete': 'Delete Leads',
  'projecthub.view': 'View Project Hub',
  'projecthub.edit': 'Edit Projects/Tasks',
  'projecthub.delete': 'Delete Projects',
  'projecthub.admin': 'Project Hub Admin',
  'team.view': 'View Team',
  'team.edit': 'Edit Team',
  'kb.view': 'View Knowledge Base',
  'kb.edit': 'Edit Knowledge Base',
  'kb.delete': 'Delete KB Documents',
  'intake.view': 'View MES Intake',
  'intake.edit': 'Conduct Intake',
  'intake.admin': 'Admin Intake Forms',
  'content.view': 'View Content',
  'content.edit': 'Create/Edit Content',
  'content.publish': 'Publish Content',
  'customers.view': 'View Customers',
  'customers.edit': 'Edit Customers',
  'customers.billing': 'Manage Billing',
  'support.view': 'View Support',
  'support.edit': 'Edit Tickets',
  'support.delete': 'Delete Tickets',
  'support.admin': 'Support Admin',
  'ai.use': 'Use AI Assistant',
  'ai.admin': 'Configure AI Settings',
  'admin.access': 'Admin Access',
  'reports.view': 'View Reports'
};

// Field-level change record for activity tracking
export interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

// Activity/Contact Log
export interface Activity {
  id: number;
  who: string;
  action: string;
  target: string;
  detail: string;
  time: string;
  type?: 'email' | 'phone' | 'note' | 'reminder' | 'meeting' | 'stage_change' | 'general';
  leadId?: number;
  projectId?: number;
  dueDate?: string;
  completed?: boolean;
  // Universal entity tracking
  entityType?: 'lead' | 'customer' | 'project' | 'kb' | 'content' | 'campaign' | 'calendar' | 'demo_request';
  entityId?: number;
  changes?: FieldChange[];
}

// Calendar Event
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  type: 'meeting' | 'reminder' | 'deadline' | 'call' | 'task';
  description?: string;
  relatedTo?: { type: 'lead' | 'project' | 'general'; id?: number; name: string };
  assignee: string;
  completed?: boolean;
}

// Message with context
export interface Message {
  id: number;
  from: string;
  to: string;
  text: string;
  time: string;
  read: boolean;
  context?: { type: 'lead' | 'project' | 'general'; id?: number; name?: string };
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileDataUrl?: string;
}

// Knowledge Base
export interface KBDocument {
  id: number;
  title: string;
  type: 'document' | 'playbook' | 'template' | 'file' | 'link' | 'folder';
  category: string;
  updated: string;
  author: string;
  description: string;
  content: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileDataUrl?: string;
  url?: string;          // for link-type items
  parentFolder?: number; // id of parent folder (0 or undefined = root)
  pinned?: boolean;
  views?: number;
  createdAt?: string;
  notes?: string;
  version?: string;
  updatedAtIso?: string;
  comments?: Note[];
}

// MES Intake
export interface MESSection {
  id: string;
  title: string;
  icon: string;
  desc: string;
  fields: MESField[];
  isMod?: boolean;
  timeMinutes?: number;
}

export interface MESField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'url'
      | 'checkbox' | 'toggle' | 'radio' | 'select' | 'multi' | 'tags' | 'file'
      | 'module_select' | 'audit_dynamic' | 'audit_blocks';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  hint?: string;         // Helper text shown below the label
  defaultValue?: string; // Default value for the field
  allowCustom?: boolean; // Allow free-text "Other" entry for select/multi/radio
  visible?: boolean;     // When false the field is hidden from the live intake form (default: visible)
  validation?: {         // Basic validation rules
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface MESModule {
  id: string;
  name: string;
  icon: string;
  desc: string;
  active: boolean;
  builtIn: boolean;
  fields: MESField[];
}

export interface MESGoogleSheetsConfig {
  spreadsheetId: string;
  tabName: string;
  token: string;
}

// Web Demo Request (from website contact form)
export interface DemoRequest {
  id: number;
  fullName: string;
  email: string;
  position: string;
  companyName: string;
  businessType: string;
  industry: string;
  preferredTime: string;
  preferredDate: string;
  selectedModules: DemoModuleSelection[];
  demoFocus: string;
  status: DemoRequestStatus;
  assignedTo?: string;
  convertedToLeadId?: number;
  submittedAt: string;
  notes?: string;
}

export interface DemoModuleSelection {
  module: string;
  subModules: string[];
}

export type DemoRequestStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'converted' | 'declined';

export const DEMO_STATUS_BADGES: Record<DemoRequestStatus, string> = {
  new: 'blue',
  contacted: 'cyan',
  scheduled: 'yellow',
  completed: 'green',
  converted: 'purple',
  declined: 'red'
};

// CAT-I Module definitions for demo form
export const CAT_MODULES = {
  'CAT-I.AI': {
    name: 'Compliance Intelligence Hub',
    subModules: ['Document Control', 'Training & Certification', 'Audit Management', 'Food Safety Culture', 'HACCP Plan Builder', 'AI-Powered Generation']
  },
  'CAT-MES': {
    name: 'Manufacturing Execution System',
    subModules: ['Production Scheduling', 'Batch Tracking & Traceability', 'OEE & Downtime Monitoring', 'Labor Management', 'Inventory Transactions', 'ERP Integration']
  },
  'CAT-QT': {
    name: 'Quality Control Portal',
    subModules: ['Non-Conformance Reports', 'Supplier Management', 'Customer Complaints', 'Hold & Release', 'CAPA Management', 'Glass & Brittle Plastic Register']
  },
  'CAT-SCAN': {
    name: 'Sanitation Management System',
    subModules: ['Master Sanitation Scheduling', 'Pre-Op & Post-Op Inspections', 'Chemical & SDS Management', 'Pest Control Integration', 'Environmental Monitoring', 'Safety Programs (OSHA)']
  },
  'CAT-iLOG': {
    name: 'Recipe Database & Labels',
    subModules: ['Product Specifications', 'Nutrition Facts Calculation', 'Allergen Management', 'Label Generation & Approval', 'Ingredient Database', 'Regulatory Compliance']
  }
};

// Navigation
export type NavSection = 'top' | 'sales' | 'customers' | 'team' | 'admin';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  sectionColor: string;
  section: NavSection;
  icon?: string;
}

export const NAV_SECTIONS: { id: NavSection; label: string }[] = [
  { id: 'top', label: '' },
  { id: 'sales', label: 'Sales' },
  { id: 'customers', label: 'Customers' },
  { id: 'team', label: 'Team' },
  { id: 'admin', label: 'Admin' },
];

export const NAV_ITEMS: NavItem[] = [
  // Top (no section header)
  { id: 'dashboard',  label: 'Dashboard',       route: '/dashboard',   sectionColor: '#A02195', section: 'top' },
  // Sales
  { id: 'intake',     label: 'Intake',          route: '/intake/mes',  sectionColor: '#0D9488', section: 'sales' },
  { id: 'pipeline',   label: 'Pipeline',        route: '/pipeline',    sectionColor: '#1A56DB', section: 'sales' },
  { id: 'leads',      label: 'Leads',           route: '/leads',       sectionColor: '#1A56DB', section: 'sales' },
  // Customers
  { id: 'accounts',   label: 'Accounts',        route: '/customers',   sectionColor: '#059669', section: 'customers' },
  { id: 'projects',   label: 'Projects',        route: '/projects',    sectionColor: '#D97706', section: 'customers' },
  { id: 'calendar',   label: 'Calendar',        route: '/calendar',    sectionColor: '#0D9488', section: 'customers' },
  // Team
  { id: 'team',       label: 'Team Hub',        route: '/team',        sectionColor: '#39219F', section: 'team' },
  { id: 'kb',         label: 'Knowledge Base',  route: '/kb',          sectionColor: '#21799F', section: 'team' },
  // Admin
  { id: 'admin',      label: 'Settings',        route: '/admin',       sectionColor: '#6B7280', section: 'admin' },
];

// Content Module
export interface ContentPiece {
  id: number;
  title: string;
  description: string;
  stage: ContentStage;
  type: ContentType;
  platforms: ContentPlatform[];
  owner: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  publishedDate?: string;
  blockers: string[];
  tags: string[];
  notes: string;
  attachments: string[];
  linkedLeads: number[];
  body: string;
  imageUrl?: string;
  campaignId?: number;
}

export type ContentStage = 'Ideas' | 'In Development' | 'Under Review' | 'Approved' | 'Scheduled' | 'Published';

export type ContentType = 'Blog Post' | 'Social Image' | 'Social Video' | 'Newsletter' | 'Case Study' | 'Product Update' | 'Feature Ad' | 'Whitepaper' | 'Webinar' | 'Press Release';

export type ContentPlatform = 'Instagram' | 'LinkedIn' | 'X (Twitter)' | 'Website Blog' | 'Email' | 'YouTube' | 'Facebook' | 'TikTok';

export const CONTENT_STAGES: ContentStage[] = ['Ideas', 'In Development', 'Under Review', 'Approved', 'Scheduled', 'Published'];

export const CONTENT_STAGE_COLORS: Record<ContentStage, { bg: string; text: string; badge: string }> = {
  'Ideas':           { bg: '#F3F4F6', text: '#374151', badge: 'gray' },
  'In Development':  { bg: '#EFF6FF', text: '#2563EB', badge: 'blue' },
  'Under Review':    { bg: '#FFFBEB', text: '#D97706', badge: 'yellow' },
  'Approved':        { bg: '#ECFDF5', text: '#059669', badge: 'green' },
  'Scheduled':       { bg: '#F5F3FF', text: '#7C3AED', badge: 'purple' },
  'Published':       { bg: '#ECFEFF', text: '#0891B2', badge: 'cyan' },
};

export const STAGE_OWNERS: Record<ContentStage, string[]> = {
  'Ideas':           ['Yael', 'Artem', 'Aisha'],
  'In Development':  ['Yael', 'Artem', 'Igor'],
  'Under Review':    ['Artem', 'Aisha'],
  'Approved':        ['Aisha'],
  'Scheduled':       ['Yael'],
  'Published':       ['Yael'],
};

export const CONTENT_TYPES: ContentType[] = ['Blog Post', 'Social Image', 'Social Video', 'Newsletter', 'Case Study', 'Product Update', 'Feature Ad', 'Whitepaper', 'Webinar', 'Press Release'];

export const CONTENT_PLATFORMS: ContentPlatform[] = ['Instagram', 'LinkedIn', 'X (Twitter)', 'Website Blog', 'Email', 'YouTube', 'Facebook', 'TikTok'];

// Email Campaign
export interface EmailCampaign {
  id: number;
  name: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  contentPieceId?: number;
  status: 'Draft' | 'Scheduled' | 'Sent';
  audience: EmailAudience;
  scheduledDate?: string;
  sentDate?: string;
  recipients: number;
  opens?: number;
  clicks?: number;
  bodyHtml: string;
  imageFileName?: string;
  imageDataUrl?: string;
  createdBy: string;
  emailType?: 'marketing' | 'transactional' | 'follow-up' | 'system';
  templateId?: string;
  blocks?: CampaignEditableBlocks;
  comments?: Note[];
}

export interface EmailAudience {
  type: 'all_leads' | 'by_stage' | 'by_module' | 'custom';
  stages?: string[];
  modules?: string[];
  leadIds?: number[];
}

export const CAMPAIGN_STATUS_BADGES: Record<'Draft' | 'Scheduled' | 'Sent', string> = {
  Draft: 'gray',
  Scheduled: 'purple',
  Sent: 'green'
};

export type EmailType = 'marketing' | 'transactional' | 'follow-up' | 'system';

export const EMAIL_TYPE_BADGES: Record<EmailType, string> = {
  marketing: 'purple',
  transactional: 'blue',
  'follow-up': 'orange',
  system: 'gray'
};

// Email Template
export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  htmlTemplate: string;
  hasCta: boolean;
  hasImage: boolean;
  defaultBody?: string;   // Optional pre-populated body content when template is selected
  featured?: boolean;     // Marks primary/recommended templates
  source?: 'builtin' | 'imported' | 'uploaded';
  sourceFileName?: string;
  updatedAt?: string;
  createdBy?: string;
  defaultCtaLabel?: string;
  defaultCtaUrl?: string;
}

export interface CampaignEditableBlocks {
  greeting?: string;
  intro?: string;
  body?: string;
  closing?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  signatureName?: string;
  signatureRole?: string;
}

export interface CampaignRecipientPreview {
  firstName: string;
  fullName: string;
  company: string;
  email: string;
}

// ─── Support / Ticketing ──────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'escalated' | 'closed';
export type TicketSource = 'internal' | 'portal' | 'email';
export type TicketPriority = 'normal' | 'technical' | 'critical';
export type TicketSeverity = 'low' | 'medium' | 'high' | 'critical';
export type TicketLevel = 1 | 2 | 3;
export type TicketNoteVisibility = 'internal' | 'customer';

export interface TicketNote {
  id: number;
  ticketId: number;
  visibility: TicketNoteVisibility;
  author: string;
  content: string;
  emailSent: boolean;
  createdAt: string;
}

export interface TicketAttachment {
  id: number;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  addedBy: string;
  downloadUrl?: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  level: TicketLevel;
  status: TicketStatus;
  module: string;
  category: string;
  subject: string;
  description: string;
  customerId?: number | null;
  customerName: string;
  customerCompany: string;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  assignedToId?: number | null;
  assignee?: string | null;
  assigneeQueue?: string | null;
  assigneeColor?: string | null;
  source: TicketSource;
  priority: TicketPriority;
  severity: TicketSeverity;
  aiResolved: boolean;
  attachments: TicketAttachment[];
  resolvedAt?: string | null;
  notes?: TicketNote[];
  notesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketingSettings {
  id: number;
  supportEmail: string;
  autoReplyEnabled: boolean;
  autoReplyTemplate: string;
  statusChangeTemplate: string;
  escalationTemplate: string;
  completionTemplate: string;
  escalationRules: EscalationRule[];
  updatedAt: string;
}

export interface EscalationRule {
  id: string;
  level: TicketLevel;
  hoursOpen: number;
  recipient: string;
  subject: string;
  enabled: boolean;
}

export const TICKET_MODULES: readonly string[] = [
  'CAT-I Base', 'CAT-MES', 'CAT-QT', 'CAT-SCAN', 'CAT-ALOG', 'Full Platform',
];

export const TICKET_CATEGORIES: Record<TicketLevel, readonly string[]> = {
  1: ['How-To / Workflow', 'Feature Navigation', 'Report Interpretation', 'User Setup', 'Training Gap', 'Documentation Request'],
  2: ['Login / Access Issue', 'Data Entry Error', 'Module Bug', 'Export Problem', 'Integration Failure', 'Performance Issue'],
  3: ['System Outage', 'Data Corruption', 'Multi-Tenant Impact', 'Compliance Risk', 'Security Incident', 'API Failure'],
};

export interface TicketLevelMeta {
  label: string;
  color: string;
  bg: string;
  slaHours: number;
  defaultQueue: string;
  icon: string;
}

export const TICKET_LEVEL_META: Record<TicketLevel, TicketLevelMeta> = {
  1: { label: 'L1 · Support',   color: '#10B981', bg: '#D1FAE5', slaHours: 4,  defaultQueue: 'AI Auto-Response',    icon: '' },
  2: { label: 'L2 · Isolated',  color: '#F59E0B', bg: '#FEF3C7', slaHours: 24, defaultQueue: 'Tier 2 Queue',        icon: '' },
  3: { label: 'L3 · Critical',  color: '#E11D48', bg: '#FEE2E2', slaHours: 2,  defaultQueue: 'Dev Team Escalation', icon: '' },
};

export const TICKET_STATUS_META: Record<TicketStatus, { bg: string; color: string }> = {
  'open':         { bg: '#DBEAFE', color: '#1A56DB' },
  'in-progress':  { bg: '#FEF3C7', color: '#92400E' },
  'resolved':     { bg: '#D1FAE5', color: '#065F46' },
  'escalated':    { bg: '#FEE2E2', color: '#E11D48' },
  'closed':       { bg: '#F3F4F6', color: '#6B7280' },
};

// ─── Meeting Repository ──────────────────────────────────────────────────────

export type MeetingStatus = 'live' | 'completed' | 'draft' | 'archived';

export interface MeetingActionItem {
  id: number;
  meetingId: number;
  task: string;
  owner?: string | null;
  dueDate?: string | null;
  done: boolean;
  sortOrder: number;
}

export interface MeetingFollowUp {
  id: number;
  meetingId: number;
  task: string;
  context?: string | null;
  sortOrder: number;
}

export interface MeetingFile {
  id: number;
  meetingId: number;
  name: string;
  kind: 'embedded' | 'linked';
  url?: string | null;
  s3Key?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  uploadedBy?: string | null;
  uploadedAt: string;
  downloadUrl?: string | null;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  status: MeetingStatus;
  summary?: string | null;
  discussion?: string | null;
  transcript?: string | null;
  attendees: string[];
  attendeeIds: number[];
  agenda: string[];
  hostId?: number | null;
  hostName?: string | null;
  hostColor?: string | null;
  imported: boolean;
  actionItems: MeetingActionItem[];
  followUps: MeetingFollowUp[];
  files: MeetingFile[];
  attendeeCount?: number;
  snippet?: string;
  createdAt: string;
  updatedAt: string;
}

export const MEETING_STATUS_META: Record<MeetingStatus, { label: string; bg: string; color: string }> = {
  live:      { label: 'Live',      bg: '#FCE7F3', color: '#E11D48' },
  completed: { label: 'Completed', bg: '#D1FAE5', color: '#047857' },
  draft:     { label: 'Draft',     bg: '#F3F4F6', color: '#6B7280' },
  archived:  { label: 'Archived',  bg: '#F3F4F6', color: '#4B5563' },
};

// ─── System Diagnostics ──────────────────────────────────────────────────────

export type DiagCheckStatus = 'pass' | 'warn' | 'fail';

export interface DiagCheck { id: string; name: string; }

export interface DiagSuite {
  id: string;
  moduleId: string;
  name: string;
  category: string;
  weight: number;
  checks: DiagCheck[];
}

export interface DiagModule {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
}

export interface DiagCatalog {
  modules: DiagModule[];
  suites: DiagSuite[];
}

export interface DiagAIFinding {
  severity: 'critical' | 'major' | 'minor' | 'observation';
  finding: string;
  risk_area: 'infrastructure' | 'security' | 'data_integrity' | 'configuration' | 'operations';
  regulatory_refs: string[];
  recommendation: string;
  root_cause: string | null;
  impact_analysis: string | null;
  failed_checks_detail: { check: string; why_it_matters: string; fix: string }[];
  remediation_plan: { immediate: string; short_term: string; long_term: string } | null;
  compliance_risk: string | null;
  estimated_effort: 'low' | 'medium' | 'high' | null;
}

export interface DiagRun {
  runId: number;
  scope: string;                                      // "platform" | "module:<id>" | "suite:<id>"
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalChecks: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  healthScore: number;                                // 0-100
  results: Record<string, DiagCheckStatus>;           // "<suiteId>-<idx>" → status
  messages: Record<string, string>;
  findings: Record<string, DiagAIFinding>;            // suiteId → finding
}

export interface DiagRunSummary {
  id: number;
  scope: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  totalChecks: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  healthScore: number;
  startedByName: string | null;
}

export const DIAG_STATUS_META: Record<DiagCheckStatus, { label: string; bg: string; color: string }> = {
  pass: { label: 'Pass',    bg: '#D1FAE5', color: '#047857' },
  warn: { label: 'Warning', bg: '#FEF3C7', color: '#92400E' },
  fail: { label: 'Fail',    bg: '#FFE4E6', color: '#BE123C' },
};

// ─── Sidebar Layout Config ───────────────────────────────────────────────────

export interface SidebarChild {
  id: string;
  label: string;
  route: string;
  icon: string;
  visible?: boolean;
  locked?: boolean;
}

export interface SidebarItem {
  id: string;
  kind: 'standalone' | 'section';
  label: string;
  color: string;
  icon?: string;       // standalone only
  route?: string;      // standalone only
  routePrefix?: string;// section only
  children?: SidebarChild[];
  visible?: boolean;
  locked?: boolean;
}
