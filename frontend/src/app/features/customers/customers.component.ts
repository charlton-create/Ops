import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { Customer, CUSTOMER_STATUS_BADGES, BILLING_STATUS_BADGES, CustomerStatus, BillingStatus } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { InlineEditComponent } from '../../shared/components/inline-edit/inline-edit.component';
import { CurrencyShortPipe } from '../../shared/utils/format.pipe';
import { TeamUtilService } from '../../shared/utils/team.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, FilterBarComponent, ActivityTimelineComponent, InlineEditComponent, CurrencyShortPipe],
  template: `
    <app-header
      title="Customers"
      subtitle="Customer Management & Billing"
      icon="building"
      gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
    >
      <button class="btn-secondary btn-sm" (click)="syncZoho()">
        <app-icon name="refresh" [size]="14"></app-icon>
        Sync Zoho
      </button>
    </app-header>

    <div class="customers-content">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Active Customers</span>
            <span class="stat-value">{{ dataService.activeCustomers().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Onboarding</span>
            <span class="stat-value">{{ dataService.onboardingCustomers().length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Annual Revenue</span>
            <span class="stat-value">\${{ formatCurrency(dataService.totalCustomerValue()) }}</span>
          </div>
        </div>
        <div class="stat-card" [class.alert]="dataService.customersWithOverduePayments().length > 0">
          <div class="stat-body">
            <span class="stat-label">Overdue Payments</span>
            <span class="stat-value">{{ dataService.customersWithOverduePayments().length }}</span>
          </div>
        </div>
      </div>

      <!-- Customer List -->
      <div class="table-card">
        <app-filter-bar [filters]="customerFilters" [(values)]="filterState" (valuesChange)="onFilterChange($event)"></app-filter-bar>

        <!-- Mobile card list (shown at ≤768px, hidden on desktop via CSS) -->
        <div class="mobile-customers-list">
          @for (customer of filteredCustomers(); track customer.id) {
            <div class="customer-card" (click)="selectCustomer(customer)">
              <div class="customer-card-main">
                <div class="customer-card-avatar" [style.background]="teamUtil.getColor(customer.owner)">
                  {{ customer.company.charAt(0) }}
                </div>
                <div class="customer-card-info">
                  <span class="customer-card-company">{{ customer.company }}</span>
                  <span class="customer-card-sub">{{ customer.industry }}</span>
                </div>
                <span class="badge" [class]="'badge-' + getStatusBadge(customer.status)">
                  {{ customer.status }}
                </span>
              </div>
              <div class="customer-card-meta">
                <span class="billing-status" [class]="customer.billingStatus">{{ customer.billingStatus }}</span>
                <span class="customer-card-contact">{{ customer.contact }}</span>
                <span class="customer-card-activity">{{ formatDate(getRenewalDate(customer)) }}</span>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <p>No customers found</p>
              <span>Customers are created when leads are moved to "Closed Won"</span>
            </div>
          }
        </div>

        @if (selectedCustomerIds().size > 0) {
          <div class="bulk-bar">
            <span class="bulk-count">{{ selectedCustomerIds().size }} selected</span>
            <button class="btn-secondary btn-sm bulk-spacer" (click)="clearCustomerSelection()">Clear</button>
            <button class="btn-danger btn-sm" (click)="deleteSelectedCustomers()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete Selected
            </button>
          </div>
        }
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 36px">
                  <input type="checkbox" [checked]="allCustomersSelected()" (change)="toggleAllCustomers($event)">
                </th>
                <th style="width: 20%">Company</th>
                <th style="width: 13%">Contact</th>
                <th style="width: 13%">Modules</th>
                <th style="width: 11%">Contract Value</th>
                <th style="width: 9%">Status</th>
                <th style="width: 11%">Billing</th>
                <th style="width: 14%">Renewal</th>
                <th style="width: 60px">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (customer of filteredCustomers(); track customer.id) {
                <tr (click)="selectCustomer(customer)" [class.row-selected]="isCustomerSelected(customer.id)">
                  <td (click)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="isCustomerSelected(customer.id)" (change)="toggleCustomerSelection(customer.id, $event)">
                  </td>
                  <td>
                    <div class="entity-cell">
                      <div class="entity-avatar" [style.background]="teamUtil.getColor(customer.owner)">
                        {{ customer.company.charAt(0) }}
                      </div>
                      <div class="entity-info">
                        <span class="entity-name">{{ customer.company }}</span>
                        <span class="entity-sub">{{ customer.industry }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ customer.contact }}</td>
                  <td>
                    <div class="module-chips">
                      @for (mod of customer.modules.slice(0, 2); track mod) {
                        <span class="badge badge-blue">{{ mod }}</span>
                      }
                      @if (customer.modules.length > 2) {
                        <span class="badge badge-gray">+{{ customer.modules.length - 2 }}</span>
                      }
                    </div>
                  </td>
                  <td class="value-cell">\${{ customer.contractValue | number }}</td>
                  <td>
                    <span class="badge" [class]="'badge-' + getStatusBadge(customer.status)">
                      {{ customer.status }}
                    </span>
                  </td>
                  <td>
                    <span class="billing-status" [class]="customer.billingStatus">
                      {{ customer.billingStatus }}
                    </span>
                  </td>
                  <td>
                    <div class="renewal-info" [class.soon]="isRenewingSoon(customer)">
                      {{ formatDate(getRenewalDate(customer)) }}
                      @if (isRenewingSoon(customer)) {
                        <span class="renewal-badge">Renewing Soon</span>
                      }
                    </div>
                  </td>
                  <td (click)="$event.stopPropagation()">
                    <button class="action-btn action-btn-danger" title="Delete customer" (click)="deleteCustomer(customer)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9">
                    <div class="empty-state">
                      <p>No customers found</p>
                      <span>Customers are created when leads are moved to "Closed Won"</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Customer Detail Slideover -->
    @if (selectedCustomer()) {
      <div class="slideover-overlay" (click)="selectedCustomer.set(null)"></div>
      <div class="slideover-panel slideover-lg">
        <div class="slideover-header">
          <div>
            <h2>{{ selectedCustomer()!.company }}</h2>
            <span class="customer-id">Zoho ID: {{ selectedCustomer()!.zohoCustomerId || 'Not synced' }}</span>
          </div>
          <div class="slideover-header-actions">
            <button class="btn-danger btn-sm" title="Delete customer" (click)="deleteCustomer(selectedCustomer()!)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </button>
            <button class="modal-close-btn" (click)="selectedCustomer.set(null)">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>
        </div>
        <div class="slideover-body">
          <!-- Status badges -->
          <div class="status-row">
            <app-inline-edit
              [value]="selectedCustomer()!.status"
              type="badge"
              label="Status"
              [options]="statusOptions"
              (valueChange)="updateCustomerField('status', $event)"
            ></app-inline-edit>
            <span class="billing-status-lg" [class]="selectedCustomer()!.billingStatus">
              Billing: {{ selectedCustomer()!.billingStatus }}
            </span>
          </div>

          <!-- Contract info -->
          <div class="detail-section">
            <h4>Contract Details</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Contract Value</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.contractValue"
                  type="number"
                  label="Contract Value"
                  (valueChange)="updateCustomerField('contractValue', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Annual Revenue</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.annualRevenue"
                  type="number"
                  label="Annual Revenue"
                  (valueChange)="updateCustomerField('annualRevenue', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Contract Start</span>
                <label class="date-editable" title="Click to edit">
                  <input type="date"
                         [value]="toDateInputValue(selectedCustomer()!.contractStart)"
                         (change)="updateCustomerField('contractStart', $any($event.target).value)">
                  <span>{{ formatDate(selectedCustomer()!.contractStart) }}</span>
                  <app-icon name="edit" [size]="13"></app-icon>
                </label>
              </div>
              <div class="detail-item">
                <span class="detail-label">Contract End</span>
                <label class="date-editable" title="Click to edit">
                  <input type="date"
                         [value]="toDateInputValue(selectedCustomer()!.contractEnd)"
                         (change)="updateCustomerField('contractEnd', $any($event.target).value)">
                  <span>{{ formatDate(selectedCustomer()!.contractEnd) }}</span>
                  <app-icon name="edit" [size]="13"></app-icon>
                </label>
              </div>
              <div class="detail-item">
                <span class="detail-label">Renewal Date</span>
                <span>{{ formatDate(getRenewalDate(selectedCustomer()!)) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Account Manager</span>
                <div class="owner-cell">
                  <div class="owner-avatar" [style.background]="teamUtil.getColor(selectedCustomer()!.owner)">
                    {{ selectedCustomer()!.owner.charAt(0) }}
                  </div>
                  <app-inline-edit
                    [value]="selectedCustomer()!.owner"
                    type="text"
                    label="Owner"
                    (valueChange)="updateCustomerField('owner', $event)"
                  ></app-inline-edit>
                </div>
              </div>
              <div class="detail-item">
                <span class="detail-label">Facilities</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.facilities"
                  type="number"
                  label="Facilities"
                  (valueChange)="updateCustomerField('facilities', $event)"
                ></app-inline-edit>
              </div>
            </div>
          </div>

          <!-- Contact info -->
          <div class="detail-section">
            <h4>Contact Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Primary Contact</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.contact"
                  type="text"
                  label="Contact"
                  (valueChange)="updateCustomerField('contact', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Title</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.title"
                  type="text"
                  label="Title"
                  placeholder="Add title"
                  (valueChange)="updateCustomerField('title', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.email"
                  type="text"
                  label="Email"
                  (valueChange)="updateCustomerField('email', $event)"
                ></app-inline-edit>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <app-inline-edit
                  [value]="selectedCustomer()!.phone"
                  type="text"
                  label="Phone"
                  placeholder="Add phone"
                  (valueChange)="updateCustomerField('phone', $event)"
                ></app-inline-edit>
              </div>
            </div>
          </div>

          <!-- Modules -->
          <div class="detail-section">
            <h4>Subscribed Modules</h4>
            <div class="chip-wrap">
              @for (mod of selectedCustomer()!.modules; track mod) {
                <span class="badge badge-blue">{{ mod }}</span>
              }
            </div>
          </div>

          <!-- Billing -->
          <div class="detail-section">
            <h4>Billing</h4>
            <div class="billing-card">
              <div class="billing-row">
                <span class="billing-label">Status</span>
                <span class="billing-badge" [class]="'billing-' + selectedCustomer()!.billingStatus">
                  {{ selectedCustomer()!.billingStatus }}
                </span>
              </div>
              <div class="billing-row">
                <span class="billing-label">Zoho Contact</span>
                <span>{{ selectedCustomer()!.zohoCustomerId || 'Not synced' }}</span>
              </div>
              <div class="billing-row">
                <span class="billing-label">Contract Value</span>
                <span>\${{ selectedCustomer()!.contractValue | number }}</span>
              </div>
              <div class="billing-actions">
                @if (selectedCustomer()!.zohoCustomerId) {
                  <button class="btn-primary btn-sm" (click)="sendInvoice()" [disabled]="sendingInvoice()">
                    {{ sendingInvoice() ? 'Sending...' : 'Send Invoice Email' }}
                  </button>
                } @else {
                  <button class="btn-primary btn-sm" (click)="syncToZoho()" [disabled]="syncingZoho()">
                    {{ syncingZoho() ? 'Syncing...' : 'Create Zoho Invoice' }}
                  </button>
                }
                <button class="btn-secondary btn-sm" (click)="testZohoPing()" [disabled]="pinging()">
                  {{ pinging() ? 'Testing...' : 'Test Zoho Connection' }}
                </button>
              </div>
              @if (zohoStatus()) {
                <div class="zoho-status" [class.ok]="zohoStatus() === 'ok'" [class.fail]="zohoStatus() !== 'ok'">
                  {{ zohoStatusMsg() }}
                </div>
              }
            </div>
          </div>

          <!-- Invoices -->
          <div class="detail-section">
            <div class="section-header-row">
              <h4>Invoices</h4>
              <button class="btn-secondary btn-sm" (click)="createInvoice()">
                <app-icon name="plus" [size]="14"></app-icon>
                New Invoice
              </button>
            </div>
            <div class="invoices-list">
              @for (invoice of selectedCustomer()!.zohoInvoices; track invoice.id) {
                <div class="invoice-row" [class]="'invoice-' + invoice.status">
                  <div class="invoice-info">
                    <span class="invoice-number">{{ invoice.invoiceNumber }}</span>
                    <span class="invoice-date">{{ formatDate(invoice.date) }}</span>
                  </div>
                  <div class="invoice-amount">\${{ invoice.amount | number }}</div>
                  <div class="invoice-status">
                    <span class="badge" [class]="'badge-' + getInvoiceBadge(invoice.status)">
                      {{ invoice.status }}
                    </span>
                  </div>
                  <div class="invoice-actions">
                    @if (invoice.status !== 'paid') {
                      <button class="btn-sm btn-primary" (click)="markPaid(invoice); $event.stopPropagation()">
                        Mark Paid
                      </button>
                    }
                    @if (invoice.zohoUrl) {
                      <a [href]="invoice.zohoUrl" target="_blank" class="btn-sm btn-secondary">
                        View in Zoho
                      </a>
                    }
                  </div>
                </div>
              } @empty {
                <div class="no-invoices">No invoices yet</div>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="detail-section">
            <h4>Quick Actions</h4>
            <div class="action-buttons">
              @if (selectedCustomer()!.status === 'onboarding') {
                <button class="btn-primary" (click)="activateCustomer()">
                  <app-icon name="check" [size]="16"></app-icon>
                  Mark as Active
                </button>
              }
              <button class="btn-secondary" (click)="viewRelatedProject()">
                <app-icon name="folder" [size]="16"></app-icon>
                View Project
              </button>
              <button class="btn-secondary" (click)="viewActivityHistory()">
                <app-icon name="clock" [size]="16"></app-icon>
                Activity History
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div class="detail-section">
            <h4>Notes</h4>
            <app-inline-edit
              [value]="selectedCustomer()!.notes"
              type="textarea"
              label="Notes"
              placeholder="Add notes..."
              (valueChange)="updateCustomerField('notes', $event)"
            ></app-inline-edit>
          </div>

          <!-- Activity Timeline -->
          <app-activity-timeline entityType="customer" [entityId]="selectedCustomer()!.id"></app-activity-timeline>
        </div>
      </div>
    }

    <!-- Create Invoice Modal -->
    @if (showInvoiceModal()) {
      <div class="modal-overlay" (click)="showInvoiceModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Create Invoice</h2>
            <button class="modal-close-btn" (click)="showInvoiceModal.set(false)">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Customer</label>
              <input type="text" class="form-input" [value]="selectedCustomer()?.company" readonly>
            </div>
            <div class="form-group">
              <label class="form-label">Amount <span class="required">*</span></label>
              <input type="number" class="form-input" [(ngModel)]="newInvoice.amount" placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="newInvoice.description" placeholder="Invoice description">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showInvoiceModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="submitInvoice()" [disabled]="!newInvoice.amount">
              Create & Send to Zoho
            </button>
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

    .customers-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .stat-card.alert {
      background: var(--status-red-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .stat-card.alert .stat-value {
      color: var(--color-error);
    }

    .table-toolbar {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-hairline);
    }

    .entity-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bulk-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #EFF6FF;
      border-bottom: 1px solid #BFDBFE;
    }
    .bulk-count { font-size: 0.875rem; font-weight: 600; color: #1E40AF; }
    .bulk-spacer { margin-left: auto; }
    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: var(--radius);
      background: #DC2626;
      color: white;
      font-weight: 500;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-danger:hover { background: #B91C1C; }
    tr.row-selected { background: #EFF6FF; }
    .action-btn {
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-500);
      transition: all 0.15s ease;
    }
    .action-btn-danger:hover { background: #FEE2E2; color: #B91C1C; }
    .slideover-header-actions { display: flex; align-items: center; gap: 8px; }

    .billing-card {
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .billing-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
    }
    .billing-label { color: var(--color-gray-500); font-weight: 500; }
    .billing-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .billing-pending { background: #FEF3C7; color: #92400E; }
    .billing-invoiced { background: #DBEAFE; color: #1E40AF; }
    .billing-active { background: #D1FAE5; color: #065F46; }
    .billing-past_due { background: #FEE2E2; color: #991B1B; }
    .billing-partial { background: #FDE68A; color: #78350F; }
    .billing-void { background: #F3F4F6; color: #6B7280; }
    .billing-manual_review { background: #FCE7F3; color: #9D174D; }
    .billing-actions { display: flex; gap: 8px; margin-top: 4px; }
    .zoho-status {
      font-size: 0.75rem;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      margin-top: 4px;
    }
    .zoho-status.ok { background: #D1FAE5; color: #065F46; }
    .zoho-status.fail { background: #FEE2E2; color: #991B1B; }

    .entity-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .entity-info {
      display: flex;
      flex-direction: column;
    }

    .entity-name {
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .entity-sub {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .module-chips {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .value-cell {
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .billing-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .billing-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .billing-status.current::before, .billing-status.paid::before { background: var(--color-success); }
    .billing-status.pending::before { background: var(--color-warning); }
    .billing-status.overdue::before { background: var(--color-error); }

    .renewal-info {
      font-size: 0.875rem;
      color: var(--color-gray-600);
    }

    .renewal-info.soon {
      color: var(--color-warning);
    }

    .renewal-badge {
      display: block;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-warning);
    }

    /* Slideover */
    .slideover-lg {
      width: 500px;
    }

    .customer-id {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.5rem;
    }

    .billing-status-lg {
      padding: 6px 12px;
      border-radius: var(--radius);
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .billing-status-lg.current, .billing-status-lg.paid {
      background: var(--status-green-bg);
      color: var(--status-green-text);
    }

    .billing-status-lg.pending {
      background: var(--status-yellow-bg);
      color: var(--status-yellow-text);
    }

    .billing-status-lg.overdue {
      background: var(--status-red-bg);
      color: var(--status-red-text);
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section h4 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .section-header-row h4 {
      margin: 0;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .email-link {
      color: var(--color-primary);
      cursor: pointer;
    }

    .email-link:hover {
      text-decoration: underline;
    }

    .detail-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .detail-value-lg {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }

    .date-editable {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 4px;
      margin: -2px -4px;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--color-gray-900);
      transition: background 0.15s ease;
    }
    .date-editable:hover { background: var(--color-gray-50); }
    .date-editable input[type="date"] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      border: 0;
    }
    .date-editable .edit-icon, .date-editable app-icon { color: var(--color-gray-400); }

    .owner-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .owner-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
    }

    .invoices-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .invoice-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-gray-300);
    }

    .invoice-row.invoice-paid {
      border-left-color: var(--color-success);
    }

    .invoice-row.invoice-overdue {
      border-left-color: var(--color-error);
      background: var(--status-red-bg);
    }

    .invoice-info {
      flex: 1;
    }

    .invoice-number {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .invoice-date {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .invoice-amount {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .invoice-actions {
      display: flex;
      gap: 8px;
    }

    .invoice-actions a {
      text-decoration: none;
    }

    .no-invoices {
      padding: 1rem;
      text-align: center;
      color: var(--color-gray-400);
      font-size: 0.875rem;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .action-buttons button {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .notes-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-gray-600);
      line-height: 1.5;
    }

    /* ========== MOBILE CARD LIST (hidden on desktop) ========== */
    .mobile-customers-list {
      display: none;
      flex-direction: column;
    }

    .customer-card {
      min-height: 72px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-gray-100);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: background 0.12s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .customer-card:active {
      background: var(--color-gray-50);
    }

    .customer-card-main {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .customer-card-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .customer-card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .customer-card-company {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .customer-card-sub {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .customer-card-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 46px;
    }

    .customer-card-contact {
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .customer-card-activity {
      font-size: 0.75rem;
      color: var(--color-gray-400);
      flex-shrink: 0;
      white-space: nowrap;
    }

    /* ========== MOBILE (≤768px) ========== */
    @media (max-width: 768px) {

      :host {
        overflow: visible;
        min-height: auto;
      }

      /* Content area */
      .customers-content {
        padding: 0.75rem;
        gap: 0.75rem;
        overflow: visible;
        flex: none;
      }

      /* Stats grid: 2×2 */
      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      /* Table card: no side padding so cards bleed edge-to-edge */
      .table-card {
        padding: 0;
        overflow: hidden;
      }

      /* Hide desktop table, show mobile cards */
      .table-scroll {
        display: none !important;
      }

      .mobile-customers-list {
        display: flex;
      }

      /* Slideover: full screen */
      .slideover-panel {
        width: 100% !important;
        max-width: 100% !important;
        height: 100dvh !important;
        top: 0 !important;
        right: 0 !important;
        border-radius: 0 !important;
      }

      .slideover-lg {
        width: 100% !important;
      }

      /* Slideover body padding */
      .slideover-body {
        padding: 1rem;
      }

      /* Status row: stack on small screens */
      .status-row {
        flex-wrap: wrap;
        gap: 8px;
      }

      /* Detail grid: single column */
      .detail-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      /* Invoice rows: wrap on narrow screens */
      .invoice-row {
        flex-wrap: wrap;
        gap: 8px;
      }

      .invoice-actions {
        width: 100%;
        justify-content: flex-end;
      }

      /* Action buttons: full-width, min-height 44px */
      .action-buttons {
        flex-direction: column;
      }

      .action-buttons button,
      .action-buttons a {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      /* All primary/secondary buttons: min-height 44px */
      .btn-primary,
      .btn-secondary {
        min-height: 44px;
      }

      .btn-sm {
        min-height: 40px;
      }

      /* Modal: full screen */
      .modal-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0;
        border-radius: 0;
        min-height: 100dvh;
      }
    }
  `]
})
export class CustomersComponent {
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);

  selectedCustomer = signal<Customer | null>(null);
  showInvoiceModal = signal(false);

  filterState: FilterValues = { status: 'all', search: '' };
  customerFilters: FilterConfig[] = [
    { key: 'status', label: 'Status', type: 'tabs', defaultValue: 'all', options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'onboarding', label: 'Onboarding' },
      { value: 'churned', label: 'Churned' },
      { value: 'paused', label: 'Paused' },
    ]},
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search customers...' },
    { key: 'billing', label: 'Billing', type: 'select', placeholder: 'All billing', options: [
      { value: 'current', label: 'Current' },
      { value: 'pending', label: 'Pending' },
      { value: 'overdue', label: 'Overdue' },
    ]},
  ];

  statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'onboarding', label: 'Onboarding', color: 'blue' },
    { value: 'churned', label: 'Churned', color: 'red' },
    { value: 'paused', label: 'Paused', color: 'yellow' },
  ];

  newInvoice = {
    amount: 0,
    description: ''
  };

  filteredCustomers = computed(() => {
    let customers = this.dataService.customers();

    const status = this.filterState['status'];
    if (status && status !== 'all') {
      customers = customers.filter(c => c.status === status);
    }

    const search = this.filterState['search'];
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c =>
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q)
      );
    }

    const billing = this.filterState['billing'];
    if (billing) {
      customers = customers.filter(c => c.billingStatus === billing);
    }

    return customers;
  });

  onFilterChange(values: FilterValues) {
    this.filterState = { ...values };
  }

  getStatusBadge(status: CustomerStatus): string {
    return CUSTOMER_STATUS_BADGES[status];
  }

  getBillingBadge(status: BillingStatus): string {
    return BILLING_STATUS_BADGES[status];
  }

  getInvoiceBadge(status: string): string {
    const badges: Record<string, string> = {
      draft: 'gray',
      sent: 'blue',
      paid: 'green',
      overdue: 'red',
      partially_paid: 'yellow'
    };
    return badges[status] || 'gray';
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  }

  formatDate(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '—';
    // Accept full ISO datetimes (e.g. 2026-04-14T00:00:00.000Z) or plain YYYY-MM-DD
    const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  toDateInputValue(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  getRenewalDate(customer: Customer): string | Date | null | undefined {
    // Renewal date defaults to the contract end date unless explicitly set
    return customer.renewalDate || customer.contractEnd;
  }

  isRenewingSoon(customer: Customer): boolean {
    const renewalStr = this.getRenewalDate(customer);
    if (!renewalStr) return false;
    const renewal = typeof renewalStr === 'string' ? new Date(renewalStr) : renewalStr;
    if (isNaN(renewal.getTime())) return false;
    const today = new Date();
    const daysUntilRenewal = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRenewal <= 60 && daysUntilRenewal > 0;
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
  }

  async deleteCustomer(customer: Customer) {
    if (!confirm(`Delete customer "${customer.company}"? This will also clear the originating lead's converted status. This cannot be undone.`)) return;
    try {
      await this.dataService.deleteCustomer(customer.id);
      this.selectedCustomerIds.update(ids => { const s = new Set(ids); s.delete(customer.id); return s; });
      if (this.selectedCustomer()?.id === customer.id) this.selectedCustomer.set(null);
    } catch (err: any) {
      alert(err?.error?.error || 'Failed to delete customer.');
    }
  }

  // ─── Multi-select ───
  selectedCustomerIds = signal<Set<number>>(new Set());

  isCustomerSelected(id: number): boolean {
    return this.selectedCustomerIds().has(id);
  }

  toggleCustomerSelection(id: number, event?: Event) {
    event?.stopPropagation();
    this.selectedCustomerIds.update(ids => {
      const s = new Set(ids);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  toggleAllCustomers(event: Event) {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    const allIds = this.filteredCustomers().map(c => c.id);
    this.selectedCustomerIds.update(ids => {
      const s = new Set(ids);
      if (checked) allIds.forEach(i => s.add(i));
      else allIds.forEach(i => s.delete(i));
      return s;
    });
  }

  allCustomersSelected = computed(() => {
    const all = this.filteredCustomers();
    if (all.length === 0) return false;
    const selected = this.selectedCustomerIds();
    return all.every(c => selected.has(c.id));
  });

  clearCustomerSelection() {
    this.selectedCustomerIds.set(new Set());
  }

  async deleteSelectedCustomers() {
    const ids = Array.from(this.selectedCustomerIds());
    if (ids.length === 0) return;
    const customers = this.dataService.customers().filter(c => ids.includes(c.id));
    if (!confirm(`Delete ${customers.length} customer${customers.length === 1 ? '' : 's'}? This will also clear the originating leads' converted status. This cannot be undone.`)) return;

    const failures: string[] = [];
    for (const customer of customers) {
      try {
        await this.dataService.deleteCustomer(customer.id);
      } catch (err: any) {
        failures.push(`${customer.company}: ${err?.error?.error || 'failed'}`);
      }
    }
    this.clearCustomerSelection();
    this.dataService.refreshCustomers();
    if (failures.length > 0) {
      alert(`Some deletions failed:\n\n${failures.join('\n')}`);
    }
  }

  private http = inject(HttpClient);

  // Zoho billing signals
  sendingInvoice = signal(false);
  pinging = signal(false);
  zohoStatus = signal<'ok' | 'fail' | ''>('');
  zohoStatusMsg = signal('');

  syncZoho() {
    this.dataService.syncZohoPaymentStatus();
  }

  sendInvoice() {
    const customer = this.selectedCustomer();
    if (!customer) return;
    this.sendingInvoice.set(true);
    this.http.post<any>(`${environment.apiUrl}/customers/${customer.id}/send-invoice`, {}, { withCredentials: true }).subscribe({
      next: (res) => {
        this.sendingInvoice.set(false);
        alert(`Invoice ${res.invoiceNumber} sent to ${customer.email}`);
      },
      error: (err) => {
        this.sendingInvoice.set(false);
        alert(err?.error?.error || 'Failed to send invoice');
      },
    });
  }

  syncingZoho = signal(false);

  syncToZoho() {
    const customer = this.selectedCustomer();
    if (!customer) return;
    this.syncingZoho.set(true);
    this.http.post<any>(`${environment.apiUrl}/customers/${customer.id}/zoho-sync`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.syncingZoho.set(false);
        this.dataService.refreshCustomers();
        alert(`Zoho contact + invoice created for ${customer.company}`);
      },
      error: (err) => {
        this.syncingZoho.set(false);
        alert(err?.error?.error || 'Failed to sync to Zoho');
      },
    });
  }

  testZohoPing() {
    this.pinging.set(true);
    this.zohoStatus.set('');
    this.http.get<any>(`${environment.apiUrl}/admin/zoho/ping`, { withCredentials: true }).subscribe({
      next: (res) => {
        this.pinging.set(false);
        this.zohoStatus.set('ok');
        this.zohoStatusMsg.set(`Connected to ${res.org}`);
      },
      error: (err) => {
        this.pinging.set(false);
        this.zohoStatus.set('fail');
        this.zohoStatusMsg.set(err?.error?.error || 'Connection failed');
      },
    });
  }

  createInvoice() {
    this.newInvoice = { amount: 0, description: '' };
    this.showInvoiceModal.set(true);
  }

  submitInvoice() {
    const customer = this.selectedCustomer();
    if (!customer || !this.newInvoice.amount) return;

    this.dataService.createZohoInvoice(
      customer.id,
      this.newInvoice.amount,
      this.newInvoice.description || 'Invoice'
    );

    // Refresh selected customer
    const updated = this.dataService.customers().find(c => c.id === customer.id);
    if (updated) {
      this.selectedCustomer.set(updated);
    }

    this.showInvoiceModal.set(false);
  }

  markPaid(invoice: { id: string }) {
    const customer = this.selectedCustomer();
    if (!customer) return;

    this.dataService.markInvoicePaid(customer.id, invoice.id);

    // Refresh selected customer
    const updated = this.dataService.customers().find(c => c.id === customer.id);
    if (updated) {
      this.selectedCustomer.set(updated);
    }
  }

  activateCustomer() {
    const customer = this.selectedCustomer();
    if (!customer) return;

    this.dataService.updateCustomer(customer.id, { status: 'active' });

    // Refresh selected customer
    const updated = this.dataService.customers().find(c => c.id === customer.id);
    if (updated) {
      this.selectedCustomer.set(updated);
    }
  }

  updateCustomerField(field: string, value: any) {
    const customer = this.selectedCustomer();
    if (!customer) return;
    // Date inputs emit "YYYY-MM-DD" — convert to ISO datetime so Prisma accepts it
    const dateFields = ['contractStart', 'contractEnd', 'renewalDate'];
    let payload: any = value;
    if (dateFields.includes(field) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      payload = new Date(value + 'T12:00:00').toISOString();
    }
    this.dataService.updateCustomer(customer.id, { [field]: payload });
    this.selectedCustomer.set(this.dataService.customers().find(c => c.id === customer.id) || null);
  }

  viewRelatedProject() {
    // Navigate to projects filtered by customer
    // For now, just close the slideover
    this.selectedCustomer.set(null);
  }

  viewActivityHistory() {
    // Show activity history for this customer's lead
    // For now, just close the slideover
    this.selectedCustomer.set(null);
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
