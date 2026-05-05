import { Component, inject, signal, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PIPELINE_STAGES, PIPELINE_TRANSITIONS, STAGE_COLORS, STAGE_PROBABILITIES, STAGE_DESCRIPTIONS, STAGE_SLA_HOURS, STAGE_NEXT_ACTIONS, Lead, PipelineStage, LeadContact, LeadAddress, LeadAttachment } from '../../core/models';
import { ALL_MODULES, INDUSTRIES } from '../../core/constants/seed.data';
import { IconComponent } from '../../shared/icons';
import { CurrencyShortPipe } from '../../shared/utils/format.pipe';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';
import { TeamUtilService } from '../../shared/utils/team.service';
import { InlineEditComponent } from '../../shared/components/inline-edit/inline-edit.component';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, CurrencyShortPipe, FilterBarComponent, InlineEditComponent, ActivityTimelineComponent],
  template: `
    <app-header
      title="Pipeline"
      subtitle="Sales Kanban Board"
      icon="pipeline"
      gradient="linear-gradient(135deg, #1A56DB 0%, #1E40AF 100%)"
    >
      <div class="header-toolbar">
        <div class="toolbar-tabs">
          <button class="tab-btn" [class.active]="view() === 'board'" (click)="view.set('board')">Board</button>
          <button class="tab-btn" [class.active]="view() === 'list'" (click)="view.set('list')">List</button>
        </div>
        <button class="btn-secondary btn-sm" (click)="showLegend.set(true)">
          <app-icon name="info" [size]="14"></app-icon>
          <span class="hdr-btn-label">Stage Guide</span>
        </button>
        <button class="btn-primary btn-sm" (click)="showAddModal.set(true)">
          <app-icon name="plus" [size]="14"></app-icon>
          Add Deal
        </button>
      </div>
    </app-header>

    <div class="pipeline-content">
      <!-- Filter Bar -->
      <app-filter-bar
        [filters]="filterConfig"
        [values]="filterValues"
        (valuesChange)="onFilterChange($event)"
      ></app-filter-bar>

      <!-- KPI Row — all stats derive from filteredLeads so they stay consistent with both views -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Pipeline Value</span>
            <span class="stat-value">{{ filteredPipelineValue() | currencyShort }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Weighted Value</span>
            <span class="stat-value">{{ weightedPipelineValue() | currencyShort }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Total Deals</span>
            <span class="stat-value">{{ filteredLeads().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Won Revenue</span>
            <span class="stat-value">{{ filteredWonRevenue() | currencyShort }}</span>
          </div>
        </div>
      </div>

      @if (view() === 'board') {
        <!-- Kanban Board — controlled stage transitions, no free drag -->
        @if (transitionError()) {
          <div class="transition-toast" (click)="transitionError.set(null)">
            <app-icon name="alert-circle" [size]="14"></app-icon>
            {{ transitionError()!.message }}
          </div>
        }
        <div class="kanban-board" #kanbanBoard (scroll)="onKanbanScroll($event)">
          @for (stage of visibleStages; track stage) {
            <div class="kanban-column">
              <div class="kanban-column-header" [style.border-bottom-color]="getStageColor(stage).text">
                <span>{{ stage }}</span>
                <span class="badge" [class]="'badge-' + getStageColor(stage).badge">
                  {{ getLeadsByStage(stage).length }}
                </span>
              </div>
              <div class="kanban-column-cards">
                @for (lead of getLeadsByStage(stage); track lead.id) {
                  <div class="kanban-card"
                       [class.sla-warning]="getSlaStatus(lead).isWarning"
                       (click)="selectLead(lead)">
                    <div class="card-header-row">
                      <span class="company-name">{{ lead.company }}</span>
                      <span style="display: flex; align-items: center; gap: 4px;">
                        @if (getCountdown(lead); as cd) {
                          <span class="timer-pill"
                            [class.timer-green]="!cd.isOverdue && cd.percent < 50"
                            [class.timer-yellow]="!cd.isOverdue && cd.percent >= 50 && cd.percent < 75"
                            [class.timer-orange]="!cd.isOverdue && cd.percent >= 75"
                            [class.timer-red]="cd.isOverdue"
                            [title]="getTimerTooltip(lead)"
                          >{{ cd.label }}</span>
                        }
                        <button class="timer-btn"
                          title="Set stage timer"
                          (click)="openTimerModal(lead, $event)">
                          <app-icon name="clock" [size]="11"></app-icon>
                        </button>
                        @if (dataService.isHighPriority(lead)) {
                          <span class="priority-icon high">
                            <app-icon name="star" [size]="14"></app-icon>
                          </span>
                        }
                      </span>
                    </div>
                    <div class="card-contact">{{ lead.contact }}</div>

                    @if (lead.stage === 'Intake') {
                      <div class="card-intake-status"
                           [class]="'intake-status-' + (lead.intakeStatus || 'not_started')">
                        @if ((lead.intakeStatus || 'not_started') === 'not_started') {
                          <app-icon name="clock" [size]="11"></app-icon> Intake not started
                        } @else if (lead.intakeStatus === 'in_progress') {
                          <app-icon name="clock" [size]="11"></app-icon> Intake in progress
                        } @else {
                          <app-icon name="check-circle" [size]="11"></app-icon> Intake complete
                        }
                      </div>
                    }

                    <div class="card-modules">
                      @for (mod of lead.modules.slice(0, 2); track mod) {
                        <span class="module-chip">{{ mod }}</span>
                      }
                      @if (lead.modules.length > 2) {
                        <span class="module-chip more">+{{ lead.modules.length - 2 }}</span>
                      }
                    </div>
                    <div class="card-footer-row">
                      <div class="owner-avatar" [style.background]="teamUtil.getColor(lead.owner)">
                        {{ lead.owner.charAt(0) }}
                      </div>
                      <div class="deal-stats">
                        <span class="deal-value">{{ lead.value | currencyShort }}</span>
                        <span class="deal-probability">{{ lead.probability }}%</span>
                      </div>
                    </div>

                    <!-- Controlled advance actions -->
                    @if (getNextStages(lead.stage).length > 0) {
                      <div class="card-advance-row" (click)="$event.stopPropagation()">
                        @for (next of getNextStages(lead.stage); track next) {
                          <button
                            class="card-advance-btn"
                            [class.card-advance-won]="next === 'Closed Won'"
                            [class.card-advance-lost]="next === 'Closed Lost' || next === 'Closed Failed'"
                            [class.card-advance-blocked]="isAdvanceBlocked(lead, next)"
                            [title]="getBlockReason(lead, next) || ('Advance to ' + next)"
                            (click)="advanceLead(lead, next)">
                            @if (next === 'Closed Won') {
                              <app-icon name="check-circle" [size]="11"></app-icon> Won
                            } @else if (next === 'Closed Lost') {
                              <app-icon name="x-circle" [size]="11"></app-icon> Lost
                            } @else if (next === 'Closed Failed') {
                              <app-icon name="x-circle" [size]="11"></app-icon> Failed
                            } @else {
                              {{ next }} <app-icon name="arrow-right" [size]="11"></app-icon>
                            }
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @empty {
                  <div class="empty-column">No deals</div>
                }
              </div>
            </div>
          }
        </div>
        <!-- Mobile column indicator dots -->
        <div class="kanban-dots" aria-hidden="true">
          @for (stage of visibleStages; track stage; let i = $index) {
            <span class="kanban-dot" [class.active]="activeColumnIndex() === i"></span>
          }
        </div>
      } @else {
        <!-- List View -->
        <div class="table-card">
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 25%">Company</th>
                  <th style="width: 15%">Contact</th>
                  <th style="width: 12%">Stage</th>
                  <th style="width: 12%">Value</th>
                  <th style="width: 15%">Modules</th>
                  <th style="width: 10%">Owner</th>
                  <th style="width: 11%">Activity</th>
                </tr>
              </thead>
              <tbody>
                @for (lead of filteredLeads(); track lead.id) {
                  <tr (click)="selectLead(lead)">
                    <td>
                      <div class="entity-cell">
                        <div class="entity-avatar" [style.background]="teamUtil.getColor(lead.owner)">
                          {{ lead.company.charAt(0) }}
                        </div>
                        <span class="entity-name">{{ lead.company }}</span>
                      </div>
                    </td>
                    <td>{{ lead.contact }}</td>
                    <td>
                      <span class="badge" [class]="'badge-' + getStageColor(lead.stage).badge">{{ lead.stage }}</span>
                    </td>
                    <td>{{ lead.value | currencyShort }}</td>
                    <td>
                      <div class="module-chips-small">
                        @for (mod of lead.modules.slice(0, 2); track mod) {
                          <span class="module-chip-small">{{ mod }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="owner-cell">
                        <div class="owner-avatar-sm" [style.background]="teamUtil.getColor(lead.owner)">
                          {{ lead.owner.charAt(0) }}
                        </div>
                        {{ lead.owner }}
                      </div>
                    </td>
                    <td class="activity-text">{{ lead.lastActivity }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    <!-- Lead Detail Slideover -->
    @if (selectedLead()) {
      <div class="slideover-overlay" (click)="selectedLead.set(null)"></div>
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
          <button class="modal-close-btn" (click)="selectedLead.set(null)">&times;</button>
        </div>

        <!-- Stage bar -->
        <div class="slideover-stage-bar">
          <div class="detail-top">
            <span class="badge badge-lg" [class]="'badge-' + getStageColor(selectedLead()!.stage).badge">
              {{ selectedLead()!.stage }}
            </span>
            <span class="detail-value">\${{ selectedLead()!.value | number }}</span>
          </div>
          <div class="stage-progress">
            @for (stage of PIPELINE_STAGES.slice(0, -3); track stage; let i = $index) {
              <div class="stage-segment" [class.active]="i <= getStageIndex(selectedLead()!.stage)"></div>
            }
          </div>
          <div class="stage-actions stage-actions-sticky">
            @if (transitionError()?.leadId === selectedLead()!.id) {
              <span class="stage-error-inline">{{ transitionError()!.message }}</span>
            }
            @for (next of getNextStages(selectedLead()!.stage); track next) {
              <button
                class="btn-sm stage-action-btn"
                [class.btn-primary]="next !== 'Closed Lost' && next !== 'Closed Failed'"
                [class.btn-danger]="next === 'Closed Lost' || next === 'Closed Failed'"
                [disabled]="isAdvanceBlocked(selectedLead()!, next)"
                [title]="getBlockReason(selectedLead()!, next)"
                (click)="advanceLead(selectedLead()!, next)">
                @if (next === 'Closed Won') { ✓ Close Won }
                @else if (next === 'Closed Lost') { ✗ Close Lost }
                @else if (next === 'Closed Failed') { ✗ Close Failed }
                @else { Advance to {{ next }} → }
              </button>
            }
            @if (selectedLead()!.stage === 'Intake') {
              <button class="btn-secondary btn-sm stage-action-btn" (click)="openInMesIntake(selectedLead()!)">
                <app-icon name="intake" [size]="13"></app-icon> Start MES Intake
              </button>
            }
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
          <button class="slideover-tab" [class.active]="slideoverTab() === 'attachments'" (click)="slideoverTab.set('attachments')">
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
                <span class="detail-label">Win Probability</span>
                <div class="probability-display">
                  <div class="prob-bar"><div class="prob-fill" [style.width.%]="selectedLead()!.probability"></div></div>
                  <span class="prob-value">{{ selectedLead()!.probability }}%</span>
                </div>
              </div>
              <div class="detail-item">
                <span class="detail-label">Weighted Value</span>
                <span class="detail-value-sm">\${{ (selectedLead()!.value * selectedLead()!.probability / 100) | number:'1.0-0' }}</span>
              </div>
            </div>

            <!-- Stage Timer -->
            @if (getCountdown(selectedLead()!); as cd) {
              <div class="slideover-timer-row" style="margin-bottom:1rem;">
                <div class="slideover-timer-status"
                  [class.timer-status-green]="!cd.isOverdue && cd.percent < 50"
                  [class.timer-status-yellow]="!cd.isOverdue && cd.percent >= 50 && cd.percent < 75"
                  [class.timer-status-orange]="!cd.isOverdue && cd.percent >= 75"
                  [class.timer-status-red]="cd.isOverdue">
                  <app-icon name="clock" [size]="13"></app-icon>
                  <span>{{ cd.isOverdue ? 'Overdue by ' + cd.label.replace('+', '') : cd.label + ' remaining' }}</span>
                  <span class="timer-status-pct">{{ cd.percent }}% of {{ (selectedLead()!.timerDurationHours ?? getDefaultSlaHours(selectedLead()!)) }}h</span>
                </div>
                <button class="btn-secondary btn-sm" style="flex-shrink:0;" (click)="openTimerModal(selectedLead()!, $event)">
                  <app-icon name="clock" [size]="12"></app-icon>
                  Edit Timer
                </button>
              </div>
            }

            <!-- SLA Override -->
            <div class="detail-field" style="margin-bottom: 1rem;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; cursor: pointer;">
                <input type="checkbox" [checked]="selectedLead()!.slaOverrideHigh" (change)="toggleSlaOverride()">
                Force High Priority (SLA Override)
              </label>
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

            <!-- Intake Status -->
            <div class="detail-section">
              <div class="intake-row">
                <div class="intake-info">
                  <span class="detail-label">Intake Form</span>
                  <span class="intake-badge" [class]="'intake-' + (selectedLead()!.intakeStatus || 'not_started')">
                    @if ((selectedLead()!.intakeStatus || 'not_started') === 'not_started') { Not Started }
                    @else if (selectedLead()!.intakeStatus === 'in_progress') { In Progress }
                    @else { Completed }
                  </span>
                  @if (selectedLead()!.intakeUpdatedAt) {
                    <span class="intake-updated">Updated {{ selectedLead()!.intakeUpdatedAt | date:'MMM d' }}</span>
                  }
                </div>
                <button class="btn-intake-link" (click)="openIntake()">Open Intake &#8594;</button>
              </div>
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
                        @if (contact.role) { <span class="contact-role">{{ contact.role }}</span> }
                        @if (contact.email) { <a class="contact-link" [href]="'mailto:' + contact.email">{{ contact.email }}</a> }
                        @if (contact.phone) { <a class="contact-link" [href]="'tel:' + contact.phone">{{ contact.phone }}</a> }
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

          <!-- ═══ ACTIVITY TAB ═══ -->
          @if (slideoverTab() === 'activity') {
            <div class="activity-section">
              <p class="activity-intro">System-generated events: stage moves, edits, file uploads, contact changes.</p>
              <app-activity-timeline entityType="lead" [entityId]="selectedLead()!.id"></app-activity-timeline>
            </div>
          }

          <!-- ═══ NOTES TAB ═══ -->
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
              @if (getAttachments().length === 0) {
                <div class="empty-state-sm">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <p>No attachments yet</p>
                  <span>Upload files, documents, or contracts</span>
                </div>
              } @else {
                <div class="attachment-list">
                  @for (att of getAttachments(); track att.id) {
                    <div class="attachment-item">
                      <div class="attachment-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                          <polyline points="13 2 13 9 20 9"/>
                        </svg>
                      </div>
                      <div class="attachment-info">
                        <span class="attachment-name">{{ att.name }}</span>
                        <span class="attachment-meta">{{ formatFileSize(att.size) }} &middot; {{ att.addedBy }} &middot; {{ att.addedAt | date:'MMM d' }}</span>
                      </div>
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

    <!-- Add Deal Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" (click)="showAddModal.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add New Deal</h2>
            <button class="modal-close-btn" (click)="showAddModal.set(false)">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Company Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="newDeal.company" placeholder="Company name">
              </div>
              <div class="form-group">
                <label class="form-label">Contact Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="newDeal.contact" placeholder="Primary contact">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Contact Title</label>
                <input type="text" class="form-input" [(ngModel)]="newDeal.title" placeholder="Job title">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" [(ngModel)]="newDeal.email" placeholder="email@company.com">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Deal Value <span class="required">*</span></label>
                <input type="number" class="form-input" [(ngModel)]="newDeal.value" placeholder="36000">
              </div>
              <div class="form-group">
                <label class="form-label">Industry</label>
                <select class="form-select" [(ngModel)]="newDeal.industry">
                  @for (ind of industries; track ind) {
                    <option [value]="ind">{{ ind }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Primary Sales Contact</label>
                <select class="form-select" [(ngModel)]="newDeal.owner">
                  @for (member of team; track member.id) {
                    <option [value]="member.name">{{ member.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" [(ngModel)]="newDeal.priority">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Win Probability (%)</label>
                <input type="number" class="form-input" [(ngModel)]="newDeal.probability" min="0" max="100" placeholder="10">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Modules</label>
              <div class="module-checkboxes">
                @for (mod of modules; track mod) {
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="newDeal.modules.includes(mod)" (change)="toggleModule(mod)">
                    {{ mod }}
                  </label>
                }
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-textarea" rows="3" [(ngModel)]="newDeal.notes" placeholder="Additional notes..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showAddModal.set(false)">Cancel</button>
            <button class="btn-primary" [disabled]="!newDeal.company || !newDeal.contact || !newDeal.value" (click)="createDeal()">
              Add to Pipeline
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Timer Override Modal -->
    @if (timerModalLead()) {
      <div class="modal-overlay" (click)="closeTimerModal()">
        <div class="modal-container timer-modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h2 style="margin:0; font-size:1rem;">Stage Timer</h2>
              <p style="margin:4px 0 0; font-size:0.8125rem; color:var(--color-gray-500);">{{ timerModalLead()!.company }} · {{ timerModalLead()!.stage }}</p>
            </div>
            <button class="modal-close-btn" (click)="closeTimerModal()">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body" style="padding:1.25rem 1.5rem;">
            @if (getCountdown(timerModalLead()!); as cd) {
              <div class="timer-status-bar" [class.timer-status-green]="!cd.isOverdue && cd.percent < 50"
                [class.timer-status-yellow]="!cd.isOverdue && cd.percent >= 50 && cd.percent < 75"
                [class.timer-status-orange]="!cd.isOverdue && cd.percent >= 75"
                [class.timer-status-red]="cd.isOverdue">
                <app-icon name="clock" [size]="14"></app-icon>
                <span>{{ cd.isOverdue ? 'Overdue by ' + cd.label : cd.label + ' remaining' }}</span>
                <span class="timer-status-pct">{{ cd.percent }}% used</span>
              </div>
            }
            <div class="form-group" style="margin-top:1rem;">
              <label class="form-label">Timer Duration (hours)</label>
              <input type="number" class="form-input" [(ngModel)]="timerModalHours" min="1" max="8760" placeholder="48">
              <span style="font-size:0.75rem; color:var(--color-gray-400); margin-top:4px; display:block;">
                Default for this stage: {{ getDefaultSlaHours(timerModalLead()!) }}h
                @if (timerModalLead()!.timerDurationHours) {
                  · Custom override active
                }
              </span>
            </div>
          </div>
          <div class="modal-footer">
            @if (timerModalLead()!.timerDurationHours) {
              <button class="btn-secondary" style="margin-right:auto;" (click)="resetTimer()">Reset to Default</button>
            }
            <button class="btn-secondary" (click)="closeTimerModal()">Cancel</button>
            <button class="btn-primary" (click)="saveTimer()" [disabled]="!timerModalHours || timerModalHours < 1">Set Timer</button>
          </div>
        </div>
      </div>
    }

    <!-- Stage Legend Modal -->
    @if (showLegend()) {
      <div class="modal-overlay" (click)="showLegend.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Pipeline Stage Guide</h2>
            <button class="modal-close-btn" (click)="showLegend.set(false)">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body">
            <p class="legend-intro">Our enterprise sales pipeline tracks deals from initial contact through to signed contract. Each stage has a probability that reflects typical conversion rates.</p>
            <div class="stage-legend">
              @for (stage of PIPELINE_STAGES; track stage) {
                <div class="legend-item" [class.closed-stage]="stage === 'Closed Won' || stage === 'Closed Lost' || stage === 'Closed Failed'">
                  <div class="legend-header">
                    <span class="badge" [class]="'badge-' + getStageColor(stage).badge">{{ stage }}</span>
                    <span class="legend-prob">{{ STAGE_PROBABILITIES[stage] }}% probability</span>
                  </div>
                  <p class="legend-desc">{{ STAGE_DESCRIPTIONS[stage] }}</p>
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" (click)="showLegend.set(false)">Got it</button>
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

    .pipeline-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .kanban-board {
      flex: 1;
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 1rem;
      min-height: 0;
    }

    .kanban-column {
      min-width: 280px;
      width: 280px;
      display: flex;
      flex-direction: column;
      background: var(--color-gray-50);
      border-radius: var(--radius-lg);
      max-height: 100%;
    }

    .kanban-column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      border-bottom: 3px solid var(--color-gray-300);
    }

    .kanban-column-cards {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      overflow-y: auto;
    }

    .kanban-card {
      background: var(--color-white);
      border-radius: var(--radius-md);
      padding: 0.75rem;
      box-shadow: var(--card-shadow);
      cursor: pointer;
      transition: box-shadow 0.15s ease, transform 0.15s ease;
    }

    .kanban-card:hover {
      box-shadow: var(--card-shadow-hover);
      transform: translateY(-2px);
    }

    .kanban-card.sla-warning {
      border-left: 3px solid var(--color-warning);
    }

    /* Intake status indicator on cards */
    .card-intake-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      margin-bottom: 6px;
      width: fit-content;
    }
    .intake-status-not_started { background: var(--color-gray-100); color: var(--color-gray-500); }
    .intake-status-in_progress { background: #E0E7FF; color: #4F46E5; }
    .intake-status-completed   { background: var(--status-green-bg); color: var(--status-green-text); }

    /* Controlled advance buttons row */
    .card-advance-row {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-hairline);
      flex-wrap: wrap;
    }

    .card-advance-btn {
      display: flex;
      align-items: center;
      gap: 3px;
      flex: 1;
      padding: 4px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-primary);
      background: transparent;
      color: var(--color-primary);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      justify-content: center;
      white-space: nowrap;
    }
    .card-advance-btn:hover {
      background: var(--color-primary);
      color: white;
    }
    .card-advance-won {
      border-color: var(--status-green-text);
      color: var(--status-green-text);
    }
    .card-advance-won:hover { background: var(--status-green-text); color: white; }
    .card-advance-lost {
      border-color: var(--status-red-text);
      color: var(--status-red-text);
    }
    .card-advance-lost:hover { background: var(--status-red-text); color: white; }
    .card-advance-blocked {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .card-advance-blocked:hover { background: transparent; color: inherit; }

    /* Transition error toast */
    .transition-toast {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #FEF2F2;
      border: 1px solid var(--color-error-light);
      color: #B91C1C;
      font-size: 0.8125rem;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      margin-bottom: 10px;
      cursor: pointer;
      animation: fadeIn 0.2s ease;
    }

    /* Inline error in panel stage bar */
    .stage-error-inline {
      font-size: 0.75rem;
      color: #B91C1C;
      background: #FEF2F2;
      border: 1px solid var(--color-error-light);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    .btn-danger {
      background: var(--status-red-text);
      color: white;
      border: none;
    }
    .btn-danger:hover { background: #BE123C; }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .company-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-gray-900);
    }

    .priority-badge {
      font-size: 0.875rem;
    }

    .card-contact {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-bottom: 8px;
    }

    .card-modules {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;
    }

    .module-chip {
      padding: 2px 8px;
      background: var(--status-blue-bg);
      color: var(--status-blue-text);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .module-chip.more {
      background: var(--color-gray-100);
      color: var(--color-gray-500);
    }

    .card-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .owner-avatar, .owner-avatar-sm {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .owner-avatar-sm {
      width: 20px;
      height: 20px;
      font-size: 0.625rem;
    }

    .deal-value {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-gray-700);
    }

    .empty-column {
      padding: 2rem;
      text-align: center;
      color: var(--color-gray-400);
      font-size: 0.8125rem;
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
    }

    .entity-name {
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .owner-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .module-chips-small {
      display: flex;
      gap: 4px;
    }

    .module-chip-small {
      padding: 2px 6px;
      background: var(--status-blue-bg);
      color: var(--status-blue-text);
      border-radius: var(--radius-sm);
      font-size: 0.625rem;
      font-weight: 500;
    }

    .activity-text {
      color: var(--color-gray-500);
      font-size: 0.8125rem;
    }

    /* Slideover */
    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-gray-900);
      margin-left: 12px;
    }

    .stage-progress {
      display: flex;
      gap: 4px;
      margin-bottom: 1.5rem;
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
    }

    .next-action-box {
      padding: 12px;
      background: var(--status-yellow-bg);
      border-radius: var(--radius-md);
      color: var(--status-yellow-text);
      font-weight: 500;
    }

    .notes-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-gray-600);
      line-height: 1.5;
    }

    .header-toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .priority-icon {
      display: flex;
      align-items: center;
    }

    .priority-icon.high {
      color: var(--color-warning);
    }

    .deal-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .deal-probability {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      font-weight: 500;
    }

    .probability-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .prob-bar {
      flex: 1;
      height: 6px;
      background: var(--color-gray-200);
      border-radius: 3px;
      overflow: hidden;
    }

    .prob-fill {
      height: 100%;
      background: var(--color-primary);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .prob-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-700);
      min-width: 36px;
    }

    .module-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
    }

    /* Stage Legend */
    .legend-intro {
      font-size: 0.875rem;
      color: var(--color-gray-600);
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }

    .stage-legend {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .legend-item {
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-gray-300);
    }

    .legend-item.closed-stage {
      opacity: 0.7;
    }

    .legend-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .legend-prob {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-gray-500);
      background: var(--color-gray-100);
      padding: 4px 8px;
      border-radius: var(--radius);
    }

    .legend-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      line-height: 1.5;
    }

    /* Countdown timer pill */
    .timer-pill {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: var(--radius-md);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      line-height: 1.6;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .timer-green  { background: #D1FAE5; color: #065F46; }
    .timer-yellow { background: var(--color-warning-light); color: #92400E; }
    .timer-orange { background: #FFEDD5; color: #9A3412; animation: pulse 2s infinite; }
    .timer-red    { background: var(--color-error-light); color: #991B1B; animation: pulse 1s infinite; }

    /* Clock icon button on card */
    .timer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border: none;
      background: transparent;
      color: var(--color-gray-400);
      border-radius: var(--radius-sm);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: color 0.15s, background 0.15s;
    }
    .timer-btn:hover {
      color: var(--color-primary);
      background: var(--color-gray-100);
    }

    /* Slideover timer row */
    .slideover-timer-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .slideover-timer-status {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 600;
      min-width: 0;
    }

    /* Timer modal */
    .timer-modal-container {
      max-width: 400px;
      width: 92vw;
    }
    .timer-status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .timer-status-pct {
      margin-left: auto;
      font-weight: 500;
      opacity: 0.8;
    }
    .timer-status-green  { background: #D1FAE5; color: #065F46; }
    .timer-status-yellow { background: var(--color-warning-light); color: #92400E; }
    .timer-status-orange { background: #FFEDD5; color: #9A3412; }
    .timer-status-red    { background: var(--color-error-light); color: #991B1B; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .slideover-wide { width: 600px !important; }
    .slideover-title-row { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .slideover-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
    .slideover-title-info { display: flex; flex-direction: column; min-width: 0; }
    .slideover-title-info h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slideover-subtitle { font-size: 0.75rem; color: var(--color-gray-500); }
    .slideover-stage-bar { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-hairline); background: var(--color-gray-50); }
    .detail-top { display: flex; align-items: center; margin-bottom: 10px; }
    .stage-actions { display: flex; gap: 8px; margin-top: 10px; }
    .slideover-tabs { display: flex; border-bottom: 1px solid var(--border-hairline); background: white; padding: 0 1rem; }
    .slideover-tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: none; background: none; cursor: pointer; font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-500); border-bottom: 2px solid transparent; transition: color 0.15s ease; white-space: nowrap; }
    .slideover-tab:hover { color: var(--color-gray-700); }
    .slideover-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }
    .tab-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--color-gray-100); color: var(--color-gray-600); border-radius: 9px; font-size: 0.6875rem; font-weight: 700; }
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
    .contact-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; background: white; border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); transition: box-shadow 0.15s ease; }
    .contact-card:hover { box-shadow: var(--shadow-md); }
    .contact-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
    .contact-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .contact-name-row { display: flex; align-items: center; gap: 8px; }
    .contact-name { font-weight: 600; font-size: 0.875rem; color: var(--color-gray-900); }
    .badge-primary-contact { display: inline-flex; align-items: center; padding: 1px 7px; background: rgba(37,99,235,0.1); color: var(--color-primary); border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 700; }
    .contact-role { font-size: 0.75rem; color: var(--color-gray-500); }
    .contact-link { font-size: 0.75rem; color: var(--color-primary); text-decoration: none; }
    .contact-link:hover { text-decoration: underline; }
    .contact-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: none; border-radius: var(--radius); color: var(--color-gray-400); cursor: pointer; transition: all 0.15s ease; }
    .icon-btn:hover { background: var(--color-gray-100); color: var(--color-gray-700); }
    .icon-btn-danger:hover { background: var(--status-red-bg); color: var(--status-red-text); }
    .btn-add-inline { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; border: 1.5px dashed var(--color-gray-300); border-radius: var(--radius-md); background: none; color: var(--color-gray-500); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; width: 100%; }
    .btn-add-inline:hover { border-color: var(--color-primary); color: var(--color-primary); background: rgba(37,99,235,0.03); }
    .add-contact-form { padding: 16px; background: var(--color-gray-50); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 12px; }
    .add-contact-form-header { display: flex; align-items: center; justify-content: space-between; }
    .form-section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-gray-800); }
    .checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--color-gray-700); cursor: pointer; }
    .checkbox-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--color-primary); }
    .form-actions-row { display: flex; justify-content: flex-end; gap: 8px; }
    .attachment-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: white; border: 1px solid var(--border-hairline); border-radius: var(--radius-md); }
    .attachment-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--color-gray-100); border-radius: var(--radius); color: var(--color-gray-500); flex-shrink: 0; }
    .attachment-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .attachment-name { font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .attachment-meta { font-size: 0.6875rem; color: var(--color-gray-400); }
    .empty-state-sm { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 2.5rem 1rem; color: var(--color-gray-400); text-align: center; }
    .empty-state-sm p { margin: 0; font-weight: 600; font-size: 0.9375rem; color: var(--color-gray-600); }
    .empty-state-sm span { font-size: 0.8125rem; }
    .notes-section { display: flex; flex-direction: column; gap: 8px; }
    .activity-intro { font-size: 0.75rem; color: var(--color-gray-400); margin: 0 0 12px; }
    .intake-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: var(--color-gray-50); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); }
    .intake-info { display: flex; align-items: center; gap: 8px; }
    .intake-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 700; }
    .intake-not_started { background: var(--color-gray-200); color: var(--color-gray-600); }
    .intake-in_progress { background: var(--color-warning-light); color: #92400E; }
    .intake-completed { background: #D1FAE5; color: #065F46; }
    .intake-updated { font-size: 0.6875rem; color: var(--color-gray-400); }
    .btn-intake-link { padding: 6px 12px; border: 1px solid var(--color-primary); border-radius: var(--radius-md); background: none; color: var(--color-primary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease; }
    .btn-intake-link:hover { background: var(--color-primary); color: white; }

    /* ─────────────────────────────────────────
       MOBILE — Pipeline kanban & slideover
       ───────────────────────────────────────── */

    /* Column scroll indicator dots — hidden on desktop */
    .kanban-dots {
      display: none;
    }

    @media (max-width: 768px) {

      :host {
        overflow: visible;
        min-height: auto;
      }

      /* ── Layout ── */
      .pipeline-content {
        padding: 0.75rem 0;
        gap: 0.75rem;
        overflow: visible;
        flex: none;
      }

      /* ── Stats grid: 2-col on mobile ── */
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        padding: 0 0.75rem;
      }

      /* ── Header toolbar: compress ── */
      .header-toolbar {
        gap: 0.5rem;
        flex-wrap: nowrap;
        align-items: center;
      }
      .hdr-btn-label { display: none; }

      /* ── Kanban board: horizontal scroll-snap ── */
      .kanban-board {
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: 0;
        padding: 0 0.5rem 0.5rem;
        /* Hide scrollbar visually but keep functional */
        scrollbar-width: none;
      }
      .kanban-board::-webkit-scrollbar {
        display: none;
      }

      /* ── Kanban column: one visible at a time ── */
      .kanban-column {
        min-width: calc(90vw);
        width: calc(90vw);
        scroll-snap-align: center;
        flex-shrink: 0;
        margin: 0 0.25rem;
      }

      /* ── Column dots indicator ── */
      .kanban-dots {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        padding: 0.5rem 0 0.25rem;
        flex-shrink: 0;
      }

      .kanban-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-gray-300);
        transition: background 0.2s ease, transform 0.2s ease;
        flex-shrink: 0;
      }

      .kanban-dot.active {
        background: var(--color-primary);
        transform: scale(1.4);
      }

      /* ── Kanban card touch targets ── */
      .kanban-card {
        padding: 0.875rem;
      }

      /* ── Card advance buttons: tappable ── */
      .card-advance-btn {
        min-height: 44px;
        padding: 8px 10px;
        font-size: 0.75rem;
      }

      /* ── Timer button: tappable ── */
      .timer-btn {
        width: 36px;
        height: 36px;
        margin: -8px -4px;
      }

      /* ── Stage action buttons in slideover: tappable ── */
      .stage-action-btn {
        min-height: 44px;
        padding: 10px 14px;
        font-size: 0.875rem;
      }

      /* ── Sticky stage actions at bottom on mobile ── */
      .stage-actions-sticky {
        position: sticky;
        bottom: 0;
        background: white;
        border-top: 1px solid var(--border-hairline);
        padding: 0.75rem 1rem;
        margin: 0 -1.5rem -1.25rem;
        gap: 8px;
        flex-wrap: wrap;
        z-index: 5;
      }

      /* ── Slideover panel → full screen ── */
      .slideover-panel {
        width: 100% !important;
        height: 100dvh !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
      }

      /* keep the wide override from applying a fixed px width on mobile */
      .slideover-wide {
        width: 100% !important;
      }

      /* ── Slideover tabs: horizontally scrollable ── */
      .slideover-tabs {
        overflow-x: auto;
        scrollbar-width: none;
        flex-shrink: 0;
        gap: 0;
      }
      .slideover-tabs::-webkit-scrollbar {
        display: none;
      }
      .slideover-tab {
        flex-shrink: 0;
        padding: 10px 12px;
        font-size: 0.8rem;
      }

      /* ── Stage bar: compact ── */
      .detail-value {
        font-size: 1.125rem;
      }

      .stage-actions {
        flex-wrap: wrap;
        gap: 6px;
      }

      /* ── Detail grid: single column ── */
      .detail-grid {
        grid-template-columns: 1fr;
      }

      /* ── Address grid: single column ── */
      .address-grid {
        grid-template-columns: 1fr;
      }

      /* ── Table view: allow horizontal scroll ── */
      .table-card {
        overflow-x: auto;
      }

      /* ── Filter bar: scroll on mobile ── */
      app-filter-bar {
        padding: 0 0.75rem;
      }

      /* ── Tab buttons in header toolbar ── */
      .tab-btn {
        min-height: 36px;
        padding: 6px 14px;
        font-size: 0.8rem;
      }

      /* ── Transition toast ── */
      .transition-toast {
        margin: 0 0.75rem 0.5rem;
      }
    }

    /* Tiny phones (< 390px): tighten column width */
    @media (max-width: 390px) {
      .kanban-column {
        min-width: calc(95vw);
        width: calc(95vw);
      }
    }
  `]
})
export class PipelineComponent implements AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);
  view = signal<'board' | 'list'>('board');
  selectedLead = signal<Lead | null>(null);
  showAddModal = signal(false);

  // ─── Mobile kanban scroll tracking ───
  @ViewChild('kanbanBoard') kanbanBoardRef?: ElementRef<HTMLDivElement>;
  activeColumnIndex = signal(0);
  private _scrollTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit() {
    // No setup needed — scroll is handled via (scroll) binding
  }

  ngOnDestroy() {
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
  }

  onKanbanScroll(event: Event) {
    const el = event.target as HTMLDivElement;
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => {
      const columnWidth = el.scrollWidth / this.visibleStages.length;
      const idx = Math.round(el.scrollLeft / columnWidth);
      this.activeColumnIndex.set(Math.max(0, Math.min(idx, this.visibleStages.length - 1)));
    }, 60);
  }

  // Transition feedback
  transitionError = signal<{ leadId: number; message: string } | null>(null);

  // Timer modal state
  timerModalLead = signal<Lead | null>(null);
  timerModalHours = 48;

  PIPELINE_STAGES = PIPELINE_STAGES;
  STAGE_DESCRIPTIONS = STAGE_DESCRIPTIONS;
  STAGE_PROBABILITIES = STAGE_PROBABILITIES;
  visibleStages: PipelineStage[] = ['Discovery', 'Intake', 'Demo', 'Follow-up', 'Closed Won', 'Closed Lost', 'Closed Failed'];
  showLegend = signal(false);

  get team() { return this.dataService.team(); }
  modules = ALL_MODULES;
  industries = INDUSTRIES;

  teamOptions = this.dataService.team().map(m => ({ value: m.name, label: m.name }));
  priorityOptions = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];

  // Filter configuration
  filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search deals...' },
    {
      key: 'stage', label: 'Stage', type: 'select', placeholder: 'All Stages',
      options: (['Discovery', 'Intake', 'Demo', 'Follow-up', 'Closed Won', 'Closed Lost', 'Closed Failed'] as PipelineStage[]).map(s => ({ value: s, label: s }))
    },
    {
      key: 'owner', label: 'Owner', type: 'select', placeholder: 'All Owners',
      options: this.dataService.team().map(m => ({ value: m.name, label: m.name }))
    },
    {
      key: 'priority', label: 'Priority', type: 'select', placeholder: 'All Priorities',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ]
    }
  ];
  filterValues: FilterValues = {};

  newDeal = {
    company: '',
    contact: '',
    title: '',
    email: '',
    value: 36000,
    industry: 'Other',
    owner: (this.authService.user()?.name ?? 'User'),
    priority: 'medium' as 'high' | 'medium' | 'low',
    modules: [] as string[],
    notes: '',
    probability: 10
  };

  // KPI computeds — all derived from filteredLeads for consistency across views
  filteredPipelineValue = computed(() => {
    return this.filteredLeads()
      .filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost' && l.stage !== 'Closed Failed')
      .reduce((sum, l) => sum + l.value, 0);
  });

  filteredWonRevenue = computed(() => {
    return this.filteredLeads()
      .filter(l => l.stage === 'Closed Won')
      .reduce((sum, l) => sum + l.value, 0);
  });

  weightedPipelineValue = computed(() => {
    return this.filteredLeads().reduce((sum, lead) => {
      return sum + (lead.value * (lead.probability || 0) / 100);
    }, 0);
  });

  // Filtered leads based on filter bar values — uses operational leads (excludes bulk event imports)
  filteredLeads = computed(() => {
    let leads = this.dataService.operationalLeads();
    const search = (this.filterValues['search'] || '').toLowerCase();
    const stage = this.filterValues['stage'] || '';
    const owner = this.filterValues['owner'] || '';
    const priority = this.filterValues['priority'] || '';

    if (search) {
      leads = leads.filter(l =>
        l.company.toLowerCase().includes(search) ||
        l.contact.toLowerCase().includes(search) ||
        l.owner.toLowerCase().includes(search)
      );
    }
    if (stage) {
      leads = leads.filter(l => l.stage === stage);
    }
    if (owner) {
      leads = leads.filter(l => l.owner === owner);
    }
    if (priority) {
      leads = leads.filter(l => l.priority === priority);
    }
    return leads;
  });

  onFilterChange(values: FilterValues) {
    this.filterValues = values;
  }

  getLeadsByStage(stage: PipelineStage): Lead[] {
    const filtered = this.filteredLeads();
    if (stage === this.visibleStages[0]) {
      // First column also collects leads whose stage doesn't match any visible column (C2 fix)
      const visibleSet = new Set<string>(this.visibleStages);
      return filtered.filter(l => l.stage === stage || !visibleSet.has(l.stage));
    }
    return filtered.filter(l => l.stage === stage);
  }

  getStageColor(stage: PipelineStage) {
    return STAGE_COLORS[stage];
  }

  getStageIndex(stage: PipelineStage): number {
    return PIPELINE_STAGES.indexOf(stage);
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  }

  selectLead(lead: Lead) {
    this.selectedLead.set(lead);
    this.slideoverTab.set('overview');
    this.showAddContactForm.set(false);
    this.newContact = { name: '', role: '', email: '', phone: '', isPrimary: false };
  }

  // SLA methods
  getSlaStatus(lead: Lead) {
    return this.dataService.getLeadSlaStatus(lead);
  }

  getSlaTooltip(lead: Lead): string {
    const sla = this.dataService.getLeadSlaStatus(lead);
    const slaHours = STAGE_SLA_HOURS[lead.stage];
    if (!slaHours) return '';
    const elapsed = lead.stageEnteredAt ? Math.round((Date.now() - new Date(lead.stageEnteredAt).getTime()) / (1000 * 60 * 60)) : 0;
    return `${elapsed}h in stage / ${slaHours}h SLA (${sla.percent}%)`;
  }

  // Countdown timer helpers
  getCountdown(lead: Lead): { label: string; percent: number; isOverdue: boolean } | null {
    const totalHours = lead.timerDurationHours ?? STAGE_SLA_HOURS[lead.stage];
    if (!totalHours || !lead.stageEnteredAt) return null;
    const totalMs = totalHours * 3_600_000;
    const elapsedMs = Date.now() - new Date(lead.stageEnteredAt).getTime();
    const remainingMs = totalMs - elapsedMs;
    const isOverdue = remainingMs < 0;
    const absMs = Math.abs(remainingMs);
    const hours = Math.floor(absMs / 3_600_000);
    const minutes = Math.floor((absMs % 3_600_000) / 60_000);
    const percent = Math.min(Math.round((elapsedMs / totalMs) * 100), 200);
    const label = `${isOverdue ? '+' : ''}${hours}h${minutes > 0 ? ' ' + minutes + 'm' : ''}`;
    return { label, percent, isOverdue };
  }

  getTimerTooltip(lead: Lead): string {
    const totalHours = lead.timerDurationHours ?? STAGE_SLA_HOURS[lead.stage];
    if (!totalHours || !lead.stageEnteredAt) return '';
    const cd = this.getCountdown(lead);
    if (!cd) return '';
    const custom = lead.timerDurationHours ? ` (custom ${lead.timerDurationHours}h)` : ` (default ${totalHours}h)`;
    return cd.isOverdue
      ? `Overdue by ${cd.label.replace('+', '')}${custom}`
      : `${cd.label} remaining of ${totalHours}h${custom}`;
  }

  getDefaultSlaHours(lead: Lead): number {
    return STAGE_SLA_HOURS[lead.stage] || 48;
  }

  openTimerModal(lead: Lead, event: Event) {
    event.stopPropagation();
    this.timerModalLead.set(lead);
    this.timerModalHours = lead.timerDurationHours ?? STAGE_SLA_HOURS[lead.stage] ?? 48;
  }

  closeTimerModal() {
    this.timerModalLead.set(null);
  }

  saveTimer() {
    const lead = this.timerModalLead();
    if (!lead || !this.timerModalHours || this.timerModalHours < 1) return;
    this.dataService.setLeadTimer(lead.id, this.timerModalHours);
    // Refresh selectedLead if it's the same lead
    if (this.selectedLead()?.id === lead.id) {
      this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
    }
    this.timerModalLead.set(null);
  }

  resetTimer() {
    const lead = this.timerModalLead();
    if (!lead) return;
    this.dataService.updateLead(lead.id, {
      timerDurationHours: undefined,
      stageEnteredAt: new Date().toISOString(),
    });
    if (this.selectedLead()?.id === lead.id) {
      this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
    }
    this.timerModalLead.set(null);
  }

  // SLA override toggle
  toggleSlaOverride() {
    const lead = this.selectedLead();
    if (!lead) return;
    this.dataService.updateLead(lead.id, { slaOverrideHigh: !lead.slaOverrideHigh });
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  // Inline edit handler
  updatePipelineField(field: string, value: any) {
    const lead = this.selectedLead();
    if (!lead) return;
    this.dataService.updateLead(lead.id, { [field]: value });
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  updateLeadField(field: string, value: any) {
    this.updatePipelineField(field, value);
  }

  getNextActionOptions(): { value: string; label: string }[] {
    const stage = this.selectedLead()?.stage || 'Discovery';
    const actions = STAGE_NEXT_ACTIONS[stage] || STAGE_NEXT_ACTIONS['Discovery'];
    const opts = actions.map(a => ({ value: a, label: a }));
    // Include current value if it's not in the standard list
    const current = this.selectedLead()?.nextAction;
    if (current && !actions.includes(current)) {
      opts.unshift({ value: current, label: current });
    }
    return opts;
  }

  /** Returns allowed next stages for a given stage (from PIPELINE_TRANSITIONS). */
  getNextStages(stage: PipelineStage): PipelineStage[] {
    return PIPELINE_TRANSITIONS[stage] ?? [];
  }

  /** Returns true if the transition is currently blocked by a validation rule. */
  isAdvanceBlocked(lead: Lead, targetStage: PipelineStage): boolean {
    if (targetStage === 'Demo') {
      return !lead.intakeStatus || lead.intakeStatus === 'not_started';
    }
    return false;
  }

  getBlockReason(lead: Lead, targetStage: PipelineStage): string {
    if (targetStage === 'Demo' && (!lead.intakeStatus || lead.intakeStatus === 'not_started')) {
      return 'MES Intake must be started before advancing to Demo';
    }
    return '';
  }

  /** Controlled card-level advance — validates and shows inline error on failure. */
  advanceLead(lead: Lead, targetStage: PipelineStage) {
    const result = this.dataService.tryAdvanceLead(lead.id, targetStage);
    if (!result.success) {
      this.transitionError.set({ leadId: lead.id, message: result.error! });
      setTimeout(() => this.transitionError.set(null), 4000);
    } else {
      this.transitionError.set(null);
      if (this.selectedLead()?.id === lead.id) {
        this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
      }
    }
  }

  /** Open MES Intake for a pipeline lead — marks intake as in_progress and navigates. */
  openInMesIntake(lead: Lead) {
    this.dataService.updateLeadIntakeStatus(lead.id, 'in_progress');
    this.selectedLead.set(null);
    this.router.navigate(['/intake/mes/interview']);
  }

  advanceStage(direction: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    // Forward: use controlled tryAdvanceLead
    if (direction > 0) {
      const nextStages = this.getNextStages(lead.stage);
      if (nextStages.length > 0) this.advanceLead(lead, nextStages[0]);
    } else {
      // Backward: simple unchecked move for corrections
      const currentIndex = PIPELINE_STAGES.indexOf(lead.stage);
      const newIndex = currentIndex - 1;
      if (newIndex >= 0) {
        this.dataService.moveLeadToStage(lead.id, PIPELINE_STAGES[newIndex]);
        this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
      }
    }
  }

  // Notes
  newNoteText = '';
  addNoteToLead() {
    const lead = this.selectedLead();
    if (!lead || !this.newNoteText.trim()) return;
    this.dataService.addNote(lead.id, (this.authService.user()?.name ?? 'User'), this.newNoteText.trim());
    this.newNoteText = '';
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  // ─── Router ───
  router = inject(Router);

  // ─── Slideover tab state ───
  slideoverTab = signal<'overview' | 'contacts' | 'attachments' | 'activity' | 'notes'>('overview');

  // ─── Add Contact form ───
  showAddContactForm = signal(false);
  newContact = { name: '', role: '', email: '', phone: '', isPrimary: false };

  // ─── Collapsible activity groups ───
  openGroups = new Set<string>(['notes', 'timeline']);

  toggleActivityGroup(key: string) {
    if (this.openGroups.has(key)) { this.openGroups.delete(key); } else { this.openGroups.add(key); }
  }

  isGroupOpen(key: string): boolean { return this.openGroups.has(key); }

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

  // ─── Intake ───
  openIntake() { this.router.navigate(['/intake/mes/admin']); }

  // ─── Contacts helpers ───
  getContacts(): LeadContact[] { return this.selectedLead()?.contacts ?? []; }

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
    if (contact.isPrimary) { contacts.forEach(c => c.isPrimary = false); }
    contacts.push(contact);
    this.dataService.updateLead(lead.id, { contacts });
    this.dataService.logContact(lead.id, 'general', `Added contact: ${contact.name}${contact.role ? ' (' + contact.role + ')' : ''}`, (this.authService.user()?.name ?? 'User'));
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
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
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  removeContact(contactId: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    const contacts = (lead.contacts ?? []).filter(c => c.id !== contactId);
    this.dataService.updateLead(lead.id, { contacts });
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  // ─── Address helpers ───
  getAddress(): LeadAddress { return this.selectedLead()?.address ?? {}; }

  updateAddress(field: keyof LeadAddress, value: string) {
    const lead = this.selectedLead();
    if (!lead) return;
    const address: LeadAddress = { ...(lead.address ?? {}), [field]: value };
    this.dataService.updateLead(lead.id, { address });
    this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
  }

  // ─── Attachments helpers ───
  getAttachments(): LeadAttachment[] { return this.selectedLead()?.attachments ?? []; }

  async onAttachmentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const lead = this.selectedLead();
    if (!lead) return;

    for (const file of Array.from(input.files)) {
      await this.dataService.uploadAttachment(lead.id, file);
    }

    // Refresh selected lead
    setTimeout(() => {
      this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
    }, 500);
    input.value = '';
  }

  removeAttachment(attachmentId: number) {
    const lead = this.selectedLead();
    if (!lead) return;
    this.dataService.deleteAttachment(lead.id, attachmentId);
    setTimeout(() => {
      this.selectedLead.set(this.dataService.leads().find(l => l.id === lead.id) || null);
    }, 500);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  toggleModule(mod: string) {
    const idx = this.newDeal.modules.indexOf(mod);
    if (idx > -1) {
      this.newDeal.modules.splice(idx, 1);
    } else {
      this.newDeal.modules.push(mod);
    }
  }

  // Drag and drop removed — stage movement is controlled via advanceLead()

  createDeal() {
    const probability = this.newDeal.probability || STAGE_PROBABILITIES['Discovery'];

    this.dataService.addLead({
      company: this.newDeal.company,
      contact: this.newDeal.contact,
      title: this.newDeal.title,
      email: this.newDeal.email,
      phone: '',
      stage: 'Discovery',
      value: this.newDeal.value,
      probability,
      modules: this.newDeal.modules.length > 0 ? this.newDeal.modules : ['CAT-I'],
      certifications: [],
      facilities: 1,
      owner: this.newDeal.owner,
      priority: this.newDeal.priority,
      lastActivity: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      nextAction: 'Initial outreach',
      source: 'Manual Entry',
      notes: this.newDeal.notes ? [{ id: 1, author: this.newDeal.owner || (this.authService.user()?.name ?? 'User'), content: this.newDeal.notes, createdAt: new Date().toISOString() }] : [],
      industry: this.newDeal.industry,
      expansions: []
    });

    // Reset form
    this.newDeal = {
      company: '',
      contact: '',
      title: '',
      email: '',
      value: 36000,
      industry: 'Other',
      owner: (this.authService.user()?.name ?? 'User'),
      priority: 'medium',
      modules: [],
      notes: '',
      probability: 10
    };

    this.showAddModal.set(false);
  }
}
