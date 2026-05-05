import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../icons';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="closed.emit()">
        <div class="cs-modal" (click)="$event.stopPropagation()">
          <button class="modal-close-btn" (click)="closed.emit()">
            <app-icon name="close" [size]="16"></app-icon>
          </button>

          <div class="cs-icon-wrap">
            <div class="cs-icon">
              <app-icon name="star" [size]="32"></app-icon>
            </div>
          </div>

          <h2 class="cs-title">Coming Soon</h2>
          <h3 class="cs-feature">{{ feature }}</h3>
          <p class="cs-desc">{{ description }}</p>

          <div class="cs-divider"></div>

          <p class="cs-footer-text">
            We're building this feature. It will be available in an upcoming release.
          </p>

          <button class="btn-primary cs-btn" (click)="closed.emit()">Got it</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .cs-modal {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 420px;
      max-width: 90vw;
      padding: 2rem;
      text-align: center;
      position: relative;
      animation: slideUp var(--transition);
    }
    .cs-icon-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
    }
    .cs-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0D9488 0%, #7C3AED 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .cs-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }
    .cs-feature {
      margin: 0.25rem 0 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .cs-desc {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      line-height: 1.5;
    }
    .cs-divider {
      height: 1px;
      background: var(--color-gray-100);
      margin: 1.25rem 0;
    }
    .cs-footer-text {
      margin: 0 0 1.25rem;
      font-size: 0.75rem;
      color: var(--color-gray-400);
      font-style: italic;
    }
    .cs-btn {
      width: 100%;
    }
    .modal-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
    }
  `]
})
export class ComingSoonComponent {
  @Input() isOpen = false;
  @Input() feature = '';
  @Input() description = '';
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.closed.emit();
  }
}
