import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  teamMemberId: number | null;
  color: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(null);
  private _token = signal<string | null>(null);

  user = this._user.asReadonly();
  isAuthenticated = computed(() => !!this._user());
  isAdmin = computed(() => this._user()?.role === 'admin');

  constructor() {
    const saved = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    if (saved && token) {
      this._user.set(JSON.parse(saved));
      this._token.set(token);
    }
  }

  getToken(): string | null {
    return this._token();
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      );

      this._user.set(res.user);
      this._token.set(res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      localStorage.setItem('auth_token', res.token);
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    this._user.set(null);
    this._token.set(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }
}
