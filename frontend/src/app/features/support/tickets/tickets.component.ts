import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/icons';
import {
  Ticket, TicketStatus, TicketLevel, TicketNote,
  TICKET_LEVEL_META, TICKET_STATUS_META, TICKET_MODULES, TICKET_CATEGORIES,
} from '../../../core/models';

interface NewTicketForm {
  level: TicketLevel;
  customerCompany: string;
  customerId: number | null;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  module: string;
  category: string;
  subject: string;
  description: string;
  priority: 'normal' | 'technical' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignedToId: number | null;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="Ticketing" subtitle="Support ticket queue" icon="ticket"
      gradient="linear-gradient(135deg, #0D9488 0%, #064E3B 100%)">
      <button class="btn-primary btn-sm" (click)="openNew()"><app-icon name="plus" [size]="14"></app-icon> New Ticket</button>
    </app-header>

    <div class="tickets-content">
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat" [style.--c]="LEVEL_META[1].color">
          <span class="stat-label">L1 Open</span>
          <span class="stat-value">{{ openByLevel(1) }}</span>
          <span class="stat-sub">Training / How-To</span>
        </div>
        <div class="stat" [style.--c]="LEVEL_META[2].color">
          <span class="stat-label">L2 Open</span>
          <span class="stat-value">{{ openByLevel(2) }}</span>
          <span class="stat-sub">Isolated Issues</span>
        </div>
        <div class="stat" [style.--c]="LEVEL_META[3].color">
          <span class="stat-label">L3 Open</span>
          <span class="stat-value">{{ openByLevel(3) }}</span>
          <span class="stat-sub">Critical / Multi-Customer</span>
        </div>
        <div class="stat" [style.--c]="'#1A56DB'">
          <span class="stat-label">Resolved</span>
          <span class="stat-value">{{ resolvedCount() }}</span>
          <span class="stat-sub">All time</span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <select [(ngModel)]="filterLevel">
          <option value="all">All Levels</option>
          <option value="1">L1 · Support</option>
          <option value="2">L2 · Isolated</option>
          <option value="3">L3 · Critical</option>
        </select>
        <select [(ngModel)]="filterStatus">
          <option value="all">All Statuses</option>
          @for (s of STATUSES; track s) { <option [value]="s">{{ s }}</option> }
        </select>
        <select [(ngModel)]="filterSource">
          <option value="all">All Sources</option>
          <option value="internal">Internal</option>
          <option value="portal">Portal</option>
          <option value="email">Email</option>
        </select>
        <input [(ngModel)]="filterQuery" placeholder="Search subject or customer…" />
        <span class="result-count">{{ filteredTickets().length }} ticket{{ filteredTickets().length === 1 ? '' : 's' }}</span>
      </div>

      <div class="layout">
        <!-- Queue list -->
        <div class="queue">
          @if (filteredTickets().length === 0) {
            <div class="empty">No tickets match these filters.</div>
          }
          @for (t of filteredTickets(); track t.id) {
            <div class="card" [class.active]="selectedId() === t.id"
                 [style.--c]="LEVEL_META[t.level].color" (click)="select(t.id)">
              <div class="row">
                <span class="number">{{ t.ticketNumber }}</span>
                <span class="badge" [style.background]="LEVEL_META[t.level].bg" [style.color]="LEVEL_META[t.level].color">
                  {{ LEVEL_META[t.level].label }}
                </span>
              </div>
              <div class="subject">{{ t.subject }}</div>
              <div class="row meta">
                <span>{{ t.customerName || t.customerCompany }}</span>
                <span class="status-pill"
                      [style.background]="STATUS_META[t.status].bg"
                      [style.color]="STATUS_META[t.status].color">{{ t.status }}</span>
              </div>
              <div class="row meta-sub">
                <span>{{ moduleShort(t.module) }} · {{ t.category }}</span>
                <span>{{ hoursAgo(t.createdAt) }}h</span>
              </div>
            </div>
          }
        </div>

