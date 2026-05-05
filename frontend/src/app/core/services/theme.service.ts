import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>(this.getInitialTheme());
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.applyTheme(this._theme());
  }

  toggle() {
    this.setTheme(this._theme() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme) {
    this._theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem('cat-i-theme', theme);
  }

  private getInitialTheme(): Theme {
    const saved = localStorage.getItem('cat-i-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  private applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
