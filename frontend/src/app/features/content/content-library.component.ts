import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ContentPiece, ContentStage, ContentType, ContentPlatform, CONTENT_STAGES, CONTENT_STAGE_COLORS, CONTENT_TYPES, CONTENT_PLATFORMS, STAGE_OWNERS } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { TeamUtilService } from '../../shared/utils/team.service';

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, FilterBarComponent],
  template: `
    <div class="content-library">
      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ totalContent() }}</div>
          <div class="kpi-label">Total Pieces</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ inProgressCount() }}</div>
          <div class="kpi-label">In Progress</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ scheduledCount() }}</div>
          <div class="kpi-label">Scheduled</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ publishedThisMonth() }}</div>
          <div class="kpi-label">Published (Month)</div>
        </div>
      </div>

      <!-- Header with View Toggle -->
      <div class="header-row">
        <div class="view-toggle">
          <button [class.active]="currentView() === 'kanban'" (click)="setView('kanban')">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="1" width="4" height="14" rx="1"/><rect x="6" y="3" width="4" height="10" rx="1"/><rect x="11" y="1" width="4" height="14" rx="1"/>
            </svg>
            Kanban
          </button>
          <button [class.active]="currentView() === 'list'" (click)="setView('list')">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="4" x2="15" y2="4"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="1" y1="12" x2="15" y2="12"/>
            </svg>
            List
          </button>
          <button [class.active]="currentView() === 'calendar'" (click)="setView('calendar')">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="14" height="12" rx="1"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/>
            </svg>
            Calendar
          </button>
        </div>
        <div class="header-actions">
          <div class="filter-group">
            <select [(ngModel)]="filterType" class="filter-select">
              <option value="">All Types</option>
              @for (type of contentTypes; track type) {
                <option [value]="type">{{ type }}</option>
              }
            </select>
            <select [(ngModel)]="filterOwner" class="filter-select">
              <option value="">All Owners</option>
              @for (owner of owners(); track owner) {
                <option [value]="owner">{{ owner }}</option>
              }
            </select>
            <select class="filter-select" [(ngModel)]="filterCampaign" (change)="applyFilters()">
              <option value="">All campaigns</option>
              @for (camp of campaignOptions(); track camp.id) {
                <option [value]="camp.id">{{ camp.name }}</option>
              }
            </select>
          </div>
          <button class="btn-primary" (click)="openNewContentModal()">+ New Content</button>
        </div>
      </div>

      <!-- Kanban View -->
      @if (currentView() === 'kanban') {
        <div class="kanban-board">
          @for (stage of contentStages; track stage) {
            <div class="kanban-column" [style.--stage-color]="stageColors[stage].text">
              <div class="column-header">
                <span class="stage-dot" [style.background]="stageColors[stage].text"></span>
                <span class="stage-name">{{ stage }}</span>
                <span class="stage-count">{{ getContentByStage(stage).length }}</span>
              </div>
              <div class="column-cards"
                   (dragover)="onDragOver($event)"
                   (drop)="onDrop($event, stage)">
                @for (content of getContentByStage(stage); track content.id) {
                  <div class="content-card"
                       draggable="true"
                       (dragstart)="onDragStart($event, content)"
                       (click)="openContentDetail(content)">
                    <div class="card-type">
                      <span class="type-badge" [style.background]="getTypeBadgeColor(content.type)">{{ content.type }}</span>
                    </div>
                    <div class="card-title">{{ content.title }}</div>
                    @if (getCampaignName(content.campaignId)) {
                      <span class="campaign-badge">
                        <app-icon name="mail" [size]="10"></app-icon>
                        {{ getCampaignName(content.campaignId) }}
                      </span>
                    }
                    <div class="card-platforms">
                      @for (platform of content.platforms.slice(0, 3); track platform) {
                        <span class="platform-chip"><app-icon [name]="getPlatformIcon(platform)" [size]="14"></app-icon></span>
                      }
                      @if (content.platforms.length > 3) {
                        <span class="platform-more">+{{ content.platforms.length - 3 }}</span>
                      }
                    </div>
                    <div class="card-footer">
                      <span class="card-owner" [style.color]="teamUtil.getColor(content.owner)">{{ content.owner }}</span>
                      @if (content.scheduledDate) {
                        <span class="card-date">{{ formatDate(content.scheduledDate) }}</span>
                      }
                    </div>
                    @if (content.blockers.length > 0) {
                      <div class="card-blocker">Blocked</div>
                    }
                  </div>
                }
                @if (getContentByStage(stage).length === 0) {
                  <div class="empty-column">No content in this stage</div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- List View -->
      @if (currentView() === 'list') {
        <div class="list-view">
          <table class="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Stage</th>
                <th>Platforms</th>
                <th>Owner</th>
                <th>Updated</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              @for (content of filteredContent(); track content.id) {
                <tr (click)="openContentDetail(content)">
                  <td class="title-cell">
                    <span class="content-title">{{ content.title }}</span>
                    @if (content.blockers.length > 0) {
                      <span class="blocker-badge">Blocked</span>
                    }
                    @if (getCampaignName(content.campaignId)) {
                      <span class="campaign-badge">
                        <app-icon name="mail" [size]="10"></app-icon>
                        {{ getCampaignName(content.campaignId) }}
                      </span>
                    }
                  </td>
                  <td>
                    <span class="type-badge small" [style.background]="getTypeBadgeColor(content.type)">{{ content.type }}</span>
                  </td>
                  <td>
                    <span class="stage-badge" [style.background]="stageColors[content.stage].bg" [style.color]="stageColors[content.stage].text">
                      {{ content.stage }}
                    </span>
                  </td>
                  <td class="platforms-cell">
                    @for (platform of content.platforms; track platform) {
                      <span class="platform-icon" [title]="platform"><app-icon [name]="getPlatformIcon(platform)" [size]="14"></app-icon></span>
                    }
                  </td>
                  <td>
                    <span class="owner-name" [style.color]="teamUtil.getColor(content.owner)">{{ content.owner }}</span>
                  </td>
                  <td class="date-cell">{{ formatDate(content.updatedAt) }}</td>
                  <td class="date-cell">{{ formatDate(content.scheduledDate) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Calendar View -->
      @if (currentView() === 'calendar') {
        <div class="calendar-view">
          <div class="calendar-header">
            <button class="nav-btn" (click)="prevMonth()">&lt;</button>
            <span class="month-label">{{ currentMonthLabel() }}</span>
            <button class="nav-btn" (click)="nextMonth()">&gt;</button>
            <button class="btn-secondary btn-sm" (click)="showAiPlaceholder.set(!showAiPlaceholder())">
              <app-icon name="sparkles" [size]="14"></app-icon> AI Suggest
            </button>
            <button class="btn-secondary btn-sm" (click)="showImportModal.set(true)">
              <app-icon name="upload" [size]="14"></app-icon> Import
            </button>
          </div>
          @if (showAiPlaceholder()) {
            <div class="ai-banner">
              <app-icon name="sparkles" [size]="16"></app-icon>
              <span>AI content suggestions will auto-populate your calendar based on strategy and past performance.</span>
              <span class="coming-soon-pill">Coming Soon</span>
              <button class="btn-text btn-sm" (click)="showAiPlaceholder.set(false)">Dismiss</button>
            </div>
          }
          <div class="calendar-grid">
            <div class="weekday-header">
              @for (day of weekdays; track day) {
                <div class="weekday">{{ day }}</div>
              }
            </div>
            <div class="days-grid">
              @for (day of calendarDays(); track $index) {
                <div class="calendar-day" [class.other-month]="!day.isCurrentMonth" [class.today]="day.isToday">
                  <div class="day-number">{{ day.date.getDate() }}</div>
                  <div class="day-content">
                    @for (content of getContentForDate(day.dateStr); track content.id) {
                      <div class="calendar-item"
                           [style.background]="stageColors[content.stage].bg"
                           [style.border-left-color]="stageColors[content.stage].text"
                           (click)="openContentDetail(content); $event.stopPropagation()">
                        <span class="cal-type"><app-icon [name]="getPlatformIcon(content.platforms[0])" [size]="12"></app-icon></span>
                        <span class="cal-title">{{ content.title | slice:0:20 }}{{ content.title.length > 20 ? '...' : '' }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Content Detail Slideover -->
      @if (selectedContent()) {
        <div class="slideover-backdrop" (click)="closeDetail()"></div>
        <div class="slideover">
          <div class="slideover-header">
            <h2>{{ selectedContent()!.title }}</h2>
            <button class="close-btn" (click)="closeDetail()">&times;</button>
          </div>
          <div class="slideover-body">
            <div class="detail-section">
              <label>Type</label>
              <span class="type-badge" [style.background]="getTypeBadgeColor(selectedContent()!.type)">{{ selectedContent()!.type }}</span>
            </div>
            <div class="detail-section">
              <label>Stage</label>
              <select [(ngModel)]="editStage" (change)="updateContentStage()" class="stage-select">
                @for (stage of contentStages; track stage) {
                  <option [value]="stage">{{ stage }}</option>
                }
              </select>
            </div>
            <div class="detail-section">
              <label>Description</label>
              <p>{{ selectedContent()!.description }}</p>
            </div>
            <div class="detail-section">
              <label>Owner</label>
              <span class="owner-name" [style.color]="teamUtil.getColor(selectedContent()!.owner)">{{ selectedContent()!.owner }}</span>
            </div>
            <div class="detail-section">
              <label>Platforms</label>
              <div class="platform-list">
                @for (platform of selectedContent()!.platforms; track platform) {
                  <span class="platform-badge"><app-icon [name]="getPlatformIcon(platform)" [size]="14"></app-icon> {{ platform }}</span>
                }
              </div>
            </div>
            @if (selectedContent()!.scheduledDate) {
              <div class="detail-section">
                <label>Scheduled Date</label>
                <span>{{ formatDate(selectedContent()!.scheduledDate) }}</span>
              </div>
            }
            @if (selectedContent()!.blockers.length > 0) {
              <div class="detail-section blockers">
                <label>Blockers</label>
                @for (blocker of selectedContent()!.blockers; track blocker) {
                  <div class="blocker-item">{{ blocker }}</div>
                }
              </div>
            }
            <div class="detail-section">
              <label>Tags</label>
              <div class="tag-list">
                @for (tag of selectedContent()!.tags; track tag) {
                  <span class="tag-chip">{{ tag }}</span>
                }
              </div>
            </div>
            <div class="detail-section">
              <label>Created</label>
              <span>{{ formatDate(selectedContent()!.createdAt) }} by {{ selectedContent()!.createdBy }}</span>
            </div>
            <div class="detail-section">
              <label>Last Updated</label>
              <span>{{ formatDate(selectedContent()!.updatedAt) }}</span>
            </div>
          </div>
        </div>
      }

      <!-- New Content Modal -->
      @if (showNewModal()) {
        <div class="modal-backdrop" (click)="closeNewModal()"></div>
        <div class="modal">
          <div class="modal-header">
            <h2>New Content</h2>
            <button class="close-btn" (click)="closeNewModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="content-templates">
              <span class="form-label">Quick Start</span>
              <div class="template-chips">
                @for (tpl of contentTemplates; track tpl.label) {
                  <button class="template-chip" (click)="applyContentTemplate(tpl)">{{ tpl.label }}</button>
                }
              </div>
            </div>
            <div class="form-group">
              <label>Title *</label>
              <input type="text" [(ngModel)]="newContent.title" placeholder="Content title" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newContent.description" placeholder="Brief description" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Type *</label>
                <select [(ngModel)]="newContent.type">
                  @for (type of contentTypes; track type) {
                    <option [value]="type">{{ type }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Owner *</label>
                <select [(ngModel)]="newContent.owner">
                  @for (owner of owners(); track owner) {
                    <option [value]="owner">{{ owner }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Platforms</label>
              <div class="checkbox-grid">
                @for (platform of contentPlatforms; track platform) {
                  <label class="checkbox-item">
                    <input type="checkbox" [checked]="newContent.platforms?.includes(platform)" (change)="togglePlatform(platform)" />
                    <app-icon [name]="getPlatformIcon(platform)" [size]="14"></app-icon> {{ platform }}
                  </label>
                }
              </div>
            </div>
            <div class="form-group">
              <label>Scheduled Date (optional)</label>
              <input type="date" [(ngModel)]="newContent.scheduledDate" />
            </div>
            <div class="form-group">
              <label class="form-label">Campaign (optional)</label>
              <select class="form-select" [(ngModel)]="newContent.campaignId">
                <option [ngValue]="undefined">None</option>
                @for (camp of campaignOptions(); track camp.id) {
                  <option [ngValue]="camp.id">{{ camp.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Tags (comma-separated)</label>
              <input type="text" [(ngModel)]="newTagsInput" placeholder="product-update, announcement" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeNewModal()">Cancel</button>
            <button class="btn-primary" (click)="createContent()" [disabled]="!newContent.title || !newContent.type">Create</button>
          </div>
        </div>
      }

      @if (showImportModal()) {
        <div class="modal-overlay" (click)="showImportModal.set(false)">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Import Content Calendar</h2>
              <button class="modal-close-btn" (click)="showImportModal.set(false)">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Confluence Space URL</label>
                <input type="text" class="form-input" placeholder="https://yourteam.atlassian.net/wiki/spaces/..." disabled>
              </div>
              <div class="form-group">
                <label class="form-label">Import Format</label>
                <select class="form-select" disabled>
                  <option>Confluence Page (Calendar)</option>
                  <option>CSV Upload</option>
                </select>
              </div>
              <p class="coming-soon-text">Confluence integration coming soon. Contact admin to enable.</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="showImportModal.set(false)">Close</button>
              <button class="btn-primary" disabled>Connect & Import</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .content-library { padding: 24px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }

    /* KPI Row */
    .kpi-row { display: flex; gap: 16px; margin-bottom: 20px; }
    .kpi-card { background: white; border-radius: var(--radius-md); padding: 16px 24px; flex: 1; border: 1px solid var(--color-border); }
    .kpi-value { font-size: 28px; font-weight: 600; color: var(--color-gray-900); }
    .kpi-label { font-size: 13px; color: var(--color-gray-500); margin-top: 4px; }

    /* Header */
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .view-toggle { display: flex; gap: 4px; background: var(--color-gray-100); border-radius: var(--radius-md); padding: 4px; }
    .view-toggle button { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; background: transparent; border-radius: var(--radius); cursor: pointer; font-size: 13px; color: var(--color-gray-500); }
    .view-toggle button.active { background: white; color: var(--color-gray-900); box-shadow: var(--shadow-sm); }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .filter-group { display: flex; gap: 8px; }
    .filter-select { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 13px; background: white; }
    .btn-primary { padding: 8px 16px; background: #EC6B15; color: white; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover { background: #D45E12; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { padding: 8px 16px; background: var(--color-gray-100); color: var(--color-gray-700); border: none; border-radius: var(--radius); font-size: 13px; cursor: pointer; }

    /* Kanban */
    .kanban-board { display: flex; gap: 12px; flex: 1; overflow-x: auto; padding-bottom: 8px; }
    .kanban-column { min-width: 260px; max-width: 280px; background: var(--color-gray-50); border-radius: var(--radius-md); display: flex; flex-direction: column; }
    .column-header { padding: 12px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--color-border); }
    .stage-dot { width: 8px; height: 8px; border-radius: 50%; }
    .stage-name { font-size: 13px; font-weight: 600; color: var(--color-gray-700); }
    .stage-count { font-size: 12px; color: var(--color-gray-400); margin-left: auto; background: var(--color-gray-200); padding: 2px 8px; border-radius: var(--radius-md); }
    .column-cards { flex: 1; padding: 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; min-height: 100px; }
    .content-card { background: white; border-radius: var(--radius-md); padding: 12px; cursor: pointer; border: 1px solid var(--color-border); transition: box-shadow 0.15s; position: relative; }
    .content-card:hover { box-shadow: var(--shadow-md); }
    .card-type { margin-bottom: 8px; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; color: white; }
    .type-badge.small { font-size: 10px; padding: 2px 6px; }
    .card-title { font-size: 13px; font-weight: 500; color: var(--color-gray-900); margin-bottom: 8px; line-height: 1.4; }
    .card-platforms { display: flex; gap: 4px; margin-bottom: 8px; }
    .platform-chip { font-size: 14px; }
    .platform-more { font-size: 11px; color: var(--color-gray-500); padding: 2px 4px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .card-owner { font-size: 12px; font-weight: 500; }
    .card-date { font-size: 11px; color: var(--color-gray-500); }
    .card-blocker { position: absolute; top: 8px; right: 8px; font-size: 10px; padding: 2px 6px; background: var(--color-error-light); color: var(--color-error-hover); border-radius: var(--radius-sm); font-weight: 500; }
    .empty-column { text-align: center; color: var(--color-gray-400); font-size: 13px; padding: 24px 8px; white-space: normal; overflow: visible; word-break: normal; }

    /* List View */
    .list-view { flex: 1; overflow: auto; background: white; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .content-table { width: 100%; border-collapse: collapse; }
    .content-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 500; color: var(--color-gray-500); border-bottom: 1px solid var(--color-border); background: var(--color-gray-50); position: sticky; top: 0; }
    .content-table td { padding: 12px 16px; font-size: 13px; color: var(--color-gray-700); border-bottom: 1px solid var(--color-gray-100); }
    .content-table tr:hover { background: var(--color-gray-50); cursor: pointer; }
    .title-cell { display: flex; align-items: center; gap: 8px; }
    .content-title { font-weight: 500; color: var(--color-gray-900); }
    .blocker-badge { font-size: 10px; padding: 2px 6px; background: var(--color-error-light); color: var(--color-error-hover); border-radius: var(--radius-sm); }
    .stage-badge { display: inline-block; padding: 4px 10px; border-radius: var(--radius-lg); font-size: 12px; font-weight: 500; }
    .platforms-cell { display: flex; gap: 4px; }
    .platform-icon { font-size: 14px; }
    .owner-name { font-weight: 500; }
    .date-cell { color: var(--color-gray-500); }

    /* Calendar View */
    .calendar-view { flex: 1; background: white; border-radius: var(--radius-md); border: 1px solid var(--color-border); overflow: hidden; display: flex; flex-direction: column; }
    .calendar-header { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--color-border); }
    .nav-btn { width: 32px; height: 32px; border: 1px solid var(--color-border); background: white; border-radius: var(--radius); cursor: pointer; font-size: 14px; }
    .nav-btn:hover { background: var(--color-gray-100); }
    .month-label { font-size: 16px; font-weight: 600; color: var(--color-gray-900); min-width: 160px; text-align: center; }
    .calendar-grid { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .weekday-header { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--color-border); }
    .weekday { padding: 12px; text-align: center; font-size: 12px; font-weight: 500; color: var(--color-gray-500); }
    .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: minmax(100px, 1fr); flex: 1; overflow: auto; }
    .calendar-day { border-right: 1px solid var(--color-gray-100); border-bottom: 1px solid var(--color-gray-100); padding: 8px; display: flex; flex-direction: column; min-height: 100px; }
    .calendar-day.other-month { background: var(--color-gray-50); }
    .calendar-day.other-month .day-number { color: var(--color-gray-400); }
    .calendar-day.today .day-number { background: #EC6B15; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .day-number { font-size: 13px; font-weight: 500; color: var(--color-gray-700); margin-bottom: 4px; }
    .day-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
    .calendar-item { padding: 4px 6px; border-radius: var(--radius-sm); font-size: 11px; cursor: pointer; border-left: 3px solid; display: flex; align-items: center; gap: 4px; }
    .calendar-item:hover { filter: brightness(0.95); }
    .cal-type { font-size: 12px; }
    .cal-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-gray-700); }

    /* Slideover */
    .slideover-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100; }
    .slideover { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; background: white; z-index: 101; box-shadow: -4px 0 24px rgba(0,0,0,0.1); display: flex; flex-direction: column; animation: slideIn 0.2s ease; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .slideover-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: flex-start; }
    .slideover-header h2 { font-size: 18px; font-weight: 600; color: var(--color-gray-900); margin: 0; line-height: 1.4; }
    .close-btn { width: 32px; height: 32px; border: none; background: var(--color-gray-100); border-radius: var(--radius); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .slideover-body { flex: 1; padding: 24px; overflow-y: auto; }
    .detail-section { margin-bottom: 20px; }
    .detail-section label { display: block; font-size: 12px; font-weight: 500; color: var(--color-gray-500); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-section p { font-size: 14px; color: var(--color-gray-700); margin: 0; line-height: 1.5; }
    .stage-select { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 13px; width: 100%; }
    .platform-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .platform-badge { padding: 6px 10px; background: var(--color-gray-100); border-radius: var(--radius); font-size: 13px; }
    .detail-section.blockers { background: #FEF2F2; padding: 12px; border-radius: var(--radius-md); }
    .blocker-item { font-size: 13px; color: var(--color-error-hover); padding: 4px 0; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag-chip { padding: 4px 10px; background: var(--color-gray-200); border-radius: var(--radius-lg); font-size: 12px; color: var(--color-gray-700); }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 560px; max-height: 80vh; background: white; border-radius: var(--radius-lg); z-index: 101; display: flex; flex-direction: column; animation: fadeIn 0.15s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-size: 18px; font-weight: 600; color: var(--color-gray-900); margin: 0; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 12px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--color-gray-700); margin-bottom: 6px; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
    .form-group textarea { resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
    .checkbox-item input { width: auto; }

    /* Campaign Badge */
    .campaign-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      background: #EDE9FE;
      color: #5B21B6;
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 500;
      margin-top: 4px;
    }

    /* Content Templates */
    .content-templates {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-hairline);
    }
    .template-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .template-chip {
      padding: 4px 12px;
      border: 1px solid var(--border-hairline);
      background: white;
      border-radius: var(--radius-xl);
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .template-chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--status-blue-bg);
    }

    /* AI Banner */
    .ai-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #F5F3FF, #EBF5FF);
      border: 1px solid var(--status-purple-bg);
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }
    .coming-soon-pill {
      padding: 2px 8px;
      background: var(--status-purple-bg);
      color: #5B21B6;
      border-radius: var(--radius-md);
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .coming-soon-text {
      font-size: 0.875rem;
      color: var(--color-gray-500);
      font-style: italic;
    }

    /* Button variants */
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-text { background: none; border: none; color: var(--color-gray-500); cursor: pointer; font-size: 13px; }
    .btn-text:hover { color: var(--color-gray-700); }

    /* Import Modal Overlay */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal-container { width: 520px; max-height: 80vh; background: white; border-radius: var(--radius-lg); display: flex; flex-direction: column; animation: fadeIn 0.15s ease; }
    .modal-close-btn { width: 32px; height: 32px; border: none; background: var(--color-gray-100); border-radius: var(--radius); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
    .form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
    .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--color-gray-700); margin-bottom: 6px; }
  `]
})
export class ContentLibraryComponent {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  teamUtil = inject(TeamUtilService);

