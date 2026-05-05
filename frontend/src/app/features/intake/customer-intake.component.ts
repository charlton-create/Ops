import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ALL_MODULES, INDUSTRIES, CERT_OPTIONS, SOURCES, MODULE_PRICES } from '../../core/constants/seed.data';
import { IntakeSubmission } from '../../core/models';
import { IconComponent } from '../../shared/icons';

interface IntakeFormData {
  // Step 1
  companyName: string;
  industry: string;
  facilities: number;
  employees: number;
  // Step 2
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  // Step 3
  certifications: string[];
  gfsiBenchmarked: string;
  lastAuditDate: string;
  biggestChallenge: string;
  // Step 4
  modulesOfInterest: string[];
  timeline: string;
  source: string;
  notes: string;
}

@Component({
  selector: 'app-customer-intake',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header
      title="Prospective Customer Intake"
      subtitle="New Lead Capture Form"
      icon="intake"
      gradient="linear-gradient(135deg, #34A125 0%, #166534 100%)"
    ></app-header>

    <div class="intake-content">
      @if (!submitted()) {
        <div class="intake-card">
          <!-- Progress -->
          <div class="progress-header">
            <div class="progress-steps">
              @for (step of steps; track step.number; let i = $index) {
                <div class="step" [class.active]="currentStep() >= step.number" [class.current]="currentStep() === step.number">
                  <div class="step-number">{{ step.number }}</div>
                  <span class="step-label">{{ step.label }}</span>
                </div>
              }
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="(currentStep() / 4) * 100" style="background: var(--color-success)"></div>
            </div>
          </div>

          <!-- Form Steps -->
          <div class="form-content">
            @switch (currentStep()) {
              @case (1) {
                <h2>Company Information</h2>
                <div class="form-group">
                  <label class="form-label">Company Name <span class="required">*</span></label>
                  <input type="text" class="form-input" [(ngModel)]="formData.companyName" placeholder="Enter company name">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Industry <span class="required">*</span></label>
                    <select class="form-select" [(ngModel)]="formData.industry">
                      <option value="">-- Select Industry --</option>
                      @for (ind of industries; track ind) {
                        <option [value]="ind">{{ ind }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Number of Facilities</label>
                    <input type="number" class="form-input" [(ngModel)]="formData.facilities" min="1" placeholder="1">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Number of Employees</label>
                  <input type="number" class="form-input" [(ngModel)]="formData.employees" placeholder="e.g., 150">
                </div>
              }
              @case (2) {
                <h2>Contact Details</h2>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Contact Name <span class="required">*</span></label>
                    <input type="text" class="form-input" [(ngModel)]="formData.contactName" placeholder="Full name">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-input" [(ngModel)]="formData.contactTitle" placeholder="e.g., VP Quality">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Email <span class="required">*</span></label>
                    <input type="email" class="form-input" [(ngModel)]="formData.contactEmail" placeholder="email@company.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-input" [(ngModel)]="formData.contactPhone" placeholder="(555) 123-4567">
                  </div>
                </div>
              }
              @case (3) {
                <h2>Compliance & Certifications</h2>
                <div class="form-group">
                  <label class="form-label">Current Certifications</label>
                  <div class="chip-wrap">
                    @for (cert of certOptions; track cert) {
                      <button
                        type="button"
                        class="chip"
                        [class.selected]="formData.certifications.includes(cert)"
                        (click)="toggleCert(cert)"
                      >
                        @if (formData.certifications.includes(cert)) { ✓ } {{ cert }}
                      </button>
                    }
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">GFSI Benchmarked?</label>
                    <select class="form-select" [(ngModel)]="formData.gfsiBenchmarked">
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Audit Date</label>
                    <input type="date" class="form-input" [(ngModel)]="formData.lastAuditDate">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Biggest Compliance Challenge</label>
                  <textarea class="form-textarea" [(ngModel)]="formData.biggestChallenge" rows="3" placeholder="Describe the main pain points..."></textarea>
                </div>
              }
              @case (4) {
                <h2>Product Interest</h2>
                <div class="form-group">
                  <label class="form-label">Modules of Interest <span class="required">*</span></label>
                  <div class="chip-wrap">
                    @for (mod of modules; track mod) {
                      <button
                        type="button"
                        class="chip"
                        [class.selected]="formData.modulesOfInterest.includes(mod)"
                        (click)="toggleModule(mod)"
                      >
                        @if (formData.modulesOfInterest.includes(mod)) { ✓ } {{ mod }}
                      </button>
                    }
                  </div>
                  <div class="value-calc">
                    Estimated Deal Value: <strong>\${{ calculateValue() | number }}</strong>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Timeline</label>
                    <select class="form-select" [(ngModel)]="formData.timeline">
                      <option value="">-- Select --</option>
                      <option value="Immediate">Immediate (0-30 days)</option>
                      <option value="1-3 months">1-3 months</option>
                      <option value="3-6 months">3-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="Exploring">Just exploring</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">How did you hear about us?</label>
                    <select class="form-select" [(ngModel)]="formData.source">
                      <option value="">-- Select --</option>
                      @for (src of sources; track src) {
                        <option [value]="src">{{ src }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Additional Notes</label>
                  <textarea class="form-textarea" [(ngModel)]="formData.notes" rows="3" placeholder="Any other information..."></textarea>
                </div>
              }
            }
          </div>

          <!-- Navigation -->
          <div class="form-footer">
            <button class="btn-secondary" (click)="prevStep()" [disabled]="currentStep() === 1">
              ← Back
            </button>
            @if (currentStep() < 4) {
              <button class="btn-primary" (click)="nextStep()" [disabled]="!canProceed()">
                Continue →
              </button>
            } @else {
              <button class="btn-success" (click)="submit()" [disabled]="!canSubmit()">
                ✓ Submit Intake
              </button>
            }
          </div>
        </div>
      } @else {
        <!-- Success Screen -->
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2>Intake Submitted Successfully!</h2>
          <p>A new lead has been created for <strong>{{ formData.companyName }}</strong>.</p>
          <p class="success-details">
            Deal Value: <strong>\${{ calculateValue() | number }}</strong><br>
            Assigned to: <strong>David</strong>
          </p>
          <div class="success-actions">
            <button class="btn-secondary" (click)="resetForm()">Submit Another</button>
            <button class="btn-primary" (click)="router.navigate(['/intake/customer'])">View Intake Registry</button>
          </div>
        </div>
      }

      <footer class="intake-footer">
        Prospective Customer Intake Form · Designed by Charlton · v2.0
      </footer>
    </div>
  `,
  styles: [`
    .intake-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .intake-card, .success-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      width: 100%;
      max-width: 700px;
    }

    .progress-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0.5;
    }

    .step.active {
      opacity: 1;
    }

    .step.current .step-number {
      background: var(--color-success);
      color: white;
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--color-gray-200);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .step-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .form-content {
      padding: 1.5rem;
    }

    .form-content h2 {
      margin: 0 0 1.5rem 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .value-calc {
      margin-top: 12px;
      padding: 12px;
      background: var(--status-green-bg);
      border-radius: var(--radius-md);
      color: var(--status-green-text);
      font-size: 0.875rem;
    }

    .form-footer {
      display: flex;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-hairline);
      background: var(--color-gray-50);
    }

    .success-card {
      padding: 3rem;
      text-align: center;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--color-success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin: 0 auto 1.5rem;
    }

    .success-card h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }

    .success-card p {
      color: var(--color-gray-600);
      margin: 0 0 1rem 0;
    }

    .success-details {
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
    }

    .success-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .intake-footer {
      margin-top: auto;
      padding: 1rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    @media (max-width: 640px) {
      .step-label {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .intake-content {
        padding: 0.75rem;
      }

      .intake-card, .success-card {
        max-width: 100%;
      }

      /* Progress steps: compact dots on small screens */
      .progress-header {
        padding: 1rem;
      }

      .progress-steps {
        justify-content: center;
        gap: 12px;
      }

      .step-number {
        width: 32px;
        height: 32px;
        font-size: 0.875rem;
      }

      /* Single-column form layout */
      .form-content {
        padding: 1rem;
      }

      .form-row {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      /* All inputs and selects: 16px prevents iOS zoom, 48px min-height for tap target */
      .form-input,
      .form-select,
      .form-textarea {
        font-size: 16px !important;
        min-height: 48px;
      }

      .form-textarea {
        min-height: 80px;
      }

      /* Chip selectors: larger tap targets, wrapping */
      .chip-wrap {
        gap: 8px;
      }

      .chip {
        min-height: 40px;
        font-size: 0.875rem;
        padding: 6px 14px;
      }

      /* Navigation: sticky bottom bar with full-width buttons */
      .form-footer {
        position: sticky;
        bottom: 0;
        z-index: 10;
        padding: 0.75rem 1rem;
        gap: 10px;
      }

      .form-footer .btn-secondary,
      .form-footer .btn-primary,
      .form-footer .btn-success {
        flex: 1;
        min-height: 52px;
        font-size: 1rem;
        justify-content: center;
      }

      /* Submit button: full width */
      .btn-success {
        width: 100%;
        min-height: 52px;
      }

      /* Success state: centered, breathing room */
      .success-card {
        padding: 2rem 1.25rem;
        text-align: center;
      }

      .success-actions {
        flex-direction: column;
        gap: 10px;
      }

      .success-actions .btn-secondary,
      .success-actions .btn-primary {
        width: 100%;
        min-height: 48px;
        justify-content: center;
      }
    }
  `]
})
export class CustomerIntakeComponent {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  router = inject(Router);

  currentStep = signal(1);
  submitted = signal(false);

  steps = [
    { number: 1, label: 'Company' },
    { number: 2, label: 'Contact' },
    { number: 3, label: 'Compliance' },
    { number: 4, label: 'Interest' }
  ];

  modules = ALL_MODULES;
  industries = INDUSTRIES;
  certOptions = CERT_OPTIONS;
  sources = SOURCES;

  formData: IntakeFormData = {
    companyName: '',
    industry: '',
    facilities: 1,
    employees: 0,
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    certifications: [],
    gfsiBenchmarked: '',
    lastAuditDate: '',
    biggestChallenge: '',
    modulesOfInterest: [],
    timeline: '',
    source: 'Intake Form',
    notes: ''
  };

  toggleCert(cert: string) {
    const idx = this.formData.certifications.indexOf(cert);
    if (idx === -1) {
      this.formData.certifications.push(cert);
    } else {
      this.formData.certifications.splice(idx, 1);
    }
  }

  toggleModule(mod: string) {
    // If Full Platform is selected, clear others
    if (mod === 'Full Platform') {
      this.formData.modulesOfInterest = ['Full Platform'];
      return;
    }
    // If selecting other module while Full Platform is selected, remove Full Platform
    const idx = this.formData.modulesOfInterest.indexOf(mod);
    if (this.formData.modulesOfInterest.includes('Full Platform')) {
      this.formData.modulesOfInterest = [mod];
    } else if (idx === -1) {
      this.formData.modulesOfInterest.push(mod);
    } else {
      this.formData.modulesOfInterest.splice(idx, 1);
    }
  }

  calculateValue(): number {
    return this.formData.modulesOfInterest.reduce((sum, mod) => sum + (MODULE_PRICES[mod] || 0), 0);
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return !!this.formData.companyName && !!this.formData.industry;
      case 2:
        return !!this.formData.contactName && !!this.formData.contactEmail;
      case 3:
        return true;
      default:
        return true;
    }
  }

  canSubmit(): boolean {
    return this.formData.modulesOfInterest.length > 0;
  }

  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  submit() {
    const now = new Date().toISOString();
    const lead = this.dataService.addLead({
      company: this.formData.companyName,
      contact: this.formData.contactName,
      title: this.formData.contactTitle,
      stage: 'Discovery',
      value: this.calculateValue(),
      modules: this.formData.modulesOfInterest,
      certifications: this.formData.certifications,
      facilities: this.formData.facilities,
      owner: this.authService.user()?.name ?? 'User',
      priority: 'medium',
      lastActivity: 'Just now',
      nextAction: 'Send intro email',
      source: this.formData.source || 'Intake Form',
      notes: this.formData.notes ? [{ id: 1, author: 'Intake', content: this.formData.notes, createdAt: now }] : [],
      industry: this.formData.industry,
      email: this.formData.contactEmail,
      phone: this.formData.contactPhone,
      expansions: [],
      intakeStatus: 'completed',
      intakeUpdatedAt: now,
      contacts: [{
        id: 1,
        name: this.formData.contactName,
        role: this.formData.contactTitle,
        email: this.formData.contactEmail,
        phone: this.formData.contactPhone,
        isPrimary: true
      }],
      probability: 5
    });

    // Save full intake form to registry
    this.dataService.addIntakeSubmission({
      submittedAt: now,
      updatedAt: now,
      status: 'submitted',
      interviewedBy: this.authService.user()?.name ?? 'User',
      leadId: lead.id,
      companyName: this.formData.companyName,
      industry: this.formData.industry,
      facilities: this.formData.facilities,
      employees: this.formData.employees,
      contactName: this.formData.contactName,
      contactTitle: this.formData.contactTitle,
      contactEmail: this.formData.contactEmail,
      contactPhone: this.formData.contactPhone,
      certifications: [...this.formData.certifications],
      gfsiBenchmarked: this.formData.gfsiBenchmarked,
      lastAuditDate: this.formData.lastAuditDate,
      biggestChallenge: this.formData.biggestChallenge,
      modulesOfInterest: [...this.formData.modulesOfInterest],
      timeline: this.formData.timeline,
      source: this.formData.source || 'Intake Form',
      notes: this.formData.notes,
    });

    this.submitted.set(true);
  }

  resetForm() {
    this.formData = {
      companyName: '',
      industry: '',
      facilities: 1,
      employees: 0,
      contactName: '',
      contactTitle: '',
      contactEmail: '',
      contactPhone: '',
      certifications: [],
      gfsiBenchmarked: '',
      lastAuditDate: '',
      biggestChallenge: '',
      modulesOfInterest: [],
      timeline: '',
      source: 'Intake Form',
      notes: ''
    };
    this.currentStep.set(1);
    this.submitted.set(false);
  }
}
