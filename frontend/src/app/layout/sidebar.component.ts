import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { IconComponent } from '../shared/icons';
import { AuthService } from '../core/services/auth.service';
import { MobileNavService } from '../core/services/mobile-nav.service';
import { ThemeService } from '../core/services/theme.service';
import { ApiService } from '../core/services/api.service';
import type { SidebarItem, SidebarChild } from '../core/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-header-row">
          <div class="logo-container">
            <img src="assets/images/cat-i-logo.png" alt="CAT-I.AI" class="logo" (error)="logoError = true" *ngIf="!logoError">
            <span class="logo-text" *ngIf="logoError">CAT-I.AI</span>
          </div>
          <!-- Close button — mobile only -->
          <button class="drawer-close-btn mobile-only" (click)="mobileNav.closeDrawer()" aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <span class="subtitle">Internal Ops</span>
      </div>

      <nav class="sidebar-nav">
        @for (item of visibleItems(); track item.id) {
          @if (item.kind === 'standalone') {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-item standalone"
              [style.--section-color]="item.color"
            >
              <span class="nav-icon"><app-icon [name]="item.icon || 'dashboard'" [size]="18"></app-icon></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          } @else {
            <div class="section-group">
              <button
                class="section-header"
                [style.--section-color]="item.color"
                [class.expanded]="expandedSection === item.id"
                (click)="toggleSection(item.id)"
              >
                <span class="section-label">{{ item.label }}</span>
                <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              <div
                class="section-children"
                [class.expanded]="expandedSection === item.id"
                [style.--section-color]="item.color"
              >
                @for (child of visibleChildren(item); track child.id) {
                  <button
                    type="button"
                    class="child-item"
                    [class.active]="isRouteActive(child.route)"
                    (click)="navigateTo(child.route)"
                  >
                    <span class="child-icon"><app-icon [name]="child.icon" [size]="18"></app-icon></span>
                    <span class="child-label">{{ child.label }}</span>
                  </button>
                }
              </div>
            </div>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" [style.background]="userAvatarGradient()">
            {{ userInitial() }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ userName() }}</span>
            <span class="user-role">{{ userRole() }}</span>
          </div>
          <button class="theme-toggle-btn" (click)="themeService.toggle()" [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'" aria-label="Toggle theme">
            @if (themeService.theme() === 'light') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            }
          </button>
          <button class="logout-btn" (click)="logout()" title="Sign out" aria-label="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: linear-gradient(165deg, #faf8ff 0%, #f0fdf8 40%, #fefcf0 70%, #faf8ff 100%);
      background-size: 170% 170%;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-hairline);
      position: relative;
    }

    :host-context([data-theme="dark"]) .sidebar {
      background: linear-gradient(165deg, #111827 0%, #0f172a 40%, #1a1a2e 70%, #111827 100%);
    }

    .sidebar-header {
      padding: 1.25rem 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sidebar-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo-container {
      display: flex;
      align-items: center;
    }

    .drawer-close-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: var(--color-gray-100);
      border-radius: var(--radius-md);
      color: var(--color-gray-600);
      cursor: pointer;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
      transition: background 150ms ease;
    }
    .drawer-close-btn:hover { background: var(--color-gray-200); }
    .drawer-close-btn:active { background: var(--color-gray-200); }

    @media (max-width: 768px) {
      .drawer-close-btn { display: flex; }

      .sidebar {
        width: 280px;
        max-width: 85vw;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
    }

    .logo {
      height: 72px;
      width: auto;
      object-fit: contain;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, #A02195, #1A56DB);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 0.6875rem;
      color: var(--color-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      margin-left: 2px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    /* Standalone nav item (Dashboard) */
    .nav-item.standalone {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      color: var(--color-gray-700);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all 0.15s ease;
      margin-bottom: 8px;
    }

    .nav-item.standalone:hover {
      background: var(--color-surface-hover);
    }

    .nav-item.standalone.active {
      background: linear-gradient(165deg,
        color-mix(in srgb, var(--section-color) 10%, #fff) 0%,
        color-mix(in srgb, var(--section-color) 16%, #fff) 100%
      );
      color: var(--section-color);
      font-weight: 600;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        0 2px 8px color-mix(in srgb, var(--section-color) 8%, transparent);
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Section Group */
    .section-group {
      margin-bottom: 2px;
    }

    .section-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .section-header:hover {
      background: var(--color-surface-hover);
    }

    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--section-color);
    }

    .chevron {
      color: var(--section-color);
      transition: transform 200ms ease;
      flex-shrink: 0;
    }

    .section-header.expanded .chevron {
      transform: rotate(180deg);
    }

    /* Section Children */
    .section-children {
      height: 0;
      overflow: hidden;
      transition: height 200ms ease;
    }

    .section-children.expanded {
      height: auto;
    }

    .child-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0.5rem 0.75rem 0.5rem 2.5rem;
      border-radius: 6px;
      color: var(--color-gray-600);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      width: 100%;
      border: none;
      background: none;
      text-align: left;
    }

    .child-item:hover {
      background: var(--color-surface-hover);
    }

    .child-item.active {
      background: linear-gradient(165deg,
        color-mix(in srgb, var(--section-color) 10%, #fff) 0%,
        color-mix(in srgb, var(--section-color) 16%, #fff) 100%
      );
      color: var(--section-color);
      font-weight: 600;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        0 2px 8px color-mix(in srgb, var(--section-color) 8%, transparent);
    }

    .child-item.active .child-icon {
      color: var(--section-color);
    }

    .child-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-500);
    }

    .child-label {
      flex: 1;
    }

    /* Progress Bar */
    .progress-track {
      position: absolute;
      bottom: 4px;
      left: 2.5rem;
      right: 0.75rem;
      height: 2px;
      background: var(--color-gray-100);
      border-radius: 1px;
    }

    .progress-fill {
      height: 100%;
      background: var(--section-color);
      border-radius: 1px;
      transition: width 300ms ease;
    }

    /* Footer */
    .sidebar-footer {
      padding: 14px 16px;
      border-top: 1px solid var(--border-hairline);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #A02195, #56006E);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.8125rem;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.6875rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .theme-toggle-btn,
    .logout-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--radius);
      color: var(--color-gray-400);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .theme-toggle-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .logout-btn:hover {
      background: var(--color-error-light);
      color: var(--color-error);
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  logoError = false;
  expandedSection: string | null = 'sales';
  private routerSub?: Subscription;

  private authService = inject(AuthService);
  readonly mobileNav = inject(MobileNavService);
  readonly themeService = inject(ThemeService);

  readonly userName = () => this.authService.user()?.name ?? 'User';
  readonly userRole = () => this.authService.user()?.role ?? '';
  readonly userInitial = () => (this.authService.user()?.name ?? 'U')[0].toUpperCase();
  readonly userAvatarGradient = () => {
    const color = this.authService.user()?.color ?? '#A02195';
    return `linear-gradient(135deg, ${color}, ${color}aa)`;
  };

  private api = inject(ApiService);

  // Visible sidebar items, computed from the loaded layout signal
  readonly visibleItems = computed<SidebarItem[]>(() =>
    this.api.sidebarLayout().filter((item) => item.visible !== false),
  );

  visibleChildren(item: SidebarItem): SidebarChild[] {
    return (item.children ?? []).filter((c) => c.visible !== false);
  }

  constructor(private router: Router) {}

  ngOnInit() {
    // Pull the latest sidebar layout from the API (defaults are already loaded as fallback)
    this.api.refreshSidebarLayout().catch(() => {
      // Auth/network may not be ready on initial render — silently keep the defaults
    });

    // Auto-expand section based on current route
    this.expandSectionForRoute(this.router.url);

    // Listen for route changes
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.expandSectionForRoute(event.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  private expandSectionForRoute(url: string) {
    for (const item of this.api.sidebarLayout()) {
      if (item.kind !== 'section') continue;
      const prefixes = (item.routePrefix ?? '').split(',').filter(Boolean);
      if (prefixes.some((prefix) => url.startsWith(prefix))) {
        this.expandedSection = item.id;
        return;
      }
    }
  }

  toggleSection(sectionId: string) {
    this.expandedSection = this.expandedSection === sectionId ? null : sectionId;
  }

  navigateTo(route: string) {
    this.mobileNav.closeDrawer();
    this.router.navigate([route]);
  }

  isRouteActive(route: string): boolean {
    return this.router.url === route;
  }

  logout(): void {
    this.authService.logout();
  }
}
