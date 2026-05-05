import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icons';
import {
  HubProject, HubTask, HubSubtask,
  HubProjectType, HubProjectStatus, HubTaskStatus, MedicPhase,
  MEDIC_PHASES, HUB_PROJECT_TYPES, HUB_PROJECT_STATUSES, HUB_TASK_STATUSES,
} from '../../core/models';

interface ProjectForm {
  name: string;
  description: string;
  type: HubProjectType;
  status: HubProjectStatus;
  currentPhase: MedicPhase;
  ownerId: number | null;
  ownerLabel: string;
  startDate: string;
  targetDate: string;
}

interface TaskForm {
  title: string;
  description: string;
  phase: MedicPhase;
  status: HubTaskStatus;
  responsible: string;
  accountable: string;
  informed: string;
  startDate: string;
  dueDate: string;
}

interface SubtaskForm {
  title: string;
  assignee: string;
  dueDate: string;
  status: HubTaskStatus;
}

@Component({
  selector: 'app-project-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="Project Hub" subtitle="MEDIC Six Sigma · Audit-Ready All The Time"
      icon="clipboard" gradient="linear-gradient(135deg, #6366F1 0%, #1E1B4B 100%)">
      @if (!selected()) {
        <button class="btn btn-primary btn-sm" (click)="openProjectModal()"><app-icon name="plus" [size]="14"></app-icon> New Project</button>
      } @else {
        <button class="btn btn-ghost btn-sm" (click)="selectedId.set(null)">← Back</button>
      }
    </app-header>

    <div class="content">
      @if (!selected()) {
        <!-- Dashboard list view -->
        <div class="kpi-row">
          <div class="kpi"><span class="kpi-label">Total Projects</span><span class="kpi-value">{{ api.projects().length }}</span></div>
          <div class="kpi success"><span class="kpi-label">In Progress</span><span class="kpi-value">{{ api.activeProjects().length }}</span></div>
          <div class="kpi warn"><span class="kpi-label">Blocked</span><span class="kpi-value">{{ api.blockedProjects().length }}</span></div>
          <div class="kpi danger"><span class="kpi-label">Overdue</span><span class="kpi-value">{{ api.overdueProjects().length }}</span></div>
        </div>

        <div class="filter-row">
          <input class="input" [(ngModel)]="filterSearch" placeholder="Search projects…" />
          <select [(ngModel)]="filterStatus">
            <option value="all">All statuses</option>
            @for (s of STATUSES; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
          </select>
          <select [(ngModel)]="filterType">
            <option value="all">All types</option>
            @for (t of TYPES; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
          </select>
        </div>

        @if (filteredProjects().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No projects match your filters</div>
            <div>Adjust filters or create a new project to get started.</div>
          </div>
        } @else {
          <div class="project-grid">
            @for (p of filteredProjects(); track p.id) {
              <div class="project-card" (click)="select(p.id)">
                <div class="pc-title">{{ p.name }}</div>
                <div class="pc-meta">
                  <span class="badge type-{{ p.type }}">{{ typeLabel(p.type) }}</span>
                  <span class="status-pill"
                    [style.background]="statusBg(p.status)"
                    [style.color]="statusColor(p.status)">{{ statusLabel(p.status) }}</span>
                  @if (isOverdue(p)) { <span class="status-pill" style="background:#ffe4e6;color:#be123c">Overdue</span> }
                </div>
                @if (p.description) { <p class="pc-desc">{{ p.description }}</p> }
                <div class="pc-phase">
                  <div class="phase-label">Phase: {{ p.currentPhase }} · {{ phaseName(p.currentPhase) }}</div>
                  <div class="medic-mini">
                    @for (ph of MEDIC; track ph.id; let i = $index) {
                      <div class="medic-step" [ngClass]="phaseStepClass(p, i)" [title]="ph.id + ' · ' + ph.name"></div>
                    }
                  </div>
                </div>
                <div class="pc-footer">
                  <span>Owner: <strong>{{ p.ownerName || p.ownerLabel || '—' }}</strong></span>
                  <div class="pc-progress">
                    <span>{{ p.progress }}%</span>
                    <div class="progress-bar"><div class="progress-fill" [style.width.%]="p.progress"></div></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- Detail view -->
        <ng-container *ngIf="selected() as p">
          <div class="detail-head">
            <div class="head-top">
              <div style="flex:1; min-width: 0;">
                <h2 class="detail-title">{{ p.name }}</h2>
                @if (p.description) { <p class="detail-desc">{{ p.description }}</p> }
                <div class="pc-meta" style="margin-top:8px">
                  <span class="badge type-{{ p.type }}">{{ typeLabel(p.type) }}</span>
                  <span class="status-pill"
                    [style.background]="statusBg(p.status)"
                    [style.color]="statusColor(p.status)">{{ statusLabel(p.status) }}</span>
                  @if (isOverdue(p)) { <span class="status-pill" style="background:#ffe4e6;color:#be123c">Overdue</span> }
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-ghost btn-sm" (click)="openProjectModal(p)">Edit</button>
                <button class="btn btn-danger btn-sm" (click)="deleteProject(p)">Delete</button>
              </div>
            </div>
            <div class="meta-grid">
              <div><span class="k">Owner</span><span class="v">{{ p.ownerName || p.ownerLabel || '—' }}</span></div>
              <div><span class="k">Start Date</span><span class="v">{{ formatDate(p.startDate) }}</span></div>
              <div><span class="k">Target</span><span class="v" [style.color]="isOverdue(p) ? '#E11D48' : ''">{{ formatDate(p.targetDate) }}</span></div>
              <div><span class="k">Progress</span><span class="v">{{ p.progress }}% complete</span></div>
              <div><span class="k">Total Tasks</span><span class="v">{{ p.tasks.length }}</span></div>
            </div>
          </div>

          <!-- MEDIC Stepper -->
          <div class="medic-stepper">
            <h3 class="medic-stepper-title">MEDIC Six Sigma Phase</h3>
            <div class="medic-track">
              @for (ph of MEDIC; track ph.id; let i = $index) {
                <div class="medic-phase" [ngClass]="phaseStepClassDetail(p, i)" (click)="phaseTab.set(ph.id)">
                  <div class="medic-letter">{{ ph.id }}</div>
                  <div class="medic-name">{{ ph.name }}</div>
                  <div class="medic-tasks">{{ tasksByPhase(p, ph.id, true).length }}/{{ tasksByPhase(p, ph.id).length }} tasks</div>
                </div>
              }
            </div>
          </div>

          <!-- Phase Tabs -->
          <div class="phase-tabs">
            @for (ph of MEDIC; track ph.id) {
              <button class="phase-tab" [class.active]="phaseTab() === ph.id" (click)="phaseTab.set(ph.id)">
                {{ ph.id }} · {{ ph.name }}
                <span class="count">{{ tasksByPhase(p, ph.id).length }}</span>
              </button>
            }
          </div>

          <div class="task-section-head">
            <div>
              <h3 class="section-title">{{ phaseName(phaseTab()) }}</h3>
              <p class="section-sub">{{ phaseDesc(phaseTab()) }}</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="openTaskModal()"><app-icon name="plus" [size]="12"></app-icon> Add Task</button>
          </div>

          @if (tasksByPhase(p, phaseTab()).length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📝</div>
              <div class="empty-title">No tasks in this phase yet</div>
              <div>Add a task to start tracking work in <strong>{{ phaseName(phaseTab()) }}</strong>.</div>
            </div>
          } @else {
            <div class="task-list">
              @for (t of tasksByPhase(p, phaseTab()); track t.id) {
                <div class="task-card">
                  <div class="task-card-head">
                    <div style="flex:1; min-width: 0;">
                      <h4 class="task-title">{{ t.title }}</h4>
                      @if (t.description) { <p class="task-desc">{{ t.description }}</p> }
                      <div class="pc-meta">
                        <span class="status-pill"
                          [style.background]="taskStatusBg(t.status)"
                          [style.color]="taskStatusColor(t.status)">{{ taskStatusLabel(t.status) }}</span>
                        @if (isTaskOverdue(t)) { <span class="status-pill" style="background:#ffe4e6;color:#be123c">Overdue</span> }
                      </div>
                      <div class="raci-row">
                        <div class="raci-item">
                          <div class="raci-letter raci-r">R</div>
                          <div class="raci-info">
                            <span class="role">Responsible</span><span class="who">{{ t.responsible || '—' }}</span>
                          </div>
                        </div>
                        <div class="raci-item">
                          <div class="raci-letter raci-a">A</div>
                          <div class="raci-info">
                            <span class="role">Accountable</span><span class="who">{{ t.accountable || '—' }}</span>
                          </div>
                        </div>
                        <div class="raci-item">
                          <div class="raci-letter raci-i">I</div>
                          <div class="raci-info">
                            <span class="role">Informed</span><span class="who">{{ t.informed || '—' }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="task-meta-row">
                        <span class="task-meta-item">📅 Start: <strong>{{ formatShort(t.startDate) }}</strong></span>
                        <span class="task-meta-item" [class.overdue]="isTaskOverdue(t)">🎯 Due: <strong>{{ formatShort(t.dueDate) }}</strong></span>
                        @if (t.subtasks.length > 0) {
                          <span class="task-meta-item">✓ {{ countSubtaskDone(t) }}/{{ t.subtasks.length }} subtasks</span>
                        }
                      </div>
                    </div>
                    <div class="task-actions">
                      <button class="icon-btn" (click)="openTaskModal(t)" title="Edit">✎</button>
                      <button class="icon-btn" (click)="deleteTask(t)" title="Delete">✕</button>
                    </div>
                  </div>

                  <div class="subtask-section">
                    <div class="subtask-head">
                      <span class="subtask-title-label">Subtasks</span>
                      <button class="btn btn-ghost btn-xs" (click)="openSubtaskModal(t.id)">+ Add subtask</button>
                    </div>
                    @if (t.subtasks.length === 0) {
                      <div class="subtask-empty">No subtasks yet.</div>
                    } @else {
                      <div class="subtask-list">
                        @for (s of t.subtasks; track s.id) {
                          <div class="subtask-row">
                            <div class="subtask-check" [class.done]="s.status === 'done'" (click)="toggleSubtask(t.id, s)">
                              {{ s.status === 'done' ? '✓' : '' }}
                            </div>
                            <div class="subtask-text" [class.done]="s.status === 'done'">{{ s.title }}</div>
                            <div class="subtask-meta">
                              <span>👤 {{ s.assignee }}</span>
                              <span [class.overdue]="isSubtaskOverdue(s)">📅 {{ formatShort(s.dueDate) }}</span>
                            </div>
                            <button class="icon-btn" (click)="openSubtaskModal(t.id, s)" title="Edit">✎</button>
                            <button class="icon-btn" (click)="deleteSubtask(t.id, s)" title="Delete">✕</button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </ng-container>
      }
    </div>

    <!-- Project Modal -->
    @if (showProjectModal()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editingProject ? 'Edit Project' : 'New Project' }}</h3>
            <button class="icon-btn" (click)="closeProjectModal()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <label class="field">Project Name *
              <input [(ngModel)]="projectForm.name" placeholder="e.g. CAT-MES v2.4 Batch Genealogy" />
            </label>
            <label class="field">Description
              <textarea [(ngModel)]="projectForm.description" rows="3" placeholder="What problem does this solve? What's the scope?"></textarea>
            </label>
            <div class="field-row">
              <label class="field">Type
                <select [(ngModel)]="projectForm.type">
                  @for (t of TYPES; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
                </select>
              </label>
              <label class="field">Status
                <select [(ngModel)]="projectForm.status">
                  @for (s of STATUSES; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
                </select>
              </label>
            </div>
            <div class="field-row">
              <label class="field">Current MEDIC Phase
                <select [(ngModel)]="projectForm.currentPhase">
                  @for (ph of MEDIC; track ph.id) { <option [value]="ph.id">{{ ph.id }} · {{ ph.name }}</option> }
                </select>
              </label>
              <label class="field">Owner (Team Member)
                <select [(ngModel)]="projectForm.ownerId">
                  <option [ngValue]="null">— Use freeform label below —</option>
                  @for (m of api.team(); track m.id) { <option [ngValue]="m.id">{{ m.name }}</option> }
                </select>
              </label>
            </div>
            <label class="field">Owner Label (freeform fallback)
              <input [(ngModel)]="projectForm.ownerLabel" placeholder="e.g. Plant Manager, External Vendor" />
            </label>
            <div class="field-row">
              <label class="field">Start Date
                <input type="date" [(ngModel)]="projectForm.startDate" />
              </label>
              <label class="field">Target Completion
                <input type="date" [(ngModel)]="projectForm.targetDate" />
              </label>
            </div>
            @if (modalError()) { <div class="error">{{ modalError() }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeProjectModal()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveProject()">
              {{ saving() ? 'Saving…' : (editingProject ? 'Save Changes' : 'Create Project') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Task Modal -->
    @if (showTaskModal()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editingTask ? 'Edit Task' : 'New Task' }}</h3>
            <button class="icon-btn" (click)="closeTaskModal()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <label class="field">Task Title *
              <input [(ngModel)]="taskForm.title" placeholder="What needs to happen?" />
            </label>
            <label class="field">Description
              <textarea [(ngModel)]="taskForm.description" rows="3" placeholder="Details, context, acceptance criteria"></textarea>
            </label>
            <div class="field-row">
              <label class="field">MEDIC Phase
                <select [(ngModel)]="taskForm.phase">
                  @for (ph of MEDIC; track ph.id) { <option [value]="ph.id">{{ ph.id }} · {{ ph.name }}</option> }
                </select>
              </label>
              <label class="field">Status
                <select [(ngModel)]="taskForm.status">
                  @for (s of TASK_STATUSES; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
                </select>
              </label>
            </div>
            <div class="raci-block">
              <div class="raci-block-label">RACI Assignment</div>
              <label class="field">
                <span><span class="raci-dot" style="color:#1A56DB">●</span> Responsible *</span>
                <input [(ngModel)]="taskForm.responsible" placeholder="Who does the work?" />
                <small>The person performing the task hands-on.</small>
              </label>
              <label class="field">
                <span><span class="raci-dot" style="color:#E11D48">●</span> Accountable *</span>
                <input [(ngModel)]="taskForm.accountable" placeholder="Who owns the outcome?" />
                <small>The single person on the hook for the result.</small>
              </label>
              <label class="field">
                <span><span class="raci-dot" style="color:#0D9488">●</span> Informed</span>
                <input [(ngModel)]="taskForm.informed" placeholder="Who needs to be kept in the loop?" />
                <small>Comma-separate multiple stakeholders.</small>
              </label>
            </div>
            <div class="field-row">
              <label class="field">Start Date<input type="date" [(ngModel)]="taskForm.startDate" /></label>
              <label class="field">Due Date<input type="date" [(ngModel)]="taskForm.dueDate" /></label>
            </div>
            @if (modalError()) { <div class="error">{{ modalError() }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeTaskModal()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveTask()">
              {{ saving() ? 'Saving…' : (editingTask ? 'Save Changes' : 'Create Task') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Subtask Modal -->
    @if (showSubtaskModal()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editingSubtask ? 'Edit Subtask' : 'New Subtask' }}</h3>
            <button class="icon-btn" (click)="closeSubtaskModal()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <label class="field">Subtask Title *
              <input [(ngModel)]="subtaskForm.title" placeholder="A specific actionable step" />
            </label>
            <div class="field-row">
              <label class="field">Assignee *<input [(ngModel)]="subtaskForm.assignee" placeholder="Who is doing this?" /></label>
              <label class="field">Due Date<input type="date" [(ngModel)]="subtaskForm.dueDate" /></label>
            </div>
            <label class="field">Status
              <select [(ngModel)]="subtaskForm.status">
                @for (s of TASK_STATUSES; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
              </select>
            </label>
            @if (modalError()) { <div class="error">{{ modalError() }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeSubtaskModal()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveSubtask()">
              {{ saving() ? 'Saving…' : (editingSubtask ? 'Save Changes' : 'Create Subtask') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .content { padding: 1.5rem; max-width: 1440px; margin: 0 auto; }

    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; padding: 14px 18px; }
    .kpi-label { font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.05em; display: block; }
    .kpi-value { font-size: 26px; font-weight: 800; display: block; margin-top: 4px; }
    .kpi.success .kpi-value { color: #10B981; }
    .kpi.warn .kpi-value { color: #F59E0B; }
    .kpi.danger .kpi-value { color: #E11D48; }

    .filter-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-row .input, .filter-row select { padding: 8px 12px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 12px; background: var(--bg-elevated, #fff); font-family: inherit; }
    .filter-row .input { min-width: 240px; }

    .empty-state { background: var(--bg-elevated, #fff); border: 1px dashed var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 48px 20px; text-align: center; color: var(--text-muted, #6B7280); }
    .empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.6; }
    .empty-title { font-weight: 700; color: var(--text, #111827); margin-bottom: 4px; }

    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
    .project-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 16px 18px; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; display: flex; flex-direction: column; gap: 10px; }
    .project-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
    .pc-title { font-size: 14px; font-weight: 700; line-height: 1.35; }
    .pc-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .pc-desc { font-size: 12px; color: var(--text-muted, #6B7280); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pc-phase .phase-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); font-weight: 700; margin-bottom: 4px; }
    .medic-mini { display: flex; gap: 4px; }
    .medic-step { flex: 1; height: 4px; border-radius: 2px; background: var(--border-hairline, #E5E7EB); }
    .medic-step.done { background: #10B981; }
    .medic-step.active { background: #1A56DB; }
    .pc-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border-hairline, #E5E7EB); font-size: 11px; color: var(--text-muted, #6B7280); }
    .pc-progress { display: flex; gap: 8px; align-items: center; font-weight: 700; }
    .progress-bar { width: 70px; height: 5px; background: var(--bg-soft, #F3F4F6); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: #1A56DB; transition: width 0.3s ease; }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge.type-upgrade  { background: #ede9fe; color: #6d28d9; }
    .badge.type-fix      { background: #ffe4e6; color: #be123c; }
    .badge.type-qa       { background: #ccfbf1; color: #0f766e; }
    .badge.type-general  { background: #f3f4f6; color: #4b5563; }
    .badge.type-customer { background: #d1fae5; color: #047857; }
    .badge.type-product  { background: #dbeafe; color: #1e40af; }
    .badge.type-marketing{ background: #ede9fe; color: #6d28d9; }
    .badge.type-compliance{ background: #fef3c7; color: #b45309; }
    .status-pill { padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

    .detail-head { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 22px 26px; margin-bottom: 16px; }
    .head-top { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
    .detail-title { font-size: 22px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.4px; }
    .detail-desc { color: var(--text-muted, #6B7280); margin: 0; max-width: 720px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; padding-top: 14px; border-top: 1px solid var(--border-hairline, #E5E7EB); }
    .meta-grid div { display: flex; flex-direction: column; }
    .meta-grid .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); font-weight: 700; margin-bottom: 4px; }
    .meta-grid .v { font-size: 13px; font-weight: 600; }

    .medic-stepper { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 20px 26px; margin-bottom: 16px; }
    .medic-stepper-title { font-size: 14px; font-weight: 700; margin: 0 0 14px; }
    .medic-track { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .medic-phase { background: var(--bg-soft, #F3F4F6); border: 1.5px solid var(--border-hairline, #E5E7EB); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; }
    .medic-phase:hover { border-color: #1A56DB; }
    .medic-phase.active { background: #e8efff; border-color: #1A56DB; box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }
    .medic-phase.complete { background: #d1fae5; border-color: #10B981; }
    .medic-letter { font-size: 22px; font-weight: 700; color: #1A56DB; line-height: 1; margin-bottom: 4px; }
    .medic-phase.complete .medic-letter { color: #047857; }
    .medic-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .medic-tasks { font-size: 11px; color: var(--text-muted, #6B7280); margin-top: 3px; }

    .phase-tabs { display: flex; gap: 4px; background: var(--bg-soft, #F3F4F6); border-radius: 999px; padding: 4px; margin-bottom: 16px; overflow-x: auto; }
    .phase-tab { background: transparent; border: none; padding: 8px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--text-muted, #6B7280); cursor: pointer; font-family: inherit; white-space: nowrap; }
    .phase-tab.active { background: var(--bg-elevated, #fff); color: #1A56DB; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .phase-tab .count { margin-left: 6px; background: var(--bg-soft, #F3F4F6); padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .phase-tab.active .count { background: #e8efff; color: #1A56DB; }

    .task-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
    .section-title { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
    .section-sub { font-size: 12px; color: var(--text-muted, #6B7280); margin: 0; }

    .task-list { display: flex; flex-direction: column; gap: 10px; }
    .task-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; overflow: hidden; }
    .task-card-head { padding: 14px 18px; display: flex; justify-content: space-between; gap: 14px; }
    .task-title { font-size: 14px; font-weight: 700; margin: 0 0 4px; }
    .task-desc { font-size: 12px; color: var(--text-muted, #6B7280); margin: 0 0 8px; }
    .raci-row { display: flex; gap: 18px; flex-wrap: wrap; padding-top: 10px; border-top: 1px dashed var(--border-hairline, #E5E7EB); margin-top: 8px; }
    .raci-item { display: flex; align-items: center; gap: 8px; font-size: 11px; }
    .raci-letter { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-weight: 700; font-size: 10px; color: white; }
    .raci-r { background: #1A56DB; } .raci-a { background: #E11D48; } .raci-i { background: #0D9488; }
    .raci-info { display: flex; flex-direction: column; line-height: 1.3; }
    .raci-info .role { font-size: 9px; text-transform: uppercase; color: var(--text-muted, #6B7280); letter-spacing: 0.04em; }
    .raci-info .who { font-weight: 700; }
    .task-meta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: var(--text-muted, #6B7280); }
    .task-meta-item.overdue { color: #E11D48; font-weight: 700; }
    .task-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .icon-btn { width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--text-muted, #6B7280); cursor: pointer; font-size: 14px; }
    .icon-btn:hover { background: var(--bg-soft, #F3F4F6); color: var(--text, #111827); }

    .subtask-section { background: var(--bg-soft, #F9FAFB); border-top: 1px solid var(--border-hairline, #E5E7EB); padding: 12px 18px; }
    .subtask-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .subtask-title-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); }
    .subtask-empty { font-size: 11px; color: var(--text-muted, #6B7280); font-style: italic; }
    .subtask-list { display: flex; flex-direction: column; gap: 6px; }
    .subtask-row { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; padding: 7px 12px; display: flex; align-items: center; gap: 10px; font-size: 12px; }
    .subtask-check { width: 16px; height: 16px; border: 1.5px solid var(--border-hairline, #d1d5db); border-radius: 4px; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
    .subtask-check.done { background: #10B981; border-color: #10B981; color: white; font-size: 10px; }
    .subtask-text { flex: 1; }
    .subtask-text.done { text-decoration: line-through; color: var(--text-muted, #6B7280); }
    .subtask-meta { display: flex; gap: 10px; font-size: 11px; color: var(--text-muted, #6B7280); }
    .subtask-meta .overdue { color: #E11D48; font-weight: 700; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.5); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
    .modal { background: var(--bg-elevated, #fff); border-radius: 12px; max-width: 580px; width: 100%; max-height: calc(100vh - 80px); display: flex; flex-direction: column; overflow: hidden; }
    .modal-head { padding: 18px 22px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); display: flex; justify-content: space-between; align-items: center; }
    .modal-head h3 { font-size: 16px; font-weight: 800; }
    .modal-body { padding: 18px 22px; overflow-y: auto; }
    .modal-footer { padding: 12px 22px; border-top: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); display: flex; justify-content: flex-end; gap: 8px; }

    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .field input, .field select, .field textarea { padding: 8px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 12px; background: var(--bg-elevated, #fff); font-family: inherit; }
    .field textarea { resize: vertical; min-height: 60px; }
    .field small { color: var(--text-muted, #6B7280); font-weight: 400; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .raci-block { background: var(--bg-soft, #F9FAFB); border-radius: 8px; padding: 14px; margin: 12px 0; }
    .raci-block-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); margin-bottom: 10px; }
    .raci-dot { font-size: 14px; margin-right: 4px; }

    .error { color: #E11D48; font-size: 12px; padding: 8px 12px; background: #ffe4e6; border-radius: 6px; margin-top: 10px; }

    .btn { padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
    .btn-primary { background: #6366F1; color: white; }
    .btn-primary:hover { background: #4F46E5; }
    .btn-ghost { background: var(--bg-soft, #F9FAFB); color: var(--text, #111827); border: 1px solid var(--border-hairline, #E5E7EB); }
    .btn-danger { background: #E11D48; color: white; }
    .btn-sm { padding: 6px 10px; font-size: 11px; }
    .btn-xs { padding: 3px 8px; font-size: 10px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ProjectHubComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);

  readonly MEDIC = MEDIC_PHASES;
  readonly TYPES = HUB_PROJECT_TYPES;
  readonly STATUSES = HUB_PROJECT_STATUSES;
  readonly TASK_STATUSES = HUB_TASK_STATUSES;

  selectedId = signal<number | null>(null);
  phaseTab = signal<MedicPhase>('M');
  filterSearch = '';
  filterStatus: 'all' | HubProjectStatus = 'all';
  filterType: 'all' | HubProjectType = 'all';

  showProjectModal = signal(false);
  showTaskModal = signal(false);
  showSubtaskModal = signal(false);
  saving = signal(false);
  modalError = signal('');

  editingProject: HubProject | null = null;
  editingTask: HubTask | null = null;
  editingSubtask: HubSubtask | null = null;
  taskFormProjectId: number | null = null;
  subtaskFormTaskId: number | null = null;

  projectForm: ProjectForm = this.emptyProjectForm();
  taskForm: TaskForm = this.emptyTaskForm();
  subtaskForm: SubtaskForm = this.emptySubtaskForm();

  ngOnInit() {
    this.api.refreshProjects();
    this.api.loadAll();
  }

  emptyProjectForm(): ProjectForm {
    return {
      name: '', description: '', type: 'general', status: 'planning', currentPhase: 'M',
      ownerId: null, ownerLabel: '', startDate: '', targetDate: '',
    };
  }
  emptyTaskForm(): TaskForm {
    return {
      title: '', description: '', phase: this.phaseTab(), status: 'todo',
      responsible: '', accountable: '', informed: '',
      startDate: '', dueDate: '',
    };
  }
  emptySubtaskForm(): SubtaskForm {
    return { title: '', assignee: '', dueDate: '', status: 'todo' };
  }

  selected = computed(() => {
    const id = this.selectedId();
    return id ? this.api.projects().find(p => p.id === id) ?? null : null;
  });

  filteredProjects = computed<HubProject[]>(() => {
    const all = this.api.projects();
    const q = this.filterSearch.toLowerCase().trim();
    return all.filter(p => {
      if (this.filterStatus !== 'all' && p.status !== this.filterStatus) return false;
      if (this.filterType !== 'all' && p.type !== this.filterType) return false;
      if (q) {
        const blob = `${p.name} ${p.description ?? ''} ${p.ownerName ?? ''} ${p.ownerLabel ?? ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────
  typeLabel(id: HubProjectType): string {
    return this.TYPES.find(t => t.id === id)?.label ?? id;
  }
  statusLabel(id: HubProjectStatus): string {
    return this.STATUSES.find(s => s.id === id)?.label ?? id;
  }
  statusBg(id: HubProjectStatus): string { return this.STATUSES.find(s => s.id === id)?.bg ?? '#F3F4F6'; }
  statusColor(id: HubProjectStatus): string { return this.STATUSES.find(s => s.id === id)?.color ?? '#6B7280'; }
  taskStatusLabel(id: HubTaskStatus): string { return this.TASK_STATUSES.find(s => s.id === id)?.label ?? id; }
  taskStatusBg(id: HubTaskStatus): string { return this.TASK_STATUSES.find(s => s.id === id)?.bg ?? '#F3F4F6'; }
  taskStatusColor(id: HubTaskStatus): string { return this.TASK_STATUSES.find(s => s.id === id)?.color ?? '#6B7280'; }
  phaseName(id: MedicPhase): string { return this.MEDIC.find(p => p.id === id)?.name ?? ''; }
  phaseDesc(id: MedicPhase): string { return this.MEDIC.find(p => p.id === id)?.desc ?? ''; }

  isOverdue(p: HubProject): boolean {
    if (!p.targetDate || p.status === 'completed') return false;
    return new Date(p.targetDate) < new Date(new Date().toDateString());
  }
  isTaskOverdue(t: HubTask): boolean {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < new Date(new Date().toDateString());
  }
  isSubtaskOverdue(s: HubSubtask): boolean {
    if (!s.dueDate || s.status === 'done') return false;
    return new Date(s.dueDate) < new Date(new Date().toDateString());
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  formatShort(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  tasksByPhase(p: HubProject, phase: MedicPhase, doneOnly = false): HubTask[] {
    const tasks = p.tasks.filter(t => t.phase === phase);
    return doneOnly ? tasks.filter(t => t.status === 'done') : tasks;
  }
  countSubtaskDone(t: HubTask): number {
    return t.subtasks.filter(s => s.status === 'done').length;
  }

  phaseStepClass(p: HubProject, idx: number): string {
    const currentIdx = this.MEDIC.findIndex(ph => ph.id === p.currentPhase);
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'active';
    return '';
  }
  phaseStepClassDetail(p: HubProject, idx: number): string {
    const currentIdx = this.MEDIC.findIndex(ph => ph.id === p.currentPhase);
    if (idx < currentIdx) return 'complete';
    if (idx === currentIdx) return 'active';
    return '';
  }

  select(id: number) {
    const p = this.api.projects().find(x => x.id === id);
    if (p) this.phaseTab.set(p.currentPhase);
    this.selectedId.set(id);
  }

  // ─── Project modal ──────────────────────────────────────────────────────
  openProjectModal(project?: HubProject | null) {
    this.editingProject = project ?? null;
    this.modalError.set('');
    if (project) {
      this.projectForm = {
        name: project.name,
        description: project.description ?? '',
        type: project.type,
        status: project.status,
        currentPhase: project.currentPhase,
        ownerId: project.ownerId ?? null,
        ownerLabel: project.ownerLabel ?? '',
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        targetDate: project.targetDate ? project.targetDate.slice(0, 10) : '',
      };
    } else {
      this.projectForm = this.emptyProjectForm();
    }
    this.showProjectModal.set(true);
  }
  closeProjectModal() {
    this.showProjectModal.set(false);
    this.editingProject = null;
  }

  async saveProject() {
    if (!this.projectForm.name.trim()) { this.modalError.set('Project name is required.'); return; }
    this.saving.set(true);
    this.modalError.set('');
    try {
      if (this.editingProject) {
        await this.api.updateHubProject(this.editingProject.id, this.projectForm);
      } else {
        const created = await this.api.addHubProject(this.projectForm);
        this.selectedId.set(created.id);
      }
      this.showProjectModal.set(false);
      this.editingProject = null;
    } catch (err: any) {
      this.modalError.set(err?.error?.error || err?.message || 'Failed to save project.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProject(p: HubProject) {
    if (!confirm(`Delete "${p.name}"? This removes all tasks and subtasks. Cannot be undone.`)) return;
    await this.api.deleteHubProject(p.id);
    this.selectedId.set(null);
  }

  // ─── Task modal ──────────────────────────────────────────────────────────
  openTaskModal(task?: HubTask | null) {
    const p = this.selected();
    if (!p) return;
    this.editingTask = task ?? null;
    this.taskFormProjectId = p.id;
    this.modalError.set('');
    if (task) {
      this.taskForm = {
        title: task.title,
        description: task.description ?? '',
        phase: task.phase,
        status: task.status,
        responsible: task.responsible,
        accountable: task.accountable,
        informed: task.informed ?? '',
        startDate: task.startDate ? task.startDate.slice(0, 10) : '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      };
    } else {
      this.taskForm = { ...this.emptyTaskForm(), phase: this.phaseTab() };
    }
    this.showTaskModal.set(true);
  }
  closeTaskModal() {
    this.showTaskModal.set(false);
    this.editingTask = null;
  }

  async saveTask() {
    const projectId = this.taskFormProjectId;
    if (!projectId) return;
    if (!this.taskForm.title.trim()) { this.modalError.set('Title is required.'); return; }
    if (!this.taskForm.responsible.trim() || !this.taskForm.accountable.trim()) {
      this.modalError.set('Responsible and Accountable are required.'); return;
    }
    this.saving.set(true);
    this.modalError.set('');
    try {
      if (this.editingTask) {
        await this.api.updateHubTask(projectId, this.editingTask.id, this.taskForm);
      } else {
        await this.api.addHubTask(projectId, this.taskForm);
        this.phaseTab.set(this.taskForm.phase);
      }
      this.showTaskModal.set(false);
      this.editingTask = null;
    } catch (err: any) {
      this.modalError.set(err?.error?.error || err?.message || 'Failed to save task.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteTask(t: HubTask) {
    if (!confirm(`Delete task "${t.title}" and all its subtasks?`)) return;
    const p = this.selected();
    if (!p) return;
    await this.api.deleteHubTask(p.id, t.id);
  }

  // ─── Subtask modal ──────────────────────────────────────────────────────
  openSubtaskModal(taskId: number, subtask?: HubSubtask | null) {
    this.subtaskFormTaskId = taskId;
    this.editingSubtask = subtask ?? null;
    this.modalError.set('');
    if (subtask) {
      this.subtaskForm = {
        title: subtask.title,
        assignee: subtask.assignee,
        dueDate: subtask.dueDate ? subtask.dueDate.slice(0, 10) : '',
        status: subtask.status,
      };
    } else {
      this.subtaskForm = this.emptySubtaskForm();
    }
    this.showSubtaskModal.set(true);
  }
  closeSubtaskModal() {
    this.showSubtaskModal.set(false);
    this.editingSubtask = null;
  }

  async saveSubtask() {
    const p = this.selected();
    const tId = this.subtaskFormTaskId;
    if (!p || !tId) return;
    if (!this.subtaskForm.title.trim()) { this.modalError.set('Title is required.'); return; }
    if (!this.subtaskForm.assignee.trim()) { this.modalError.set('Assignee is required.'); return; }
    this.saving.set(true);
    this.modalError.set('');
    try {
      if (this.editingSubtask) {
        await this.api.updateHubSubtask(p.id, tId, this.editingSubtask.id, this.subtaskForm);
      } else {
        await this.api.addHubSubtask(p.id, tId, this.subtaskForm);
      }
      this.showSubtaskModal.set(false);
      this.editingSubtask = null;
    } catch (err: any) {
      this.modalError.set(err?.error?.error || err?.message || 'Failed to save subtask.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteSubtask(taskId: number, s: HubSubtask) {
    const p = this.selected();
    if (!p) return;
    if (!confirm(`Delete subtask "${s.title}"?`)) return;
    await this.api.deleteHubSubtask(p.id, taskId, s.id);
  }

  async toggleSubtask(taskId: number, s: HubSubtask) {
    const p = this.selected();
    if (!p) return;
    await this.api.updateHubSubtask(p.id, taskId, s.id, { status: s.status === 'done' ? 'todo' : 'done' });
  }

  onOverlayClick(e: any) {
    if (e.target === e.currentTarget) {
      this.closeProjectModal();
      this.closeTaskModal();
      this.closeSubtaskModal();
    }
  }
}
