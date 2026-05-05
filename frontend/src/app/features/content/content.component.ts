import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { IconComponent } from '../../shared/icons';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { InlineEditComponent } from '../../shared/components/inline-edit/inline-edit.component';
import { TeamUtilService } from '../../shared/utils/team.service';

type ContentStage = 'ideas' | 'development' | 'review' | 'approved' | 'scheduled';
type ContentType = 'video' | 'image' | 'blog' | 'newsletter' | 'podcast' | 'infographic' | 'social';
type ContentPlatform = 'instagram' | 'linkedin' | 'twitter' | 'website' | 'youtube' | 'tiktok' | 'email' | 'facebook';
type ViewMode = 'kanban' | 'list' | 'calendar';
type PageMode = 'library' | 'content-calendar' | 'analytics';

interface ContentItem {
  id: number;
  title: string;
  description: string;
  stage: ContentStage;
  type: ContentType;
  platforms: ContentPlatform[];
  owner: string;
  collaborators: string[];
  blockers: string[];
  dueDate?: string;
  scheduledDate?: string;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STAGE_CONFIG: Record<ContentStage, { label: string; color: string; owners: string[] }> = {
  'ideas': { label: 'Ideas / Brainstorm', color: '#8B5CF6', owners: ['Yael', 'Artem', 'Aisha'] },
  'development': { label: 'In Development', color: '#3B82F6', owners: ['Yael', 'Artem', 'Igor'] },
  'review': { label: 'Under Review', color: '#F59E0B', owners: ['Artem', 'Aisha'] },
  'approved': { label: 'Approved', color: '#10B981', owners: ['Aisha'] },
  'scheduled': { label: 'Scheduled & Ready', color: '#E11D48', owners: ['Yael'] }
};

const TYPE_CONFIG: Record<ContentType, { label: string; icon: string; color: string }> = {
  'video': { label: 'Video', icon: 'video', color: '#EF4444' },
  'image': { label: 'Image', icon: 'image', color: '#8B5CF6' },
  'blog': { label: 'Blog', icon: 'blog', color: '#3B82F6' },
  'newsletter': { label: 'Newsletter', icon: 'newsletter', color: '#10B981' },
  'podcast': { label: 'Podcast', icon: 'podcast', color: '#F59E0B' },
  'infographic': { label: 'Infographic', icon: 'bar-chart', color: '#EC4899' },
  'social': { label: 'Social Post', icon: 'messages', color: '#06B6D4' }
};

const PLATFORM_CONFIG: Record<ContentPlatform, { label: string; icon: string; color: string }> = {
  'instagram': { label: 'Instagram', icon: 'instagram', color: '#E4405F' },
  'linkedin': { label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2' },
  'twitter': { label: 'X (Twitter)', icon: 'twitter', color: '#000000' },
  'website': { label: 'Website Blog', icon: 'globe', color: '#6366F1' },
  'youtube': { label: 'YouTube', icon: 'youtube', color: '#FF0000' },
  'tiktok': { label: 'TikTok', icon: 'tiktok', color: '#000000' },
  'email': { label: 'Email', icon: 'email', color: '#059669' },
  'facebook': { label: 'Facebook', icon: 'facebook', color: '#1877F2' }
};

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, FilterBarComponent, ActivityTimelineComponent, InlineEditComponent],
  template: `
    <!-- Page Navigation Tabs -->
    <div class="page-tabs">
      <button class="page-tab" [class.active]="pageMode() === 'library'" (click)="navigateToPage('library')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
        Library
      </button>
      <button class="page-tab" [class.active]="pageMode() === 'content-calendar'" (click)="navigateToPage('content-calendar')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Calendar
      </button>
      <button class="page-tab" [class.active]="pageMode() === 'analytics'" (click)="navigateToPage('analytics')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
        </svg>
        Analytics
      </button>
    </div>

    @if (pageMode() === 'library') {
      <app-header
        title="Content Library"
        subtitle="Social Media & Content Creation Pipeline"
        icon="content"
        gradient="linear-gradient(135deg, #E11D48 0%, #BE123C 100%)"
      >
        <div class="view-toggle">
          <button class="view-btn" [class.active]="viewMode() === 'kanban'" (click)="viewMode.set('kanban')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="6" height="14" x="3" y="5" rx="1"/><rect width="6" height="10" x="9" y="9" rx="1"/><rect width="6" height="16" x="15" y="3" rx="1"/>
            </svg>
            Kanban
          </button>
          <button class="view-btn" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            List
          </button>
          <button class="view-btn" [class.active]="viewMode() === 'calendar'" (click)="viewMode.set('calendar')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendar
          </button>
        </div>
        <button class="btn-primary btn-sm" (click)="openCreateModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          New Content
        </button>
      </app-header>
    }

    @if (pageMode() === 'content-calendar') {
      <app-header
        title="Content Calendar"
        subtitle="Schedule and track content releases"
        icon="calendar"
        gradient="linear-gradient(135deg, #E11D48 0%, #BE123C 100%)"
      >
        <button class="btn-primary btn-sm" (click)="openCreateModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          New Content
        </button>
      </app-header>
    }

    @if (pageMode() === 'analytics') {
      <app-header
        title="Content Analytics"
        subtitle="Performance metrics and insights"
        icon="analytics"
        gradient="linear-gradient(135deg, #E11D48 0%, #BE123C 100%)"
      >
      </app-header>
    }

    <div class="content-page">
      @if (pageMode() === 'library') {
      <!-- Filters -->
      <app-filter-bar
        [filters]="contentFilters"
        [values]="filterState"
        (valuesChange)="onFilterChange($event)"
      ></app-filter-bar>

      <!-- Kanban View -->
      @if (viewMode() === 'kanban') {
        <div class="kanban-board">
          @for (stage of stages; track stage) {
            <div class="kanban-column" [style.--stage-color]="getStageConfig(stage).color">
              <div class="column-header">
                <div class="column-title">
                  <span class="column-dot"></span>
                  <h3>{{ getStageConfig(stage).label }}</h3>
                  <span class="column-count">{{ getContentByStage(stage).length }}</span>
                </div>
                <span class="column-owners">{{ getStageConfig(stage).owners.join(', ') }}</span>
              </div>
              <div class="column-content">
                @for (item of getContentByStage(stage); track item.id) {
                  <div class="content-card" (click)="openEditModal(item)">
                    @if (item.images.length > 0) {
                      <div class="card-image">
                        <img [src]="item.images[0]" [alt]="item.title">
                      </div>
                    }
                    <div class="card-body">
                      <div class="card-type">
                        <span class="type-badge" [style.background]="getTypeConfig(item.type).color">
                          <app-icon [name]="getTypeConfig(item.type).icon" [size]="12"></app-icon> {{ getTypeConfig(item.type).label }}
                        </span>
                      </div>
                      <h4 class="card-title">{{ item.title }}</h4>
                      <p class="card-desc">{{ item.description }}</p>
                      <div class="card-platforms">
                        @for (platform of item.platforms; track platform) {
                          <span class="platform-icon" [title]="getPlatformConfig(platform).label">
                            <app-icon [name]="getPlatformConfig(platform).icon" [size]="14"></app-icon>
                          </span>
                        }
                      </div>
                      @if (item.blockers.length > 0) {
                        <div class="card-blockers">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {{ item.blockers.length }} blocker{{ item.blockers.length > 1 ? 's' : '' }}
                        </div>
                      }
                      <div class="card-footer">
                        <div class="card-owner">
                          <span class="owner-avatar" [style.background]="teamUtil.getColor(item.owner)">
                            {{ item.owner.charAt(0) }}
                          </span>
                          {{ item.owner }}
                        </div>
                        @if (item.dueDate) {
                          <span class="card-date">{{ formatDate(item.dueDate) }}</span>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="column-empty">No content in this stage</div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- List View -->
      @if (viewMode() === 'list') {
        <div class="list-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Platforms</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Blockers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredContent(); track item.id) {
                <tr (click)="openEditModal(item)">
                  <td>
                    <div class="list-title">
                      @if (item.images.length > 0) {
                        <img [src]="item.images[0]" class="list-thumb" [alt]="item.title">
                      }
                      <span>{{ item.title }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="type-badge sm" [style.background]="getTypeConfig(item.type).color">
                      {{ getTypeConfig(item.type).icon }} {{ getTypeConfig(item.type).label }}
                    </span>
                  </td>
                  <td>
                    <div class="list-platforms">
                      @for (platform of item.platforms; track platform) {
                        <span class="platform-icon sm" [title]="getPlatformConfig(platform).label">
                          <app-icon [name]="getPlatformConfig(platform).icon" [size]="12"></app-icon>
                        </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="stage-badge" [style.--stage-color]="getStageConfig(item.stage).color">
                      {{ getStageConfig(item.stage).label }}
                    </span>
                  </td>
                  <td>
                    <div class="list-owner">
                      <span class="owner-avatar sm" [style.background]="teamUtil.getColor(item.owner)">
                        {{ item.owner.charAt(0) }}
                      </span>
                      {{ item.owner }}
                    </div>
                  </td>
                  <td>{{ item.dueDate ? formatDate(item.dueDate) : '—' }}</td>
                  <td>
                    @if (item.blockers.length > 0) {
                      <span class="blocker-badge">{{ item.blockers.length }}</span>
                    } @else {
                      <span class="no-blockers">—</span>
                    }
                  </td>
                  <td>
                    <button class="icon-btn" (click)="openEditModal(item); $event.stopPropagation()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-row">No content found</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Calendar View -->
      @if (viewMode() === 'calendar') {
        <div class="calendar-view">
          <div class="calendar-header">
            <button class="btn-icon" (click)="prevMonth()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <h3>{{ currentMonthName }} {{ currentYear }}</h3>
            <button class="btn-icon" (click)="nextMonth()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div class="calendar-grid">
            <div class="calendar-weekday">Sun</div>
            <div class="calendar-weekday">Mon</div>
            <div class="calendar-weekday">Tue</div>
            <div class="calendar-weekday">Wed</div>
            <div class="calendar-weekday">Thu</div>
            <div class="calendar-weekday">Fri</div>
            <div class="calendar-weekday">Sat</div>
            @for (day of calendarDays; track $index) {
              <div class="calendar-day" [class.other-month]="!day.currentMonth" [class.today]="day.isToday">
                <span class="day-number">{{ day.date }}</span>
                <div class="day-content">
                  @for (item of getContentForDate(day.fullDate); track item.id) {
                    <div
                      class="calendar-item"
                      [style.background]="getStageConfig(item.stage).color"
                      (click)="openEditModal(item)"
                      [title]="item.title"
                    >
                      <app-icon [name]="getTypeConfig(item.type).icon" [size]="12"></app-icon> {{ item.title | slice:0:15 }}{{ item.title.length > 15 ? '...' : '' }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
      } <!-- End library pageMode -->

      @if (pageMode() === 'content-calendar') {
        <!-- Full Calendar View -->
        <div class="calendar-page">
          <div class="calendar-header-bar">
            <div class="calendar-nav">
              <button class="btn-icon" (click)="prevMonth()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <h3>{{ currentMonthName }} {{ currentYear }}</h3>
              <button class="btn-icon" (click)="nextMonth()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>
            <div class="calendar-legend">
              @for (stage of stages; track stage) {
                <div class="legend-item">
                  <span class="legend-dot" [style.background]="getStageConfig(stage).color"></span>
                  <span class="legend-label">{{ getStageConfig(stage).label }}</span>
                </div>
              }
            </div>
          </div>
          <div class="full-calendar-grid">
            <div class="calendar-weekday">Sunday</div>
            <div class="calendar-weekday">Monday</div>
            <div class="calendar-weekday">Tuesday</div>
            <div class="calendar-weekday">Wednesday</div>
            <div class="calendar-weekday">Thursday</div>
            <div class="calendar-weekday">Friday</div>
            <div class="calendar-weekday">Saturday</div>
            @for (day of calendarDays; track day.fullDate) {
              <div class="calendar-cell" [class.other-month]="!day.currentMonth" [class.today]="day.isToday">
                <span class="cell-date">{{ day.date }}</span>
                <div class="cell-content">
                  @for (item of getContentForDate(day.fullDate); track item.id) {
                    <div
                      class="cell-item"
                      [style.--item-color]="getStageConfig(item.stage).color"
                      (click)="openEditModal(item)"
                    >
                      <span class="item-type"><app-icon [name]="getTypeConfig(item.type).icon" [size]="12"></app-icon></span>
                      <span class="item-title">{{ item.title }}</span>
                      <span class="item-owner" [style.background]="teamUtil.getColor(item.owner)">{{ item.owner.charAt(0) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      @if (pageMode() === 'analytics') {
        <!-- Analytics View -->
        <div class="analytics-page">
          <div class="analytics-stats">
            <div class="stat-card">
              <div class="stat-icon" style="background: #8B5CF6;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ content().length }}</span>
                <span class="stat-label">Total Content</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #3B82F6;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ getContentByStage('development').length + getContentByStage('review').length }}</span>
                <span class="stat-label">In Progress</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #10B981;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ getContentByStage('approved').length + getContentByStage('scheduled').length }}</span>
                <span class="stat-label">Ready to Publish</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #F59E0B;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ getBlockedCount() }}</span>
                <span class="stat-label">Blocked Items</span>
              </div>
            </div>
          </div>

          <div class="analytics-grid">
            <div class="analytics-card">
              <h3>Content by Stage</h3>
              <div class="stage-breakdown">
                @for (stage of stages; track stage) {
                  <div class="breakdown-row">
                    <div class="breakdown-label">
                      <span class="breakdown-dot" [style.background]="getStageConfig(stage).color"></span>
                      {{ getStageConfig(stage).label }}
                    </div>
                    <div class="breakdown-bar-wrap">
                      <div class="breakdown-bar" [style.width.%]="(getContentByStage(stage).length / content().length) * 100" [style.background]="getStageConfig(stage).color"></div>
                    </div>
                    <span class="breakdown-count">{{ getContentByStage(stage).length }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="analytics-card">
              <h3>Content by Type</h3>
              <div class="type-grid">
                @for (type of contentTypes; track type) {
                  <div class="type-stat">
                    <span class="type-icon" [style.background]="getTypeConfig(type).color"><app-icon [name]="getTypeConfig(type).icon" [size]="20"></app-icon></span>
                    <span class="type-count">{{ getContentByType(type).length }}</span>
                    <span class="type-label">{{ getTypeConfig(type).label }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="analytics-card">
              <h3>Content by Platform</h3>
              <div class="platform-breakdown">
                @for (platform of platforms; track platform) {
                  <div class="platform-row">
                    <span class="platform-icon-stat"><app-icon [name]="getPlatformConfig(platform).icon" [size]="20"></app-icon></span>
                    <span class="platform-name">{{ getPlatformConfig(platform).label }}</span>
                    <span class="platform-count">{{ getContentByPlatform(platform).length }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="analytics-card">
              <h3>Team Workload</h3>
              <div class="team-workload">
                @for (member of teamMembers; track member.id) {
                  <div class="workload-row">
                    <div class="workload-owner">
                      <span class="owner-avatar" [style.background]="member.color">{{ member.name.charAt(0) }}</span>
                      <span>{{ member.name }}</span>
                    </div>
                    <div class="workload-bar-wrap">
                      <div class="workload-bar" [style.width.%]="(getContentByOwner(member.name).length / content().length) * 100" [style.background]="member.color"></div>
                    </div>
                    <span class="workload-count">{{ getContentByOwner(member.name).length }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Create/Edit Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingItem ? 'Edit Content' : 'New Content' }}</h2>
            <button class="modal-close-btn" (click)="closeModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label">Title <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="formData.title" placeholder="Content title">
              </div>
              <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" [(ngModel)]="formData.type">
                  @for (type of contentTypes; track type) {
                    <option [value]="type">{{ getTypeConfig(type).label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" rows="3" [(ngModel)]="formData.description" placeholder="Brief description of the content"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stage</label>
                <select class="form-select" [(ngModel)]="formData.stage">
                  @for (stage of stages; track stage) {
                    <option [value]="stage">{{ getStageConfig(stage).label }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Owner</label>
                <select class="form-select" [(ngModel)]="formData.owner">
                  @for (member of teamMembers; track member.id) {
                    <option [value]="member.name">{{ member.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Platforms</label>
              <div class="checkbox-grid">
                @for (platform of platforms; track platform) {
                  <label class="checkbox-item" [class.selected]="isPlatformSelected(platform)">
                    <input type="checkbox" [checked]="isPlatformSelected(platform)" (change)="togglePlatform(platform)">
                    <span><app-icon [name]="getPlatformConfig(platform).icon" [size]="14"></app-icon> {{ getPlatformConfig(platform).label }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" class="form-input" [(ngModel)]="formData.dueDate">
              </div>
              <div class="form-group">
                <label class="form-label">Scheduled Date</label>
                <input type="date" class="form-input" [(ngModel)]="formData.scheduledDate">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Collaborators</label>
              <div class="checkbox-grid cols-4">
                @for (member of teamMembers; track member.id) {
                  <label class="checkbox-item" [class.selected]="isCollaborator(member.name)">
                    <input type="checkbox" [checked]="isCollaborator(member.name)" (change)="toggleCollaborator(member.name)">
                    <span>{{ member.name }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Blockers</label>
              <div class="blockers-list">
                @for (blocker of formData.blockers!; track blocker; let i = $index) {
                  <div class="blocker-row">
                    <input type="text" class="form-input" [(ngModel)]="formData.blockers![i]" placeholder="Describe the blocker">
                    <button class="icon-btn danger" (click)="removeBlocker(i)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </div>
                }
                <button class="btn-secondary btn-sm" (click)="addBlocker()">+ Add Blocker</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Images</label>
              <div class="images-section">
                <div class="images-grid">
                  @for (image of formData.images!; track image; let i = $index) {
                    <div class="image-preview">
                      <img [src]="image" alt="Content image">
                      <button class="image-remove" (click)="removeImage(i)">×</button>
                    </div>
                  }
                  <label class="image-upload">
                    <input type="file" accept="image/*" (change)="onImageUpload($event)" hidden>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Upload Image</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Tags</label>
              <input type="text" class="form-input" [(ngModel)]="tagsInput" placeholder="Enter tags separated by commas">
            </div>

            @if (editingItem) {
              <app-activity-timeline entityType="content" [entityId]="editingItem.id"></app-activity-timeline>
            }
          </div>
          <div class="modal-footer">
            @if (editingItem) {
              <button class="btn-text btn-danger" (click)="deleteContent()">Delete</button>
            }
            <div class="modal-actions">
              <button class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn-primary" (click)="saveContent()" [disabled]="!formData.title">
                {{ editingItem ? 'Save Changes' : 'Create Content' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Page Navigation Tabs */
    .page-tabs {
      display: flex;
      gap: 4px;
      padding: 0.75rem 1.5rem;
      background: var(--color-white);
      border-bottom: 1px solid var(--border-hairline);
    }

    .page-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--color-gray-600);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .page-tab:hover {
      background: var(--color-gray-50);
      color: var(--color-gray-900);
    }

    .page-tab.active {
      background: var(--color-error-light);
      color: var(--status-red-text);
    }

    .content-page {
      padding: 1rem 1.5rem;
      height: calc(100vh - 120px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Header view toggle */
    .view-toggle {
      display: flex;
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--radius);
      padding: 2px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.8125rem;
      font-weight: 500;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .view-btn.active {
      background: white;
      color: var(--color-gray-900);
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filter-select {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      background: white;
    }

    /* Kanban */
    .kanban-board {
      display: flex;
      gap: 1rem;
      flex: 1;
      overflow-x: auto;
      padding-bottom: 1rem;
    }

    .kanban-column {
      flex: 0 0 300px;
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      max-height: 100%;
    }

    .column-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .column-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--stage-color);
    }

    .column-title h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      flex: 1;
    }

    .column-count {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      background: var(--color-gray-100);
      padding: 2px 8px;
      border-radius: var(--radius-md);
    }

    .column-owners {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      margin-top: 4px;
    }

    .column-content {
      flex: 1;
      padding: 0.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .column-empty {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--color-gray-400);
      font-size: 0.8125rem;
    }

    /* Content Card */
    .content-card {
      background: var(--color-white);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .content-card:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-lg);
    }

    .card-image {
      height: 120px;
      overflow: hidden;
    }

    .card-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-body {
      padding: 0.75rem;
    }

    .card-type {
      margin-bottom: 0.5rem;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 600;
      color: white;
    }

    .type-badge.sm {
      padding: 2px 6px;
      font-size: 0.625rem;
    }

    .card-title {
      margin: 0 0 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .card-desc {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      color: var(--color-gray-500);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-platforms {
      display: flex;
      gap: 4px;
      margin-bottom: 0.5rem;
    }

    .platform-icon {
      font-size: 0.875rem;
    }

    .platform-icon.sm {
      font-size: 0.75rem;
    }

    .card-blockers {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--status-red-bg);
      color: var(--color-error);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-hairline);
    }

    .card-owner {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-gray-600);
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

    .owner-avatar.sm {
      width: 18px;
      height: 18px;
      font-size: 0.5625rem;
    }

    .card-date {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
    }

    /* List View */
    .list-view {
      flex: 1;
      overflow: auto;
    }

    .list-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .list-thumb {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      object-fit: cover;
    }

    .list-platforms {
      display: flex;
      gap: 4px;
    }

    .list-owner {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stage-badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
      background: color-mix(in srgb, var(--stage-color) 15%, white);
      color: var(--stage-color);
    }

    .blocker-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--color-error);
      color: white;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .no-blockers {
      color: var(--color-gray-300);
    }

    .empty-row {
      text-align: center;
      color: var(--color-gray-400);
      padding: 2rem !important;
    }

    /* Calendar View */
    .calendar-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      overflow: hidden;
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .calendar-header h3 {
      margin: 0;
      min-width: 180px;
      text-align: center;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      overflow: auto;
    }

    .calendar-weekday {
      padding: 0.75rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-gray-500);
      background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
    }

    .calendar-day {
      min-height: 100px;
      padding: 0.5rem;
      border-right: 1px solid var(--border-hairline);
      border-bottom: 1px solid var(--border-hairline);
    }

    .calendar-day:nth-child(7n) {
      border-right: none;
    }

    .calendar-day.other-month {
      background: var(--color-gray-50);
    }

    .calendar-day.other-month .day-number {
      color: var(--color-gray-300);
    }

    .calendar-day.today .day-number {
      background: var(--color-primary);
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .day-number {
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .day-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .calendar-item {
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.625rem;
      color: white;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .calendar-item:hover {
      opacity: 0.9;
    }

    /* Modal */
    .modal-lg {
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .flex-2 {
      flex: 2;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }

    .checkbox-grid.cols-4 {
      grid-template-columns: repeat(4, 1fr);
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .checkbox-item:hover {
      border-color: var(--color-primary);
    }

    .checkbox-item.selected {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }

    .checkbox-item input {
      display: none;
    }

    .blockers-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .blocker-row {
      display: flex;
      gap: 0.5rem;
    }

    .blocker-row .form-input {
      flex: 1;
    }

    .images-section {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }

    .images-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .image-preview {
      position: relative;
      aspect-ratio: 1;
      border-radius: var(--radius);
      overflow: hidden;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-upload {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--color-gray-400);
      transition: all 0.15s ease;
    }

    .image-upload:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-600);
    }

    .image-upload span {
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-danger {
      color: var(--color-error);
    }

    .btn-danger:hover {
      background: var(--status-red-bg);
    }

    .icon-btn {
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-500);
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .icon-btn.danger:hover {
      background: var(--status-red-bg);
      color: var(--color-error);
    }

    .btn-icon {
      padding: 8px;
      border: 1px solid var(--color-border);
      background: white;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--color-gray-600);
    }

    .btn-icon:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    /* Calendar Page */
    .calendar-page {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      overflow: hidden;
    }

    .calendar-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }

    .calendar-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .calendar-nav h3 {
      margin: 0;
      min-width: 180px;
      text-align: center;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .calendar-legend {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .legend-label {
      font-size: 0.75rem;
      color: var(--color-gray-600);
    }

    .full-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: auto repeat(6, 1fr);
      flex: 1;
      overflow: hidden;
    }

    .full-calendar-grid .calendar-weekday {
      padding: 0.75rem 0.5rem;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-600);
      background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
      border-right: 1px solid var(--border-hairline);
    }

    .full-calendar-grid .calendar-weekday:last-of-type {
      border-right: none;
    }

    .calendar-cell {
      height: 100%;
      min-height: 100px;
      padding: 0.5rem;
      border-right: 1px solid var(--border-hairline);
      border-bottom: 1px solid var(--border-hairline);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .calendar-cell:nth-child(7n+14) {
      border-right: none;
    }

    .calendar-cell.other-month {
      background: var(--color-gray-50);
    }

    .calendar-cell.other-month .cell-date {
      color: var(--color-gray-300);
    }

    .calendar-cell.today .cell-date {
      background: var(--color-primary);
      color: white;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cell-date {
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      flex-shrink: 0;
    }

    .cell-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      min-height: 0;
    }

    .cell-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--item-color) 15%, white);
      flex-shrink: 0;
      border-left: 3px solid var(--item-color);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cell-item:hover {
      background: color-mix(in srgb, var(--item-color) 25%, white);
    }

    .item-type {
      font-size: 0.75rem;
    }

    .item-title {
      flex: 1;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-owner {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 600;
      color: white;
    }

    /* Analytics Page */
    .analytics-page {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
    }

    .analytics-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .stat-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--card-shadow);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-gray-900);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-top: 4px;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .analytics-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      box-shadow: var(--card-shadow);
    }

    .analytics-card h3 {
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .stage-breakdown, .platform-breakdown, .team-workload {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .breakdown-row, .platform-row, .workload-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .breakdown-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 140px;
      font-size: 0.8125rem;
    }

    .breakdown-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .breakdown-bar-wrap, .workload-bar-wrap {
      flex: 1;
      height: 8px;
      background: var(--color-gray-100);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .breakdown-bar, .workload-bar {
      height: 100%;
      border-radius: var(--radius-sm);
      transition: width 0.3s ease;
    }

    .breakdown-count, .platform-count, .workload-count {
      min-width: 24px;
      text-align: right;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .type-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .type-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
    }

    .type-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .type-count {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }

    .type-label {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .platform-icon-stat {
      font-size: 1.25rem;
      width: 32px;
    }

    .platform-name {
      flex: 1;
      font-size: 0.875rem;
    }

    .workload-owner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 120px;
      font-size: 0.8125rem;
    }

    .workload-owner .owner-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 600;
      color: white;
    }
  `]
})
export class ContentComponent implements OnInit {
  teamUtil = inject(TeamUtilService);
  pageMode = signal<PageMode>('library');
  viewMode = signal<ViewMode>('kanban');
  showModal = signal(false);
  editingItem: ContentItem | null = null;