        <!-- Detail panel -->
        <div class="detail">
          @if (!selected()) {
            <div class="empty-detail">Select a ticket to view details</div>
          } @else {
            <ng-container *ngIf="selected() as t">
              <div class="detail-head">
                <div class="head-top">
                  <span class="number">{{ t.ticketNumber }}</span>
                  <span class="badge" [style.background]="LEVEL_META[t.level].bg" [style.color]="LEVEL_META[t.level].color">
                    {{ LEVEL_META[t.level].label }}
                  </span>
                  <span class="status-pill"
                        [style.background]="STATUS_META[t.status].bg"
                        [style.color]="STATUS_META[t.status].color">{{ t.status }}</span>
                </div>
                <div class="subject">{{ t.subject }}</div>
                <div class="actions">
                  @if (t.status !== 'resolved' && t.status !== 'closed') {
                    @if (t.status === 'open') {
                      <button class="btn-ghost btn-sm" (click)="setStatus(t, 'in-progress')">→ In Progress</button>
                    }
                    <button class="btn-success btn-sm" (click)="setStatus(t, 'resolved')">✓ Resolve</button>
                  }
                  @if (t.status === 'resolved') {
                    <button class="btn-ghost btn-sm" (click)="setStatus(t, 'closed')">Close</button>
                  }
                  @if (t.level < 3 && t.status !== 'closed' && t.status !== 'resolved') {
                    <button class="btn-warning btn-sm" (click)="escalate(t)">↑ Escalate L{{ t.level + 1 }}</button>
                  }
                  <button class="btn-danger btn-sm" (click)="deleteTicket(t)" title="Delete ticket">
                    <app-icon name="trash" [size]="12"></app-icon>
                  </button>
                </div>
              </div>

              <div class="detail-body">
                <div class="info-grid">
                  <div><span class="k">Customer</span><span class="v">{{ t.customerName || t.customerCompany }}</span></div>
                  <div><span class="k">Source</span><span class="v">{{ t.source }}</span></div>
                  <div><span class="k">Contact</span><span class="v">{{ t.contactName || '—' }}</span></div>
                  <div><span class="k">Email</span><span class="v">{{ t.contactEmail || '—' }}</span></div>
                  <div><span class="k">Module</span><span class="v">{{ t.module }}</span></div>
                  <div><span class="k">Category</span><span class="v">{{ t.category }}</span></div>
                  <div><span class="k">Assignee</span><span class="v">{{ t.assignee || '—' }}</span></div>
                  <div><span class="k">SLA</span><span class="v">{{ LEVEL_META[t.level].slaHours }}h</span></div>
                  <div><span class="k">Open Duration</span><span class="v">{{ hoursAgo(t.createdAt) }}h</span></div>
                  <div><span class="k">Severity</span><span class="v">{{ t.severity }}</span></div>
                </div>

                <div class="section">
                  <div class="section-label">Description</div>
                  <div class="description">{{ t.description }}</div>
                </div>

                <!-- Notes tabs -->
                <div class="section">
                  <div class="notes-tabs">
                    <button [class.active]="notesTab() === 'internal'" (click)="notesTab.set('internal')">
                      🔒 Internal ({{ internalNotes().length }})
                    </button>
                    <button [class.active]="notesTab() === 'customer'" (click)="notesTab.set('customer')">
                      👤 Customer ({{ customerNotes().length }})
                    </button>
                  </div>

                  @if (notesTab() === 'internal') {
                    @if (internalNotes().length === 0) {
                      <div class="empty-notes">No internal notes. Visible only to support staff.</div>
                    }
                    @for (n of internalNotes(); track n.id) {
                      <div class="note internal">
                        <div class="note-head"><span>🔒 {{ n.author }}</span><span class="ts">{{ formatDate(n.createdAt) }}</span></div>
                        <div class="note-body">{{ n.content }}</div>
                      </div>
                    }
                  }
                  @if (notesTab() === 'customer') {
                    @if (customerNotes().length === 0) {
                      <div class="empty-notes">No customer-facing notes. These notify the customer via email.</div>
                    }
                    @for (n of customerNotes(); track n.id) {
                      <div class="note customer">
                        <div class="note-head"><span>👤 {{ n.author }}</span><span class="ts">{{ formatDate(n.createdAt) }} {{ n.emailSent ? '· emailed' : '' }}</span></div>
                        <div class="note-body">{{ n.content }}</div>
                      </div>
                    }
                  }

                  <div class="note-input">
                    <select [(ngModel)]="noteVisibility">
                      <option value="internal">🔒 Internal</option>
                      <option value="customer">👤 Customer</option>
                    </select>
                    <textarea [(ngModel)]="noteText" rows="2"
                      [placeholder]="noteVisibility === 'internal' ? 'Internal note (not visible to customer)…' : 'Customer-facing note (sent via email)…'"></textarea>
                    <button class="btn-primary btn-sm" [disabled]="!noteText.trim() || addingNote()" (click)="addNote(t)">
                      {{ addingNote() ? 'Adding…' : 'Add Note' }}
                    </button>
                  </div>
                </div>
              </div>
            </ng-container>
          }
        </div>

