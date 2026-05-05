import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MobileNavService {
  private _drawerOpen = signal(false);
  readonly drawerOpen = this._drawerOpen.asReadonly();

  /** True when viewport width ≤ 768 px.  Updated on resize. */
  private _isMobile = signal(this.checkMobile());
  readonly isMobile = this._isMobile.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this._isMobile.set(this.checkMobile());
        // close drawer when resizing to desktop
        if (!this.checkMobile()) this._drawerOpen.set(false);
      }, { passive: true });
    }

    // Close drawer on every navigation
    inject(Router).events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this._drawerOpen.set(false));
  }

  openDrawer()  { this._drawerOpen.set(true);  this.lockBodyScroll(true);  }
  closeDrawer() { this._drawerOpen.set(false); this.lockBodyScroll(false); }
  toggleDrawer() {
    const next = !this._drawerOpen();
    this._drawerOpen.set(next);
    this.lockBodyScroll(next);
  }

  private checkMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }

  private lockBodyScroll(lock: boolean) {
    if (typeof document === 'undefined') return;
    if (lock) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }
  }
}
