import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-bg" style="background-image: url('assets/images/login-bg.jpg')">
      <!-- Background grid pattern overlay -->
      <div class="bg-grid"></div>
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>

      <div class="login-card">
        <div class="card-header">
          <h1 class="card-title">CAT-I OPS</h1>
          <p class="card-subtitle">Internal Operations Platform</p>
        </div>

        <form class="login-form" (ngSubmit)="onSubmit()" #loginForm="ngForm" autocomplete="on">
          <!-- Email -->
          <div class="field-group">
            <label class="field-label" for="email">Email</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <input
                id="email"
                type="email"
                class="field-input"
                [(ngModel)]="email"
                name="email"
                placeholder="you@cat-i.ai"
                autocomplete="email"
                required
                (input)="clearError()"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="field-group">
            <label class="field-label" for="password">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="field-input"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
                (input)="clearError()"
              />
              <button
                type="button"
                class="toggle-pw"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <svg *ngIf="!showPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember me -->
          <label class="remember-me">
            <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
            <span>Remember me</span>
          </label>

          <!-- Error message -->
          <div class="error-msg" *ngIf="errorMessage()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ errorMessage() }}
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-signin"
            [disabled]="isLoading()"
          >
            <span *ngIf="!isLoading()">Sign In</span>
            <span class="spinner" *ngIf="isLoading()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </span>
          </button>
        </form>

        <p class="card-footer-note">Internal use only &mdash; authorized personnel</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }

    /* ── Background ── */
    .login-bg {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #b8f0a0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      position: relative;
      overflow: hidden;
      padding: 1.5rem;
    }

    /* Subtle dark vignette so the card pops */
    .bg-grid {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.18) 100%);
      pointer-events: none;
    }

    .bg-glow {
      display: none;
    }

    .bg-glow-1, .bg-glow-2 {
      display: none;
    }

    /* ── Card ── */
    .login-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 400px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: var(--radius-xl);
      padding: 2.5rem 2rem 2rem;
      backdrop-filter: blur(24px) saturate(1.4);
      -webkit-backdrop-filter: blur(24px) saturate(1.4);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.6) inset,
        0 24px 56px rgba(0,0,0,0.18),
        0 4px 16px rgba(0,0,0,0.08);
    }

    /* ── Logo ── */
    .card-logo {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
      filter: brightness(1.1);
    }

    .logo-fallback {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #A02195, #1A56DB);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── Header ── */
    .card-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .card-title {
      margin: 0 0 4px;
      font-size: 1.625rem;
      font-weight: 700;
      background: linear-gradient(135deg, #A02195 0%, #6B21A8 50%, #1A56DB 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .card-subtitle {
      margin: 0;
      font-size: 0.8125rem;
      color: rgba(0,0,0,0.45);
      letter-spacing: 0.01em;
    }

    /* ── Form ── */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(0,0,0,0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: rgba(0,0,0,0.3);
      pointer-events: none;
      flex-shrink: 0;
    }

    .field-input {
      width: 100%;
      padding: 0.625rem 2.5rem 0.625rem 2.5rem;
      background: rgba(255,255,255,0.6);
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 0.9rem;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
      outline: none;
      box-sizing: border-box;
    }

    .field-input::placeholder {
      color: rgba(0,0,0,0.28);
    }

    .field-input:focus {
      border-color: rgba(160, 33, 149, 0.5);
      background: rgba(255,255,255,0.85);
      box-shadow: 0 0 0 3px rgba(160, 33, 149, 0.12);
    }

    /* only right-pad when no toggle button */
    input[type="email"].field-input {
      padding-right: 0.75rem;
    }

    .toggle-pw {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: var(--radius-sm);
      transition: color 0.15s;
    }

    .toggle-pw:hover {
      color: rgba(0,0,0,0.7);
    }

    /* ── Remember me ── */
    .remember-me {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-gray-500, #6B7280);
    }
    .remember-me input[type="checkbox"] {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      accent-color: #7C3AED;
      cursor: pointer;
    }
    .remember-me span {
      user-select: none;
    }

    /* ── Error ── */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.625rem 0.75rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: var(--radius-md);
      color: #fca5a5;
      font-size: 0.8125rem;
      animation: shake 0.3s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* ── Button ── */
    .btn-signin {
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #A02195 0%, #6B21A8 50%, #1A56DB 100%);
      border: none;
      border-radius: var(--radius-md);
      color: white;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
      letter-spacing: 0.01em;
      position: relative;
      overflow: hidden;
    }

    .btn-signin::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
    }

    .btn-signin:hover:not(:disabled) {
      opacity: 0.92;
      box-shadow: 0 4px 20px rgba(160, 33, 149, 0.35);
      transform: translateY(-1px);
    }

    .btn-signin:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-signin:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* ── Footer note ── */
    .card-footer-note {
      margin: 1.5rem 0 0;
      text-align: center;
      font-size: 0.6875rem;
      color: rgba(0,0,0,0.3);
      letter-spacing: 0.02em;
    }

    /* ── Mobile (iPhone) ── */
    @media (max-width: 768px) {
      :host {
        height: auto;
        min-height: 100vh;
        min-height: -webkit-fill-available;
      }

      .login-bg {
        min-height: 100vh;
        min-height: -webkit-fill-available;
        padding: env(safe-area-inset-top, 1rem) 0 env(safe-area-inset-bottom, 1rem);
        align-items: flex-start;
        padding-top: max(env(safe-area-inset-top, 0px), 2rem);
      }

      .login-card {
        max-width: 100%;
        width: 100%;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-top: none;
        box-shadow: none;
        background: rgba(255, 255, 255, 0.88);
        padding: 2rem 1.25rem max(env(safe-area-inset-bottom, 0px), 2rem);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        backdrop-filter: blur(20px) saturate(1.4);
      }

      .card-header {
        margin-bottom: 1.75rem;
      }

      .card-title {
        font-size: 2rem;
        text-align: center;
      }

      .card-logo {
        margin-bottom: 1.25rem;
      }

      .logo-img {
        height: 52px;
      }

      .field-input {
        font-size: 16px; /* prevents iOS auto-zoom */
        min-height: 48px;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
      }

      input[type="email"].field-input {
        font-size: 16px;
      }

      .btn-signin {
        width: 100%;
        min-height: 52px;
        font-size: 1rem;
        margin-top: 0.75rem;
      }

      .toggle-pw {
        padding: 8px;
        min-width: 44px;
        min-height: 44px;
        right: 4px;
      }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  logoError = false;

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) {
      this.email = saved;
      this.rememberMe = true;
    }
  }

  clearError(): void {
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter your email and password.');
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.rememberMe) {
      localStorage.setItem('rememberedEmail', this.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const success = await this.auth.login(this.email, this.password);
    this.isLoading.set(false);

    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set('Invalid email or password.');
    }
  }
}
