import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../icons';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (editing()) {
      <div class="inline-edit editing">
        @switch (type) {
          @case ('textarea') {
            <textarea
              #inputEl
              class="form-textarea inline-textarea"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              (blur)="commit()"
              (keydown.escape)="cancel()"
              [attr.aria-label]="label"
            ></textarea>
          }
          @case ('select') {
            <select
              #inputEl
              class="form-select inline-select"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event); commit()"
              (blur)="commit()"
              [attr.aria-label]="label"
            >
              @for (opt of options; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          }
          @case ('number') {
            <input
              #inputEl
              type="number"
              class="form-input inline-input"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              (blur)="commit()"
              (keydown.enter)="commit()"
              (keydown.escape)="cancel()"
              [attr.aria-label]="label"
            >
          }
          @case ('date') {
            <input
              #inputEl
              type="date"
              class="form-input inline-input"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              (blur)="commit()"
              (keydown.enter)="commit()"
              (keydown.escape)="cancel()"
              [attr.aria-label]="label"
            >
          }
          @case ('badge') {
            <div class="badge-options">
              @for (opt of options; track opt.value) {
                <button
                  class="badge badge-option"
                  [class]="'badge-' + (opt.color || 'gray')"
                  [class.selected]="draft() === opt.value"
                  (click)="draft.set(opt.value); commit()"
                >
                  {{ opt.label }}
                </button>
              }
            </div>
          }
          @default {
            <input
              #inputEl
              type="text"
              class="form-input inline-input"
              [ngModel]="draft()"
              (ngModelChange)="draft.set($event)"
              (blur)="commit()"
              (keydown.enter)="commit()"
              (keydown.escape)="cancel()"
              [attr.aria-label]="label"
            >
          }
        }
      </div>
    } @else {
      <div
        class="inline-edit display"
        [class.readonly]="readonly"
        (click)="startEdit()"
        [attr.role]="readonly ? null : 'button'"
        [attr.tabindex]="readonly ? null : 0"
        (keydown.enter)="startEdit()"
      >
        <span class="display-value" [class.empty]="!displayValue">
          {{ displayValue || placeholder || '—' }}
        </span>
        @if (!readonly) {
          <app-icon class="edit-icon" name="edit" [size]="13"></app-icon>
        }
      </div>
    }
  `,
  styles: [`
    .inline-edit.display {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 2px 4px;
      margin: -2px -4px;
      border-radius: var(--radius);
      transition: background 0.15s ease;
      min-height: 24px;
    }
    .inline-edit.display:not(.readonly):hover {
      background: var(--color-gray-50);
    }
    .inline-edit.display.readonly {
      cursor: default;
    }
    .edit-icon {
      opacity: 0.45;
      color: var(--color-gray-400);
      transition: opacity 0.15s ease;
    }
    .inline-edit.display:hover .edit-icon {
      opacity: 1;
      color: var(--color-primary);
    }
    .inline-edit.display:not(.readonly) .display-value {
      border-bottom: 1px dashed var(--color-gray-300);
    }
    .inline-edit.display:not(.readonly):hover .display-value {
      border-bottom-color: var(--color-primary);
    }
    .display-value {
      font-size: inherit;
      color: inherit;
    }
    .display-value.empty {
      color: var(--color-gray-400);
    }
    .inline-input, .inline-select, .inline-textarea {
      font-size: inherit;
      padding: 4px 8px;
      min-width: 120px;
    }
    .inline-textarea {
      min-height: 60px;
      resize: vertical;
    }
    .badge-options {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .badge-option {
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s;
    }
    .badge-option.selected {
      border-color: var(--color-primary);
    }
  `]
})
export class InlineEditComponent {
  @Input() value: any = '';
  @Input() type: 'text' | 'select' | 'textarea' | 'number' | 'date' | 'badge' = 'text';
  @Input() options: { value: string; label: string; color?: string }[] = [];
  @Input() label = '';
  @Input() placeholder = '';
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<any>();

  @ViewChild('inputEl') inputEl?: ElementRef;

  editing = signal(false);
  draft = signal<any>('');

  get displayValue(): string {
    if (this.type === 'select' || this.type === 'badge') {
      const opt = this.options.find(o => o.value === this.value);
      return opt?.label || this.value || '';
    }
    if (Array.isArray(this.value)) return this.value.join(', ');
    return this.value != null ? String(this.value) : '';
  }

  startEdit() {
    if (this.readonly) return;
    this.draft.set(this.value);
    this.editing.set(true);
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 0);
  }

  commit() {
    const newVal = this.type === 'number' ? Number(this.draft()) : this.draft();
    this.editing.set(false);
    if (newVal !== this.value) {
      this.valueChange.emit(newVal);
    }
  }

  cancel() {
    this.editing.set(false);
  }
}