  contentStages = CONTENT_STAGES;
  stageColors = CONTENT_STAGE_COLORS;
  contentTypes = CONTENT_TYPES;
  contentPlatforms = CONTENT_PLATFORMS;
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  currentView = signal<'kanban' | 'list' | 'calendar'>('kanban');
  selectedContent = signal<ContentPiece | null>(null);
  showNewModal = signal(false);
  editStage: ContentStage = 'Ideas';

  filterType = '';
  filterOwner = '';
  filterCampaign = '';

  showAiPlaceholder = signal(false);
  showImportModal = signal(false);

  campaignOptions = computed(() => this.dataService.campaigns());

  contentTemplates = [
    { label: 'Blog Post', defaults: { type: 'Blog Post' as any, platforms: ['Website Blog', 'LinkedIn'] as any[], tags: ['blog'] }},
    { label: 'Social Post', defaults: { type: 'Social Image' as any, platforms: ['Instagram', 'LinkedIn'] as any[], tags: ['social'] }},
    { label: 'Newsletter', defaults: { type: 'Newsletter' as any, platforms: ['Email'] as any[], tags: ['newsletter'] }},
    { label: 'Case Study', defaults: { type: 'Case Study' as any, platforms: ['Website Blog', 'Email'] as any[], tags: ['case-study'] }},
  ];

