import { Component, Input, Output, EventEmitter, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterConfig, FilterValues, FilterOption } from './filter.types';
import { IconComponent } from '../../icons';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="filter-bar">
      @for (f of filters; track f.key) {
        @switch (f.type) {
          @case ('tabs') {
            <div class="toolbar-tabs">
              @for (opt of f.options || []; track opt.value) {
                <button
                  class="tab-btn"
                  [class.active]="values[f.key] === opt.value"
                  (click)="setValue(f.key, opt.value)"
                >
                  {{ opt.label }}
                  @if (resolveCount(opt) !== null) {
                    <span class="tab-count">{{ resolveCount(opt) }}</span>
                  }
                </button>
              }
            </div>
          }
          @case ('search') {
            <div class="search-box">
              <app-icon name="search" [size]="16"></app-icon>
              <input
                type="text"
                [placeholder]="f.placeholder || 'Search...'"
                [ngModel]="values[f.key] || ''"
                (ngModelChange)="onSearchInput(f.key, $event)"
              >
              @if (values[f.key]) {
                <button class="search-clear" (click)="setValue(f.key, '')">
                  <app-icon name="close" [size]="14"></app-icon>
                </button>
              }
            </div>
          }
          @case ('select') {
            <select
              class="form-select filter-select"
              [ngModel]="values[f.key] || ''"
              (ngModelChange)="setValue(f.key, $event)"
            >
              <option value="">{{ f.placeholder || f.label }}</option>
              @for (opt of f.options || []; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          }
          @case ('date-range') {
            <div class="date-range">
              <input
                type="date"
                class="form-input date-input"
                [ngModel]="values[f.key + '_from'] || ''"
                (ngModelChange)="setValue(f.key + '_from', $event)"
                placeholder="From"
              >
              <span class="date-sep">–</span>
              <input
                type="date"
                class="form-input date-input"
                [ngModel]="values[f.key + '_to'] || ''"
                (ngModelChange)="setValue(f.key + '_to', $event)"
                placeholder="To"
              >
            </div>
          }
          @case ('number-range') {
            <div class="number-range">
              <input
                type="number"
                class="form-input number-input"
                [ngModel]="values[f.key + '_min'] || ''"
                (ngModelChange)="setValue(f.key + '_min', $event)"
                [placeholder]="'Min'"
              >
              <span class="date-sep">–</span>
              <input
                type="number"
                class="form-input number-input"
                [ngModel]="values[f.key + '_max'] || ''"
                (ngModelChange)="setValue(f.key + '_max', $event)"
                [placeholder]="'Max'"
              >
            </div>
          }
          @case ('multi-select') {
            <div class="chip-wrap">
              @for (opt of f.options || []; track opt.value) {
                <button
                  class="chip"
                  [class.selected]="isMultiSelected(f.key, opt.value)"
                  (click)="toggleMulti(f.key, opt.value)"
                >
                  {{ opt.label }}
                </button>
              }
            </div>
          }
        }
      }

      @if (hasActiveFilters()) {
        <button class="btn-text btn-xs clear-btn" (click)="clearAll()">
          Clear filters
        </button>
      }
    </div>
  `,
  styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-select {
      width: auto;
      min-width: 140px;
      max-width: 200px;
      height: 36px;
      padding: 0 2rem 0 10px;
      font-size: 0.8125rem;
    }
    .date-range {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .date-input {
      width: 140px;
      height: 36px;
      padding: 0 10px;
      font-size: 0.8125rem;
    }
    .date-sep {
      color: var(--color-gray-400);
      font-size: 0.8125rem;
    }
    .number-range {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .number-input {
      width: 100px;
      height: 36px;
      padding: 0 10px;
      font-size: 0.8125rem;
    }
    .clear-btn {
      margin-left: auto;
      color: var(--color-gray-500);
    }
    .clear-btn:hover {
      color: var(--color-error);
      background: var(--color-error-light);
    }
    .search-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-gray-400);
      padding: 2px;
      border-radius: 4px;
    }
    .search-clear:hover {
      color: var(--color-gray-600);
      background: var(--color-gray-100);
    }
  `]
})
export class FilterBarComponent implements OnInit {
  @Input() filters: FilterConfig[] = [];
  @Input() values: FilterValues = {};
  @Output() valuesChange = new EventEmitter<FilterValues>();

  private searchTimer: any;

  ngOnInit() {
    // Initialize default values
    for (const f of this.filters) {
      if (f.defaultValue !== undefined && this.values[f.key] === undefined) {
        this.values[f.key] = f.defaultValue;
      }
    }
  }

  setValue(key: string, value: any) {
    this.values = { ...this.values, [key]: value };
    this.valuesChange.emit(this.values);
  }

  onSearchInput(key: string, value: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.setValue(key, value);
    }, 200);
  }

  isMultiSelected(key: string, value: string): boolean {
    const arr = this.values[key] as string[] || [];
    return arr.includes(value);
  }

  toggleMulti(key: string, value: string) {
    const arr = [...(this.values[key] as string[] || [])];
    const idx = arr.indexOf(value);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(value);
    this.setValue(key, arr);
  }

  resolveCount(opt: FilterOption): number | null {
    if (opt.count == null) return null;
    if (typeof opt.count === 'number') return opt.count;
    // It's a Signal
    return (opt.count as Signal<number>)();
  }

  hasActiveFilters(): boolean {
    return this.filters.some(f => {
      const v = this.values[f.key];
      if (f.type === 'tabs') return false; // tabs always have a value
      if (f.type === 'multi-select') return Array.isArray(v) && v.length > 0;
      if (f.type === 'date-range') return this.values[f.key + '_from'] || this.values[f.key + '_to'];
      if (f.type === 'number-range') return this.values[f.key + '_min'] || this.values[f.key + '_max'];
      return v !== undefined && v !== '' && v !== null;
    });
  }

  clearAll() {
    const cleared: FilterValues = {};
    for (const f of this.filters) {
      if (f.type === 'tabs' && f.defaultValue !== undefined) {
        cleared[f.key] = f.defaultValue;
      }
    }
    this.values = cleared;
    this.valuesChange.emit(this.values);
  }
}
