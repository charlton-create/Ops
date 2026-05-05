import { Signal } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
  count?: Signal<number> | number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'tabs' | 'search' | 'select' | 'date-range' | 'multi-select' | 'number-range';
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: any;
}

export type FilterValues = Record<string, any>;
