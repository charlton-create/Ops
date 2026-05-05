import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { IconComponent } from '../../shared/icons';
import {
  HubProject, HubTask, HubProjectStatus, HubProjectType,
  HUB_PROJECT_TYPES, HUB_PROJECT_STATUSES,
} from '../../core/models';

type ViewMode = 'timeline' | 'month';
type TimelineRange = '1m' | '3m' | '6m' | '12m';

interface TimelineRow {
  project: HubProject;
  startMs: number;
  endMs: number;
  leftPct: number;
  widthPct: number;
  taskMarkers: { left: number; task: HubTask; overdue: boolean }[];
  outOfRange: boolean;
}

interface CalendarCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: { type: 'project-target' | 'project-start' | 'task-due'; label: string; project: HubProject; task?: HubTask; isOverdue: boolean }[];
}

const DAY = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-project-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="Project Calendar" subtitle="Timeline & schedule view of all hub projects"
      icon="calendar" gradient="linear-gradient(135deg, #6366F1 0%, #1E1B4B 100%)">
      <button class="btn btn-ghost btn-sm" (click)="goToHub()">← Hub Dashboard</button>
    </app-header>

    <div class="content">
      <!-- View toggle + filters -->
      <div class="toolbar">
        <div class="view-toggle">
          <button [class.active]="view() === 'timeline'" (click)="view.set('timeline')">Timeline</button>
          <button [class.active]="view() === 'month'" (click)="view.set('month')">Month</button>
        </div>
        <div class="spacer"></div>
        <select [(ngModel)]="filterStatus" class="filter">
          <option value="all">All statuses</option>
          @for (s of STATUSES; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
        </select>
        <select [(ngModel)]="filterType" class="filter">
          <option value="all">All types</option>
          @for (t of TYPES; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
        </select>
      </div>

      @if (filteredProjects().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">No projects to display</div>
          <div>Adjust filters or add a project from the Hub Dashboard.</div>
        </div>
      } @else if (view() === 'timeline') {
        <!-- Timeline (Gantt-style) view -->
        <div class="card">
          <div class="card-header">
            <h3>Project Timeline</h3>
            <div class="range-toggle">
              <button [class.active]="range() === '1m'" (click)="range.set('1m')">1M</button>
              <button [class.active]="range() === '3m'" (click)="range.set('3m')">3M</button>
              <button [class.active]="range() === '6m'" (click)="range.set('6m')">6M</button>
              <button [class.active]="range() === '12m'" (click)="range.set('12m')">12M</button>
            </div>
          </div>

          <div class="card-body timeline-body">
            <div class="timeline-grid">
              <div class="timeline-axis">
                @for (m of axisMonths(); track m.label) {
                  <div class="axis-cell" [style.flex]="m.flex">{{ m.label }}</div>
                }
              </div>
              <div class="timeline-rows">
                @for (row of timelineRows(); track row.project.id) {
                  <div class="timeline-row">
                    <div class="row-label" (click)="openProject(row.project.id)">
                      <span class="row-name" [title]="row.project.name">{{ row.project.name }}</span>
                      <span class="row-meta">
                        <span class="row-status"
                              [style.background]="statusBg(row.project.status)"
                              [style.color]="statusColor(row.project.status)">{{ statusLabel(row.project.status) }}</span>
                        <span class="row-owner">{{ row.project.ownerName || row.project.ownerLabel || '—' }}</span>
                      </span>
                    </div>
                    <div class="row-track">
                      <div class="today-line" [style.left.%]="todayLinePct()"></div>
                      @if (row.outOfRange) {
                        <div class="out-of-range">No dates set / outside current range</div>
                      } @else {
                        <div class="row-bar"
                          [style.left.%]="row.leftPct"
                          [style.width.%]="row.widthPct"
                          [style.background]="statusBg(row.project.status)"
                          [style.color]="statusColor(row.project.status)"
                          (click)="openProject(row.project.id)">
                          <div class="row-bar-fill" [style.width.%]="row.project.progress"></div>
                          <span class="row-bar-label">{{ row.project.progress }}%</span>
                        </div>
                        @for (m of row.taskMarkers; track m.task.id) {
                          <div class="task-marker"
                               [class.overdue]="m.overdue"
                               [class.done]="m.task.status === 'done'"
                               [style.left.%]="m.left"
                               [title]="m.task.title + ' · due ' + formatShort(m.task.dueDate) + (m.overdue ? ' (overdue)' : '')"></div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="timeline-legend">
              <span class="legend-item"><span class="dot" style="background:#1A56DB"></span> Bar = project span (start → target)</span>
              <span class="legend-item"><span class="dot dark" style="background:#1E40AF"></span> Filled = % complete</span>
              <span class="legend-item"><span class="marker"></span> Task due date</span>
              <span class="legend-item"><span class="marker overdue"></span> Overdue task</span>
              <span class="legend-item"><span class="marker done"></span> Completed task</span>
              <span class="legend-item"><span class="line"></span> Today</span>
            </div>
          </div>
        </div>
      } @else {
        <!-- Month grid view -->
        <div class="card">
          <div class="card-header">
            <button class="btn btn-ghost btn-sm" (click)="prevMonth()">← Prev</button>
            <h3>{{ monthLabel() }}</h3>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-ghost btn-sm" (click)="thisMonth()">Today</button>
              <button class="btn btn-ghost btn-sm" (click)="nextMonth()">Next →</button>
            </div>
          </div>
          <div class="card-body">
            <div class="cal-grid">
              <div class="cal-head">Mon</div>
              <div class="cal-head">Tue</div>
              <div class="cal-head">Wed</div>
              <div class="cal-head">Thu</div>
              <div class="cal-head">Fri</div>
              <div class="cal-head weekend">Sat</div>
              <div class="cal-head weekend">Sun</div>
              @for (cell of monthCells(); track cell.date.getTime()) {
                <div class="cal-cell"
                     [class.dim]="!cell.inMonth"
                     [class.today]="cell.isToday">
                  <div class="cal-num">{{ cell.date.getDate() }}</div>
                  <div class="cal-events">
                    @for (e of cell.events; track $index) {
                      <div class="cal-event"
                           [class.target]="e.type === 'project-target'"
                           [class.start]="e.type === 'project-start'"
                           [class.task]="e.type === 'task-due'"
                           [class.overdue]="e.isOverdue"
                           [title]="e.label"
                           (click)="openProject(e.project.id)">
                        {{ e.label }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="cal-legend">
              <span class="legend-item"><span class="cal-dot start"></span> Project start</span>
              <span class="legend-item"><span class="cal-dot target"></span> Project target</span>
              <span class="legend-item"><span class="cal-dot task"></span> Task due</span>
              <span class="legend-item"><span class="cal-dot overdue"></span> Overdue</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .content { padding: 1.5rem; max-width: 1440px; margin: 0 auto; }

    .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar .spacer { flex: 1; }
    .view-toggle { display: flex; background: var(--bg-soft, #F3F4F6); border-radius: 8px; padding: 3px; gap: 2px; }
    .view-toggle button { padding: 6px 12px; border: none; background: transparent; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted, #6B7280); cursor: pointer; font-family: inherit; }
    .view-toggle button.active { background: var(--bg-elevated, #fff); color: #6366F1; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .filter { padding: 7px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 12px; background: var(--bg-elevated, #fff); font-family: inherit; }

    .empty-state { background: var(--bg-elevated, #fff); border: 1px dashed var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 48px 20px; text-align: center; color: var(--text-muted, #6B7280); }
    .empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
    .empty-title { font-weight: 700; color: var(--text, #111827); margin-bottom: 4px; }

    .card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; overflow: hidden; }
    .card-header { padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-hairline, #E5E7EB); flex-wrap: wrap; gap: 8px; }
    .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; }
    .card-body { padding: 16px 18px; }

    /* Timeline */
    .range-toggle { display: flex; background: var(--bg-soft, #F3F4F6); border-radius: 8px; padding: 3px; gap: 2px; }
    .range-toggle button { padding: 4px 10px; border: none; background: transparent; border-radius: 6px; font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); cursor: pointer; font-family: inherit; }
    .range-toggle button.active { background: var(--bg-elevated, #fff); color: #6366F1; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .timeline-body { padding: 0; }
    .timeline-grid { display: flex; flex-direction: column; }
    .timeline-axis { display: flex; padding: 8px 0 6px 220px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); position: sticky; top: 0; z-index: 1; }
    .axis-cell { font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); text-align: center; border-left: 1px dashed var(--border-hairline, #E5E7EB); }
    .axis-cell:first-child { border-left: none; }

    .timeline-rows { display: flex; flex-direction: column; }
    .timeline-row { display: grid; grid-template-columns: 220px 1fr; min-height: 48px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); }
    .timeline-row:last-child { border-bottom: none; }

    .row-label { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; border-right: 1px solid var(--border-hairline, #E5E7EB); justify-content: center; }
    .row-label:hover { background: var(--bg-soft, #F9FAFB); }
    .row-name { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-meta { display: flex; gap: 6px; align-items: center; font-size: 10px; color: var(--text-muted, #6B7280); }
    .row-status { padding: 1px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: capitalize; white-space: nowrap; }

    .row-track { position: relative; padding: 14px 0; }
    .today-line { position: absolute; top: 0; bottom: 0; width: 1.5px; background: #E11D48; opacity: 0.7; pointer-events: none; z-index: 0; }
    .row-bar { position: absolute; top: 50%; transform: translateY(-50%); height: 22px; min-width: 18px; border-radius: 6px; cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; transition: filter 0.15s; }
    .row-bar:hover { filter: brightness(0.92); }
    .row-bar-fill { position: absolute; top: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.18); border-radius: 6px 0 0 6px; }
    .row-bar-label { position: relative; z-index: 1; padding: 0 6px; }
    .out-of-range { font-size: 11px; color: var(--text-muted, #6B7280); font-style: italic; padding: 4px 12px; }
    .task-marker { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border-radius: 50%; background: #1A56DB; border: 1.5px solid var(--bg-elevated, #fff); cursor: pointer; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); z-index: 2; }
    .task-marker.overdue { background: #E11D48; }
    .task-marker.done { background: #10B981; }

    .timeline-legend { display: flex; gap: 16px; padding: 12px 18px; border-top: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); flex-wrap: wrap; font-size: 11px; color: var(--text-muted, #6B7280); }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 12px; height: 6px; border-radius: 3px; }
    .dot.dark { background: rgba(0,0,0,0.18); }
    .marker { width: 8px; height: 8px; border-radius: 50%; background: #1A56DB; border: 1.5px solid var(--bg-elevated, #fff); box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
    .marker.overdue { background: #E11D48; }
    .marker.done { background: #10B981; }
    .line { width: 2px; height: 12px; background: #E11D48; opacity: 0.7; }

    /* Month grid */
    .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; background: var(--border-hairline, #E5E7EB); border-radius: 10px; overflow: hidden; }
    .cal-head { background: var(--bg-soft, #F9FAFB); padding: 8px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.05em; }
    .cal-head.weekend { color: #94A3B8; }
    .cal-cell { background: var(--bg-elevated, #fff); min-height: 90px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; }
    .cal-cell.dim { background: var(--bg-soft, #F9FAFB); opacity: 0.5; }
    .cal-cell.today { background: #EEF2FF; outline: 2px solid #6366F1; outline-offset: -2px; }
    .cal-num { font-size: 12px; font-weight: 700; color: var(--text, #111827); }
    .cal-cell.dim .cal-num { color: var(--text-muted, #6B7280); }
    .cal-events { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .cal-event { font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; transition: filter 0.1s; }
    .cal-event:hover { filter: brightness(0.92); }
    .cal-event.target { background: #DBEAFE; color: #1E40AF; font-weight: 700; border-left: 3px solid #1A56DB; }
    .cal-event.start { background: #D1FAE5; color: #047857; border-left: 3px solid #10B981; }
    .cal-event.task { background: #F3F4F6; color: #4B5563; border-left: 3px solid #94A3B8; }
    .cal-event.overdue { background: #FEE2E2; color: #BE123C; border-left: 3px solid #E11D48; }

    .cal-legend { display: flex; gap: 16px; padding: 12px 0 0; flex-wrap: wrap; font-size: 11px; color: var(--text-muted, #6B7280); }
    .cal-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .cal-dot.start { background: #10B981; }
    .cal-dot.target { background: #1A56DB; }
    .cal-dot.task { background: #94A3B8; }
    .cal-dot.overdue { background: #E11D48; }

    .btn { padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; }
    .btn-ghost { background: var(--bg-soft, #F9FAFB); color: var(--text, #111827); border: 1px solid var(--border-hairline, #E5E7EB); }
    .btn-sm { padding: 6px 10px; font-size: 11px; }
  `]
})
export class ProjectCalendarComponent implements OnInit {
  api = inject(ApiService);
  private router = inject(Router);

  readonly STATUSES = HUB_PROJECT_STATUSES;
  readonly TYPES = HUB_PROJECT_TYPES;

  view = signal<ViewMode>('timeline');
  range = signal<TimelineRange>('3m');
  monthCursor = signal<Date>(this.firstOfMonth(new Date()));

  filterStatus: 'all' | HubProjectStatus = 'all';
  filterType: 'all' | HubProjectType = 'all';

  ngOnInit() {
    this.api.refreshProjects();
  }

  // ─── Filters ────────────────────────────────────────────────────────────
  filteredProjects = computed<HubProject[]>(() => {
    return this.api.projects().filter(p => {
      if (this.filterStatus !== 'all' && p.status !== this.filterStatus) return false;
      if (this.filterType !== 'all' && p.type !== this.filterType) return false;
      return true;
    });
  });

  // ─── Timeline ───────────────────────────────────────────────────────────
  timelineWindow = computed<{ startMs: number; endMs: number }>(() => {
    const now = Date.now();
    const past = 14 * DAY;
    const map = { '1m': 30 * DAY, '3m': 90 * DAY, '6m': 180 * DAY, '12m': 365 * DAY };
    return { startMs: now - past, endMs: now + map[this.range()] };
  });

  axisMonths = computed(() => {
    const { startMs, endMs } = this.timelineWindow();
    const totalMs = endMs - startMs;
    const months: { label: string; flex: number }[] = [];
    const cursor = new Date(startMs);
    cursor.setDate(1);
    while (cursor.getTime() < endMs) {
      const monthStart = Math.max(cursor.getTime(), startMs);
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      const monthEnd = Math.min(next.getTime(), endMs);
      const flex = (monthEnd - monthStart) / totalMs;
      months.push({
        label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        flex,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  });

  timelineRows = computed<TimelineRow[]>(() => {
    const { startMs, endMs } = this.timelineWindow();
    const total = endMs - startMs;
    return this.filteredProjects()
      .map(project => {
        const projStart = project.startDate ? new Date(project.startDate).getTime() : null;
        const projEnd = project.targetDate ? new Date(project.targetDate).getTime() : null;
        const fallbackStart = projStart ?? (projEnd ? projEnd - 14 * DAY : Date.now());
        const fallbackEnd = projEnd ?? (projStart ? projStart + 30 * DAY : Date.now() + 14 * DAY);
        const rawStart = Math.min(fallbackStart, fallbackEnd);
        const rawEnd = Math.max(fallbackStart, fallbackEnd);
        const outOfRange = rawEnd < startMs || rawStart > endMs || (!projStart && !projEnd);
        const visibleStart = Math.max(rawStart, startMs);
        const visibleEnd = Math.min(rawEnd, endMs);
        const leftPct = ((visibleStart - startMs) / total) * 100;
        const widthPct = Math.max(((visibleEnd - visibleStart) / total) * 100, 1.2);
        const taskMarkers = (project.tasks || [])
          .filter(t => t.dueDate)
          .map(t => {
            const dueMs = new Date(t.dueDate!).getTime();
            return {
              left: ((dueMs - startMs) / total) * 100,
              task: t,
              overdue: t.status !== 'done' && dueMs < Date.now(),
            };
          })
          .filter(m => m.left >= 0 && m.left <= 100);
        return { project, startMs: rawStart, endMs: rawEnd, leftPct, widthPct, taskMarkers, outOfRange };
      })
      .sort((a, b) => {
        if (a.outOfRange !== b.outOfRange) return a.outOfRange ? 1 : -1;
        return a.startMs - b.startMs;
      });
  });

  todayLinePct = computed(() => {
    const { startMs, endMs } = this.timelineWindow();
    return ((Date.now() - startMs) / (endMs - startMs)) * 100;
  });

  // ─── Month grid ─────────────────────────────────────────────────────────
  firstOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  monthLabel = computed(() =>
    this.monthCursor().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  monthCells = computed<CalendarCell[]>(() => {
    const cursor = this.monthCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first grid: shift so Mon=0..Sun=6
    const weekday = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - weekday);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projects = this.filteredProjects();
    const cells: CalendarCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const events: CalendarCell['events'] = [];

      for (const p of projects) {
        if (p.startDate && this.sameDay(new Date(p.startDate), date)) {
          events.push({
            type: 'project-start',
            label: `▶ ${p.name}`,
            project: p,
            isOverdue: false,
          });
        }
        if (p.targetDate && this.sameDay(new Date(p.targetDate), date)) {
          const overdue = p.status !== 'completed' && date < today;
          events.push({
            type: 'project-target',
            label: `🎯 ${p.name}`,
            project: p,
            isOverdue: overdue,
          });
        }
        for (const t of p.tasks ?? []) {
          if (t.dueDate && this.sameDay(new Date(t.dueDate), date)) {
            const overdue = t.status !== 'done' && date < today;
            events.push({
              type: 'task-due',
              label: `${overdue ? '⚠ ' : ''}${t.title}`,
              project: p,
              task: t,
              isOverdue: overdue,
            });
          }
        }
      }
      cells.push({
        date,
        inMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        events,
      });
    }
    return cells;
  });

  prevMonth() {
    const c = this.monthCursor();
    this.monthCursor.set(new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  nextMonth() {
    const c = this.monthCursor();
    this.monthCursor.set(new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  thisMonth() {
    this.monthCursor.set(this.firstOfMonth(new Date()));
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────
  statusLabel(id: HubProjectStatus): string {
    return this.STATUSES.find(s => s.id === id)?.label ?? id;
  }
  statusBg(id: HubProjectStatus): string {
    return this.STATUSES.find(s => s.id === id)?.bg ?? '#F3F4F6';
  }
  statusColor(id: HubProjectStatus): string {
    return this.STATUSES.find(s => s.id === id)?.color ?? '#6B7280';
  }
  formatShort(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  openProject(_id: number) {
    this.router.navigate(['/project-hub']);
  }

  goToHub() {
    this.router.navigate(['/project-hub']);
  }
}