  filterState: FilterValues = {};
  contentFilters: FilterConfig[] = [
    { key: 'type', label: 'Type', type: 'select', placeholder: 'All types', options: [
      { value: 'Blog Post', label: 'Blog Post' },
      { value: 'Social Image', label: 'Social Image' },
      { value: 'Social Video', label: 'Social Video' },
      { value: 'Newsletter', label: 'Newsletter' },
      { value: 'Case Study', label: 'Case Study' },
      { value: 'Product Update', label: 'Product Update' },
    ]},
    { key: 'owner', label: 'Owner', type: 'select', placeholder: 'All owners', options: [] },
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search content...' },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // Detect page mode from route
    const url = this.router.url;
    if (url.includes('/content/calendar')) {
      this.pageMode.set('content-calendar');
    } else if (url.includes('/content/analytics')) {
      this.pageMode.set('analytics');
    } else {
      this.pageMode.set('library');
    }
  }

  navigateToPage(mode: PageMode) {
    const routes: Record<PageMode, string> = {
      'library': '/content',
      'content-calendar': '/content/calendar',
      'analytics': '/content/analytics'
    };
    this.router.navigate([routes[mode]]);
  }

  // Filters
  filterType: ContentType | '' = '';
  filterPlatform: ContentPlatform | '' = '';
  filterOwner = '';
  filterStage: ContentStage | '' = '';

