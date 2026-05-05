import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Activity } from '../models';

export interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export type EntityType = 'lead' | 'customer' | 'project' | 'kb' | 'content' | 'campaign' | 'calendar' | 'demo_request';

// Human-readable field labels per entity type
const FIELD_LABELS: Record<string, string> = {
  company: 'Company',
  contact: 'Contact',
  title: 'Title',
  stage: 'Stage',
  value: 'Deal Value',
  probability: 'Probability',
  owner: 'Owner',
  priority: 'Priority',
  lastActivity: 'Last Activity',
  nextAction: 'Next Action',
  notes: 'Notes',
  source: 'Source',
  industry: 'Industry',
  email: 'Email',
  phone: 'Phone',
  status: 'Status',
  billingStatus: 'Billing Status',
  contractValue: 'Contract Value',
  contractStart: 'Contract Start',
  contractEnd: 'Contract End',
  name: 'Name',
  due: 'Due Date',
  progress: 'Progress',
  type: 'Type',
  description: 'Description',
  category: 'Category',
  author: 'Author',
  platforms: 'Platforms',
  scheduledDate: 'Scheduled Date',
  subject: 'Subject',
  fromName: 'From Name',
};

@Injectable({ providedIn: 'root' })
export class ActivityTrackerService {
  private dataService = inject(ApiService);

  trackChanges(
    entityType: EntityType,
    entityId: number,
    entityName: string,
    oldEntity: Record<string, any>,
    updates: Record<string, any>,
    actor: string,
    trackableFields: string[]
  ): void {
    const changes: FieldChange[] = [];

    for (const field of trackableFields) {
      if (!(field in updates)) continue;
      const oldVal = oldEntity[field];
      const newVal = updates[field];

      // Skip if unchanged
      if (this.stringify(oldVal) === this.stringify(newVal)) continue;

      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: this.stringify(oldVal),
        newValue: this.stringify(newVal),
      });
    }

    if (changes.length === 0) return;

    // Build a human-readable summary
    const summary = changes.length === 1
      ? `${changes[0].label}: "${changes[0].oldValue}" → "${changes[0].newValue}"`
      : `updated ${changes.length} fields`;

    const activity: Omit<Activity, 'id'> = {
      who: actor,
      action: 'updated',
      target: entityName,
      detail: summary,
      time: 'Just now',
      type: 'general',
      entityType,
      entityId,
      changes,
    };

    this.dataService.addActivity(activity);
  }

  private stringify(val: any): string {
    if (val == null) return '';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  }
}
