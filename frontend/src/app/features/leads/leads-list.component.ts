import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Lead, LeadContact, LeadAddress, LeadAttachment, STAGE_COLORS, PIPELINE_STAGES, PipelineStage, STAGE_PROBABILITIES, STAGE_NEXT_ACTIONS, CAT_MODULES } from '../../core/models';
import { ALL_MODULES, INDUSTRIES, CERT_OPTIONS, SOURCES, MODULE_PRICES } from '../../core/constants/seed.data';
import { IconComponent } from '../../shared/icons';
import { OcrService } from '../../core/services/ocr.service';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { InlineEditComponent } from '../../shared/components/inline-edit/inline-edit.component';
import { DetailPanelComponent } from '../../shared/components/detail-panel/detail-panel.component';
import { CurrencyShortPipe } from '../../shared/utils/format.pipe';
import { TeamUtilService } from '../../shared/utils/team.service';
import { DirectEmailComposerComponent } from '../../shared/components/direct-email-composer/direct-email-composer.component';

@Component({
  selector: 'app-leads-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, FilterBarComponent, ActivityTimelineComponent, InlineEditComponent, DetailPanelComponent, CurrencyShortPipe, DirectEmailComposerComponent],
  template: `
    <app-header
      title="Leads"
      subtitle="Sales Pipeline Management"
      icon="briefcase"
      gradient="linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)"
    >
      <button class="btn-blinq btn-sm" (click)="showBlinqModal.set(true)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
        Scan Card
      </button>
      <button class="btn-secondary btn-sm" (click)="showImportModal.set(true)">Import Leads</button>
      <button class="btn-secondary btn-sm" (click)="exportCsv()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
      <button class="btn-primary btn-sm" (click)="showAddModal.set(true)">+ Add Lead</button>
    </app-header>

    <div class="leads-content">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Leads</span>
            <span class="stat-value">{{ dataService.operationalLeads().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Active</span>
            <span class="stat-value">{{ dataService.activeLeads().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Won</span>
            <span class="stat-value">{{ dataService.wonLeads().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Lost</span>
            <span class="stat-value">{{ dataService.lostLeads().length }}</span>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="table-card">
        <app-filter-bar [filters]="leadFilters" [(values)]="filterState" (valuesChange)="onFilterChange($event)"></app-filter-bar>
        @if (selectedLeadIds().size > 0) {
          <div class="bulk-bar">
            <span class="bulk-count">{{ selectedLeadIds().size }} selected</span>
            @if (hasMorePagesToSelect()) {
              <button class="link-btn" (click)="selectAllMatching()">
                Select all {{ filteredLeads().length }} leads across all pages
              </button>
            }
            <button class="btn-secondary btn-sm bulk-spacer" (click)="clearSelection()">Clear</button>
            <button class="btn-danger btn-sm" (click)="deleteSelected()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete Selected
            </button>
          </div>
        }
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 36px">
                  <input type="checkbox" [checked]="allOnPageSelected()" (change)="toggleAllOnPage($event)" title="Select all on this page">
                </th>
                <th style="width: 17%">Company</th>
                <th style="width: 11%">Contact</th>
                <th style="width: 10%">Stage</th>
                <th style="width: 9%">Value</th>
                <th style="width: 10%">Modules</th>
                <th style="width: 8%">Source</th>
                <th style="width: 9%">Owner</th>
                <th style="width: 11%">Last Activity</th>
                <th style="width: 15%">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of pagedLeads(); track lead.id) {
                <tr (click)="selectLead(lead)" [class.row-selected]="isLeadSelected(lead.id)">
                  <td (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="isLeadSelected(lead.id)" (change)="toggleLeadSelection(lead.id, $event)">
                  </td>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-avatar" [style.background]="lead.company ? teamUtil.getColor(lead.company) : '#9CA3AF'">
                        {{ lead.company.charAt(0) }}
                      </div>
                      <div class="entity-info">
                        <span class="entity-name">{{ lead.company }}</span>
                        <span class="entity-sub">{{ lead.industry || lead.source }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ lead.contact || '—' }}</td>
                  <td>
                    <span class="badge" [class]="'badge-' + getStageColor(lead.stage)">{{ lead.stage }}</span>
                  </td>
                  <td class="value-cell">{{ lead.value > 0 ? (lead.value | currencyShort) : '—' }}</td>
                  <td>
                    @if (lead.modules.length > 0) {
                      <div class="module-chips">
                        @for (mod of lead.modules.slice(0, 2); track mod) {
                          <span class="badge badge-blue">{{ mod }}</span>
                        }
                        @if (lead.modules.length > 2) {
                          <span class="badge badge-gray">+{{ lead.modules.length - 2 }}</span>
                        }
                      </div>
                    } @else { — }
                  </td>
                  <td><span class="source-label">{{ lead.source }}</span></td>
                  <td>
                    @if (lead.owner) {
                      <div class="owner-cell">
                        <div class="owner-avatar" [style.background]="teamUtil.getColor(lead.owner)">
                          {{ lead.owner.charAt(0) }}
                        </div>
                        {{ lead.owner }}
                      </div>
                    } @else {
                      <span class="unassigned-label">Unassigned</span>
                    }
                  </td>
                  <td class="activity-text">{{ lead.lastActivity }}</td>
                  <td>
                    <div class="action-icons" (click)="$event.stopPropagation()">
                      <button class="action-btn" title="Send Email" (click)="openActionModal(lead, 'email')">
                        <app-icon name="mail"></app-icon>
                      </button>
                      <button class="action-btn" title="Log Call" (click)="openActionModal(lead, 'phone')">
                        <app-icon name="phone"></app-icon>
                      </button>
                      <button class="action-btn" title="Add Note" (click)="openActionModal(lead, 'note')">
                        <app-icon name="note"></app-icon>
                      </button>
                      <button class="action-btn" title="Set Reminder" (click)="openActionModal(lead, 'reminder')">
                        <app-icon name="bell"></app-icon>
                      </button>
                      <input type="file" #quickAttach accept="image/*,application/pdf,.doc,.docx,.xlsx,.pptx" multiple style="display:none" (change)="onQuickAttach(lead, $event)">
                      <button class="action-btn" title="Quick Attach" (click)="quickAttach.click()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                      </button>
                      <button class="action-btn action-btn-danger" title="Delete Lead" (click)="deleteLead(lead)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10">
                    <div class="empty-state">
                      <p>No leads found</p>
                      <span>Try adjusting your filters or search query</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile card list (shown at ≤768px, hidden on desktop via CSS) -->
        <div class="mobile-leads-list">
          @for (lead of filteredLeads(); track lead.id) {
            <div class="lead-card" (click)="selectLead(lead)">
              <div class="lead-card-main">
                <div class="lead-card-avatar" [style.background]="lead.company ? teamUtil.getColor(lead.company) : '#9CA3AF'">
                  {{ lead.company.charAt(0) }}
                </div>
                <div class="lead-card-info">
                  <span class="lead-card-company">{{ lead.company }}</span>
                  <span class="lead-card-sub">{{ lead.industry || lead.source }}</span>
                </div>
                <span class="badge lead-card-badge" [class]="'badge-' + getStageColor(lead.stage)">{{ lead.stage }}</span>
              </div>
              <div class="lead-card-meta">
                <span class="lead-card-value">{{ lead.value > 0 ? (lead.value | currencyShort) : '—' }}</span>
                @if (lead.owner) {
                  <div class="lead-card-owner">
                    <div class="owner-avatar" [style.background]="teamUtil.getColor(lead.owner)">{{ lead.owner.charAt(0) }}</div>
                    <span>{{ lead.owner }}</span>
                  </div>
                }
                <span class="lead-card-activity">{{ lead.lastActivity }}</span>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <p>No leads found</p>
              <span>Try adjusting your filters or search query</span>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination-bar">
            <span class="pagination-info">
              {{ (currentPage() - 1) * pageSize + 1 }}–{{ minVal(currentPage() * pageSize, filteredLeads().length) }} of {{ filteredLeads().length }} leads
            </span>
            <div class="pagination-controls">
              <button class="page-btn" [disabled]="currentPage() === 1" (click)="goToPage(1)">«</button>
              <button class="page-btn" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">‹</button>
              @for (p of pageNumbers(); track p) {
                <button class="page-btn" [class.active]="p === currentPage()" (click)="goToPage(p)">{{ p }}</button>
              }
              <button class="page-btn" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">›</button>
              <button class="page-btn" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())">»</button>
            </div>
            <span class="pagination-size">20 per page</span>
          </div>
        }
      </div>
    </div>

    <!-- Add Lead Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" (click)="showAddModal.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add New Lead</h2>
            <button class="modal-close-btn" (click)="showAddModal.set(false)">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Section 1: Basic Info -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Contact Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="newLead.contact" placeholder="Full name">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" [(ngModel)]="newLead.email" placeholder="email@company.com">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Company Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="newLead.company" placeholder="Company name">
              </div>
              <div class="form-group">
                <label class="form-label">Position / Title</label>
                <input type="text" class="form-input" [(ngModel)]="newLead.title" placeholder="e.g. Quality Manager">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Industry</label>
                <select class="form-select" [(ngModel)]="newLead.industry">
                  <option value="">-- Select --</option>
                  @for (ind of industries; track ind) {
                    <option [value]="ind">{{ ind }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Primary Sales Contact</label>
                <select class="form-select" [(ngModel)]="newLead.owner">
                  @for (member of team; track member.id) {
                    <option [value]="member.name">{{ member.name }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Section 2: Modules of Interest -->
            <div class="form-group">
              <label class="form-label">What are you interested in?</label>
              <div class="module-selector">
                @for (key of catModuleKeys; track key) {
                  <div class="module-group">
                    <div class="module-group-header" (click)="toggleModuleGroup(key)">
                      <button type="button" class="module-group-checkbox"
                              [class.partial]="isGroupSelected(key) && !isGroupFullySelected(key)"
                              [class.checked]="isGroupFullySelected(key)"
                              (click)="$event.stopPropagation(); toggleGroupAll(key)">
                        @if (isGroupFullySelected(key)) { &#10003; }
                        @else if (isGroupSelected(key)) { &#8211; }
                      </button>
                      <div class="module-group-info">
                        <span class="module-group-name">{{ key }}</span>
                        <span class="module-group-desc">{{ catModules[key].name }}</span>
                      </div>
                      <svg class="module-group-chevron" [class.expanded]="expandedModuleGroups().has(key)"
                           width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    @if (expandedModuleGroups().has(key)) {
                      <div class="module-sublist">
                        @for (sub of catModules[key].subModules; track sub) {
                          <label class="module-sub-item" (click)="$event.stopPropagation()">
                            <input type="checkbox"
                                   [checked]="newLeadSubModules[key]?.includes(sub)"
                                   (change)="toggleSubModule(key, sub)">
                            <span>{{ sub }}</span>
                          </label>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
              @if (getSelectedSubModuleTags().length) {
                <div class="selected-tags">
                  @for (tag of getSelectedSubModuleTags(); track tag.group + tag.sub) {
                    <span class="selected-tag">
                      {{ tag.sub }}
                      <button type="button" (click)="removeSubModuleTag(tag.group, tag.sub)">&times;</button>
                    </span>
                  }
                </div>
              }
              <div class="value-calc">Estimated from modules: <strong>\${{ calculateNewLeadValue() | number }}</strong></div>
            </div>

            <!-- Deal Value Override -->
            <div class="form-group">
              <label class="form-label">Deal Value ($)</label>
              <input type="number" class="form-input" [(ngModel)]="newLeadValue" [placeholder]="'Auto: $' + (calculateNewLeadValue() | number)" min="0">
              <span class="form-hint">Leave blank to auto-calculate from selected modules</span>
            </div>

            <!-- Section 3: Scheduling -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Preferred Date</label>
                <input type="date" class="form-input" [(ngModel)]="newLead.preferredDate">
              </div>
              <div class="form-group">
                <label class="form-label">Preferred Time</label>
                <select class="form-select" [(ngModel)]="newLead.preferredTime">
                  <option value="">-- Select --</option>
                  <option value="Morning (9am-12pm)">Morning (9am-12pm)</option>
                  <option value="Afternoon (1pm-5pm)">Afternoon (1pm-5pm)</option>
                  <option value="Evening (5pm-7pm)">Evening (5pm-7pm)</option>
                </select>
              </div>
            </div>

            <!-- Section 4: Demo Focus -->
            <div class="form-group">
              <label class="form-label">What would you like us to focus on?</label>
              <textarea class="form-textarea" [(ngModel)]="newLead.notes" rows="3"
                        placeholder="Tell us about your goals, challenges, or specific areas you'd like to see..."></textarea>
            </div>

            <!-- Section 5: Source & Priority -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Source</label>
                <select class="form-select" [(ngModel)]="newLead.source">
                  @for (src of sources; track src) {
                    <option [value]="src">{{ src }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" [(ngModel)]="newLead.priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showAddModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="addLead()" [disabled]="!newLead.company || !newLead.contact">Save Lead</button>
          </div>
        </div>
      </div>
    }

    <!-- Import Modal -->
    @if (showImportModal()) {
      <div class="modal-overlay" (click)="showImportModal.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Import Leads</h2>
            <button class="modal-close-btn" (click)="showImportModal.set(false)">&times;</button>
          </div>
          <div class="modal-body">

            <!-- Step 1: File upload area -->
            <div class="import-upload-zone" [class.has-data]="importData" (dragover)="$event.preventDefault()" (drop)="onImportFileDrop($event)">
              @if (!importData) {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-gray-400)">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p class="import-upload-title">Drop a CSV file here or click to browse</p>
                <p class="import-upload-sub">Supports .csv files. For Excel: File → Save As → CSV.</p>
                <input type="file" #importFileInput accept=".csv,.txt" (change)="onImportFileSelected($event)" style="display:none">
                <button class="btn-secondary btn-sm" (click)="importFileInput.click()">Browse File</button>
              } @else {
                <div class="import-file-ready">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{{ importRowCount }} row{{ importRowCount !== 1 ? 's' : '' }} detected</span>
                  <button class="icon-btn" (click)="clearImportData()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              }
            </div>

            <!-- Divider -->
            <div class="import-divider"><span>or paste CSV data</span></div>

            <!-- Step 2: Paste -->
            <textarea class="form-textarea import-area" [(ngModel)]="importData" (ngModelChange)="onImportDataChange()" rows="6"
              placeholder="Company Name,Industry,Contact Name,Contact Email,Contact Phone,Street,City,State,ZIP,Country,Timezone,Source,Priority,Modules&#10;Example Corp,Food &amp; Beverage,Jane Smith,jane@example.com,+1 555-1234,123 Main St,Chicago,IL,60601,USA,America/Chicago,Referral,medium,MES Core"></textarea>

            <!-- Validation Errors -->
            @if (importErrors.length > 0) {
              <div class="import-errors">
                <strong>Issues found:</strong>
                @for (err of importErrors; track $index) {
                  <div class="import-error-row">&#9888; {{ err }}</div>
                }
              </div>
            }

            <!-- Import Results (shown after import completes with errors) -->
            @if (importResults()) {
              <div class="import-results">
                <div class="import-result-success">
                  &#10003; {{ importResults()!.imported }} lead{{ importResults()!.imported !== 1 ? 's' : '' }} imported successfully
                </div>
                @if (importResults()!.skipped.length > 0) {
                  <div class="import-result-errors">
                    <strong>&#9888; {{ importResults()!.skipped.length }} row{{ importResults()!.skipped.length !== 1 ? 's' : '' }} failed:</strong>
                    <div class="import-error-list">
                      @for (err of importResults()!.skipped; track err.row) {
                        <div class="import-error-detail">
                          <span class="error-row-num">Row {{ err.row }}</span>
                          <span class="error-company">{{ err.company }}</span>
                          <span class="error-msg">{{ err.error }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Template download -->
            <div class="import-template-row">
              <span class="import-hint">Not sure about the format?</span>
              <button class="text-link" (click)="downloadImportTemplate()">&#8595; Download CSV Template</button>
            </div>

          </div>
          <div class="modal-footer">
            @if (importResults()) {
              <button class="btn-primary" (click)="closeImportModal()">Done</button>
            } @else {
              <button class="btn-secondary" (click)="closeImportModal()">Cancel</button>
              <button class="btn-primary" (click)="importLeads()" [disabled]="!importData || importErrors.length > 0 || importSaving()">
                {{ importSaving() ? 'Importing...' : 'Import ' + (importRowCount > 0 ? importRowCount + ' Lead' + (importRowCount !== 1 ? 's' : '') : 'Leads') }}
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- Blinq Scan Modal -->
    @if (showBlinqModal()) {
      <div class="modal-overlay" (click)="showBlinqModal.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="blinq-header">
              <svg class="blinq-logo" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="#6366F1"/>
                <path d="M7 12h10M12 7v10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              <h2>{{ blinqStep() === 'scan' ? 'Scan Business Card' : blinqStep() === 'scanning' ? 'Scanning...' : blinqStep() === 'review' ? 'Review Contact' : blinqStep() === 'qr-scan' ? 'Scan QR Code' : blinqStep() === 'qr-review' ? 'Review QR Scan' : 'Blinq Integration' }}</h2>
            </div>
            <button class="modal-close-btn" (click)="closeBlinqModal()">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Initial Step - Choose Method -->
            @if (blinqStep() === 'initial') {
              <div class="blinq-options">
                <div class="blinq-option" (click)="startScan()">
                  <div class="blinq-option-icon camera">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                  </div>
                  <div class="blinq-option-content">
                    <span class="blinq-option-title">Scan Business Card</span>
                    <span class="blinq-option-desc">Use your camera to scan and import a business card</span>
                  </div>
                </div>
                <div class="blinq-option" (click)="showBlinqImport()">
                  <div class="blinq-option-icon import">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div class="blinq-option-content">
                    <span class="blinq-option-title">Import from Blinq</span>
                    <span class="blinq-option-desc">Connect your Blinq account to sync contacts</span>
                  </div>
                </div>
                <div class="blinq-option" (click)="showManualEntry()">
                  <div class="blinq-option-icon manual">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </div>
                  <div class="blinq-option-content">
                    <span class="blinq-option-title">Manual Entry</span>
                    <span class="blinq-option-desc">Quickly enter contact details from a business card</span>
                  </div>
                </div>
                <div class="blinq-option" (click)="startQrScan()">
                  <div class="blinq-option-icon qr">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      <rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/>
                    </svg>
                  </div>
                  <div class="blinq-option-content">
                    <span class="blinq-option-title">Scan QR Code</span>
                    <span class="blinq-option-desc">Scan a badge or QR code at a trade show</span>
                  </div>
                </div>
              </div>
              <div class="blinq-footer-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                Powered by Blinq digital business card technology
              </div>
            }

            <!-- Scan Step - Camera View -->
            @if (blinqStep() === 'scan') {
              <div class="scan-container">
                <div class="camera-preview" [class.has-image]="scannedImageUrl()">
                  @if (!scannedImageUrl()) {
                    <div class="camera-placeholder">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                      <span>Position business card in frame</span>
                    </div>
                    <div class="scan-frame">
                      <div class="scan-corner tl"></div>
                      <div class="scan-corner tr"></div>
                      <div class="scan-corner bl"></div>
                      <div class="scan-corner br"></div>
                    </div>
                  } @else {
                    <img [src]="scannedImageUrl()" alt="Scanned card" class="scanned-image">
                  }
                </div>
                <div class="scan-actions">
                  <input type="file" #fileInput accept="image/*" capture="environment" (change)="onFileSelected($event)" style="display: none">
                  <input type="file" #galleryInput accept="image/*" (change)="onFileSelected($event)" style="display: none">
                  <button class="btn-primary btn-lg" (click)="fileInput.click()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                    {{ scannedImageUrl() ? 'Retake Photo' : 'Take Photo' }}
                  </button>
                  @if (!scannedImageUrl()) {
                    <button class="btn-secondary btn-lg" (click)="galleryInput.click()">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Upload from Gallery
                    </button>
                  }
                  @if (scannedImageUrl()) {
                    <button class="btn-secondary btn-lg" (click)="processScan()">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Process Card
                    </button>
                  }
                </div>
                <p class="scan-hint">Take a clear photo of the business card, or upload from your gallery.</p>
              </div>
            }

            <!-- Scanning Animation -->
            @if (blinqStep() === 'scanning') {
              <div class="scanning-container">
                <div class="scanning-animation">
                  <div class="scan-line"></div>
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z"/>
                  </svg>
                </div>
                <p class="scanning-text">{{ ocrProgress() < 50 ? 'Reading text from card...' : 'Extracting contact info...' }}</p>
                <div class="scanning-progress">
                  <div class="scanning-bar" [style.width.%]="ocrProgress()" style="transition: width 300ms ease;"></div>
                </div>
                <p class="scanning-percent">{{ ocrProgress() }}%</p>
              </div>
            }

            <!-- Review Step - Edit Extracted Data -->
            @if (blinqStep() === 'review') {
              <div class="review-container">
                @if (scannedImageUrl()) {
                  <div class="scan-preview-thumb">
                    <img [src]="scannedImageUrl()" alt="Scanned business card">
                  </div>
                }
                @if (!ocrError()) {
                  <div class="extraction-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {{ ocrFieldsExtracted().length }} field{{ ocrFieldsExtracted().length !== 1 ? 's' : '' }} extracted — review before saving
                  </div>
                } @else {
                  <div class="extraction-badge warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                    </svg>
                    {{ ocrError() }}
                  </div>
                }
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Full Name <span class="required">*</span></label>
                    <input type="text" class="form-input" [(ngModel)]="scannedContact.name">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-input" [(ngModel)]="scannedContact.title">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Company <span class="required">*</span></label>
                    <input type="text" class="form-input" [(ngModel)]="scannedContact.company">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select class="form-select" [(ngModel)]="scannedContact.industry">
                      <option value="">-- Select --</option>
                      @for (ind of industries; track ind) {
                        <option [value]="ind">{{ ind }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" [(ngModel)]="scannedContact.email">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-input" [(ngModel)]="scannedContact.phone">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Primary Sales Contact</label>
                    <select class="form-select" [(ngModel)]="scannedContact.owner">
                      @for (member of team; track member.id) {
                        <option [value]="member.name">{{ member.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Source</label>
                    <input type="text" class="form-input" [(ngModel)]="scannedContact.source" placeholder="e.g., FoodTech Expo 2026">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <textarea class="form-textarea" [(ngModel)]="scannedContact.notes" rows="2" placeholder="Add any notes from your conversation..."></textarea>
                </div>
              </div>
            }

            <!-- Blinq Import Step -->
            @if (blinqStep() === 'import') {
              <div class="blinq-import-container">
                @if (!blinqConnected()) {
                  <div class="blinq-connect">
                    <div class="blinq-connect-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <rect width="24" height="24" rx="6" fill="#6366F1"/>
                        <path d="M7 12h10M12 7v10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <h3>Connect to Blinq</h3>
                    <p>Link your Blinq account to import digital business cards you've collected.</p>
                    <button class="btn-blinq btn-lg" (click)="connectBlinq()">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      Connect Blinq Account
                    </button>
                  </div>
                } @else {
                  <div class="blinq-contacts">
                    <div class="blinq-contacts-header">
                      <span class="blinq-connected-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Connected to Blinq
                      </span>
                      <span class="blinq-contact-count">{{ blinqContacts().length }} contacts available</span>
                    </div>
                    <div class="blinq-contact-list">
                      @for (contact of blinqContacts(); track contact.id) {
                        <div class="blinq-contact-item" [class.selected]="selectedBlinqContacts().includes(contact.id)"
                             (click)="toggleBlinqContact(contact.id)">
                          <div class="blinq-contact-checkbox">
                            @if (selectedBlinqContacts().includes(contact.id)) {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            }
                          </div>
                          <div class="blinq-contact-avatar">{{ contact.name.charAt(0) }}</div>
                          <div class="blinq-contact-info">
                            <span class="blinq-contact-name">{{ contact.name }}</span>
                            <span class="blinq-contact-company">{{ contact.company }} · {{ contact.title }}</span>
                          </div>
                          <span class="blinq-contact-date">{{ contact.scannedAt }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
            <!-- ═══ QR SCAN STEP ═══ -->
            @if (blinqStep() === 'qr-scan') {
              <div class="scan-container">
                <div class="camera-preview qr-camera">
                  <video #qrVideo autoplay playsinline muted style="width: 100%; border-radius: 8px;"></video>
                  <div class="scan-frame">
                    <div class="scan-corner tl"></div>
                    <div class="scan-corner tr"></div>
                    <div class="scan-corner bl"></div>
                    <div class="scan-corner br"></div>
                  </div>
                </div>
                @if (qrScanError()) {
                  <div class="extraction-badge warning" style="margin-top: 12px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                    </svg>
                    {{ qrScanError() }}
                  </div>
                }
                <p class="scan-hint">Point your camera at a QR code on a badge or business card.</p>
              </div>
            }

            <!-- ═══ QR REVIEW STEP ═══ -->
            @if (blinqStep() === 'qr-review') {
              <div class="review-container">
                <div class="extraction-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  QR code scanned successfully
                </div>
                <div class="form-group" style="margin-top: 12px;">
                  <label class="form-label">Raw Data</label>
                  <textarea class="form-textarea" rows="4" readonly [value]="qrRawData() ?? ''"></textarea>
                </div>
                @if (qrParsedData()) {
                  <div class="form-group">
                    <label class="form-label">Parsed Fields</label>
                    <div class="qr-parsed-fields">
                      @for (entry of qrParsedEntries(); track entry.key) {
                        <div class="qr-field-row">
                          <span class="qr-field-key">{{ entry.key }}</span>
                          <span class="qr-field-value">{{ entry.value }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Event / Source</label>
                    <input type="text" class="form-input" [(ngModel)]="qrSource" placeholder="e.g., FoodTech Expo 2026">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <textarea class="form-textarea" [(ngModel)]="qrNotes" rows="2" placeholder="Add any notes..."></textarea>
                </div>
              </div>
            }

          </div>
          <div class="modal-footer">
            @if (blinqStep() === 'initial') {
              <button class="btn-secondary" (click)="showBlinqModal.set(false)">Cancel</button>
            } @else if (blinqStep() === 'scan') {
              <button class="btn-secondary" (click)="blinqStep.set('initial')">&#8592; Back</button>
            } @else if (blinqStep() === 'review') {
              <button class="btn-secondary" (click)="blinqStep.set('scan')">&#8592; Back</button>
              <button class="btn-primary" (click)="importScannedContact()" [disabled]="!scannedContact.name || !scannedContact.company">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Add as Lead
              </button>
            } @else if (blinqStep() === 'import') {
              <button class="btn-secondary" (click)="blinqStep.set('initial')">&#8592; Back</button>
              @if (blinqConnected()) {
                <button class="btn-primary" (click)="importBlinqContacts()" [disabled]="selectedBlinqContacts().length === 0">
                  Import {{ selectedBlinqContacts().length }} Contact{{ selectedBlinqContacts().length !== 1 ? 's' : '' }}
                </button>
              }
            } @else if (blinqStep() === 'qr-scan') {
              <button class="btn-secondary" (click)="stopQrScan(); blinqStep.set('initial')">&#8592; Back</button>
            } @else if (blinqStep() === 'qr-review') {
              <button class="btn-secondary" (click)="blinqStep.set('initial')">&#8592; Back</button>
              <button class="btn-primary" (click)="saveQrScan()" [disabled]="qrSaving()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                {{ qrSaving() ? 'Saving...' : 'Save Scan' }}
              </button>
              <button class="btn-secondary" (click)="saveQrScanAndCreateLead()" [disabled]="qrSaving()">
                + Save &amp; Create Lead
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- Lead Detail Slideover -->
    @if (selectedLead()) {
      <div class="slideover-overlay" (click)="selectedLeadId.set(null)"></div>
      <div class="slideover-panel slideover-wide">

        <!-- Header -->
        <div class="slideover-header">
          <div class="slideover-title-row">
            <div class="slideover-avatar" [style.background]="teamUtil.getColor(selectedLead()!.company)">
              {{ selectedLead()!.company.charAt(0) }}
            </div>
            <div class="slideover-title-info">
              <h2>{{ selectedLead()!.company }}</h2>
              <span class="slideover-subtitle">{{ selectedLead()!.industry || selectedLead()!.source }}</span>
            </div>
          </div>
          <div class="slideover-header-actions">
            <button class="btn-danger btn-sm" title="Delete lead" (click)="deleteLead(selectedLead()!)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </button>
            <button class="modal-close-btn" (click)="selectedLeadId.set(null)">&times;</button>
          </div>
        </div>

        <!-- Stage bar -->
        <div class="slideover-stage-bar">
          <div class="detail-top">
            <span class="badge badge-lg" [class]="'badge-' + getStageColor(selectedLead()!.stage)">
              {{ selectedLead()!.stage }}
            </span>
            <span class="detail-value">
              $<app-inline-edit
                [value]="selectedLead()!.value"
                type="number"
                label="Value"
                (valueChange)="updateLeadField('value', $event)"
              ></app-inline-edit>
            </span>
          </div>
          <div class="stage-progress">
            @for (stage of pipelineStages.slice(0, -3); track stage; let i = $index) {
              <div class="stage-segment" [class.active]="i <= getStageIndex(selectedLead()!.stage)"></div>
            }
          </div>
          <div class="stage-actions">
            <button class="btn-secondary btn-sm" (click)="advanceStage(-1)" [disabled]="selectedLead()!.stage === 'Discovery'">&#8592; Back</button>
            <button class="btn-primary btn-sm" (click)="advanceStage(1)" [disabled]="selectedLead()!.stage === 'Closed Won' || selectedLead()!.stage === 'Closed Lost' || selectedLead()!.stage === 'Closed Failed'">Advance &#8594;</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="slideover-tabs">
          <button class="slideover-tab" [class.active]="slideoverTab() === 'overview'" (click)="slideoverTab.set('overview')">Overview</button>
          <button class="slideover-tab" [class.active]="slideoverTab() === 'contacts'" (click)="slideoverTab.set('contacts')">
            Contacts
            @if (getContacts().length > 0) {
              <span class="tab-count">{{ getContacts().length }}</span>
            }
          </button>
          <button class="slideover-tab" [class.active]="slideoverTab() === 'attachments'" (click)="slideoverTab.set('attachments'); loadAttachments()">
            Attachments
            @if (getAttachments().length > 0) {
              <span class="tab-count">{{ getAttachments().length }}</span>
            }
          </button>
          <button class="slideover-tab" [class.active]="slideoverTab() === 'activity'" (click)="slideoverTab.set('activity')">Activity</button>
          <button class="slideover-tab" [class.active]="slideoverTab() === 'notes'" (click)="slideoverTab.set('notes')">
            Notes
            @if ((selectedLead()!.notes?.length ?? 0) > 0) {
              <span class="tab-count">{{ selectedLead()!.notes?.length }}</span>
            }
          </button>
        </div>

        <div class="slideover-body">

          <!-- ═══ OVERVIEW TAB ═══ -->
          @if (slideoverTab() === 'overview') {

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Primary Contact</span>
                <span class="detail-value-sm">{{ getPrimaryContact()?.name || selectedLead()!.contact || '—' }}</span>
                @if (getPrimaryContact()?.role) {
                  <span class="detail-sub">{{ getPrimaryContact()!.role }}</span>
                }
              </div>
              <div class="detail-item">
                <span class="detail-label">Owner</span>
                <app-inline-edit [value]="selectedLead()!.owner" label="Owner" (valueChange)="updateLeadField('owner', $event)"></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <app-inline-edit [value]="getPrimaryContact()?.email || selectedLead()!.email || ''" label="Email" (valueChange)="updateLeadField('email', $event)"></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Priority</span>
                <app-inline-edit [value]="selectedLead()!.priority" type="select" [options]="[{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}]" label="Priority" (valueChange)="updateLeadField('priority', $event)"></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Facilities</span>
                <app-inline-edit
                  [value]="selectedLead()!.facilities"
                  type="number"
                  label="Facilities"
                  (valueChange)="updateLeadField('facilities', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Source</span>
                <app-inline-edit
                  [value]="selectedLead()!.source"
                  label="Source"
                  placeholder="Add source"
                  (valueChange)="updateLeadField('source', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Industry</span>
                <app-inline-edit
                  [value]="selectedLead()!.industry"
                  label="Industry"
                  placeholder="Add industry"
                  (valueChange)="updateLeadField('industry', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Stage</span>
                <app-inline-edit
                  [value]="selectedLead()!.stage"
                  type="select"
                  [options]="stageOptions"
                  label="Stage"
                  (valueChange)="updateLeadStage($event)"
                ></app-inline-edit>
              </div>
            </div>

            <div class="detail-section">
              <span class="detail-label">Next Action</span>
              <app-inline-edit [value]="selectedLead()!.nextAction" label="Next Action" type="select" [options]="getNextActionOptions()" (valueChange)="updateLeadField('nextAction', $event)"></app-inline-edit>
            </div>

            <div class="detail-section">
              <span class="detail-label">Modules</span>
              <div class="chip-wrap">
                @for (mod of selectedLead()!.modules; track mod) {
                  <span class="badge badge-blue">{{ mod }}</span>
                }
              </div>
            </div>

            @if (selectedLead()!.certifications?.length) {
              <div class="detail-section">
                <span class="detail-label">Certifications</span>
                <div class="chip-wrap">
                  @for (cert of selectedLead()!.certifications; track cert) {
                    <span class="badge badge-cyan">{{ cert }}</span>
                  }
                </div>
              </div>
            }

            <!-- Address -->
            <div class="detail-section">
              <span class="detail-label">Address</span>
              <div class="address-grid">
                <div class="address-field address-full">
                  <label class="field-label">Street</label>
                  <input class="form-input form-input-sm" [value]="getAddress().street || ''" placeholder="Street address" (change)="updateAddress('street', $any($event.target).value)">
                </div>
                <div class="address-field">
                  <label class="field-label">City</label>
                  <input class="form-input form-input-sm" [value]="getAddress().city || ''" placeholder="City" (change)="updateAddress('city', $any($event.target).value)">
                </div>
                <div class="address-field">
                  <label class="field-label">State / Region</label>
                  <input class="form-input form-input-sm" [value]="getAddress().state || ''" placeholder="State" (change)="updateAddress('state', $any($event.target).value)">
                </div>
                <div class="address-field">
                  <label class="field-label">ZIP / Postal</label>
                  <input class="form-input form-input-sm" [value]="getAddress().zip || ''" placeholder="ZIP" (change)="updateAddress('zip', $any($event.target).value)">
                </div>
                <div class="address-field">
                  <label class="field-label">Country</label>
                  <input class="form-input form-input-sm" [value]="getAddress().country || ''" placeholder="Country" (change)="updateAddress('country', $any($event.target).value)">
                </div>
              </div>
            </div>

            <!-- Timezone -->
            <div class="detail-section">
              <span class="detail-label">Time Zone</span>
              <select class="form-select form-select-sm" [value]="selectedLead()!.timezone || ''" (change)="updateLeadField('timezone', $any($event.target).value)">
                <option value="">— Select Time Zone —</option>
                @for (tz of timezones; track tz.value) {
                  <option [value]="tz.value">{{ tz.label }}</option>
                }
              </select>
            </div>

            <!-- Intake & Pipeline Status -->
            <div class="detail-section">
              <span class="detail-label" style="margin-bottom: 8px; display: block;">Pipeline & Intake</span>
              <div class="pipeline-intake-card">
                <div class="pi-row">
                  <span class="pi-label">Pipeline Stage</span>
                  <span class="badge" [class]="'badge-' + getStageColor(selectedLead()!.stage)">{{ selectedLead()!.stage }}</span>
                </div>
                <div class="pi-row">
                  <span class="pi-label">Intake Status</span>
                  <span class="intake-badge" [class]="'intake-' + (selectedLead()!.intakeStatus || 'not_started')">
                    @if ((selectedLead()!.intakeStatus || 'not_started') === 'not_started') { Not Started }
                    @else if (selectedLead()!.intakeStatus === 'in_progress') { In Progress }
                    @else { Completed }
                  </span>
                </div>
                @if (selectedLead()!.intakeUpdatedAt) {
                  <div class="pi-row">
                    <span class="pi-label">Last Intake Update</span>
                    <span class="pi-value">{{ selectedLead()!.intakeUpdatedAt | date:'MMM d, y' }}</span>
                  </div>
                }
                @if (selectedLead()!.stage === 'Intake' && (selectedLead()!.intakeStatus || 'not_started') === 'not_started') {
                  <div class="pi-hint">Intake must be started before advancing to Demo stage.</div>
                }
              </div>
              <button class="btn-intake-link" (click)="openIntake()" style="margin-top: 8px;">
                Open Intake &#8594;
              </button>
            </div>

            <!-- Notes quick-add -->
            <div class="detail-section">
              <span class="detail-label">Notes</span>
              @if (selectedLead()!.notes?.length) {
                @for (note of selectedLead()!.notes | slice:0:2; track note.id) {
                  <div class="note-item">
                    <div class="note-meta">
                      <span class="note-author" [style.color]="teamUtil.getColor(note.author)">{{ note.author }}</span>
                      <span class="note-date">{{ note.createdAt | date:'MMM d, h:mm a' }}</span>
                    </div>
                    <p class="note-content">{{ note.content }}</p>
                  </div>
                }
                <button class="text-link" (click)="slideoverTab.set('notes')">View all {{ selectedLead()!.notes.length }} note{{ selectedLead()!.notes.length !== 1 ? 's' : '' }} &#8594;</button>
              } @else {
                <p class="empty-text">No notes yet.</p>
              }
              <div class="note-input-row">
                <input class="form-input form-input-sm" style="flex:1" placeholder="Add a note..." [(ngModel)]="newNoteText" (keydown.enter)="addNoteToLead()">
                <button class="btn-primary btn-sm" (click)="addNoteToLead()" [disabled]="!newNoteText">Add</button>
              </div>
            </div>
          }

          <!-- ═══ CONTACTS TAB ═══ -->
          @if (slideoverTab() === 'contacts') {
            <div class="contacts-section">
              @if (getContacts().length === 0) {
                <div class="empty-state-sm">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p>No contacts yet</p>
                  <span>Add the first contact for this lead</span>
                </div>
              } @else {
                <div class="contact-list">
                  @for (contact of getContacts(); track contact.id) {
                    <div class="contact-card">
                      <div class="contact-avatar" [style.background]="teamUtil.getColor(contact.name)">
                        {{ contact.name.charAt(0) }}
                      </div>
                      <div class="contact-info">
                        <div class="contact-name-row">
                          <span class="contact-name">{{ contact.name }}</span>
                          @if (contact.isPrimary) {
                            <span class="badge-primary-contact">Primary</span>
                          }
                        </div>
                        @if (contact.role) {
                          <span class="contact-role">{{ contact.role }}</span>
                        }
                        @if (contact.email) {
                          <a class="contact-link" [href]="'mailto:' + contact.email">{{ contact.email }}</a>
                        }
                        @if (contact.phone) {
                          <a class="contact-link" [href]="'tel:' + contact.phone">{{ contact.phone }}</a>
                        }
                      </div>
                      <div class="contact-actions">
                        @if (!contact.isPrimary) {
                          <button class="icon-btn" title="Set as Primary" (click)="setPrimaryContact(contact.id)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          </button>
                        }
                        <button class="icon-btn icon-btn-danger" title="Remove" (click)="removeContact(contact.id)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (!showAddContactForm()) {
                <button class="btn-add-inline" (click)="showAddContactForm.set(true)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Contact
                </button>
              } @else {
                <div class="add-contact-form">
                  <div class="add-contact-form-header">
                    <span class="form-section-title">New Contact</span>
                    <button class="icon-btn" (click)="cancelAddContact()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Full Name <span class="required">*</span></label>
                      <input type="text" class="form-input" [(ngModel)]="newContact.name" placeholder="Full name">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Role / Title</label>
                      <input type="text" class="form-input" [(ngModel)]="newContact.role" placeholder="e.g. VP Operations">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Email</label>
                      <input type="email" class="form-input" [(ngModel)]="newContact.email" placeholder="email@company.com">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Phone</label>
                      <input type="tel" class="form-input" [(ngModel)]="newContact.phone" placeholder="+1 (555) 000-0000">
                    </div>
                  </div>
                  <label class="checkbox-row">
                    <input type="checkbox" [(ngModel)]="newContact.isPrimary">
                    <span>Set as primary contact</span>
                  </label>
                  <div class="form-actions-row">
                    <button class="btn-secondary btn-sm" (click)="cancelAddContact()">Cancel</button>
                    <button class="btn-primary btn-sm" (click)="saveNewContact()" [disabled]="!newContact.name">Save Contact</button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ═══ ACTIVITY TAB (system log only) ═══ -->
          @if (slideoverTab() === 'activity') {
            <div class="activity-section">
              <p class="activity-intro">System-generated events: stage moves, edits, file uploads, contact changes.</p>
              <app-activity-timeline entityType="lead" [entityId]="selectedLead()!.id"></app-activity-timeline>
            </div>
          }

          <!-- ═══ NOTES TAB (user-created) ═══ -->
          @if (slideoverTab() === 'notes') {
            <div class="notes-section">
              @if (selectedLead()!.notes?.length) {
                @for (note of selectedLead()!.notes; track note.id) {
                  <div class="note-item">
                    <div class="note-meta">
                      <span class="note-author" [style.color]="teamUtil.getColor(note.author)">{{ note.author }}</span>
                      <span class="note-date">{{ note.createdAt | date:'MMM d, y, h:mm a' }}</span>
                    </div>
                    <p class="note-content">{{ note.content }}</p>
                  </div>
                }
              } @else {
                <div class="empty-state-sm">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <p>No notes yet</p>
                  <span>Add a note to document conversations and decisions</span>
                </div>
              }
              <div class="note-input-row" style="margin-top: 16px;">
                <input class="form-input form-input-sm" style="flex:1" placeholder="Write a note..." [(ngModel)]="newNoteText" (keydown.enter)="addNoteToLead()">
                <button class="btn-primary btn-sm" (click)="addNoteToLead()" [disabled]="!newNoteText">Add</button>
              </div>
            </div>
          }

          <!-- ═══ ATTACHMENTS TAB ═══ -->
          @if (slideoverTab() === 'attachments') {
            <div class="attachments-section">
              @if (attachmentsLoading()) {
                <div class="empty-state-sm">
                  <p>Loading attachments...</p>
                </div>
              } @else if (loadedAttachments().length === 0 && getAttachments().length === 0) {
                <div class="empty-state-sm">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <p>No attachments yet</p>
                  <span>Upload files, documents, or contracts</span>
                </div>
              } @else {
                <div class="attachment-list">
                  @for (att of (loadedAttachments().length ? loadedAttachments() : getAttachments()); track att.id) {
                    <div class="attachment-item">
                      <div class="attachment-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                          <polyline points="13 2 13 9 20 9"/>
                        </svg>
                      </div>
                      <div class="attachment-info">
                        @if (att.downloadUrl) {
                          <a class="attachment-name attachment-link" [href]="att.downloadUrl" target="_blank" rel="noopener">{{ att.name }}</a>
                        } @else {
                          <span class="attachment-name">{{ att.name }}</span>
                        }
                        <span class="attachment-meta">{{ formatFileSize(att.size) }} &middot; {{ att.addedBy }} &middot; {{ att.addedAt | date:'MMM d' }}</span>
                      </div>
                      @if (att.downloadUrl) {
                        <a class="icon-btn" title="Download" [href]="att.downloadUrl" target="_blank" rel="noopener">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </a>
                      }
                      <button class="icon-btn icon-btn-danger" title="Remove" (click)="removeAttachment(att.id)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
              <input type="file" #attachmentInput multiple (change)="onAttachmentSelected($event)" style="display: none">
              <button class="btn-add-inline" (click)="attachmentInput.click()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                Attach File
              </button>
            </div>
          }

        </div><!-- /slideover-body -->
      </div><!-- /slideover-panel -->
    }

    <!-- Action Modal -->
    @if (showActionModal()) {
      <div class="modal-overlay" (click)="showActionModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ getActionTitle() }}</h2>
            <button class="modal-close-btn" (click)="showActionModal.set(false)">&times;</button>
          </div>
          <div class="modal-body">
            <div class="action-lead-info">
              <span class="lead-company">{{ actionLead()?.company }}</span>
              <span class="lead-contact">{{ actionLead()?.contact }}</span>
            </div>

            @if (actionType() === 'email') {
              <div class="form-group">
                <label class="form-label">To</label>
                <input type="email" class="form-input" [value]="actionLead()?.email" readonly>
              </div>
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input type="text" class="form-input" [(ngModel)]="actionData.subject" placeholder="Email subject">
              </div>
              <div class="form-group">
                <label class="form-label">Message</label>
                <textarea class="form-textarea" rows="5" [(ngModel)]="actionData.content" placeholder="Email content..."></textarea>
              </div>
            }

            @if (actionType() === 'phone') {
              <div class="form-group">
                <label class="form-label">Call Type</label>
                <select class="form-select" [(ngModel)]="actionData.callType">
                  <option value="outbound">Outbound Call</option>
                  <option value="inbound">Inbound Call</option>
                  <option value="missed">Missed Call</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Duration (minutes)</label>
                <input type="number" class="form-input" [(ngModel)]="actionData.duration" placeholder="0">
              </div>
              <div class="form-group">
                <label class="form-label">Call Notes</label>
                <textarea class="form-textarea" rows="4" [(ngModel)]="actionData.content" placeholder="Summary of the call..."></textarea>
              </div>
            }

            @if (actionType() === 'note') {
              <div class="form-group">
                <label class="form-label">Note Type</label>
                <select class="form-select" [(ngModel)]="actionData.noteType">
                  <option value="general">General Note</option>
                  <option value="meeting">Meeting Notes</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="requirement">Requirement</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Note</label>
                <textarea class="form-textarea" rows="5" [(ngModel)]="actionData.content" placeholder="Enter your note..."></textarea>
              </div>
            }

            @if (actionType() === 'reminder') {
              <div class="form-group">
                <label class="form-label">Reminder Title</label>
                <input type="text" class="form-input" [(ngModel)]="actionData.subject" placeholder="What to remember">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input type="date" class="form-input" [(ngModel)]="actionData.reminderDate">
                </div>
                <div class="form-group">
                  <label class="form-label">Time</label>
                  <input type="time" class="form-input" [(ngModel)]="actionData.reminderTime">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Additional Notes</label>
                <textarea class="form-textarea" rows="3" [(ngModel)]="actionData.content" placeholder="Optional details..."></textarea>
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showActionModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="saveAction()">
              {{ actionType() === 'email' ? 'Send Email' : actionType() === 'phone' ? 'Log Call' : actionType() === 'note' ? 'Save Note' : 'Set Reminder' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Direct Email Composer (template-based single-recipient email) -->
    <app-direct-email-composer
      [open]="showDirectEmail()"
      [recipient]="directEmailRecipient()"
      (closed)="closeDirectEmail()"
      (sent)="onDirectEmailSent($event)"
    ></app-direct-email-composer>
  `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .leads-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .toolbar-tabs-row {
      padding: 1rem 1rem 0;
    }

    .entity-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .entity-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .entity-info {
      display: flex;
      flex-direction: column;
    }

    .entity-name {
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .entity-sub {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .owner-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .owner-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .module-chips {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .value-cell {
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .activity-text {
      color: var(--color-gray-500);
    }

    .value-calc {
      margin-top: 8px;
      padding: 8px 12px;
      background: var(--status-green-bg);
      border-radius: var(--radius-md);
      color: var(--status-green-text);
      font-size: 0.875rem;
    }

    .form-hint {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      margin-top: 4px;
    }

    /* Module Selector Accordion */
    .module-selector {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      max-height: 300px;
      overflow-y: auto;
      background: var(--color-surface);
    }
    .module-group { border-bottom: 1px solid var(--color-border); }
    .module-group:last-child { border-bottom: none; }
    .module-group-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; cursor: pointer;
      transition: background 150ms ease;
    }
    .module-group-header:hover { background: var(--color-surface-hover); }
    .module-group-checkbox {
      width: 20px; height: 20px; min-width: 20px;
      border: 2px solid var(--color-gray-300); border-radius: var(--radius-sm);
      background: var(--color-surface); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: white; padding: 0;
      transition: all 150ms ease;
    }
    .module-group-checkbox.checked {
      background: var(--color-primary); border-color: var(--color-primary);
    }
    .module-group-checkbox.partial {
      background: var(--color-primary); border-color: var(--color-primary);
      opacity: 0.7;
    }
    .module-group-info { flex: 1; min-width: 0; }
    .module-group-name {
      font-weight: 600; font-size: 0.875rem;
      color: var(--color-text-primary); display: block;
    }
    .module-group-desc {
      font-size: 0.75rem; color: var(--color-gray-500);
      display: block; margin-top: 1px;
    }
    .module-group-chevron {
      transition: transform 200ms ease; color: var(--color-gray-400);
      flex-shrink: 0;
    }
    .module-group-chevron.expanded { transform: rotate(180deg); }
    .module-sublist {
      padding: 4px 12px 8px 46px;
      display: flex; flex-direction: column; gap: 2px;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-gray);
    }
    .module-sub-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; border-radius: var(--radius-sm);
      cursor: pointer; font-size: 0.8125rem;
      color: var(--color-text-primary);
      min-height: 36px;
      transition: background 150ms ease;
    }
    .module-sub-item:hover { background: var(--color-surface-hover); }
    .module-sub-item input[type="checkbox"] {
      width: 16px; height: 16px; cursor: pointer;
      accent-color: var(--color-primary);
    }
    .selected-tags {
      display: flex; flex-wrap: wrap; gap: 6px;
      margin-top: 8px;
    }
    .selected-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px 3px 10px;
      background: var(--color-primary-light);
      color: var(--color-primary);
      border-radius: var(--radius-full);
      font-size: 0.75rem; font-weight: 500;
    }
    .selected-tag button {
      background: none; border: none; cursor: pointer;
      color: var(--color-primary); font-size: 14px;
      padding: 0 2px; line-height: 1; opacity: 0.7;
    }
    .selected-tag button:hover { opacity: 1; }

    .import-hint {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      margin-bottom: 1rem;
    }

    .import-area {
      font-family: monospace;
      font-size: 0.8125rem;
    }

    .source-label {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      font-style: italic;
    }

    .unassigned-label {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      font-style: italic;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--border-hairline);
      background: var(--color-gray-50);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }

    .pagination-info {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      min-width: 130px;
    }

    .pagination-size {
      font-size: 0.8125rem;
      color: var(--color-gray-400);
      min-width: 80px;
      text-align: right;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .page-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius);
      background: white;
      color: var(--color-gray-600);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--color-gray-100);
      border-color: var(--color-gray-300);
    }

    .page-btn.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
      font-weight: 600;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Slideover styles */
    .detail-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1rem;
    }

    .badge-lg {
      padding: 6px 14px;
      font-size: 0.8125rem;
    }

    .detail-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-gray-900);
      display: inline-flex;
      align-items: center;
    }
    .detail-value app-inline-edit { font-size: 1.5rem; font-weight: 700; }

    .stage-progress {
      display: flex;
      gap: 4px;
      margin-bottom: 1rem;
    }

    .stage-segment {
      flex: 1;
      height: 6px;
      background: var(--color-gray-200);
      border-radius: 3px;
    }

    .stage-segment.active {
      background: var(--color-primary);
    }

    .stage-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 1.5rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
      margin-bottom: 6px;
    }

    .detail-section {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .next-action-box {
      margin-top: 6px;
      padding: 12px;
      background: var(--status-yellow-bg);
      border-radius: var(--radius-md);
      color: var(--status-yellow-text);
      font-weight: 500;
    }

    .notes-text {
      margin: 6px 0 0;
      font-size: 0.875rem;
      color: var(--color-gray-600);
      line-height: 1.5;
    }

    .action-icons {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-500);
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .action-btn:nth-child(1):hover { color: var(--color-info); }
    .action-btn:nth-child(2):hover { color: var(--color-success); }
    .action-btn:nth-child(3):hover { color: var(--color-warning); }
    .action-btn:nth-child(4):hover { color: var(--status-purple-text); }
    .action-btn-danger:hover { background: #FEE2E2 !important; color: #B91C1C !important; }

    .bulk-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #EFF6FF;
      border-bottom: 1px solid #BFDBFE;
    }
    .bulk-count { font-size: 0.875rem; font-weight: 600; color: #1E40AF; }
    .link-btn {
      background: none;
      border: none;
      color: #1E40AF;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: underline;
      cursor: pointer;
      padding: 4px 8px;
      flex: 1;
      text-align: left;
    }
    .link-btn:hover { color: #1E3A8A; }
    .bulk-spacer { margin-left: auto; }
    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: var(--radius);
      background: #DC2626;
      color: white;
      font-weight: 500;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-danger:hover { background: #B91C1C; }

    tr.row-selected { background: #EFF6FF; }
    .slideover-header-actions { display: flex; align-items: center; gap: 8px; }

    .action-lead-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
    }

    .lead-company {
      font-weight: 600;
      font-size: 1rem;
    }

    .lead-contact {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    /* Blinq Button */
    .btn-blinq {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-blinq:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    /* Blinq Modal */
    .blinq-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .blinq-logo {
      flex-shrink: 0;
    }

    .blinq-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .blinq-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--color-gray-50);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .blinq-option:hover {
      background: white;
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }

    .blinq-option-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .blinq-option-icon.camera {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: white;
    }

    .blinq-option-icon.import {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
    }

    .blinq-option-icon.manual {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
    }

    .blinq-option-icon.qr {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: white;
    }

    .qr-camera { position: relative; min-height: 280px; background: #000; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .qr-parsed-fields { display: flex; flex-direction: column; gap: 6px; padding: 10px; background: var(--color-gray-50, #f9fafb); border-radius: var(--radius-md, 6px); border: 1px solid var(--border-hairline, #e5e7eb); }
    .qr-field-row { display: flex; gap: 12px; font-size: 0.8125rem; }
    .qr-field-key { font-weight: 600; color: var(--color-gray-600); min-width: 80px; text-transform: capitalize; }
    .qr-field-value { color: var(--color-gray-800); word-break: break-all; }

    .blinq-option-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .blinq-option-title {
      font-weight: 600;
      font-size: 1rem;
      color: var(--color-gray-900);
    }

    .blinq-option-desc {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .blinq-footer-note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    /* Scan Container */
    .scan-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .camera-preview {
      position: relative;
      width: 100%;
      max-width: 400px;
      aspect-ratio: 1.6;
      background: var(--color-gray-900);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .camera-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--color-gray-400);
    }

    .camera-placeholder span {
      font-size: 0.875rem;
    }

    .scan-frame {
      position: absolute;
      inset: 20px;
      pointer-events: none;
    }

    .scan-corner {
      position: absolute;
      width: 24px;
      height: 24px;
      border: 3px solid var(--color-primary);
    }

    .scan-corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
    .scan-corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
    .scan-corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
    .scan-corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }

    .scanned-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scan-actions {
      display: flex;
      gap: 12px;
    }

    .btn-lg {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 0.9375rem;
    }

    .scan-hint {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      text-align: center;
      max-width: 360px;
    }

    /* Scanning Animation */
    .scanning-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 40px 0;
    }

    .scanning-animation {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
    }

    .scan-line {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 3px;
      background: linear-gradient(90deg, transparent 0%, #6366F1 50%, transparent 100%);
      animation: scan 2s ease-in-out infinite;
    }

    @keyframes scan {
      0%, 100% { top: 10%; opacity: 0.5; }
      50% { top: 85%; opacity: 1; }
    }

    .scanning-text {
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .scanning-progress {
      width: 200px;
      height: 4px;
      background: var(--color-gray-200);
      border-radius: 2px;
      overflow: hidden;
    }

    .scanning-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--color-primary), #8B5CF6);
      border-radius: 2px;
      transition: width 300ms ease;
    }
    .scanning-percent {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-top: 4px;
    }

    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }

    /* Review Container */
    .review-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .extraction-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--status-green-bg);
      color: var(--status-green-text);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
      align-self: flex-start;
    }
    .extraction-badge.warning {
      background: var(--status-yellow-bg);
      color: var(--color-warning);
    }
    .scan-preview-thumb {
      margin-bottom: 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      max-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-gray-100);
    }
    .scan-preview-thumb img {
      max-height: 120px;
      max-width: 100%;
      object-fit: contain;
    }

    /* Blinq Import */
    .blinq-import-container {
      min-height: 300px;
    }

    .blinq-connect {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 20px;
      text-align: center;
    }

    .blinq-connect-icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .blinq-connect-icon svg {
      width: 64px;
      height: 64px;
    }

    .blinq-connect h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-gray-900);
      margin: 0;
    }

    .blinq-connect p {
      font-size: 0.875rem;
      color: var(--color-gray-500);
      max-width: 300px;
      margin: 0;
    }

    .blinq-contacts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .blinq-connected-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--status-green-bg);
      color: var(--status-green-text);
      border-radius: var(--radius);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .blinq-contact-count {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .blinq-contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .blinq-contact-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-gray-50);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .blinq-contact-item:hover {
      background: white;
      border-color: var(--color-gray-300);
    }

    .blinq-contact-item.selected {
      background: rgba(99, 102, 241, 0.08);
      border-color: var(--color-primary);
    }

    .blinq-contact-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-gray-300);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .blinq-contact-item.selected .blinq-contact-checkbox {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }

    .blinq-contact-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .blinq-contact-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .blinq-contact-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-gray-900);
    }

    .blinq-contact-company {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .blinq-contact-date {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      flex-shrink: 0;
    }

    .slideover-wide { width: 600px !important; }

    .slideover-title-row { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

    .slideover-avatar {
      width: 40px; height: 40px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }

    .slideover-title-info { display: flex; flex-direction: column; min-width: 0; }
    .slideover-title-info h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slideover-subtitle { font-size: 0.75rem; color: var(--color-gray-500); }

    .slideover-stage-bar { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-hairline); background: var(--color-gray-50); }

    .slideover-tabs { display: flex; border-bottom: 1px solid var(--border-hairline); background: white; padding: 0 1rem; }

    .slideover-tab {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px;
      border: none; background: none; cursor: pointer; font-size: 0.8125rem;
      font-weight: 500; color: var(--color-gray-500); border-bottom: 2px solid transparent;
      transition: color 0.15s ease; white-space: nowrap;
    }
    .slideover-tab:hover { color: var(--color-gray-700); }
    .slideover-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }

    .tab-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: var(--color-gray-100); color: var(--color-gray-600);
      border-radius: 9px; font-size: 0.6875rem; font-weight: 700;
    }
    .slideover-tab.active .tab-count { background: rgba(37,99,235,0.1); color: var(--color-primary); }

    .slideover-body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; }

    .detail-value-sm { font-size: 0.875rem; font-weight: 500; color: var(--color-gray-800); }
    .detail-sub { font-size: 0.75rem; color: var(--color-gray-500); }
    .empty-text { font-size: 0.8125rem; color: var(--color-gray-400); margin: 0 0 8px; }

    .note-item { padding: 10px 12px; background: var(--color-gray-50); border-radius: var(--radius-md); margin-bottom: 8px; }
    .note-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .note-author { font-size: 0.6875rem; font-weight: 700; }
    .note-date { font-size: 0.6875rem; color: var(--color-gray-400); }
    .note-content { margin: 0; font-size: 0.8125rem; color: var(--color-gray-700); line-height: 1.5; }
    .note-input-row { display: flex; gap: 8px; margin-top: 8px; }

    .text-link { background: none; border: none; padding: 0; font-size: 0.8125rem; color: var(--color-primary); cursor: pointer; margin-bottom: 8px; display: inline-block; }
    .text-link:hover { text-decoration: underline; }

    .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .address-field { display: flex; flex-direction: column; gap: 4px; }
    .address-full { grid-column: 1 / -1; }
    .field-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-gray-400); }
    .form-input-sm { height: 32px; font-size: 0.8125rem; padding: 0 10px; }
    .form-select-sm { height: 32px; font-size: 0.8125rem; padding: 0 10px; margin-top: 6px; }

    .contacts-section, .attachments-section, .activity-section { display: flex; flex-direction: column; gap: 12px; }
    .contact-list, .attachment-list { display: flex; flex-direction: column; gap: 8px; }

    .contact-card {
      display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px;
      background: white; border: 1px solid var(--border-hairline); border-radius: var(--radius-lg);
      transition: box-shadow 0.15s ease;
    }
    .contact-card:hover { box-shadow: var(--shadow-md); }

    .contact-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.875rem; flex-shrink: 0;
    }
    .contact-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .contact-name-row { display: flex; align-items: center; gap: 8px; }
    .contact-name { font-weight: 600; font-size: 0.875rem; color: var(--color-gray-900); }

    .badge-primary-contact {
      display: inline-flex; align-items: center; padding: 1px 7px;
      background: rgba(37,99,235,0.1); color: var(--color-primary);
      border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 700;
    }
    .contact-role { font-size: 0.75rem; color: var(--color-gray-500); }
    .contact-link { font-size: 0.75rem; color: var(--color-primary); text-decoration: none; }
    .contact-link:hover { text-decoration: underline; }
    .contact-actions { display: flex; gap: 4px; flex-shrink: 0; }

    .icon-btn {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: none; background: none; border-radius: var(--radius);
      color: var(--color-gray-400); cursor: pointer; transition: all 0.15s ease;
    }
    .icon-btn:hover { background: var(--color-gray-100); color: var(--color-gray-700); }
    .icon-btn-danger:hover { background: var(--status-red-bg); color: var(--status-red-text); }

    .btn-add-inline {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 14px; border: 1.5px dashed var(--color-gray-300);
      border-radius: var(--radius-md); background: none; color: var(--color-gray-500);
      font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; width: 100%;
    }
    .btn-add-inline:hover { border-color: var(--color-primary); color: var(--color-primary); background: rgba(37,99,235,0.03); }

    .add-contact-form { padding: 16px; background: var(--color-gray-50); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 12px; }
    .add-contact-form-header { display: flex; align-items: center; justify-content: space-between; }
    .form-section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-gray-800); }
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--color-gray-700); cursor: pointer; }
    .checkbox-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--color-primary); }
    .form-actions-row { display: flex; justify-content: flex-end; gap: 8px; }

    .activity-group { border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); overflow: hidden; }
    .activity-group-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--color-gray-50); cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: var(--color-gray-700); user-select: none; transition: background 0.1s ease; }
    .activity-group-header:hover { background: var(--color-gray-100); }
    .chevron { transition: transform 0.2s ease; color: var(--color-gray-400); }
    .chevron.open { transform: rotate(180deg); }
    .activity-group-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }

    .attachment-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: white; border: 1px solid var(--border-hairline); border-radius: var(--radius-md); }
    .attachment-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--color-gray-100); border-radius: var(--radius); color: var(--color-gray-500); flex-shrink: 0; }
    .attachment-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .attachment-name { font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    a.attachment-name { color: var(--color-primary, #2563eb); text-decoration: none; cursor: pointer; }
    a.attachment-name:hover { text-decoration: underline; }
    .attachment-meta { font-size: 0.6875rem; color: var(--color-gray-400); }

    .empty-state-sm { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 2.5rem 1rem; color: var(--color-gray-400); text-align: center; }
    .empty-state-sm p { margin: 0; font-weight: 600; font-size: 0.9375rem; color: var(--color-gray-600); }
    .empty-state-sm span { font-size: 0.8125rem; }

    /* Notes section */
    .notes-section { display: flex; flex-direction: column; gap: 8px; }

    /* Activity intro */
    .activity-intro { font-size: 0.75rem; color: var(--color-gray-400); margin: 0 0 12px; }

    /* Intake section */
    .pipeline-intake-card {
      background: var(--color-gray-50); border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md); padding: 10px 14px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .pi-row { display: flex; align-items: center; justify-content: space-between; }
    .pi-label { font-size: 0.8125rem; color: var(--color-gray-500); }
    .pi-value { font-size: 0.8125rem; color: var(--color-gray-700); }
    .pi-hint { font-size: 0.75rem; color: var(--color-warning); background: var(--status-yellow-bg); padding: 6px 10px; border-radius: var(--radius-sm); margin-top: 2px; }
    .intake-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--color-gray-50); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); }
    .intake-info { display: flex; align-items: center; gap: 8px; }
    .intake-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 700; }
    .intake-not_started { background: var(--color-gray-200); color: var(--color-gray-600); }
    .intake-in_progress { background: var(--color-warning-light); color: #92400E; }
    .intake-completed { background: #D1FAE5; color: #065F46; }
    .intake-updated { font-size: 0.6875rem; color: var(--color-gray-400); }
    .btn-intake-link { padding: 6px 12px; border: 1px solid var(--color-primary); border-radius: var(--radius-md); background: none; color: var(--color-primary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease; }
    .btn-intake-link:hover { background: var(--color-primary); color: white; }

    /* Import modal */
    .import-upload-zone { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 20px; border: 2px dashed var(--color-gray-300); border-radius: var(--radius-lg); background: var(--color-gray-50); transition: border-color 0.15s ease; cursor: pointer; margin-bottom: 16px; }
    .import-upload-zone:hover { border-color: var(--color-primary); }
    .import-upload-zone.has-data { padding: 16px; }
    .import-upload-title { font-weight: 600; font-size: 0.9375rem; color: var(--color-gray-700); margin: 0; }
    .import-upload-sub { font-size: 0.8125rem; color: var(--color-gray-400); margin: 0; text-align: center; }
    .import-file-ready { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; color: var(--status-green-text); }
    .import-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; font-size: 0.75rem; color: var(--color-gray-400); }
    .import-divider::before, .import-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-hairline); }
    .import-errors { padding: 12px; background: var(--status-red-bg); border: 1px solid var(--color-error-light); border-radius: var(--radius-md); font-size: 0.8125rem; color: #9F1239; margin-top: 12px; }
    .import-error-row { margin-top: 4px; }

    .import-results { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .import-result-success { padding: 10px 14px; background: #D1FAE5; border: 1px solid #6EE7B7; border-radius: var(--radius-md); font-size: 0.8125rem; color: #065F46; font-weight: 500; }
    .import-result-errors { padding: 12px 14px; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: var(--radius-md); font-size: 0.8125rem; color: #92400E; }
    .import-error-list { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
    .import-error-detail { display: flex; gap: 8px; padding: 4px 8px; background: rgba(255,255,255,0.5); border-radius: var(--radius); font-size: 0.75rem; }
    .error-row-num { font-weight: 600; min-width: 50px; color: #78350F; }
    .error-company { font-weight: 500; min-width: 120px; }
    .error-msg { color: #92400E; flex: 1; }
    .import-template-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }

    /* ========== MOBILE CARD LIST (hidden on desktop) ========== */
    .mobile-leads-list {
      display: none;
      flex-direction: column;
    }

    .lead-card {
      min-height: 72px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-gray-100);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: background 0.12s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .lead-card:active {
      background: var(--color-gray-50);
    }

    .lead-card-main {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .lead-card-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .lead-card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lead-card-company {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lead-card-sub {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lead-card-badge {
      flex-shrink: 0;
    }

    .lead-card-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 46px;
    }

    .lead-card-value {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-700);
      min-width: 0;
    }

    .lead-card-owner {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--color-gray-600);
      flex: 1;
      min-width: 0;
    }

    .lead-card-activity {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      flex-shrink: 0;
      white-space: nowrap;
    }

    /* ========== MOBILE (≤768px) ========== */
    @media (max-width: 768px) {

      :host {
        overflow: visible;
        min-height: auto;
      }
      .leads-content {
        overflow: visible !important;
        flex: none !important;
      }

      /* Module selector mobile */
      .module-selector { max-height: 220px; }
      .module-group-desc { display: none; }
      .module-sublist { padding-left: 36px; }
      .module-sub-item { min-height: 44px; }

      /* Scan actions mobile */
      .scan-actions { flex-direction: column !important; width: 100%; }
      .scan-actions .btn-lg,
      .scan-actions button { width: 100%; justify-content: center; min-height: 48px; }
      .camera-preview { max-width: 100%; }

      /* --- Content area --- */
      .leads-content {
        padding: 0.75rem 0.75rem;
        gap: 0.75rem;
      }

      /* --- Stats grid: 2×2 on mobile --- */
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      /* --- Table card: remove side padding so cards go edge-to-edge --- */
      .table-card {
        padding: 0;
        overflow: hidden;
      }

      /* --- Hide the desktop table, show mobile cards --- */
      .table-scroll {
        display: none !important;
      }

      .mobile-leads-list {
        display: flex;
      }

      /* --- Pagination bar: stack on mobile --- */
      .pagination-bar {
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 12px;
        justify-content: center;
      }

      .pagination-info,
      .pagination-size {
        width: 100%;
        text-align: center;
        min-width: unset;
      }

      .page-btn {
        min-width: 40px;
        height: 40px;
      }

      /* --- Slideover: full-screen on mobile --- */
      .slideover-panel {
        width: 100% !important;
        max-width: 100% !important;
        height: 100dvh !important;
        top: 0 !important;
        right: 0 !important;
        border-radius: 0 !important;
      }

      .slideover-wide {
        width: 100% !important;
      }

      /* --- Slideover tabs: horizontally scrollable --- */
      .slideover-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        flex-wrap: nowrap;
        padding: 0 0.75rem;
      }

      .slideover-tabs::-webkit-scrollbar {
        display: none;
      }

      .slideover-tab {
        flex-shrink: 0;
        min-height: 44px;
        padding: 10px 12px;
      }

      /* --- Slideover body: a bit less padding --- */
      .slideover-body {
        padding: 1rem;
      }

      /* --- Stage actions become full-width row --- */
      .stage-actions {
        flex-direction: row;
        gap: 8px;
      }

      .stage-actions .btn-secondary,
      .stage-actions .btn-primary {
        flex: 1;
        justify-content: center;
        min-height: 44px;
      }

      /* --- Detail grid: single column on very small screens --- */
      .detail-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      /* --- Header action buttons in app-header become compact --- */
      .btn-blinq.btn-sm,
      .btn-secondary.btn-sm,
      .btn-primary.btn-sm {
        min-height: 40px;
        padding: 8px 12px;
        font-size: 0.8125rem;
      }

      /* --- Address grid: single column on mobile --- */
      .address-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .address-full {
        grid-column: 1;
      }

      /* --- Modal container: full screen on mobile --- */
      .modal-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
        max-height: 92dvh !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
      }

      .modal-overlay {
        align-items: flex-end !important;
      }

      /* --- Modal footer buttons become full-width --- */
      .modal-footer {
        flex-direction: column;
        gap: 8px;
      }

      .modal-footer .btn-primary,
      .modal-footer .btn-secondary {
        width: 100%;
        justify-content: center;
        min-height: 48px;
      }

      /* --- Ensure all tap targets are at least 44px --- */
      .action-btn {
        min-width: 44px;
        min-height: 44px;
        padding: 10px;
      }

      .icon-btn {
        width: 44px;
        height: 44px;
      }

      .btn-intake-link {
        min-height: 44px;
        padding: 10px 14px;
      }
    }
  `]
})
export class LeadsListComponent {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);
  private ocrService = inject(OcrService);

  activeTab = signal<'all' | 'active' | 'won' | 'lost'>('all');
  searchQuery = '';
  showAddModal = signal(false);
  showImportModal = signal(false);
  showBlinqModal = signal(false);
  selectedLeadId = signal<number | null>(null);
  selectedLead = computed(() => {
    const id = this.selectedLeadId();
    if (id == null) return null;
    return this.dataService.leads().find(l => l.id === id) ?? null;
  });
  importData = '';

  // Filter bar config
  leadFilters: FilterConfig[] = [
    {
      key: 'tab',
      label: 'Status',
      type: 'tabs',
      options: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'won', label: 'Won' },
        { value: 'lost', label: 'Lost' },
        { value: 'failed', label: 'Failed' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search leads...'
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: '', label: 'All Priorities' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      defaultValue: ''
    },
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      options: [
        { value: '', label: 'All Sources' },
        { value: 'Website', label: 'Website' },
        { value: 'Manual', label: 'Manual' },
        { value: 'Referral', label: 'Referral' },
        { value: 'Event', label: 'Event' },
        { value: 'LinkedIn', label: 'LinkedIn' },
        { value: 'Cold Outreach', label: 'Cold Outreach' },
        { value: 'World of Coffee 2026', label: 'World of Coffee 2026' },
      ],
      defaultValue: ''
    },
    {
      key: 'value',
      label: 'Deal Value',
      type: 'number-range',
    }
  ];

  filterState: FilterValues = {
    tab: 'all',
    search: '',
    priority: '',
    source: ''
  };

  // Reactivity trigger for plain filterState object
  filterTrigger = signal(0);

  // Pagination
  readonly pageSize = 15;
  currentPage = signal(1);

  // Blinq state
  blinqStep = signal<'initial' | 'scan' | 'scanning' | 'review' | 'import' | 'qr-scan' | 'qr-review'>('initial');
  scannedImageUrl = signal<string | null>(null);
  blinqConnected = signal(false);
  selectedBlinqContacts = signal<string[]>([]);

  // OCR state
  ocrProgress = signal(0);
  ocrError = signal<string | null>(null);
  ocrFieldsExtracted = signal<string[]>([]);

  scannedContact = {
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    owner: (this.authService.user()?.name ?? 'User'),
    source: 'Business Card Scan',
    notes: ''
  };

  // QR scan state
  qrRawData = signal<string | null>(null);
  qrParsedData = signal<Record<string, any> | null>(null);
  qrScanError = signal<string | null>(null);
  qrSaving = signal(false);
  qrSource = '';
  qrNotes = '';
  private qrStream: MediaStream | null = null;

  // Blinq contacts (would come from API when connected)
  blinqContacts = signal<{ id: string; name: string; title: string; company: string; email: string; phone: string; scannedAt: string }[]>([
  ]);

  // Action modal state
  showActionModal = signal(false);
  actionLead = signal<Lead | null>(null);
  actionType = signal<'email' | 'phone' | 'note' | 'reminder'>('email');
  actionData = {
    subject: '',
    content: '',
    callType: 'outbound',
    duration: 0,
    noteType: 'general',
    reminderDate: '',
    reminderTime: ''
  };

  get team() { return this.dataService.team(); }
  modules = ALL_MODULES;
  industries = INDUSTRIES;
  sources = SOURCES;
  pipelineStages = PIPELINE_STAGES;
  stageOptions = PIPELINE_STAGES.map(s => ({ value: s, label: s }));

  // Grouped module selector
  catModules = CAT_MODULES;
  catModuleKeys = Object.keys(CAT_MODULES) as (keyof typeof CAT_MODULES)[];
  expandedModuleGroups = signal<Set<string>>(new Set());
  newLeadSubModules: Record<string, string[]> = {};

  private readonly moduleKeyToPriceKey: Record<string, string> = {
    'CAT-I.AI': 'CAT-I',
    'CAT-MES': 'CAT-MES',
    'CAT-QT': 'CAT-QT',
    'CAT-SCAN': 'CAT-SCAN',
    'CAT-iLOG': 'CAT-ALOG'
  };

  newLeadValue: number | null = null;

  newLead = {
    company: '',
    contact: '',
    title: '',
    email: '',
    industry: '',
    owner: (this.authService.user()?.name ?? 'User'),
    modules: [] as string[],
    source: 'Website',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
    preferredDate: '',
    preferredTime: ''
  };

  filteredLeads = computed(() => {
    this.filterTrigger(); // track filter changes (plain object reactivity)
    const tab = this.filterState['tab'] || 'all';
    const search = (this.filterState['search'] || '').toLowerCase();
    const priority = this.filterState['priority'] || '';
    const source = this.filterState['source'] || '';
    const valueMin = this.filterState['value_min'] ? Number(this.filterState['value_min']) : null;
    const valueMax = this.filterState['value_max'] ? Number(this.filterState['value_max']) : null;

    let leads: Lead[];
    switch (tab) {
      case 'active':
        leads = this.dataService.activeLeads();
        break;
      case 'won':
        leads = this.dataService.wonLeads();
        break;
      case 'lost':
        leads = this.dataService.lostLeads();
        break;
      case 'failed':
        leads = this.dataService.failedLeads();
        break;
      default:
        leads = this.dataService.operationalLeads();
    }

    if (search) {
      leads = leads.filter(l => {
        const notesText = Array.isArray(l.notes)
          ? l.notes.map((n: any) => n.content || '').join(' ').toLowerCase()
          : (l.notes as string || '').toLowerCase();
        return (
          l.company.toLowerCase().includes(search) ||
          l.contact.toLowerCase().includes(search) ||
          l.email.toLowerCase().includes(search) ||
          l.owner.toLowerCase().includes(search) ||
          notesText.includes(search)
        );
      });
    }

    if (priority) {
      leads = leads.filter(l => l.priority === priority);
    }

    if (source) {
      leads = leads.filter(l => l.source === source);
    }

    if (valueMin != null) {
      leads = leads.filter(l => l.value >= valueMin);
    }
    if (valueMax != null) {
      leads = leads.filter(l => l.value <= valueMax);
    }

    return leads;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLeads().length / this.pageSize)));

  pagedLeads = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredLeads().slice(start, start + this.pageSize);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  goToPage(page: number) {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  minVal(a: number, b: number): number {
    return Math.min(a, b);
  }

  onFilterChange(values: FilterValues) {
    this.filterState = { ...values };
    this.filterTrigger.update(v => v + 1);
    this.currentPage.set(1);
  }

  getStageColor(stage: PipelineStage): string {
    return STAGE_COLORS[stage]?.badge || 'gray';
  }

  getStageIndex(stage: PipelineStage): number {
    return PIPELINE_STAGES.indexOf(stage);
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  }

  toggleModuleGroup(key: string) {
    const set = new Set(this.expandedModuleGroups());
    if (set.has(key)) { set.delete(key); } else { set.add(key); }
    this.expandedModuleGroups.set(set);
  }

  toggleSubModule(groupKey: string, subModule: string) {
    if (!this.newLeadSubModules[groupKey]) this.newLeadSubModules[groupKey] = [];
    const arr = this.newLeadSubModules[groupKey];
    const idx = arr.indexOf(subModule);
    if (idx === -1) { arr.push(subModule); } else { arr.splice(idx, 1); }
    this.recomputeModules();
  }

  toggleGroupAll(key: string) {
    const subs = (CAT_MODULES as any)[key]?.subModules as string[] || [];
    if (this.isGroupFullySelected(key)) {
      this.newLeadSubModules[key] = [];
    } else {
      this.newLeadSubModules[key] = [...subs];
    }
    this.recomputeModules();
  }

  isGroupSelected(key: string): boolean {
    return (this.newLeadSubModules[key]?.length || 0) > 0;
  }

  isGroupFullySelected(key: string): boolean {
    const subs = (CAT_MODULES as any)[key]?.subModules as string[] || [];
    return subs.length > 0 && (this.newLeadSubModules[key]?.length || 0) === subs.length;
  }

  getSelectedSubModuleTags(): { group: string; sub: string }[] {
    const tags: { group: string; sub: string }[] = [];
    for (const key of this.catModuleKeys) {
      for (const sub of (this.newLeadSubModules[key] || [])) {
        tags.push({ group: key, sub });
      }
    }
    return tags;
  }

  removeSubModuleTag(group: string, sub: string) {
    this.toggleSubModule(group, sub);
  }

  private recomputeModules() {
    this.newLead.modules = [];
    for (const key of this.catModuleKeys) {
      if ((this.newLeadSubModules[key]?.length || 0) > 0) {
        const priceKey = this.moduleKeyToPriceKey[key] || key;
        if (!this.newLead.modules.includes(priceKey)) {
          this.newLead.modules.push(priceKey);
        }
      }
    }
  }

  calculateNewLeadValue(): number {
    if (this.newLead.modules.length === 5) return MODULE_PRICES['Full Platform'] || 72000;
    return this.newLead.modules.reduce((sum, mod) => sum + (MODULE_PRICES[mod] || 0), 0);
  }

  addLead() {
    // Build notes content with scheduling info
    let noteContent = (this.newLead.notes || '').trim();
    if (this.newLead.preferredDate || this.newLead.preferredTime) {
      const sched = [this.newLead.preferredDate, this.newLead.preferredTime].filter(Boolean).join(' — ');
      noteContent = noteContent ? `${noteContent}\n\nPreferred demo: ${sched}` : `Preferred demo: ${sched}`;
    }

    const initialNotes = noteContent
      ? [{ id: 1, author: this.newLead.owner || (this.authService.user()?.name ?? 'User'), content: noteContent, createdAt: new Date().toISOString() }]
      : [];

    this.dataService.addLead({
      company: this.newLead.company,
      contact: this.newLead.contact,
      title: this.newLead.title,
      stage: 'Discovery',
      value: this.newLeadValue ?? this.calculateNewLeadValue(),
      modules: this.newLead.modules,
      certifications: [],
      facilities: 1,
      owner: this.newLead.owner,
      priority: this.newLead.priority,
      lastActivity: 'Just now',
      nextAction: 'Send intro email',
      source: this.newLead.source,
      notes: initialNotes,
      industry: this.newLead.industry,
      email: this.newLead.email,
      phone: '',
      expansions: [],
      probability: STAGE_PROBABILITIES['Discovery']
    });

    this.showAddModal.set(false);
    this.newLeadValue = null;
    this.newLead = {
      company: '',
      contact: '',
      title: '',
      email: '',
      industry: '',
      owner: (this.authService.user()?.name ?? 'User'),
      modules: [],
      source: 'Website',
      priority: 'medium',
      notes: '',
      preferredDate: '',
      preferredTime: ''
    };
    this.newLeadSubModules = {};
    this.expandedModuleGroups.set(new Set());
  }

  // ─── Import state ───
  importErrors: string[] = [];
  importRowCount = 0;

  onImportDataChange() {
    this.validateImportData();
  }

  validateImportData() {
    this.importErrors = [];
    this.importRowCount = 0;
    const text = this.importData.trim();
    if (!text) return;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      this.importErrors = ['File must have a header row and at least one data row.'];
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
    const companyIdx = headers.findIndex(h => h.includes('company'));
    if (companyIdx === -1) {
      this.importErrors = ['Missing required column: "Company Name" or "Company".'];
      return;
    }
    let rowsWithErrors = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (!values[companyIdx]?.trim()) {
        rowsWithErrors++;
      }
    }
    this.importRowCount = lines.length - 1;
    if (rowsWithErrors > 0) {
      this.importErrors = [`${rowsWithErrors} row(s) are missing Company Name and will be skipped.`];
    }
  }

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;
    const file = input.files[0];
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      this.importErrors = ['Please upload a .csv file. For Excel files: File → Save As → CSV.'];
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.importData = (e.target?.result as string) || '';
      this.validateImportData();
    };
    reader.readAsText(file);
    input.value = '';
  }

  onImportFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.importData = (e.target?.result as string) || '';
      this.validateImportData();
    };
    reader.readAsText(file);
  }

  clearImportData() {
    this.importData = '';
    this.importErrors = [];
    this.importRowCount = 0;
  }

  closeImportModal() {
    this.showImportModal.set(false);
    this.clearImportData();
    this.importResults.set(null);
    this.importSaving.set(false);
  }

  downloadImportTemplate() {
    const headers = 'Company Name,Industry,Contact Name,Contact Title,Contact Email,Contact Phone,Street,City,State / Region,ZIP,Country,Timezone,Source,Priority,Modules (semicolons)';
    const example = 'Sunrise Bakery Group,Food & Beverage,Jennifer Walsh,Director of QA,jwalsh@sunrisebakery.com,+1 555-123-4567,123 Main St,Chicago,IL,60601,USA,America/Chicago,Referral,medium,MES Core;Scheduling';
    const csv = headers + '\n' + example;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cat-i-leads-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  importSaving = signal(false);
  importResults = signal<{ imported: number; skipped: { row: number; company: string; error: string }[] } | null>(null);

  async importLeads() {
    const lines = this.importData.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return;

    this.importSaving.set(true);
    this.importResults.set(null);

    const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));

    // Flexible column mapping
    const col = (keywords: string[]) => rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));

    const colCompany = col(['company']);
    const colIndustry = col(['industry']);
    const colContact = col(['contact name', 'contact']);
    const colTitle = col(['title', 'role']);
    const colEmail = col(['email']);
    const colPhone = col(['phone']);
    const colStreet = col(['street', 'address']);
    const colCity = col(['city']);
    const colState = col(['state', 'region']);
    const colZip = col(['zip', 'postal']);
    const colCountry = col(['country']);
    const colTimezone = col(['timezone', 'time zone']);
    const colSource = col(['source']);
    const colPriority = col(['priority']);
    const colModules = col(['module']);

    let imported = 0;
    const skipped: { row: number; company: string; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const v = this.parseCSVLine(lines[i]);
      const company = colCompany >= 0 ? v[colCompany] : '';
      if (!company) {
        skipped.push({ row: i + 1, company: '(empty)', error: 'Missing company name' });
        continue;
      }

      const contactName = colContact >= 0 ? v[colContact] : '';
      const contactEmail = colEmail >= 0 ? v[colEmail] : '';
      const contactPhone = colPhone >= 0 ? v[colPhone] : '';
      const contactTitle = colTitle >= 0 ? v[colTitle] : '';
      const modulesRaw = colModules >= 0 ? v[colModules] : '';
      const modules = modulesRaw ? modulesRaw.split(';').map(m => m.trim()).filter(Boolean) : [];

      const address: any = {};
      if (colStreet >= 0 && v[colStreet]) address.street = v[colStreet];
      if (colCity >= 0 && v[colCity]) address.city = v[colCity];
      if (colState >= 0 && v[colState]) address.state = v[colState];
      if (colZip >= 0 && v[colZip]) address.zip = v[colZip];
      if (colCountry >= 0 && v[colCountry]) address.country = v[colCountry];

      const contacts = contactName ? [{
        id: 1, name: contactName, role: contactTitle,
        email: contactEmail, phone: contactPhone, isPrimary: true
      }] : undefined;

      try {
        await this.dataService.addLeadAsync({
          company,
          contact: contactName,
          title: contactTitle,
          stage: 'Discovery',
          value: 36000,
          modules: modules.length ? modules : [],
          certifications: [],
          facilities: 1,
          owner: (this.authService.user()?.name ?? 'User'),
          priority: (colPriority >= 0 && ['high','medium','low'].includes(v[colPriority])) ? v[colPriority] as any : 'medium',
          lastActivity: 'Just now',
          nextAction: 'Review imported lead',
          source: colSource >= 0 && v[colSource] ? v[colSource] : 'CSV Import',
          notes: [],
          industry: colIndustry >= 0 ? v[colIndustry] : '',
          email: contactEmail,
          phone: contactPhone,
          expansions: [],
          probability: STAGE_PROBABILITIES['Discovery'],
          contacts,
          address: Object.keys(address).length ? address : undefined,
          timezone: colTimezone >= 0 ? v[colTimezone] : undefined,
        });
        imported++;
      } catch (err: any) {
        skipped.push({
          row: i + 1,
          company,
          error: err?.error?.error || err?.message || 'Server error',
        });
      }
    }

    this.importSaving.set(false);

    if (skipped.length > 0) {
      this.importResults.set({ imported, skipped });
    } else {
      this.closeImportModal();
    }
  }

  selectLead(lead: Lead) {
    this.selectedLeadId.set(lead.id);
    this.slideoverTab.set('overview');
    this.showAddContactForm.set(false);
    this.newContact = { name: '', role: '', email: '', phone: '', isPrimary: false };
    this.openGroups = new Set(['timeline']);
  }

  // ─── Intake integration ───
  openIntake() {
    this.router.navigate(['/intake/mes/admin']);
  }

  advanceStage(direction: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    const currentIndex = PIPELINE_STAGES.indexOf(lead.stage);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      // Use moveLeadToStage — handles probability, SLA reset, and Closed Won → Customer auto-conversion
      this.dataService.moveLeadToStage(lead.id, PIPELINE_STAGES[newIndex]);
  
    }
  }

  getNextActionOptions(): { value: string; label: string }[] {
    const stage = this.selectedLead()?.stage || 'Discovery';
    const actions = STAGE_NEXT_ACTIONS[stage] || STAGE_NEXT_ACTIONS['Discovery'];
    const opts = actions.map(a => ({ value: a, label: a }));
    const current = this.selectedLead()?.nextAction;
    if (current && !actions.includes(current)) {
      opts.unshift({ value: current, label: current });
    }
    return opts;
  }

  updateLeadField(field: string, value: any) {
    const lead = this.selectedLead();
    if (!lead) return;
    this.dataService.updateLead(lead.id, { [field]: value });
  }

  updateLeadStage(newStage: string) {
    const lead = this.selectedLead();
    if (!lead || lead.stage === newStage) return;
    // Use move-stage endpoint so probability updates, activity is logged,
    // and lead is auto-converted to customer on Closed Won
    this.dataService.moveLeadToStage(lead.id, newStage as PipelineStage);
  }

  async deleteLead(lead: Lead) {
    if (lead.convertedToCustomer) {
      alert(`"${lead.company}" has been converted to a customer. Delete the customer record first.`);
      return;
    }
    if (!confirm(`Delete lead "${lead.company}"? This cannot be undone.`)) return;
    try {
      await this.dataService.deleteLead(lead.id);
      this.selectedLeadIds.update(ids => { const s = new Set(ids); s.delete(lead.id); return s; });
      if (this.selectedLeadId() === lead.id) this.selectedLeadId.set(null);
    } catch (err: any) {
      alert(err?.error?.error || 'Failed to delete lead.');
    }
  }

  // ─── Multi-select ───
  selectedLeadIds = signal<Set<number>>(new Set());

  isLeadSelected(id: number): boolean {
    return this.selectedLeadIds().has(id);
  }

  toggleLeadSelection(id: number, event?: Event) {
    event?.stopPropagation();
    this.selectedLeadIds.update(ids => {
      const s = new Set(ids);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  toggleAllOnPage(event: Event) {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    const pageIds = this.pagedLeads().map(l => l.id);
    this.selectedLeadIds.update(ids => {
      const s = new Set(ids);
      if (checked) pageIds.forEach(i => s.add(i));
      else pageIds.forEach(i => s.delete(i));
      return s;
    });
  }

  selectAllMatching() {
    const allIds = this.filteredLeads().map(l => l.id);
    this.selectedLeadIds.set(new Set(allIds));
  }

  allOnPageSelected = computed(() => {
    const page = this.pagedLeads();
    if (page.length === 0) return false;
    const selected = this.selectedLeadIds();
    return page.every(l => selected.has(l.id));
  });

  hasMorePagesToSelect = computed(() => {
    const total = this.filteredLeads().length;
    const selected = this.selectedLeadIds().size;
    return this.allOnPageSelected() && selected < total;
  });

  clearSelection() {
    this.selectedLeadIds.set(new Set());
  }

  async deleteSelected() {
    const ids = Array.from(this.selectedLeadIds());
    if (ids.length === 0) return;

    const leads = this.dataService.leads().filter(l => ids.includes(l.id));
    const converted = leads.filter(l => l.convertedToCustomer);
    const deletable = leads.filter(l => !l.convertedToCustomer);

    if (deletable.length === 0) {
      alert('All selected leads are converted to customers. Delete the customer records first.');
      return;
    }
    const extraNote = converted.length > 0
      ? `\n\n${converted.length} converted lead${converted.length === 1 ? '' : 's'} will be skipped.`
      : '';
    if (!confirm(`Delete ${deletable.length} lead${deletable.length === 1 ? '' : 's'}? This cannot be undone.${extraNote}`)) return;

    const failures: string[] = [];
    for (const lead of deletable) {
      try {
        await this.dataService.deleteLead(lead.id);
      } catch (err: any) {
        failures.push(`${lead.company}: ${err?.error?.error || 'failed'}`);
      }
    }
    this.clearSelection();
    // Refresh from server to guarantee state is in sync — defends against
    // silent drift if any optimistic update missed
    this.dataService.refreshLeads();
    if (failures.length > 0) {
      alert(`Some deletions failed:\n\n${failures.join('\n')}`);
    }
  }

  router = inject(Router);

  // ─── Slideover tab state ───
  slideoverTab = signal<'overview' | 'contacts' | 'attachments' | 'activity' | 'notes'>('overview');

  // ─── Attachments with download URLs ───
  loadedAttachments = signal<LeadAttachment[]>([]);
  attachmentsLoading = signal(false);

  async loadAttachments() {
    const lead = this.selectedLead();
    if (!lead) return;
    this.attachmentsLoading.set(true);
    try {
      const atts = await this.dataService.getAttachments(lead.id);
      this.loadedAttachments.set(atts);
    } finally {
      this.attachmentsLoading.set(false);
    }
  }

  // ─── Add Contact form ───
  showAddContactForm = signal(false);
  newContact = { name: '', role: '', email: '', phone: '', isPrimary: false };

  // ─── Collapsible activity groups ───
  openGroups = new Set<string>(['notes', 'timeline']);

  toggleActivityGroup(key: string) {
    if (this.openGroups.has(key)) {
      this.openGroups.delete(key);
    } else {
      this.openGroups.add(key);
    }
  }

  isGroupOpen(key: string): boolean {
    return this.openGroups.has(key);
  }

  // ─── IANA Time Zones ───
  timezones = [
    { value: 'America/New_York',     label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago',      label: 'Central Time (US & Canada)' },
    { value: 'America/Denver',       label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles',  label: 'Pacific Time (US & Canada)' },
    { value: 'America/Phoenix',      label: 'Arizona (no DST)' },
    { value: 'America/Anchorage',    label: 'Alaska' },
    { value: 'Pacific/Honolulu',     label: 'Hawaii' },
    { value: 'America/Toronto',      label: 'Toronto (Eastern Canada)' },
    { value: 'America/Vancouver',    label: 'Vancouver (Pacific Canada)' },
    { value: 'America/Mexico_City',  label: 'Mexico City' },
    { value: 'America/Sao_Paulo',    label: 'Brasília (Brazil)' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
    { value: 'Europe/London',        label: 'London (GMT/BST)' },
    { value: 'Europe/Paris',         label: 'Paris / Berlin / Madrid (CET)' },
    { value: 'Europe/Helsinki',      label: 'Helsinki / Kyiv (EET)' },
    { value: 'Europe/Moscow',        label: 'Moscow (MSK)' },
    { value: 'Africa/Cairo',         label: 'Cairo (EET)' },
    { value: 'Africa/Johannesburg',  label: 'Johannesburg (SAST)' },
    { value: 'Asia/Dubai',           label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata',         label: 'India (IST)' },
    { value: 'Asia/Dhaka',           label: 'Dhaka (BST)' },
    { value: 'Asia/Bangkok',         label: 'Bangkok / Jakarta (ICT)' },
    { value: 'Asia/Shanghai',        label: 'Beijing / Shanghai (CST)' },
    { value: 'Asia/Singapore',       label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo',           label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul',           label: 'Seoul (KST)' },
    { value: 'Australia/Sydney',     label: 'Sydney (AEST)' },
    { value: 'Australia/Adelaide',   label: 'Adelaide (ACST)' },
    { value: 'Pacific/Auckland',     label: 'Auckland (NZST)' },
  ];

  // ─── Contacts helpers ───
  getContacts(): LeadContact[] {
    return this.selectedLead()?.contacts ?? [];
  }

  getPrimaryContact(): LeadContact | undefined {
    const contacts = this.getContacts();
    return contacts.find(c => c.isPrimary) ?? contacts[0];
  }

  saveNewContact() {
    const lead = this.selectedLead();
    if (!lead || !this.newContact.name) return;
    const contacts: LeadContact[] = [...(lead.contacts ?? [])];
    const newId = contacts.length > 0 ? Math.max(...contacts.map(c => c.id)) + 1 : 1;
    const contact: LeadContact = { id: newId, ...this.newContact };
    if (contact.isPrimary) {
      contacts.forEach(c => c.isPrimary = false);
    }
    contacts.push(contact);
    this.dataService.updateLead(lead.id, { contacts });
    // Part 6: log contact addition in activity
    this.dataService.logContact(lead.id, 'general', `Added contact: ${contact.name}${contact.role ? ' (' + contact.role + ')' : ''}`, (this.authService.user()?.name ?? 'User'));

    this.cancelAddContact();
  }

  cancelAddContact() {
    this.showAddContactForm.set(false);
    this.newContact = { name: '', role: '', email: '', phone: '', isPrimary: false };
  }

  setPrimaryContact(contactId: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    const contacts = (lead.contacts ?? []).map(c => ({ ...c, isPrimary: c.id === contactId }));
    this.dataService.updateLead(lead.id, { contacts });

  }

  removeContact(contactId: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    const contacts = (lead.contacts ?? []).filter(c => c.id !== contactId);
    this.dataService.updateLead(lead.id, { contacts });

  }

  // ─── Address helpers ───
  getAddress(): LeadAddress {
    return this.selectedLead()?.address ?? {};
  }

  updateAddress(field: keyof LeadAddress, value: string) {
    const lead = this.selectedLead();
    if (!lead) return;
    const address: LeadAddress = { ...(lead.address ?? {}), [field]: value };
    this.dataService.updateLead(lead.id, { address });

  }

  // ─── Attachments helpers ───
  getAttachments(): LeadAttachment[] {
    return this.selectedLead()?.attachments ?? [];
  }

  async onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const lead = this.selectedLead();
    if (!lead) return;

    for (const file of Array.from(input.files)) {
      await this.dataService.uploadAttachment(lead.id, file);
    }

    input.value = '';
    await this.loadAttachments();
  }

  async removeAttachment(attachmentId: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    await this.dataService.deleteAttachment(lead.id, attachmentId);
    await this.loadAttachments();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Notes
  newNoteText = '';
  addNoteToLead() {
    const lead = this.selectedLead();
    if (!lead || !this.newNoteText.trim()) return;
    this.dataService.addNote(lead.id, (this.authService.user()?.name ?? 'User'), this.newNoteText.trim());
    this.newNoteText = '';

  }

  onQuickAttach(lead: Lead, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const attachments: LeadAttachment[] = [...(lead.attachments ?? [])];
    let nextId = attachments.length > 0 ? Math.max(...attachments.map((a: LeadAttachment) => a.id)) + 1 : 1;
    const fileNames: string[] = [];
    Array.from(input.files).forEach(file => {
      attachments.push({ id: nextId++, name: file.name, size: file.size, type: file.type, addedAt: new Date().toISOString(), addedBy: (this.authService.user()?.name ?? 'User') });
      fileNames.push(file.name);
    });
    this.dataService.updateLead(lead.id, { attachments });
    this.dataService.logContact(lead.id, 'general', `Attached: ${fileNames.join(', ')}`, (this.authService.user()?.name ?? 'User'));
    input.value = '';
  }

  // Action modal methods
  // ─── Direct Email Composer ───
  showDirectEmail = signal(false);
  directEmailLead = signal<Lead | null>(null);

  directEmailRecipient = computed(() => {
    const l = this.directEmailLead();
    if (!l) return null;
    return { email: l.email, contactName: l.contact, company: l.company };
  });

  closeDirectEmail() {
    this.showDirectEmail.set(false);
    this.directEmailLead.set(null);
  }

  onDirectEmailSent(payload: { to: string; subject: string; templateId: string; templateName: string; from: string }) {
    const lead = this.directEmailLead();
    if (lead) {
      this.dataService.updateLead(lead.id, { lastActivity: 'Just now' });
    }
    this.closeDirectEmail();
  }

  openActionModal(lead: Lead, type: 'email' | 'phone' | 'note' | 'reminder') {
    // Email uses the template-based direct composer instead of the basic form
    if (type === 'email') {
      if (!lead.email) {
        alert(`${lead.company} does not have an email address yet. Add one before sending.`);
        return;
      }
      this.directEmailLead.set(lead);
      this.showDirectEmail.set(true);
      return;
    }
    this.actionLead.set(lead);
    this.actionType.set(type);
    this.actionData = {
      subject: '',
      content: '',
      callType: 'outbound',
      duration: 0,
      noteType: 'general',
      reminderDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reminderTime: '09:00'
    };
    this.showActionModal.set(true);
  }

  getActionTitle(): string {
    const titles = {
      email: 'Send Email',
      phone: 'Log Phone Call',
      note: 'Add Note',
      reminder: 'Set Reminder'
    };
    return titles[this.actionType()];
  }

  saveAction() {
    const lead = this.actionLead();
    if (!lead) return;

    const type = this.actionType();

    // Log the contact activity
    this.dataService.logContact(
      lead.id,
      type,
      this.actionData.content || this.actionData.subject || `${type} logged`,
      (this.authService.user()?.name ?? 'User')
    );

    // If it's an email, open Gmail compose
    if (type === 'email' && lead.email) {
      this.openGmailCompose(lead.email, this.actionData.subject, this.actionData.content);
    }

    // If it's a reminder, also add a calendar event
    if (type === 'reminder' && this.actionData.reminderDate) {
      this.dataService.addCalendarEvent({
        title: this.actionData.subject || `Follow up with ${lead.company}`,
        date: this.actionData.reminderDate,
        time: this.actionData.reminderTime ? new Date(`2000-01-01T${this.actionData.reminderTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
        type: 'reminder',
        description: this.actionData.content,
        relatedTo: { type: 'lead', id: lead.id, name: lead.company },
        assignee: (this.authService.user()?.name ?? 'User')
      });
    }

    this.showActionModal.set(false);
  }

  // Open Gmail compose
  openGmailCompose(email: string, subject?: string, body?: string) {
    const params = new URLSearchParams();
    if (subject) params.set('su', subject);
    if (body) params.set('body', body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${params.toString() ? '&' + params.toString() : ''}`;
    window.open(gmailUrl, '_blank');
  }

  // Blinq methods
  closeBlinqModal() {
    this.showBlinqModal.set(false);
    this.resetBlinqState();
  }

  resetBlinqState() {
    this.blinqStep.set('initial');
    this.scannedImageUrl.set(null);
    this.selectedBlinqContacts.set([]);
    this.ocrProgress.set(0);
    this.ocrError.set(null);
    this.ocrFieldsExtracted.set([]);
    this.scannedContact = {
      name: '',
      title: '',
      company: '',
      email: '',
      phone: '',
      industry: '',
      owner: (this.authService.user()?.name ?? 'User'),
      source: 'Business Card Scan',
      notes: ''
    };
    this.stopQrScan();
    this.qrRawData.set(null);
    this.qrParsedData.set(null);
    this.qrScanError.set(null);
    this.qrSaving.set(false);
    this.qrSource = '';
    this.qrNotes = '';
  }

  startScan() {
    this.blinqStep.set('scan');
  }

  showBlinqImport() {
    this.blinqStep.set('import');
  }

  showManualEntry() {
    this.scannedContact.source = 'Manual Entry';
    this.blinqStep.set('review');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.scannedImageUrl.set(e.target?.result as string);
    };
    reader.onerror = () => {
      console.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected (fixes retake)
    input.value = '';
  }

  async processScan() {
    const imageUrl = this.scannedImageUrl();
    if (!imageUrl) return;

    this.blinqStep.set('scanning');
    this.ocrProgress.set(0);
    this.ocrError.set(null);

    try {
      const result = await this.ocrService.extractFromImage(imageUrl, (progress) => {
        this.ocrProgress.set(progress);
      });

      this.scannedContact = {
        name: result.name,
        title: result.title,
        company: result.company,
        email: result.email,
        phone: result.phone,
        industry: '',
        owner: (this.authService.user()?.name ?? 'User'),
        source: 'Business Card Scan',
        notes: ''
      };
      this.ocrFieldsExtracted.set(result.extractedFields);

      const structuredFields = ['email', 'phone', 'website'].filter(f => result.extractedFields.includes(f));
      if (result.extractedFields.length === 0) {
        this.ocrError.set('Could not read text from this image. You can enter details manually.');
      } else if (result.confidence < 40 && structuredFields.length < 2) {
        this.ocrError.set('Partial extraction — please review and correct before saving.');
      }
    } catch (err) {
      console.error('OCR failed:', err);
      this.ocrError.set('Failed to process image. You can enter details manually.');
      this.scannedContact = {
        name: '', title: '', company: '', email: '', phone: '',
        industry: '', owner: (this.authService.user()?.name ?? 'User'), source: 'Business Card Scan', notes: ''
      };
      this.ocrFieldsExtracted.set([]);
    }

    this.blinqStep.set('review');
  }

  importScannedContact() {
    const newLead = this.dataService.addLead({
      company: this.scannedContact.company || 'Unknown Company',
      contact: this.scannedContact.name || 'Unknown Contact',
      title: this.scannedContact.title,
      stage: 'Discovery',
      value: 36000,
      modules: ['CAT-I'],
      certifications: [],
      facilities: 1,
      owner: this.scannedContact.owner,
      priority: 'medium',
      lastActivity: 'Just now',
      nextAction: 'Send intro email',
      source: this.scannedContact.source,
      notes: this.scannedContact.notes ? [{ id: 1, author: this.scannedContact.owner || (this.authService.user()?.name ?? 'User'), content: this.scannedContact.notes, createdAt: new Date().toISOString() }] : [],
      industry: this.scannedContact.industry,
      email: this.scannedContact.email,
      phone: this.scannedContact.phone,
      expansions: [],
      probability: STAGE_PROBABILITIES['Discovery']
    });

    // Attach scanned business card image to the new lead
    const imageUrl = this.scannedImageUrl();
    if (imageUrl && newLead) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const imageSize = Math.round(imageUrl.length * 0.75); // estimate from base64
      const attachment: LeadAttachment = {
        id: 1,
        name: `business-card-scan-${timestamp}.jpg`,
        size: imageSize,
        type: 'image/jpeg',
        addedAt: new Date().toISOString(),
        addedBy: this.scannedContact.owner || (this.authService.user()?.name ?? 'User')
      };
      this.dataService.updateLead(newLead.id, { attachments: [attachment] });
      this.dataService.logContact(newLead.id, 'general', `Attached: business card scan`, this.scannedContact.owner || (this.authService.user()?.name ?? 'User'));
    }

    this.closeBlinqModal();
  }

  connectBlinq() {
    // Simulate OAuth connection
    this.blinqConnected.set(true);
  }

  toggleBlinqContact(id: string) {
    const current = this.selectedBlinqContacts();
    if (current.includes(id)) {
      this.selectedBlinqContacts.set(current.filter(c => c !== id));
    } else {
      this.selectedBlinqContacts.set([...current, id]);
    }
  }

  importBlinqContacts() {
    const contacts = this.blinqContacts();
    const selectedIds = this.selectedBlinqContacts();

    for (const id of selectedIds) {
      const contact = contacts.find(c => c.id === id);
      if (contact) {
        this.dataService.addLead({
          company: contact.company,
          contact: contact.name,
          title: contact.title,
          stage: 'Discovery',
          value: 36000,
          modules: ['CAT-I'],
          certifications: [],
          facilities: 1,
          owner: (this.authService.user()?.name ?? 'User'),
          priority: 'medium',
          lastActivity: 'Just now',
          nextAction: 'Send intro email',
          source: 'Blinq Import',
          notes: [{ id: 1, author: (this.authService.user()?.name ?? 'User'), content: `Imported from Blinq on ${new Date().toLocaleDateString()}`, createdAt: new Date().toISOString() }],
          industry: '',
          email: contact.email,
          phone: contact.phone,
          expansions: [],
          probability: STAGE_PROBABILITIES['Discovery']
        });
      }
    }

    this.closeBlinqModal();
  }

  // ─── QR Code Scanning ───

  async startQrScan() {
    this.qrRawData.set(null);
    this.qrParsedData.set(null);
    this.qrScanError.set(null);
    this.blinqStep.set('qr-scan');

    // Wait for template to render the video element
    setTimeout(() => this.initQrCamera(), 100);
  }

  private async initQrCamera() {
    const video = document.querySelector('.qr-camera video') as HTMLVideoElement;
    if (!video) {
      this.qrScanError.set('Could not find video element');
      return;
    }

    try {
      this.qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.qrStream;
      await video.play();
      this.scanQrFromVideo(video);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      this.qrScanError.set('Camera access denied. Please allow camera permissions and try again.');
    }
  }

  private scanQrFromVideo(video: HTMLVideoElement) {
    // Use BarcodeDetector if available (Chrome/Safari on mobile), otherwise fall back to canvas polling
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const scan = () => {
        if (!this.qrStream || this.blinqStep() !== 'qr-scan') return;
        detector.detect(video).then((barcodes: any[]) => {
          if (barcodes.length > 0) {
            this.onQrDetected(barcodes[0].rawValue);
          } else {
            requestAnimationFrame(scan);
          }
        }).catch(() => {
          requestAnimationFrame(scan);
        });
      };
      requestAnimationFrame(scan);
    } else {
      // Fallback: use a canvas + manual check loop (won't auto-decode, but allows user to see camera)
      this.qrScanError.set('QR scanning works best on mobile. On desktop, you can paste QR data manually.');
    }
  }

  private onQrDetected(rawValue: string) {
    this.stopQrScan();
    this.qrRawData.set(rawValue);
    this.qrParsedData.set(this.parseQrData(rawValue));
    this.blinqStep.set('qr-review');
  }

  stopQrScan() {
    if (this.qrStream) {
      this.qrStream.getTracks().forEach(t => t.stop());
      this.qrStream = null;
    }
  }

  private parseQrData(raw: string): Record<string, any> | null {
    // Try JSON
    try {
      const json = JSON.parse(raw);
      if (typeof json === 'object') return json;
    } catch {}

    // Try vCard
    if (raw.startsWith('BEGIN:VCARD')) {
      const parsed: Record<string, string> = {};
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const [key, ...rest] = line.split(':');
        const value = rest.join(':').trim();
        if (!value || key === 'BEGIN' || key === 'END' || key === 'VERSION') continue;
        const cleanKey = key.split(';')[0];
        if (cleanKey === 'FN') parsed['name'] = value;
        else if (cleanKey === 'ORG') parsed['company'] = value;
        else if (cleanKey === 'TITLE') parsed['title'] = value;
        else if (cleanKey === 'EMAIL') parsed['email'] = value;
        else if (cleanKey === 'TEL') parsed['phone'] = value;
        else if (cleanKey === 'URL') parsed['website'] = value;
        else if (cleanKey === 'ADR') parsed['address'] = value.replace(/;/g, ', ').replace(/^,\s*/, '');
        else if (cleanKey === 'N') { /* skip, FN is preferred */ }
        else parsed[cleanKey.toLowerCase()] = value;
      }
      return Object.keys(parsed).length > 0 ? parsed : null;
    }

    // Try URL with query params
    try {
      const url = new URL(raw);
      if (url.searchParams.toString()) {
        const parsed: Record<string, string> = { url: raw };
        url.searchParams.forEach((v, k) => { parsed[k] = v; });
        return parsed;
      }
      return { url: raw };
    } catch {}

    // Try key=value pairs (semicolon or newline separated)
    if (raw.includes('=') && (raw.includes(';') || raw.includes('\n'))) {
      const parsed: Record<string, string> = {};
      const pairs = raw.split(/[;\n]/);
      for (const pair of pairs) {
        const [k, ...v] = pair.split('=');
        if (k?.trim() && v.length) parsed[k.trim()] = v.join('=').trim();
      }
      if (Object.keys(parsed).length > 0) return parsed;
    }

    // Can't parse — return null, raw data is still saved
    return null;
  }

  qrParsedEntries(): { key: string; value: string }[] {
    const data = this.qrParsedData();
    if (!data) return [];
    return Object.entries(data).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }

  async saveQrScan() {
    const rawData = this.qrRawData();
    if (!rawData) return;

    this.qrSaving.set(true);
    try {
      await this.dataService.saveTradeShowScan({
        rawData,
        parsedData: this.qrParsedData(),
        source: this.qrSource || null,
        notes: this.qrNotes || null,
      });
      this.closeBlinqModal();
    } catch (err) {
      console.error('Failed to save scan:', err);
      this.qrScanError.set('Failed to save. Please try again.');
    } finally {
      this.qrSaving.set(false);
    }
  }

  async saveQrScanAndCreateLead() {
    const rawData = this.qrRawData();
    if (!rawData) return;

    this.qrSaving.set(true);
    try {
      // Save the scan
      await this.dataService.saveTradeShowScan({
        rawData,
        parsedData: this.qrParsedData(),
        source: this.qrSource || null,
        notes: this.qrNotes || null,
      });

      // Create a lead from parsed data
      const parsed = this.qrParsedData() ?? {};
      const userName = this.authService.user()?.name ?? 'User';
      this.dataService.addLead({
        company: parsed['company'] || parsed['org'] || parsed['organization'] || 'Unknown Company',
        contact: parsed['name'] || parsed['fn'] || parsed['contact'] || 'Unknown Contact',
        title: parsed['title'] || parsed['position'] || '',
        stage: 'Discovery',
        value: 36000,
        modules: ['CAT-I'],
        certifications: [],
        facilities: 1,
        owner: userName,
        priority: 'medium',
        lastActivity: 'Just now',
        nextAction: 'Send intro email',
        source: this.qrSource || 'Trade Show QR Scan',
        notes: this.qrNotes ? [{ id: 1, author: userName, content: this.qrNotes, createdAt: new Date().toISOString() }] : [],
        industry: parsed['industry'] || '',
        email: parsed['email'] || '',
        phone: parsed['phone'] || parsed['tel'] || '',
        expansions: [],
        probability: STAGE_PROBABILITIES['Discovery']
      });

      this.closeBlinqModal();
    } catch (err) {
      console.error('Failed to save scan and create lead:', err);
      this.qrScanError.set('Failed to save. Please try again.');
    } finally {
      this.qrSaving.set(false);
    }
  }

  exportCsv() {
    const leads = this.filteredLeads();
    if (leads.length === 0) return;

    const headers = ['Company', 'Contact', 'Email', 'Phone', 'Stage', 'Value', 'Modules', 'Source', 'Owner', 'Priority', 'Industry', 'Last Activity', 'Next Action'];
    const rows = leads.map(l => [
      l.company, l.contact, l.email, l.phone, l.stage,
      l.value, l.modules.join('; '), l.source, l.owner,
      l.priority, l.industry, l.lastActivity, l.nextAction
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