  // Form
  formData: Partial<ContentItem> = this.getEmptyForm();
  tagsInput = '';

  // Calendar
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  // Data
  get teamMembers() { return this.dataService.team(); }
  stages: ContentStage[] = ['ideas', 'development', 'review', 'approved', 'scheduled'];
  contentTypes: ContentType[] = ['video', 'image', 'blog', 'newsletter', 'podcast', 'infographic', 'social'];
  platforms: ContentPlatform[] = ['instagram', 'linkedin', 'twitter', 'website', 'youtube', 'tiktok', 'email', 'facebook'];

  content = signal<ContentItem[]>([
    {
      id: 1,
      title: 'Q2 Product Launch Video',
      description: 'Announce new CAT-MES features with a 60-second explainer video',
      stage: 'development',
      type: 'video',
      platforms: ['youtube', 'linkedin', 'instagram'],
      owner: 'Yael',
      collaborators: ['Artem', 'Igor'],
      blockers: [],
      dueDate: '2026-04-05',
      images: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400'],
      tags: ['product', 'launch', 'video'],
      createdAt: '2026-03-20',
      updatedAt: '2026-03-25'
    },
    {
      id: 2,
      title: 'Food Safety Week Blog Series',
      description: 'Three-part blog series covering HACCP, allergen management, and audit prep',
      stage: 'review',
      type: 'blog',
      platforms: ['website', 'linkedin'],
      owner: 'Artem',
      collaborators: ['Aisha'],
      blockers: ['Waiting for compliance review'],
      dueDate: '2026-04-01',
      images: [],
      tags: ['blog', 'food-safety', 'education'],
      createdAt: '2026-03-15',
      updatedAt: '2026-03-24'
    },
    {
      id: 3,
      title: 'Customer Success Story - Mountain Bake',
      description: 'Case study featuring Mountain Bake Co implementation success',
      stage: 'approved',
      type: 'blog',
      platforms: ['website', 'linkedin', 'email'],
      owner: 'Aisha',
      collaborators: ['David'],
      blockers: [],
      dueDate: '2026-04-10',
      scheduledDate: '2026-04-10',
      images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400'],
      tags: ['case-study', 'customer', 'success'],
      createdAt: '2026-03-10',
      updatedAt: '2026-03-26'
    },
    {
      id: 4,
      title: 'Weekly Tips: Audit Readiness',
      description: 'Quick tips carousel for Instagram on staying audit-ready',
      stage: 'scheduled',
      type: 'image',
      platforms: ['instagram', 'facebook'],
      owner: 'Yael',
      collaborators: [],
      blockers: [],
      scheduledDate: '2026-03-28',
      images: ['https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400'],
      tags: ['tips', 'audit', 'social'],
      createdAt: '2026-03-22',
      updatedAt: '2026-03-27'
    },
    {
      id: 5,
      title: 'Newsletter: March Industry Roundup',
      description: 'Monthly newsletter with FDA updates, industry news, and CAT-I tips',
      stage: 'ideas',
      type: 'newsletter',
      platforms: ['email'],
      owner: 'Artem',
      collaborators: ['Yael'],
      blockers: [],
      dueDate: '2026-04-02',
      images: [],
      tags: ['newsletter', 'monthly', 'industry'],
      createdAt: '2026-03-25',
      updatedAt: '2026-03-25'
    },
    {
      id: 6,
      title: 'Behind the Scenes: Team Culture',
      description: 'Show the human side of CAT-I with team photos and culture highlights',
      stage: 'ideas',
      type: 'social',
      platforms: ['instagram', 'linkedin'],
      owner: 'Yael',
      collaborators: ['Aisha'],
      blockers: [],
      images: [],
      tags: ['culture', 'team', 'behind-the-scenes'],
      createdAt: '2026-03-26',
      updatedAt: '2026-03-26'
    },
    {
      id: 7,
      title: 'LinkedIn Thought Leadership Post',
      description: 'Article on the future of food safety technology and AI integration',
      stage: 'development',
      type: 'blog',
      platforms: ['linkedin'],
      owner: 'Aisha',
      collaborators: ['Artem'],
      blockers: ['Need data from Q1 report'],
      dueDate: '2026-04-08',
      images: [],
      tags: ['thought-leadership', 'AI', 'food-safety'],
      createdAt: '2026-03-23',
      updatedAt: '2026-03-25'
    }
  ]);

