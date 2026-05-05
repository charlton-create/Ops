import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../layout/header.component';
import { ApiService } from '../../../core/services/api.service';
import { IconComponent } from '../../../shared/icons';
import { Ticket, TICKET_LEVEL_META, TICKET_STATUS_META } from '../../../core/models';

interface CustomerGroup {
  customerId: number | null;
  customerName: string;
  contactEmail: string | null;
  tickets: Ticket[];
  openCount: number;
  l3Count: number;
  lastUpdate: string;
}

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="Customer Portal" subtitle="Tickets submitted by customers via the subscription portal"
      icon="globe" gradient="linear-gradient(135deg, #0D9488 0%, #064E3B 100%)" />

    <div class="content">
      <!-- Summary -->
      <div class="summary-row">
        <div class="summary-card">
          <span class="k">Customers Active</span>
          <span class="v">{{ groups().length }}</span>
        </div>
        <div class="summary-card">
          <span class="k">Portal Tickets Total</span>
          <span class="v">{{ portalTickets().length }}</span>
        </div>
        <div class="summary-card">
          <span class="k">Open</span>
          <span class="v">{{ openPortalCount() }}</span>
        </div>
        <div class="summary-card warn">
          <span class="k">L3 Critical</span>
          <span class="v">{{ l3PortalCount() }}</span>
        </div>
      </div>

      @if (groups().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🌐</div>
          <h3>No portal-submitted tickets yet</h3>
          <p>When a customer submits a ticket from their subscription portal, it will appear here grouped by customer.</p>
          <p class="hint">
            <strong>Endpoint:</strong> <code>POST {{ apiUrl }}/api/portal/tickets</code><br/>
            <strong>Auth header:</strong> <code>X-Customer-Portal-Key: &lt;customer-key&gt;</code><br/>
            Generate keys per-customer in <strong>Admin Settings → Ticketing → Portal API Keys</strong>.
          </p>
        </div>
      }

      @for (g of groups(); track g.customerId || g.customerName) {
        <div class="customer-group">
          <div class="group-head">
            <div class="head-left">
              <div class="company">{{ g.customerName }}</div>
              <div class="contact">{{ g.contactEmail || '—' }}</div>
            </div>
            <div class="head-right">
              <span class="metric"><strong>{{ g.tickets.length }}</strong> total</span>
              <span class="metric open"><strong>{{ g.openCount }}</strong> open</span>
              @if (g.l3Count > 0) {
                <span class="metric l3"><strong>{{ g.l3Count }}</strong> L3</span>
              }
              <span class="metric"><span class="muted">Last:</span> {{ formatDate(g.lastUpdate) }}</span>
            </div>
          </div>
          <div class="ticket-list">
            @for (t of g.tickets; track t.id) {
              <div class="ticket-row" (click)="openTicket(t)">
                <span class="number">{{ t.ticketNumber }}</span>
                <span class="badge"
                      [style.background]="LEVEL_META[t.level].bg"
                      [style.color]="LEVEL_META[t.level].color">
                  L{{ t.level }}
                </span>
                <span class="subject" [title]="t.subject">{{ t.subject }}</span>
                <span class="status-pill"
                      [style.background]="STATUS_META[t.status].bg"
                      [style.color]="STATUS_META[t.status].color">{{ t.status }}</span>
                <span class="hours">{{ hoursAgo(t.createdAt) }}h</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .content { padding: 1.5rem; }

    .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-left: 4px solid #0D9488; border-radius: 10px; padding: 14px 18px; }
    .summary-card.warn { border-left-color: #E11D48; }
    .summary-card .k { font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); letter-spacing: 0.04em; }
    .summary-card .v { display: block; font-size: 28px; font-weight: 800; color: #0D9488; margin-top: 4px; }
    .summary-card.warn .v { color: #E11D48; }

    .empty-state { background: var(--bg-elevated, #fff); border: 1px dashed var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 48px 24px; text-align: center; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-state h3 { font-size: 16px; font-weight: 800; margin-bottom: 6px; }
    .empty-state p { color: var(--text-muted, #6B7280); font-size: 13px; max-width: 540px; margin: 0 auto 8px; }
    .empty-state .hint { background: var(--bg-soft, #F9FAFB); border-radius: 8px; padding: 12px 16px; text-align: left; font-size: 12px; line-height: 1.7; max-width: 540px; margin-top: 12px; }
    .empty-state code { background: var(--bg-elevated, #fff); padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border-hairline, #E5E7EB); }

    .customer-group { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
    .group-head { padding: 14px 18px; background: var(--bg-soft, #F9FAFB); border-bottom: 1px solid var(--border-hairline, #E5E7EB); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .head-left .company { font-weight: 800; font-size: 14px; }
    .head-left .contact { font-size: 11px; color: var(--text-muted, #6B7280); margin-top: 2px; }
    .head-right { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; font-size: 12px; }
    .metric { font-size: 12px; }
    .metric strong { font-size: 14px; }
    .metric.open strong { color: #1A56DB; }
    .metric.l3 strong { color: #E11D48; }
    .metric .muted { color: var(--text-muted, #6B7280); margin-right: 4px; }

    .ticket-list { display: flex; flex-direction: column; }
    .ticket-row { display: grid; grid-template-columns: 80px 80px 1fr 100px 50px; gap: 12px; align-items: center; padding: 8px 18px; border-top: 1px solid var(--border-hairline, #E5E7EB); cursor: pointer; transition: background 0.1s; }
    .ticket-row:first-child { border-top: none; }
    .ticket-row:hover { background: var(--bg-soft, #F9FAFB); }
    .number { font-family: monospace; font-weight: 700; font-size: 11px; color: #1A56DB; }
    .badge { border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; text-align: center; border: 1px solid currentColor; }
    .subject { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-pill { border-radius: 12px; padding: 2px 8px; font-size: 10px; font-weight: 600; text-transform: capitalize; text-align: center; }
    .hours { font-size: 11px; color: var(--text-muted, #6B7280); text-align: right; }
  `]
})
export class CustomerPortalComponent implements OnInit {
  api = inject(ApiService);
  private router = inject(Router);

  readonly LEVEL_META = TICKET_LEVEL_META;
  readonly STATUS_META = TICKET_STATUS_META;
  readonly apiUrl = (window as any).location?.origin || '';

  ngOnInit() {
    this.api.refreshTickets();
  }

  portalTickets = computed<Ticket[]>(() =>
    this.api.tickets().filter(t => t.source === 'portal')
  );

  openPortalCount = computed(() =>
    this.portalTickets().filter(t => t.status !== 'closed' && t.status !== 'resolved').length
  );

  l3PortalCount = computed(() =>
    this.portalTickets().filter(t => t.level === 3 && t.status !== 'closed' && t.status !== 'resolved').length
  );

  groups = computed<CustomerGroup[]>(() => {
    const tickets = this.portalTickets();
    const map = new Map<string, CustomerGroup>();
    for (const t of tickets) {
      const key = t.customerId ? `c-${t.customerId}` : `s-${t.customerCompany}`;
      let g = map.get(key);
      if (!g) {
        g = {
          customerId: t.customerId ?? null,
          customerName: t.customerName || t.customerCompany,
          contactEmail: t.contactEmail ?? null,
          tickets: [],
          openCount: 0,
          l3Count: 0,
          lastUpdate: t.updatedAt,
        };
        map.set(key, g);
      }
      g.tickets.push(t);
      if (t.status !== 'closed' && t.status !== 'resolved') g.openCount++;
      if (t.level === 3 && t.status !== 'closed' && t.status !== 'resolved') g.l3Count++;
      if (new Date(t.updatedAt) > new Date(g.lastUpdate)) g.lastUpdate = t.updatedAt;
    }
    // Sort tickets within each group: open first, then by recency
    for (const g of map.values()) {
      g.tickets.sort((a, b) => {
        const aOpen = a.status !== 'closed' && a.status !== 'resolved' ? 0 : 1;
        const bOpen = b.status !== 'closed' && b.status !== 'resolved' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return b.level - a.level || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    // Sort groups: most open tickets first, then most recent
    return Array.from(map.values()).sort((a, b) => {
      if (a.openCount !== b.openCount) return b.openCount - a.openCount;
      return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
    });
  });

  hoursAgo(iso: string): string {
    return ((Date.now() - new Date(iso).getTime()) / 3600000).toFixed(1);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openTicket(_t: Ticket) {
    // Navigate to Ticketing tab — selection state lives on that component, so for now just route over.
    this.router.navigate(['/support/tickets']);
  }
}
