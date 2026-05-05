import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { IntakeSubmission } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { TeamUtilService } from '../../shared/utils/team.service';
import { MesIntakeStateService } from '../../core/services/mes-intake-state.service';

@Component({
  selector: 'app-intake-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header
      title="Customer Intake"
      subtitle="Intake Submission Registry"
      icon="intake"
      gradient="linear-gradient(135deg, #34A125 0%, #166534 100%)"
    >
      <button class="btn-primary btn-sm" (click)="router.navigate(['/intake/customer/new'])">
        <app-icon name="plus" [size]="14"></app-icon>
        New Intake
      </button>
    </app-header>

    <div class="registry-content">

      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Submissions</span>
            <span class="stat-value">{{ dataService.intakeSubmissions().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Submitted</span>
            <span class="stat-value">{{ countByStatus('submitted') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Reviewed</span>
            <span class="stat-value">{{ countByStatus('reviewed') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Drafts</span>
            <span class="stat-value">{{ countByStatus('draft') }}</span>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="table-card">

        <!-- Search bar -->
        <div class="table-toolbar">
          <div class="search-wrap">
            <app-icon name="search" [size]="15"></app-icon>
            <input class="search-input" type="text" placeholder="Search company, contact, or industry..." [(ngModel)]="searchQuery" (ngModelChange)="search$.set($event)">
          </div>
          <div class="filter-group">
            <select class="form-select form-select-sm" [(ngModel)]="statusFilter" (ngModelChange)="statusFilter$.set($event)">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 20%">Company</th>
                <th style="width: 10%">Industry</th>
                <th style="width: 16%">Contact</th>
                <th style="width: 9%">Status</th>
                <th style="width: 18%">Modules</th>
                <th style="width: 8%">Interviewer</th>
                <th style="width: 11%">Submitted</th>
                <th style="width: 8%">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of filteredSubmissions(); track sub.id) {
                <tr (click)="openSubmission(sub)" style="cursor: pointer;">
                  <td>
                    <div class="entity-cell">
                      <div class="entity-avatar" [style.background]="getAvatarColor(sub.companyName)">
                        {{ sub.companyName.charAt(0) }}
                      </div>
                      <div class="entity-info">
                        <span class="entity-name">{{ sub.companyName }}</span>
                        <span class="entity-sub">{{ sub.facilities }} facilit{{ sub.facilities === 1 ? 'y' : 'ies' }} · {{ sub.employees || '—' }} employees</span>
                      </div>
                    </div>
                  </td>
                  <td class="text-sm text-muted">{{ sub.industry }}</td>
                  <td>
                    <div class="contact-cell">
                      <span class="contact-name">{{ sub.contactName }}</span>
                      @if (sub.contactTitle) {
                        <span class="contact-title">{{ sub.contactTitle }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [class]="'status-' + sub.status">
                      {{ sub.status === 'submitted' ? 'Submitted' : sub.status === 'reviewed' ? 'Reviewed' : 'Draft' }}
                    </span>
                  </td>
                  <td>
                    <div class="module-chips">
                      @for (mod of sub.modulesOfInterest.slice(0, 2); track mod) {
                        <span class="badge badge-blue">{{ mod }}</span>
                      }
                      @if (sub.modulesOfInterest.length > 2) {
                        <span class="badge badge-gray">+{{ sub.modulesOfInterest.length - 2 }}</span>
                      }
                    </div>
                  </td>
                  <td class="text-sm">{{ sub.interviewedBy }}</td>
                  <td class="text-sm text-muted">{{ sub.submittedAt | date:'MMM d, y' }}</td>
                  <td>
                    <div class="action-icons" (click)="$event.stopPropagation()">
                      <button class="action-btn" title="View / Review" (click)="openSubmission(sub)">
                        <app-icon name="eye" [size]="14"></app-icon>
                      </button>
                      <button class="action-btn" title="Export" (click)="triggerExport(sub)">
                        <app-icon name="download" [size]="14"></app-icon>
                      </button>
                      <button class="action-btn" title="Open in MES Intake" (click)="openInMesIntake(sub)">
                        <app-icon name="factory" [size]="14"></app-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <p>No intake submissions found</p>
                      <span>Start a new intake form to capture prospective customer information</span>
                      <button class="btn-primary btn-sm" style="margin-top:12px;" (click)="router.navigate(['/intake/customer/new'])">
                        Start New Intake
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Detail Side Panel -->
    @if (selectedSubmission()) {
      <div class="slideover-overlay" (click)="selectedSubmission.set(null)"></div>
      <div class="slideover-panel slideover-wide">

        <div class="slideover-header">
          <div class="slideover-title-row">
            <div class="slideover-avatar" [style.background]="getAvatarColor(selectedSubmission()!.companyName)">
              {{ selectedSubmission()!.companyName.charAt(0) }}
            </div>
            <div class="slideover-title-info">
              <h2>{{ selectedSubmission()!.companyName }}</h2>
              <span class="slideover-subtitle">{{ selectedSubmission()!.industry }} · Submitted {{ selectedSubmission()!.submittedAt | date:'MMM d, y' }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn-secondary btn-sm" (click)="triggerExport(selectedSubmission()!)">
              <app-icon name="download" [size]="13"></app-icon>
              Export
            </button>
            <button class="modal-close-btn" (click)="selectedSubmission.set(null)">&times;</button>
          </div>
        </div>

        <div class="panel-status-bar">
          <span class="status-badge" [class]="'status-' + selectedSubmission()!.status" style="font-size: 0.8125rem; padding: 4px 12px;">
            {{ selectedSubmission()!.status === 'submitted' ? 'Submitted' : selectedSubmission()!.status === 'reviewed' ? 'Reviewed' : 'Draft' }}
          </span>
          <span class="panel-meta">by {{ selectedSubmission()!.interviewedBy }}</span>
          @if (selectedSubmission()!.leadId) {
            <span class="panel-meta linked-badge">
              <app-icon name="briefcase" [size]="12"></app-icon>
              Linked to lead
            </span>
          }
        </div>

        <div class="panel-body">

          <!-- Section: Company -->
          <div class="panel-section">
            <h3 class="section-title">Company Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Company Name</span>
                <span class="info-value">{{ selectedSubmission()!.companyName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Industry</span>
                <span class="info-value">{{ selectedSubmission()!.industry }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Facilities</span>
                <span class="info-value">{{ selectedSubmission()!.facilities }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Employees</span>
                <span class="info-value">{{ selectedSubmission()!.employees || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Section: Contact -->
          <div class="panel-section">
            <h3 class="section-title">Contact Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">{{ selectedSubmission()!.contactName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Title</span>
                <span class="info-value">{{ selectedSubmission()!.contactTitle || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <a class="info-link" [href]="'mailto:' + selectedSubmission()!.contactEmail">{{ selectedSubmission()!.contactEmail }}</a>
              </div>
              <div class="info-item">
                <span class="info-label">Phone</span>
                <a class="info-link" [href]="'tel:' + selectedSubmission()!.contactPhone">{{ selectedSubmission()!.contactPhone || '—' }}</a>
              </div>
            </div>
          </div>

          <!-- Section: Compliance -->
          <div class="panel-section">
            <h3 class="section-title">Compliance & Quality</h3>
            <div class="info-item" style="margin-bottom:10px;">
              <span class="info-label">Certifications</span>
              @if (selectedSubmission()!.certifications.length > 0) {
                <div class="chip-wrap" style="margin-top:4px;">
                  @for (cert of selectedSubmission()!.certifications; track cert) {
                    <span class="badge badge-cyan">{{ cert }}</span>
                  }
                </div>
              } @else {
                <span class="info-value">None</span>
              }
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">GFSI Benchmarked</span>
                <span class="info-value">{{ selectedSubmission()!.gfsiBenchmarked || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Audit Date</span>
                <span class="info-value">{{ selectedSubmission()!.lastAuditDate ? (selectedSubmission()!.lastAuditDate | date:'MMM d, y') : '—' }}</span>
              </div>
            </div>
            @if (selectedSubmission()!.biggestChallenge) {
              <div class="info-item" style="margin-top:10px;">
                <span class="info-label">Biggest Challenge</span>
                <p class="info-text">{{ selectedSubmission()!.biggestChallenge }}</p>
              </div>
            }
          </div>

          <!-- Section: Interest -->
          <div class="panel-section">
            <h3 class="section-title">Product Interest</h3>
            <div class="info-item" style="margin-bottom:10px;">
              <span class="info-label">Modules of Interest</span>
              @if (selectedSubmission()!.modulesOfInterest.length > 0) {
                <div class="chip-wrap" style="margin-top:4px;">
                  @for (mod of selectedSubmission()!.modulesOfInterest; track mod) {
                    <span class="badge badge-blue">{{ mod }}</span>
                  }
                </div>
              } @else {
                <span class="info-value">—</span>
              }
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Implementation Timeline</span>
                <span class="info-value">{{ selectedSubmission()!.timeline || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Source</span>
                <span class="info-value">{{ selectedSubmission()!.source }}</span>
              </div>
            </div>
            @if (selectedSubmission()!.notes) {
              <div class="info-item" style="margin-top:10px;">
                <span class="info-label">Notes</span>
                <p class="info-text">{{ selectedSubmission()!.notes }}</p>
              </div>
            }
          </div>

        </div><!-- /panel-body -->

        <div class="panel-footer">
          <button class="btn-secondary btn-sm" (click)="selectedSubmission.set(null)">Close</button>
          <button class="btn-secondary btn-sm" (click)="triggerExport(selectedSubmission()!)">
            <app-icon name="download" [size]="13"></app-icon>
            Export
          </button>
          <button class="btn-primary btn-sm" (click)="openInMesIntake(selectedSubmission()!)">
            <app-icon name="factory" [size]="13"></app-icon>
            Open in MES Intake
          </button>
        </div>

      </div>
    }

    <!-- Export Format Modal -->
    @if (showExportModal()) {
      <div class="modal-overlay" (click)="showExportModal.set(null)">
        <div class="export-modal" (click)="$event.stopPropagation()">
          <div class="export-modal-header">
            <div>
              <h3>Export Intake Form</h3>
              <span class="export-sub">{{ showExportModal()!.companyName }}</span>
            </div>
            <button class="modal-close-btn" (click)="showExportModal.set(null)">&times;</button>
          </div>
          <div class="export-options">
            <button class="export-opt" (click)="doExport('json')">
              <span class="export-opt-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </span>
              <div class="export-opt-info">
                <strong>JSON</strong>
                <span>Structured data · .json</span>
              </div>
            </button>
            <button class="export-opt" (click)="doExport('md')">
              <span class="export-opt-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
              </span>
              <div class="export-opt-info">
                <strong>Markdown</strong>
                <span>Readable document · .md</span>
              </div>
            </button>
            <button class="export-opt" (click)="doExport('txt')">
              <span class="export-opt-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              </span>
              <div class="export-opt-info">
                <strong>Plain Text</strong>
                <span>Formatted text · .txt</span>
              </div>
            </button>
            <button class="export-opt" (click)="doExport('csv')">
              <span class="export-opt-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
              </span>
              <div class="export-opt-info">
                <strong>CSV</strong>
                <span>Spreadsheet compatible · .csv</span>
              </div>
            </button>
            <button class="export-opt copy-opt" (click)="doExport('copy')">
              <span class="export-opt-icon">
                @if (exportCopied()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                }
              </span>
              <div class="export-opt-info">
                <strong>{{ exportCopied() ? 'Copied!' : 'Copy to Clipboard' }}</strong>
                <span>Plain text format · no download</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .registry-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .stat-card {
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }

    .stat-body { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-gray-500); }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-gray-900); }

    .table-card {
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-hairline);
    }

    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius);
      padding: 0 12px;
    }

    .search-input {
      flex: 1;
      border: none;
      background: none;
      padding: 8px 0;
      font-size: 0.875rem;
      color: var(--color-gray-800);
      outline: none;
    }

    .filter-group { display: flex; gap: 8px; }

    .form-select-sm {
      height: 36px;
      font-size: 0.8125rem;
      padding: 0 10px;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius);
      background: white;
      color: var(--color-gray-700);
    }

    .table-scroll { overflow-x: auto; }

    .entity-cell { display: flex; align-items: center; gap: 10px; }
    .entity-avatar { width: 34px; height: 34px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.8125rem; flex-shrink: 0; }
    .entity-info { display: flex; flex-direction: column; gap: 2px; }
    .entity-name { font-weight: 600; font-size: 0.875rem; color: var(--color-gray-900); }
    .entity-sub { font-size: 0.6875rem; color: var(--color-gray-400); }

    .contact-cell { display: flex; flex-direction: column; gap: 1px; }
    .contact-name { font-size: 0.875rem; font-weight: 500; color: var(--color-gray-800); }
    .contact-title { font-size: 0.6875rem; color: var(--color-gray-400); }

    .status-badge {
      display: inline-flex; align-items: center;
      padding: 2px 10px; border-radius: var(--radius-full);
      font-size: 0.6875rem; font-weight: 700;
    }
    .status-submitted { background: #EBF5FF; color: var(--color-primary); }
    .status-reviewed { background: #D1FAE5; color: #065F46; }
    .status-draft { background: var(--color-gray-100); color: var(--color-gray-500); }

    .module-chips { display: flex; flex-wrap: wrap; gap: 4px; }

    .text-sm { font-size: 0.875rem; }
    .text-muted { color: var(--color-gray-500); }

    .action-icons { display: flex; gap: 4px; }
    .action-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: none; border-radius: var(--radius); color: var(--color-gray-400); cursor: pointer; transition: all 0.15s ease; }
    .action-btn:hover { background: var(--color-gray-100); color: var(--color-gray-700); }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 3rem 1rem; color: var(--color-gray-400); text-align: center; }
    .empty-state p { margin: 0; font-weight: 600; font-size: 1rem; color: var(--color-gray-600); }
    .empty-state span { font-size: 0.875rem; }

    /* Slideover */
    .slideover-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 40; }
    .slideover-panel { position: fixed; right: 0; top: 0; height: 100vh; width: 560px; background: white; box-shadow: -4px 0 24px rgba(0,0,0,0.12); z-index: 50; display: flex; flex-direction: column; }
    .slideover-wide { width: 600px; }

    .slideover-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-hairline); gap: 12px; }
    .slideover-title-row { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .slideover-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
    .slideover-title-info { display: flex; flex-direction: column; min-width: 0; }
    .slideover-title-info h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slideover-subtitle { font-size: 0.75rem; color: var(--color-gray-500); }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .panel-status-bar { display: flex; align-items: center; gap: 10px; padding: 10px 1.5rem; background: var(--color-gray-50); border-bottom: 1px solid var(--border-hairline); }
    .panel-meta { font-size: 0.8125rem; color: var(--color-gray-500); }
    .linked-badge { display: inline-flex; align-items: center; gap: 5px; color: var(--color-primary); font-weight: 500; }

    .panel-body { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .panel-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border-hairline); display: flex; justify-content: flex-end; gap: 8px; background: var(--color-gray-50); }

    .panel-section { display: flex; flex-direction: column; gap: 10px; }
    .section-title { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-gray-400); margin: 0 0 4px 0; border-bottom: 1px solid var(--border-hairline); padding-bottom: 6px; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 3px; }
    .info-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-gray-400); }
    .info-value { font-size: 0.875rem; font-weight: 500; color: var(--color-gray-800); }
    .info-link { font-size: 0.875rem; color: var(--color-primary); text-decoration: none; }
    .info-link:hover { text-decoration: underline; }
    .info-text { margin: 4px 0 0; font-size: 0.875rem; color: var(--color-gray-700); line-height: 1.6; background: var(--color-gray-50); padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-hairline); }

    .chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }

    /* Export Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 60; display: flex; align-items: center; justify-content: center; }

    .export-modal {
      width: 420px;
      background: white;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: slideUp 180ms ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .export-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .export-modal-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--color-gray-900); }
    .export-sub { font-size: 0.8125rem; color: var(--color-gray-500); }

    .export-options {
      display: flex;
      flex-direction: column;
      padding: 0.75rem;
      gap: 4px;
    }

    .export-opt {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 0.875rem;
      background: none;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
    }

    .export-opt:hover {
      background: var(--color-gray-50);
      border-color: var(--border-hairline);
    }

    .export-opt-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      background: var(--color-gray-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-600);
      flex-shrink: 0;
      transition: all 0.12s ease;
    }

    .export-opt:hover .export-opt-icon {
      background: #0D9488;
      color: white;
    }

    .export-opt-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .export-opt-info strong { font-size: 0.875rem; font-weight: 600; color: var(--color-gray-900); }
    .export-opt-info span { font-size: 0.75rem; color: var(--color-gray-400); }

    .copy-opt:hover .export-opt-icon { background: var(--status-green-text); color: white; }

    .modal-close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-gray-400); padding: 2px 6px; border-radius: var(--radius-sm); line-height: 1; }
    .modal-close-btn:hover { background: var(--color-gray-100); color: var(--color-gray-700); }

    @media (max-width: 768px) {
      .registry-content {
        padding: 0.75rem;
        gap: 0.875rem;
      }

      /* Stats: 2-column grid on mobile */
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.625rem;
      }

      .stat-card {
        padding: 0.875rem 1rem;
      }

      .stat-value {
        font-size: 1.375rem;
      }

      /* Toolbar: stack vertically */
      .table-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 12px;
      }

      .search-input {
        font-size: 16px; /* prevents iOS zoom */
      }

      .form-select-sm {
        height: 44px;
        font-size: 16px;
        width: 100%;
      }

      /* Table: allow horizontal scroll, preserve layout */
      .table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Action buttons: larger tap targets */
      .action-btn {
        width: 44px;
        height: 44px;
      }

      /* Slideover: full-screen on mobile */
      .slideover-panel,
      .slideover-wide {
        width: 100%;
        max-width: 100%;
        top: 0;
        bottom: 0;
        height: 100%;
      }

      .panel-footer {
        flex-direction: column;
        gap: 8px;
      }

      .panel-footer .btn-secondary,
      .panel-footer .btn-primary {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }

      /* Export modal: full-width on mobile */
      .export-modal {
        width: calc(100% - 2rem);
        max-width: 420px;
        margin: 0 1rem;
      }

      .export-opt {
        min-height: 60px;
      }
    }
  `]
})
export class IntakeRegistryComponent {
  dataService = inject(ApiService);
  router = inject(Router);
  mesIntakeState = inject(MesIntakeStateService);

  selectedSubmission = signal<IntakeSubmission | null>(null);
  showExportModal = signal<IntakeSubmission | null>(null);
  exportCopied = signal(false);
  searchQuery = '';
  statusFilter = '';
  search$ = signal('');
  statusFilter$ = signal('');

  // Avatar color based on company name (consistent with platform)
  getAvatarColor(name: string): string {
    const colors = ['#1A56DB','#059669','#7C3AED','#D97706','#E11D48','#0D9488','#A02195'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  filteredSubmissions = computed(() => {
    const q = this.search$().toLowerCase();
    const status = this.statusFilter$();
    let subs = this.dataService.intakeSubmissions();
    if (q) {
      subs = subs.filter(s =>
        s.companyName.toLowerCase().includes(q) ||
        s.contactName.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q) ||
        s.contactEmail.toLowerCase().includes(q)
      );
    }
    if (status) {
      subs = subs.filter(s => s.status === status);
    }
    return [...subs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  });

  countByStatus(status: string): number {
    return this.dataService.intakeSubmissions().filter(s => s.status === status).length;
  }

  openSubmission(sub: IntakeSubmission) {
    this.selectedSubmission.set(sub);
  }

  triggerExport(sub: IntakeSubmission) {
    this.showExportModal.set(sub);
  }

  doExport(format: 'json' | 'md' | 'txt' | 'csv' | 'copy') {
    const sub = this.showExportModal();
    if (!sub) return;
    const slug = sub.companyName.toLowerCase().replace(/\s+/g, '-');
    const dateStr = new Date(sub.submittedAt).toISOString().split('T')[0];
    const filename = `intake-${slug}-${dateStr}`;

    switch (format) {
      case 'json':
        this.download(JSON.stringify(this.buildJSON(sub), null, 2), `${filename}.json`, 'application/json');
        break;
      case 'md':
        this.download(this.buildMarkdown(sub), `${filename}.md`, 'text/markdown');
        break;
      case 'txt':
        this.download(this.buildText(sub), `${filename}.txt`, 'text/plain');
        break;
      case 'csv':
        this.download(this.buildCSV(sub), `${filename}.csv`, 'text/csv');
        break;
      case 'copy':
        navigator.clipboard.writeText(this.buildText(sub)).then(() => {
          this.exportCopied.set(true);
          setTimeout(() => this.exportCopied.set(false), 2200);
        });
        return; // keep modal open to show feedback
    }
    this.showExportModal.set(null);
  }

  openInMesIntake(sub: IntakeSubmission) {
    this.mesIntakeState.set(sub);
    this.selectedSubmission.set(null);
    this.router.navigate(['/intake/mes/interview']);
  }

  private download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildJSON(sub: IntakeSubmission): object {
    return {
      exportedAt: new Date().toISOString(),
      source: 'CAT-I Ops — Customer Intake',
      submission: {
        id: sub.id,
        status: sub.status,
        submittedAt: sub.submittedAt,
        interviewedBy: sub.interviewedBy,
        company: {
          name: sub.companyName,
          industry: sub.industry,
          facilities: sub.facilities,
          employees: sub.employees,
        },
        contact: {
          name: sub.contactName,
          title: sub.contactTitle,
          email: sub.contactEmail,
          phone: sub.contactPhone,
        },
        compliance: {
          certifications: sub.certifications,
          gfsiBenchmarked: sub.gfsiBenchmarked,
          lastAuditDate: sub.lastAuditDate,
          biggestChallenge: sub.biggestChallenge,
        },
        interest: {
          modulesOfInterest: sub.modulesOfInterest,
          timeline: sub.timeline,
          source: sub.source,
          notes: sub.notes,
        },
      },
    };
  }

  private buildMarkdown(sub: IntakeSubmission): string {
    const date = new Date(sub.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const lines: string[] = [
      `# Customer Intake — ${sub.companyName}`,
      '',
      `**Submitted:** ${date} &nbsp;·&nbsp; **Interviewer:** ${sub.interviewedBy} &nbsp;·&nbsp; **Status:** ${sub.status.toUpperCase()}`,
      '',
      '---',
      '',
      '## Company Information',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Company Name | ${sub.companyName} |`,
      `| Industry | ${sub.industry} |`,
      `| Facilities | ${sub.facilities} |`,
      `| Employees | ${sub.employees || '—'} |`,
      '',
      '## Contact Details',
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Name | ${sub.contactName} |`,
      `| Title | ${sub.contactTitle || '—'} |`,
      `| Email | ${sub.contactEmail} |`,
      `| Phone | ${sub.contactPhone || '—'} |`,
      '',
      '## Compliance & Quality',
      '',
      `**Certifications:** ${sub.certifications.length ? sub.certifications.join(', ') : 'None'}`,
      '',
      `**GFSI Benchmarked:** ${sub.gfsiBenchmarked || '—'}`,
      '',
      `**Last Audit Date:** ${sub.lastAuditDate || '—'}`,
      '',
      `**Biggest Challenge:**`,
      '',
      sub.biggestChallenge ? `> ${sub.biggestChallenge}` : '> —',
      '',
      '## Product Interest',
      '',
      `**Modules of Interest:** ${sub.modulesOfInterest.length ? sub.modulesOfInterest.join(', ') : '—'}`,
      '',
      `**Implementation Timeline:** ${sub.timeline || '—'}`,
      '',
      `**Lead Source:** ${sub.source}`,
      '',
      sub.notes ? `**Notes:**\n\n> ${sub.notes}` : '',
      '',
      '---',
      '',
      `*Generated by CAT-I Ops · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`,
    ];
    return lines.join('\n');
  }

  private buildText(sub: IntakeSubmission): string {
    const certs = sub.certifications.length > 0 ? sub.certifications.join(', ') : 'None';
    const mods = sub.modulesOfInterest.length > 0 ? sub.modulesOfInterest.join(', ') : '—';
    const date = new Date(sub.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `CUSTOMER INTAKE FORM
CAT-I Operations Platform
Submitted: ${date}  |  Interviewer: ${sub.interviewedBy}  |  Status: ${sub.status.toUpperCase()}
${'═'.repeat(56)}

COMPANY INFORMATION
${'─'.repeat(40)}
Company Name:         ${sub.companyName}
Industry:             ${sub.industry}
Number of Facilities: ${sub.facilities}
Number of Employees:  ${sub.employees || '—'}

CONTACT DETAILS
${'─'.repeat(40)}
Contact Name:  ${sub.contactName}
Title:         ${sub.contactTitle || '—'}
Email:         ${sub.contactEmail}
Phone:         ${sub.contactPhone || '—'}

COMPLIANCE & QUALITY
${'─'.repeat(40)}
Certifications:      ${certs}
GFSI Benchmarked:    ${sub.gfsiBenchmarked || '—'}
Last Audit Date:     ${sub.lastAuditDate || '—'}

Biggest Challenge:
${sub.biggestChallenge || '—'}

PRODUCT INTEREST
${'─'.repeat(40)}
Modules of Interest:     ${mods}
Implementation Timeline: ${sub.timeline || '—'}
Lead Source:             ${sub.source}

Notes:
${sub.notes || '(none)'}

${'═'.repeat(56)}
Generated by CAT-I Ops  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }

  private buildCSV(sub: IntakeSubmission): string {
    const row = (label: string, value: string | number) =>
      `"${label}","${String(value).replace(/"/g, '""')}"`;
    const lines = [
      'Field,Value',
      row('Company Name', sub.companyName),
      row('Industry', sub.industry),
      row('Facilities', sub.facilities),
      row('Employees', sub.employees || ''),
      row('Contact Name', sub.contactName),
      row('Contact Title', sub.contactTitle || ''),
      row('Contact Email', sub.contactEmail),
      row('Contact Phone', sub.contactPhone || ''),
      row('Certifications', sub.certifications.join('; ')),
      row('GFSI Benchmarked', sub.gfsiBenchmarked || ''),
      row('Last Audit Date', sub.lastAuditDate || ''),
      row('Biggest Challenge', sub.biggestChallenge || ''),
      row('Modules of Interest', sub.modulesOfInterest.join('; ')),
      row('Timeline', sub.timeline || ''),
      row('Source', sub.source),
      row('Notes', sub.notes || ''),
      row('Status', sub.status),
      row('Submitted At', sub.submittedAt),
      row('Interviewed By', sub.interviewedBy),
    ];
    return lines.join('\n');
  }
}
