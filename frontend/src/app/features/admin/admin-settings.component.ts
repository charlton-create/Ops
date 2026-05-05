import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { HeaderComponent } from '../../layout/header.component';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { UserRole, ROLE_PERMISSIONS, Permission, PERMISSION_LABELS, TicketingSettings, EscalationRule, DiagCatalog, DiagRun, DiagRunSummary, DiagAIFinding, DiagCheckStatus, DIAG_STATUS_META, SidebarItem, SidebarChild } from '../../core/models';
import { ICON_REGISTRY } from '../../shared/icons';
import { IconComponent } from '../../shared/icons';
import { TeamUtilService } from '../../shared/utils/team.service';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  permissions: string[];
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HeaderComponent, IconComponent],
  template: `
    <app-header
      title="Admin Settings"
      subtitle="Company Configuration & User Management"
      icon="settings"
      gradient="linear-gradient(135deg, #6B7280 0%, #374151 100%)"
    ></app-header>

    <div class="admin-content">
      <!-- Tabs -->
      <div class="admin-tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Users
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'roles'" (click)="activeTab.set('roles')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Roles & Permissions
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'company'" (click)="activeTab.set('company')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
          </svg>
          Company
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'security'" (click)="activeTab.set('security')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Security
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'ai'" (click)="activeTab.set('ai')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            <circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/>
          </svg>
          AI Settings
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'ticketing'" (click)="activeTab.set('ticketing'); loadTicketingSettings()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
          </svg>
          Ticketing
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'diagnostics'" (click)="activeTab.set('diagnostics'); loadDiagnostics()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          System Diagnostics
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'sidebar'" (click)="activeTab.set('sidebar'); loadSidebarLayout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          Operations Sidebar
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        @if (activeTab() === 'users') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>User Management</h3>
                <p>Manage team members and their access levels</p>
              </div>
              <button class="btn-primary btn-sm" (click)="showAddUserModal.set(true)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                Add User
              </button>
            </div>

            <div class="table-card">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td>
                        <div class="user-cell">
                          <div class="user-avatar" [style.background]="teamUtil.getColor(user.name)">
                            {{ user.name.charAt(0) }}
                          </div>
                          <div class="user-info">
                            <span class="user-name">{{ user.name }}</span>
                            <span class="user-email">{{ user.email }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class]="'badge-' + getRoleBadge(user.role)">{{ user.role }}</span>
                      </td>
                      <td>{{ user.department }}</td>
                      <td>
                        <span class="status-indicator" [class]="user.status">{{ user.status }}</span>
                      </td>
                      <td class="last-login">{{ user.lastLogin }}</td>
                      <td>
                        <div class="action-btns">
                          <button class="icon-btn" title="Edit" (click)="editUser(user)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button class="icon-btn" title="Reset Password" (click)="resetPassword(user)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </button>
                          @if (user.role !== 'admin') {
                            @if (user.status === 'active') {
                              <button class="icon-btn" title="Deactivate" (click)="deactivateUser(user)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
                                </svg>
                              </button>
                            } @else {
                              <button class="icon-btn" title="Activate" (click)="activateUser(user)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                                </svg>
                              </button>
                            }
                            <button class="icon-btn danger" title="Delete" (click)="deleteUser(user)">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (activeTab() === 'roles') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>Roles & Permissions</h3>
                <p>Define access levels for different user roles</p>
              </div>
            </div>

            <div class="roles-grid">
              @for (role of roles(); track role.id) {
                <div class="role-card" [class.expanded]="expandedRole === role.id" (click)="toggleRoleExpand(role.id)">
                  <div class="role-header">
                    <h4>{{ role.name }}</h4>
                    <span class="badge" [class]="'badge-' + role.badge">{{ role.userCount }} users</span>
                  </div>
                  <p class="role-desc">{{ role.description }}</p>
                  <div class="permissions-summary">
                    <span class="perm-count">{{ role.permissions.length }} permissions</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.rotated]="expandedRole === role.id">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  @if (expandedRole === role.id) {
                    <div class="permissions-detail" (click)="$event.stopPropagation()">
                      @for (group of permissionGroups; track group.id) {
                        <div class="perm-group">
                          <h5>{{ group.label }}</h5>
                          <div class="perm-group-items">
                            @for (perm of group.permissions; track perm) {
                              <div class="perm-item" [class.granted]="role.permissions.includes(perm)">
                                @if (role.permissions.includes(perm)) {
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                } @else {
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                  </svg>
                                }
                                {{ getPermissionLabel(perm) }}
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- User Permissions Assignment -->
            <div class="user-permissions-section">
              <div class="section-subheader">
                <h4>Individual User Permissions</h4>
                <p>Override role permissions for specific users</p>
              </div>
              <div class="user-perm-list">
                @for (user of users(); track user.id) {
                  <div class="user-perm-row">
                    <div class="user-perm-info">
                      <div class="user-avatar-sm" [style.background]="teamUtil.getColor(user.name)">{{ user.name.charAt(0) }}</div>
                      <div>
                        <span class="user-perm-name">{{ user.name }}</span>
                        <span class="user-perm-role">{{ user.role }}</span>
                      </div>
                    </div>
                    <div class="user-perm-badges">
                      @for (group of getExtraPermissions(user); track group) {
                        <span class="perm-badge">{{ group }}</span>
                      }
                    </div>
                    <button class="btn-secondary btn-sm" (click)="editUserPermissions(user)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Permissions
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'company') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>Company Settings</h3>
                <p>Configure organization-wide settings</p>
              </div>
            </div>

            <div class="settings-grid">
              <div class="settings-card">
                <h4>Organization Profile</h4>
                <div class="form-group">
                  <label class="form-label">Company Name</label>
                  <input type="text" class="form-input" value="CAT-I.AI" [(ngModel)]="companySettings.name">
                </div>
                <div class="form-group">
                  <label class="form-label">Industry</label>
                  <select class="form-select" [(ngModel)]="companySettings.industry">
                    <option>Technology</option>
                    <option>Manufacturing</option>
                    <option>Food & Beverage</option>
                    <option>Healthcare</option>
                    <option>Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Primary Contact Email</label>
                  <input type="email" class="form-input" [(ngModel)]="companySettings.email">
                </div>
                <div class="form-group">
                  <label class="form-label">Timezone</label>
                  <select class="form-select" [(ngModel)]="companySettings.timezone">
                    <option>America/Los_Angeles (PST)</option>
                    <option>America/New_York (EST)</option>
                    <option>America/Chicago (CST)</option>
                    <option>Europe/London (GMT)</option>
                    <option>Asia/Kolkata (IST)</option>
                  </select>
                </div>
                <button class="btn-primary btn-sm">Save Changes</button>
              </div>

              <div class="settings-card">
                <h4>Departments</h4>
                <div class="department-list">
                  @for (dept of departments; track dept; let i = $index) {
                    <div class="department-item">
                      @if (editingDeptIndex === i) {
                        <input class="form-input form-input-sm dept-edit-input" [value]="dept" #deptEdit (keydown.enter)="saveDept(i, deptEdit.value)" (keydown.escape)="editingDeptIndex = -1" (blur)="saveDept(i, deptEdit.value)">
                      } @else {
                        <span>{{ dept }}</span>
                        <div class="dept-actions">
                          <button class="icon-btn-sm" title="Edit" (click)="editingDeptIndex = i">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button class="icon-btn-sm danger" title="Remove" (click)="removeDept(i)">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
                @if (addingDept) {
                  <input class="form-input form-input-sm dept-add-input" placeholder="Department name..." #newDeptInput (keydown.enter)="confirmAddDept(newDeptInput.value)" (keydown.escape)="addingDept = false" (blur)="confirmAddDept(newDeptInput.value)">
                } @else {
                  <button class="btn-secondary btn-sm add-dept-btn" (click)="addingDept = true">+ Add Department</button>
                }
              </div>

              <div class="settings-card card-disabled">
                <div class="coming-soon-badge">Coming Soon</div>
                <h4>Integrations</h4>
                <div class="integration-list">
                  <div class="integration-item">
                    <div class="integration-info">
                      <span class="integration-name">Google Workspace</span>
                      <span class="integration-status">Not connected</span>
                    </div>
                    <button class="btn-secondary btn-sm" disabled>Configure</button>
                  </div>
                  <div class="integration-item">
                    <div class="integration-info">
                      <span class="integration-name">Slack</span>
                      <span class="integration-status">Not connected</span>
                    </div>
                    <button class="btn-secondary btn-sm" disabled>Connect</button>
                  </div>
                  <div class="integration-item">
                    <div class="integration-info">
                      <span class="integration-name">Salesforce</span>
                      <span class="integration-status">Not connected</span>
                    </div>
                    <button class="btn-secondary btn-sm" disabled>Connect</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'security') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>Security Settings</h3>
                <p>Configure authentication and security policies</p>
              </div>
            </div>

            <div class="settings-grid">
              <div class="settings-card">
                <h4>Authentication</h4>
                <div class="setting-row disabled-row">
                  <div class="setting-info">
                    <span class="setting-name">Two-Factor Authentication <span class="coming-soon-inline">Coming Soon</span></span>
                    <span class="setting-desc">Require 2FA for all users</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" disabled>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row disabled-row">
                  <div class="setting-info">
                    <span class="setting-name">SSO (Single Sign-On) <span class="coming-soon-inline">Coming Soon</span></span>
                    <span class="setting-desc">Enable enterprise SSO</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" disabled>
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Session Timeout</span>
                    <span class="setting-desc">Auto-logout after inactivity</span>
                  </div>
                  <select class="form-select-sm" [(ngModel)]="securitySettings.sessionTimeout">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                  </select>
                </div>
              </div>

              <div class="settings-card">
                <h4>Password Policy</h4>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Minimum Length</span>
                  </div>
                  <select class="form-select-sm" [(ngModel)]="securitySettings.minPasswordLength">
                    <option value="8">8 characters</option>
                    <option value="10">10 characters</option>
                    <option value="12">12 characters</option>
                    <option value="16">16 characters</option>
                  </select>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Require Special Characters</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" [(ngModel)]="securitySettings.requireSpecialChars">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Password Expiration</span>
                  </div>
                  <select class="form-select-sm" [(ngModel)]="securitySettings.passwordExpiration">
                    <option value="0">Never</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>
              </div>

              <div class="settings-card">
                <h4>Audit Log</h4>
                <p class="audit-desc">Recent system activities</p>
                <div class="audit-list">
                  @for (activity of auditLog(); track activity.id) {
                    <div class="audit-item">
                      <span class="audit-time">{{ formatAuditTime(activity.time) }}</span>
                      <span class="audit-event">{{ activity.who }} {{ activity.action }} {{ activity.target }}</span>
                      @if (activity.detail) {
                        <span class="audit-detail">{{ activity.detail }}</span>
                      }
                    </div>
                  } @empty {
                    <div class="audit-item"><span class="audit-event">No recent activity</span></div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'ai') {
          <div class="content-section card-disabled">
            <div class="coming-soon-badge">Coming Soon</div>
            <div class="section-header">
              <div>
                <h3>AI Assistant Configuration</h3>
                <p>Configure Anthropic Claude AI for content generation and templates</p>
              </div>
            </div>

            <div class="settings-grid">
              <div class="settings-card">
                <h4>API Configuration</h4>
                <div class="form-group">
                  <label class="form-label">Anthropic API Key</label>
                  <div class="api-key-input">
                    <input
                      [type]="showApiKey ? 'text' : 'password'"
                      class="form-input"
                      [(ngModel)]="aiSettings.apiKey"
                      placeholder="sk-ant-..."
                    >
                    <button class="icon-btn-sm" (click)="showApiKey = !showApiKey">
                      @if (showApiKey) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                    </button>
                  </div>
                  <span class="form-hint">Your API key is stored securely and never logged.</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Model</label>
                  <select class="form-select" [(ngModel)]="aiSettings.model">
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
                    <option value="claude-opus-4-20250514">Claude Opus 4</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</option>
                  </select>
                </div>
                <div class="api-status" [class.connected]="aiSettings.apiKey">
                  <span class="status-dot"></span>
                  {{ aiSettings.apiKey ? 'API Key Configured' : 'Not Configured' }}
                </div>
                <button class="btn-primary btn-sm" (click)="testAIConnection()" [disabled]="!aiSettings.apiKey">
                  Test Connection
                </button>
              </div>

              <div class="settings-card">
                <h4>AI Features</h4>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Content Generation</span>
                    <span class="setting-desc">Generate blog posts, social content, newsletters</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" [(ngModel)]="aiSettings.features.contentGeneration">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Project Template Suggestions</span>
                    <span class="setting-desc">AI-suggested tasks for new projects</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" [(ngModel)]="aiSettings.features.templateSuggestions">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">MES Intake Analysis</span>
                    <span class="setting-desc">Analyze intake forms and suggest modules</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" [(ngModel)]="aiSettings.features.intakeAnalysis">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-name">Email Drafts</span>
                    <span class="setting-desc">Draft follow-up emails for leads</span>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" [(ngModel)]="aiSettings.features.emailDrafts">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div class="settings-card full-width">
                <h4>Usage & Limits</h4>
                <div class="usage-stats">
                  <div class="usage-stat">
                    <span class="usage-label">API Calls Today</span>
                    <span class="usage-value">{{ aiSettings.usage.today }}</span>
                  </div>
                  <div class="usage-stat">
                    <span class="usage-label">This Month</span>
                    <span class="usage-value">{{ aiSettings.usage.month }}</span>
                  </div>
                  <div class="usage-stat">
                    <span class="usage-label">Monthly Limit</span>
                    <span class="usage-value">{{ aiSettings.usage.limit }}</span>
                  </div>
                </div>
                <div class="usage-bar-container">
                  <div class="usage-bar" [style.width.%]="(aiSettings.usage.month / aiSettings.usage.limit) * 100"></div>
                </div>
                <span class="usage-hint">{{ aiSettings.usage.limit - aiSettings.usage.month }} calls remaining this month</span>
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'ticketing') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>Ticketing Preferences</h3>
                <p>Email templates, escalation thresholds, and customer portal API keys for the support system.</p>
              </div>
              @if (ticketingSavedAt()) {
                <span class="saved-pill">✓ Saved {{ ticketingSavedAt() }}</span>
              }
            </div>

            @if (!ticketingSettings()) {
              <div class="loading-state">Loading ticketing settings…</div>
            } @else {
              <div class="settings-grid">
                <!-- Email config -->
                <div class="settings-card">
                  <h4>Email Configuration</h4>
                  <div class="form-group">
                    <label class="form-label">Support "From" Email</label>
                    <input type="email" class="form-input"
                      [(ngModel)]="ticketingFormState.supportEmail"
                      (blur)="saveTicketing()" />
                    <span class="form-hint">SES must have this address verified.</span>
                  </div>
                  <div class="setting-row">
                    <div class="setting-info">
                      <span class="setting-name">Auto-Reply on Ticket Creation</span>
                      <span class="setting-desc">Sends the customer a confirmation email when a ticket is opened.</span>
                    </div>
                    <label class="toggle">
                      <input type="checkbox"
                        [(ngModel)]="ticketingFormState.autoReplyEnabled"
                        (change)="saveTicketing()" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <!-- Templates -->
                <div class="settings-card full-width">
                  <h4>Message Templates</h4>
                  <p class="form-hint" style="margin-bottom: 12px;">
                    Variables: <code>{{ '{{TICKET_ID}}' }}</code>, <code>{{ '{{ASSIGNEE}}' }}</code>, <code>{{ '{{SLA}}' }}</code>,
                    <code>{{ '{{STATUS}}' }}</code>, <code>{{ '{{LEVEL}}' }}</code>, <code>{{ '{{MESSAGE}}' }}</code>, <code>{{ '{{RESOLUTION}}' }}</code>
                  </p>
                  <div class="form-group">
                    <label class="form-label">Auto-Reply (Ticket Created)</label>
                    <textarea class="form-input" rows="5"
                      [(ngModel)]="ticketingFormState.autoReplyTemplate"
                      (blur)="saveTicketing()"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Status Change Notification</label>
                    <textarea class="form-input" rows="4"
                      [(ngModel)]="ticketingFormState.statusChangeTemplate"
                      (blur)="saveTicketing()"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Escalation Notification</label>
                    <textarea class="form-input" rows="4"
                      [(ngModel)]="ticketingFormState.escalationTemplate"
                      (blur)="saveTicketing()"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Resolution / Completion</label>
                    <textarea class="form-input" rows="4"
                      [(ngModel)]="ticketingFormState.completionTemplate"
                      (blur)="saveTicketing()"></textarea>
                  </div>
                </div>

                <!-- Escalation rules -->
                <div class="settings-card full-width">
                  <h4>Escalation Reminders</h4>
                  <p class="form-hint" style="margin-bottom: 12px;">
                    Reminder emails fire when a ticket of the given level has been open longer than the threshold.
                  </p>
                  <table class="data-table" style="width: 100%; font-size: 12px;">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Hours Open</th>
                        <th>Recipients</th>
                        <th>Subject</th>
                        <th>On</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of ticketingFormState.escalationRules; track r.id; let i = $index) {
                        <tr>
                          <td>
                            <select [(ngModel)]="r.level" (change)="saveTicketing()">
                              <option [ngValue]="1">L1</option>
                              <option [ngValue]="2">L2</option>
                              <option [ngValue]="3">L3</option>
                            </select>
                          </td>
                          <td>
                            <input type="number" step="0.5" min="0.5" style="width: 70px;"
                              [(ngModel)]="r.hoursOpen" (blur)="saveTicketing()" />
                          </td>
                          <td><input style="width: 100%;" [(ngModel)]="r.recipient" (blur)="saveTicketing()" /></td>
                          <td><input style="width: 100%;" [(ngModel)]="r.subject" (blur)="saveTicketing()" /></td>
                          <td style="text-align: center;">
                            <input type="checkbox" [(ngModel)]="r.enabled" (change)="saveTicketing()" />
                          </td>
                          <td>
                            <button class="icon-btn-sm" (click)="removeRule(i)" title="Remove">×</button>
                          </td>
                        </tr>
                      }
                      @if (ticketingFormState.escalationRules.length === 0) {
                        <tr><td colspan="6" style="text-align: center; padding: 16px; color: #6B7280;">No reminders configured. Add one below.</td></tr>
                      }
                    </tbody>
                  </table>
                  <button class="btn-secondary btn-sm" (click)="addRule()" style="margin-top: 12px;">+ Add Reminder Rule</button>
                </div>

                <!-- Portal API Keys -->
                <div class="settings-card full-width">
                  <h4>Customer Portal API Keys</h4>
                  <p class="form-hint" style="margin-bottom: 12px;">
                    Each customer's subscription portal sends tickets to <code>POST {{ portalEndpoint }}</code>
                    with header <code>X-Customer-Portal-Key</code>. Generate, copy, and rotate keys here.
                  </p>
                  <table class="data-table" style="width: 100%; font-size: 12px;">
                    <thead>
                      <tr><th>Customer</th><th>API Key</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      @for (c of dataService.customers(); track c.id) {
                        <tr>
                          <td>
                            <strong>{{ c.company }}</strong>
                            <div style="color: #6B7280; font-size: 11px;">{{ c.email || '—' }}</div>
                          </td>
                          <td>
                            @if (portalKeys()[c.id]) {
                              <code style="font-size: 11px; word-break: break-all;">{{ portalKeys()[c.id] }}</code>
                            } @else {
                              <span style="color: #6B7280; font-style: italic;">No key generated</span>
                            }
                          </td>
                          <td>
                            <button class="btn-secondary btn-sm" (click)="generatePortalKey(c.id)">
                              {{ portalKeys()[c.id] ? 'Rotate' : 'Generate' }}
                            </button>
                            @if (portalKeys()[c.id]) {
                              <button class="btn-secondary btn-sm" (click)="copyKey(c.id)" style="margin-left: 4px;">Copy</button>
                              <button class="icon-btn-sm" (click)="revokePortalKey(c.id)" title="Revoke" style="margin-left: 4px;">×</button>
                            }
                          </td>
                        </tr>
                      }
                      @if (dataService.customers().length === 0) {
                        <tr><td colspan="3" style="text-align: center; padding: 16px; color: #6B7280;">No customers yet.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'diagnostics') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>System Diagnostics</h3>
                <p>Real-time automated probes against database, auth, integrations, and data integrity. Optional AI commentary on findings.</p>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <label style="display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted, #6B7280);">
                  <input type="checkbox" [(ngModel)]="diagIncludeAi" />
                  Generate AI findings
                </label>
                <button class="btn-secondary btn-sm" (click)="runDiagModule()" [disabled]="diagRunning() || !diagSelectedModule()">
                  Audit Module
                </button>
                <button class="btn-primary btn-sm" (click)="runDiagPlatform()" [disabled]="diagRunning()">
                  {{ diagRunning() ? 'Running…' : '🤖 Full Platform Audit' }}
                </button>
              </div>
            </div>

            @if (!diagCatalog()) {
              <div class="loading-state">Loading diagnostics catalog…</div>
            } @else {
              <!-- Top stats: latest run summary -->
              @if (diagLatest(); as r) {
                <div class="diag-summary">
                  <div class="diag-score" [style.borderColor]="diagGradeColor(r.healthScore)">
                    <div class="diag-score-num" [style.color]="diagGradeColor(r.healthScore)">{{ r.healthScore }}<span style="font-size:14px">%</span></div>
                    <div class="diag-score-grade" [style.color]="diagGradeColor(r.healthScore)">Grade {{ diagGrade(r.healthScore) }} — {{ diagGradeLabel(r.healthScore) }}</div>
                  </div>
                  <div class="diag-stats">
                    <div class="diag-stat"><span class="k">Scope</span><span class="v">{{ scopeLabel(r.scope) }}</span></div>
                    <div class="diag-stat"><span class="k">Total</span><span class="v">{{ r.totalChecks }}</span></div>
                    <div class="diag-stat"><span class="k">Pass</span><span class="v" style="color:#047857">{{ r.passCount }}</span></div>
                    <div class="diag-stat"><span class="k">Warn</span><span class="v" style="color:#92400E">{{ r.warnCount }}</span></div>
                    <div class="diag-stat"><span class="k">Fail</span><span class="v" style="color:#BE123C">{{ r.failCount }}</span></div>
                    <div class="diag-stat"><span class="k">Duration</span><span class="v">{{ r.durationMs }}ms</span></div>
                  </div>
                </div>
              }

              <!-- Layout: module list left, suite results right -->
              <div class="diag-layout">
                <aside class="diag-side">
                  <div class="diag-side-label">Modules</div>
                  @for (m of diagCatalog()!.modules; track m.id) {
                    <button class="diag-mod-btn"
                      [class.active]="diagSelectedModule() === m.id"
                      [style.--c]="m.color"
                      (click)="diagSelectedModule.set(m.id)">
                      <span class="diag-mod-icon">{{ m.icon }}</span>
                      <div style="flex:1; text-align: left; min-width: 0;">
                        <div class="diag-mod-name">{{ m.name }}</div>
                        <div class="diag-mod-desc">{{ m.desc }}</div>
                        @if (diagModuleStats(m.id); as ms) {
                          <div class="diag-mod-stats">
                            @if (ms.pass > 0) { <span style="color:#047857">✓{{ ms.pass }}</span> }
                            @if (ms.warn > 0) { <span style="color:#92400E">⚠{{ ms.warn }}</span> }
                            @if (ms.fail > 0) { <span style="color:#BE123C">✗{{ ms.fail }}</span> }
                          </div>
                        }
                      </div>
                    </button>
                  }
                </aside>

                <div class="diag-main">
                  @for (s of suitesForSelectedModule(); track s.id) {
                    <div class="diag-suite">
                      <div class="diag-suite-head">
                        <div>
                          <div class="diag-suite-title">
                            {{ s.name }}
                            <span class="diag-cat">{{ s.category }}</span>
                            <span class="diag-weight">wt:{{ s.weight }}</span>
                          </div>
                          <div class="diag-suite-meta">{{ s.checks.length }} check(s)</div>
                        </div>
                        <button class="btn-ghost btn-sm" (click)="runDiagSuite(s.id)" [disabled]="diagRunning()">
                          {{ diagRunningSuite() === s.id ? 'Running…' : 'Run' }}
                        </button>
                      </div>
                      <div class="diag-checks">
                        @for (c of s.checks; track c.id; let i = $index) {
                          <div class="diag-check" [class.pass]="diagStatus(s.id, i) === 'pass'" [class.warn]="diagStatus(s.id, i) === 'warn'" [class.fail]="diagStatus(s.id, i) === 'fail'">
                            <span class="diag-check-dot" [style.background]="diagDotColor(diagStatus(s.id, i))">
                              {{ diagDotIcon(diagStatus(s.id, i)) || (i + 1) }}
                            </span>
                            <span class="diag-check-name">{{ c.name }}</span>
                            @if (diagMessage(s.id, i)) {
                              <span class="diag-check-msg">{{ diagMessage(s.id, i) }}</span>
                            }
                            @if (diagStatus(s.id, i)) {
                              <span class="diag-check-pill"
                                [style.background]="diagStatusBg(diagStatus(s.id, i))"
                                [style.color]="diagStatusColor(diagStatus(s.id, i))">{{ diagStatus(s.id, i) }}</span>
                            }
                          </div>
                        }
                      </div>
                      @if (diagFinding(s.id); as f) {
                        <div class="diag-finding"
                          [style.borderColor]="diagSeverityColor(f.severity)"
                          [style.background]="diagSeverityBg(f.severity)">
                          <div class="diag-finding-head">
                            <span style="font-weight:700; font-size: 12px;">🧠 AI FINDING</span>
                            <span class="diag-sev-pill"
                              [style.background]="diagSeverityPillBg(f.severity)"
                              [style.color]="diagSeverityColor(f.severity)">{{ f.severity }}</span>
                            <span class="diag-risk-pill">{{ f.risk_area }}</span>
                            @if (f.estimated_effort) {
                              <span class="diag-effort-pill" [style.color]="diagEffortColor(f.estimated_effort)">Effort: {{ f.estimated_effort }}</span>
                            }
                            @if (isCritMaj(f.severity)) {
                              <button class="btn-ghost btn-xs" style="margin-left: auto;" (click)="toggleFinding(s.id)">
                                {{ expandedFinding() === s.id ? '▴ Collapse' : '▾ Details' }}
                              </button>
                            }
                          </div>
                          <div class="diag-finding-body">{{ f.finding }}</div>
                          <div class="diag-finding-rec">💡 {{ f.recommendation }}</div>
                          @if (f.regulatory_refs.length > 0) {
                            <div class="diag-refs">
                              @for (r of f.regulatory_refs; track r) {
                                <span class="diag-ref">{{ r }}</span>
                              }
                            </div>
                          }
                          @if (isCritMaj(f.severity) && expandedFinding() === s.id) {
                            <div class="diag-finding-expanded">
                              @if (f.root_cause) {
                                <div class="diag-section">
                                  <div class="diag-section-head">🔍 ROOT CAUSE ANALYSIS</div>
                                  <div class="diag-section-body">{{ f.root_cause }}</div>
                                </div>
                              }
                              @if (f.impact_analysis) {
                                <div class="diag-section">
                                  <div class="diag-section-head">⚡ IMPACT ANALYSIS</div>
                                  <div class="diag-section-body">{{ f.impact_analysis }}</div>
                                </div>
                              }
                              @if (f.compliance_risk) {
                                <div class="diag-section">
                                  <div class="diag-section-head" style="color:#BE123C">🚨 COMPLIANCE & OPERATIONAL RISK</div>
                                  <div class="diag-section-body" style="color:#BE123C">{{ f.compliance_risk }}</div>
                                </div>
                              }
                              @if (f.failed_checks_detail.length > 0) {
                                <div class="diag-section">
                                  <div class="diag-section-head">✗ FAILED CHECK DETAILS & FIXES</div>
                                  @for (fc of f.failed_checks_detail; track $index) {
                                    <div class="diag-fc">
                                      <div class="diag-fc-name">✗ {{ fc.check }}</div>
                                      <div class="diag-fc-why"><strong>Why it matters:</strong> {{ fc.why_it_matters }}</div>
                                      <div class="diag-fc-fix"><strong>🔧 Fix:</strong> {{ fc.fix }}</div>
                                    </div>
                                  }
                                </div>
                              }
                              @if (f.remediation_plan) {
                                <div class="diag-section">
                                  <div class="diag-section-head">📅 REMEDIATION PLAN</div>
                                  <div class="diag-rem">
                                    <div class="diag-rem-step"><span class="diag-rem-dot" style="background:#BE123C"></span><div><div class="diag-rem-label" style="color:#BE123C">🚨 IMMEDIATE (24-48 hrs)</div><div class="diag-rem-text">{{ f.remediation_plan.immediate }}</div></div></div>
                                    <div class="diag-rem-step"><span class="diag-rem-dot" style="background:#92400E"></span><div><div class="diag-rem-label" style="color:#92400E">📋 SHORT-TERM (1-2 weeks)</div><div class="diag-rem-text">{{ f.remediation_plan.short_term }}</div></div></div>
                                    <div class="diag-rem-step"><span class="diag-rem-dot" style="background:#1A56DB"></span><div><div class="diag-rem-label" style="color:#1A56DB">🎯 LONG-TERM (30-90 days)</div><div class="diag-rem-text">{{ f.remediation_plan.long_term }}</div></div></div>
                                  </div>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Recent runs history -->
              @if (diagHistory().length > 0) {
                <div class="diag-history">
                  <div class="diag-history-head">📜 Recent Runs</div>
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>When</th><th>Scope</th><th>By</th><th>Duration</th>
                        <th>Pass</th><th>Warn</th><th>Fail</th><th>Score</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (h of diagHistory(); track h.id) {
                        <tr>
                          <td>{{ formatDiagDate(h.startedAt) }}</td>
                          <td><code>{{ scopeLabel(h.scope) }}</code></td>
                          <td>{{ h.startedByName || '—' }}</td>
                          <td>{{ h.durationMs }}ms</td>
                          <td style="color:#047857">{{ h.passCount }}</td>
                          <td style="color:#92400E">{{ h.warnCount }}</td>
                          <td style="color:#BE123C">{{ h.failCount }}</td>
                          <td><strong [style.color]="diagGradeColor(h.healthScore)">{{ h.healthScore }}%</strong></td>
                          <td><button class="btn-ghost btn-xs" (click)="loadDiagRun(h.id)">View</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </div>
        }

        @if (activeTab() === 'sidebar') {
          <div class="content-section">
            <div class="section-header">
              <div>
                <h3>Operations Sidebar</h3>
                <p>Drag to reorder. Drag a child between sections — or to the top-level area to promote it. Toggle visibility, rename, and recolor sections. Locked items (Dashboard, Admin Settings) can't be moved or hidden.</p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-secondary btn-sm" (click)="resetSidebarLayout()" [disabled]="sidebarSaving()">↺ Reset to Defaults</button>
                <button class="btn-primary btn-sm" (click)="saveSidebarLayout()" [disabled]="sidebarSaving() || !sidebarDirty()">
                  {{ sidebarSaving() ? 'Saving…' : (sidebarDirty() ? '💾 Save Changes' : '✓ Saved') }}
                </button>
              </div>
            </div>

            <div class="sb-tree" cdkDropList
                 id="sb-top-level"
                 [cdkDropListData]="sidebarDraft()"
                 [cdkDropListConnectedTo]="connectedSectionIds()"
                 (cdkDropListDropped)="onTopLevelDrop($event)">
              @for (item of sidebarDraft(); track item.id; let i = $index) {
                <div class="sb-row sb-top" cdkDrag [cdkDragData]="item" [cdkDragDisabled]="!!item.locked"
                     [class.sb-locked]="item.locked"
                     [class.sb-hidden]="item.visible === false"
                     [style.--c]="item.color">
                  <span class="sb-handle" cdkDragHandle title="Drag to reorder">⋮⋮</span>
                  <span class="sb-kind-pill">{{ item.kind === 'standalone' ? 'Standalone' : 'Section' }}</span>
                  <input class="sb-label" [(ngModel)]="item.label" (ngModelChange)="markDirty()"
                         [disabled]="!!item.locked && item.id === 'admin'" placeholder="Label" />
                  <input class="sb-color" type="color" [(ngModel)]="item.color" (ngModelChange)="markDirty()" title="Color" />
                  @if (item.kind === 'standalone') {
                    <select class="sb-icon" [(ngModel)]="item.icon" (ngModelChange)="markDirty()" title="Icon">
                      @for (icon of iconNames; track icon) { <option [value]="icon">{{ icon }}</option> }
                    </select>
                    <span class="sb-route" [title]="item.route ?? ''">{{ item.route }}</span>
                  } @else {
                    <span class="sb-route">{{ item.children?.length ?? 0 }} child{{ (item.children?.length ?? 0) === 1 ? '' : 'ren' }}</span>
                  }
                  <button class="sb-eye" [class.off]="item.visible === false" (click)="toggleVisible(item)" [disabled]="item.locked" title="Toggle visibility">
                    {{ item.visible === false ? '◌' : '👁' }}
                  </button>
                  <button class="sb-del" (click)="deleteItem(i)" [disabled]="item.locked" title="Delete">×</button>
                </div>

                @if (item.kind === 'section') {
                  <div class="sb-children" cdkDropList
                       [id]="'sb-children-' + item.id"
                       [cdkDropListData]="item.children ?? []"
                       [cdkDropListConnectedTo]="otherSectionIds(item.id)"
                       (cdkDropListDropped)="onChildDrop($event, item)">
                    @for (child of item.children ?? []; track child.id; let j = $index) {
                      <div class="sb-row sb-child" cdkDrag [cdkDragData]="child" [cdkDragDisabled]="!!child.locked"
                           [class.sb-locked]="child.locked"
                           [class.sb-hidden]="child.visible === false">
                        <span class="sb-handle" cdkDragHandle>⋮⋮</span>
                        <input class="sb-label" [(ngModel)]="child.label" (ngModelChange)="markDirty()" placeholder="Label" />
                        <select class="sb-icon" [(ngModel)]="child.icon" (ngModelChange)="markDirty()" title="Icon">
                          @for (icon of iconNames; track icon) { <option [value]="icon">{{ icon }}</option> }
                        </select>
                        <span class="sb-route" [title]="child.route">{{ child.route }}</span>
                        <button class="sb-eye" [class.off]="child.visible === false" (click)="toggleChildVisible(child)" [disabled]="child.locked" title="Toggle visibility">
                          {{ child.visible === false ? '◌' : '👁' }}
                        </button>
                        <button class="sb-del" (click)="deleteChild(item, j)" [disabled]="child.locked" title="Remove from this section">×</button>
                      </div>
                    } @empty {
                      <div class="sb-empty">Drop a child here to add to this section</div>
                    }
                  </div>
                }
              }
            </div>

            <div class="sb-footer">
              <strong>How drag-drop works:</strong>
              <ul>
                <li>Drag any row by the <code>⋮⋮</code> handle.</li>
                <li>Drop a section's child onto a different section to move it.</li>
                <li>Drop a section's child onto the top-level area to promote it to a standalone link.</li>
                <li>Drop a top-level standalone link into a section to demote it to a child.</li>
                <li>Promoted/demoted items keep their <code>route</code>; you only edit the label, icon, and visibility.</li>
              </ul>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Add User Modal -->
    @if (showAddUserModal()) {
      <div class="modal-overlay" (click)="showAddUserModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingUser ? 'Edit User' : 'Add User' }}</h2>
            <button class="modal-close-btn" (click)="closeUserModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="newUser.name" placeholder="Full name">
              </div>
              <div class="form-group">
                <label class="form-label">Email <span class="required">*</span></label>
                <input type="email" class="form-input" [(ngModel)]="newUser.email" placeholder="email@company.com">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Role</label>
                <select class="form-select" [(ngModel)]="newUser.role">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <select class="form-select" [(ngModel)]="newUser.department">
                  @for (dept of departments; track dept) {
                    <option [value]="dept">{{ dept }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" [(ngModel)]="newUser.status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeUserModal()">Cancel</button>
            <button class="btn-primary" (click)="saveUser()" [disabled]="!newUser.name || !newUser.email">
              {{ editingUser ? 'Save Changes' : 'Add User' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Permissions Modal -->
    @if (showPermissionsModal()) {
      <div class="modal-overlay" (click)="closePermissionsModal()">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Permissions — {{ permissionsUser()?.name }}</h2>
            <span class="badge" [class]="'badge-' + getRoleBadge(permissionsUser()!.role)">{{ permissionsUser()!.role }}</span>
            <button class="modal-close-btn" (click)="closePermissionsModal()">×</button>
          </div>
          <div class="modal-body">
            <p class="perm-modal-hint">Toggle permissions on or off. Changes are saved immediately.</p>
            @for (group of permissionGroups; track group.id) {
              <div class="perm-modal-group">
                <div class="perm-modal-group-header">
                  <h4>{{ group.label }}</h4>
                  <button class="link-btn-sm" (click)="togglePermGroup(group, true)">All</button>
                  <button class="link-btn-sm" (click)="togglePermGroup(group, false)">None</button>
                </div>
                <div class="perm-modal-items">
                  @for (perm of group.permissions; track perm) {
                    <label class="perm-toggle">
                      <input type="checkbox" [checked]="editingPermissions().includes(perm)" (change)="togglePerm(perm)">
                      <span class="perm-toggle-label">{{ getPermissionLabel(perm) }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="resetToRoleDefaults()">Reset to Role Defaults</button>
            <button class="btn-primary" (click)="savePermissions()">Save Permissions</button>
          </div>
        </div>
      </div>
    }

  `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .admin-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .admin-tabs {
      display: flex;
      gap: 4px;
      background: var(--color-white);
      padding: 4px;
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      width: fit-content;
    }

    .admin-tabs .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      background: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--color-gray-600);
      transition: all 0.15s ease;
    }

    .admin-tabs .tab-btn:hover {
      background: var(--color-gray-50);
    }

    .admin-tabs .tab-btn.active {
      background: var(--color-primary);
      color: white;
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .content-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .section-header p {
      margin: 4px 0 0;
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .user-email {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      text-transform: capitalize;
    }

    .status-indicator::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-indicator.active::before { background: var(--color-success); }
    .status-indicator.inactive::before { background: var(--color-gray-400); }
    .status-indicator.pending::before { background: var(--color-warning); }

    .last-login {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .action-btns {
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-500);
      transition: all 0.15s ease;
    }

    .icon-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .icon-btn.danger:hover {
      background: var(--status-red-bg);
      color: var(--color-error);
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .role-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.25rem;
    }

    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .role-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .role-desc {
      margin: 0 0 1rem;
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .permissions-list h5 {
      margin: 0 0 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .permission-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .permissions-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-hairline);
      margin-top: 0.75rem;
    }

    .perm-count {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .permissions-summary svg {
      transition: transform 0.2s ease;
      color: var(--color-gray-400);
    }

    .permissions-summary svg.rotated {
      transform: rotate(180deg);
    }

    .role-card {
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .role-card:hover {
      box-shadow: var(--shadow-lg);
    }

    .role-card.expanded {
      grid-column: span 2;
    }

    .permissions-detail {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-hairline);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .perm-group h5 {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .perm-group-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .perm-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--color-gray-400);
      padding: 4px 8px;
      border-radius: var(--radius);
      background: var(--color-gray-50);
    }

    .perm-item.granted {
      color: var(--color-gray-700);
      background: var(--status-green-bg);
    }

    .perm-item.granted svg {
      color: var(--color-success);
    }

    .perm-item svg {
      flex-shrink: 0;
    }

    /* User Permissions Section */
    .user-permissions-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-hairline);
    }

    .section-subheader {
      margin-bottom: 1rem;
    }

    .section-subheader h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .section-subheader p {
      margin: 4px 0 0;
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .user-perm-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .user-perm-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: var(--color-white);
      border-radius: var(--radius-md);
      box-shadow: var(--card-shadow);
    }

    .user-perm-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 180px;
    }

    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .user-perm-name {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .user-perm-role {
      display: block;
      font-size: 0.75rem;
      color: var(--color-gray-500);
      text-transform: capitalize;
    }

    .user-perm-badges {
      flex: 1;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .perm-badge {
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 500;
      background: var(--color-gray-100);
      color: var(--color-gray-600);
      border-radius: var(--radius-sm);
    }

    /* Permissions Modal */
    .perm-modal-hint {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-bottom: 16px;
    }
    .perm-modal-group {
      margin-bottom: 16px;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
    }
    .perm-modal-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .perm-modal-group-header h4 {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-700);
      flex: 1;
    }
    .link-btn-sm {
      background: none;
      border: none;
      font-size: 0.6875rem;
      color: var(--color-primary);
      cursor: pointer;
      padding: 2px 6px;
      text-decoration: underline;
    }
    .link-btn-sm:hover { color: #1E3A8A; }
    .perm-modal-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .perm-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius);
      transition: background 0.15s;
    }
    .perm-toggle:hover { background: white; }
    .perm-toggle input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }
    .perm-toggle-label {
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }

    /* AI Settings */
    .api-key-input {
      display: flex;
      gap: 8px;
    }

    .api-key-input .form-input {
      flex: 1;
      font-family: monospace;
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .api-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--color-gray-100);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin: 1rem 0;
    }

    .api-status .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-gray-400);
    }

    .api-status.connected {
      background: var(--status-green-bg);
      color: var(--color-success);
    }

    .api-status.connected .status-dot {
      background: var(--color-success);
    }

    .settings-card.full-width {
      grid-column: 1 / -1;
    }

    .usage-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .usage-stat {
      text-align: center;
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius);
    }

    .usage-label {
      display: block;
      font-size: 0.75rem;
      color: var(--color-gray-500);
      margin-bottom: 4px;
    }

    .usage-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }

    .usage-bar-container {
      height: 8px;
      background: var(--color-gray-100);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-bottom: 8px;
    }

    .usage-bar {
      height: 100%;
      background: var(--color-primary);
      border-radius: var(--radius-sm);
      transition: width 0.3s ease;
    }

    .usage-hint {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }

    .permission-item svg {
      color: var(--color-success);
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }

    .settings-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.25rem;
    }

    .settings-card h4 {
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .settings-card .form-group {
      margin-bottom: 1rem;
    }

    .department-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 1rem;
    }

    .department-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      font-size: 0.875rem;
    }

    .icon-btn-sm {
      padding: 4px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--color-gray-400);
    }

    .icon-btn-sm:hover {
      color: var(--color-gray-600);
    }

    .dept-actions { display: flex; gap: 4px; }
    .dept-edit-input { flex: 1; }
    .dept-add-input { width: 100%; margin-bottom: 8px; }
    .icon-btn-sm.danger:hover { color: #B91C1C; }

    .add-dept-btn {
      width: 100%;
    }

    .card-disabled {
      position: relative;
      opacity: 0.5;
      pointer-events: none;
    }
    .coming-soon-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 2px 10px;
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--color-gray-200);
      color: var(--color-gray-600);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .integration-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .integration-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius);
    }

    .integration-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .integration-name {
      font-weight: 500;
      font-size: 0.9375rem;
    }

    .integration-status {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .integration-status.connected {
      color: var(--color-success);
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-hairline);
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting-name {
      font-weight: 500;
      font-size: 0.9375rem;
    }

    .setting-desc {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--color-gray-300);
      border-radius: 24px;
      transition: 0.3s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--color-primary);
    }

    .toggle input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    .form-select-sm {
      padding: 6px 10px;
      font-size: 0.8125rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: white;
    }

    .audit-desc {
      margin: 0 0 1rem;
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 1rem;
    }

    .audit-item {
      display: flex;
      gap: 12px;
      padding: 8px 0;
      font-size: 0.8125rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .audit-time {
      color: var(--color-gray-400);
      min-width: 60px;
    }

    .audit-event {
      color: var(--color-gray-700);
      flex: 1;
    }

    .audit-detail {
      color: var(--color-gray-400);
      font-size: 0.75rem;
    }

    .disabled-row { opacity: 0.5; }
    .coming-soon-inline {
      display: inline-block;
      padding: 1px 6px;
      margin-left: 6px;
      border-radius: var(--radius-full);
      font-size: 0.6rem;
      font-weight: 600;
      background: var(--color-gray-200);
      color: var(--color-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      vertical-align: middle;
    }

    /* Templates */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
    }

    .template-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      padding: 1.25rem;
      position: relative;
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .template-info h4 {
      margin: 0 0 6px;
      font-size: 1rem;
      font-weight: 600;
    }

    .template-actions {
      display: flex;
      gap: 4px;
    }

    .template-tasks {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tasks-count {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .tasks-preview {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .task-preview-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }

    .task-preview-item svg {
      color: var(--color-gray-400);
      flex-shrink: 0;
    }

    .task-preview-item span:first-of-type {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-offset {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      background: var(--color-gray-100);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    .tasks-more {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      font-style: italic;
    }

    .template-badge-built-in {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-400);
      background: var(--color-gray-100);
      padding: 3px 8px;
      border-radius: var(--radius-sm);
    }

    /* Template Modal */
    .modal-lg {
      max-width: 700px;
    }

    .flex-2 {
      flex: 2;
    }

    .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .tasks-header .form-label {
      margin: 0;
    }

    .template-tasks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;
      padding: 4px;
    }

    .template-task-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius);
    }

    .task-number {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .task-input {
      flex: 1;
    }

    .days-input-group {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .days-input {
      width: 60px;
      text-align: center;
    }

    .days-label {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .task-row-actions {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }

    .icon-btn-sm {
      padding: 4px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--color-gray-400);
      border-radius: var(--radius);
      transition: all 0.15s ease;
    }

    .icon-btn-sm:hover:not(:disabled) {
      background: var(--color-gray-200);
      color: var(--color-gray-600);
    }

    .icon-btn-sm:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .icon-btn-sm.danger:hover:not(:disabled) {
      background: var(--status-red-bg);
      color: var(--color-error);
    }

    .empty-tasks {
      padding: 2rem;
      text-align: center;
      color: var(--color-gray-500);
      background: var(--color-gray-50);
      border-radius: var(--radius);
      border: 2px dashed var(--color-gray-200);
    }

    .empty-tasks p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* ========== MOBILE (≤768px) ========== */
    @media (max-width: 768px) {

      /* Content area */
      .admin-content {
        padding: 0.75rem;
        gap: 0.75rem;
        overflow-y: auto;
      }

      /* Tabs: horizontally scrollable, no line wrap */
      .admin-tabs {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        flex-wrap: nowrap;
        padding: 4px 6px;
      }

      .admin-tabs::-webkit-scrollbar {
        display: none;
      }

      .admin-tabs .tab-btn {
        flex-shrink: 0;
        min-height: 44px;
        padding: 10px 14px;
        font-size: 0.875rem;
        white-space: nowrap;
      }

      /* Tab content: scrollable */
      .tab-content {
        overflow-y: auto;
      }

      /* Section header: stack on mobile */
      .section-header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }

      .section-header .btn-primary,
      .section-header .btn-secondary {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      /* Users table: hide on mobile, let cards handle it */
      .table-card .data-table {
        display: none;
      }

      /* User permission rows: stack */
      .user-perm-row {
        flex-wrap: wrap;
        gap: 8px;
      }

      .user-perm-info {
        min-width: unset;
        width: 100%;
      }

      .user-perm-badges {
        padding-left: 0;
      }

      /* Roles grid: single column */
      .roles-grid {
        grid-template-columns: 1fr;
      }

      .role-card.expanded {
        grid-column: 1;
      }

      /* Permissions detail: single column */
      .permissions-detail {
        grid-template-columns: 1fr;
      }

      /* Settings grid: single column */
      .settings-grid {
        grid-template-columns: 1fr;
      }

      .settings-card.full-width {
        grid-column: 1;
      }

      /* Usage stats: single column */
      .usage-stats {
        grid-template-columns: 1fr;
      }

      /* Templates grid: single column */
      .templates-grid {
        grid-template-columns: 1fr;
      }

      /* All form inputs: 16px font (prevents iOS auto-zoom) + min-height 48px */
      .form-input,
      .form-select,
      .form-select-sm,
      select,
      textarea,
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input[type="number"],
      input[type="date"] {
        font-size: 16px !important;
        min-height: 48px;
      }

      /* Form rows: stack vertically */
      .form-row {
        flex-direction: column;
        gap: 0;
      }

      /* API key input: stack */
      .api-key-input {
        flex-direction: column;
        gap: 8px;
      }

      .api-key-input .btn-secondary {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      /* Setting rows (toggle rows): more touch-friendly */
      .setting-row {
        padding: 14px 0;
        min-height: 56px;
      }

      /* Action buttons: min-height 44px */
      .btn-primary,
      .btn-secondary {
        min-height: 44px;
      }

      .btn-sm {
        min-height: 40px;
        padding: 8px 12px;
      }

      /* Icon buttons: larger touch target */
      .icon-btn {
        min-width: 40px;
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Modal: full screen */
      .modal-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0;
        border-radius: 0;
        min-height: 100dvh;
      }

      .modal-lg {
        max-width: 100% !important;
      }

      .modal-footer {
        flex-direction: column;
        gap: 8px;
      }

      .modal-footer .btn-primary,
      .modal-footer .btn-secondary {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      /* Template task rows: wrap on narrow screens */
      .template-task-row {
        flex-wrap: wrap;
        gap: 8px;
      }

      .days-input-group {
        width: 100%;
      }

      .days-input {
        flex: 1;
      }
    }

    /* ─── System Diagnostics ──────────────────────────────────────────────── */
    .diag-summary { display: grid; grid-template-columns: 220px 1fr; gap: 14px; padding: 16px 20px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; background: var(--bg-elevated, #fff); margin-bottom: 16px; }
    .diag-score { padding: 14px; border: 2px solid #E5E7EB; border-radius: 10px; text-align: center; }
    .diag-score-num { font-size: 36px; font-weight: 800; line-height: 1; }
    .diag-score-grade { font-size: 12px; font-weight: 700; margin-top: 4px; }
    .diag-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; align-content: center; }
    .diag-stat { display: flex; flex-direction: column; padding: 10px 12px; border-radius: 8px; background: var(--bg-soft, #F9FAFB); }
    .diag-stat .k { font-size: 10px; font-weight: 700; color: var(--text-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.05em; }
    .diag-stat .v { font-size: 18px; font-weight: 800; margin-top: 2px; color: var(--text, #111827); }

    .diag-layout { display: grid; grid-template-columns: 260px 1fr; gap: 14px; }
    @media (max-width: 980px) { .diag-layout { grid-template-columns: 1fr; } }
    .diag-side { display: flex; flex-direction: column; gap: 6px; }
    .diag-side-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); padding: 0 4px 4px; }
    .diag-mod-btn { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 2px solid var(--border-hairline, #E5E7EB); background: var(--bg-elevated, #fff); cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: left; }
    .diag-mod-btn:hover { border-color: var(--c, #1A56DB); }
    .diag-mod-btn.active { background: color-mix(in srgb, var(--c) 8%, transparent); border-color: var(--c); }
    .diag-mod-icon { font-size: 18px; flex-shrink: 0; }
    .diag-mod-name { font-size: 12px; font-weight: 700; color: var(--text, #111827); }
    .diag-mod-btn.active .diag-mod-name { color: var(--c); }
    .diag-mod-desc { font-size: 10px; color: var(--text-muted, #6B7280); line-height: 1.4; margin-top: 2px; }
    .diag-mod-stats { display: flex; gap: 6px; margin-top: 4px; font-size: 10px; font-weight: 700; }

    .diag-main { display: flex; flex-direction: column; gap: 12px; }
    .diag-suite { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; overflow: hidden; }
    .diag-suite-head { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); }
    .diag-suite-title { font-size: 13px; font-weight: 700; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .diag-cat { font-size: 9px; padding: 1px 7px; border-radius: 4px; background: #F3F4F6; color: #6B7280; font-weight: 600; }
    .diag-weight { font-size: 9px; padding: 1px 7px; border-radius: 4px; background: #EEF2FF; color: #1A56DB; font-weight: 600; }
    .diag-suite-meta { font-size: 11px; color: var(--text-muted, #6B7280); margin-top: 2px; }

    .diag-checks { padding: 4px 0; }
    .diag-check { display: flex; align-items: center; gap: 10px; padding: 7px 16px 7px 36px; font-size: 12px; border-bottom: 1px solid #F3F4F6; }
    .diag-check:last-child { border-bottom: none; }
    .diag-check.fail { background: #FFF5F5; }
    .diag-check.warn { background: #FFFBEB; }
    .diag-check-dot { width: 18px; height: 18px; border-radius: 4px; display: grid; place-items: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .diag-check-name { font-weight: 600; flex-shrink: 0; }
    .diag-check-msg { font-size: 11px; color: var(--text-muted, #6B7280); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .diag-check-pill { padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: capitalize; flex-shrink: 0; }

    .diag-finding { margin: 0 16px 16px; padding: 14px 16px; border-radius: 10px; border: 1.5px solid; }
    .diag-finding-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
    .diag-sev-pill { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .diag-risk-pill { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; background: #F3F4F6; color: #6B7280; }
    .diag-effort-pill { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; background: #F3F4F6; }
    .diag-finding-body { font-size: 12px; line-height: 1.55; margin-bottom: 6px; }
    .diag-finding-rec { font-size: 11px; color: var(--text-muted, #6B7280); line-height: 1.55; }
    .diag-refs { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    .diag-ref { padding: 1px 7px; border-radius: 4px; font-size: 9px; font-weight: 600; background: #EEF2FF; color: #1A56DB; }

    .diag-finding-expanded { border-top: 1px dashed currentColor; padding-top: 12px; margin-top: 12px; }
    .diag-section { margin-bottom: 14px; }
    .diag-section-head { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text, #111827); margin-bottom: 6px; }
    .diag-section-body { font-size: 11px; line-height: 1.6; padding-left: 4px; }

    .diag-fc { margin-bottom: 8px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-elevated, #fff); }
    .diag-fc-name { font-size: 11px; font-weight: 700; color: #BE123C; margin-bottom: 3px; }
    .diag-fc-why { font-size: 11px; line-height: 1.5; margin-bottom: 4px; }
    .diag-fc-fix { font-size: 11px; line-height: 1.5; padding: 5px 8px; border-radius: 4px; background: #D1FAE5; }

    .diag-rem { display: flex; flex-direction: column; gap: 8px; }
    .diag-rem-step { display: flex; gap: 8px; align-items: flex-start; }
    .diag-rem-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .diag-rem-label { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; }
    .diag-rem-text { font-size: 11px; line-height: 1.5; margin-top: 1px; }

    .diag-history { margin-top: 18px; padding: 16px 20px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; background: var(--bg-elevated, #fff); }
    .diag-history-head { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    .diag-history .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .diag-history .data-table th { text-align: left; padding: 6px 10px; font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); border-bottom: 1px solid var(--border-hairline, #E5E7EB); }
    .diag-history .data-table td { padding: 6px 10px; border-bottom: 1px solid #F3F4F6; }
    .diag-history code { background: var(--bg-soft, #F9FAFB); padding: 1px 6px; border-radius: 4px; font-size: 11px; }

    .btn-xs { padding: 3px 8px; font-size: 10px; }

    /* ─── Operations Sidebar Editor ───────────────────────────────────────── */
    .sb-tree { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; background: var(--bg-soft, #F9FAFB); min-height: 200px; }
    .sb-row { display: flex; gap: 8px; align-items: center; padding: 10px 12px; background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; transition: box-shadow 0.15s, opacity 0.15s; }
    .sb-row.sb-top { border-left: 4px solid var(--c, #6B7280); }
    .sb-row.sb-child { margin-left: 28px; padding: 8px 12px; }
    .sb-row.sb-locked { opacity: 0.7; background: var(--bg-soft, #F9FAFB); }
    .sb-row.sb-hidden { opacity: 0.5; background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px); }
    .sb-handle { cursor: grab; color: var(--text-muted, #6B7280); font-weight: 700; font-size: 14px; user-select: none; flex-shrink: 0; }
    .sb-handle:active { cursor: grabbing; }
    .sb-row.sb-locked .sb-handle { cursor: not-allowed; opacity: 0.4; }

    .sb-kind-pill { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: var(--bg-soft, #F3F4F6); color: var(--text-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
    .sb-row.sb-top .sb-kind-pill { background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c); }

    .sb-label { flex: 1; min-width: 0; padding: 5px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; font-size: 13px; font-weight: 600; font-family: inherit; background: var(--bg-elevated, #fff); }
    .sb-label:disabled { background: var(--bg-soft, #F9FAFB); cursor: not-allowed; }
    .sb-color { width: 36px; height: 28px; padding: 0; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; cursor: pointer; background: transparent; flex-shrink: 0; }
    .sb-icon { padding: 4px 6px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 6px; font-size: 11px; font-family: inherit; background: var(--bg-elevated, #fff); max-width: 110px; flex-shrink: 0; }
    .sb-route { font-family: monospace; font-size: 10px; color: var(--text-muted, #6B7280); background: var(--bg-soft, #F9FAFB); padding: 2px 6px; border-radius: 4px; flex-shrink: 0; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sb-eye { width: 28px; height: 28px; padding: 0; border-radius: 6px; border: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-elevated, #fff); cursor: pointer; font-size: 13px; display: grid; place-items: center; flex-shrink: 0; }
    .sb-eye.off { background: var(--bg-soft, #F3F4F6); color: var(--text-muted, #9CA3AF); }
    .sb-eye:disabled { opacity: 0.4; cursor: not-allowed; }
    .sb-del { width: 28px; height: 28px; padding: 0; border-radius: 6px; border: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-elevated, #fff); cursor: pointer; font-size: 18px; line-height: 1; color: var(--text-muted, #6B7280); display: grid; place-items: center; flex-shrink: 0; }
    .sb-del:hover:not(:disabled) { background: #FFE4E6; color: #BE123C; border-color: #FECACA; }
    .sb-del:disabled { opacity: 0.4; cursor: not-allowed; }

    .sb-children { display: flex; flex-direction: column; gap: 4px; padding-top: 4px; min-height: 36px; }
    .sb-empty { font-size: 11px; color: var(--text-muted, #9CA3AF); font-style: italic; padding: 8px 12px 8px 36px; border: 1px dashed var(--border-hairline, #E5E7EB); border-radius: 6px; margin-left: 28px; background: var(--bg-soft, #F9FAFB); }

    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; }
    .cdk-drag-placeholder { opacity: 0.3; background: #DBEAFE !important; border-color: #1A56DB !important; }
    .cdk-drop-list-dragging .sb-row:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }

    .sb-footer { margin-top: 14px; padding: 12px 16px; border-radius: 8px; background: var(--bg-soft, #F9FAFB); border: 1px solid var(--border-hairline, #E5E7EB); font-size: 12px; color: var(--text-muted, #6B7280); }
    .sb-footer ul { margin: 6px 0 0; padding-left: 20px; line-height: 1.7; }
    .sb-footer code { background: var(--bg-elevated, #fff); padding: 1px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border-hairline, #E5E7EB); }
  `]
})
export class AdminSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);
  activeTab = signal<'users' | 'roles' | 'company' | 'security' | 'ai' | 'ticketing' | 'diagnostics' | 'sidebar'>('users');
  showAddUserModal = signal(false);
  editingUser: User | null = null;
  showApiKey = false;

  // Audit log — recent activities from DB
  auditLog = computed(() => {
    return this.dataService.activities()
      .slice(0, 20);  // Show last 20 activities
  });

  formatAuditTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  departments = ['Executive', 'Engineering', 'Sales', 'Customer Success', 'Operations', 'Marketing'];
  editingDeptIndex = -1;
  addingDept = false;

  saveDept(index: number, newValue: string) {
    const trimmed = newValue.trim();
    if (trimmed && trimmed !== this.departments[index]) {
      this.departments[index] = trimmed;
    }
    this.editingDeptIndex = -1;
  }

  removeDept(index: number) {
    if (confirm(`Remove department "${this.departments[index]}"?`)) {
      this.departments.splice(index, 1);
    }
  }

  confirmAddDept(value: string) {
    const trimmed = value.trim();
    if (trimmed && !this.departments.includes(trimmed)) {
      this.departments.push(trimmed);
    }
    this.addingDept = false;
  }

  users = signal<User[]>([]);

  ngOnInit() {
    this.loadUsers();
    this.dataService.refreshCustomers();
  }

  // ─── Ticketing Preferences ──────────────────────────────────────────────────
  ticketingSettings = signal<TicketingSettings | null>(null);
  ticketingFormState: {
    supportEmail: string;
    autoReplyEnabled: boolean;
    autoReplyTemplate: string;
    statusChangeTemplate: string;
    escalationTemplate: string;
    completionTemplate: string;
    escalationRules: EscalationRule[];
  } = {
    supportEmail: '',
    autoReplyEnabled: true,
    autoReplyTemplate: '',
    statusChangeTemplate: '',
    escalationTemplate: '',
    completionTemplate: '',
    escalationRules: [],
  };
  ticketingSavedAt = signal('');
  portalKeys = signal<Record<number, string | null>>({});
  readonly portalEndpoint = `${environment.apiUrl}/portal/tickets`;

  async loadTicketingSettings() {
    if (this.ticketingSettings()) return;
    try {
      const s = await this.dataService.getTicketingSettings();
      this.ticketingSettings.set(s);
      this.ticketingFormState = {
        supportEmail: s.supportEmail,
        autoReplyEnabled: s.autoReplyEnabled,
        autoReplyTemplate: s.autoReplyTemplate,
        statusChangeTemplate: s.statusChangeTemplate,
        escalationTemplate: s.escalationTemplate,
        completionTemplate: s.completionTemplate,
        escalationRules: Array.isArray(s.escalationRules) ? [...s.escalationRules] : [],
      };
      // Hydrate existing portal keys from customers
      const keyMap: Record<number, string | null> = {};
      for (const c of this.dataService.customers()) {
        if ((c as any).portalApiKey) keyMap[c.id] = (c as any).portalApiKey;
      }
      this.portalKeys.set(keyMap);
    } catch (e) {
      console.error('Failed to load ticketing settings', e);
    }
  }

  private saveTimer: any = null;
  saveTicketing() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      try {
        const updated = await this.dataService.updateTicketingSettings({
          supportEmail: this.ticketingFormState.supportEmail,
          autoReplyEnabled: this.ticketingFormState.autoReplyEnabled,
          autoReplyTemplate: this.ticketingFormState.autoReplyTemplate,
          statusChangeTemplate: this.ticketingFormState.statusChangeTemplate,
          escalationTemplate: this.ticketingFormState.escalationTemplate,
          completionTemplate: this.ticketingFormState.completionTemplate,
          escalationRules: this.ticketingFormState.escalationRules,
        });
        this.ticketingSettings.set(updated);
        this.ticketingSavedAt.set(new Date().toLocaleTimeString());
      } catch (e) {
        console.error('Failed to save ticketing settings', e);
      }
    }, 400);
  }

  addRule() {
    this.ticketingFormState.escalationRules = [
      ...this.ticketingFormState.escalationRules,
      { id: `esc-${Date.now()}`, level: 2, hoursOpen: 12, recipient: '', subject: '⚠️ Ticket {{TICKET_ID}} open >{{HOURS}}hrs', enabled: true },
    ];
    this.saveTicketing();
  }

  removeRule(index: number) {
    this.ticketingFormState.escalationRules = this.ticketingFormState.escalationRules.filter((_, i) => i !== index);
    this.saveTicketing();
  }

  async generatePortalKey(customerId: number) {
    try {
      const result = await this.dataService.rotateCustomerPortalKey(customerId);
      this.portalKeys.update(map => ({ ...map, [customerId]: result.portalApiKey }));
    } catch (e) {
      console.error('Failed to generate portal key', e);
    }
  }

  async revokePortalKey(customerId: number) {
    if (!confirm('Revoke this portal API key? The customer subscription portal will stop being able to submit tickets until a new key is issued.')) return;
    try {
      const result = await this.dataService.revokeCustomerPortalKey(customerId);
      this.portalKeys.update(map => ({ ...map, [customerId]: result.portalApiKey }));
    } catch (e) {
      console.error('Failed to revoke portal key', e);
    }
  }

  copyKey(customerId: number) {
    const key = this.portalKeys()[customerId];
    if (!key) return;
    navigator.clipboard?.writeText(key);
    this.ticketingSavedAt.set('Key copied to clipboard');
    setTimeout(() => this.ticketingSavedAt.set(''), 2000);
  }

  // ─── System Diagnostics ────────────────────────────────────────────────────
  diagCatalog = signal<DiagCatalog | null>(null);
  diagSelectedModule = signal<string>('db');
  diagLatest = signal<DiagRun | null>(null);
  diagHistory = signal<DiagRunSummary[]>([]);
  diagRunning = signal(false);
  diagRunningSuite = signal<string | null>(null);
  diagIncludeAi = true;
  expandedFinding = signal<string | null>(null);

  async loadDiagnostics() {
    if (!this.diagCatalog()) {
      try {
        const cat = await this.dataService.getDiagCatalog();
        this.diagCatalog.set(cat);
      } catch (err) {
        console.error('Failed to load diagnostics catalog', err);
      }
    }
    try {
      this.diagHistory.set(await this.dataService.listDiagRuns(20));
    } catch (err) {
      console.error('Failed to load run history', err);
    }
  }

  async runDiagPlatform() {
    if (this.diagRunning()) return;
    this.diagRunning.set(true);
    this.diagRunningSuite.set(null);
    try {
      const run = await this.dataService.runDiagnostics('platform', this.diagIncludeAi);
      this.diagLatest.set(run);
      this.diagHistory.set(await this.dataService.listDiagRuns(20));
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Run failed.');
    } finally {
      this.diagRunning.set(false);
    }
  }

  async runDiagModule() {
    const moduleId = this.diagSelectedModule();
    if (this.diagRunning() || !moduleId) return;
    this.diagRunning.set(true);
    this.diagRunningSuite.set(null);
    try {
      const run = await this.dataService.runDiagnostics(`module:${moduleId}`, this.diagIncludeAi);
      this.diagLatest.set(run);
      this.diagHistory.set(await this.dataService.listDiagRuns(20));
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Run failed.');
    } finally {
      this.diagRunning.set(false);
    }
  }

  async runDiagSuite(suiteId: string) {
    if (this.diagRunning()) return;
    this.diagRunning.set(true);
    this.diagRunningSuite.set(suiteId);
    try {
      const run = await this.dataService.runDiagnostics(`suite:${suiteId}`, this.diagIncludeAi);
      // Merge with existing latest if scope was suite-only
      const existing = this.diagLatest();
      if (existing) {
        const merged = {
          ...existing,
          results: { ...existing.results, ...run.results },
          messages: { ...existing.messages, ...run.messages },
          findings: { ...existing.findings, ...run.findings },
        };
        this.diagLatest.set(merged);
      } else {
        this.diagLatest.set(run);
      }
      this.diagHistory.set(await this.dataService.listDiagRuns(20));
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Run failed.');
    } finally {
      this.diagRunning.set(false);
      this.diagRunningSuite.set(null);
    }
  }

  async loadDiagRun(id: number) {
    try {
      const run = await this.dataService.getDiagRun(id);
      this.diagLatest.set(run);
    } catch (err: any) {
      alert(err?.error?.error || 'Failed to load run.');
    }
  }

  toggleFinding(suiteId: string) {
    this.expandedFinding.set(this.expandedFinding() === suiteId ? null : suiteId);
  }

  // ─── Diagnostics helpers ───────────────────────────────────────────────────
  suitesForSelectedModule() {
    const cat = this.diagCatalog();
    if (!cat) return [];
    return cat.suites.filter(s => s.moduleId === this.diagSelectedModule());
  }

  diagModuleStats(moduleId: string): { pass: number; warn: number; fail: number } | null {
    const run = this.diagLatest();
    const cat = this.diagCatalog();
    if (!run || !cat) return null;
    const suites = cat.suites.filter(s => s.moduleId === moduleId);
    let pass = 0, warn = 0, fail = 0;
    for (const s of suites) {
      for (let i = 0; i < s.checks.length; i++) {
        const k = `${s.id}-${i}`;
        const r = run.results[k];
        if (r === 'pass') pass++;
        else if (r === 'warn') warn++;
        else if (r === 'fail') fail++;
      }
    }
    return pass + warn + fail === 0 ? null : { pass, warn, fail };
  }

  diagStatus(suiteId: string, idx: number): DiagCheckStatus | null {
    return this.diagLatest()?.results[`${suiteId}-${idx}`] ?? null;
  }

  diagMessage(suiteId: string, idx: number): string | null {
    return this.diagLatest()?.messages[`${suiteId}-${idx}`] ?? null;
  }

  diagFinding(suiteId: string): DiagAIFinding | null {
    return this.diagLatest()?.findings[suiteId] ?? null;
  }

  diagDotColor(status: DiagCheckStatus | null): string {
    if (!status) return '#F3F4F6';
    return DIAG_STATUS_META[status].color;
  }

  diagDotIcon(status: DiagCheckStatus | null): string {
    if (status === 'pass') return '✓';
    if (status === 'warn') return '!';
    if (status === 'fail') return '✗';
    return '';
  }

  diagStatusBg(status: DiagCheckStatus | null): string {
    return status ? DIAG_STATUS_META[status].bg : '#F3F4F6';
  }
  diagStatusColor(status: DiagCheckStatus | null): string {
    return status ? DIAG_STATUS_META[status].color : '#6B7280';
  }

  diagSeverityColor(sev: string): string {
    if (sev === 'critical') return '#E11D48';
    if (sev === 'major') return '#F59E0B';
    if (sev === 'minor') return '#1A56DB';
    return '#0D9488';
  }
  diagSeverityBg(sev: string): string {
    if (sev === 'critical') return '#FFF1F2';
    if (sev === 'major') return '#FFFBEB';
    if (sev === 'minor') return '#F0F9FF';
    return '#F0FDFA';
  }
  diagSeverityPillBg(sev: string): string {
    if (sev === 'critical') return '#FFE4E6';
    if (sev === 'major') return '#FEF3C7';
    if (sev === 'minor') return '#E0F2FE';
    return '#CCFBF1';
  }
  diagEffortColor(e: string): string {
    if (e === 'high') return '#E11D48';
    if (e === 'medium') return '#F59E0B';
    return '#10B981';
  }

  isCritMaj(sev: string): boolean { return sev === 'critical' || sev === 'major'; }

  diagGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
  diagGradeLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Acceptable';
    if (score >= 50) return 'Needs Improvement';
    return 'Critical';
  }
  diagGradeColor(score: number): string {
    if (score >= 80) return '#10B981';
    if (score >= 70) return '#F59E0B';
    if (score >= 50) return '#F97316';
    return '#E11D48';
  }

  scopeLabel(scope: string): string {
    if (scope === 'platform') return 'Full Platform';
    if (scope.startsWith('module:')) return `Module: ${scope.slice(7)}`;
    if (scope.startsWith('suite:')) return `Suite: ${scope.slice(6)}`;
    return scope;
  }

  formatDiagDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ─── Operations Sidebar Editor ─────────────────────────────────────────────
  sidebarDraft = signal<SidebarItem[]>([]);
  sidebarDirty = signal(false);
  sidebarSaving = signal(false);
  readonly iconNames = Object.keys(ICON_REGISTRY).sort();

  connectedSectionIds = computed<string[]>(() =>
    this.sidebarDraft().filter(it => it.kind === 'section').map(it => 'sb-children-' + it.id)
  );

  otherSectionIds(currentId: string): string[] {
    return [
      'sb-top-level',
      ...this.sidebarDraft()
        .filter(it => it.kind === 'section' && it.id !== currentId)
        .map(it => 'sb-children-' + it.id),
    ];
  }

  async loadSidebarLayout() {
    try {
      const layout = await this.dataService.refreshSidebarLayout();
      // Deep clone so edits don't mutate the live signal until save
      this.sidebarDraft.set(JSON.parse(JSON.stringify(layout)));
      this.sidebarDirty.set(false);
    } catch (err) {
      console.error('Failed to load sidebar layout', err);
    }
  }

  markDirty() {
    this.sidebarDirty.set(true);
  }

  toggleVisible(item: SidebarItem) {
    if (item.locked) return;
    item.visible = item.visible === false ? true : false;
    this.markDirty();
  }
  toggleChildVisible(child: SidebarChild) {
    if (child.locked) return;
    child.visible = child.visible === false ? true : false;
    this.markDirty();
  }

  deleteItem(index: number) {
    const draft = [...this.sidebarDraft()];
    if (draft[index].locked) return;
    if (!confirm(`Remove "${draft[index].label}" from the sidebar? Any children will be lost.`)) return;
    draft.splice(index, 1);
    this.sidebarDraft.set(draft);
    this.markDirty();
  }
  deleteChild(parent: SidebarItem, index: number) {
    const child = parent.children?.[index];
    if (!child || child.locked) return;
    if (!confirm(`Remove "${child.label}" from "${parent.label}"?`)) return;
    parent.children!.splice(index, 1);
    this.sidebarDraft.set([...this.sidebarDraft()]);
    this.markDirty();
  }

  // Drop within or into the top-level list.
  // - Reorder if same list
  // - Demote a top-level standalone INTO a section's children list (handled in onChildDrop)
  // - Promote a child INTO top-level (we receive the drop here)
  onTopLevelDrop(event: CdkDragDrop<any>) {
    const draft = [...this.sidebarDraft()];
    if (event.previousContainer === event.container) {
      moveItemInArray(draft, event.previousIndex, event.currentIndex);
      this.sidebarDraft.set(draft);
      this.markDirty();
      return;
    }
    // Cross-list: a child is being promoted to top-level
    const child = event.item.data as SidebarChild;
    if (child.locked) return;
    // Remove from previous container
    (event.previousContainer.data as SidebarChild[]).splice(event.previousIndex, 1);
    // Convert child → standalone
    const promoted: SidebarItem = {
      id: child.id,
      kind: 'standalone',
      label: child.label,
      color: '#6B7280',
      icon: child.icon,
      route: child.route,
      visible: child.visible !== false,
    };
    draft.splice(event.currentIndex, 0, promoted);
    this.sidebarDraft.set(draft);
    this.markDirty();
  }

  // Drop within or into a section's children list.
  // - Reorder within same children
  // - Move child between sections
  // - Demote a top-level standalone into a section's children
  onChildDrop(event: CdkDragDrop<any>, parent: SidebarItem) {
    parent.children = parent.children ?? [];
    if (event.previousContainer === event.container) {
      moveItemInArray(parent.children, event.previousIndex, event.currentIndex);
      this.sidebarDraft.set([...this.sidebarDraft()]);
      this.markDirty();
      return;
    }
    // Cross-list. Source is either the top-level list (data is SidebarItem[]) or another section's children (data is SidebarChild[]).
    const sourceData = event.previousContainer.data;
    const dragged = event.item.data as SidebarItem | SidebarChild;
    if ((dragged as any).locked) return;

    if (event.previousContainer.id === 'sb-top-level') {
      // Top-level standalone → child of this section
      const item = dragged as SidebarItem;
      if (item.kind !== 'standalone' || !item.route) {
        // Sections can't be demoted into children — they have children of their own.
        return;
      }
      // Remove from top-level
      (sourceData as SidebarItem[]).splice(event.previousIndex, 1);
      const demoted: SidebarChild = {
        id: item.id,
        label: item.label,
        route: item.route,
        icon: item.icon ?? 'dashboard',
        visible: item.visible !== false,
      };
      parent.children.splice(event.currentIndex, 0, demoted);
    } else {
      // Section A child → Section B child
      transferArrayItem(
        sourceData as SidebarChild[],
        parent.children,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.sidebarDraft.set([...this.sidebarDraft()]);
    this.markDirty();
  }

  async saveSidebarLayout() {
    if (this.sidebarSaving()) return;
    this.sidebarSaving.set(true);
    try {
      // Strip empty section.children and ensure required fields are present
      const cleaned: SidebarItem[] = this.sidebarDraft().map(item => {
        if (item.kind === 'section') {
          return { ...item, children: item.children ?? [] };
        }
        return item;
      });
      await this.dataService.saveSidebarLayout(cleaned);
      this.sidebarDirty.set(false);
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Save failed.');
    } finally {
      this.sidebarSaving.set(false);
    }
  }

  async resetSidebarLayout() {
    if (!confirm('Reset the sidebar to its default layout? Any custom changes will be lost.')) return;
    this.sidebarSaving.set(true);
    try {
      const layout = await this.dataService.resetSidebarLayout();
      this.sidebarDraft.set(JSON.parse(JSON.stringify(layout)));
      this.sidebarDirty.set(false);
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Reset failed.');
    } finally {
      this.sidebarSaving.set(false);
    }
  }

  private loadUsers() {
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe(users => {
      this.users.set(users);
    });
  }

  roles = computed(() => {
    const u = this.users();
    const countByRole = (role: UserRole) => u.filter(usr => usr.role === role).length;
    return [
      { id: 'admin', name: 'Administrator', badge: 'purple', userCount: countByRole('admin'), description: 'Full access to all features and settings', permissions: ROLE_PERMISSIONS.admin },
      { id: 'manager', name: 'Manager', badge: 'blue', userCount: countByRole('manager'), description: 'Manage teams, projects, and view reports', permissions: ROLE_PERMISSIONS.manager },
      { id: 'user', name: 'User', badge: 'green', userCount: countByRole('user'), description: 'Standard access to core features', permissions: ROLE_PERMISSIONS.user },
      { id: 'viewer', name: 'Viewer', badge: 'gray', userCount: countByRole('viewer'), description: 'Read-only access to view data', permissions: ROLE_PERMISSIONS.viewer },
    ];
  });

  expandedRole: string | null = null;

  permissionGroups: { id: string; label: string; permissions: Permission[] }[] = [
    { id: 'leads', label: 'Leads & Pipeline', permissions: ['leads.view', 'leads.edit', 'leads.delete'] },
    { id: 'customers', label: 'Customers', permissions: ['customers.view', 'customers.edit', 'customers.billing'] },
    { id: 'projecthub', label: 'Project Hub', permissions: ['projecthub.view', 'projecthub.edit', 'projecthub.delete', 'projecthub.admin'] },
    { id: 'support', label: 'Support / Ticketing', permissions: ['support.view', 'support.edit', 'support.delete', 'support.admin'] },
    { id: 'intake', label: 'MES Intake', permissions: ['intake.view', 'intake.edit', 'intake.admin'] },
    { id: 'content', label: 'Content', permissions: ['content.view', 'content.edit', 'content.publish'] },
    { id: 'team', label: 'Team', permissions: ['team.view', 'team.edit'] },
    { id: 'kb', label: 'Knowledge Base', permissions: ['kb.view', 'kb.edit', 'kb.delete'] },
    { id: 'ai', label: 'AI Assistant', permissions: ['ai.use', 'ai.admin'] },
    { id: 'admin', label: 'Administration', permissions: ['admin.access', 'reports.view'] },
  ];

  companySettings = {
    name: 'CAT-I.AI',
    industry: 'Technology',
    email: 'admin@cat-i.ai',
    timezone: 'America/Los_Angeles (PST)'
  };

  securitySettings = {
    require2FA: true,
    enableSSO: false,
    sessionTimeout: '60',
    minPasswordLength: '12',
    requireSpecialChars: true,
    passwordExpiration: '90'
  };

  aiSettings = {
    apiKey: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    model: 'claude-sonnet-4-20250514',
    features: {
      contentGeneration: true,
      templateSuggestions: true,
      intakeAnalysis: true,
      emailDrafts: true
    },
    usage: {
      today: 12,
      month: 247,
      limit: 1000
    }
  };

  newUser = {
    name: '',
    email: '',
    role: 'user' as UserRole,
    department: 'Engineering',
    status: 'active' as 'active' | 'inactive' | 'pending'
  };

  getRoleBadge(role: UserRole): string {
    const badges: Record<UserRole, string> = {
      admin: 'purple',
      manager: 'blue',
      user: 'green',
      viewer: 'gray'
    };
    return badges[role];
  }

  formatPermission(perm: Permission): string {
    return perm.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  getPermissionLabel(perm: Permission): string {
    return PERMISSION_LABELS[perm] || this.formatPermission(perm);
  }

  toggleRoleExpand(roleId: string) {
    this.expandedRole = this.expandedRole === roleId ? null : roleId;
  }

  getExtraPermissions(user: User): string[] {
    // Return permission groups that differ from default role
    const rolePerms = ROLE_PERMISSIONS[user.role];
    const groups: string[] = [];
    for (const group of this.permissionGroups) {
      const hasExtra = group.permissions.some(p => !rolePerms.includes(p));
      if (hasExtra) continue;
      const hasAll = group.permissions.every(p => rolePerms.includes(p));
      if (hasAll && group.permissions.length > 0) {
        groups.push(group.label);
      }
    }
    return groups.slice(0, 3);
  }

  // ─── Permissions modal ───
  showPermissionsModal = signal(false);
  permissionsUser = signal<User | null>(null);
  editingPermissions = signal<string[]>([]);

  editUserPermissions(user: User) {
    this.permissionsUser.set(user);
    // Load user's current permissions from backend
    this.http.get<any>(`${environment.apiUrl}/users/${user.id}/permissions`, { withCredentials: true }).subscribe({
      next: (res) => {
        const perms = res.permissions?.length > 0
          ? res.permissions
          : [...ROLE_PERMISSIONS[user.role]];
        this.editingPermissions.set(perms);
        this.showPermissionsModal.set(true);
      },
      error: () => {
        this.editingPermissions.set([...ROLE_PERMISSIONS[user.role]]);
        this.showPermissionsModal.set(true);
      },
    });
  }

  closePermissionsModal() {
    this.showPermissionsModal.set(false);
    this.permissionsUser.set(null);
  }

  togglePerm(perm: string) {
    this.editingPermissions.update(perms => {
      if (perms.includes(perm)) return perms.filter(p => p !== perm);
      return [...perms, perm];
    });
  }

  togglePermGroup(group: { permissions: Permission[] }, enable: boolean) {
    this.editingPermissions.update(perms => {
      const without = perms.filter(p => !group.permissions.includes(p as Permission));
      return enable ? [...without, ...group.permissions] : without;
    });
  }

  resetToRoleDefaults() {
    const user = this.permissionsUser();
    if (!user) return;
    this.editingPermissions.set([...ROLE_PERMISSIONS[user.role]]);
  }

  savePermissions() {
    const user = this.permissionsUser();
    if (!user) return;
    this.http.put(`${environment.apiUrl}/users/${user.id}/permissions`, {
      permissions: this.editingPermissions(),
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.loadUsers();
        this.closePermissionsModal();
      },
      error: (err) => alert(err?.error?.error || 'Failed to save permissions'),
    });
  }

  testAIConnection() {
    if (!this.aiSettings.apiKey) return;
    // In production, this would make an actual API call
    alert('Connection successful! Claude AI is ready to use.');
  }

  editUser(user: User) {
    this.editingUser = user;
    this.newUser = { ...user };
    this.showAddUserModal.set(true);
  }

  resetPassword(user: User) {
    const newPassword = prompt(`Enter new password for ${user.name}:`, 'catops2026');
    if (!newPassword) return;
    this.http.patch(`${environment.apiUrl}/users/${user.id}`, { password: newPassword }, { withCredentials: true }).subscribe({
      next: () => alert(`Password reset for ${user.name}`),
      error: (err) => alert(err?.error?.error || 'Failed to reset password'),
    });
  }

  deleteUser(user: User) {
    if (!confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone. The team member record will be kept for historical reference.`)) return;
    this.http.delete(`${environment.apiUrl}/users/${user.id}`, { withCredentials: true }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err?.error?.error || 'Failed to delete user'),
    });
  }

  deactivateUser(user: User) {
    if (!confirm(`Deactivate user "${user.name}"? They will no longer be able to log in.`)) return;
    this.http.patch(`${environment.apiUrl}/users/${user.id}`, { status: 'inactive' }, { withCredentials: true }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err?.error?.error || 'Failed to deactivate user'),
    });
  }

  activateUser(user: User) {
    this.http.patch(`${environment.apiUrl}/users/${user.id}`, { status: 'active' }, { withCredentials: true }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err?.error?.error || 'Failed to activate user'),
    });
  }

  closeUserModal() {
    this.showAddUserModal.set(false);
    this.editingUser = null;
    this.newUser = {
      name: '',
      email: '',
      role: 'user',
      department: 'Engineering',
      status: 'active'
    };
  }

  saveUser() {
    if (this.editingUser) {
      this.http.patch(`${environment.apiUrl}/users/${this.editingUser.id}`, this.newUser).subscribe(() => {
        this.loadUsers();
        this.closeUserModal();
      });
    } else {
      this.http.post(`${environment.apiUrl}/users`, this.newUser).subscribe(() => {
        this.loadUsers();
        this.closeUserModal();
      });
    }
  }

}
