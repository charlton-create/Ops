import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './layout/sidebar.component';
import { IconComponent } from './shared/icons';
import { MobileNavService } from './core/services/mobile-nav.service';
import { ThemeService } from './core/services/theme.service';
import { ApiService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

interface BottomNavItem {
  route: string;
  icon: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, IconComponent, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout" [class.no-sidebar]="isLoginPage()">

      <!-- Sidebar — desktop static, mobile slide-in drawer -->
      <app-sidebar
        *ngIf="!isLoginPage()"
        class="app-sidebar-host"
        [class.drawer-visible]="mobileNav.drawerOpen()"
      ></app-sidebar>

      <!-- Mobile drawer backdrop -->
      <div
        *ngIf="!isLoginPage() && mobileNav.drawerOpen()"
        class="mobile-backdrop"
        (click)="mobileNav.closeDrawer()"
        aria-hidden="true"
      ></div>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Mobile bottom navigation -->
      <nav *ngIf="!isLoginPage()" class="mobile-bottom-nav" aria-label="Main navigation">
        @for (item of bottomNavItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
            class="bottom-nav-item"
          >
            <span class="bottom-nav-icon">
              <app-icon [name]="item.icon" [size]="22"></app-icon>
            </span>
            <span class="bottom-nav-label">{{ item.label }}</span>
          </a>
        }
        <!-- More → opens full nav drawer -->
        <button
          class="bottom-nav-item"
          [class.active]="isMoreActive()"
          (click)="mobileNav.toggleDrawer()"
        >
          <span class="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </span>
          <span class="bottom-nav-label">More</span>
        </button>
      </nav>

    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
    }
    .app-layout.no-sidebar { display: block; }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--color-bg-gray);
      min-width: 0;
    }
    .no-sidebar .main-content { background: transparent; overflow: visible; }

    .mobile-backdrop { display: none; }
    .mobile-bottom-nav { display: none; }

    /* ================================================
       MOBILE  ≤ 768px
       ================================================ */
    @media (max-width: 768px) {
      .app-layout {
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }

      /* Sidebar becomes off-canvas drawer */
      .app-sidebar-host {
        position: fixed !important;
        top: 0;
        left: 0;
        height: 100dvh;
        z-index: 500;
        transform: translateX(-100%);
        transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .app-sidebar-host.drawer-visible {
        transform: translateX(0);
        box-shadow: 6px 0 32px rgba(0, 0, 0, 0.22);
      }

      /* Backdrop */
      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: var(--color-backdrop);
        z-index: 499;
        animation: fadeIn 200ms ease;
      }

      /* Main content — fills remaining height, scrolls internally */
      .main-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        min-height: 0;
        padding-bottom: calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom, 0px));
      }

      /* Bottom nav bar */
      .mobile-bottom-nav {
        display: flex;
        align-items: stretch;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: var(--color-surface);
        border-top: 1px solid var(--color-gray-200);
        z-index: 400;
        box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.07);
      }

      .bottom-nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 6px 4px 8px;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--color-gray-400);
        text-decoration: none;
        transition: color 150ms ease;
        -webkit-tap-highlight-color: transparent;
        min-height: 44px;
      }
      .bottom-nav-item.active { color: var(--color-primary); }
      .bottom-nav-item:active { opacity: 0.7; }

      .bottom-nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      }

      .bottom-nav-label {
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        line-height: 1;
      }
    }
  `]
})
export class AppComponent {
  title = 'cat-i-ops';

  readonly mobileNav = inject(MobileNavService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  readonly auth = inject(AuthService);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.apiService.loadAll();
    }
  }

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly isLoginPage = computed(() => this.currentUrl().startsWith('/login'));

  readonly bottomNavItems: BottomNavItem[] = [
    { route: '/dashboard', icon: 'dashboard', label: 'Home',     exact: true },
    { route: '/leads',     icon: 'leads',     label: 'Leads' },
    { route: '/pipeline',  icon: 'pipeline',  label: 'Pipeline' },
    { route: '/intake',    icon: 'intake',    label: 'Intake' },
    { route: '/kb',        icon: 'documents', label: 'KB' },
  ];

  /** "More" tab is active when current page isn't in the bottom nav shortcuts */
  readonly isMoreActive = computed(() => {
    const url = this.currentUrl();
    return !this.bottomNavItems.some(i =>
      i.exact ? url === i.route : url.startsWith(i.route)
    );
  });
}