        <!-- AI side panel -->
        <div class="ai-panel">
          <div class="ai-head">
            <span class="ai-title">✨ AI Assist</span>
            <span class="ai-sub">Drafts a reply for this ticket</span>
          </div>
          @if (!selected()) {
            <div class="ai-placeholder">Open a ticket to get AI suggestions.</div>
          } @else {
            <div class="ai-prompt">
              <textarea [(ngModel)]="aiPrompt" rows="3" placeholder="Optional: ask a specific question (e.g. 'How do I explain the HACCP report?'). Leave blank for an initial reply draft."></textarea>
              <button class="btn-primary btn-sm" [disabled]="aiLoading()" (click)="getSuggestion()">
                {{ aiLoading() ? 'Thinking…' : 'Get AI Suggestion' }}
              </button>
            </div>
            @if (aiSuggestion()) {
              <div class="ai-result">
                <div class="ai-result-head">
                  <span>Suggested reply</span>
                  <button class="btn-ghost btn-xs" (click)="copyToCustomerNote()">→ Use as Customer Note</button>
                </div>
                <div class="ai-text">{{ aiSuggestion() }}</div>
              </div>
            }
            @if (aiNotConfigured()) {
              <div class="ai-warning">AI is not configured. Set <code>ANTHROPIC_API_KEY</code> on the backend to enable suggestions.</div>
            }
          }
        </div>
      </div>
    </div>