  // Calendar state
  currentMonth = signal(new Date());

  // New content form
  newContent: Partial<ContentPiece> = this.getEmptyContent();
  newTagsInput = '';

  // Drag state
  private draggedContent: ContentPiece | null = null;

  // Computed values
  totalContent = computed(() => this.dataService.content().length);
  inProgressCount = computed(() => this.dataService.contentInProgress().length);
  scheduledCount = computed(() => this.dataService.scheduledContent().length);
  publishedThisMonth = computed(() => this.dataService.publishedContent().filter(c => c.publishedDate?.startsWith('2026-03')).length);

  owners = computed(() => {
    const ownerSet = new Set(this.dataService.content().map(c => c.owner));
    return Array.from(ownerSet);
  });

  filteredContent = computed(() => {
    let items = this.dataService.content();
    if (this.filterType) {
      items = items.filter(c => c.type === this.filterType);
    }
    if (this.filterOwner) {
      items = items.filter(c => c.owner === this.filterOwner);
    }
    if (this.filterCampaign) {
      items = items.filter(c => c.campaignId === +this.filterCampaign);
    }
    return items;
  });

  currentMonthLabel = computed(() => {
    const date = this.currentMonth();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const today = new Date();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        dateStr: toDateStr(d),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: toDateStr(d),
        isCurrentMonth: true,
        isToday: d.toDateString() === today.toDateString()
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: toDateStr(d),
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  });