  filteredContent = computed(() => {
    let items = this.content();
    if (this.filterType) items = items.filter(i => i.type === this.filterType);
    if (this.filterPlatform) items = items.filter(i => i.platforms.includes(this.filterPlatform as ContentPlatform));
    if (this.filterOwner) items = items.filter(i => i.owner === this.filterOwner);
    if (this.filterStage) items = items.filter(i => i.stage === this.filterStage);
    return items;
  });

  get currentMonthName(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('default', { month: 'long' });
  }

  get calendarDays(): { date: number; fullDate: string; currentMonth: boolean; isToday: boolean }[] {
    const days: { date: number; fullDate: string; currentMonth: boolean; isToday: boolean }[] = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const today = new Date();

    // Previous month days
    const prevMonthDays = firstDay.getDay();
    const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = prevMonth.getDate() - i;
      days.push({
        date,
        fullDate: `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
        currentMonth: false,
        isToday: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const fullDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: i,
        fullDate,
        currentMonth: true,
        isToday: today.getDate() === i && today.getMonth() === this.currentMonth && today.getFullYear() === this.currentYear
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        fullDate: `${this.currentYear}-${String(this.currentMonth + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        currentMonth: false,
        isToday: false
      });
    }

    return days;
  }

  getEmptyForm(): Partial<ContentItem> {
    return {
      title: '',
      description: '',
      stage: 'ideas',
      type: 'social',
      platforms: [],
      owner: 'Yael',
      collaborators: [],
      blockers: [],
      images: [],
      tags: []
    };
  }

  getStageConfig(stage: ContentStage) {
    return STAGE_CONFIG[stage];
  }

  getTypeConfig(type: ContentType) {
    return TYPE_CONFIG[type];
  }

  getPlatformConfig(platform: ContentPlatform) {
    return PLATFORM_CONFIG[platform];
  }

  getContentByStage(stage: ContentStage): ContentItem[] {
    return this.filteredContent().filter(item => item.stage === stage);
  }

  getContentForDate(date: string): ContentItem[] {
    return this.filteredContent().filter(item =>
      item.scheduledDate === date || item.dueDate === date
    );
  }

  getContentByType(type: ContentType): ContentItem[] {
    return this.content().filter(item => item.type === type);
  }

  getContentByPlatform(platform: ContentPlatform): ContentItem[] {
    return this.content().filter(item => item.platforms.includes(platform));
  }

  getContentByOwner(owner: string): ContentItem[] {
    return this.content().filter(item => item.owner === owner);
  }

  getBlockedCount(): number {
    return this.content().filter(item => item.blockers.length > 0).length;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    if (!/^\d{4}-/.test(date)) return date;
    const d = new Date(date.includes('T') ? date : date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onFilterChange(values: FilterValues) {
    this.filterState = values;
    this.filterType = (values['type'] as ContentType) || '';
    this.filterOwner = (values['owner'] as string) || '';
  }

  clearFilters() {
    this.filterType = '';
    this.filterPlatform = '';
    this.filterOwner = '';
    this.filterStage = '';
    this.filterState = {};
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  openCreateModal() {
    this.editingItem = null;
    this.formData = this.getEmptyForm();
    this.tagsInput = '';
    this.showModal.set(true);
  }

  openEditModal(item: ContentItem) {
    this.editingItem = item;
    this.formData = { ...item, platforms: [...item.platforms], collaborators: [...item.collaborators], blockers: [...item.blockers], images: [...item.images], tags: [...item.tags] };
    this.tagsInput = item.tags.join(', ');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingItem = null;
    this.formData = this.getEmptyForm();
  }

  isPlatformSelected(platform: ContentPlatform): boolean {
    return this.formData.platforms?.includes(platform) || false;
  }

  togglePlatform(platform: ContentPlatform) {
    if (!this.formData.platforms) this.formData.platforms = [];
    const index = this.formData.platforms.indexOf(platform);
    if (index > -1) {
      this.formData.platforms.splice(index, 1);
    } else {
      this.formData.platforms.push(platform);
    }
  }

  isCollaborator(name: string): boolean {
    return this.formData.collaborators?.includes(name) || false;
  }

  toggleCollaborator(name: string) {
    if (!this.formData.collaborators) this.formData.collaborators = [];
    const index = this.formData.collaborators.indexOf(name);
    if (index > -1) {
      this.formData.collaborators.splice(index, 1);
    } else {
      this.formData.collaborators.push(name);
    }
  }

  addBlocker() {
    if (!this.formData.blockers) this.formData.blockers = [];
    this.formData.blockers.push('');
  }

  removeBlocker(index: number) {
    this.formData.blockers?.splice(index, 1);
  }

  onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!this.formData.images) this.formData.images = [];
        this.formData.images.push(e.target?.result as string);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  removeImage(index: number) {
    this.formData.images?.splice(index, 1);
  }

  saveContent() {
    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    const now = new Date().toISOString().split('T')[0];

    if (this.editingItem) {
      this.content.update(items =>
        items.map(item =>
          item.id === this.editingItem!.id
            ? { ...item, ...this.formData, tags, updatedAt: now } as ContentItem
            : item
        )
      );
    } else {
      const newId = Math.max(...this.content().map(c => c.id)) + 1;
      this.content.update(items => [...items, {
        ...this.formData,
        id: newId,
        tags,
        createdAt: now,
        updatedAt: now
      } as ContentItem]);
    }

    this.closeModal();
  }

  deleteContent() {
    if (this.editingItem && confirm('Are you sure you want to delete this content?')) {
      this.content.update(items => items.filter(item => item.id !== this.editingItem!.id));
      this.closeModal();
    }
  }
}
