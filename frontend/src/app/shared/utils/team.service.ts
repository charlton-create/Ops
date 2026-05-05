import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Injectable({ providedIn: 'root' })
export class TeamUtilService {
  private dataService = inject(ApiService);

  getColor(name: string): string {
    return this.dataService.team().find(m => m.name === name)?.color || '#6B7280';
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getNames(): string[] {
    return this.dataService.team().map(m => m.name);
  }
}
