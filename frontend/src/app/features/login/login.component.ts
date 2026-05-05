import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <div class="logo-mark">C</div>
            <span class="logo-text">CAT-I OPS</span>
          </div>
          <p class="login-subtitle">Sign in to your account</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-field">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="you@cat-i.ai" required />
          </div>
          <div class="form-field">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Enter your password" required />
          </div>
          <div class="form-field-check">
            <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" id="remember" />
            <label for="remember">Remember me</label>
          </div>
          @if (error) {
            <p class="error-text">{{ error }}</p>
          }
          <button type="submit" class="btn-login" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <p class="login-hint">Default password: <code>catops2026</code></p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-gray, #F9FAFB);
    }
    .login-card {
      width: 100%;
      max-width: 380px;
      padding: 0 1rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .logo-mark {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #9333ea, #ec4899);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 1.1rem;
    }
    .logo-text { font-size: 1.5rem; font-weight: 700; color: var(--color-gray-900, #111827); }
    .login-subtitle { color: var(--color-gray-500, #6B7280); font-size: 0.875rem; }
    .login-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-field label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--color-gray-700, #374151); margin-bottom: 4px; }
    .form-field input {
      width: 100%; padding: 10px 12px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px; font-size: 0.875rem;
      color: var(--color-gray-900, #111827);
      background: white;
    }
    .form-field input:focus { outline: none; border-color: #9333ea; box-shadow: 0 0 0 2px rgba(147,51,234,0.2); }
    .form-field input::placeholder { color: var(--color-gray-400, #9CA3AF); }
    .form-field-check { display: flex; align-items: center; gap: 8px; }
    .form-field-check label { font-size: 0.875rem; color: var(--color-gray-600, #4B5563); }
    .error-text { color: #EF4444; font-size: 0.875rem; }
    .btn-login {
      width: 100%; padding: 10px;
      background: #9333ea; color: white;
      border: none; border-radius: 8px;
      font-size: 0.875rem; font-weight: 500;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-login:hover:not(:disabled) { background: #7e22ce; }
    .btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
    .login-hint { text-align: center; font-size: 0.75rem; color: var(--color-gray-400, #9CA3AF); margin-top: 1.5rem; }
    .login-hint code { color: var(--color-gray-600, #4B5563); }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private apiService = inject(ApiService);

  email = '';
  password = '';
  rememberMe = false;
  error = '';
  loading = false;

  constructor() {
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) { this.email = saved; this.rememberMe = true; }
  }

  async onSubmit() {
    this.error = '';
    this.loading = true;

    if (this.rememberMe) {
      localStorage.setItem('rememberedEmail', this.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const success = await this.auth.login(this.email, this.password);
    this.loading = false;

    if (success) {
      this.apiService.loadAll(true);
      this.router.navigate(['/dashboard']);
    } else {
      this.error = 'Invalid email or password';
    }
  }
}
