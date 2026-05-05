import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DEFAULT_SIDEBAR_LAYOUT } from '../constants/sidebar-defaults';
import {
  Lead, HubProject, HubTask, HubSubtask, KBDocument, Activity, Message, TeamMember, Note,
  PipelineStage, CalendarEvent, STAGE_PROBABILITIES, Customer,
  DemoRequest, ContentPiece, EmailCampaign, ContentStage, IntakeSubmission,
  Ticket, TicketNote, TicketingSettings,
  Meeting, MeetingActionItem, MeetingFile,
  DiagCatalog, DiagRun, DiagRunSummary,
  SidebarItem,
} from '../models';
import { firstValueFrom } from 'rxjs';

/**
 * ApiService — HTTP-backed replacement for DataService.
 *
 * Keeps the same signal-based public API so existing components work without changes.
 * Fetches data from the Next.js API backend and caches in signals.
 * Mutation methods call the API then refresh the local signal cache.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // --- Signals (same names as DataService) ---
  private _team = signal<TeamMember[]>([]);
  team = this._team.asReadonly();

  private _leads = signal<Lead[]>([]);
  leads = this._leads.asReadonly();

  private _projects = signal<HubProject[]>([]);
  projects = this._projects.asReadonly();

  private _kbDocs = signal<KBDocument[]>([]);
  kbDocs = this._kbDocs.asReadonly();

  private _activities = signal<Activity[]>([]);
  activities = this._activities.asReadonly();

  private _messages = signal<Message[]>([]);
  messages = this._messages.asReadonly();

  private _calendarEvents = signal<CalendarEvent[]>([]);
  calendarEvents = this._calendarEvents.asReadonly();

  private _customers = signal<Customer[]>([]);
  customers = this._customers.asReadonly();

  private _demoRequests = signal<DemoRequest[]>([]);
  demoRequests = this._demoRequests.asReadonly();

  private _content = signal<ContentPiece[]>([]);
  content = this._content.asReadonly();

  private _campaigns = signal<EmailCampaign[]>([]);
  campaigns = this._campaigns.asReadonly();

  private _intakeSubmissions = signal<IntakeSubmission[]>([]);
  intakeSubmissions = this._intakeSubmissions.asReadonly();

  private _tickets = signal<Ticket[]>([]);
  tickets = this._tickets.asReadonly();

  private _meetings = signal<Meeting[]>([]);
  meetings = this._meetings.asReadonly();

  // Sidebar layout — initialized to baked-in defaults for instant render,
  // then overwritten by /api/sidebar-config on first fetch
  private _sidebarLayout = signal<SidebarItem[]>(DEFAULT_SIDEBAR_LAYOUT);
  sidebarLayout = this._sidebarLayout.asReadonly();

  // --- Computed values (identical to DataService) ---
  operationalLeads = computed(() => this._leads().filter(l => l.contact !== ''));
  activeLeads = computed(() => this.operationalLeads().filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost' && l.stage !== 'Closed Failed'));
  wonLeads = computed(() => this.operationalLeads().filter(l => l.stage === 'Closed Won'));
  lostLeads = computed(() => this.operationalLeads().filter(l => l.stage === 'Closed Lost'));
  failedLeads = computed(() => this.operationalLeads().filter(l => l.stage === 'Closed Failed'));
  pipelineValue = computed(() => this.activeLeads().reduce((sum, l) => sum + l.value, 0));
  wonRevenue = computed(() => this.wonLeads().reduce((sum, l) => sum + l.value, 0));
  avgDealSize = computed(() => {
    const active = this.activeLeads();
    return active.length > 0 ? Math.round(this.pipelineValue() / active.length) : 0;
  });
  highPriorityDeals = computed(() => this.activeLeads().filter(l => l.priority === 'high'));
  activeProjects = computed(() => this._projects().filter(p => p.status === 'in_progress'));
  completedProjects = computed(() => this._projects().filter(p => p.status === 'completed'));
  blockedProjects = computed(() => this._projects().filter(p => p.status === 'blocked'));
  overdueProjects = computed(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return this._projects().filter(p => p.status !== 'completed' && p.targetDate && new Date(p.targetDate) < today);
  });
  activeCustomers = computed(() => this._customers().filter(c => c.status === 'active'));
  onboardingCustomers = computed(() => this._customers().filter(c => c.status === 'onboarding'));
  totalCustomerValue = computed(() => this._customers().filter(c => c.status === 'active').reduce((sum, c) => sum + c.contractValue, 0));
  customersWithOverduePayments = computed(() => this._customers().filter(c => c.billingStatus === 'overdue'));
  newDemoRequests = computed(() => this._demoRequests().filter(d => d.status === 'new'));
  pendingDemoRequests = computed(() => this._demoRequests().filter(d => d.status === 'new' || d.status === 'contacted' || d.status === 'scheduled'));
  convertedDemoRequests = computed(() => this._demoRequests().filter(d => d.status === 'converted'));
  contentByStage = computed(() => {
    const stages: Record<ContentStage, ContentPiece[]> = {
      'Ideas': [], 'In Development': [], 'Under Review': [], 'Approved': [], 'Scheduled': [], 'Published': []
    };
    this._content().forEach(c => stages[c.stage]?.push(c));
    return stages;
  });
  scheduledContent = computed(() => this._content().filter(c => c.scheduledDate));
  publishedContent = computed(() => this._content().filter(c => c.stage === 'Published'));
  contentInProgress = computed(() => this._content().filter(c => c.stage !== 'Published' && c.stage !== 'Ideas'));

  // --- Data Loading ---
  private loaded = false;

  loadAll(force = false) {
    if (this.loaded && !force) return;
    this.loaded = true;
    this.refreshTeam();
    this.refreshLeads();
    this.refreshProjects();
    this.refreshKB();
    this.refreshActivities();
    this.refreshMessages();
    this.refreshCalendar();
    this.refreshCustomers();
    this.refreshDemos();
    this.refreshContent();
    this.refreshCampaigns();
    this.refreshIntakeSubmissions();
    this.refreshTradeShowScans();
    this.refreshTickets();
    this.refreshMeetings();
  }

  private refreshIntakeSubmissions() { this.http.get<IntakeSubmission[]>(`${this.api}/intake-submissions`, { withCredentials: true }).subscribe(d => this._intakeSubmissions.set(d)); }

  private refreshTeam() { this.http.get<TeamMember[]>(`${this.api}/team`, { withCredentials: true }).subscribe(d => this._team.set(d)); }
  refreshLeads() { this.http.get<Lead[]>(`${this.api}/leads`, { withCredentials: true }).subscribe(d => this._leads.set(d)); }
  refreshProjects() { this.http.get<HubProject[]>(`${this.api}/hub/projects`, { withCredentials: true }).subscribe(d => this._projects.set(d)); }
  private refreshKB() { this.http.get<KBDocument[]>(`${this.api}/kb`, { withCredentials: true }).subscribe(d => this._kbDocs.set(d)); }
  private refreshActivities() { this.http.get<Activity[]>(`${this.api}/activities`, { withCredentials: true }).subscribe(d => this._activities.set(d)); }
  private refreshMessages() { this.http.get<Message[]>(`${this.api}/messages`, { withCredentials: true }).subscribe(d => this._messages.set(d)); }
  private refreshCalendar() { this.http.get<CalendarEvent[]>(`${this.api}/calendar`, { withCredentials: true }).subscribe(d => this._calendarEvents.set(d)); }
  refreshCustomers() { this.http.get<Customer[]>(`${this.api}/customers`, { withCredentials: true }).subscribe(d => this._customers.set(d)); }
  private refreshDemos() { this.http.get<DemoRequest[]>(`${this.api}/demos`, { withCredentials: true }).subscribe(d => this._demoRequests.set(d)); }
  private refreshContent() { this.http.get<ContentPiece[]>(`${this.api}/content`, { withCredentials: true }).subscribe(d => this._content.set(d)); }
  private refreshCampaigns() { this.http.get<EmailCampaign[]>(`${this.api}/campaigns`, { withCredentials: true }).subscribe(d => this._campaigns.set(d)); }

  // --- Lead Methods ---
  addLead(lead: Omit<Lead, 'id'>): Lead {
    const tempId = Math.max(...this._leads().map(l => l.id), 0) + 1;
    const newLead = { ...lead, id: tempId } as Lead;
    this._leads.update(leads => [...leads, newLead]);
    this.http.post<Lead>(`${this.api}/leads`, lead, { withCredentials: true }).subscribe(serverLead => {
      this._leads.update(leads => leads.map(l => l.id === tempId ? serverLead : l));
      this.refreshActivities();
    });
    return newLead;
  }

  addLeadAsync(lead: Omit<Lead, 'id'>): Promise<Lead> {
    return new Promise((resolve, reject) => {
      this.http.post<Lead>(`${this.api}/leads`, lead, { withCredentials: true }).subscribe({
        next: (serverLead) => {
          this._leads.update(leads => [...leads, serverLead]);
          resolve(serverLead);
        },
        error: (err) => reject(err),
      });
    });
  }

  updateLead(id: number, updates: Partial<Lead>) {
    this.http.patch<Lead>(`${this.api}/leads/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._leads.update(leads => leads.map(l => l.id === id ? { ...l, ...updated } : l));
    });
  }

  deleteLead(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.api}/leads/${id}`, { withCredentials: true }).subscribe({
        next: () => {
          this._leads.update(leads => leads.filter(l => l.id !== id));
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  tryAdvanceLead(leadId: number, targetStage: PipelineStage): { success: boolean; error?: string } {
    const lead = this._leads().find(l => l.id === leadId);
    if (!lead) return { success: false, error: 'Lead not found.' };
    this.moveLeadToStage(leadId, targetStage);
    return { success: true };
  }

  updateLeadIntakeStatus(leadId: number, status: 'not_started' | 'in_progress' | 'completed') {
    this.updateLead(leadId, { intakeStatus: status, intakeUpdatedAt: new Date().toISOString() } as any);
  }

  moveLeadToStage(leadId: number, newStage: PipelineStage) {
    this.http.post<Lead>(`${this.api}/leads/${leadId}/move-stage`, { stage: newStage }, { withCredentials: true }).subscribe(() => {
      this.refreshLeads();
      this.refreshActivities();
      this.refreshCustomers();
    });
  }

  getLeadsByStage(stage: PipelineStage) {
    return this._leads().filter(l => l.stage === stage);
  }

  getLeadActivities(leadId: number) {
    return this._activities().filter(a => (a as any).leadId === leadId);
  }

  logContact(leadId: number, type: Activity['type'], detail: string, user: string) {
    this.http.post(`${this.api}/activities`, {
      who: user, action: type === 'email' ? 'sent email to' : type === 'phone' ? 'called' : 'contacted',
      target: this._leads().find(l => l.id === leadId)?.company ?? '',
      detail, type, leadId,
    }, { withCredentials: true }).subscribe(() => {
      this.refreshActivities();
      this.updateLead(leadId, {});
    });
  }

  // --- Hub Project Methods ---
  async addHubProject(payload: Partial<HubProject> & { ownerName?: string }): Promise<HubProject> {
    const created = await firstValueFrom(
      this.http.post<HubProject>(`${this.api}/hub/projects`, payload, { withCredentials: true })
    );
    this._projects.update(list => [created, ...list]);
    this.refreshActivities();
    return created;
  }

  async updateHubProject(id: number, updates: Partial<HubProject>): Promise<HubProject> {
    const updated = await firstValueFrom(
      this.http.patch<HubProject>(`${this.api}/hub/projects/${id}`, updates, { withCredentials: true })
    );
    this._projects.update(list => list.map(p => p.id === id ? { ...p, ...updated } : p));
    this.refreshActivities();
    return updated;
  }

  async deleteHubProject(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/hub/projects/${id}`, { withCredentials: true }));
    this._projects.update(list => list.filter(p => p.id !== id));
    this.refreshActivities();
  }

  async addHubTask(projectId: number, payload: Partial<HubTask>): Promise<HubTask> {
    const created = await firstValueFrom(
      this.http.post<HubTask>(`${this.api}/hub/projects/${projectId}/tasks`, payload, { withCredentials: true })
    );
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: [...p.tasks, { ...created, subtasks: created.subtasks ?? [] }] }
      : p));
    this.refreshActivities();
    return created;
  }

  async updateHubTask(projectId: number, taskId: number, updates: Partial<HubTask>): Promise<HubTask> {
    const updated = await firstValueFrom(
      this.http.patch<HubTask>(`${this.api}/hub/projects/${projectId}/tasks/${taskId}`, updates, { withCredentials: true })
    );
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updated } : t) }
      : p));
    return updated;
  }

  async deleteHubTask(projectId: number, taskId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/hub/projects/${projectId}/tasks/${taskId}`, { withCredentials: true }));
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }
      : p));
  }

  async addHubSubtask(projectId: number, taskId: number, payload: Partial<HubSubtask>): Promise<HubSubtask> {
    const created = await firstValueFrom(
      this.http.post<HubSubtask>(`${this.api}/hub/projects/${projectId}/tasks/${taskId}/subtasks`, payload, { withCredentials: true })
    );
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, subtasks: [...t.subtasks, created] } : t) }
      : p));
    return created;
  }

  async updateHubSubtask(projectId: number, taskId: number, subId: number, updates: Partial<HubSubtask>): Promise<HubSubtask> {
    const updated = await firstValueFrom(
      this.http.patch<HubSubtask>(`${this.api}/hub/projects/${projectId}/tasks/${taskId}/subtasks/${subId}`, updates, { withCredentials: true })
    );
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: p.tasks.map(t => t.id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, ...updated } : s) }
          : t) }
      : p));
    return updated;
  }

  async deleteHubSubtask(projectId: number, taskId: number, subId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/hub/projects/${projectId}/tasks/${taskId}/subtasks/${subId}`, { withCredentials: true }));
    this._projects.update(list => list.map(p => p.id === projectId
      ? { ...p, tasks: p.tasks.map(t => t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subId) }
          : t) }
      : p));
  }

  // --- KB Methods ---
  addKBDoc(doc: Omit<KBDocument, 'id'>) {
    this.http.post<KBDocument>(`${this.api}/kb`, doc, { withCredentials: true }).subscribe(newDoc => {
      this._kbDocs.update(docs => [...docs, newDoc]);
    });
  }

  updateKBDoc(id: number, updates: Partial<KBDocument>) {
    this.http.patch<KBDocument>(`${this.api}/kb/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._kbDocs.update(docs => docs.map(d => d.id === id ? { ...d, ...updated } : d));
    });
  }

  deleteKBDoc(id: number) {
    this.http.delete(`${this.api}/kb/${id}`, { withCredentials: true }).subscribe(() => {
      this._kbDocs.update(docs => docs.filter(d => d.id !== id));
    });
  }

  incrementKBViews(id: number) {
    this._kbDocs.update(docs => docs.map(d => d.id === id ? { ...d, views: (d.views ?? 0) + 1 } : d));
    this.updateKBDoc(id, { views: (this._kbDocs().find(d => d.id === id)?.views ?? 1) } as any);
  }

  toggleKBPin(id: number) {
    const doc = this._kbDocs().find(d => d.id === id);
    if (!doc) return;
    const pinned = !doc.pinned;
    this._kbDocs.update(docs => docs.map(d => d.id === id ? { ...d, pinned } : d));
    this.updateKBDoc(id, { pinned } as any);
  }

  private makeNote(author: string, content: string): Note {
    return { id: Date.now(), author, content, createdAt: new Date().toISOString() };
  }

  addKBDocNote(docId: number, author: string, content: string) {
    const note = this.makeNote(author, content);
    this._kbDocs.update(docs => docs.map(d =>
      d.id === docId ? { ...d, comments: [...(d.comments ?? []), note] } : d
    ));
    this.addActivity({ who: author, action: 'commented on', target: this._kbDocs().find(d => d.id === docId)?.title ?? '', detail: content.slice(0, 80), type: 'general', time: note.createdAt });
  }

  addCampaignNote(campaignId: number, author: string, content: string) {
    const note = this.makeNote(author, content);
    this._campaigns.update(campaigns => campaigns.map(c =>
      c.id === campaignId ? { ...c, comments: [...(c.comments ?? []), note] } : c
    ));
  }

  addIntakeNote(subId: number, author: string, content: string) {
    const note = this.makeNote(author, content);
    this._intakeSubmissions.update(subs => subs.map(s =>
      s.id === subId ? { ...s, comments: [...(s.comments ?? []), note] } : s
    ));
  }

  // --- Activity Methods ---
  addActivity(activity: Omit<Activity, 'id'>) {
    this.http.post(`${this.api}/activities`, activity, { withCredentials: true }).subscribe(() => {
      this.refreshActivities();
    });
  }

  // --- Message Methods ---
  addMessage(message: Omit<Message, 'id'>) {
    this.http.post<Message>(`${this.api}/messages`, message, { withCredentials: true }).subscribe(newMsg => {
      this._messages.update(messages => [...messages, newMsg]);
    });
  }

  getMessagesBetween(user1: string, user2: string) {
    return this._messages().filter(
      m => (m.from === user1 && m.to === user2) || (m.from === user2 && m.to === user1)
    ).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  // --- Team Methods ---
  getTeamMember(name: string) {
    return this._team().find(t => t.name === name);
  }

  updateTeamStatus(name: string, status: TeamMember['status']) {
    // Local update only (no API endpoint for status yet)
    this._team.update(team => team.map(t => t.name === name ? { ...t, status } : t));
  }

  // --- Calendar Methods ---
  addCalendarEvent(event: Omit<CalendarEvent, 'id'>) {
    this.http.post<CalendarEvent>(`${this.api}/calendar`, event, { withCredentials: true }).subscribe(newEvent => {
      this._calendarEvents.update(events => [...events, newEvent]);
    });
  }

  updateCalendarEvent(id: number, updates: Partial<CalendarEvent>) {
    this.http.patch<CalendarEvent>(`${this.api}/calendar/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._calendarEvents.update(events => events.map(e => e.id === id ? { ...e, ...updated } : e));
    });
  }

  deleteCalendarEvent(id: number) {
    this.http.delete(`${this.api}/calendar/${id}`, { withCredentials: true }).subscribe(() => {
      this._calendarEvents.update(events => events.filter(e => e.id !== id));
    });
  }

  getEventsForDate(date: string) {
    return this._calendarEvents().filter(e => e.date === date);
  }

  getEventsForUser(user: string) {
    return this._calendarEvents().filter(e => e.assignee === user);
  }

  getUpcomingReminders(user: string) {
    const today = new Date().toISOString().split('T')[0];
    return this._calendarEvents()
      .filter(e => e.assignee === user && e.date >= today && !e.completed)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- Customer Methods ---
  updateCustomer(id: number, updates: Partial<Customer>) {
    this.http.patch<Customer>(`${this.api}/customers/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._customers.update(customers => customers.map(c => c.id === id ? { ...c, ...updated } : c));
    });
  }

  deleteCustomer(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Capture the customer before we remove it so we can also reset the lead flag locally
      const customer = this._customers().find(c => c.id === id);
      this.http.delete(`${this.api}/customers/${id}`, { withCredentials: true }).subscribe({
        next: () => {
          this._customers.update(customers => customers.filter(c => c.id !== id));
          if (customer) {
            this._leads.update(leads => leads.map(l => l.id === customer.leadId ? { ...l, convertedToCustomer: false } : l));
          }
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  getCustomerByLeadId(leadId: number): Customer | undefined {
    return this._customers().find(c => c.leadId === leadId);
  }

  // --- Demo Request Methods ---
  addDemoRequest(request: Omit<DemoRequest, 'id' | 'status' | 'submittedAt'>) {
    this.http.post<DemoRequest>(`${this.api}/demos`, request, { withCredentials: true }).subscribe(newReq => {
      this._demoRequests.update(requests => [newReq, ...requests]);
      this.refreshActivities();
    });
  }

  updateDemoRequest(id: number, updates: Partial<DemoRequest>) {
    this.http.patch<DemoRequest>(`${this.api}/demos/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._demoRequests.update(requests => requests.map(r => r.id === id ? { ...r, ...updated } : r));
    });
  }

  assignDemoRequest(id: number, assignee: string) {
    this.updateDemoRequest(id, { assignedTo: assignee, status: 'contacted' } as any);
  }

  // --- Content Methods ---
  addContent(content: Omit<ContentPiece, 'id'>) {
    this.http.post<ContentPiece>(`${this.api}/content`, content, { withCredentials: true }).subscribe(newContent => {
      this._content.update(items => [...items, newContent]);
      this.refreshActivities();
    });
  }

  updateContent(id: number, updates: Partial<ContentPiece>) {
    this.http.patch<ContentPiece>(`${this.api}/content/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._content.update(items => items.map(c => c.id === id ? { ...c, ...updated } : c));
    });
  }

  deleteContent(id: number) {
    this.http.delete(`${this.api}/content/${id}`, { withCredentials: true }).subscribe(() => {
      this._content.update(items => items.filter(c => c.id !== id));
    });
  }

  moveContentToStage(id: number, newStage: ContentStage) {
    this.updateContent(id, { stage: newStage });
  }

  getContentByStage(stage: ContentStage) {
    return this._content().filter(c => c.stage === stage);
  }

  // --- Campaign Methods ---
  addCampaign(campaign: Omit<EmailCampaign, 'id'>) {
    this.http.post<EmailCampaign>(`${this.api}/campaigns`, campaign, { withCredentials: true }).subscribe(newCampaign => {
      this._campaigns.update(items => [...items, newCampaign]);
    });
  }

  updateCampaign(id: number, updates: Partial<EmailCampaign>) {
    this.http.patch<EmailCampaign>(`${this.api}/campaigns/${id}`, updates, { withCredentials: true }).subscribe(updated => {
      this._campaigns.update(items => items.map(c => c.id === id ? { ...c, ...updated } : c));
    });
  }

  deleteCampaign(id: number) {
    this.http.delete(`${this.api}/campaigns/${id}`, { withCredentials: true }).subscribe(() => {
      this._campaigns.update(items => items.filter(c => c.id !== id));
    });
  }

  // --- Attachment methods ---

  uploadAttachment(leadId: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.api}/leads/${leadId}/attachments`, formData).subscribe({
        next: (result) => {
          this.refreshLeads();
          this.refreshActivities();
          resolve(result);
        },
        error: (err) => reject(err),
      });
    });
  }

  deleteAttachment(leadId: number, fileId: number): Promise<void> {
    return new Promise((resolve) => {
      this.http.delete(`${this.api}/leads/${leadId}/attachments/${fileId}`).subscribe({
        next: () => {
          this.refreshLeads();
          this.refreshActivities();
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  getAttachments(leadId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.http.get<any[]>(`${this.api}/leads/${leadId}/attachments`).subscribe({
        next: (data) => resolve(data),
        error: () => resolve([]),
      });
    });
  }

  // --- Trade Show Scans ---

  saveTradeShowScan(data: { rawData: string; parsedData?: any; source?: string | null; notes?: string | null }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.api}/trade-show-scans`, data).subscribe({
        next: (result) => resolve(result),
        error: (err) => reject(err),
      });
    });
  }

  // --- Trade Show Scans list ---

  private _tradeShowScans = signal<any[]>([]);
  tradeShowScans = this._tradeShowScans.asReadonly();

  refreshTradeShowScans() {
    this.http.get<any[]>(`${this.api}/trade-show-scans`).subscribe({
      next: (data) => this._tradeShowScans.set(data),
      error: () => this._tradeShowScans.set([]),
    });
  }

  // --- Missing methods used by components ---

  addNote(leadId: number, text: string, user: string) {
    this.addActivity({ who: user, action: 'added note for', target: this._leads().find(l => l.id === leadId)?.company ?? '', detail: text, time: 'Just now', type: 'note', leadId } as any);
  }

  addIntakeSubmission(submission: Omit<IntakeSubmission, 'id'>) {
    this.http.post<IntakeSubmission>(`${this.api}/intake-submissions`, submission, { withCredentials: true }).subscribe(saved => {
      this._intakeSubmissions.update(s => [...s, saved]);
      this.refreshActivities();
    });
  }

  convertDemoToLead(id: number): Lead | null {
    const request = this._demoRequests().find(r => r.id === id);
    if (!request) return null;
    const newLead: any = {
      company: request.companyName || request.fullName,
      contact: request.fullName, title: request.position, stage: 'Discovery',
      value: 36000, modules: ['CAT-I'], certifications: [], facilities: 1,
      owner: request.assignedTo || 'David', priority: 'medium', source: 'Website Demo Request',
      notes: `Demo Focus: ${request.demoFocus}`, industry: request.industry,
      email: request.email, phone: '', expansions: [], probability: 25,
    };
    this.addLead(newLead);
    this.updateDemoRequest(id, { status: 'converted' } as any);
    return newLead;
  }

  createLeadFromInterview(data: any, options?: any): Lead | null {
    const newLead: any = {
      company: data.companyName || '', contact: data.contactName || '', title: '',
      stage: 'New Lead', value: options?.value || 0, modules: options?.modules || [], certifications: [], facilities: 1,
      owner: options?.owner || 'David', priority: options?.priority || 'medium', source: 'MES Intake',
      notes: data.notes || '', industry: data.industry || '', email: data.contactEmail || '', phone: '',
      expansions: [], probability: 5,
    };
    return this.addLead(newLead);
  }

  getLeadSlaStatus(lead: Lead): { status: string; hoursInStage: number; isWarning: boolean; isOverdue: boolean; percent: number } {
    const slaHours: Record<string, number> = {
      'New Lead': 24, 'Qualified': 48, 'Discovery': 72, 'Technical Review': 72,
      'Proposal Sent': 48, 'Module Selection': 48, 'Contract Review': 72,
    };
    const maxHours = slaHours[lead.stage] || 72;
    const entered = (lead as any).stageEnteredAt ? new Date((lead as any).stageEnteredAt).getTime() : lead.lastActivity ? new Date(lead.lastActivity).getTime() : Date.now();
    const hoursInStage = Math.floor((Date.now() - entered) / 3600000);
    const percent = Math.min(Math.round((hoursInStage / maxHours) * 100), 100);
    const isOverdue = hoursInStage > maxHours;
    const isWarning = !isOverdue && percent >= 75;
    const status = isOverdue ? 'overdue' : isWarning ? 'warning' : 'ok';
    return { status, hoursInStage, isWarning, isOverdue, percent };
  }

  isHighPriority(lead: Lead): boolean {
    return lead.priority === 'high';
  }

  setLeadTimer(leadId: number, minutes: number) {
    // Timer is client-side only — no backend needed
    console.log(`Timer set for lead ${leadId}: ${minutes} minutes`);
  }

  sendCampaign(id: number) {
    this.http.post<{ sent: number; failed: number; errors: string[] }>(
      `${this.api}/campaigns/${id}/send`, {}, { withCredentials: true }
    ).subscribe({
      next: (result) => {
        this.refreshCampaigns();
        this.refreshActivities();
        if (result.failed > 0) {
          console.warn(`Campaign send: ${result.sent} sent, ${result.failed} failed`, result.errors);
        }
      },
      error: (err) => {
        console.error('Campaign send failed:', err);
      }
    });
  }

  scheduleDemoFromRequest(id: number, date: string, time: string, assignee: string) {
    this.updateDemoRequest(id, { status: 'scheduled', assignedTo: assignee } as any);
    this.addCalendarEvent({
      title: `Demo: ${this._demoRequests().find(r => r.id === id)?.companyName ?? ''}`,
      date, time, type: 'meeting', assignee,
      description: `Scheduled demo`, relatedTo: { type: 'general', name: 'Demo' },
    } as any);
  }

  declineDemoRequest(id: number, reason?: string) {
    this.updateDemoRequest(id, { status: 'declined', notes: reason } as any);
  }

  receiveWebhook(formData: any) {
    return this.addDemoRequest({
      fullName: formData.fullName || formData.name, email: formData.email,
      position: formData.position || formData.title, companyName: formData.companyName || formData.company,
      businessType: formData.businessType || '', industry: formData.industry || '',
      preferredTime: formData.preferredTime || '', preferredDate: formData.preferredDate || '',
      selectedModules: formData.selectedModules || [], demoFocus: formData.demoFocus || formData.message || '',
    });
  }

  createZohoInvoice(customerId: number, amount: number, description: string) {
    this.http.post(`${this.api}/customers/${customerId}/invoices`, { amount, description }, { withCredentials: true }).subscribe(() => {
      this.refreshCustomers();
      this.refreshActivities();
    });
  }

  markInvoicePaid(customerId: number, invoiceId: string) {
    this.http.post(`${this.api}/customers/${customerId}/invoices/${invoiceId}/pay`, {}, { withCredentials: true }).subscribe(() => {
      this.refreshCustomers();
      this.refreshActivities();
    });
  }

  syncZohoPaymentStatus() {
    // Check for overdue invoices and update billing status
    this.refreshCustomers();
  }

  // --- Utility ---
  calculateDealValue(modules: string[]): number {
    const prices: Record<string, number> = {
      'CAT-I': 36000, 'CAT-MES': 15000, 'CAT-QT': 15000,
      'CAT-SCAN': 15000, 'CAT-ALOG': 15000, 'Full Platform': 72000,
    };
    return modules.reduce((sum, mod) => sum + (prices[mod] || 0), 0);
  }

  // ─── Tickets ────────────────────────────────────────────────────────────────
  refreshTickets() {
    this.http.get<Ticket[]>(`${this.api}/tickets`, { withCredentials: true })
      .subscribe(d => this._tickets.set(d));
  }

  async addTicket(payload: Partial<Ticket>): Promise<Ticket> {
    const created = await firstValueFrom(
      this.http.post<Ticket>(`${this.api}/tickets`, payload, { withCredentials: true })
    );
    this._tickets.update(list => [created, ...list]);
    this.refreshActivities();
    return created;
  }

  async updateTicket(id: number, updates: Partial<Ticket> & { statusMessage?: string; resolutionMessage?: string }): Promise<Ticket> {
    const updated = await firstValueFrom(
      this.http.patch<Ticket>(`${this.api}/tickets/${id}`, updates, { withCredentials: true })
    );
    this._tickets.update(list => list.map(t => t.id === id ? { ...t, ...updated } : t));
    this.refreshActivities();
    return updated;
  }

  async deleteTicket(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/tickets/${id}`, { withCredentials: true }));
    this._tickets.update(list => list.filter(t => t.id !== id));
  }

  async getTicket(id: number): Promise<Ticket> {
    return firstValueFrom(this.http.get<Ticket>(`${this.api}/tickets/${id}`, { withCredentials: true }));
  }

  async addTicketNote(ticketId: number, visibility: 'internal' | 'customer', content: string): Promise<TicketNote> {
    const note = await firstValueFrom(
      this.http.post<TicketNote>(`${this.api}/tickets/${ticketId}/notes`, { visibility, content }, { withCredentials: true })
    );
    return note;
  }

  async escalateTicket(id: number): Promise<Ticket> {
    const updated = await firstValueFrom(
      this.http.post<Ticket>(`${this.api}/tickets/${id}/escalate`, {}, { withCredentials: true })
    );
    this._tickets.update(list => list.map(t => t.id === id ? { ...t, ...updated } : t));
    this.refreshActivities();
    return updated;
  }

  async aiSuggestForTicket(id: number, prompt?: string): Promise<{ suggestion: string; configured: boolean }> {
    return firstValueFrom(
      this.http.post<{ suggestion: string; configured: boolean }>(
        `${this.api}/tickets/${id}/ai-suggest`,
        { prompt },
        { withCredentials: true },
      )
    );
  }

  async aiChat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<{ reply: string; configured: boolean }> {
    return firstValueFrom(
      this.http.post<{ reply: string; configured: boolean }>(
        `${this.api}/support/ai-chat`,
        { messages },
        { withCredentials: true },
      )
    );
  }

  async getTicketingSettings(): Promise<TicketingSettings> {
    return firstValueFrom(
      this.http.get<TicketingSettings>(`${this.api}/ticketing-settings`, { withCredentials: true })
    );
  }

  async updateTicketingSettings(updates: Partial<TicketingSettings>): Promise<TicketingSettings> {
    return firstValueFrom(
      this.http.patch<TicketingSettings>(`${this.api}/ticketing-settings`, updates, { withCredentials: true })
    );
  }

  async rotateCustomerPortalKey(customerId: number): Promise<{ id: number; company: string; portalApiKey: string | null }> {
    return firstValueFrom(
      this.http.post<{ id: number; company: string; portalApiKey: string | null }>(
        `${this.api}/customers/${customerId}/portal-key`,
        {},
        { withCredentials: true },
      )
    );
  }

  async revokeCustomerPortalKey(customerId: number): Promise<{ id: number; company: string; portalApiKey: string | null }> {
    return firstValueFrom(
      this.http.delete<{ id: number; company: string; portalApiKey: string | null }>(
        `${this.api}/customers/${customerId}/portal-key`,
        { withCredentials: true },
      )
    );
  }

  // ─── Meetings ───────────────────────────────────────────────────────────────
  refreshMeetings() {
    this.http.get<Meeting[]>(`${this.api}/meetings`, { withCredentials: true })
      .subscribe(d => this._meetings.set(d));
  }

  async getMeeting(id: number): Promise<Meeting> {
    return firstValueFrom(
      this.http.get<Meeting>(`${this.api}/meetings/${id}`, { withCredentials: true })
    );
  }

  async addMeeting(payload: Partial<Meeting>): Promise<Meeting> {
    const created = await firstValueFrom(
      this.http.post<Meeting>(`${this.api}/meetings`, payload, { withCredentials: true })
    );
    this._meetings.update(list => [created, ...list]);
    this.refreshActivities();
    return created;
  }

  async updateMeeting(id: number, updates: Partial<Meeting>): Promise<Meeting> {
    const updated = await firstValueFrom(
      this.http.patch<Meeting>(`${this.api}/meetings/${id}`, updates, { withCredentials: true })
    );
    this._meetings.update(list => list.map(m => m.id === id ? { ...m, ...updated } : m));
    return updated;
  }

  async deleteMeeting(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/meetings/${id}`, { withCredentials: true }));
    this._meetings.update(list => list.filter(m => m.id !== id));
    this.refreshActivities();
  }

  async endMeeting(id: number, finalUpdates: { transcript?: string; discussion?: string; skipAi?: boolean }): Promise<Meeting & { aiUsed: boolean; aiError: string | null }> {
    const updated = await firstValueFrom(
      this.http.post<Meeting & { aiUsed: boolean; aiError: string | null }>(
        `${this.api}/meetings/${id}/end`, finalUpdates, { withCredentials: true })
    );
    this._meetings.update(list => list.map(m => m.id === id ? { ...m, ...updated } : m));
    this.refreshActivities();
    return updated;
  }

  async regenerateMeetingSummary(id: number): Promise<Meeting> {
    const updated = await firstValueFrom(
      this.http.post<Meeting>(`${this.api}/meetings/${id}/regenerate-summary`, {}, { withCredentials: true })
    );
    this._meetings.update(list => list.map(m => m.id === id ? { ...m, ...updated } : m));
    return updated;
  }

  async importMeeting(payload: {
    title: string; date: string; attendees: string[]; attendeeIds?: number[];
    agenda: string[]; content: string; useAi?: boolean; hostId?: number | null;
  }): Promise<Meeting & { aiUsed: boolean; aiError: string | null }> {
    const created = await firstValueFrom(
      this.http.post<Meeting & { aiUsed: boolean; aiError: string | null }>(
        `${this.api}/meetings/import`, payload, { withCredentials: true })
    );
    this._meetings.update(list => [created, ...list]);
    this.refreshActivities();
    return created;
  }

  async toggleMeetingActionItem(meetingId: number, itemId: number, done: boolean): Promise<MeetingActionItem> {
    return firstValueFrom(
      this.http.patch<MeetingActionItem>(
        `${this.api}/meetings/${meetingId}/action-items/${itemId}`,
        { done }, { withCredentials: true }
      )
    );
  }

  async addMeetingActionItem(meetingId: number, payload: { task: string; owner?: string; dueDate?: string }): Promise<MeetingActionItem> {
    return firstValueFrom(
      this.http.post<MeetingActionItem>(
        `${this.api}/meetings/${meetingId}/action-items`,
        payload, { withCredentials: true }
      )
    );
  }

  async deleteMeetingActionItem(meetingId: number, itemId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.api}/meetings/${meetingId}/action-items/${itemId}`, { withCredentials: true })
    );
  }

  async uploadMeetingFile(meetingId: number, file: File): Promise<MeetingFile> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(
      this.http.post<MeetingFile>(`${this.api}/meetings/${meetingId}/files`, formData, { withCredentials: true })
    );
  }

  async addLinkedMeetingFile(meetingId: number, name: string, url: string): Promise<MeetingFile> {
    return firstValueFrom(
      this.http.post<MeetingFile>(`${this.api}/meetings/${meetingId}/files`, { name, url }, { withCredentials: true })
    );
  }

  async deleteMeetingFile(meetingId: number, fileId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.api}/meetings/${meetingId}/files/${fileId}`, { withCredentials: true })
    );
  }

  // ─── System Diagnostics ────────────────────────────────────────────────────
  async getDiagCatalog(): Promise<DiagCatalog> {
    return firstValueFrom(
      this.http.get<DiagCatalog>(`${this.api}/diagnostics/catalog`, { withCredentials: true })
    );
  }

  async runDiagnostics(scope: string, includeAi = true): Promise<DiagRun> {
    return firstValueFrom(
      this.http.post<DiagRun>(`${this.api}/diagnostics/runs`, { scope, includeAi }, { withCredentials: true })
    );
  }

  async listDiagRuns(limit = 20): Promise<DiagRunSummary[]> {
    return firstValueFrom(
      this.http.get<DiagRunSummary[]>(`${this.api}/diagnostics/runs?limit=${limit}`, { withCredentials: true })
    );
  }

  async getDiagRun(id: number): Promise<DiagRun> {
    return firstValueFrom(
      this.http.get<DiagRun>(`${this.api}/diagnostics/runs/${id}`, { withCredentials: true })
    );
  }

  // ─── Sidebar Layout ────────────────────────────────────────────────────────
  async refreshSidebarLayout(): Promise<SidebarItem[]> {
    const resp = await firstValueFrom(
      this.http.get<{ layout: SidebarItem[]; updatedAt: string }>(`${this.api}/sidebar-config`, { withCredentials: true })
    );
    this._sidebarLayout.set(resp.layout);
    return resp.layout;
  }

  async saveSidebarLayout(layout: SidebarItem[]): Promise<SidebarItem[]> {
    const resp = await firstValueFrom(
      this.http.patch<{ layout: SidebarItem[]; updatedAt: string }>(`${this.api}/sidebar-config`, { layout }, { withCredentials: true })
    );
    this._sidebarLayout.set(resp.layout);
    return resp.layout;
  }

  async resetSidebarLayout(): Promise<SidebarItem[]> {
    const resp = await firstValueFrom(
      this.http.post<{ layout: SidebarItem[]; updatedAt: string }>(`${this.api}/sidebar-config/reset`, {}, { withCredentials: true })
    );
    this._sidebarLayout.set(resp.layout);
    return resp.layout;
  }
}
