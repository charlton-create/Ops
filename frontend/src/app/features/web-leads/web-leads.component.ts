import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DemoRequest, DEMO_STATUS_BADGES, CAT_MODULES } from '../../core/models';
import { INDUSTRIES } from '../../core/constants/seed.data';
import { IconComponent } from '../../shared/icons';
import { TeamUtilService } from '../../shared/utils/team.service';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';

@Component({
  selector: 'app-web-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, FilterBarComponent],
  template: `
    <app-header
      title="Web Leads"
      subtitle="Demo Requests from cat-i.ai"
      icon="globe"
      gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
    >
      <button class="btn-secondary btn-sm" (click)="showWebhookInfo.set(true)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Webhook Setup
      </button>
      <button class="btn-primary btn-sm" (click)="showSimulateModal.set(true)">+ Simulate Submission</button>
    </app-header>

    <div class="webleads-content">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card stat-new">
          <div class="stat-body">
            <span class="stat-label">New Requests</span>
            <span class="stat-value">{{ dataService.newDemoRequests().length }}</span>
          </div>
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
        </div>
        <div class="stat-card stat-pending">
          <div class="stat-body">
            <span class="stat-label">Pending</span>
            <span class="stat-value">{{ dataService.pendingDemoRequests().length }}</span>
          </div>
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
        <div class="stat-card stat-converted">
          <div class="stat-body">
            <span class="stat-label">Converted</span>
            <span class="stat-value">{{ dataService.convertedDemoRequests().length }}</span>
          </div>
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
        <div class="stat-card stat-total">
          <div class="stat-body">
            <span class="stat-label">Total Requests</span>
            <span class="stat-value">{{ dataService.demoRequests().length }}</span>
          </div>
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Requests List -->
      <div class="requests-container">
        <div class="toolbar-tabs-row">
          <app-filter-bar
            [filters]="filterBarConfig"
            [values]="filterValues"
            (valuesChange)="onFilterChange($event)"
          ></app-filter-bar>
        </div>

        <div class="requests-list">
          @for (request of filteredRequests(); track request.id) {
            <div class="request-card" [class.is-new]="request.status === 'new'" (click)="selectRequest(request)">
              <div class="request-header">
                <div class="request-company">
                  <div class="company-avatar" [style.background]="getCompanyColor(request.companyName)">
                    {{ request.companyName?.charAt(0) || request.fullName.charAt(0) }}
                  </div>
                  <div class="company-info">
                    <span class="company-name">{{ request.companyName || 'Company not provided' }}</span>
                    <span class="company-industry">{{ request.industry || 'Industry not specified' }}</span>
                  </div>
                </div>
                <span class="badge" [class]="'badge-' + getStatusBadge(request.status)">{{ formatStatus(request.status) }}</span>
              </div>
              <div class="request-contact">
                <span class="contact-name">{{ request.fullName }}</span>
                <span class="contact-title">{{ request.position }}</span>
              </div>
              <div class="request-modules">
                @for (mod of request.selectedModules.slice(0, 3); track mod.module) {
                  <span class="module-tag">{{ mod.module }}</span>
                }
                @if (request.selectedModules.length > 3) {
                  <span class="module-tag more">+{{ request.selectedModules.length - 3 }}</span>
                }
              </div>
              <div class="request-footer">
                <span class="request-date">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {{ formatDate(request.submittedAt) }}
                </span>
                @if (request.assignedTo) {
                  <span class="request-assignee">
                    <div class="assignee-avatar" [style.background]="teamUtil.getColor(request.assignedTo)">
                      {{ request.assignedTo.charAt(0) }}
                    </div>
                    {{ request.assignedTo }}
                  </span>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <p>No demo requests found</p>
              <span>Requests from your website will appear here</span>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Request Detail Slideover -->
    @if (selectedRequest()) {
      <div class="slideover-overlay" (click)="selectedRequest.set(null)"></div>
      <div class="slideover-panel">
        <div class="slideover-header">
          <h2>Demo Request</h2>
          <button class="modal-close-btn" (click)="selectedRequest.set(null)">×</button>
        </div>
        <div class="slideover-body">
          <div class="detail-top">
            <span class="badge badge-lg" [class]="'badge-' + getStatusBadge(selectedRequest()!.status)">
              {{ formatStatus(selectedRequest()!.status) }}
            </span>
            <span class="detail-date">Submitted {{ formatDate(selectedRequest()!.submittedAt) }}</span>
          </div>

          <!-- Contact Info -->
          <div class="detail-section">
            <h3 class="section-title">Contact Information</h3>
            <div class="contact-card">
              <div class="contact-avatar" [style.background]="getCompanyColor(selectedRequest()!.companyName)">
                {{ selectedRequest()!.fullName.charAt(0) }}
              </div>
              <div class="contact-details">
                <span class="contact-name">{{ selectedRequest()!.fullName }}</span>
                <span class="contact-position">{{ selectedRequest()!.position }}</span>
                <a class="contact-email" (click)="openGmailCompose(selectedRequest()!.email, 'Following up on your CAT-I Demo Request')" style="cursor: pointer;">{{ selectedRequest()!.email }}</a>
              </div>
            </div>
          </div>

          <!-- Company Info -->
          <div class="detail-section">
            <h3 class="section-title">Company</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Company Name</span>
                <span>{{ selectedRequest()!.companyName || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Business Type</span>
                <span>{{ selectedRequest()!.businessType || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Industry</span>
                <span>{{ selectedRequest()!.industry || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Scheduling Preferences -->
          <div class="detail-section">
            <h3 class="section-title">Scheduling Preferences</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Preferred Date</span>
                <span>{{ selectedRequest()!.preferredDate || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Preferred Time</span>
                <span>{{ selectedRequest()!.preferredTime || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Modules of Interest -->
          <div class="detail-section">
            <h3 class="section-title">Modules of Interest</h3>
            <div class="modules-list">
              @for (mod of selectedRequest()!.selectedModules; track mod.module) {
                <div class="module-item">
                  <span class="module-name">{{ mod.module }}</span>
                  <div class="submodules">
                    @for (sub of mod.subModules; track sub) {
                      <span class="submodule-tag">{{ sub }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Demo Focus -->
          <div class="detail-section">
            <h3 class="section-title">Demo Focus</h3>
            <p class="demo-focus-text">{{ selectedRequest()!.demoFocus || 'No specific focus provided' }}</p>
          </div>

          <!-- Assignment -->
          @if (selectedRequest()!.status !== 'converted' && selectedRequest()!.status !== 'declined') {
            <div class="detail-section">
              <h3 class="section-title">Assignment</h3>
              <div class="assignment-row">
                <select class="form-select" [(ngModel)]="assignTo">
                  <option value="">Select team member</option>
                  @for (member of team; track member.id) {
                    <option [value]="member.name">{{ member.name }} - {{ member.role }}</option>
                  }
                </select>
                <button class="btn-secondary btn-sm" (click)="assignRequest()" [disabled]="!assignTo">Assign</button>
              </div>
            </div>
          }

          @if (selectedRequest()!.assignedTo) {
            <div class="assigned-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              Assigned to {{ selectedRequest()!.assignedTo }}
            </div>
          }

          <!-- Notes -->
          @if (selectedRequest()!.notes) {
            <div class="detail-section">
              <h3 class="section-title">Notes</h3>
              <p class="notes-text">{{ selectedRequest()!.notes }}</p>
            </div>
          }
        </div>

        <!-- Actions -->
        @if (selectedRequest()!.status !== 'converted' && selectedRequest()!.status !== 'declined') {
          <div class="slideover-footer">
            <button class="btn-outline-danger btn-sm" (click)="declineRequest()">Decline</button>
            <div class="footer-right">
              @if (selectedRequest()!.status !== 'scheduled') {
                <button class="btn-secondary btn-sm" (click)="showScheduleModal.set(true)">Schedule Demo</button>
              }
              <button class="btn-primary btn-sm" (click)="convertToLead()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Convert to Lead
              </button>
            </div>
          </div>
        }

        @if (selectedRequest()!.status === 'converted') {
          <div class="slideover-footer converted-footer">
            <div class="converted-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Converted to Lead #{{ selectedRequest()!.convertedToLeadId }}
            </div>
            <button class="btn-secondary btn-sm" routerLink="/leads">View in Leads</button>
          </div>
        }
      </div>
    }

    <!-- Schedule Demo Modal -->
    @if (showScheduleModal()) {
      <div class="modal-overlay" (click)="showScheduleModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Schedule Demo</h2>
            <button class="modal-close-btn" (click)="showScheduleModal.set(false)">×</button>
          </div>
          <div class="modal-body">
            <p class="modal-hint">Schedule a demo call with {{ selectedRequest()?.fullName }} from {{ selectedRequest()?.companyName }}</p>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" [(ngModel)]="scheduleDate" [min]="today">
              </div>
              <div class="form-group">
                <label class="form-label">Time</label>
                <input type="time" class="form-input" [(ngModel)]="scheduleTime">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Assign To</label>
              <select class="form-select" [(ngModel)]="scheduleAssignee">
                @for (member of team; track member.id) {
                  <option [value]="member.name">{{ member.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showScheduleModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="scheduleDemo()" [disabled]="!scheduleDate || !scheduleTime">Schedule Demo</button>
          </div>
        </div>
      </div>
    }

    <!-- Simulate Submission Modal -->
    @if (showSimulateModal()) {
      <div class="modal-overlay" (click)="showSimulateModal.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Simulate Form Submission</h2>
            <button class="modal-close-btn" (click)="showSimulateModal.set(false)">×</button>
          </div>
          <div class="modal-body">
            <p class="modal-hint">Test the integration by simulating a form submission from your website.</p>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="simulateForm.fullName" placeholder="John Doe">
              </div>
              <div class="form-group">
                <label class="form-label">Email <span class="required">*</span></label>
                <input type="email" class="form-input" [(ngModel)]="simulateForm.email" placeholder="john@company.com">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Position</label>
                <input type="text" class="form-input" [(ngModel)]="simulateForm.position" placeholder="Quality Manager">
              </div>
              <div class="form-group">
                <label class="form-label">Company Name</label>
                <input type="text" class="form-input" [(ngModel)]="simulateForm.companyName" placeholder="Acme Foods Inc">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Industry</label>
                <select class="form-select" [(ngModel)]="simulateForm.industry">
                  <option value="">Select industry</option>
                  @for (ind of industries; track ind) {
                    <option [value]="ind">{{ ind }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Preferred Time</label>
                <select class="form-select" [(ngModel)]="simulateForm.preferredTime">
                  <option value="">Select time</option>
                  <option value="Morning (9am-12pm)">Morning (9am-12pm)</option>
                  <option value="Afternoon (1pm-5pm)">Afternoon (1pm-5pm)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Modules of Interest</label>
              <div class="modules-selector">
                @for (modKey of moduleKeys; track modKey) {
                  <div class="module-checkbox">
                    <input type="checkbox" [id]="modKey" [checked]="isModuleSelected(modKey)" (change)="toggleModule(modKey)">
                    <label [for]="modKey">{{ modKey }} - {{ catModules[modKey].name }}</label>
                  </div>
                }
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Demo Focus</label>
              <textarea class="form-textarea" [(ngModel)]="simulateForm.demoFocus" rows="3" placeholder="What would you like to see in the demo?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showSimulateModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="submitSimulation()" [disabled]="!simulateForm.fullName || !simulateForm.email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Submit
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Webhook Info Modal -->
    @if (showWebhookInfo()) {
      <div class="modal-overlay" (click)="showWebhookInfo.set(false)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Webhook Integration</h2>
            <button class="modal-close-btn" (click)="showWebhookInfo.set(false)">×</button>
          </div>
          <div class="modal-body">
            <div class="webhook-section">
              <h3>Webhook Endpoint</h3>
              <div class="webhook-url">
                <code>POST https://api.cat-i.ai/webhooks/demo-request</code>
                <button class="btn-icon" title="Copy">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="webhook-section">
              <h3>Expected Payload</h3>
              <pre class="code-block">{{webhookPayloadExample}}</pre>
            </div>
            <div class="webhook-section">
              <h3>Website Form Integration</h3>
              <p>Add this script to your cat-i.ai contact form to send submissions to this hub:</p>
              <pre class="code-block">{{formIntegrationCode}}</pre>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" (click)="showWebhookInfo.set(false)">Done</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .webleads-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .stat-card {
      background: white;
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--color-border);
    }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-new .stat-icon { background: #DBEAFE; color: #2563EB; }
    .stat-pending .stat-icon { background: var(--color-warning-light); color: var(--color-warning); }
    .stat-converted .stat-icon { background: #D1FAE5; color: var(--status-green-text); }
    .stat-total .stat-icon { background: #E0E7FF; color: #4F46E5; }

    .requests-container {
      flex: 1;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .toolbar-tabs-row {
      padding: 1rem 1rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .toolbar-tabs {
      display: flex;
      gap: 4px;
    }

    .tab-btn {
      padding: 8px 16px;
      border: none;
      background: none;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-600);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: var(--color-gray-900);
    }

    .tab-btn.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--color-gray-100);
      border-radius: var(--radius-md);
      margin-left: 6px;
    }

    .tab-count.new-badge {
      background: #DBEAFE;
      color: #2563EB;
    }

    .requests-list {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
      align-content: start;
    }

    .request-card {
      background: var(--color-gray-50);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .request-card:hover {
      background: white;
      border-color: var(--color-gray-300);
      box-shadow: var(--shadow-md);
    }

    .request-card.is-new {
      border-left: 3px solid #2563EB;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .request-company {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .company-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .company-name {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
    }

    .company-industry {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .request-contact {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 12px;
    }

    .contact-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--color-gray-700);
    }

    .contact-title {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .request-modules {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .module-tag {
      padding: 4px 8px;
      background: #E0E7FF;
      color: #4338CA;
      border-radius: var(--radius);
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .module-tag.more {
      background: var(--color-gray-100);
      color: var(--color-gray-600);
    }

    .request-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);
    }

    .request-date {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .request-assignee {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-gray-600);
      font-weight: 500;
    }

    .assignee-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--color-gray-400);
      text-align: center;
    }

    .empty-state p {
      margin-top: 1rem;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-gray-600);
    }

    .empty-state span {
      font-size: 0.875rem;
    }

    /* Slideover styles */
    .slideover-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 100;
    }

    .slideover-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 100%;
      background: white;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 101;
      display: flex;
      flex-direction: column;
    }

    .slideover-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slideover-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }

    .slideover-body {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .slideover-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .footer-right {
      display: flex;
      gap: 8px;
    }

    .detail-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.5rem;
    }

    .badge-lg {
      padding: 6px 14px;
      font-size: 0.8125rem;
    }

    .detail-date {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
      margin: 0 0 12px 0;
    }

    .contact-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
    }

    .contact-avatar {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1.25rem;
    }

    .contact-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .contact-details .contact-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--color-gray-900);
    }

    .contact-details .contact-position {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
    }

    .contact-email {
      font-size: 0.8125rem;
      color: var(--color-primary);
      text-decoration: none;
    }

    .contact-email:hover {
      text-decoration: underline;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .modules-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .module-item {
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
    }

    .module-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-gray-900);
      display: block;
      margin-bottom: 8px;
    }

    .submodules {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .submodule-tag {
      padding: 4px 8px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: 0.75rem;
      color: var(--color-gray-600);
    }

    .demo-focus-text {
      font-size: 0.875rem;
      color: var(--color-gray-700);
      line-height: 1.6;
      margin: 0;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
    }

    .assignment-row {
      display: flex;
      gap: 8px;
    }

    .assignment-row .form-select {
      flex: 1;
    }

    .assigned-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #E0E7FF;
      color: #4338CA;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .converted-footer {
      background: var(--status-green-bg);
    }

    .converted-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--status-green-text);
      font-weight: 600;
    }

    .btn-outline-danger {
      padding: 8px 14px;
      background: white;
      color: var(--color-error-hover);
      border: 1px solid var(--color-error-light);
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-outline-danger:hover {
      background: #FEF2F2;
      border-color: var(--color-error-hover);
    }

    .notes-text {
      font-size: 0.875rem;
      color: var(--color-gray-600);
      line-height: 1.5;
      margin: 0;
    }

    /* Modal styles */
    .modal-hint {
      font-size: 0.875rem;
      color: var(--color-gray-600);
      margin-bottom: 1rem;
    }

    .modules-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .module-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .module-checkbox input {
      width: 16px;
      height: 16px;
    }

    .module-checkbox label {
      font-size: 0.875rem;
      color: var(--color-gray-700);
      cursor: pointer;
    }

    /* Webhook modal */
    .webhook-section {
      margin-bottom: 1.5rem;
    }

    .webhook-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
      margin: 0 0 8px 0;
    }

    .webhook-url {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--color-gray-900);
      border-radius: var(--radius-md);
    }

    .webhook-url code {
      flex: 1;
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--color-success);
    }

    .btn-icon {
      padding: 6px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: var(--radius);
      color: white;
      cursor: pointer;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .code-block {
      padding: 12px;
      background: var(--color-gray-900);
      border-radius: var(--radius-md);
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--color-gray-200);
      overflow-x: auto;
      white-space: pre;
      margin: 0;
    }

    .webhook-section p {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      margin: 0 0 8px 0;
    }

    /* ── Mobile (iPhone) ── */
    @media (max-width: 768px) {
      .webleads-content {
        padding: 0.75rem;
        gap: 0.75rem;
      }

      /* Stats: 2-column grid on mobile */
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.625rem;
      }

      .stat-card {
        padding: 0.75rem 1rem;
      }

      .stat-value {
        font-size: 1.375rem;
      }

      .stat-icon {
        width: 36px;
        height: 36px;
      }

      .stat-icon svg {
        width: 18px;
        height: 18px;
      }

      /* Requests list: single column card stack */
      .requests-list {
        grid-template-columns: 1fr;
        padding: 0.75rem;
        gap: 0.75rem;
      }

      /* Each card: prominent mobile layout */
      .request-card {
        padding: 1rem;
      }

      .request-header {
        margin-bottom: 10px;
      }

      .company-name {
        font-size: 1rem;
      }

      /* Contact row */
      .request-contact {
        margin-bottom: 10px;
      }

      .contact-name {
        font-size: 0.9375rem;
      }

      /* Module tags */
      .request-modules {
        margin-bottom: 10px;
      }

      .module-tag {
        font-size: 0.75rem;
        padding: 5px 10px;
      }

      /* Footer: date + assignee */
      .request-footer {
        padding-top: 8px;
        flex-wrap: wrap;
        gap: 6px;
      }

      /* Slideover: full screen on mobile */
      .slideover-panel {
        width: 100%;
        top: env(safe-area-inset-top, 0px);
      }

      .slideover-header {
        padding: 1rem 1.25rem;
        padding-top: max(env(safe-area-inset-top, 0px), 1rem);
      }

      .slideover-body {
        padding: 1rem 1.25rem;
      }

      .slideover-footer {
        padding: 0.875rem 1.25rem;
        padding-bottom: max(env(safe-area-inset-bottom, 0px), 0.875rem);
        flex-wrap: wrap;
        gap: 8px;
      }

      /* Buttons: touch-friendly 44px min-height */
      .btn-primary,
      .btn-secondary,
      .btn-outline-danger {
        min-height: 44px;
        padding-top: 10px;
        padding-bottom: 10px;
      }

      .btn-sm {
        min-height: 44px;
      }

      .footer-right {
        width: 100%;
        justify-content: flex-end;
      }

      /* Modal: full-width on mobile */
      .modal-container {
        width: calc(100% - 2rem);
        max-height: 90vh;
      }

      .form-row {
        flex-direction: column;
      }

      /* Detail grid: single column */
      .detail-grid {
        grid-template-columns: 1fr;
      }

      /* Toolbar filter bar spacing */
      .toolbar-tabs-row {
        padding: 0.75rem 0.75rem 0;
      }

      /* Assignment row: stack on narrow screens */
      .assignment-row {
        flex-direction: column;
      }

      .assignment-row .form-select {
        width: 100%;
      }

      .assignment-row .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class WebLeadsComponent {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);

  activeTab = signal<'all' | 'new' | 'pending' | 'converted'>('all');

  filterBarConfig: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'tabs',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'completed', label: 'Completed' },
        { value: 'converted', label: 'Converted' },
      ]
    },
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search leads...'
    }
  ];

  filterValues: FilterValues = { status: 'all', search: '' };

  onFilterChange(values: FilterValues) {
    this.filterValues = values;
    const status = values['status'] || 'all';
    if (status === 'all' || status === 'new' || status === 'pending' || status === 'converted') {
      this.activeTab.set(status as any);
    } else if (status === 'contacted' || status === 'scheduled') {
      this.activeTab.set('pending');
    } else {
      this.activeTab.set('all');
    }
  }
  selectedRequest = signal<DemoRequest | null>(null);
  showScheduleModal = signal(false);
  showSimulateModal = signal(false);
  showWebhookInfo = signal(false);

  get team() { return this.dataService.team(); }
  industries = INDUSTRIES;
  catModules = CAT_MODULES;
  moduleKeys = Object.keys(CAT_MODULES) as (keyof typeof CAT_MODULES)[];

  assignTo = '';
  scheduleDate = '';
  scheduleTime = '10:00';
  scheduleAssignee = this.authService.user()?.name ?? 'User';
  today = new Date().toISOString().split('T')[0];

  simulateForm = {
    fullName: '',
    email: '',
    position: '',
    companyName: '',
    industry: '',
    preferredTime: '',
    demoFocus: '',
    selectedModules: [] as string[]
  };

  webhookPayloadExample = `{
  "fullName": "John Smith",
  "email": "john@company.com",
  "position": "Quality Manager",
  "companyName": "Acme Foods Inc",
  "businessType": "Manufacturing",
  "industry": "Bakery",
  "preferredTime": "Morning (9am-12pm)",
  "preferredDate": "2026-04-15",
  "selectedModules": [
    {
      "module": "CAT-I.AI",
      "subModules": ["Document Control", "HACCP Plan Builder"]
    }
  ],
  "demoFocus": "Looking to automate HACCP documentation"
}`;

  formIntegrationCode = `// Add to your form submit handler
fetch('https://api.cat-i.ai/webhooks/demo-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});`;

  inProgressCount = computed(() =>
    this.dataService.demoRequests().filter(d =>
      d.status === 'contacted' || d.status === 'scheduled'
    ).length
  );

  filteredRequests = computed(() => {
    const requests = this.dataService.demoRequests();
    switch (this.activeTab()) {
      case 'new':
        return requests.filter(r => r.status === 'new');
      case 'pending':
        return requests.filter(r => r.status === 'contacted' || r.status === 'scheduled');
      case 'converted':
        return requests.filter(r => r.status === 'converted');
      default:
        return requests;
    }
  });

  getStatusBadge(status: string): string {
    return DEMO_STATUS_BADGES[status as keyof typeof DEMO_STATUS_BADGES] || 'gray';
  }

  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCompanyColor(name: string | undefined): string {
    if (!name) return '#6B7280';
    const colors = ['#A02195', '#1A56DB', '#0D9488', '#D97706', '#7C3AED', '#059669', '#DC2626', '#0891B2'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  selectRequest(request: DemoRequest) {
    this.selectedRequest.set(request);
    this.assignTo = request.assignedTo || '';
  }

  assignRequest() {
    const request = this.selectedRequest();
    if (!request || !this.assignTo) return;

    this.dataService.assignDemoRequest(request.id, this.assignTo);
    this.selectedRequest.set({ ...request, assignedTo: this.assignTo, status: 'contacted' });
  }

  scheduleDemo() {
    const request = this.selectedRequest();
    if (!request) return;

    const timeFormatted = new Date(`2000-01-01T${this.scheduleTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    this.dataService.scheduleDemoFromRequest(request.id, this.scheduleDate, timeFormatted, this.scheduleAssignee);
    this.selectedRequest.set({ ...request, status: 'scheduled', assignedTo: this.scheduleAssignee });
    this.showScheduleModal.set(false);
  }

  convertToLead() {
    const request = this.selectedRequest();
    if (!request) return;

    const lead = this.dataService.convertDemoToLead(request.id);
    if (lead) {
      this.selectedRequest.set({ ...request, status: 'converted', convertedToLeadId: lead.id });
    }
  }

  declineRequest() {
    const request = this.selectedRequest();
    if (!request) return;

    this.dataService.declineDemoRequest(request.id, 'Not qualified');
    this.selectedRequest.set(null);
  }

  isModuleSelected(modKey: string): boolean {
    return this.simulateForm.selectedModules.includes(modKey);
  }

  toggleModule(modKey: string) {
    const idx = this.simulateForm.selectedModules.indexOf(modKey);
    if (idx === -1) {
      this.simulateForm.selectedModules.push(modKey);
    } else {
      this.simulateForm.selectedModules.splice(idx, 1);
    }
  }

  submitSimulation() {
    const modules = this.simulateForm.selectedModules.map(key => ({
      module: key,
      subModules: this.catModules[key as keyof typeof CAT_MODULES]?.subModules.slice(0, 2) || []
    }));

    this.dataService.receiveWebhook({
      fullName: this.simulateForm.fullName,
      email: this.simulateForm.email,
      position: this.simulateForm.position,
      companyName: this.simulateForm.companyName,
      industry: this.simulateForm.industry,
      preferredTime: this.simulateForm.preferredTime,
      preferredDate: '',
      selectedModules: modules,
      demoFocus: this.simulateForm.demoFocus
    });

    this.showSimulateModal.set(false);
    this.simulateForm = {
      fullName: '',
      email: '',
      position: '',
      companyName: '',
      industry: '',
      preferredTime: '',
      demoFocus: '',
      selectedModules: []
    };
  }

  // Open Gmail compose
  openGmailCompose(email: string, subject?: string, body?: string) {
    const params = new URLSearchParams();
    if (subject) params.set('su', subject);
    if (body) params.set('body', body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${params.toString() ? '&' + params.toString() : ''}`;
    window.open(gmailUrl, '_blank');
  }
}