  constructor() {
    // Check if we need to show calendar view based on route
    this.route.url.subscribe(segments => {
      if (segments.some(s => s.path === 'calendar')) {
        this.currentView.set('calendar');
      }
    });
  }

  setView(view: 'kanban' | 'list' | 'calendar') {
    this.currentView.set(view);
  }

  getContentByStage(stage: ContentStage): ContentPiece[] {
    let items = this.dataService.getContentByStage(stage);
    if (this.filterType) {
      items = items.filter(c => c.type === this.filterType);
    }
    if (this.filterOwner) {
      items = items.filter(c => c.owner === this.filterOwner);
    }
    if (this.filterCampaign) {
      items = items.filter(c => c.campaignId === +this.filterCampaign);
    }
    return items;
  }

  getContentForDate(dateStr: string): ContentPiece[] {
    return this.dataService.content().filter(c =>
      (c.scheduledDate && c.scheduledDate.startsWith(dateStr)) ||
      (c.publishedDate && c.publishedDate.startsWith(dateStr))
    );
  }

  getCampaignName(id: number | undefined): string | null {
    if (!id) return null;
    return this.dataService.campaigns().find(c => c.id === id)?.name || null;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    // Already short format like 'Mar 20'
    if (!/^\d{4}-/.test(dateStr)) return dateStr;
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  applyFilters(): void {
    // triggers change detection via ngModel bindings
  }

  applyContentTemplate(tpl: typeof this.contentTemplates[0]): void {
    this.newContent = { ...this.newContent, ...tpl.defaults };
  }

  getTypeBadgeColor(type: ContentType): string {
    const colors: Record<ContentType, string> = {
      'Blog Post': '#3B82F6',
      'Social Image': '#EC4899',
      'Social Video': '#8B5CF6',
      'Newsletter': '#10B981',
      'Case Study': '#F59E0B',
      'Product Update': '#06B6D4',
      'Feature Ad': '#EF4444',
      'Whitepaper': '#6366F1',
      'Webinar': '#14B8A6',
      'Press Release': '#6B7280'
    };
    return colors[type] || '#6B7280';
  }

  getPlatformIcon(platform: ContentPlatform): string {
    const icons: Record<ContentPlatform, string> = {
      'Instagram': 'instagram',
      'LinkedIn': 'linkedin',
      'X (Twitter)': 'twitter',
      'Website Blog': 'globe',
      'Email': 'email',
      'YouTube': 'youtube',
      'Facebook': 'facebook',
      'TikTok': 'tiktok'
    };
    return icons[platform] || 'globe';
  }

  // Drag & Drop
  onDragStart(event: DragEvent, content: ContentPiece) {
    this.draggedContent = content;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, stage: ContentStage) {
    event.preventDefault();
    if (this.draggedContent && this.draggedContent.stage !== stage) {
      this.dataService.moveContentToStage(this.draggedContent.id, stage);
    }
    this.draggedContent = null;
  }

  // Detail slideover
  openContentDetail(content: ContentPiece) {
    this.selectedContent.set(content);
    this.editStage = content.stage;
  }

  closeDetail() {
    this.selectedContent.set(null);
  }

  updateContentStage() {
    const content = this.selectedContent();
    if (content && this.editStage !== content.stage) {
      this.dataService.moveContentToStage(content.id, this.editStage);
      this.selectedContent.set({ ...content, stage: this.editStage });
    }
  }

  // Calendar navigation
  prevMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  // New content modal
  openNewContentModal() {
    this.newContent = this.getEmptyContent();
    this.newTagsInput = '';
    this.showNewModal.set(true);
  }

  closeNewModal() {
    this.showNewModal.set(false);
  }

  getEmptyContent(): Partial<ContentPiece> {
    return {
      title: '',
      description: '',
      stage: 'Ideas',
      type: 'Blog Post',
      platforms: [],
      owner: (this.authService.user()?.name ?? 'User'),
      createdBy: (this.authService.user()?.name ?? 'User'),
      blockers: [],
      tags: [],
      notes: '',
      attachments: [],
      linkedLeads: [],
      body: ''
    };
  }

  togglePlatform(platform: ContentPlatform) {
    const platforms = this.newContent.platforms || [];
    const idx = platforms.indexOf(platform);
    if (idx >= 0) {
      platforms.splice(idx, 1);
    } else {
      platforms.push(platform);
    }
    this.newContent.platforms = [...platforms];
  }

  createContent() {
    if (!this.newContent.title || !this.newContent.type) return;

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tags = this.newTagsInput ? this.newTagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    this.dataService.addContent({
      title: this.newContent.title!,
      description: this.newContent.description || '',
      stage: this.newContent.stage || 'Ideas',
      type: this.newContent.type as ContentType,
      platforms: this.newContent.platforms || [],
      owner: this.newContent.owner || (this.authService.user()?.name ?? 'User'),
      createdBy: this.newContent.createdBy || (this.authService.user()?.name ?? 'User'),
      createdAt: today,
      updatedAt: today,
      scheduledDate: this.newContent.scheduledDate,
      blockers: [],
      tags,
      notes: '',
      attachments: [],
      linkedLeads: [],
      body: ''
    });

    this.closeNewModal();
  }
}
