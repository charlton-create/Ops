import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CalendarEvent } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { TeamUtilService } from '../../shared/utils/team.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header
      title="Calendar"
      subtitle="Events & Reminders"
      icon="calendar"
      gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
    >
      <button class="btn-secondary btn-sm" (click)="showGoogleSyncModal.set(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Google Sync
      </button>
      <button class="btn-primary btn-sm" (click)="showAddModal.set(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
        Add Event
      </button>
    </app-header>

    <div class="calendar-content">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Today's Events</span>
            <span class="stat-value">{{ todayEvents().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">This Week</span>
            <span class="stat-value">{{ weekEvents().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Pending Reminders</span>
            <span class="stat-value">{{ pendingReminders().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">My Events</span>
            <span class="stat-value">{{ myEvents().length }}</span>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="calendar-main">
        <!-- Left Column -->
        <div class="calendar-left-col">
        <!-- Mini Calendar -->
        <div class="mini-calendar-card">
          <div class="cal-header">
            <button class="cal-nav" (click)="prevMonth()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span class="cal-title">{{ monthYear() }}</span>
            <button class="cal-nav" (click)="nextMonth()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div class="cal-grid">
            <div class="cal-weekday">Su</div>
            <div class="cal-weekday">Mo</div>
            <div class="cal-weekday">Tu</div>
            <div class="cal-weekday">We</div>
            <div class="cal-weekday">Th</div>
            <div class="cal-weekday">Fr</div>
            <div class="cal-weekday">Sa</div>
            @for (day of calendarDays(); track $index) {
              <div class="cal-day"
                   [class.other-month]="!day.currentMonth"
                   [class.today]="day.isToday"
                   [class.selected]="day.date === selectedDate()"
                   [class.has-events]="day.hasEvents"
                   (click)="selectDate(day.date)">
                {{ day.day }}
                @if (day.hasEvents) {
                  <span class="event-dot"></span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Google Calendar Sync Card -->
        <div class="google-sync-card">
          <div class="sync-header">
            <div class="google-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div class="sync-title">
              <span class="title">Google Integration</span>
              <span class="subtitle" [class.connected]="googleConnected()">{{ googleConnected() ? 'Connected' : 'Not connected' }}</span>
            </div>
          </div>
          @if (googleConnected()) {
            <div class="sync-status">
              <div class="status-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <span>Calendar synced</span>
              </div>
              <div class="status-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Gmail connected</span>
              </div>
              <div class="last-sync">Last sync: {{ lastSyncTime }}</div>
            </div>
            <button class="btn-secondary btn-sm sync-btn" (click)="syncNow()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Sync Now
            </button>
          } @else {
            <p class="sync-desc">Connect your CAT-I Google account to sync calendar events and send emails directly.</p>
            <button class="btn-google" (click)="connectGoogle()">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Account
            </button>
          }
        </div>
        </div>

        <!-- Events List -->
        <div class="events-panel">
          <div class="events-header">
            <h3>{{ selectedDateLabel() }}</h3>
            <div class="filter-tabs">
              <button class="filter-btn" [class.active]="filter() === 'all'" (click)="filter.set('all')">All</button>
              <button class="filter-btn" [class.active]="filter() === 'mine'" (click)="filter.set('mine')">My Events</button>
            </div>
          </div>
          <div class="events-list">
            @for (event of filteredEvents(); track event.id) {
              <div class="event-card" [class]="'event-' + event.type">
                <div class="event-type-icon">
                  <span [innerHTML]="getEventIcon(event.type)"></span>
                </div>
                <div class="event-details">
                  <div class="event-title">{{ event.title }}</div>
                  @if (event.time) {
                    <div class="event-time">{{ event.time }}</div>
                  }
                  @if (event.description) {
                    <div class="event-desc">{{ event.description }}</div>
                  }
                  @if (event.relatedTo) {
                    <div class="event-related">
                      <span class="badge" [class]="'badge-' + getRelatedBadge(event.relatedTo.type)">
                        {{ event.relatedTo.name }}
                      </span>
                    </div>
                  }
                </div>
                <div class="event-actions">
                  <div class="event-assignee">
                    <div class="assignee-avatar" [style.background]="teamUtil.getColor(event.assignee)">
                      {{ event.assignee.charAt(0) }}
                    </div>
                  </div>
                  @if (event.type === 'reminder' || event.type === 'task') {
                    <button class="complete-btn" [class.completed]="event.completed" (click)="toggleComplete(event)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="no-events">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <p>No events for this date</p>
              </div>
            }
          </div>

          <!-- Upcoming Reminders -->
          <div class="reminders-section">
            <h4>Upcoming Reminders</h4>
            <div class="reminders-list">
              @for (reminder of upcomingReminders().slice(0, 5); track reminder.id) {
                <div class="reminder-item" [class.overdue]="isOverdue(reminder.date)">
                  <div class="reminder-date">{{ formatShortDate(reminder.date) }}</div>
                  <div class="reminder-title">{{ reminder.title }}</div>
                  <div class="reminder-assignee">{{ reminder.assignee }}</div>
                </div>
              } @empty {
                <div class="no-reminders">No upcoming reminders</div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Google Sync Modal -->
    @if (showGoogleSyncModal()) {
      <div class="modal-overlay" (click)="showGoogleSyncModal.set(false)">
        <div class="modal-container modal-md" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Google Integration</h2>
            <button class="modal-close-btn" (click)="showGoogleSyncModal.set(false)">×</button>
          </div>
          <div class="modal-body">
            <div class="google-modal-icon">
              <svg viewBox="0 0 24 24" width="48" height="48">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>

            @if (googleConnected()) {
              <div class="connected-section">
                <div class="connected-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Connected as {{ googleEmail }}
                </div>

                <div class="sync-options">
                  <h4>Sync Settings</h4>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="syncCalendar" />
                    <span>Sync Google Calendar events</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="syncGmail" />
                    <span>Open emails in Gmail</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="autoSync" />
                    <span>Auto-sync every 15 minutes</span>
                  </label>
                </div>

                <div class="sync-actions">
                  <button class="btn-secondary" (click)="syncNow()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    Sync Now
                  </button>
                  <button class="btn-danger-outline" (click)="disconnectGoogle()">Disconnect</button>
                </div>
              </div>
            } @else {
              <div class="connect-section">
                <h3>Connect Your CAT-I Google Account</h3>
                <p>Sync your calendar and send emails directly from the Operations Hub using your CAT-I Google Workspace account.</p>

                <div class="features-list">
                  <div class="feature-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                    <span>Two-way calendar sync</span>
                  </div>
                  <div class="feature-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <span>Send emails via Gmail</span>
                  </div>
                  <div class="feature-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                    <span>Meeting reminders</span>
                  </div>
                </div>

                <button class="btn-google-lg" (click)="connectGoogle()">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
                <p class="privacy-note">Your &#64;cat-i.ai account will be used for all integrations</p>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Add Event Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" (click)="showAddModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Event</h2>
            <button class="modal-close-btn" (click)="showAddModal.set(false)">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Title <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="newEvent.title" placeholder="Event title">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date <span class="required">*</span></label>
                <input type="date" class="form-input" [(ngModel)]="newEvent.date">
              </div>
              <div class="form-group">
                <label class="form-label">Time</label>
                <input type="time" class="form-input" [(ngModel)]="newEvent.time">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" [(ngModel)]="newEvent.type">
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="deadline">Deadline</option>
                  <option value="call">Call</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Assignee</label>
                <select class="form-select" [(ngModel)]="newEvent.assignee">
                  @for (member of team; track member.id) {
                    <option [value]="member.name">{{ member.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" [(ngModel)]="newEvent.description" rows="3" placeholder="Event details..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showAddModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="addEvent()" [disabled]="!newEvent.title || !newEvent.date">Add Event</button>
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

    .calendar-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .calendar-main {
      flex: 1;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1rem;
      min-height: 0;
    }

    .calendar-left-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .mini-calendar-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.25rem;
      height: fit-content;
    }

    .cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .cal-title {
      font-weight: 600;
      font-size: 1rem;
    }

    .cal-nav {
      padding: 4px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-600);
    }

    .cal-nav:hover {
      background: var(--color-gray-100);
    }

    .cal-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .cal-weekday {
      text-align: center;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-gray-500);
      padding: 8px 0;
    }

    .cal-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      border-radius: var(--radius);
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
    }

    .cal-day:hover {
      background: var(--color-gray-100);
    }

    .cal-day.other-month {
      color: var(--color-gray-300);
    }

    .cal-day.today {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 600;
    }

    .cal-day.selected {
      background: var(--color-primary);
      color: white;
    }

    .cal-day.has-events::after {
      content: '';
      position: absolute;
      bottom: 4px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--color-primary);
    }

    .cal-day.selected.has-events::after {
      background: white;
    }

    .event-dot {
      display: none;
    }

    .events-panel {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .events-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-hairline);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .events-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
    }

    .filter-btn {
      padding: 6px 12px;
      border: none;
      background: none;
      font-size: 0.8125rem;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--color-gray-600);
    }

    .filter-btn.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 500;
    }

    .events-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .event-card {
      display: flex;
      gap: 12px;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: var(--color-gray-50);
      border-left: 3px solid var(--color-gray-300);
    }

    .event-meeting { border-left-color: var(--color-info); }
    .event-reminder { border-left-color: var(--color-warning); }
    .event-deadline { border-left-color: var(--color-error); }
    .event-call { border-left-color: var(--color-success); }
    .event-task { border-left-color: var(--status-purple-text); }

    .event-type-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius);
      background: white;
      color: var(--color-gray-600);
    }

    .event-details {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
    }

    .event-time {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-top: 2px;
    }

    .event-desc {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      margin-top: 4px;
    }

    .event-related {
      margin-top: 8px;
    }

    .event-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .assignee-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .complete-btn {
      padding: 4px;
      border: 1px solid var(--color-gray-300);
      background: white;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--color-gray-400);
    }

    .complete-btn:hover {
      border-color: var(--color-success);
      color: var(--color-success);
    }

    .complete-btn.completed {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }

    .no-events {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--color-gray-400);
      text-align: center;
    }

    .no-events p {
      margin: 1rem 0 0;
    }

    .reminders-section {
      border-top: 1px solid var(--border-hairline);
      padding: 1rem 1.25rem;
    }

    .reminders-section h4 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .reminders-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reminder-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      font-size: 0.8125rem;
    }

    .reminder-item.overdue {
      background: var(--status-red-bg);
    }

    .reminder-date {
      font-weight: 600;
      color: var(--color-gray-600);
      min-width: 60px;
    }

    .reminder-item.overdue .reminder-date {
      color: var(--color-error);
    }

    .reminder-title {
      flex: 1;
      color: var(--color-gray-800);
    }

    .reminder-assignee {
      color: var(--color-gray-500);
    }

    .no-reminders {
      font-size: 0.8125rem;
      color: var(--color-gray-400);
      text-align: center;
      padding: 1rem;
    }

    /* Google Sync Card */
    .google-sync-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1rem;
    }

    .sync-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 0.75rem;
    }

    .google-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-gray-50);
      border-radius: var(--radius);
    }

    .sync-title {
      display: flex;
      flex-direction: column;
    }

    .sync-title .title {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .sync-title .subtitle {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .sync-title .subtitle.connected {
      color: var(--color-success);
    }

    .sync-status {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 0.75rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--color-success);
    }

    .last-sync {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      margin-top: 4px;
    }

    .sync-desc {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      margin: 0 0 0.75rem;
      line-height: 1.4;
    }

    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: white;
      border: 1px solid var(--color-gray-300);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-google:hover {
      background: var(--color-gray-50);
      border-color: var(--color-gray-400);
    }

    .sync-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    /* Google Modal Styles */
    .modal-md {
      max-width: 420px;
    }

    .google-modal-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .connected-section {
      text-align: center;
    }

    .connected-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--status-green-bg);
      color: var(--color-success);
      border-radius: var(--radius-full);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 1.5rem;
    }

    .sync-options {
      text-align: left;
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
    }

    .sync-options h4 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
    }

    .sync-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-danger-outline {
      padding: 8px 16px;
      border: 1px solid var(--color-error);
      background: white;
      color: var(--color-error);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .btn-danger-outline:hover {
      background: var(--status-red-bg);
    }

    .connect-section {
      text-align: center;
    }

    .connect-section h3 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
    }

    .connect-section p {
      color: var(--color-gray-600);
      font-size: 0.875rem;
      margin: 0 0 1.5rem;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.875rem;
      color: var(--color-gray-700);
    }

    .feature-item svg {
      color: var(--color-primary);
    }

    .btn-google-lg {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px 20px;
      background: #4285F4;
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-google-lg:hover {
      background: #3367D6;
    }

    .privacy-note {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      margin-top: 1rem !important;
    }

    @media (max-width: 900px) {
      .calendar-main {
        grid-template-columns: 1fr;
      }
    }

    /* ========== MOBILE (≤768px) ========== */
    @media (max-width: 768px) {

      /* Content area */
      .calendar-content {
        padding: 0.75rem;
        gap: 0.75rem;
        overflow-y: auto;
      }

      /* Stats grid: 2×2 */
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      /* Main layout: single column, allow scrolling */
      .calendar-main {
        grid-template-columns: 1fr;
        overflow: visible;
        min-height: unset;
      }

      /* Left column stacks above events panel */
      .calendar-left-col {
        gap: 0.75rem;
      }

      /* Mini calendar: full width, taller day cells for touch */
      .mini-calendar-card {
        width: 100%;
      }

      .cal-day {
        min-height: 40px;
        font-size: 0.9375rem;
      }

      .cal-weekday {
        font-size: 0.75rem;
        padding: 6px 0;
      }

      /* Events panel: auto height, scrollable */
      .events-panel {
        overflow: visible;
        min-height: 300px;
      }

      .events-list {
        overflow: visible;
        max-height: none;
      }

      /* Event cards: more padding for touch */
      .event-card {
        padding: 1rem 0.875rem;
        gap: 10px;
      }

      .event-title {
        font-size: 1rem;
      }

      .event-time,
      .event-desc {
        font-size: 0.875rem;
      }

      /* Complete / action buttons: 44px touch target */
      .complete-btn {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .filter-btn {
        min-height: 40px;
        padding: 8px 14px;
      }

      /* "Add Event" button in header: already full-width via header, ensure min-height */
      .btn-primary.btn-sm,
      .btn-secondary.btn-sm {
        min-height: 40px;
        padding: 8px 12px;
      }

      /* Reminders section */
      .reminders-section {
        padding: 0.75rem 1rem;
      }

      .reminder-item {
        flex-wrap: wrap;
        gap: 6px;
        padding: 10px 12px;
      }

      /* Google sync card */
      .google-sync-card {
        padding: 0.875rem;
      }

      /* Modal: full screen on mobile */
      .modal-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0;
        border-radius: 0;
        min-height: 100dvh;
      }

      .modal-md {
        max-width: 100% !important;
      }

      /* Form inputs in modal: 16px to prevent iOS zoom */
      .form-input,
      .form-select,
      select,
      textarea,
      input[type="text"],
      input[type="number"],
      input[type="date"],
      input[type="time"] {
        font-size: 16px !important;
        min-height: 48px;
      }

      .modal-footer {
        flex-direction: column;
        gap: 8px;
      }

      .modal-footer .btn-primary,
      .modal-footer .btn-secondary {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }
    }
  `]
})
export class CalendarComponent {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);

  currentUser = this.authService.user()?.name ?? 'User';
  get team() { return this.dataService.team(); }

  showAddModal = signal(false);
  showGoogleSyncModal = signal(false);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  currentMonth = signal(new Date());
  filter = signal<'all' | 'mine'>('all');

  // Google Integration state
  googleConnected = signal(false);
  googleEmail = 'aisha@cat-i.ai';
  lastSyncTime = 'Just now';
  syncCalendar = true;
  syncGmail = true;
  autoSync = true;

  newEvent = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    assignee: this.authService.user()?.name ?? 'User'
  };

  todayEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.dataService.calendarEvents().filter(e => e.date === today);
  });

  weekEvents = computed(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return this.dataService.calendarEvents().filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  });

  pendingReminders = computed(() => {
    return this.dataService.calendarEvents().filter(e =>
      (e.type === 'reminder' || e.type === 'task') && !e.completed
    );
  });

  myEvents = computed(() => {
    return this.dataService.calendarEvents().filter(e => e.assignee === this.currentUser);
  });

  upcomingReminders = computed(() => {
    return this.dataService.getUpcomingReminders(this.currentUser);
  });

  filteredEvents = computed(() => {
    const date = this.selectedDate();
    let events = this.dataService.calendarEvents().filter(e => e.date === date);

    if (this.filter() === 'mine') {
      events = events.filter(e => e.assignee === this.currentUser);
    }

    return events.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  });

  monthYear = computed(() => {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  selectedDateLabel = computed(() => {
    const date = new Date(this.selectedDate() + 'T12:00:00');
    const today = new Date().toISOString().split('T')[0];
    if (this.selectedDate() === today) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  });

  calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date().toISOString().split('T')[0];
    const events = this.dataService.calendarEvents();

    const days: { day: number; date: string; currentMonth: boolean; isToday: boolean; hasEvents: boolean }[] = [];

    // Previous month padding
    const prevMonth = new Date(year, monthIndex, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      const date = `${year}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date,
        currentMonth: false,
        isToday: false,
        hasEvents: events.some(e => e.date === date)
      });
    }

    // Current month
    for (let day = 1; day <= totalDays; day++) {
      const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date,
        currentMonth: true,
        isToday: date === today,
        hasEvents: events.some(e => e.date === date)
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = `${year}-${String(monthIndex + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date,
        currentMonth: false,
        isToday: false,
        hasEvents: events.some(e => e.date === date)
      });
    }

    return days;
  });

  prevMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDate(date: string) {
    this.selectedDate.set(date);
  }

  getEventIcon(type: CalendarEvent['type']): string {
    const icons: Record<string, string> = {
      meeting: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      reminder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
      deadline: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      call: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      task: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    };
    return icons[type] || icons['task'];
  }

  getRelatedBadge(type: string): string {
    const badges: Record<string, string> = {
      lead: 'blue',
      project: 'orange',
      general: 'gray'
    };
    return badges[type] || 'gray';
  }

  formatShortDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isOverdue(dateStr: string): boolean {
    return dateStr < new Date().toISOString().split('T')[0];
  }

  toggleComplete(event: CalendarEvent) {
    this.dataService.updateCalendarEvent(event.id, { completed: !event.completed });
  }

  addEvent() {
    const timeStr = this.newEvent.time
      ? new Date(`2000-01-01T${this.newEvent.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : undefined;

    this.dataService.addCalendarEvent({
      title: this.newEvent.title,
      date: this.newEvent.date,
      time: timeStr,
      type: this.newEvent.type,
      description: this.newEvent.description || undefined,
      assignee: this.newEvent.assignee,
      completed: false
    });

    this.showAddModal.set(false);
    this.newEvent = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      type: 'meeting',
      description: '',
      assignee: this.authService.user()?.name ?? 'User'
    };
  }

  // Google Integration Methods
  connectGoogle() {
    // Simulate OAuth flow - in production this would open Google OAuth
    // For demo, we'll just set connected state
    this.googleConnected.set(true);
    this.lastSyncTime = 'Just now';
    this.showGoogleSyncModal.set(false);
  }

  disconnectGoogle() {
    this.googleConnected.set(false);
  }

  syncNow() {
    // Simulate sync
    this.lastSyncTime = 'Just now';
    // In production, this would trigger calendar sync via Google Calendar API
  }

  // Open Gmail compose with email address
  openGmailCompose(email: string, subject?: string, body?: string) {
    const params = new URLSearchParams();
    if (subject) params.set('su', subject);
    if (body) params.set('body', body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${params.toString() ? '&' + params.toString() : ''}`;
    window.open(gmailUrl, '_blank');
  }
}