    <!-- New Ticket Modal -->
    @if (showNew()) {
      <div class="modal-overlay" (click)="closeNew($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>New Ticket</h3>
            <button class="close-btn" (click)="closeNew()"><app-icon name="close" [size]="18"></app-icon></button>
          </div>
          <div class="modal-body">
            <div class="level-pick">
              @for (l of LEVELS; track l) {
                <div class="level-card" [class.active]="newForm.level === l"
                     [style.--c]="LEVEL_META[l].color"
                     (click)="setNewLevel(l)">
                  <div class="level-name">{{ LEVEL_META[l].label }}</div>
                  <div class="level-sla">{{ LEVEL_META[l].slaHours }}h SLA</div>
                </div>
              }
            </div>

            <div class="form-grid">
              <label>Customer Company *
                <input [(ngModel)]="newForm.customerCompany" placeholder="Company name" required />
              </label>
              <label>Customer (existing)
                <select [(ngModel)]="newForm.customerId" (ngModelChange)="onCustomerSelect($event)">
                  <option [ngValue]="null">— None / Freeform —</option>
                  @for (c of api.customers(); track c.id) {
                    <option [ngValue]="c.id">{{ c.company }}</option>
                  }
                </select>
              </label>
              <label>Contact Name<input [(ngModel)]="newForm.contactName" placeholder="Full name" /></label>
              <label>Job Title<input [(ngModel)]="newForm.contactTitle" placeholder="e.g. QA Manager" /></label>
              <label>Email<input [(ngModel)]="newForm.contactEmail" placeholder="contact@company.com" /></label>
              <label>Phone<input [(ngModel)]="newForm.contactPhone" placeholder="(xxx) xxx-xxxx" /></label>
              <label>Module *
                <select [(ngModel)]="newForm.module">
                  <option value="">Select…</option>
                  @for (m of MODULES; track m) { <option [value]="m">{{ m }}</option> }
                </select>
              </label>
              <label>Category *
                <select [(ngModel)]="newForm.category">
                  <option value="">Select…</option>
                  @for (c of CATEGORIES[newForm.level]; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </label>
              <label>Assignee
                <select [(ngModel)]="newForm.assignedToId">
                  <option [ngValue]="null">— Queue: {{ LEVEL_META[newForm.level].defaultQueue }} —</option>
                  @for (m of api.team(); track m.id) {
                    <option [ngValue]="m.id">{{ m.name }} ({{ m.role }})</option>
                  }
                </select>
              </label>
              <label>Severity
                <select [(ngModel)]="newForm.severity">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label class="span-2">Subject *<input [(ngModel)]="newForm.subject" placeholder="Brief summary" /></label>
              <label class="span-2">Description *
                <textarea [(ngModel)]="newForm.description" rows="5" placeholder="Describe the issue in detail."></textarea>
              </label>
            </div>

            @if (newError()) { <div class="error">{{ newError() }}</div> }

            <div class="modal-actions">
              <button class="btn-ghost" (click)="closeNew()">Cancel</button>
              <button class="btn-primary" [disabled]="creating()" (click)="submitNew()">
                {{ creating() ? 'Creating…' : 'Submit Ticket' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tickets-content { padding: 1.5rem; max-width: 100%; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .stat { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-left: 4px solid var(--c, #1A56DB); border-radius: 10px; padding: 14px 18px; }
    .stat-label { font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); letter-spacing: 0.04em; }
    .stat-value { display: block; font-size: 28px; font-weight: 800; color: var(--c, #1A56DB); margin-top: 4px; }
    .stat-sub { font-size: 11px; color: var(--text-muted, #6B7280); }

    .filter-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-bar select, .filter-bar input { padding: 6px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; font-size: 12px; background: var(--bg-elevated, #fff); }
    .filter-bar input { min-width: 220px; }
    .result-count { font-size: 12px; color: var(--text-muted, #6B7280); margin-left: auto; }

    .layout { display: grid; grid-template-columns: 320px 1fr 300px; gap: 14px; height: calc(100vh - 290px); }
    @media (max-width: 1280px) { .layout { grid-template-columns: 280px 1fr; } .ai-panel { display: none; } }

    .queue { overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
    .empty, .empty-detail { color: var(--text-muted, #6B7280); font-size: 13px; padding: 24px; text-align: center; }

    .card { background: var(--bg-elevated, #fff); border: 1.5px solid var(--border-hairline, #E5E7EB); border-left: 4px solid var(--c, #6B7280); border-radius: 8px; padding: 12px 14px; cursor: pointer; transition: background 0.1s; }
    .card:hover { background: var(--bg-soft, #F9FAFB); }
    .card.active { background: var(--bg-soft, #EFF6FF); border-color: #1A56DB; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
    .row.meta { font-size: 11px; color: var(--text-muted, #6B7280); }
    .row.meta-sub { font-size: 10px; color: var(--text-muted, #6B7280); margin-bottom: 0; }
    .number { font-family: monospace; font-weight: 700; font-size: 11px; color: #1A56DB; }
    .subject { font-size: 13px; font-weight: 600; line-height: 1.35; margin-bottom: 6px; }
    .badge { border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; white-space: nowrap; border: 1px solid currentColor; }
    .status-pill { border-radius: 12px; padding: 2px 8px; font-size: 10px; font-weight: 600; text-transform: capitalize; }

    .detail { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
    .detail-head { padding: 14px 18px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); }
    .head-top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .detail-body { flex: 1; overflow-y: auto; padding: 18px; }

    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 18px; }
    .info-grid > div { background: var(--bg-soft, #F9FAFB); border-radius: 6px; padding: 6px 10px; }
    .info-grid .k { display: block; font-size: 10px; font-weight: 700; color: var(--text-muted, #6B7280); letter-spacing: 0.04em; margin-bottom: 2px; }
    .info-grid .v { font-size: 12px; font-weight: 600; }

    .section { margin-bottom: 18px; }
    .section-label { font-weight: 700; font-size: 12px; margin-bottom: 6px; }
    .description { font-size: 13px; line-height: 1.6; background: var(--bg-soft, #F9FAFB); border-radius: 6px; padding: 12px; white-space: pre-wrap; }

    .notes-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-hairline, #E5E7EB); margin-bottom: 12px; }
    .notes-tabs button { padding: 8px 16px; font-size: 12px; font-weight: 500; color: var(--text-muted, #6B7280); border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; }
    .notes-tabs button.active { color: #1A56DB; font-weight: 700; border-bottom-color: #1A56DB; }
    .empty-notes { color: var(--text-muted, #6B7280); font-size: 12px; font-style: italic; padding: 8px 0; }
    .note { border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
    .note.internal { background: #FFF7ED; border: 1px solid #FDBA74; }
    .note.customer { background: #EFF6FF; border: 1px solid #93C5FD; }
    .note-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 3px; }
    .note.internal .note-head { color: #92400E; }
    .note.customer .note-head { color: #1A56DB; }
    .note .ts { color: var(--text-muted, #6B7280); font-weight: 400; }
    .note-body { font-size: 12px; white-space: pre-wrap; }

    .note-input { display: flex; gap: 6px; margin-top: 10px; align-items: flex-start; }
    .note-input select { padding: 6px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; font-size: 11px; background: var(--bg-elevated, #fff); }
    .note-input textarea { flex: 1; padding: 6px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; font-size: 12px; font-family: inherit; resize: vertical; }

    .ai-panel { background: linear-gradient(170deg, #F5F3FF 0%, #EFF6FF 100%); border: 1px solid #C4B5FD; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    :host-context([data-theme="dark"]) .ai-panel { background: linear-gradient(170deg, #1F1B2E 0%, #1E293B 100%); border-color: #6D28D9; }
    .ai-head { border-bottom: 1px solid rgba(124, 58, 237, 0.2); padding-bottom: 8px; }
    .ai-title { font-weight: 800; color: #6D28D9; font-size: 14px; }
    .ai-sub { display: block; font-size: 11px; color: var(--text-muted, #6B7280); margin-top: 2px; }
    .ai-placeholder { color: var(--text-muted, #6B7280); font-size: 12px; font-style: italic; }
    .ai-prompt textarea { width: 100%; padding: 8px; border: 1px solid #C4B5FD; border-radius: 6px; font-size: 12px; font-family: inherit; resize: vertical; box-sizing: border-box; margin-bottom: 6px; }
    .ai-result { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; padding: 10px; }
    .ai-result-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; margin-bottom: 6px; color: #6D28D9; }
    .ai-text { font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
    .ai-warning { font-size: 11px; color: #92400E; background: #FEF3C7; padding: 8px 10px; border-radius: 6px; }
    .ai-warning code { background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; font-size: 10px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: var(--bg-elevated, #fff); border-radius: 12px; max-width: 720px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); }
    .modal-head h3 { font-size: 16px; font-weight: 800; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted, #6B7280); padding: 4px; }
    .modal-body { padding: 20px; overflow-y: auto; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

    .level-pick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
    .level-card { padding: 12px; border: 2px solid var(--border-hairline, #E5E7EB); border-radius: 10px; cursor: pointer; text-align: center; }
    .level-card.active { border-color: var(--c); background: color-mix(in srgb, var(--c) 8%, transparent); }
    .level-icon { font-size: 22px; margin-bottom: 6px; }
    .level-name { font-weight: 700; font-size: 12px; color: var(--c); }
    .level-sla { font-size: 10px; color: var(--text-muted, #6B7280); margin-top: 2px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-grid label { display: flex; flex-direction: column; font-size: 11px; font-weight: 600; gap: 4px; }
    .form-grid label.span-2 { grid-column: span 2; }
    .form-grid input, .form-grid select, .form-grid textarea {
      padding: 7px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px;
      font-size: 12px; font-family: inherit; background: var(--bg-elevated, #fff);
    }
    .form-grid textarea { resize: vertical; }

    .error { color: #E11D48; font-size: 12px; margin-top: 8px; padding: 8px 12px; background: #FEE2E2; border-radius: 6px; }

    .btn-primary, .btn-success, .btn-warning, .btn-danger, .btn-ghost {
      padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 5px;
    }
    .btn-primary { background: #1A56DB; color: white; }
    .btn-success { background: #10B981; color: white; }
    .btn-warning { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
    .btn-danger { background: #E11D48; color: white; }
    .btn-ghost { background: var(--bg-soft, #F9FAFB); color: var(--text, #111827); border: 1px solid var(--border-hairline, #E5E7EB); }
    .btn-sm { padding: 5px 10px; font-size: 11px; }
    .btn-xs { padding: 3px 8px; font-size: 10px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class TicketsComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  readonly LEVEL_META = TICKET_LEVEL_META;
  readonly STATUS_META = TICKET_STATUS_META;
  readonly MODULES = TICKET_MODULES;
  readonly CATEGORIES = TICKET_CATEGORIES;
  readonly LEVELS: TicketLevel[] = [1, 2, 3];
  readonly STATUSES: TicketStatus[] = ['open', 'in-progress', 'resolved', 'escalated', 'closed'];

  filterLevel: 'all' | string = 'all';
  filterStatus: 'all' | string = 'all';
  filterSource: 'all' | string = 'all';
  filterQuery = '';

  selectedId = signal<number | null>(null);
  notesTab = signal<'internal' | 'customer'>('internal');
  noteText = '';
  noteVisibility: 'internal' | 'customer' = 'internal';
  addingNote = signal(false);

  showNew = signal(false);
  creating = signal(false);
  newError = signal('');
  newForm: NewTicketForm = this.makeEmptyForm();

  aiPrompt = '';
  aiSuggestion = signal('');
  aiLoading = signal(false);
  aiNotConfigured = signal(false);

  ngOnInit() {
    this.api.refreshTickets();
    this.api.loadAll();
  }

  makeEmptyForm(): NewTicketForm {
    return {
      level: 1, customerCompany: '', customerId: null,
      contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
      module: '', category: '', subject: '', description: '',
      priority: 'normal', severity: 'medium', assignedToId: null,
    };
  }

  filteredTickets = computed(() => {
    const tickets = this.api.tickets();
    const q = this.filterQuery.toLowerCase().trim();
    return tickets.filter(t => {
      if (this.filterLevel !== 'all' && String(t.level) !== this.filterLevel) return false;
      if (this.filterStatus !== 'all' && t.status !== this.filterStatus) return false;
      if (this.filterSource !== 'all' && t.source !== this.filterSource) return false;
      if (q) {
        const blob = `${t.subject} ${t.customerName} ${t.customerCompany} ${t.ticketNumber}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  });

  selected = computed<Ticket | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.api.tickets().find(t => t.id === id) ?? null;
  });

  internalNotes = computed<TicketNote[]>(() => (this.selected()?.notes ?? []).filter(n => n.visibility === 'internal'));
  customerNotes = computed<TicketNote[]>(() => (this.selected()?.notes ?? []).filter(n => n.visibility === 'customer'));

  openByLevel(level: number): number {
    return this.api.tickets().filter(t => t.level === level && t.status !== 'closed' && t.status !== 'resolved').length;
  }
  resolvedCount = computed(() => this.api.tickets().filter(t => t.status === 'resolved' || t.status === 'closed').length);

  hoursAgo(iso: string): string {
    return ((Date.now() - new Date(iso).getTime()) / 3600000).toFixed(1);
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  moduleShort(m: string): string {
    return m.replace('CAT-', '').replace('Full Platform', 'All');
  }

  async select(id: number) {
    this.selectedId.set(id);
    this.aiSuggestion.set('');
    this.aiNotConfigured.set(false);
    this.aiPrompt = '';
    // Lazy-load full ticket with notes
    const full = await this.api.getTicket(id);
    this.api['_tickets'].update((list: Ticket[]) => list.map(t => t.id === id ? { ...t, ...full } : t));
  }

  async setStatus(t: Ticket, status: TicketStatus) {
    await this.api.updateTicket(t.id, { status });
    if (status === 'resolved' || status === 'closed') {
      // refresh selected to pick up changes
      const full = await this.api.getTicket(t.id);
      this.api['_tickets'].update((list: Ticket[]) => list.map(x => x.id === t.id ? { ...x, ...full } : x));
    }
  }

  async escalate(t: Ticket) {
    if (!confirm(`Escalate ${t.ticketNumber} to L${t.level + 1}?`)) return;
    await this.api.escalateTicket(t.id);
  }

  async deleteTicket(t: Ticket) {
    if (!confirm(`Delete ${t.ticketNumber}? This cannot be undone.`)) return;
    await this.api.deleteTicket(t.id);
    if (this.selectedId() === t.id) this.selectedId.set(null);
  }

  async addNote(t: Ticket) {
    if (!this.noteText.trim()) return;
    this.addingNote.set(true);
    try {
      await this.api.addTicketNote(t.id, this.noteVisibility, this.noteText.trim());
      this.noteText = '';
      const full = await this.api.getTicket(t.id);
      this.api['_tickets'].update((list: Ticket[]) => list.map(x => x.id === t.id ? { ...x, ...full } : x));
    } finally {
      this.addingNote.set(false);
    }
  }

  async getSuggestion() {
    const t = this.selected();
    if (!t) return;
    this.aiLoading.set(true);
    this.aiNotConfigured.set(false);
    try {
      const result = await this.api.aiSuggestForTicket(t.id, this.aiPrompt || undefined);
      if (!result.configured) {
        this.aiNotConfigured.set(true);
        this.aiSuggestion.set('');
      } else {
        this.aiSuggestion.set(result.suggestion);
      }
    } catch (err: any) {
      this.aiSuggestion.set(`Error: ${err?.message || 'AI request failed.'}`);
    } finally {
      this.aiLoading.set(false);
    }
  }

  copyToCustomerNote() {
    if (!this.aiSuggestion()) return;
    this.noteVisibility = 'customer';
    this.noteText = this.aiSuggestion();
    this.notesTab.set('customer');
  }

  // ─── New Ticket Modal ─────────────────────────────────────────────────────
  openNew() {
    this.newForm = this.makeEmptyForm();
    this.newError.set('');
    this.showNew.set(true);
  }

  closeNew(ev?: any) {
    if (ev && ev.target !== ev.currentTarget) return;
    this.showNew.set(false);
  }

  setNewLevel(level: TicketLevel) {
    this.newForm.level = level;
    this.newForm.category = '';
  }

  onCustomerSelect(customerId: number | null) {
    if (!customerId) return;
    const c = this.api.customers().find(x => x.id === customerId);
    if (c) {
      this.newForm.customerCompany = c.company;
      this.newForm.contactName = (c as any).contact || this.newForm.contactName;
      this.newForm.contactEmail = (c as any).email || this.newForm.contactEmail;
      this.newForm.contactPhone = (c as any).phone || this.newForm.contactPhone;
    }
  }

  async submitNew() {
    const f = this.newForm;
    if (!f.customerCompany.trim()) { this.newError.set('Customer company required.'); return; }
    if (!f.module) { this.newError.set('Module required.'); return; }
    if (!f.category) { this.newError.set('Category required.'); return; }
    if (!f.subject.trim()) { this.newError.set('Subject required.'); return; }
    if (!f.description.trim()) { this.newError.set('Description required.'); return; }

    this.creating.set(true);
    this.newError.set('');
    try {
      const created = await this.api.addTicket({
        level: f.level,
        module: f.module,
        category: f.category,
        subject: f.subject.trim(),
        description: f.description.trim(),
        customerId: f.customerId,
        customerCompany: f.customerCompany.trim(),
        contactName: f.contactName.trim() || null,
        contactTitle: f.contactTitle.trim() || null,
        contactEmail: f.contactEmail.trim() || null,
        contactPhone: f.contactPhone.trim() || null,
        assignedToId: f.assignedToId,
        priority: f.priority,
        severity: f.severity,
        source: 'internal',
      });
      this.showNew.set(false);
      this.selectedId.set(created.id);
    } catch (err: any) {
      this.newError.set(err?.error?.error || err?.message || 'Failed to create ticket.');
    } finally {
      this.creating.set(false);
    }
  }
}
