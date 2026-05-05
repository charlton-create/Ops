import { Injectable, signal, computed } from '@angular/core';
import { MES_STANDARD_SECTIONS, MES_MODULES } from '../constants/seed.data';
import { MESSection, MESModule } from '../models';

@Injectable({ providedIn: 'root' })
export class MesConfigService {
  private _timings = signal<Record<string, number>>(
    Object.fromEntries(
      MES_STANDARD_SECTIONS.map(s => [s.id, s.timeMinutes ?? 3])
    )
  );

  timings = this._timings.asReadonly();

  totalMinutes = computed(() =>
    Object.values(this._timings()).reduce((sum, t) => sum + t, 0)
  );

  getTimingForSection(id: string): number {
    return this._timings()[id] ?? 3;
  }

  updateTiming(sectionId: string, minutes: number) {
    const val = Math.max(1, Math.round(minutes));
    this._timings.update(t => ({ ...t, [sectionId]: val }));
  }

  // ── Configured sections ────────────────────────────────────────────────────
  // Reads the admin-saved config from localStorage and returns only enabled
  // sections with only visible fields.  Falls back to the raw seed data if
  // no saved config exists yet.

  private _configuredSections = signal<MESSection[]>(this.loadSectionsFromStorage());
  readonly configuredSections = this._configuredSections.asReadonly();

  // ── Configured modules ────────────────────────────────────────────────────

  private _configuredModules = signal<MESModule[]>(this.loadModulesFromStorage());
  readonly configuredModules = this._configuredModules.asReadonly();

  /** Re-read from localStorage — call when entering the interview so it always
   *  reflects the latest admin config saved in the same browser session. */
  refreshSections(): void {
    this._configuredSections.set(this.loadSectionsFromStorage());
    this._configuredModules.set(this.loadModulesFromStorage());
  }

  private loadModulesFromStorage(): MESModule[] {
    const saved = localStorage.getItem('mes-admin-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.modules?.length) {
          return config.modules
            .filter((m: any) => m.active !== false)
            .map((m: any) => ({
              ...m,
              fields: (m.fields ?? []).filter((f: any) => f.visible !== false)
            })) as MESModule[];
        }
      } catch { /* fall through */ }
    }
    return MES_MODULES.filter(m => m.active);
  }

  private loadSectionsFromStorage(): MESSection[] {
    const saved = localStorage.getItem('mes-admin-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sections?.length) {
          return config.sections
            .filter((s: any) => s.enabled !== false)
            .map((s: any) => ({
              ...s,
              fields: (s.fields ?? []).filter((f: any) => f.visible !== false)
            })) as MESSection[];
        }
      } catch { /* fall through to seed data */ }
    }
    return [...MES_STANDARD_SECTIONS];
  }
}
