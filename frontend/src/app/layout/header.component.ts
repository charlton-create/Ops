import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../shared/icons';
import { MobileNavService } from '../core/services/mobile-nav.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <header class="page-header" [style.--header-gradient]="gradient">
      <div class="header-content">
        <div class="header-left">
          <!-- Hamburger — mobile only -->
          <button class="hamburger-btn mobile-only" (click)="mobileNav.toggleDrawer()" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span class="header-icon desktop-only">
            <app-icon [name]="icon" [size]="24"></app-icon>
          </span>
          <div class="header-text">
            <h1>{{ title }}</h1>
            <span class="header-subtitle desktop-only" *ngIf="subtitle">{{ subtitle }}</span>
          </div>
        </div>
        <div class="header-right">
          <ng-content></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      background: var(--header-gradient, linear-gradient(135deg, #9F2094 0%, #56006E 100%));
      padding: 1rem 1.5rem;
      position: relative;
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 2px 6px rgba(0, 0, 0, 0.12);
      flex-shrink: 0;
    }

    .page-header::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg,
        rgba(255, 255, 255, 0.18) 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.10) 100%
      );
      pointer-events: none;
    }

    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .header-icon {
      color: var(--color-on-header-icon);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-text { min-width: 0; }

    .header-text h1 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-on-header);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-subtitle {
      font-size: 0.8125rem;
      color: var(--color-on-header-muted);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Hamburger button — subtle, no heavy box */
    .hamburger-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      color: var(--color-on-header);
      cursor: pointer;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .hamburger-btn:active {
      background: rgba(255,255,255,0.15);
    }

    :host ::ng-deep .btn-primary {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    :host ::ng-deep .btn-primary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* ---- Mobile ≤ 768px: Compact single-row ---- */
    @media (max-width: 768px) {
      .page-header {
        padding: 0 1rem;
        min-height: var(--mobile-header-height);
        overflow: visible; /* Allow actions row to extend below */
      }
      .header-content {
        min-height: var(--mobile-header-height);
        align-items: center;
      }
      .header-text h1 { font-size: 1rem; }
      .hamburger-btn { display: flex; }

      .header-right {
        gap: 6px;
        flex-shrink: 1; /* Allow shrinking when title needs space */
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      /* Action buttons: proper tap targets */
      :host ::ng-deep .header-right .btn-primary,
      :host ::ng-deep .header-right .btn-secondary {
        height: 40px;
        min-height: 40px;
        padding: 0 12px;
        font-size: 0.8125rem;
        white-space: nowrap;
      }
    }

    /* ---- Mobile ≤ 480px: 2-row layout ---- */
    @media (max-width: 480px) {
      .page-header {
        padding: 0 1rem 0.625rem;
        overflow: visible;
      }
      .header-content {
        flex-wrap: wrap;
        min-height: var(--mobile-header-height);
        align-items: flex-start;
        padding-top: 0.625rem;
      }
      .header-left {
        flex: 1 0 100%; /* Row 1: full width */
        align-items: center;
        padding-bottom: 2px;
      }
      .header-right {
        flex: 0 0 auto;
        flex-shrink: 0;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        justify-content: flex-start;
        max-width: 100%;
        /* Only visible space when has content */
        min-height: 0;
      }
      /* Row 2 only appears if header-right has child elements */
      .header-right:not(:empty) {
        padding-bottom: 0.5rem;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'dashboard';
  @Input() gradient = 'linear-gradient(135deg, #9F2094 0%, #56006E 100%)';

  readonly mobileNav = inject(MobileNavService);
}
