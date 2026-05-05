import { Injectable, signal } from '@angular/core';
import { IntakeSubmission } from '../models';

/**
 * Lightweight service that holds a "pending" submission to pre-fill
 * the MES interview form when reopened from the Customer Intake registry.
 */
@Injectable({ providedIn: 'root' })
export class MesIntakeStateService {
  private _pending = signal<IntakeSubmission | null>(null);
  readonly pendingSubmission = this._pending.asReadonly();

  set(sub: IntakeSubmission | null) {
    this._pending.set(sub);
  }

  clear() {
    this._pending.set(null);
  }
}
