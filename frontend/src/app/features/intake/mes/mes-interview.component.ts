import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MESSection, MESField, MESModule } from '../../../core/models';
import { MES_MODULES, MES_AUDIT_MAP } from '../../../core/constants/seed.data';
import { HeaderComponent } from '../../../layout/header.component';
import { IconComponent } from '../../../shared/icons';
import { ComingSoonComponent } from '../../../shared/components/coming-soon/coming-soon.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MesConfigService } from '../../../core/services/mes-config.service';
import { MesIntakeStateService } from '../../../core/services/mes-intake-state.service';
import { MODULE_PRICES } from '../../../core/constants/seed.data';

@Component({
  selector: 'app-mes-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, ComingSoonComponent],
  template: `
    <app-header
      title="MES Interview"
      subtitle="Conducting discovery interview"
      icon="intake"
      gradient="linear-gradient(135deg, #0D9488 0%, #0F766E 100%)"
    >
      <div class="header-progress">
        <span class="progress-text">{{ completedCount() }} / {{ allSections().length }} sections</span>
        <div class="progress-bar-mini">
          <div class="progress-fill-mini" [style.width.%]="progressPercent()"></div>
        </div>
        @if (showSaveIndicator()) {
          <span class="save-indicator">Saved</span>
        }
      </div>
      <div class="timer-group">
        <div class="timer-badge" [class.overtime]="isOvertime()" [class.running]="isTimerRunning()" title="Section time remaining">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ timerDisplay() }}
        </div>
        @if (isTimerRunning()) {
          <div class="timer-overall" title="Total interview elapsed">
            {{ overallTimerDisplay() }} total
          </div>
        }
      </div>
      <button class="btn-secondary btn-sm" (click)="showCheatSheet.set(true)" title="Interview tips & section overview">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Tips
      </button>
      <button class="btn-secondary btn-sm" (click)="openComingSoon('Call Recording', 'Automatically record and store interview calls. Integrates with Zoom, Teams, and Google Meet.')">
        <app-icon name="phone" [size]="14"></app-icon> Record
      </button>
      <button class="btn-secondary btn-sm" (click)="openComingSoon('Transcript Upload', 'Upload call transcripts for AI-powered analysis and automatic form population.')">
        <app-icon name="upload" [size]="14"></app-icon> Transcript
      </button>
      <button class="btn-secondary btn-sm" (click)="exportData()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
        Export
      </button>
      <button class="btn-text btn-sm" (click)="goBack()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </button>
    </app-header>

    <div class="mes-interview">
      <!-- Sidebar -->
      <aside class="mes-sidebar">
        <div class="sidebar-header">
          <h2>Interview Sections</h2>
        </div>

        <div class="section-list">
          @for (section of allSections(); track section.id; let i = $index) {
            <button
              class="section-btn"
              [class.active]="currentSectionIndex() === i"
              [class.completed]="isSectionCompleted(i)"
              [class.module-section]="section.isMod"
              (click)="goToSection(i)"
            >
              <span class="section-icon" [innerHTML]="getSectionIcon(section.id)"></span>
              <span class="section-title">{{ section.title }}</span>
              @if (isSectionCompleted(i)) {
                <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </button>
          }
        </div>

        <div class="sidebar-footer">
          <div class="progress-info">
            <span>{{ completedCount() }} / {{ allSections().length }} sections</span>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progressPercent()"></div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="mes-main">
        <div class="main-header">
          <div class="section-info">
            <span class="section-badge" [class.module-badge]="currentSection().isMod">
              <span [innerHTML]="getSectionIcon(currentSection().id)"></span>
              {{ currentSection().title }}
            </span>
            <p>{{ currentSection().desc }}</p>
          </div>
          <div class="header-actions">
            <button class="btn-icon" [class.active]="isRecording()" (click)="toggleVoice()" title="Voice dictation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </button>
          </div>
        </div>

        @if (isRecording()) {
          <div class="voice-indicator">
            <span class="pulse"></span>
            <span>Listening... speak into your microphone</span>
            <button class="btn-text btn-sm" (click)="toggleVoice()">Stop</button>
          </div>
        }

        <div class="fields-container">
          @for (field of currentSection().fields; track field.id) {
            <div class="field-group" [class.required]="field.required">
              <label class="field-label">
                {{ field.label }}
                @if (field.required) {
                  <span class="required">*</span>
                }
              </label>
              @if (field.hint) {
                <p class="field-hint">{{ field.hint }}</p>
              }

              @switch (field.type) {
                @case ('text') {
                  <input
                    type="text"
                    class="form-input"
                    [placeholder]="field.placeholder || ''"
                    [ngModel]="getFieldValue(field.id)"
                    (ngModelChange)="setFieldValue(field.id, $event)"
                  >
                }
                @case ('textarea') {
                  <textarea
                    class="form-textarea"
                    rows="3"
                    [placeholder]="field.placeholder || ''"
                    [ngModel]="getFieldValue(field.id)"
                    (ngModelChange)="setFieldValue(field.id, $event)"
                  ></textarea>
                }
                @case ('select') {
                  <select
                    class="form-select"
                    [ngModel]="getFieldValue(field.id)"
                    (ngModelChange)="setFieldValue(field.id, $event)"
                  >
                    <option value="">Select...</option>
                    @for (opt of field.options; track opt) {
                      <option [value]="opt">{{ opt }}</option>
                    }
                  </select>
                  @if (getFieldValue(field.id) === 'Other') {
                    <input
                      type="text"
                      class="form-input other-input"
                      placeholder="Please specify..."
                      [ngModel]="getFieldValue(field.id + '_other')"
                      (ngModelChange)="setFieldValue(field.id + '_other', $event)"
                    >
                  }
                }
                @case ('multi') {
                  <div class="multi-select">
                    @for (opt of field.options; track opt) {
                      <label class="chip-option" [class.selected]="isMultiSelected(field.id, opt)">
                        <input
                          type="checkbox"
                          [checked]="isMultiSelected(field.id, opt)"
                          (change)="toggleMulti(field.id, opt)"
                        >
                        <span>{{ opt }}</span>
                      </label>
                    }
                  </div>
                  @if (isMultiSelected(field.id, 'Other')) {
                    <input
                      type="text"
                      class="form-input other-input"
                      placeholder="Please specify..."
                      [ngModel]="getFieldValue(field.id + '_other')"
                      (ngModelChange)="setFieldValue(field.id + '_other', $event)"
                    >
                  }
                }
                @case ('module_select') {
                  <div class="module-select">
                    @for (mod of mesConfig.configuredModules(); track mod.id) {
                      <button
                        class="module-card"
                        [class.selected]="selectedModule() === mod.id"
                        (click)="selectModule(mod.id)"
                      >
                        <span class="mod-icon">
                          <app-icon [name]="moduleIconMap[mod.id] ?? 'briefcase'" [size]="28"></app-icon>
                        </span>
                        <span class="mod-name">{{ mod.name }}</span>
                        <span class="mod-desc">{{ mod.desc }}</span>
                      </button>
                    }
                  </div>
                }
                @case ('audit_dynamic') {
                  <div class="multi-select">
                    @for (opt of getAuditOptions(); track opt) {
                      <label class="chip-option" [class.selected]="isMultiSelected(field.id, opt)">
                        <input
                          type="checkbox"
                          [checked]="isMultiSelected(field.id, opt)"
                          (change)="toggleMulti(field.id, opt)"
                        >
                        <span>{{ opt }}</span>
                      </label>
                    }
                  </div>
                }
                @case ('audit_blocks') {
                  <div class="audit-blocks">
                    @for (block of getAuditBlocks(field.id); let i = $index; track i) {
                      <div class="audit-block-card">
                        <div class="audit-block-header">
                          <span class="audit-block-num">Audit {{ i + 1 }}</span>
                          <button type="button" class="audit-block-remove" (click)="removeAuditBlock(field.id, i)" title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <div class="audit-block-fields">
                          <div class="audit-block-row">
                            <div class="audit-block-field">
                              <label>Audit Type</label>
                              <input type="text" class="form-input" placeholder="e.g., SQF, BRC, Internal, Customer" [ngModel]="block.type" (ngModelChange)="updateAuditBlock(field.id, i, 'type', $event)">
                            </div>
                            <div class="audit-block-field">
                              <label>Frequency</label>
                              <select class="form-select" [ngModel]="block.frequency" (ngModelChange)="updateAuditBlock(field.id, i, 'frequency', $event)">
                                <option value="">Select...</option>
                                <option>Annually</option>
                                <option>Bi-annually</option>
                                <option>Quarterly</option>
                                <option>Monthly</option>
                                <option>Unscheduled</option>
                                <option>One-time</option>
                              </select>
                            </div>
                          </div>
                          <div class="audit-block-row">
                            <div class="audit-block-field">
                              <label>Last Audit Date</label>
                              <input type="date" class="form-input" [ngModel]="block.lastDate" (ngModelChange)="updateAuditBlock(field.id, i, 'lastDate', $event)">
                            </div>
                            <div class="audit-block-field">
                              <label>Conducted By</label>
                              <input type="text" class="form-input" placeholder="e.g., SQF Institute, Customer, Internal team" [ngModel]="block.conductedBy" (ngModelChange)="updateAuditBlock(field.id, i, 'conductedBy', $event)">
                            </div>
                          </div>
                          <div class="audit-block-field audit-block-full">
                            <label>Findings / Notes</label>
                            <textarea class="form-textarea" rows="2" placeholder="Key findings, observations, or open actions..." [ngModel]="block.findings" (ngModelChange)="updateAuditBlock(field.id, i, 'findings', $event)"></textarea>
                          </div>
                        </div>
                      </div>
                    }
                    <button type="button" class="btn-add-audit" (click)="addAuditBlock(field.id)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                      Add Audit
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>

        <div class="nav-footer">
          <button
            class="btn-secondary"
            [disabled]="currentSectionIndex() === 0"
            (click)="prevSection()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Previous
          </button>

          <span class="section-counter">
            {{ currentSectionIndex() + 1 }} / {{ allSections().length }}
          </span>

          @if (currentSectionIndex() < allSections().length - 1) {
            <button class="btn-primary" (click)="nextSection()">
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          } @else {
            <button class="btn-primary btn-success" (click)="completeInterview()">
              Complete
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          }
        </div>
      </main>
    </div>

    <!-- Export Modal -->
    @if (showExportModal()) {
      <div class="modal-overlay" (click)="showExportModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Export Interview Data</h2>
            <button class="modal-close-btn" (click)="showExportModal.set(false)">&#10005;</button>
          </div>
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <button class="export-card" (click)="downloadJSON()">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>JSON</strong>
                <span>Raw data for import</span>
              </button>
              <button class="export-card" (click)="downloadMarkdown()">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>Markdown</strong>
                <span>Formatted .md file</span>
              </button>
              <button class="export-card" (click)="downloadText()">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>Plain Text</strong>
                <span>Simple .txt file</span>
              </button>
              <button class="export-card" (click)="downloadPDF()">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>PDF</strong>
                <span>Print-ready document</span>
              </button>
              <button class="export-card" (click)="openComingSoon('DOCX Export', 'Export interview data as a formatted Word document for stakeholder review.')">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>DOCX</strong>
                <span class="badge badge-gray" style="font-size: 0.625rem;">Coming Soon</span>
              </button>
              <button class="export-card" (click)="copyToClipboard()">
                <app-icon name="clipboard" [size]="24"></app-icon>
                <strong>Clipboard</strong>
                <span>Copy to clipboard</span>
              </button>
            </div>
            <div style="margin-top: 12px;">
              <button class="export-card" style="width: 100%;" (click)="openComingSoon('Google Sheets Export', 'Automatically sync interview data to Google Sheets for team collaboration and reporting.')">
                <app-icon name="file-text" [size]="24"></app-icon>
                <strong>Google Sheets</strong>
                <span>Configure in Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Completion Modal -->
    @if (showCompleteModal()) {
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-body" style="padding: 2rem;">
            @if (completionStep() === 'summary') {
              <div style="text-align: center;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #ECFDF5; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                  <app-icon name="check-circle" [size]="28" style="color: #10B981;"></app-icon>
                </div>
                <h3 style="margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 600;">Interview Complete!</h3>
                <p style="font-size: 0.8125rem; color: var(--color-gray-500); margin: 0 0 1rem;">All sections have been captured.</p>
              </div>
              <div style="background: var(--color-gray-50); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8125rem;">
                  <div><span style="color: var(--color-gray-500);">Company:</span> <strong>{{ formData()['company_name'] || '—' }}</strong></div>
                  <div><span style="color: var(--color-gray-500);">Industry:</span> <strong>{{ formData()['industry_vertical'] || '—' }}</strong></div>
                  <div><span style="color: var(--color-gray-500);">Contact:</span> <strong>{{ formData()['contact_name'] || '—' }}</strong></div>
                  <div><span style="color: var(--color-gray-500);">Interviewer:</span> <strong>{{ formData()['_interviewer'] || '—' }}</strong></div>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="btn-primary" (click)="createLeadFromInterview()">
                  <app-icon name="plus" [size]="16"></app-icon> Create Lead in Sales Pipeline
                </button>
                <button class="btn-secondary" (click)="downloadJSON()">
                  <app-icon name="download" [size]="16"></app-icon> Download Data
                </button>
                <button class="btn-text" (click)="startNew()">Start New Interview</button>
                <button class="btn-text" (click)="goBack()">Return to Landing</button>
              </div>
            } @else {
              <div style="text-align: center;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #ECFDF5; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                  <app-icon name="check-circle" [size]="28" style="color: #10B981;"></app-icon>
                </div>
                <h3 style="margin: 0 0 0.5rem; font-size: 1.125rem; font-weight: 600;">Lead Created!</h3>
                <p style="font-size: 0.8125rem; color: var(--color-gray-500); margin: 0 0 1rem;">
                  {{ formData()['company_name'] }} has been added to the Sales Pipeline at the Discovery stage.
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button class="btn-primary" (click)="router.navigate(['/leads'])">View in Leads</button>
                  <button class="btn-secondary" (click)="router.navigate(['/pipeline'])">View Pipeline</button>
                  <button class="btn-text" (click)="startNew()">Start New Interview</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Resume Draft Prompt -->
    @if (showResumePrompt()) {
      <div class="modal-overlay">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Resume Previous Interview?</h2>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.875rem; color: var(--color-gray-600); margin: 0;">
              A saved interview draft was found. Would you like to continue where you left off?
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="discardDraft()">Start Fresh</button>
            <button class="btn-primary" (click)="resumeDraft()">Resume Interview</button>
          </div>
        </div>
      </div>
    }

    <!-- Interviewer Selection Modal -->
    @if (showInterviewerModal()) {
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Start Interview</h2>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Who is conducting this interview? <span class="required">*</span></label>
              <select class="form-select" [(ngModel)]="selectedInterviewer">
                <option value="">Select interviewer...</option>
                @for (member of teamMembers; track member.id) {
                  <option [value]="member.name">{{ member.name }} - {{ member.role }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Interview Date</label>
              <input type="date" class="form-input" [(ngModel)]="interviewDate">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="goBack()">Cancel</button>
            <button class="btn-primary" [disabled]="!selectedInterviewer" (click)="confirmInterviewer()">
              Begin Interview
            </button>
          </div>
        </div>
      </div>
    }

    <!-- NDA Modal -->
    @if (showNdaModal()) {
      <div class="modal-overlay">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header" style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); color: white;">
            <h2 style="color: white;">Non-Disclosure Agreement</h2>
            <button class="modal-close-btn" style="color: white;" (click)="skipNda()">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body">
            <div style="background: var(--color-gray-50); border-radius: var(--radius-md); padding: 1rem; max-height: 300px; overflow-y: auto; font-size: 0.8125rem; color: var(--color-gray-600); line-height: 1.6; margin-bottom: 1rem;">
              <p><strong>MUTUAL NON-DISCLOSURE AGREEMENT</strong></p>
              <p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between CAT-I.AI Inc. ("CAT-I") and the undersigned party ("Recipient").</p>
              <p><strong>1. Confidential Information.</strong> "Confidential Information" means any technical, business, or operational information disclosed during the MES discovery interview process, including but not limited to: production processes, quality control procedures, compliance documentation, facility layouts, and operational metrics.</p>
              <p><strong>2. Obligations.</strong> Both parties agree to: (a) maintain confidentiality of all shared information; (b) use information solely for evaluating CAT-I platform suitability; (c) not disclose to third parties without written consent.</p>
              <p><strong>3. Duration.</strong> This agreement remains in effect for two (2) years from the date of signing.</p>
              <p><strong>4. Exceptions.</strong> This agreement does not apply to information that: (a) is publicly available; (b) was known prior to disclosure; (c) is independently developed; (d) is required by law to be disclosed.</p>
              <p style="margin-bottom: 0;"><em>Pre-signed on behalf of CAT-I.AI Inc.</em></p>
            </div>
            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.8125rem; cursor: pointer;">
              <input type="checkbox" [checked]="ndaAcknowledged()" (change)="ndaAcknowledged.set(!ndaAcknowledged())" style="margin-top: 3px;">
              <span>I acknowledge that this NDA has been shared with the interviewee and both parties agree to the terms above.</span>
            </label>
          </div>
          <div class="modal-footer">
            <button class="btn-text" (click)="skipNda()">Skip NDA</button>
            <button class="btn-secondary" (click)="openComingSoon('Send NDA via Email', 'Automatically send the NDA document to the interviewee for digital signature.')">
              <app-icon name="mail" [size]="14"></app-icon> Send via Email
            </button>
            <button class="btn-primary" [disabled]="!ndaAcknowledged()" (click)="acknowledgeNda()">NDA Acknowledged</button>
          </div>
        </div>
      </div>
    }

    <!-- Cheat Sheet Modal -->
    @if (showCheatSheet()) {
      <div class="modal-overlay">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Interview Cheat Sheet</h2>
            <button class="modal-close-btn" (click)="showCheatSheet.set(false)">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>
          <div class="modal-body">
            @if (selectedModuleId) {
              <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 4px; font-size: 0.875rem; color: #92400E;">Industry Module Active</h4>
                <p style="margin: 0; font-size: 0.8125rem; color: #78350F;">{{ getModuleName(selectedModuleId) }} — specialized questions will appear in the interview.</p>
              </div>
            }
            <div style="margin-bottom: 1rem;">
              <h4 style="margin: 0 0 8px; font-size: 0.875rem; font-weight: 600;">Interview Tips</h4>
              <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.8125rem; color: var(--color-gray-600); display: flex; flex-direction: column; gap: 6px;">
                <li>Focus on <strong>pain points</strong> in the Company Profile section — this drives the proposal.</li>
                <li>Ask about <strong>current systems</strong> before proposing solutions.</li>
                <li>Capture <strong>production scale</strong> and <strong>facility count</strong> for accurate pricing.</li>
                <li>Note <strong>timeline and budget</strong> in the Wrap-Up section — this determines priority.</li>
                <li>Use <strong>voice dictation</strong> (microphone button) for faster note-taking.</li>
              </ul>
            </div>
            <div>
              <h4 style="margin: 0 0 8px; font-size: 0.875rem; font-weight: 600;">Sections Overview ({{ allSections().length }} total)</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                @for (section of allSections(); track section.id; let i = $index) {
                  <div style="font-size: 0.8125rem; color: var(--color-gray-600); padding: 4px 0;">
                    {{ i + 1 }}. {{ section.title }}
                  </div>
                }
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" (click)="showCheatSheet.set(false)">Got it, Start Interview</button>
          </div>
        </div>
      </div>
    }

    <!-- Coming Soon -->
    <app-coming-soon
      [isOpen]="showComingSoon()"
      [feature]="comingSoonFeature"
      [description]="comingSoonDesc"
      (closed)="showComingSoon.set(false)"
    ></app-coming-soon>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Header Progress */
    .header-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .progress-text {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }

    .progress-bar-mini {
      width: 100px;
      height: 6px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill-mini {
      height: 100%;
      background: white;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .save-indicator {
      font-size: 0.6875rem;
      color: var(--color-success);
      font-weight: 500;
      animation: fadeIn 150ms ease;
    }

    /* Interview Timer */
    .timer-group {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .timer-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      background: rgba(255, 255, 255, 0.18);
      color: rgba(255, 255, 255, 0.8);
      min-width: 72px;
      justify-content: center;
      transition: background 0.3s ease, color 0.3s ease;
    }

    .timer-badge.running {
      color: white;
      background: rgba(255, 255, 255, 0.22);
    }

    .timer-badge.overtime {
      background: rgba(220, 38, 38, 0.15);
      color: var(--color-error-light);
      border: 1px solid rgba(220, 38, 38, 0.35);
      animation: pulse-overtime 1.2s ease-in-out infinite alternate;
    }

    .timer-overall {
      font-size: 0.6875rem;
      font-variant-numeric: tabular-nums;
      color: rgba(255, 255, 255, 0.5);
      padding: 0 4px;
      letter-spacing: 0.01em;
    }

    @keyframes pulse-overtime {
      from { opacity: 1; }
      to { opacity: 0.6; }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .mes-interview {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .mes-sidebar {
      width: 280px;
      background: var(--color-white);
      border-right: 1px solid var(--border-hairline);
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .sidebar-header h2 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .section-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .section-btn:hover {
      background: var(--color-gray-50);
    }

    .section-btn.active {
      background: var(--color-primary-light);
      border: 1px solid var(--color-primary);
    }

    .section-btn.completed .section-title {
      color: var(--color-success);
    }

    .section-btn.module-section {
      border-left: 3px solid var(--color-warning);
      margin-left: 0.5rem;
      width: calc(100% - 0.5rem);
    }

    .section-icon {
      font-size: 1.125rem;
    }

    .section-title {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .check-icon {
      color: var(--color-success);
      font-size: 0.875rem;
    }

    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-hairline);
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .progress-info span {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    /* Main Content */
    .mes-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--color-gray-50);
    }

    .main-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      background: var(--color-white);
      border-bottom: 1px solid var(--border-hairline);
    }

    .section-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--status-blue-bg);
      color: var(--status-blue-text);
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.9375rem;
      width: fit-content;
    }

    .section-badge.module-badge {
      background: var(--status-yellow-bg);
      color: var(--status-yellow-text);
    }

    .section-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      background: var(--color-white);
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-600);
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .btn-icon.active {
      background: var(--color-error);
      border-color: var(--color-error);
      color: white;
    }

    .voice-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      background: var(--status-red-bg);
      color: var(--status-red-text);
      font-size: 0.875rem;
    }

    .pulse {
      width: 10px;
      height: 10px;
      background: var(--color-error);
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .fields-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .field-hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-gray-500);
      line-height: 1.5;
      background: var(--color-gray-50);
      border-left: 2px solid #0D9488;
      padding: 4px 8px;
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    .required {
      color: var(--color-error);
    }

    .other-input {
      margin-top: 0.5rem;
    }

    /* Audit Blocks */
    .audit-blocks {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .audit-block-card {
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .audit-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
    }

    .audit-block-num {
      font-size: 0.75rem;
      font-weight: 600;
      color: #0D9488;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .audit-block-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-gray-400);
      display: flex;
      padding: 2px;
      border-radius: 3px;
      transition: color 0.15s, background 0.15s;
    }

    .audit-block-remove:hover {
      color: var(--color-error);
      background: var(--status-red-bg);
    }

    .audit-block-fields {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .audit-block-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .audit-block-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .audit-block-field label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-gray-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .audit-block-full {
      grid-column: 1 / -1;
    }

    .btn-add-audit {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 0.875rem;
      background: none;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      color: #0D9488;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      width: fit-content;
    }

    .btn-add-audit:hover {
      border-color: #0D9488;
      background: rgba(13, 148, 136, 0.05);
    }

    .multi-select {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chip-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 0.8125rem;
      transition: all 0.15s ease;
    }

    .chip-option:hover {
      border-color: var(--color-primary);
    }

    .chip-option.selected {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .chip-option input {
      display: none;
    }

    .module-select {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .module-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--color-white);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }

    .module-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .module-card.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }

    .mod-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: var(--color-gray-100);
      color: #0D9488;
      transition: all 0.15s ease;
    }

    .module-card:hover .mod-icon,
    .module-card.selected .mod-icon {
      background: #0D9488;
      color: white;
    }

    .mod-name {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
    }

    .mod-desc {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .nav-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--color-white);
      border-top: 1px solid var(--border-hairline);
    }

    .section-counter {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .btn-success {
      background: var(--color-success);
    }

    .btn-success:hover {
      background: var(--status-green-text);
    }

    /* Export Modal */
    .export-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .export-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .export-btn:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-gray-50);
    }

    .export-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .export-icon {
      font-size: 1.5rem;
    }

    .export-title {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
    }

    .export-desc {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .export-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 1rem;
      background: var(--color-gray-50);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    .export-card:hover {
      background: var(--color-white);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }
    .export-card strong {
      font-size: 0.875rem;
      color: var(--color-gray-900);
    }
    .export-card span {
      font-size: 0.6875rem;
      color: var(--color-gray-500);
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .complete-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    /* ============================================================
       MOBILE-FIRST RESPONSIVE STYLES (≤768px)
       Critical for trade show use on iPhone — live discovery flow
       ============================================================ */

    @media (max-width: 768px) {

      /* ── Host / Root ── */
      :host {
        height: 100%;
        overflow: hidden;
      }

      /* ── Overall layout: stack vertically ── */
      .mes-interview {
        flex-direction: column;
        overflow: hidden;
      }

      /* ── Sidebar: hide desktop sidebar, show mobile tab strip ── */
      .mes-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-hairline);
        flex-direction: column;
        flex-shrink: 0;
        max-height: none;
        overflow: visible;
      }

      .sidebar-header {
        display: none; /* Title "Interview Sections" redundant on mobile */
      }

      /* Horizontal scrollable tab strip */
      .section-list {
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.375rem 0.5rem;
        gap: 0.375rem;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none; /* Firefox */
        flex: none;
      }

      .section-list::-webkit-scrollbar {
        display: none; /* Chrome / Safari */
      }

      /* Compact tab pill for each section */
      .section-btn {
        flex-shrink: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 0.375rem 0.625rem;
        min-height: 44px;
        min-width: 56px;
        max-width: 80px;
        border-radius: var(--radius-md);
        font-size: 0.625rem;
        text-align: center;
        width: auto;
      }

      .section-btn.module-section {
        margin-left: 0;
        width: auto;
      }

      .section-icon {
        font-size: 1rem;
        flex-shrink: 0;
      }

      .section-title {
        font-size: 0.5625rem;
        font-weight: 600;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 72px;
        flex: none;
      }

      .check-icon {
        display: none; /* too cluttered in compact tab */
      }

      /* Progress bar in sidebar footer: hide on mobile (shown in header already) */
      .sidebar-footer {
        display: none;
      }

      /* ── Main content: full width ── */
      .mes-main {
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }

      /* Main header — tighter padding on mobile */
      .main-header {
        padding: 0.75rem 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .section-info {
        flex: 1;
        min-width: 0;
      }

      .section-badge {
        font-size: 0.8125rem;
        padding: 0.375rem 0.75rem;
      }

      .section-info p {
        font-size: 0.75rem;
        margin-top: 2px;
      }

      .header-actions {
        flex-shrink: 0;
      }

      /* Voice button: keep 44×44 minimum touch target */
      .btn-icon {
        width: 44px;
        height: 44px;
      }

      /* ── Fields container ── */
      .fields-container {
        padding: 0.875rem 1rem;
        gap: 1rem;
        /* Leave room for sticky nav footer (56px) */
        padding-bottom: calc(56px + 0.875rem);
      }

      /* ── Form inputs: prevent iOS auto-zoom + large touch targets ── */
      .form-input,
      .form-select,
      .form-textarea,
      input[type="text"],
      input[type="date"],
      input[type="email"],
      input[type="number"],
      input[type="tel"],
      select,
      textarea {
        font-size: 16px !important; /* iOS zoom prevention */
        min-height: 48px;
        border-radius: var(--radius-md);
      }

      .form-textarea,
      textarea {
        min-height: 80px;
      }

      .form-select,
      select {
        width: 100%;
      }

      /* ── Chips / multi-select ── */
      .multi-select {
        gap: 0.5rem;
      }

      .chip-option {
        min-height: 40px;
        padding: 0.5rem 0.875rem;
        font-size: 0.875rem;
      }

      /* ── Module cards: 2-column grid ── */
      .module-select {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .module-card {
        padding: 1rem 0.75rem;
      }

      .mod-icon {
        width: 44px;
        height: 44px;
      }

      .mod-name {
        font-size: 0.8125rem;
      }

      .mod-desc {
        font-size: 0.6875rem;
      }

      /* ── Audit blocks: single column on mobile ── */
      .audit-block-row {
        grid-template-columns: 1fr;
      }

      .audit-block-remove {
        min-width: 32px;
        min-height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Add Audit button: full width on mobile */
      .btn-add-audit {
        width: 100%;
        justify-content: center;
        min-height: 44px;
        font-size: 0.875rem;
      }

      /* ── Sticky bottom navigation ── */
      .nav-footer {
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 0;
        border-top: 1px solid var(--border-hairline);
        background: var(--color-white);
        /* iOS safe area */
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      .nav-footer > * {
        /* Lay out children as full-width row */
      }

      /* Override default nav-footer flex to make buttons full-width */
      .nav-footer {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: stretch;
        gap: 0;
      }

      .nav-footer .btn-secondary,
      .nav-footer .btn-primary,
      .nav-footer .btn-success {
        height: 56px;
        border-radius: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        border: none;
        border-top: none;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .nav-footer .btn-secondary {
        border-right: 1px solid var(--border-hairline);
        color: var(--color-gray-700);
        background: var(--color-gray-50);
      }

      .nav-footer .btn-secondary:disabled {
        opacity: 0.35;
      }

      .nav-footer .btn-primary,
      .nav-footer .btn-success {
        border-left: 1px solid rgba(255,255,255,0.15);
      }

      .section-counter {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-gray-500);
        padding: 0 0.5rem;
        white-space: nowrap;
      }

      /* ── Header: compact timer and progress ── */
      .header-progress {
        gap: 0.5rem;
      }

      .progress-bar-mini {
        width: 60px;
      }

      .progress-text {
        font-size: 0.6875rem;
      }

      .timer-group {
        align-items: flex-end;
        gap: 1px;
      }

      .timer-badge {
        font-size: 0.6875rem;
        padding: 3px 7px;
        min-width: 56px;
      }

      .timer-overall {
        font-size: 0.5625rem;
      }

      /* ── Voice indicator ── */
      .voice-indicator {
        padding: 0.5rem 1rem;
        font-size: 0.8125rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      /* ── Export modal grid: single column on small screens ── */
      .modal-container {
        max-width: calc(100vw - 2rem);
        margin: 1rem;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
      }

      /* Force export grid to single column */
      .modal-body [style*="grid-template-columns: 1fr 1fr"] {
        /* Cannot override inline style directly; handled by .export-card width below */
        display: flex !important;
        flex-wrap: wrap;
        gap: 10px;
      }

      .export-card {
        min-height: 72px;
        flex: 1 1 calc(50% - 5px);
        min-width: calc(50% - 5px);
      }

      /* Completion modal: full-width action buttons */
      .modal-body .btn-primary,
      .modal-body .btn-secondary,
      .modal-footer .btn-primary,
      .modal-footer .btn-secondary {
        min-height: 48px;
        font-size: 0.9375rem;
      }

      /* ── Field labels and hints ── */
      .field-label {
        font-size: 0.9375rem;
      }

      .field-hint {
        font-size: 0.8125rem;
      }

      /* All generic clickable elements: minimum 44px touch target */
      button:not(.chip-option):not(.section-btn):not(.modal-close-btn) {
        min-height: 44px;
      }

    } /* end @media (max-width: 768px) */

    /* Extra-small phones (≤390px, iPhone SE / 13 mini) */
    @media (max-width: 390px) {

      .section-btn {
        min-width: 48px;
        max-width: 64px;
        padding: 0.3rem 0.4rem;
      }

      .section-title {
        font-size: 0.5rem;
        max-width: 56px;
      }

      .module-select {
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .fields-container {
        padding: 0.75rem 0.75rem calc(56px + 0.75rem);
      }

      .main-header {
        padding: 0.625rem 0.75rem;
      }

    } /* end @media (max-width: 390px) */
  `]
})
export class MesInterviewComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  mesConfig = inject(MesConfigService);
  mesIntakeState = inject(MesIntakeStateService);

  // Timer — section-based (primary) + overall elapsed (secondary)
  sectionElapsedSeconds = signal(0);
  overallElapsedSeconds = signal(0);
  isTimerRunning = signal(false);
  private timerInterval: any = null;

  /** Allocated seconds for the currently visible section, sourced from Admin Config */
  sectionAllocatedSeconds = computed(() => {
    const section = this.allSections()[this.currentSectionIndex()];
    const minutes = section ? this.mesConfig.getTimingForSection(section.id) : 3;
    return minutes * 60;
  });

  sectionRemainingSeconds = computed(() =>
    this.sectionAllocatedSeconds() - this.sectionElapsedSeconds()
  );

  isOvertime = computed(() => this.sectionRemainingSeconds() < 0);

  /** Primary display: section countdown (or static budget before interview starts) */
  timerDisplay = computed(() => {
    if (!this.isTimerRunning()) {
      const total = this.sectionAllocatedSeconds();
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    const rem = this.sectionRemainingSeconds();
    const abs = Math.abs(rem);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const fmt = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return rem < 0 ? `-${fmt}` : fmt;
  });

  /** Secondary display: total elapsed time across the full interview */
  overallTimerDisplay = computed(() => {
    const t = this.overallElapsedSeconds();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  // State
  currentSectionIndex = signal(0);
  formData = signal<Record<string, any>>({});
  selectedModule = signal<string | null>(null);
  isRecording = signal(false);
  showExportModal = signal(false);
  showCompleteModal = signal(false);
  showInterviewerModal = signal(true); // Show on start

  // Autosave
  private saveTimer: any;
  showSaveIndicator = signal(false);
  showResumePrompt = signal(false);
  private draftKey = '';

  // Coming Soon
  showComingSoon = signal(false);
  comingSoonFeature = '';
  comingSoonDesc = '';

  // Completion
  completionStep = signal<'summary' | 'lead-created'>('summary');
  createdLeadId = 0;

  // Cheat Sheet
  showCheatSheet = signal(false);

  // NDA
  showNdaModal = signal(false);
  ndaAcknowledged = signal(false);
  showNdaComingSoon = signal(false);

  readonly moduleIconMap: Record<string, string> = {
    m_coffee: 'coffee', m_food: 'utensils', m_pharma: 'pill',
    m_plastics: 'layers', m_metal: 'wrench', m_elec: 'cpu', m_chem: 'flask',
  };

  // Module ID (plain string for use in lead creation etc.)
  selectedModuleId = '';

  // Interviewer
  selectedInterviewer = '';
  interviewDate = new Date().toISOString().split('T')[0];
  get teamMembers() { return this.dataService.team(); }

  // Data — sections and modules come from the service (respects admin visibility config)

  // Section icons mapping
  private sectionIcons: Record<string, string> = {
    'company': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
    'production': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m16.24 7.76-2.12 2.12"/><path d="M20 12h-4"/><path d="m16.24 16.24-2.12-2.12"/><path d="M12 20v-4"/><path d="m7.76 16.24 2.12-2.12"/><path d="M4 12h4"/><path d="m7.76 7.76 2.12 2.12"/></svg>',
    'products': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    'qc': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/><path d="M12.5 2H12c-5 0-9 4-9 9s4 9 9 9 9-4 9-9c0-1-.2-2-.5-3"/><path d="M17 3a2.85 2.83 0 1 1 4 4L12 16l-4 1 1-4Z"/></svg>',
    'team': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>',
    'inventory': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    'downtime': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    'integration': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>',
    'audits': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="m9 14 2 2 4-4"/></svg>',
    'summary': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    // Industry modules
    'm_coffee': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>',
    'm_food': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    'm_pharma': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
    'm_plastics': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h4l-1.5 9H15"/><path d="M10 4H6l1.5 9H9"/><path d="M18 4h1"/><path d="M5 4h1"/><path d="M7 13h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z"/><path d="M9 19v2"/><path d="M15 19v2"/></svg>',
    'm_metal': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h-4v6h4V4Z"/><path d="M10 10H4v4h6v-4Z"/><path d="M20 10h-6v4h6v-4Z"/><path d="M14 14h-4v6h4v-6Z"/></svg>',
    'm_elec': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
    'm_chem': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>'
  };

  // Speech recognition
  private recognition: any = null;
  private currentField: string | null = null;

  constructor(public router: Router) {}

  ngOnInit() {
    // Sync sections from the admin-saved config so visibility changes are respected
    this.mesConfig.refreshSections();

    // Pre-fill from a re-opened intake submission
    const pending = this.mesIntakeState.pendingSubmission();
    if (pending) {
      this.prefillFromSubmission(pending);
      this.mesIntakeState.clear();
    } else {
      this.checkForDraft();
    }

    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');

        if (this.currentField) {
          this.setFieldValue(this.currentField, transcript);
        }
      };

      this.recognition.onerror = () => {
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        if (this.isRecording()) {
          this.recognition.start();
        }
      };
    }
  }

  ngOnDestroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.stopTimer();
  }

  // ── Timer ────────────────────────────────────────────
  startTimer() {
    if (this.timerInterval) return;
    this.sectionElapsedSeconds.set(0);
    this.overallElapsedSeconds.set(0);
    this.isTimerRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.sectionElapsedSeconds.update(s => s + 1);
      this.overallElapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  private resetSectionTimer() {
    this.sectionElapsedSeconds.set(0);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning.set(false);
  }

  // ── Pre-fill from saved submission ──────────────────
  private prefillFromSubmission(sub: import('../../../core/models').IntakeSubmission) {
    const fd: Record<string, any> = {
      company_name: sub.companyName,
      industry_vertical: sub.industry,
      contact_name: sub.contactName,
      contact_email: sub.contactEmail,
      contact_phone: sub.contactPhone || '',
      certifications: [...sub.certifications],
      pain: sub.biggestChallenge || '',
      _prefilled_from_intake: sub.id,
    };
    this.formData.set(fd);
  }

  // Computed values
  allSections = computed(() => {
    const sections = [...this.mesConfig.configuredSections()];
    const modId = this.selectedModule();

    if (modId) {
      const mod = this.mesConfig.configuredModules().find(m => m.id === modId);
      if (mod) {
        const moduleSection: MESSection = {
          id: mod.id,
          title: mod.name,
          icon: mod.icon,
          desc: mod.desc,
          fields: mod.fields,
          isMod: true
        };
        // Insert module section after Company Profile (index 1)
        sections.splice(1, 0, moduleSection);
      }
    }

    return sections;
  });

  currentSection = computed(() => this.allSections()[this.currentSectionIndex()]);

  completedCount = computed(() => {
    const data = this.formData();
    let count = 0;

    for (const section of this.allSections()) {
      const hasData = section.fields.some(f => {
        const val = data[f.id];
        return val && (Array.isArray(val) ? val.length > 0 : val.toString().trim());
      });
      if (hasData) count++;
    }

    return count;
  });

  progressPercent = computed(() => {
    return Math.round((this.completedCount() / this.allSections().length) * 100);
  });

  // Methods
  goBack() {
    this.router.navigate(['/intake/mes']);
  }

  confirmInterviewer() {
    if (this.selectedInterviewer) {
      this.showInterviewerModal.set(false);
      // Store interviewer info in form data
      this.setFieldValue('_interviewer', this.selectedInterviewer);
      this.setFieldValue('_interview_date', this.interviewDate);
      this.draftKey = `mes-interview-draft-${this.formData()['_interviewer']}-${this.formData()['_interview_date'] || 'today'}`;
      this.showNdaModal.set(true);
      this.startTimer();
    }
  }

  acknowledgeNda() {
    this.showNdaModal.set(false);
    // Go straight into interview — cheat sheet available via Tips button
    this.formData.update(fd => ({ ...fd, '_nda_acknowledged': true, '_nda_date': new Date().toISOString() }));
  }

  skipNda() {
    this.showNdaModal.set(false);
    // Go straight into interview
  }

  getSectionIcon(sectionId: string): string {
    return this.sectionIcons[sectionId] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
  }

  goToSection(index: number) {
    this.currentSectionIndex.set(index);
    if (this.isTimerRunning()) this.resetSectionTimer();
  }

  prevSection() {
    if (this.currentSectionIndex() > 0) {
      this.currentSectionIndex.update(i => i - 1);
      if (this.isTimerRunning()) this.resetSectionTimer();
    }
  }

  nextSection() {
    if (this.currentSectionIndex() < this.allSections().length - 1) {
      this.currentSectionIndex.update(i => i + 1);
      if (this.isTimerRunning()) this.resetSectionTimer();
    }
  }

  isSectionCompleted(index: number): boolean {
    const section = this.allSections()[index];
    const data = this.formData();

    return section.fields.some(f => {
      const val = data[f.id];
      if (!val) return false;
      if (f.type === 'audit_blocks') return Array.isArray(val) && val.length > 0;
      return Array.isArray(val) ? val.length > 0 : val.toString().trim().length > 0;
    });
  }

  getFieldValue(fieldId: string): any {
    return this.formData()[fieldId] || '';
  }

  setFieldValue(fieldId: string, value: any) {
    this.formData.update(data => ({ ...data, [fieldId]: value }));
    this.triggerAutosave();
  }

  isMultiSelected(fieldId: string, option: string): boolean {
    const values = this.formData()[fieldId] || [];
    return Array.isArray(values) && values.includes(option);
  }

  toggleMulti(fieldId: string, option: string) {
    const current = this.formData()[fieldId] || [];
    const values = Array.isArray(current) ? [...current] : [];

    const index = values.indexOf(option);
    if (index > -1) {
      values.splice(index, 1);
    } else {
      values.push(option);
    }

    this.setFieldValue(fieldId, values);
  }

  selectModule(modId: string) {
    this.selectedModule.set(this.selectedModule() === modId ? null : modId);
    this.selectedModuleId = this.selectedModule() || '';
  }

  getAuditOptions(): string[] {
    const modId = this.selectedModule();
    const universal = MES_AUDIT_MAP['_u'] || [];
    const specific = modId ? (MES_AUDIT_MAP[modId] || []) : [];
    return [...new Set([...universal, ...specific])];
  }

  // ── Audit Blocks ─────────────────────────────────────
  getAuditBlocks(fieldId: string): any[] {
    const val = this.formData()[fieldId];
    return Array.isArray(val) ? val : [];
  }

  addAuditBlock(fieldId: string) {
    const blocks = [...this.getAuditBlocks(fieldId)];
    blocks.push({ type: '', frequency: '', lastDate: '', conductedBy: '', findings: '' });
    this.setFieldValue(fieldId, blocks);
  }

  removeAuditBlock(fieldId: string, index: number) {
    const blocks = [...this.getAuditBlocks(fieldId)];
    blocks.splice(index, 1);
    this.setFieldValue(fieldId, blocks);
  }

  updateAuditBlock(fieldId: string, index: number, key: string, value: string) {
    const blocks = this.getAuditBlocks(fieldId).map((b, i) =>
      i === index ? { ...b, [key]: value } : b
    );
    this.setFieldValue(fieldId, blocks);
  }

  toggleVoice() {
    if (!this.recognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isRecording()) {
      this.recognition.stop();
      this.isRecording.set(false);
      this.currentField = null;
    } else {
      // Find first text/textarea field in current section
      const textField = this.currentSection().fields.find(f =>
        f.type === 'text' || f.type === 'textarea'
      );

      if (textField) {
        this.currentField = textField.id;
        this.recognition.start();
        this.isRecording.set(true);
      }
    }
  }

  exportData() {
    this.showExportModal.set(true);
  }

  downloadJSON() {
    const data = {
      timestamp: new Date().toISOString(),
      interviewer: this.selectedInterviewer,
      interviewDate: this.interviewDate,
      selectedModule: this.selectedModule(),
      sections: this.allSections().map(s => ({
        id: s.id,
        title: s.title,
        fields: s.fields.map(f => ({
          id: f.id,
          label: f.label,
          value: this.formData()[f.id] || null
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-intake-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showExportModal.set(false);
  }

  copyToClipboard() {
    const data = this.allSections().map(s => {
      const fields = s.fields.map(f => {
        const val = this.formData()[f.id];
        const displayVal = Array.isArray(val) ? val.join(', ') : (val || '\u2014');
        return `  ${f.label}: ${displayVal}`;
      }).join('\n');
      return `## ${s.icon} ${s.title}\n${fields}`;
    }).join('\n\n');

    navigator.clipboard.writeText(data).then(() => {
      alert('Copied to clipboard!');
    });
    this.showExportModal.set(false);
  }

  completeInterview() {
    this.completionStep.set('summary');
    this.showCompleteModal.set(true);
  }

  startNew() {
    this.formData.set({});
    this.selectedModule.set(null);
    this.selectedModuleId = '';
    this.currentSectionIndex.set(0);
    this.showCompleteModal.set(false);
    this.selectedInterviewer = '';
    this.interviewDate = new Date().toISOString().split('T')[0];
    this.showInterviewerModal.set(true);
    this.completionStep.set('summary');
    this.clearDraft();
  }

  // Coming Soon
  openComingSoon(feature: string, desc: string) {
    this.comingSoonFeature = feature;
    this.comingSoonDesc = desc;
    this.showComingSoon.set(true);
  }

  // Lead creation
  createLeadFromInterview() {
    const fd = this.formData();
    const lead = this.dataService.createLeadFromInterview(fd, {
      interviewer: fd['_interviewer'] || (this.authService.user()?.name ?? 'User'),
      date: fd['_interview_date'] || new Date().toISOString().split('T')[0],
      module: this.selectedModuleId || undefined,
    });
    this.createdLeadId = lead?.id ?? 0;
    this.completionStep.set('lead-created');
    this.clearDraft();
  }

  // Autosave
  private triggerAutosave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveDraft(), 500);
  }

  private saveDraft() {
    if (!this.draftKey) return;
    const draft = {
      formData: this.formData(),
      sectionIndex: this.currentSectionIndex(),
      interviewer: this.formData()['_interviewer'],
      date: this.formData()['_interview_date'],
      module: this.selectedModuleId,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(draft));
      this.showSaveIndicator.set(true);
      setTimeout(() => this.showSaveIndicator.set(false), 1500);
    } catch (e) { /* localStorage full or unavailable */ }
  }

  private checkForDraft() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mes-interview-draft-'));
    if (keys.length > 0) {
      this.draftKey = keys[0];
      this.showResumePrompt.set(true);
    }
  }

  resumeDraft() {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      this.formData.set(draft.formData || {});
      this.currentSectionIndex.set(draft.sectionIndex || 0);
      if (draft.module) this.selectedModuleId = draft.module;
      this.showResumePrompt.set(false);
      this.showInterviewerModal.set(false);
    } catch (e) {
      this.showResumePrompt.set(false);
    }
  }

  discardDraft() {
    if (this.draftKey) localStorage.removeItem(this.draftKey);
    this.showResumePrompt.set(false);
  }

  private clearDraft() {
    if (this.draftKey) localStorage.removeItem(this.draftKey);
  }

  // Cheat sheet helper
  getModuleName(modId: string): string {
    const mod = MES_MODULES.find(m => m.id === modId);
    return mod?.name || modId;
  }

  // Export methods
  downloadMarkdown() {
    const md = this.buildMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-interview-${this.formData()['company_name'] || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showExportModal.set(false);
  }

  downloadText() {
    const text = this.buildPlainText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-interview-${this.formData()['company_name'] || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showExportModal.set(false);
  }

  downloadPDF() {
    // Use browser print dialog with print-optimized content
    const md = this.buildMarkdown();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>MES Interview - ${this.formData()['company_name'] || 'Export'}</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; padding: 2rem; font-size: 12px; line-height: 1.6; color: #111827; }
        h1 { font-size: 18px; border-bottom: 2px solid #0D9488; padding-bottom: 8px; }
        h2 { font-size: 14px; color: #0D9488; margin-top: 1.5rem; }
        h3 { font-size: 12px; color: #374151; }
        pre { white-space: pre-wrap; }
        .meta { color: #6B7280; font-size: 11px; }
      </style></head><body>
      <h1>MES Discovery Interview</h1>
      <p class="meta">Company: ${this.formData()['company_name'] || '\u2014'} | Interviewer: ${this.formData()['_interviewer'] || '\u2014'} | Date: ${this.formData()['_interview_date'] || '\u2014'}</p>
      <pre>${md}</pre>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    this.showExportModal.set(false);
  }

  private buildPlainText(): string {
    const lines: string[] = [];
    lines.push('MES DISCOVERY INTERVIEW');
    lines.push('=======================');
    lines.push(`Company: ${this.formData()['company_name'] || '\u2014'}`);
    lines.push(`Interviewer: ${this.formData()['_interviewer'] || '\u2014'}`);
    lines.push(`Date: ${this.formData()['_interview_date'] || '\u2014'}`);
    lines.push('');

    for (const section of this.allSections()) {
      lines.push(`--- ${section.title} ---`);
      for (const field of section.fields) {
        const val = this.getFieldValue(field.id);
        if (val && (!Array.isArray(val) || val.length > 0)) {
          lines.push(`${field.label}: ${Array.isArray(val) ? val.join(', ') : val}`);
        }
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  private buildMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# MES Discovery Interview`);
    lines.push('');
    lines.push(`**Company:** ${this.formData()['company_name'] || '\u2014'}`);
    lines.push(`**Interviewer:** ${this.formData()['_interviewer'] || '\u2014'}`);
    lines.push(`**Date:** ${this.formData()['_interview_date'] || '\u2014'}`);
    lines.push('');

    for (const section of this.allSections()) {
      lines.push(`## ${section.title}`);
      lines.push('');
      for (const field of section.fields) {
        const val = this.getFieldValue(field.id);
        if (val && (!Array.isArray(val) || val.length > 0)) {
          lines.push(`**${field.label}:** ${Array.isArray(val) ? val.join(', ') : val}`);
        }
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}
