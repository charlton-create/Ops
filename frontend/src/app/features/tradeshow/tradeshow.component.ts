import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface TradeShowScan {
  id: number;
  rawData: string;
  parsedData: Record<string, any> | null;
  source: string | null;
  scannedBy: string | null;
  leadId: number | null;
  notes: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-tradeshow',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  template: `
    <app-header
      title="Tradeshow Leads"
      subtitle="QR Code Scans from Trade Shows"
      icon="tradeshow"
      gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
    >
    </app-header>

    <div class="tradeshow-content">
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Scans</span>
            <span class="stat-value">{{ scans().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Today</span>
            <span class="stat-value">{{ todayCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">With Contact Info</span>
            <span class="stat-value">{{ withContactCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Sources</span>
            <span class="stat-value">{{ uniqueSources().length }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="table-card">
        <div class="toolbar-row">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search scans..." [(ngModel)]="searchQuery" (ngModelChange)="currentPage.set(1)">
          </div>
          @if (uniqueSources().length > 1) {
            <select class="filter-select" [(ngModel)]="sourceFilter" (ngModelChange)="currentPage.set(1)">
              <option value="">All Sources</option>
              @for (src of uniqueSources(); track src) {
                <option [value]="src">{{ src }}</option>
              }
            </select>
          }
          <button class="btn-export" (click)="exportCsv()" [disabled]="filteredScans().length === 0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        <!-- Table -->
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name / Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Scanned By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (scan of paginatedScans(); track scan.id) {
                <tr (click)="selectedScan.set(scan)" class="clickable-row" [class.selected]="selectedScan()?.id === scan.id">
                  <td>
                    <div class="cell-primary">{{ getParsedField(scan, 'name') || getParsedField(scan, 'fn') || getParsedField(scan, 'contact') || '—' }}</div>
                    <div class="cell-secondary">{{ getParsedField(scan, 'company') || getParsedField(scan, 'org') || getParsedField(scan, 'organization') || '' }}</div>
                  </td>
                  <td>{{ getParsedField(scan, 'email') || '—' }}</td>
                  <td>{{ getParsedField(scan, 'phone') || getParsedField(scan, 'tel') || '—' }}</td>
                  <td>
                    @if (scan.source) {
                      <span class="badge badge-amber">{{ scan.source }}</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>{{ scan.scannedBy || '—' }}</td>
                  <td>{{ scan.createdAt | date:'MMM d, h:mm a' }}</td>
                  <td>
                    <button class="btn-sm btn-primary" (click)="createLeadFromScan(scan); $event.stopPropagation()" [disabled]="scan.leadId">
                      {{ scan.leadId ? 'Converted' : '+ Lead' }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty-cell">No tradeshow scans yet. Use Scan Card > Scan QR Code from the Leads page.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (filteredScans().length > pageSize) {
          <div class="pagination">
            <button class="btn-sm btn-secondary" (click)="currentPage.set(currentPage() - 1)" [disabled]="currentPage() === 1">&laquo; Prev</button>
            <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <button class="btn-sm btn-secondary" (click)="currentPage.set(currentPage() + 1)" [disabled]="currentPage() === totalPages()">&raquo; Next</button>
          </div>
        }
      </div>
    </div>

    <!-- Detail Slideover -->
    @if (selectedScan()) {
      <div class="modal-overlay" (click)="selectedScan.set(null)">
        <div class="slideover-panel" (click)="$event.stopPropagation()">
          <div class="slideover-header">
            <h3>Scan Details</h3>
            <button class="icon-btn" (click)="selectedScan.set(null)">&times;</button>
          </div>
          <div class="slideover-body">
            @if (selectedScan()!.parsedData) {
              <div class="detail-section">
                <h4>Parsed Fields</h4>
                <div class="field-grid">
                  @for (entry of getEntries(selectedScan()!.parsedData!); track entry.key) {
                    <div class="field-item">
                      <span class="field-label">{{ entry.key }}</span>
                      <span class="field-value">{{ entry.value }}</span>
                    </div>
                  }
                </div>
              </div>
            }
            <div class="detail-section">
              <h4>Raw Data</h4>
              <pre class="raw-data">{{ selectedScan()!.rawData }}</pre>
            </div>
            @if (selectedScan()!.source) {
              <div class="detail-section">
                <h4>Source</h4>
                <p>{{ selectedScan()!.source }}</p>
              </div>
            }
            @if (selectedScan()!.notes) {
              <div class="detail-section">
                <h4>Notes</h4>
                <p>{{ selectedScan()!.notes }}</p>
              </div>
            }
            <div class="detail-section">
              <h4>Metadata</h4>
              <p>Scanned by {{ selectedScan()!.scannedBy || 'Unknown' }} on {{ selectedScan()!.createdAt | date:'MMM d, yyyy h:mm a' }}</p>
            </div>
          </div>
          <div class="slideover-footer">
            <button class="btn-primary" (click)="createLeadFromScan(selectedScan()!); selectedScan.set(null)" [disabled]="selectedScan()!.leadId">
              {{ selectedScan()!.leadId ? 'Already Converted' : 'Create Lead from Scan' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tradeshow-content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card { background: white; border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--border-hairline); }
    .stat-body { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 0.75rem; font-weight: 500; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-gray-900); }

    .table-card { background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-hairline); overflow: hidden; }
    .toolbar-row { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border-hairline); }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); flex: 1; max-width: 320px; color: var(--color-gray-400); }
    .search-box input { border: none; outline: none; font-size: 0.8125rem; width: 100%; background: transparent; color: var(--color-gray-800); }
    .filter-select { padding: 8px 12px; border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); font-size: 0.8125rem; color: var(--color-gray-700); background: white; }

    .table-scroll { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .data-table th { text-align: left; padding: 10px 16px; font-weight: 600; color: var(--color-gray-500); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--color-gray-200); background: var(--color-gray-50); }
    .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-hairline); }
    .clickable-row { cursor: pointer; transition: background var(--transition-fast); }
    .clickable-row:hover { background: var(--color-gray-50); }
    .clickable-row.selected { background: var(--color-primary-light); }

    .cell-primary { font-weight: 500; color: var(--color-gray-800); }
    .cell-secondary { font-size: 0.75rem; color: var(--color-gray-500); margin-top: 2px; }
    .text-muted { color: var(--color-gray-400); }
    .empty-cell { text-align: center; padding: 40px 16px !important; color: var(--color-gray-400); }

    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 500; }
    .badge-amber { background: var(--color-warning-light); color: #92400E; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; border-top: 1px solid var(--border-hairline); }
    .page-info { font-size: 0.8125rem; color: var(--color-gray-500); }

    .modal-overlay { position: fixed; inset: 0; background: var(--color-backdrop); z-index: 100; display: flex; justify-content: flex-end; }
    .slideover-panel { width: 480px; max-width: 90vw; background: white; height: 100%; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
    .slideover-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border-hairline); }
    .slideover-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .slideover-body { flex: 1; overflow-y: auto; padding: 24px; }
    .slideover-footer { padding: 16px 24px; border-top: 1px solid var(--border-hairline); }

    .detail-section { margin-bottom: 20px; }
    .detail-section h4 { margin: 0 0 8px; font-size: 0.75rem; font-weight: 600; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-section p { margin: 0; font-size: 0.875rem; color: var(--color-gray-700); }
    .field-grid { display: flex; flex-direction: column; gap: 8px; }
    .field-item { display: flex; gap: 12px; font-size: 0.8125rem; padding: 8px 12px; background: var(--color-gray-50); border-radius: var(--radius-md); }
    .field-label { font-weight: 600; color: var(--color-gray-600); min-width: 100px; text-transform: capitalize; }
    .field-value { color: var(--color-gray-800); word-break: break-all; }
    .raw-data { background: var(--color-gray-50); padding: 12px; border-radius: var(--radius-md); font-size: 0.75rem; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--color-gray-700); border: 1px solid var(--border-hairline); }

    .btn-sm { padding: 4px 12px; font-size: 0.75rem; border-radius: var(--radius-md); border: none; cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--color-primary); color: white; }
    .btn-primary:hover { background: var(--color-primary-hover); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--color-gray-100); color: var(--color-gray-700); }
    .icon-btn { background: none; border: none; cursor: pointer; font-size: 1.5rem; color: var(--color-gray-500); line-height: 1; }

    .btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-700); background: white; cursor: pointer; margin-left: auto; }
    .btn-export:hover { border-color: var(--color-gray-300); background: var(--color-gray-50); }
    .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 768px) {
      .tradeshow-content { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .slideover-panel { width: 100%; }
    }
  `]
})
export class TradeshowComponent {
  dataService = inject(ApiService);
  authService = inject(AuthService);

  searchQuery = '';
  sourceFilter = '';
  selectedScan = signal<TradeShowScan | null>(null);
  currentPage = signal(1);
  readonly pageSize = 20;

  scans = computed(() => this.dataService.tradeShowScans() as TradeShowScan[]);

  todayCount = computed(() => {
    const today = new Date().toDateString();
    return this.scans().filter(s => new Date(s.createdAt).toDateString() === today).length;
  });

  withContactCount = computed(() =>
    this.scans().filter(s => {
      const p = s.parsedData;
      return p && (p['email'] || p['phone'] || p['tel'] || p['name'] || p['fn']);
    }).length
  );

  uniqueSources = computed(() => {
    const sources = this.scans().map(s => s.source).filter(Boolean) as string[];
    return [...new Set(sources)];
  });

  filteredScans = computed(() => {
    let list = this.scans();
    if (this.sourceFilter) {
      list = list.filter(s => s.source === this.sourceFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s =>
        s.rawData.toLowerCase().includes(q) ||
        (s.source || '').toLowerCase().includes(q) ||
        (s.scannedBy || '').toLowerCase().includes(q) ||
        JSON.stringify(s.parsedData || {}).toLowerCase().includes(q)
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredScans().length / this.pageSize)));

  paginatedScans = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredScans().slice(start, start + this.pageSize);
  });

  getParsedField(scan: TradeShowScan, key: string): string {
    if (!scan.parsedData) return '';
    const val = scan.parsedData[key];
    return typeof val === 'string' ? val : '';
  }

  getEntries(data: Record<string, any>): { key: string; value: string }[] {
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }

  exportCsv() {
    const scans = this.filteredScans();
    if (scans.length === 0) return;

    const headers = ['Name', 'Company', 'Email', 'Phone', 'Source', 'Scanned By', 'Date', 'Notes', 'Raw Data'];
    const rows = scans.map(s => [
      this.getParsedField(s, 'name') || this.getParsedField(s, 'fn') || this.getParsedField(s, 'contact'),
      this.getParsedField(s, 'company') || this.getParsedField(s, 'org') || this.getParsedField(s, 'organization'),
      this.getParsedField(s, 'email'),
      this.getParsedField(s, 'phone') || this.getParsedField(s, 'tel'),
      s.source || '',
      s.scannedBy || '',
      new Date(s.createdAt).toLocaleDateString(),
      s.notes || '',
      s.rawData
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeshow-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  createLeadFromScan(scan: TradeShowScan) {
    if (scan.leadId) return;
    const p = scan.parsedData ?? {};
    const userName = this.authService.user()?.name ?? 'User';
    this.dataService.addLead({
      company: p['company'] || p['org'] || p['organization'] || 'Unknown Company',
      contact: p['name'] || p['fn'] || p['contact'] || 'Unknown Contact',
      title: p['title'] || p['position'] || '',
      stage: 'Discovery',
      value: 36000,
      modules: ['CAT-I'],
      certifications: [],
      facilities: 1,
      owner: userName,
      priority: 'medium',
      lastActivity: 'Just now',
      nextAction: 'Send intro email',
      source: scan.source || 'Trade Show QR Scan',
      notes: scan.notes ? [{ id: 1, author: userName, content: scan.notes, createdAt: new Date().toISOString() }] : [],
      industry: p['industry'] || '',
      email: p['email'] || '',
      phone: p['phone'] || p['tel'] || '',
      expansions: [],
      probability: 10
    });
  }
}
