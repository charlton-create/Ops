import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { TeamUtilService } from '../../utils/team.service';
import { IconComponent } from '../../icons';
import { EntityType, FieldChange } from '../../../core/services/activity-tracker.service';

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="timeline">
      <div class="timeline-header">
        <app-icon name="activity" [size]="16"></app-icon>
        <span>Activity History</span>
      </div>

      @if (filteredActivities().length === 0) {
        <div class="timeline-empty">No activity recorded yet.</div>
      }

      @for (a of filteredActivities(); track a.id) {
        <div class="timeline-item">
          <div class="timeline-dot" [style.background]="teamUtil.getColor(a.who)">
            {{ teamUtil.getInitial(a.who) }}
          </div>
          <div class="timeline-content">
            <div class="timeline-row">
              <span class="timeline-actor">{{ a.who }}</span>
              <span class="timeline-action">{{ a.action }}</span>
              <span class="timeline-target">{{ a.target }}</span>
            </div>
            @if (a.detail && !a.changes?.length) {
              <div class="timeline-detail">{{ a.detail }}</div>
            }
            @if (showFieldChanges && a.changes?.length) {
              <div class="timeline-changes">
                @for (c of a.changes; track c.field) {
                  <div class="change-row">
                    <span class="change-field">{{ c.label }}:</span>
                    @if (c.oldValue) {
                      <span class="change-old">{{ c.oldValue }}</span>
                      <span class="change-arrow">→</span>
                    }
                    <span class="change-new">{{ c.newValue }}</span>
                  </div>
                }
              </div>
            }
            <div class="timeline-time">
              @if (a.type && a.type !== 'general') {
                <app-icon [name]="getTypeIcon(a.type)" [size]="12"></app-icon>
              }
              {{ a.time }}
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .timeline-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-700);
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-gray-100);
      margin-bottom: 12px;
    }
    .timeline-empty {
      font-size: 0.8125rem;
      color: var(--color-gray-400);
      padding: 12px 0;
    }
    .timeline-item {
      display: flex;
      gap: 10px;
      padding: 8px 0;
      position: relative;
    }
    .timeline-item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 32px;
      bottom: -8px;
      width: 1px;
      background: var(--color-gray-200);
    }
    .timeline-dot {
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.5625rem;
      font-weight: 700;
      margin-top: 1px;
    }
    .timeline-content {
      flex: 1;
      min-width: 0;
    }
    .timeline-row {
      font-size: 0.8125rem;
      color: var(--color-gray-700);
      line-height: 1.4;
    }
    .timeline-actor {
      font-weight: 600;
      color: var(--color-gray-900);
    }
    .timeline-action {
      margin: 0 3px;
    }
    .timeline-target {
      font-weight: 500;
    }
    .timeline-detail {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      margin-top: 2px;
    }
    .timeline-changes {
      margin-top: 4px;
      padding: 6px 8px;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      border: 1px solid var(--color-gray-100);
    }
    .change-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      padding: 2px 0;
    }
    .change-field {
      color: var(--color-gray-500);
      font-weight: 500;
    }
    .change-old {
      color: var(--color-error);
      text-decoration: line-through;
    }
    .change-arrow {
      color: var(--color-gray-400);
    }
    .change-new {
      color: var(--color-success);
      font-weight: 500;
    }
    .timeline-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      margin-top: 2px;
    }
  `]
})
export class ActivityTimelineComponent {
  private dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);

  @Input() entityType: EntityType | '' = '';
  @Input() entityId: number = 0;
  @Input() limit: number = 20;
  @Input() showFieldChanges = true;

  filteredActivities = computed(() => {
    let activities = this.dataService.activities();

    if (this.entityType && this.entityId) {
      activities = activities.filter(a => {
        // Match by new entityType/entityId fields
        if (a.entityType === this.entityType && a.entityId === this.entityId) return true;
        // Backwards compat: match by legacy leadId/projectId
        if (this.entityType === 'lead' && a.leadId === this.entityId) return true;
        if (this.entityType === 'project' && a.projectId === this.entityId) return true;
        return false;
      });
    }

    return activities.slice(0, this.limit);
  });

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      email: 'mail',
      phone: 'phone',
      note: 'note',
      reminder: 'bell',
      meeting: 'calendar',
      stage_change: 'activity',
    };
    return map[type] || 'info';
  }
}
