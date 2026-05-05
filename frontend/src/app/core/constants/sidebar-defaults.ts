// Default sidebar layout — used as the initial value of ApiService.sidebarLayout
// before the API responds. Mirrors backend/src/lib/sidebar/defaults.ts.
import type { SidebarItem } from '../models';

export const DEFAULT_SIDEBAR_LAYOUT: SidebarItem[] = [
  { id: 'dashboard', kind: 'standalone', label: 'Dashboard', color: '#A02195', icon: 'dashboard', route: '/dashboard', visible: true, locked: true },
  { id: 'kb',        kind: 'standalone', label: 'Knowledge Base', color: '#21799F', icon: 'documents', route: '/kb', visible: true },
  {
    id: 'sales', kind: 'section', label: 'Sales', color: '#1A56DB',
    routePrefix: '/pipeline,/leads,/tradeshow', visible: true,
    children: [
      { id: 'pipeline',  label: 'Pipeline',        route: '/pipeline',  icon: 'pipeline',  visible: true },
      { id: 'leads',     label: 'Leads',           route: '/leads',     icon: 'leads',     visible: true },
      { id: 'tradeshow', label: 'Tradeshow Leads', route: '/tradeshow', icon: 'tradeshow', visible: true },
    ],
  },
  {
    id: 'intake', kind: 'section', label: 'Intake', color: '#34A125',
    routePrefix: '/intake', visible: true,
    children: [
      { id: 'customer-intake', label: 'Customer Intake', route: '/intake/customer', icon: 'intake', visible: true },
      { id: 'mes-intake',      label: 'MES Intake',      route: '/intake/mes',      icon: 'mes',    visible: true },
    ],
  },
  {
    id: 'customers', kind: 'section', label: 'Customers', color: '#D99808',
    routePrefix: '/customers,/calendar', visible: true,
    children: [
      { id: 'accounts', label: 'Accounts', route: '/customers', icon: 'accounts', visible: true },
      { id: 'calendar', label: 'Calendar', route: '/calendar',  icon: 'calendar', visible: true },
    ],
  },
  {
    id: 'project-hub', kind: 'section', label: 'Project Hub', color: '#6366F1',
    routePrefix: '/project-hub', visible: true,
    children: [
      { id: 'project-hub-dashboard', label: 'Hub Dashboard',     route: '/project-hub',          icon: 'clipboard', visible: true },
      { id: 'project-hub-calendar',  label: 'Project Calendar',  route: '/project-hub/calendar', icon: 'calendar',  visible: true },
    ],
  },
  {
    id: 'team', kind: 'section', label: 'Team', color: '#39219F',
    routePrefix: '/team', visible: true,
    children: [
      { id: 'team-hub',      label: 'Team Hub',           route: '/team',          icon: 'team', visible: true },
      { id: 'team-meetings', label: 'Meeting Repository', route: '/team/meetings', icon: 'mic',  visible: true },
    ],
  },
  {
    id: 'content', kind: 'section', label: 'Content', color: '#EC6B15',
    routePrefix: '/content', visible: true,
    children: [
      { id: 'content-library',  label: 'Content Library',  route: '/content',          icon: 'content',  visible: true },
      { id: 'content-calendar', label: 'Content Calendar', route: '/content/calendar', icon: 'calendar', visible: true },
    ],
  },
  {
    id: 'email-campaigns', kind: 'section', label: 'Email Campaigns', color: '#DC2626',
    routePrefix: '/content/campaigns', visible: true,
    children: [
      { id: 'campaigns-home', label: 'Campaigns', route: '/content/campaigns', icon: 'email', visible: true },
    ],
  },
  {
    id: 'support', kind: 'section', label: 'Support', color: '#0D9488',
    routePrefix: '/support', visible: true,
    children: [
      { id: 'tickets',         label: 'Ticketing',       route: '/support/tickets', icon: 'ticket',  visible: true },
      { id: 'customer-portal', label: 'Customer Portal', route: '/support/portal',  icon: 'globe',   visible: true },
      { id: 'cs-support',      label: 'CS Support',      route: '/support/cs',      icon: 'headset', visible: true },
    ],
  },
  {
    id: 'admin', kind: 'section', label: 'Admin Settings', color: '#4B5563',
    routePrefix: '/admin', visible: true, locked: true,
    children: [
      { id: 'users-roles',  label: 'Users & Roles', route: '/admin',              icon: 'users',        visible: true, locked: true },
      { id: 'integrations', label: 'Integrations',  route: '/admin/integrations', icon: 'integrations', visible: true },
    ],
  },
];
