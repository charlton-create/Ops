import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  { path: 'intake', redirectTo: '/intake/mes', pathMatch: 'full' },
  {
    path: 'intake/customer',
    canActivate: [authGuard],
    loadComponent: () => import('./features/intake/intake-registry.component').then(m => m.IntakeRegistryComponent)
  },
  {
    path: 'intake/customer/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/intake/customer-intake.component').then(m => m.CustomerIntakeComponent)
  },
  {
    path: 'intake/mes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/intake/mes/mes-landing.component').then(m => m.MesLandingComponent)
  },
  {
    path: 'intake/mes/interview',
    canActivate: [authGuard],
    loadComponent: () => import('./features/intake/mes/mes-interview.component').then(m => m.MesInterviewComponent)
  },
  {
    path: 'intake/mes/admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/intake/mes/mes-admin.component').then(m => m.MesAdminComponent)
  },
  {
    path: 'pipeline',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pipeline/pipeline.component').then(m => m.PipelineComponent)
  },
  {
    path: 'leads',
    canActivate: [authGuard],
    loadComponent: () => import('./features/leads/leads-list.component').then(m => m.LeadsListComponent)
  },
  {
    path: 'tradeshow',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tradeshow/tradeshow.component').then(m => m.TradeshowComponent)
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent)
  },
  { path: 'projects', redirectTo: '/project-hub', pathMatch: 'full' },
  { path: 'projects/archive', redirectTo: '/project-hub', pathMatch: 'full' },
  {
    path: 'project-hub',
    canActivate: [authGuard],
    loadComponent: () => import('./features/project-hub/project-hub.component').then(m => m.ProjectHubComponent)
  },
  {
    path: 'project-hub/calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/project-hub/project-calendar.component').then(m => m.ProjectCalendarComponent)
  },
  {
    path: 'team/messages',
    canActivate: [authGuard],
    loadComponent: () => import('./features/team/team-hub.component').then(m => m.TeamHubComponent)
  },
  {
    path: 'team',
    canActivate: [authGuard],
    loadComponent: () => import('./features/team/team-hub.component').then(m => m.TeamHubComponent)
  },
  {
    path: 'team/meetings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/team/meeting-repository.component').then(m => m.MeetingRepositoryComponent)
  },
  {
    path: 'kb/playbooks',
    canActivate: [authGuard],
    loadComponent: () => import('./features/kb/kb-list.component').then(m => m.KbListComponent)
  },
  {
    path: 'kb/templates',
    canActivate: [authGuard],
    loadComponent: () => import('./features/kb/kb-list.component').then(m => m.KbListComponent)
  },
  {
    path: 'kb',
    canActivate: [authGuard],
    loadComponent: () => import('./features/kb/kb-list.component').then(m => m.KbListComponent)
  },
  {
    path: 'content/campaigns',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content/content-campaigns.component').then(m => m.ContentCampaignsComponent)
  },
  {
    path: 'content/calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'content/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'content',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/admin-settings.component').then(m => m.AdminSettingsComponent)
  },
  { path: 'support', redirectTo: '/support/tickets', pathMatch: 'full' },
  {
    path: 'support/tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/support/tickets/tickets.component').then(m => m.TicketsComponent)
  },
  {
    path: 'support/portal',
    canActivate: [authGuard],
    loadComponent: () => import('./features/support/customer-portal/customer-portal.component').then(m => m.CustomerPortalComponent)
  },
  {
    path: 'support/cs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/support/cs-support/cs-support.component').then(m => m.CsSupportComponent)
  },
];
