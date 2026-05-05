import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyShort', standalone: true })
export class CurrencyShortPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '$0';
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${value.toLocaleString()}`;
  }
}

@Pipe({ name: 'dateShort', standalone: true })
export class DateShortPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
