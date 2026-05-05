import { Component, signal, computed, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailCampaign, EmailAudience, ContentPiece, PIPELINE_STAGES, EmailTemplate, CampaignEditableBlocks } from '../../core/models';
import { EmailTemplateService } from '../../core/services/email-template.service';
import { ALL_MODULES, EMAIL_TEMPLATES } from '../../core/constants/seed.data';
import { IconComponent } from '../../shared/icons';
import { TeamUtilService } from '../../shared/utils/team.service';

interface FromOption {
  name: string;
  email: string;
  role: string;
  display: string;
}

interface MergeField {
  label: string;
  token: string;
}

@Component({
  selector: 'app-content-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="campaigns-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Email Campaigns</h1>
          <p class="subtitle">Create and manage email campaigns to your leads</p>
          <span class="integration-pill">
            <app-icon name="link" [size]="12"></app-icon> Resend Ready
          </span>
        </div>
        <button class="btn-primary" (click)="openNewCampaignModal()">+ New Campaign</button>
      </div>

      <!-- KPIs -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">{{ totalCampaigns() }}</div>
          <div class="kpi-label">Total Campaigns</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ draftCount() }}</div>
          <div class="kpi-label">Drafts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ scheduledCount() }}</div>
          <div class="kpi-label">Scheduled</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ sentCount() }}</div>
          <div class="kpi-label">Sent</div>
        </div>
      </div>

      <!-- Campaigns List -->
      <div class="campaigns-list">
        <table class="campaigns-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>From</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Type</th>
              <th>Audience</th>
              <th>Recipients</th>
              <th>Opens</th>
              <th>Clicks</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (campaign of campaigns(); track campaign.id) {
              <tr (click)="openCampaignDetail(campaign)">
                <td class="name-cell">
                  <span class="campaign-name">{{ campaign.name }}</span>
                  @if (getLinkedContent(campaign.contentPieceId)) {
                    <span class="linked-content">Linked to: {{ getLinkedContent(campaign.contentPieceId)?.title }}</span>
                  }
                </td>
                <td class="from-cell">{{ campaign.fromName }}</td>
                <td class="subject-cell">{{ campaign.subject }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + campaign.status.toLowerCase()">{{ campaign.status }}</span>
                </td>
                <td>
                  @if (campaign.emailType) {
                    <span class="badge" [class]="'badge-' + getEmailTypeBadge(campaign.emailType)">{{ campaign.emailType }}</span>
                  }
                </td>
                <td class="audience-cell">{{ formatAudience(campaign.audience) }}</td>
                <td class="num-cell">{{ campaign.recipients }}</td>
                <td class="num-cell">
                  @if (campaign.opens !== undefined) {
                    {{ campaign.opens }} ({{ getOpenRate(campaign) }}%)
                  } @else { — }
                </td>
                <td class="num-cell">
                  @if (campaign.clicks !== undefined) {
                    {{ campaign.clicks }} ({{ getClickRate(campaign) }}%)
                  } @else { — }
                </td>
                <td class="date-cell">{{ formatDate(campaign.sentDate || campaign.scheduledDate) }}</td>
                <td class="actions-cell">
                  @if (campaign.status === 'Draft') {
                    <button class="action-btn" (click)="editCampaign(campaign); $event.stopPropagation()" title="Edit">
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/><path d="M12.5 2.5a1.5 1.5 0 0 1 2 2L8 11l-3 1 1-3 6.5-6.5z"/></svg>
                    </button>
                    <button class="action-btn" (click)="scheduleCampaign(campaign); $event.stopPropagation()" title="Schedule">
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="10" height="10" rx="1"/><line x1="3" y1="7" x2="13" y2="7"/><line x1="6" y1="2" x2="6" y2="5"/><line x1="10" y1="2" x2="10" y2="5"/></svg>
                    </button>
                  }
                  @if (campaign.status === 'Scheduled') {
                    <button class="action-btn send" (click)="sendCampaign(campaign); $event.stopPropagation()" title="Send Now">
                      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" transform="scale(0.65)"/></svg>
                    </button>
                  }
                  <button class="action-btn delete" (click)="deleteCampaign(campaign); $event.stopPropagation()" title="Delete">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
                  </button>
                </td>
              </tr>
            }
            @if (campaigns().length === 0) {
              <tr>
                <td colspan="11" class="empty-state">No campaigns yet. Create your first campaign!</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Campaign Detail Modal -->
      @if (selectedCampaign()) {
        <div class="modal-backdrop" (click)="closeDetail()"></div>
        <div class="modal xlarge">
          <div class="modal-header">
            <h2>{{ selectedCampaign()!.name }}</h2>
            <button class="close-btn" (click)="closeDetail()">&times;</button>
          </div>
          <div class="modal-body preview-mode">
            <div class="detail-meta">
              <span class="status-badge large" [class]="'status-' + selectedCampaign()!.status.toLowerCase()">{{ selectedCampaign()!.status }}</span>
              <span class="meta-item">From: {{ selectedCampaign()!.fromName }} &lt;{{ selectedCampaign()!.fromEmail }}&gt;</span>
              <span class="meta-item">Recipients: {{ selectedCampaign()!.recipients }}</span>
              @if (selectedCampaign()!.scheduledDate) {
                <span class="meta-item">Scheduled: {{ formatDate(selectedCampaign()!.scheduledDate) }}</span>
              }
            </div>

            <!-- Detail tabs: Preview / Recipients -->
            <div class="detail-tabs">
              <button class="detail-tab" [class.active]="detailTab() === 'preview'" (click)="detailTab.set('preview')">Preview</button>
              @if (selectedCampaign()!.status === 'Sent') {
                <button class="detail-tab" [class.active]="detailTab() === 'recipients'" (click)="detailTab.set('recipients'); loadRecipients(selectedCampaign()!.id)">
                  Recipients
                  @if (campaignRecipients().length > 0) {
                    <span class="tab-count">{{ campaignRecipients().length }}</span>
                  }
                </button>
              }
            </div>

            @if (detailTab() === 'preview') {
              <div class="email-preview-container" [innerHTML]="renderCampaignPreview(selectedCampaign()!)"></div>
            }

            @if (detailTab() === 'recipients') {
              <div class="recipients-section">
                <div class="recipients-summary">
                  <span class="recip-stat">
                    <span class="recip-dot sent"></span>
                    {{ recipientStats().sent }} sent
                  </span>
                  <span class="recip-stat">
                    <span class="recip-dot failed"></span>
                    {{ recipientStats().failed }} failed
                  </span>
                  <span class="recip-stat">
                    <span class="recip-dot reminded"></span>
                    {{ recipientStats().reminded }} reminded
                  </span>
                </div>

                <div class="recipients-table">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" [checked]="allRecipientsSelected()" (change)="toggleAllRecipients($event)">
                        </th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Sent</th>
                        <th>Reminded</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of campaignRecipients(); track r.id) {
                        <tr>
                          <td>
                            <input type="checkbox" [checked]="selectedRecipientIds().has(r.id)" (change)="toggleRecipient(r.id)">
                          </td>
                          <td>{{ r.email }}</td>
                          <td>
                            <span class="badge" [class]="'badge-' + getRecipientBadge(r.status)">{{ r.status }}</span>
                          </td>
                          <td>{{ r.sentAt | date:'MMM d, h:mm a' }}</td>
                          <td>{{ r.remindedAt ? (r.remindedAt | date:'MMM d, h:mm a') : '—' }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="5" style="text-align:center;color:#9CA3AF;padding:20px;">No recipients tracked</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
          <div class="modal-footer">
            @if (selectedCampaign()!.status === 'Draft') {
              <button class="btn-primary" (click)="editCampaign(selectedCampaign()!); closeDetail()">Edit</button>
              <button class="btn-secondary" (click)="scheduleCampaign(selectedCampaign()!); closeDetail()">Schedule</button>
            }
            @if (selectedCampaign()!.status === 'Scheduled') {
              <button class="btn-primary" (click)="sendCampaign(selectedCampaign()!); closeDetail()">Send Now</button>
            }
            @if (selectedCampaign()!.status === 'Sent') {
              <button class="btn-primary" (click)="sendReminder()" [disabled]="sendingReminder() || selectedRecipientIds().size === 0">
                {{ sendingReminder() ? 'Sending...' : 'Send Reminder (' + selectedRecipientIds().size + ')' }}
              </button>
              <button class="btn-secondary" (click)="selectAllSentRecipients()">Select All Sent</button>
            }
            <button class="btn-secondary" (click)="closeDetail()">Close</button>
          </div>
        </div>
      }

      <!-- New Campaign Modal -->
      @if (showNewModal()) {
        <div class="modal-backdrop" (click)="closeNewModal()"></div>
        <div class="modal xlarge">
          <!-- STEP 1: Template Selection -->
          @if (modalStep() === 'template') {
            <div class="modal-header">
              <h2>Choose a Template</h2>
              <div class="template-header-actions">
                <input type="file" #pickerFileInput accept=".html,.htm" (change)="onPickerHtmlUpload($event)" style="display:none">
                <button class="btn-secondary btn-sm" (click)="pickerFileInput.click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload HTML
                </button>
              </div>
              <button class="close-btn" (click)="closeNewModal()">&times;</button>
            </div>
            <div class="modal-body template-grid-body">
              <div class="template-grid">
                @for (template of pickerTemplates(); track template.id) {
                  <div
                    class="template-card"
                    [class.selected]="selectedTemplateId() === template.id"
                    (click)="selectTemplate(template.id)"
                  >
                    @if (template.featured) {
                      <div class="template-featured-badge">★ Primary Template</div>
                    }
                    @if (template.source === 'uploaded') {
                      <div class="template-source-badge uploaded">Uploaded</div>
                    } @else if (template.source === 'imported') {
                      <div class="template-source-badge imported">Imported</div>
                    }
                    <!-- Template card actions -->
                    <div class="template-card-actions" (click)="$event.stopPropagation()">
                      <button class="template-mini-btn" (click)="renameTemplate(template)" title="Rename">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 3l2 2-8 8H3v-2z"/></svg>
                      </button>
                      @if (!template.featured) {
                        <button class="template-mini-btn" (click)="markPrimary(template)" title="Set as primary">★</button>
                      }
                      @if (template.source === 'uploaded') {
                        <button class="template-mini-btn danger" (click)="deletePickerTemplate(template)" title="Delete">✕</button>
                      }
                    </div>
                    <div class="template-preview" [style.background]="template.previewColor">
                      <!-- Mini preview representation -->
                      @if (template.id === 'woc-followup') {
                        <div class="mini-preview woc">
                          <div class="mini-woc-header">
                            <div class="mini-woc-logo">CAT-I.AI</div>
                            <div class="mini-woc-tagline">AUDIT-READY · ALL THE TIME</div>
                          </div>
                          <div class="mini-woc-body">
                            <div class="mini-line"></div>
                            <div class="mini-line short"></div>
                            <div class="mini-line short"></div>
                            <div class="mini-woc-btn"></div>
                          </div>
                        </div>
                      } @else if (template.id === 'cat-i-standard') {
                        <div class="mini-preview dark">
                          <div class="mini-rainbow"></div>
                          <div class="mini-logo">CAT-I</div>
                          <div class="mini-card">
                            <div class="mini-line"></div>
                            <div class="mini-line short"></div>
                            <div class="mini-btn teal"></div>
                          </div>
                          <div class="mini-rainbow"></div>
                        </div>
                      } @else if (template.id === 'product-update') {
                        <div class="mini-preview light">
                          <div class="mini-logo-sm">CAT-I</div>
                          <div class="mini-gradient-bar"></div>
                          <div class="mini-image-zone"></div>
                          <div class="mini-line"></div>
                          <div class="mini-btn blue"></div>
                        </div>
                      } @else if (template.id === 'newsletter') {
                        <div class="mini-preview light">
                          <div class="mini-logo-center">CAT-I</div>
                          <div class="mini-section"></div>
                          <div class="mini-section"></div>
                          <div class="mini-section"></div>
                          <div class="mini-footer-dark"></div>
                        </div>
                      } @else if (template.id === 'event-invite') {
                        <div class="mini-preview">
                          <div class="mini-dark-header">
                            <div class="mini-event-title"></div>
                            <div class="mini-event-date"></div>
                          </div>
                          <div class="mini-light-body">
                            <div class="mini-line"></div>
                            <div class="mini-btn purple"></div>
                          </div>
                        </div>
                      } @else if (template.id === 'simple-text') {
                        <div class="mini-preview light">
                          <div class="mini-logo-sm">CAT-I</div>
                          <div class="mini-line"></div>
                          <div class="mini-line"></div>
                          <div class="mini-line short"></div>
                          <div class="mini-sig"></div>
                        </div>
                      } @else {
                        <div class="mini-preview blank">
                          <div class="mini-plus">+</div>
                        </div>
                      }
                    </div>
                    <div class="template-info">
                      <span class="template-name">{{ template.name }}</span>
                      <span class="template-desc">{{ template.description }}</span>
                    </div>
                    <div class="template-overlay">
                      <button class="use-template-btn" (click)="useTemplate(template); $event.stopPropagation()">Use Template</button>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeNewModal()">Cancel</button>
            </div>
          }

          <!-- STEP 2: Edit Campaign -->
          @if (modalStep() === 'edit') {
            <div class="modal-header">
              <button class="back-btn" (click)="goBackToTemplates()">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 8H3m0 0l5-5M3 8l5 5"/></svg>
              </button>
              <h2>New Email Campaign</h2>
              <div class="modal-tabs">
                <button [class.active]="modalTab() === 'edit'" (click)="modalTab.set('edit')">Edit</button>
                <button [class.active]="modalTab() === 'preview'" (click)="modalTab.set('preview')">Preview</button>
              </div>
              <button class="close-btn" (click)="closeNewModal()">&times;</button>
            </div>

            @if (modalTab() === 'edit') {
              <div class="modal-body">
                <div class="template-badge">
                  Using: <strong>{{ getSelectedTemplate()?.name }}</strong>
                  <button class="change-template-btn" (click)="goBackToTemplates()">Change</button>
                  <button class="btn-text btn-sm" (click)="htmlUploadInput.click()">
                    <app-icon name="upload" [size]="14"></app-icon> Upload HTML
                  </button>
                  <input #htmlUploadInput type="file" hidden accept=".html,.htm" (change)="onHtmlUpload($event)">
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Campaign Name *</label>
                    <input type="text" [(ngModel)]="newCampaign.name" placeholder="e.g., April Newsletter" />
                  </div>
                  <div class="form-group flex-1">
                    <label>
                      From *
                      <span class="info-tooltip" title="Emails will be sent via connected Gmail account"><app-icon name="info" [size]="14"></app-icon></span>
                    </label>
                    <select [(ngModel)]="selectedFrom" (change)="onFromChange()">
                      @for (opt of fromOptions; track opt.email) {
                        <option [value]="opt.email">{{ opt.display }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Subject Line *</label>
                    <input type="text" [(ngModel)]="newCampaign.subject" placeholder="Email subject" />
                  </div>
                  <div class="form-group">
                    <label>Email Type</label>
                    <select class="form-select" [(ngModel)]="newCampaign.emailType">
                      @for (opt of emailTypeOptions; track opt.value) {
                        <option [value]="opt.value">{{ opt.label }}</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Image Upload (if template supports it) -->
                @if (getSelectedTemplate()?.hasImage) {
                  <div class="form-group">
                    <label>Email Image (optional)</label>
                    <div
                      class="image-upload-zone"
                      [class.has-image]="uploadedImageUrl()"
                      (click)="fileInput.click()"
                      (dragover)="onDragOver($event)"
                      (drop)="onDrop($event)"
                    >
                      @if (!uploadedImageUrl()) {
                        <div class="upload-placeholder">
                          <svg width="32" height="32" fill="none" stroke="#9CA3AF" stroke-width="1.5"><rect x="4" y="4" width="24" height="24" rx="4"/><circle cx="12" cy="14" r="3"/><path d="M4 24l8-8 16 8"/></svg>
                          <p class="upload-text">Drag & drop an image or click to browse</p>
                          <p class="upload-hint">PNG, JPG, GIF — max 5MB</p>
                        </div>
                      } @else {
                        <div class="image-preview-container">
                          <img [src]="uploadedImageUrl()" class="image-preview" />
                          <div class="image-info">
                            <span class="image-name">{{ uploadedImageName() }}</span>
                            <span class="image-size">{{ uploadedImageSize() }}</span>
                          </div>
                          <button class="remove-image-btn" (click)="removeImage(); $event.stopPropagation()">Remove</button>
                        </div>
                      }
                    </div>
                    <input #fileInput type="file" hidden accept="image/*" (change)="onFileSelected($event)" />
                  </div>
                }

                <div class="form-group">
                  <label>Link to Content (optional)</label>
                  <select [(ngModel)]="newCampaign.contentPieceId">
                    <option [ngValue]="undefined">— None —</option>
                    @for (content of availableContent(); track content.id) {
                      <option [ngValue]="content.id">{{ content.title }} ({{ content.type }})</option>
                    }
                  </select>
                </div>

                <!-- Rich Text Editor -->
                <div class="form-group">
                  <label>Email Body</label>
                  <div class="email-editor">
                    <!-- Toolbar -->
                    <div class="editor-toolbar">
                      <button type="button" class="toolbar-btn" (click)="execCommand('bold')" [class.active]="isBold()" title="Bold"><strong>B</strong></button>
                      <button type="button" class="toolbar-btn" (click)="execCommand('italic')" [class.active]="isItalic()" title="Italic"><em>I</em></button>
                      <button type="button" class="toolbar-btn" (click)="execCommand('underline')" [class.active]="isUnderline()" title="Underline"><u>U</u></button>
                      <div class="toolbar-divider"></div>
                      <button type="button" class="toolbar-btn" (click)="execCommand('insertUnorderedList')" title="Bullet List">• ≡</button>
                      <button type="button" class="toolbar-btn" (click)="execCommand('insertOrderedList')" title="Numbered List">1.</button>
                      <div class="toolbar-divider"></div>
                      <button type="button" class="toolbar-btn" (click)="execCommand('formatBlock', 'h2')" title="Heading">H</button>
                      <button type="button" class="toolbar-btn" (click)="insertLink()" title="Link"><app-icon name="link" [size]="14"></app-icon></button>
                      <div class="toolbar-divider"></div>
                      <!-- Merge Fields Dropdown -->
                      <div class="merge-dropdown">
                        <button type="button" class="toolbar-btn merge-btn" (click)="toggleMergeDropdown()">
                          &#123;x&#125; <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 3 3-3"/></svg>
                        </button>
                        @if (showMergeDropdown()) {
                          <div class="merge-dropdown-menu">
                            @for (field of mergeFields; track field.token) {
                              <button (click)="insertMergeField(field.token)">{{ field.label }}</button>
                            }
                          </div>
                        }
                      </div>
                      <div class="toolbar-divider"></div>
                      <button type="button" class="ai-generate-btn" (click)="toggleAiPanel()">
                        <app-icon name="sparkles" [size]="14"></app-icon> AI Write
                      </button>
                    </div>

                    <!-- AI Prompt Panel -->
                    @if (showAiPanel()) {
                      <div class="ai-prompt-panel">
                        <label class="ai-label">AI Content Generator</label>
                        <div class="ai-input-row">
                          <input
                            type="text"
                            [(ngModel)]="aiPrompt"
                            placeholder="Describe what you want... e.g., 'Write a product update email about CAT-MES v2.1 new features'"
                            class="ai-input"
                            (keydown.enter)="generateWithAi()"
                          />
                          <button class="ai-generate-action" (click)="generateWithAi()" [disabled]="isGenerating()">
                            @if (isGenerating()) {
                              <span class="spinner"></span> Generating...
                            } @else {
                              Generate
                            }
                          </button>
                        </div>
                        <div class="ai-chips">
                          @for (chip of aiChips; track chip.label) {
                            <button type="button" class="ai-chip" (click)="setAiPrompt(chip.prompt)">{{ chip.label }}</button>
                          }
                        </div>
                      </div>
                    }

                    <!-- Editable content area -->
                    <div
                      #editorContent
                      contenteditable="true"
                      class="editor-content"
                      [attr.data-placeholder]="'Write your email content...'"
                      (input)="onEditorInput()"
                      (blur)="onEditorBlur()"
                    ></div>

                    <!-- AI Generated Preview -->
                    @if (generatedContent()) {
                      <div class="ai-preview-bar">
                        <span><app-icon name="sparkles" [size]="14"></app-icon> AI generated content ready</span>
                        <div class="ai-preview-actions">
                          <button class="btn-outline-small" (click)="regenerateAi()">Regenerate</button>
                          <button class="btn-primary-small" (click)="insertAiContent()">Insert</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Content Blocks (editable template regions) -->
                <div class="blocks-section">
                  <label class="blocks-label">Content Blocks</label>
                  <p class="blocks-hint">Map to editable regions in the template. Leave blank for defaults.</p>
                  <div class="form-row">
                    <div class="form-group flex-1">
                      <label>Greeting</label>
                      <input type="text" class="form-input" [(ngModel)]="blocks.greeting" (ngModelChange)="onBlocksChange()" [placeholder]="'Hi \u007B\u007Bfirst_name\u007D\u007D,'" />
                    </div>
                    <div class="form-group flex-1">
                      <label>Closing Line</label>
                      <input type="text" class="form-input" [(ngModel)]="blocks.closing" (ngModelChange)="onBlocksChange()" placeholder="Looking forward to..." />
                    </div>
                  </div>
                  <div class="form-row cta-row">
                    <div class="form-group flex-1">
                      <label>CTA Button Text</label>
                      <input type="text" class="form-input" [(ngModel)]="blocks.ctaLabel" (ngModelChange)="onBlocksChange()" placeholder="Learn More" />
                    </div>
                    <div class="form-group flex-2">
                      <label>CTA Button URL</label>
                      <input type="text" class="form-input" [(ngModel)]="blocks.ctaUrl" (ngModelChange)="onBlocksChange()" placeholder="https://cat-i.ai" />
                    </div>
                  </div>
                </div>

                <!-- Preview Recipient -->
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Preview Recipient <span class="label-hint">(for preview only)</span></label>
                    <select class="form-select" [(ngModel)]="previewRecipientId" (change)="onPreviewRecipientChange()">
                      <option [ngValue]="null">-- Generic preview --</option>
                      @for (lead of leadsForPreview(); track lead.id) {
                        <option [ngValue]="lead.id">{{ lead.contact }} ({{ lead.company }})</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Audience Type *</label>
                    <select [(ngModel)]="audienceType" (change)="onAudienceTypeChange()">
                      <option value="all_leads">All Leads</option>
                      <option value="by_stage">By Pipeline Stage</option>
                      <option value="by_module">By Module Interest</option>
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label>Scheduled Date (optional)</label>
                    <input type="date" [(ngModel)]="newCampaign.scheduledDate" />
                  </div>
                </div>

                @if (audienceType === 'by_stage') {
                  <div class="form-group">
                    <label>Select Stages</label>
                    <div class="checkbox-grid">
                      @for (stage of pipelineStages; track stage) {
                        <label class="checkbox-item">
                          <input type="checkbox" [checked]="selectedStages.includes(stage)" (change)="toggleStage(stage)" />
                          {{ stage }}
                        </label>
                      }
                    </div>
                  </div>
                }
                @if (audienceType === 'by_module') {
                  <div class="form-group">
                    <label>Select Modules</label>
                    <div class="checkbox-grid">
                      @for (module of modules; track module) {
                        <label class="checkbox-item">
                          <input type="checkbox" [checked]="selectedModules.includes(module)" (change)="toggleModule(module)" />
                          {{ module }}
                        </label>
                      }
                    </div>
                  </div>
                }

                <div class="recipient-preview">
                  <span class="preview-label">Estimated Recipients:</span>
                  <span class="preview-count">{{ estimatedRecipients() }}</span>
                </div>
              </div>
            } @else {
              <!-- Preview Tab -->
              <div class="modal-body preview-mode">
                <div class="email-preview-container" [innerHTML]="renderPreview()"></div>
              </div>
            }

            <div class="modal-footer">
              <span class="integration-indicator">
                <app-icon name="link" [size]="12"></app-icon> via Amazon SES
              </span>
              <button class="btn-text" (click)="openTestSendModal()" [disabled]="!newCampaign.subject || campaignSaving()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Send Test
              </button>
              <button class="btn-secondary" (click)="closeNewModal()" [disabled]="campaignSaving()">Cancel</button>
              <button class="btn-outline" (click)="saveDraft()" [disabled]="!newCampaign.name || !newCampaign.subject || campaignSaving()">
                {{ editingCampaignId() ? 'Update Draft' : 'Save Draft' }}
              </button>
              @if (newCampaign.scheduledDate) {
                <button class="btn-primary" (click)="scheduleSend()" [disabled]="!newCampaign.name || !newCampaign.subject || campaignSaving()">
                  {{ campaignSaving() ? 'Scheduling...' : 'Schedule Send' }}
                </button>
              } @else {
                <button class="btn-primary" (click)="sendNow()" [disabled]="!newCampaign.name || !newCampaign.subject || campaignSaving()">
                  {{ campaignSaving() ? 'Sending...' : 'Send Now' }}
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Test Send Modal -->
      @if (showTestSendModal()) {
        <div class="modal-backdrop" (click)="closeTestSendModal()"></div>
        <div class="modal test-send-modal">
          <div class="modal-header">
            <h2>Send Test Email</h2>
            <button class="close-btn" (click)="closeTestSendModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Send to</label>
              <input type="email" class="form-input" [(ngModel)]="testSendEmail" placeholder="your@email.com" />
            </div>
            <div class="test-send-summary">
              <div class="ts-row"><span class="ts-label">Subject</span><span class="ts-value">[TEST] {{ newCampaign.subject }}</span></div>
              <div class="ts-row"><span class="ts-label">From</span><span class="ts-value">{{ newCampaign.fromName }} &lt;{{ newCampaign.fromEmail }}&gt;</span></div>
            </div>
            @if (testSendResult()) {
              <div class="test-send-result" [class.ok]="testSendResult()!.ok" [class.fail]="!testSendResult()!.ok">
                {{ testSendResult()!.message }}
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeTestSendModal()">Close</button>
            <button class="btn-primary" (click)="submitTestSend()" [disabled]="testSending() || !testSendEmail">
              {{ testSending() ? 'Sending...' : 'Send Test' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: auto; }
    .campaigns-page { padding: 24px; min-height: 100%; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 600; color: var(--color-gray-900); margin: 0 0 4px 0; }
    .subtitle { font-size: 14px; color: var(--color-gray-500); margin: 0; }
    .btn-primary { padding: 10px 20px; background: #EC6B15; color: white; border: none; border-radius: var(--radius-md); height: 40px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover { background: #D45E12; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { padding: 10px 20px; background: var(--color-gray-100); color: var(--color-gray-700); border: none; border-radius: var(--radius-md); height: 40px; font-size: 14px; cursor: pointer; }
    .btn-secondary:hover { background: var(--color-border); }
    .btn-outline { padding: 10px 20px; background: white; color: var(--color-gray-700); border: 1px solid var(--color-border); border-radius: var(--radius-md); height: 40px; font-size: 14px; cursor: pointer; }
    .btn-outline:hover { background: var(--color-gray-50); border-color: var(--color-gray-300); }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

    /* KPIs */
    .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: white; border-radius: var(--radius-md); padding: 16px 24px; flex: 1; border: 1px solid var(--color-border); }
    .kpi-value { font-size: 28px; font-weight: 600; color: var(--color-gray-900); }
    .kpi-label { font-size: 13px; color: var(--color-gray-500); margin-top: 4px; }

    /* Campaigns Table */
    .campaigns-list { background: white; border-radius: var(--radius-md); border: 1px solid var(--color-border); overflow: hidden; }
    .campaigns-table { width: 100%; border-collapse: collapse; }
    .campaigns-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 500; color: var(--color-gray-500); border-bottom: 1px solid var(--color-border); background: var(--color-gray-50); }
    .campaigns-table td { padding: 14px 16px; font-size: 13px; color: var(--color-gray-700); border-bottom: 1px solid var(--color-gray-100); vertical-align: middle; }
    .campaigns-table tbody tr:hover { background: var(--color-gray-50); cursor: pointer; }
    .name-cell .campaign-name { display: block; font-weight: 500; color: var(--color-gray-900); }
    .name-cell .linked-content { display: block; font-size: 11px; color: var(--color-gray-500); margin-top: 2px; }
    .from-cell { color: var(--color-gray-500); }
    .subject-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .num-cell { text-align: right; }
    .date-cell { color: var(--color-gray-500); }
    .empty-state { text-align: center; color: var(--color-gray-400); padding: 40px !important; }

    /* Status Badge */
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: var(--radius-lg); font-size: 12px; font-weight: 500; }
    .status-badge.large { padding: 6px 14px; font-size: 13px; }
    .status-draft { background: var(--color-gray-100); color: var(--color-gray-500); }
    .status-scheduled { background: var(--status-purple-bg); color: var(--status-purple-text); }
    .status-sent { background: var(--status-green-bg); color: var(--status-green-text); }

    /* Actions */
    .actions-cell { text-align: right; white-space: nowrap; }
    .action-btn { width: 28px; height: 28px; border: 1px solid var(--color-border); background: white; border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--color-gray-500); margin-left: 4px; }
    .action-btn:hover { background: var(--color-gray-100); }
    .action-btn.send { color: var(--status-green-text); border-color: #D1FAE5; }
    .action-btn.send:hover { background: var(--status-green-bg); }
    .action-btn.delete { color: var(--color-error-hover); border-color: var(--color-error-light); }
    .action-btn.delete:hover { background: #FEF2F2; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 560px; max-height: 85vh; background: white; border-radius: var(--radius-lg); overflow: hidden; z-index: 101; display: flex; flex-direction: column; animation: fadeIn 0.15s ease; }
    .modal.large { width: 640px; }
    .modal.xlarge { width: 800px; max-height: 90vh; }
    @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 12px; }
    .modal-header h2 { font-size: 18px; font-weight: 600; color: var(--color-gray-900); margin: 0; }
    .back-btn { width: 32px; height: 32px; border: 1px solid var(--color-border); background: white; border-radius: var(--radius); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-gray-500); }
    .back-btn:hover { background: var(--color-gray-100); }
    .modal-tabs { display: flex; gap: 4px; background: var(--color-gray-100); border-radius: var(--radius-md); padding: 4px; margin-left: auto; }
    .modal-tabs button { padding: 6px 14px; border: none; background: transparent; border-radius: var(--radius); font-size: 13px; color: var(--color-gray-500); cursor: pointer; }
    .modal-tabs button.active { background: white; color: var(--color-gray-900); box-shadow: var(--shadow-sm); }
    .close-btn { width: 32px; height: 32px; border: none; background: var(--color-gray-100); border-radius: var(--radius); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-body.preview-mode { background: var(--color-gray-50); padding: 24px; }
    .modal-body.template-grid-body { background: var(--color-gray-50); }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 12px; }

    /* Detail Meta */
    .detail-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 12px 16px; background: rgba(255,255,255,0.1); border-radius: var(--radius-md); }
    .meta-item { font-size: 13px; color: var(--color-gray-400); }

    /* Template Grid */
    .template-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .template-card { width: 220px; background: white; border-radius: var(--radius-lg); border: 2px solid transparent; cursor: pointer; overflow: hidden; transition: all 0.2s; position: relative; box-shadow: var(--card-shadow); }
    .template-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .template-card.selected { border-color: var(--color-primary); }
    .template-preview { height: 140px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .template-info { padding: 12px; text-align: center; border-top: 1px solid var(--color-gray-100); }
    .template-name { display: block; font-size: 13px; font-weight: 600; color: var(--color-gray-900); }
    .template-desc { display: block; font-size: 11px; color: var(--color-gray-500); margin-top: 2px; }
    .template-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
    .template-card:hover .template-overlay { opacity: 1; }
    .use-template-btn { padding: 10px 20px; background: white; color: var(--color-gray-900); border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; }
    .use-template-btn:hover { background: var(--color-gray-100); }

    /* Mini Previews */
    .mini-preview { width: 100%; height: 100%; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .mini-preview.dark { background: var(--color-gray-800); }
    .mini-preview.light { background: #fff; }
    .mini-preview.blank { background: var(--color-gray-50); align-items: center; justify-content: center; }
    .mini-rainbow { height: 3px; background: linear-gradient(to right, #E11D48, #EA580C, #D97706, #34A125, #0891B2, #1A56DB, #7C3AED); border-radius: 1px; }
    .mini-logo { font-size: 12px; font-weight: 700; color: white; text-align: center; padding: 6px 0; }
    .mini-logo-sm { font-size: 10px; font-weight: 700; color: var(--color-gray-700); }
    .mini-logo-center { font-size: 11px; font-weight: 700; color: var(--color-gray-700); text-align: center; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
    .mini-card { background: white; border-radius: var(--radius-sm); padding: 10px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .mini-line { height: 6px; background: var(--color-border); border-radius: 2px; }
    .mini-line.short { width: 60%; }
    .mini-btn { height: 14px; width: 50px; border-radius: 3px; align-self: center; margin-top: auto; }
    .mini-btn.teal { background: #0D9488; }
    .mini-btn.blue { background: var(--color-primary); }
    .mini-btn.purple { background: var(--status-purple-text); }
    .mini-gradient-bar { height: 4px; background: linear-gradient(to right, #9F2094, #1A56DB); }
    .mini-image-zone { height: 30px; border: 1px dashed var(--color-gray-300); border-radius: 3px; margin: 4px 0; }
    .mini-section { height: 24px; border-bottom: 1px solid var(--color-gray-100); }
    .mini-footer-dark { height: 20px; background: var(--color-gray-800); margin-top: auto; }
    .mini-dark-header { background: var(--color-gray-800); padding: 10px; text-align: center; }
    .mini-event-title { height: 8px; background: white; width: 70%; margin: 0 auto 4px; border-radius: 2px; }
    .mini-event-date { height: 6px; background: rgba(255,255,255,0.3); width: 50%; margin: 0 auto; border-radius: 2px; }
    .mini-light-body { background: white; padding: 10px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .mini-sig { height: 16px; border-top: 1px solid var(--color-border); margin-top: auto; }
    .mini-plus { font-size: 32px; color: var(--color-gray-400); }

    /* WoC Branded Template mini-preview */
    .mini-preview.woc { background: linear-gradient(to bottom, #c4d8e8 55%, #ffffff 45%); padding: 0; gap: 0; }
    .mini-woc-header { background: linear-gradient(160deg, #d4ecf7 0%, #c4d8e8 100%); padding: 10px 10px 8px; text-align: center; }
    .mini-woc-logo { font-size: 8px; font-weight: 800; color: #1a1a2e; letter-spacing: 0.3px; }
    .mini-woc-tagline { font-size: 4px; color: #1a1a2e; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px; opacity: 0.7; }
    .mini-woc-body { background: #ffffff; padding: 8px 10px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .mini-woc-btn { height: 10px; border-radius: var(--radius-md); background: linear-gradient(90deg, #40c0a8 0%, #6888e0 100%); margin: 6px auto 0; width: 75%; flex-shrink: 0; }

    /* Featured badge on template card */
    .template-featured-badge { position: absolute; top: 8px; left: 8px; z-index: 2; background: linear-gradient(90deg, #40c0a8, #6888e0); color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 0.3px; padding: 3px 8px; border-radius: var(--radius-md); pointer-events: none; }
    .template-card:has(.template-featured-badge) { border-color: #6888e0; box-shadow: 0 2px 8px rgba(104,136,224,0.2); }
    .template-card:has(.template-featured-badge):hover { box-shadow: 0 6px 20px rgba(104,136,224,0.3); }

    /* Template Badge */
    .template-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--color-gray-100); border-radius: var(--radius); font-size: 13px; color: var(--color-gray-500); margin-bottom: 16px; }
    .template-badge strong { color: var(--color-gray-900); }
    .change-template-btn { padding: 4px 8px; font-size: 11px; color: var(--color-primary); background: white; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; }

    /* Form */
    .form-group { margin-bottom: 16px; }
    .form-group label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: var(--color-gray-700); margin-bottom: 6px; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #EC6B15; }
    .form-group textarea { resize: vertical; }
    .form-row { display: flex; gap: 16px; }
    .cta-row { background: var(--color-gray-50); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .info-tooltip { font-size: 12px; cursor: help; }
    .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 150px; overflow-y: auto; padding: 8px; background: var(--color-gray-50); border-radius: var(--radius); }
    .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
    .checkbox-item input { width: auto; }
    .recipient-preview { padding: 12px 16px; background: var(--status-blue-bg); border-radius: var(--radius); display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .preview-label { font-size: 13px; color: var(--color-gray-700); }
    .preview-count { font-size: 18px; font-weight: 600; color: var(--status-blue-text); }

    /* Image Upload */
    .image-upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-md); padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
    .image-upload-zone:hover { border-color: var(--color-primary); background: var(--color-gray-50); }
    .image-upload-zone.has-image { border-style: solid; padding: 12px; }
    .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .upload-text { font-size: 13px; color: var(--color-gray-500); margin: 0; }
    .upload-hint { font-size: 11px; color: var(--color-gray-400); margin: 0; }
    .image-preview-container { display: flex; align-items: center; gap: 16px; }
    .image-preview { max-height: 120px; max-width: 200px; border-radius: var(--radius-md); object-fit: cover; }
    .image-info { flex: 1; text-align: left; }
    .image-name { display: block; font-size: 13px; font-weight: 500; color: var(--color-gray-700); }
    .image-size { display: block; font-size: 11px; color: var(--color-gray-400); margin-top: 2px; }
    .remove-image-btn { padding: 6px 12px; font-size: 12px; color: var(--color-error-hover); background: white; border: 1px solid var(--color-error-light); border-radius: var(--radius); cursor: pointer; }
    .remove-image-btn:hover { background: #FEF2F2; }

    /* Rich Text Editor */
    .email-editor { border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
    .editor-toolbar { display: flex; gap: 2px; padding: 8px 12px; border-bottom: 1px solid var(--color-border); background: var(--color-gray-50); flex-wrap: wrap; align-items: center; }
    .toolbar-btn { width: 32px; height: 32px; border: none; border-radius: var(--radius); background: transparent; cursor: pointer; font-size: 14px; color: var(--color-gray-700); display: flex; align-items: center; justify-content: center; }
    .toolbar-btn:hover { background: var(--color-border); }
    .toolbar-btn.active { background: var(--color-primary-light); color: var(--color-primary); }
    .toolbar-divider { width: 1px; height: 24px; background: var(--color-border); margin: 0 6px; }

    /* Merge Dropdown */
    .merge-dropdown { position: relative; }
    .merge-btn { width: auto !important; padding: 0 8px; gap: 4px; font-size: 12px; }
    .merge-dropdown-menu { position: absolute; top: 100%; left: 0; margin-top: 4px; background: white; border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 10; min-width: 180px; }
    .merge-dropdown-menu button { display: block; width: 100%; padding: 10px 14px; text-align: left; border: none; background: none; font-size: 13px; color: var(--color-gray-700); cursor: pointer; }
    .merge-dropdown-menu button:hover { background: var(--color-gray-100); }
    .merge-dropdown-menu button:first-child { border-radius: var(--radius-md) var(--radius-md) 0 0; }
    .merge-dropdown-menu button:last-child { border-radius: 0 0 var(--radius-md) var(--radius-md); }

    .ai-generate-btn { display: flex; align-items: center; gap: 4px; padding: 4px 12px; background: linear-gradient(135deg, #9F2094, #56006E); color: white; border: none; border-radius: var(--radius); font-size: 12px; font-weight: 500; cursor: pointer; height: 32px; }
    .ai-generate-btn:hover { opacity: 0.9; }
    .editor-content { min-height: 180px; padding: 16px; font-size: 14px; line-height: 1.6; color: var(--color-gray-900); outline: none; }
    .editor-content:empty:before { content: attr(data-placeholder); color: var(--color-gray-400); }
    .editor-content:focus { background: #FEFEFE; }

    /* AI Panel */
    .ai-prompt-panel { padding: 12px 16px; background: linear-gradient(135deg, #faf8ff, #f5f3ff); border-bottom: 1px solid var(--color-border); }
    .ai-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--status-purple-text); margin-bottom: 8px; display: block; }
    .ai-input-row { display: flex; gap: 8px; }
    .ai-input { flex: 1; padding: 10px 14px; font-size: 13px; border: 1px solid var(--status-purple-bg); border-radius: var(--radius-md); outline: none; }
    .ai-input:focus { border-color: #A78BFA; }
    .ai-generate-action { height: 40px; padding: 0 20px; background: linear-gradient(135deg, #9F2094, #56006E); color: white; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .ai-generate-action:disabled { opacity: 0.7; cursor: not-allowed; }
    .ai-chips { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
    .ai-chip { padding: 4px 10px; font-size: 11px; background: #fff; border: 1px solid var(--status-purple-bg); border-radius: var(--radius-xl); color: var(--status-purple-text); cursor: pointer; }
    .ai-chip:hover { background: var(--status-purple-bg); border-color: #A78BFA; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ai-preview-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--status-green-bg); border-top: 1px solid #D1FAE5; }
    .ai-preview-bar span { font-size: 13px; color: var(--status-green-text); }
    .ai-preview-actions { display: flex; gap: 8px; }
    .btn-outline-small { padding: 6px 12px; font-size: 12px; background: white; border: 1px solid var(--color-border); border-radius: var(--radius); cursor: pointer; }
    .btn-primary-small { padding: 6px 12px; font-size: 12px; background: var(--status-green-text); color: white; border: none; border-radius: var(--radius); cursor: pointer; }

    /* Email Preview */
    .email-preview-container { max-width: 640px; margin: 0 auto; border-radius: var(--radius-md); overflow: hidden; }

    .detail-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--color-gray-200); margin-bottom: 16px; }
    .detail-tab {
      padding: 8px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-gray-500);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .detail-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .detail-tab .tab-count {
      background: var(--color-gray-100);
      color: var(--color-gray-600);
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
    }

    .recipients-section { display: flex; flex-direction: column; gap: 12px; }
    .recipients-summary { display: flex; gap: 20px; padding: 12px 16px; background: var(--color-gray-50); border-radius: var(--radius-md); }
    .recip-stat { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-700); }
    .recip-dot { width: 8px; height: 8px; border-radius: 50%; }
    .recip-dot.sent { background: var(--color-success); }
    .recip-dot.failed { background: #DC2626; }
    .recip-dot.reminded { background: var(--color-primary); }

    .recipients-table { overflow-x: auto; }
    .recipients-table .data-table { font-size: 0.8125rem; }
    .recipients-table th, .recipients-table td { padding: 8px 12px; }
    .recipients-table th { background: var(--color-gray-50); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-gray-500); }

    /* Integration indicators */
    .integration-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--color-gray-100);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      color: var(--color-gray-500);
      font-weight: 500;
      margin-left: 8px;
    }
    .integration-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--color-gray-400);
      margin-right: auto;
    }

    /* Button variants */
    .btn-text { background: none; border: none; color: var(--color-gray-500); cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
    .btn-text:hover { color: var(--color-gray-700); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    /* Email type badges */
    .badge { display: inline-block; padding: 3px 8px; border-radius: var(--radius-md); font-size: 11px; font-weight: 500; text-transform: capitalize; }
    .badge-purple { background: var(--status-purple-bg); color: var(--status-purple-text); }
    .badge-blue { background: var(--status-blue-bg); color: var(--status-blue-text); }
    .badge-orange { background: var(--status-orange-bg); color: var(--status-orange-text); }
    .badge-gray { background: var(--color-gray-100); color: var(--color-gray-500); }
    .form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }

    /* Template management */
    .template-header-actions { display: flex; gap: 8px; margin-left: auto; margin-right: 12px; }
    .template-source-badge { position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; z-index: 1; }
    .template-source-badge.uploaded { background: #DBEAFE; color: #1E40AF; }
    .template-source-badge.imported { background: #D1FAE5; color: #065F46; }
    .template-card-actions { position: absolute; top: 6px; left: 6px; display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; z-index: 2; }
    .template-card:hover .template-card-actions { opacity: 1; }
    .template-mini-btn {
      width: 24px; height: 24px; border: none; border-radius: var(--radius);
      background: rgba(255,255,255,0.9); color: var(--color-gray-500);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .template-mini-btn:hover { background: white; color: var(--color-gray-700); }
    .template-mini-btn.danger:hover { color: #DC2626; }

    /* Content blocks */
    .blocks-section { padding: 12px 0; border-top: 1px solid var(--color-border); margin-top: 8px; }
    .blocks-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-gray-500); }
    .blocks-hint { font-size: 0.75rem; color: var(--color-gray-400); margin: 4px 0 12px 0; }
    .label-hint { font-size: 0.7rem; color: var(--color-gray-400); font-weight: 400; }

    /* Test send modal */
    .test-send-modal { max-width: 440px; }
    .test-send-summary { padding: 12px; background: var(--color-gray-50); border-radius: var(--radius-md); margin-top: 12px; }
    .ts-row { display: flex; gap: 12px; padding: 4px 0; font-size: 0.8125rem; }
    .ts-label { font-weight: 600; color: var(--color-gray-500); min-width: 60px; }
    .ts-value { color: var(--color-gray-700); }
    .test-send-result { margin-top: 12px; padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.8125rem; }
    .test-send-result.ok { background: #D1FAE5; color: #065F46; }
    .test-send-result.fail { background: #FEE2E2; color: #991B1B; }
  `]
})
export class ContentCampaignsComponent {
  @ViewChild('editorContent') editorContent!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  dataService = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  teamUtil = inject(TeamUtilService);

  private templateService = inject(EmailTemplateService);
  pipelineStages = PIPELINE_STAGES;
  modules = ALL_MODULES;
  templates = EMAIL_TEMPLATES;
  pickerTemplates = this.templateService.pickerTemplates;

  selectedCampaign = signal<EmailCampaign | null>(null);
  showNewModal = signal(false);
  editingCampaignId = signal<number | null>(null);
  modalStep = signal<'template' | 'edit'>('template');
  modalTab = signal<'edit' | 'preview'>('edit');
  selectedTemplateId = signal<string>('cat-i-standard');
  showAiPanel = signal(false);
  showMergeDropdown = signal(false);
  isGenerating = signal(false);
  campaignSaving = signal(false);
  htmlImported = signal(false);
  generatedContent = signal<string | null>(null);

  // Image upload
  uploadedImageUrl = signal<string | null>(null);
  uploadedImageName = signal<string>('');
  uploadedImageSize = signal<string>('');

  // From options
  fromOptions: FromOption[] = [];
  selectedFrom = 'aisha@cat-i.ai';

  // CTA
  ctaText = 'Learn More';
  ctaUrl = 'https://cat-i.ai';

  // Editable content blocks (from Artem's template system)
  blocks: CampaignEditableBlocks = {};

  // Test email
  showTestSendModal = signal(false);
  testSending = signal(false);
  testSendResult = signal<{ ok: boolean; message: string } | null>(null);
  testSendEmail = '';

  // Preview recipient
  previewRecipientId: number | null = null;
  leadsForPreview = computed(() =>
    this.dataService.operationalLeads().filter(l => l.email).slice(0, 50)
  );

  // New campaign form
  newCampaign: Partial<EmailCampaign> = this.getEmptyCampaign();
  audienceType: 'all_leads' | 'by_stage' | 'by_module' = 'all_leads';
  selectedStages: string[] = [];
  selectedModules: string[] = [];
  private audienceTrigger = signal(0);

  // Email type options
  emailTypeOptions = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'follow-up', label: 'Follow-Up' },
    { value: 'system', label: 'System' },
  ];

  // Merge fields
  mergeFields: MergeField[] = [
    { label: 'Contact Name', token: '{{contact_name}}' },
    { label: 'Company Name', token: '{{company_name}}' },
    { label: 'Sender Name', token: '{{from_name}}' },
    { label: 'Sender Role', token: '{{from_role}}' },
    { label: 'Sender Email', token: '{{from_email}}' }
  ];

  // AI
  aiPrompt = '';
  aiChips = [
    { label: 'Product Update', prompt: 'Write a product update email announcing new features in our latest release' },
    { label: 'Newsletter', prompt: 'Write a monthly newsletter covering platform updates and food safety industry news' },
    { label: 'Feature Highlight', prompt: 'Write an email highlighting a specific CAT-I.AI feature and its benefits for food manufacturers' },
    { label: 'Event Invite', prompt: 'Write an email inviting food safety professionals to an upcoming webinar or demo' },
    { label: 'Follow-Up', prompt: 'Write a follow-up email to prospects who attended a recent demo' }
  ];

  // Computed
  campaigns = this.dataService.campaigns;
  totalCampaigns = computed(() => this.campaigns().length);
  draftCount = computed(() => this.campaigns().filter(c => c.status === 'Draft').length);
  scheduledCount = computed(() => this.campaigns().filter(c => c.status === 'Scheduled').length);
  sentCount = computed(() => this.campaigns().filter(c => c.status === 'Sent').length);

  availableContent = computed(() => this.dataService.content().filter(c => c.stage !== 'Ideas'));

  estimatedRecipients = computed(() => {
    this.audienceTrigger();
    const leads = this.dataService.leads();
    if (this.audienceType === 'all_leads') {
      return leads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length;
    }
    if (this.audienceType === 'by_stage') {
      return leads.filter(l => this.selectedStages.includes(l.stage)).length;
    }
    if (this.audienceType === 'by_module') {
      return leads.filter(l => l.modules.some(m => this.selectedModules.includes(m))).length;
    }
    return 0;
  });

  constructor() {
    effect(() => {
      const team = this.dataService.team();
      this.fromOptions = team
        .filter(t => t.email)
        .map(t => ({
          name: t.name,
          email: t.email,
          role: t.role,
          display: `${t.name} <${t.email}>`
        }));
    });
  }

  getEmptyCampaign(): Partial<EmailCampaign> {
    return {
      name: '',
      fromName: (this.authService.user()?.name ?? 'User'),
      fromEmail: 'aisha@cat-i.ai',
      subject: '',
      status: 'Draft',
      bodyHtml: '',
      createdBy: (this.authService.user()?.name ?? 'User'),
      emailType: 'marketing'
    };
  }

  getSelectedTemplate(): EmailTemplate | undefined {
    return this.templates.find(t => t.id === this.selectedTemplateId());
  }

  getFromOption(): FromOption | undefined {
    return this.fromOptions.find(o => o.email === this.selectedFrom);
  }

  onFromChange() {
    const opt = this.getFromOption();
    if (opt) {
      this.newCampaign.fromName = opt.name;
      this.newCampaign.fromEmail = opt.email;
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    if (!/^\d{4}-/.test(dateStr)) return dateStr;
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getEmailTypeBadge(type: string): string {
    const badges: Record<string, string> = {
      marketing: 'purple', transactional: 'blue', 'follow-up': 'orange', system: 'gray'
    };
    return badges[type] || 'gray';
  }

  onHtmlUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawHtml = reader.result as string;
      this.htmlImported.set(true);

      const editor = document.querySelector('.editor-content') as HTMLElement;
      if (editor) {
        editor.innerHTML = `<div style="padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;font-size:13px;color:#1e40af;"><strong>Processing template...</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)<br>Optimizing images and cleaning up for email compatibility.</div>`;
      }

      // Send to backend for processing (strip VML, upload base64 images to S3)
      this.http.post<{ html: string }>(`${environment.apiUrl}/campaigns/process-html`, { html: rawHtml }, { withCredentials: true }).subscribe({
        next: (res) => {
          this.newCampaign.bodyHtml = res.html;
          if (editor) {
            const sizeKB = (res.html.length / 1024).toFixed(1);
            editor.innerHTML = `<div style="padding:12px;background:#d1fae5;border-radius:8px;border:1px solid #6ee7b7;font-size:13px;color:#065f46;"><strong>Template ready:</strong> ${file.name} → ${sizeKB} KB (optimized)<br>VML stripped, images hosted on CDN. Ready to send.</div>`;
          }
        },
        error: () => {
          // Fallback: use raw HTML if processing fails
          this.newCampaign.bodyHtml = rawHtml;
          if (editor) {
            editor.innerHTML = `<div style="padding:12px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;font-size:13px;color:#92400e;"><strong>Template imported (unprocessed):</strong> ${file.name}<br>Processing failed — template will be sent as-is.</div>`;
          }
        },
      });
    };
    reader.readAsText(file);
  }

  formatAudience(audience: EmailAudience): string {
    if (audience.type === 'all_leads') return 'All Leads';
    if (audience.type === 'by_stage') return `Stages: ${audience.stages?.join(', ')}`;
    if (audience.type === 'by_module') return `Modules: ${audience.modules?.join(', ')}`;
    if (audience.type === 'custom') return 'Custom List';
    return audience.type;
  }

  getOpenRate(campaign: EmailCampaign): number {
    if (!campaign.opens || !campaign.recipients) return 0;
    return Math.round((campaign.opens / campaign.recipients) * 100);
  }

  getClickRate(campaign: EmailCampaign): number {
    if (!campaign.clicks || !campaign.recipients) return 0;
    return Math.round((campaign.clicks / campaign.recipients) * 100);
  }

  getLinkedContent(contentId?: number): ContentPiece | undefined {
    if (!contentId) return undefined;
    return this.dataService.content().find(c => c.id === contentId);
  }

  openCampaignDetail(campaign: EmailCampaign) {
    this.selectedCampaign.set(campaign);
  }

  closeDetail() {
    this.selectedCampaign.set(null);
    this.detailTab.set('preview');
    this.campaignRecipients.set([]);
    this.selectedRecipientIds.set(new Set());
  }

  openNewCampaignModal() {
    this.editingCampaignId.set(null);
    this.newCampaign = this.getEmptyCampaign();
    this.selectedFrom = 'aisha@cat-i.ai';
    this.audienceType = 'all_leads';
    this.selectedStages = [];
    this.selectedModules = [];
    this.uploadedImageUrl.set(null);
    this.uploadedImageName.set('');
    this.uploadedImageSize.set('');
    this.showAiPanel.set(false);
    this.showMergeDropdown.set(false);
    this.generatedContent.set(null);
    this.aiPrompt = '';
    this.ctaText = 'Learn More';
    this.ctaUrl = 'https://cat-i.ai';
    this.modalStep.set('template');
    this.modalTab.set('edit');
    this.selectedTemplateId.set('cat-i-standard');
    this.showNewModal.set(true);
  }

  editCampaign(campaign: EmailCampaign) {
    this.editingCampaignId.set(campaign.id);
    this.newCampaign = {
      name: campaign.name,
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      subject: campaign.subject,
      status: campaign.status,
      bodyHtml: campaign.bodyHtml || '',
      contentPieceId: campaign.contentPieceId,
      scheduledDate: campaign.scheduledDate,
      imageFileName: campaign.imageFileName,
      imageDataUrl: campaign.imageDataUrl,
      createdBy: campaign.createdBy,
      emailType: (campaign as any).emailType || 'marketing'
    };
    this.selectedFrom = campaign.fromEmail || 'aisha@cat-i.ai';
    const aType = campaign.audience?.type;
    this.audienceType = (aType === 'by_stage' || aType === 'by_module') ? aType : 'all_leads';
    this.selectedStages = campaign.audience?.stages || [];
    this.selectedModules = campaign.audience?.modules || [];
    this.uploadedImageUrl.set(campaign.imageDataUrl || null);
    this.uploadedImageName.set(campaign.imageFileName || '');
    this.uploadedImageSize.set('');
    this.showAiPanel.set(false);
    this.showMergeDropdown.set(false);
    this.generatedContent.set(null);
    this.aiPrompt = '';
    this.ctaText = 'Learn More';
    this.ctaUrl = 'https://cat-i.ai';
    this.modalStep.set('edit');
    this.modalTab.set('edit');
    this.showNewModal.set(true);

    // Populate the contenteditable editor on next tick
    setTimeout(() => {
      if (this.editorContent?.nativeElement && campaign.bodyHtml) {
        this.editorContent.nativeElement.innerHTML = campaign.bodyHtml;
      }
    }, 0);
  }

  closeNewModal() {
    this.showNewModal.set(false);
    this.editingCampaignId.set(null);
    this.htmlImported.set(false);
  }

  selectTemplate(id: string) {
    this.selectedTemplateId.set(id);
  }

  useTemplate(template: EmailTemplate) {
    this.selectedTemplateId.set(template.id);
    // Pre-populate editor with template's default body content if provided
    if (template.defaultBody) {
      this.newCampaign.bodyHtml = template.defaultBody;
      // Sync the contenteditable editor on next tick after DOM update
      setTimeout(() => {
        if (this.editorContent?.nativeElement) {
          this.editorContent.nativeElement.innerHTML = template.defaultBody!;
        }
      }, 0);
    }
    this.modalStep.set('edit');
  }

  goBackToTemplates() {
    this.modalStep.set('template');
  }

  onAudienceTypeChange() {
    this.selectedStages = [];
    this.selectedModules = [];
    this.audienceTrigger.update(v => v + 1);
  }

  toggleStage(stage: string) {
    const idx = this.selectedStages.indexOf(stage);
    if (idx >= 0) {
      this.selectedStages.splice(idx, 1);
    } else {
      this.selectedStages.push(stage);
    }
    this.audienceTrigger.update(v => v + 1);
  }

  toggleModule(module: string) {
    const idx = this.selectedModules.indexOf(module);
    if (idx >= 0) {
      this.selectedModules.splice(idx, 1);
    } else {
      this.selectedModules.push(module);
    }
    this.audienceTrigger.update(v => v + 1);
  }

  // Image Upload
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImageUrl.set(e.target?.result as string);
      this.uploadedImageName.set(file.name);
      this.uploadedImageSize.set(this.formatFileSize(file.size));
      this.newCampaign.imageFileName = file.name;
      this.newCampaign.imageDataUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  removeImage() {
    this.uploadedImageUrl.set(null);
    this.uploadedImageName.set('');
    this.uploadedImageSize.set('');
    this.newCampaign.imageFileName = undefined;
    this.newCampaign.imageDataUrl = undefined;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Rich Text Editor
  execCommand(command: string, value?: string) {
    document.execCommand(command, false, value);
    this.editorContent?.nativeElement?.focus();
  }

  insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }

  isBold(): boolean {
    return document.queryCommandState('bold');
  }

  isItalic(): boolean {
    return document.queryCommandState('italic');
  }

  isUnderline(): boolean {
    return document.queryCommandState('underline');
  }

  onEditorInput() {
    if (this.editorContent) {
      this.newCampaign.bodyHtml = this.editorContent.nativeElement.innerHTML;
    }
  }

  onEditorBlur() {
    if (this.editorContent) {
      this.newCampaign.bodyHtml = this.editorContent.nativeElement.innerHTML;
    }
  }

  // Merge Fields
  toggleMergeDropdown() {
    this.showMergeDropdown.update(v => !v);
  }

  insertMergeField(token: string) {
    document.execCommand('insertText', false, token);
    this.showMergeDropdown.set(false);
    this.editorContent?.nativeElement?.focus();
  }

  // AI
  toggleAiPanel() {
    this.showAiPanel.update(v => !v);
  }

  setAiPrompt(prompt: string) {
    this.aiPrompt = prompt;
  }

  async generateWithAi() {
    if (!this.aiPrompt.trim() || this.isGenerating()) return;

    this.isGenerating.set(true);
    this.generatedContent.set(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const content = this.generateMockAiContent(this.aiPrompt);
      this.generatedContent.set(content);
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  generateMockAiContent(prompt: string): string {
    const templates: Record<string, string> = {
      'product': `<p>We're thrilled to announce the latest updates to our platform that will help streamline your food safety compliance operations.</p>
<p><strong>What's New:</strong></p>
<ul>
<li>Enhanced AI-powered document generation</li>
<li>Improved audit trail tracking</li>
<li>New integration capabilities with existing ERP systems</li>
</ul>
<p>These updates are designed to save you time and reduce compliance headaches. Ready to see them in action?</p>`,
      'newsletter': `<p>Here's what's been happening this month:</p>
<p><strong>Platform Updates</strong></p>
<ul>
<li>New dashboard analytics for real-time compliance monitoring</li>
<li>Enhanced mobile experience for on-the-go inspections</li>
</ul>
<p><strong>Industry News</strong></p>
<p>FDA has announced new guidelines for food traceability. Our CAT-MES module is already compliant with these requirements.</p>
<p>Questions? Reply to this email or schedule a call with our team.</p>`,
      'feature': `<p>Did you know that our CAT-QT module can reduce your quality testing documentation time by up to 60%?</p>
<p><strong>Key Benefits:</strong></p>
<ul>
<li>Automated test result logging</li>
<li>Real-time alerts for out-of-spec results</li>
<li>Complete audit trail for every test</li>
</ul>
<p>Join our next webinar to see CAT-QT in action and learn how it can transform your quality operations.</p>`,
      'default': `<p>Thank you for your interest in CAT-I.AI. We're excited to share how our platform can help transform your food safety compliance operations.</p>
<p>Our comprehensive suite of modules provides everything you need to maintain the highest standards of food safety and regulatory compliance.</p>
<p>We'd love to schedule a personalized demo to show you how CAT-I.AI can work for your specific needs.</p>`
    };

    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('product') || lowerPrompt.includes('update') || lowerPrompt.includes('feature')) {
      return templates['product'];
    }
    if (lowerPrompt.includes('newsletter')) {
      return templates['newsletter'];
    }
    if (lowerPrompt.includes('highlight') || lowerPrompt.includes('spotlight')) {
      return templates['feature'];
    }
    return templates['default'];
  }

  regenerateAi() {
    this.generateWithAi();
  }

  insertAiContent() {
    const content = this.generatedContent();
    if (content && this.editorContent) {
      this.editorContent.nativeElement.innerHTML = content;
      this.newCampaign.bodyHtml = content;
      this.generatedContent.set(null);
      this.showAiPanel.set(false);
    }
  }

  // Preview Rendering
  renderPreview(): SafeHtml {
    const template = this.getSelectedTemplate();
    if (!template) return this.sanitizer.bypassSecurityTrustHtml('');

    const fromOpt = this.getFromOption();
    const leads = this.dataService.leads();
    const sampleLead = leads[0];

    let html = template.htmlTemplate;

    // Replace merge fields with sample data
    html = html.replace(/\{\{contact_name\}\}/g, sampleLead?.contact?.split(' ')[0] || 'there');
    html = html.replace(/\{\{company_name\}\}/g, sampleLead?.company || 'Your Company');
    html = html.replace(/\{\{from_name\}\}/g, fromOpt?.name || (this.authService.user()?.name ?? 'User'));
    html = html.replace(/\{\{from_role\}\}/g, fromOpt?.role || 'CEO');
    html = html.replace(/\{\{from_email\}\}/g, fromOpt?.email || 'aisha@cat-i.ai');
    html = html.replace(/\{\{event_name\}\}/g, 'Food Safety Compliance Webinar');
    html = html.replace(/\{\{event_date\}\}/g, 'April 15, 2026');
    html = html.replace(/\{\{event_time\}\}/g, '2:00 PM PT');

    // Replace body content
    const bodyContent = this.newCampaign.bodyHtml || '<p style="color: #9CA3AF;">(Your content will appear here)</p>';
    html = html.replace(/\{\{body_content\}\}/g, bodyContent);

    // Replace CTA block
    if (template.hasCta && this.ctaText && this.ctaUrl) {
      const ctaBlock = `<div style="text-align: center; margin: 24px 0;">
        <a href="${this.ctaUrl}" style="display: inline-block; padding: 14px 32px; background: #0D9488; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">${this.ctaText}</a>
      </div>`;
      html = html.replace(/\{\{cta_block\}\}/g, ctaBlock);
    } else {
      html = html.replace(/\{\{cta_block\}\}/g, '');
    }

    // Replace image block
    if (template.hasImage && this.uploadedImageUrl()) {
      const imgBlock = `<div style="margin: 16px 0;"><img src="${this.uploadedImageUrl()}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;" /></div>`;
      html = html.replace(/\{\{image_block\}\}/g, imgBlock);
    } else {
      html = html.replace(/\{\{image_block\}\}/g, '');
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  renderCampaignPreview(campaign: EmailCampaign): SafeHtml {
    // For existing campaigns, render a simple preview
    const fromOpt = this.fromOptions.find(o => o.email === campaign.fromEmail);

    const html = `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif;">
      <div style="height: 4px; background: linear-gradient(to right, #E11D48, #EA580C, #D97706, #34A125, #0891B2, #1A56DB, #7C3AED);"></div>
      <div style="background: #1F2937; padding: 0;">
        <div style="text-align: center; padding: 32px 24px 24px;">
          <div style="font-size: 28px; font-weight: 700; color: #fff;">
            <span style="color: #D97706;">C</span><span style="color: #1A56DB;">A</span><span style="color: #34A125;">T</span><span style="color: #7C3AED;">-I</span><span style="color: #9CA3AF;">.AI</span>
          </div>
        </div>
        <div style="background: #fff; margin: 0 24px 24px; border-radius: 8px; padding: 32px;">
          <p style="font-size: 16px; color: #111827; margin-bottom: 16px;">Hi there,</p>
          <div>${campaign.bodyHtml || '<p>No content</p>'}</div>
          ${campaign.imageDataUrl ? `<div style="margin: 16px 0;"><img src="${campaign.imageDataUrl}" style="max-width: 100%; border-radius: 8px;" /></div>` : ''}
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="font-size: 14px; color: #6B7280;">Warmly,</p>
          <p style="font-size: 16px; font-weight: 600; color: #0D9488; margin-top: 4px;">${campaign.fromName}</p>
          <p style="font-size: 13px; color: #6B7280;">${fromOpt?.role || ''}, CAT-I.AI, Inc.</p>
          <p style="font-size: 13px; color: #6B7280;">${campaign.fromEmail}</p>
        </div>
        <div style="height: 4px; background: linear-gradient(to right, #E11D48, #EA580C, #D97706, #34A125, #0891B2, #1A56DB, #7C3AED);"></div>
        <div style="text-align: center; padding: 16px 24px;">
          <p style="font-size: 12px; color: #6B7280;">CAT-I.AI, Inc. | AUDIT-READY ALL THE TIME | cat-i.ai</p>
        </div>
      </div>
    </div>`;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Save, Schedule & Send Now
  saveDraft() {
    this.createCampaign('Draft');
  }

  scheduleSend() {
    this.createCampaign('Scheduled');
  }

  sendNow() {
    this.createCampaign('Draft', true);
  }

  createCampaign(status: 'Draft' | 'Scheduled', sendImmediately = false) {
    if (!this.newCampaign.name || !this.newCampaign.subject || this.campaignSaving()) return;

    // Only read from contenteditable if user typed content manually.
    // If an HTML file was imported, bodyHtml already has the raw HTML — don't
    // override it with the browser's mangled DOM serialization.
    if (this.editorContent && !this.htmlImported()) {
      this.newCampaign.bodyHtml = this.editorContent.nativeElement.innerHTML;
    }

    this.campaignSaving.set(true);

    const audience: EmailAudience = {
      type: this.audienceType,
      stages: this.audienceType === 'by_stage' ? this.selectedStages : undefined,
      modules: this.audienceType === 'by_module' ? this.selectedModules : undefined
    };

    const campaignData = {
      name: this.newCampaign.name!,
      fromName: this.newCampaign.fromName || (this.authService.user()?.name ?? 'User'),
      fromEmail: this.newCampaign.fromEmail || 'dev@cat-i.ai',
      subject: this.newCampaign.subject!,
      contentPieceId: this.newCampaign.contentPieceId,
      status,
      audience,
      scheduledDate: this.newCampaign.scheduledDate,
      recipients: this.estimatedRecipients(),
      bodyHtml: this.newCampaign.bodyHtml || '',
      imageFileName: this.newCampaign.imageFileName,
      imageDataUrl: this.newCampaign.imageDataUrl,
      createdBy: this.newCampaign.createdBy || (this.authService.user()?.name ?? 'User')
    };

    const editingId = this.editingCampaignId();

    if (sendImmediately) {
      if (editingId) {
        this.dataService.updateCampaign(editingId, campaignData);
        this.dataService.sendCampaign(editingId);
        this.campaignSaving.set(false);
        this.closeNewModal();
      } else {
        this.http.post<EmailCampaign>(`${environment.apiUrl}/campaigns`, campaignData, { withCredentials: true }).subscribe({
          next: (created) => {
            // Close modal immediately — send happens in the background
            this.campaignSaving.set(false);
            this.closeNewModal();
            this.dataService.sendCampaign(created.id);
          },
          error: (err) => {
            this.campaignSaving.set(false);
            alert(err?.error?.error || 'Failed to create campaign');
          },
        });
      }
    } else if (editingId) {
      this.dataService.updateCampaign(editingId, campaignData);
      this.campaignSaving.set(false);
      this.closeNewModal();
    } else {
      this.dataService.addCampaign(campaignData);
      this.campaignSaving.set(false);
      this.closeNewModal();
    }
  }

  // ─── Recipients tracking ───
  detailTab = signal<'preview' | 'recipients'>('preview');
  campaignRecipients = signal<any[]>([]);
  selectedRecipientIds = signal<Set<number>>(new Set());
  sendingReminder = signal(false);

  recipientStats = computed(() => {
    const r = this.campaignRecipients();
    return {
      sent: r.filter(x => x.status === 'sent').length,
      failed: r.filter(x => x.status === 'failed').length,
      reminded: r.filter(x => x.remindedAt).length,
    };
  });

  loadRecipients(campaignId: number) {
    this.http.get<any[]>(`${environment.apiUrl}/campaigns/${campaignId}/recipients`, { withCredentials: true }).subscribe({
      next: (data) => this.campaignRecipients.set(data),
      error: () => this.campaignRecipients.set([]),
    });
  }

  toggleRecipient(id: number) {
    this.selectedRecipientIds.update(ids => {
      const s = new Set(ids);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  toggleAllRecipients(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRecipientIds.set(new Set(this.campaignRecipients().map(r => r.id)));
    } else {
      this.selectedRecipientIds.set(new Set());
    }
  }

  allRecipientsSelected = computed(() => {
    const all = this.campaignRecipients();
    if (all.length === 0) return false;
    return all.every(r => this.selectedRecipientIds().has(r.id));
  });

  selectAllSentRecipients() {
    const sentIds = this.campaignRecipients().filter(r => r.status === 'sent').map(r => r.id);
    this.selectedRecipientIds.set(new Set(sentIds));
  }

  sendReminder() {
    const campaign = this.selectedCampaign();
    if (!campaign) return;
    const ids = Array.from(this.selectedRecipientIds());
    if (ids.length === 0) return;

    if (!confirm(`Send reminder to ${ids.length} recipient${ids.length !== 1 ? 's' : ''}?`)) return;

    this.sendingReminder.set(true);
    this.http.post<any>(`${environment.apiUrl}/campaigns/${campaign.id}/recipients`, {
      recipientIds: ids,
    }, { withCredentials: true }).subscribe({
      next: (res) => {
        this.sendingReminder.set(false);
        this.selectedRecipientIds.set(new Set());
        this.loadRecipients(campaign.id);
        alert(`${res.sent} reminder${res.sent !== 1 ? 's' : ''} sent`);
      },
      error: (err) => {
        this.sendingReminder.set(false);
        alert(err?.error?.error || 'Failed to send reminders');
      },
    });
  }

  getRecipientBadge(status: string): string {
    return status === 'sent' ? 'green' : status === 'failed' ? 'red' : 'gray';
  }

  // ─── Template Management (ported from Artem) ───
  renameTemplate(template: EmailTemplate) {
    const newName = prompt('Rename template:', template.name);
    if (newName && newName !== template.name) {
      this.templateService.renameTemplate(template.id, newName);
    }
  }

  markPrimary(template: EmailTemplate) {
    this.templateService.setPrimary(template.id);
  }

  deletePickerTemplate(template: EmailTemplate) {
    if (template.source !== 'uploaded') return;
    if (confirm(`Delete template "${template.name}"?`)) {
      this.templateService.deleteTemplate(template.id);
      if (this.selectedTemplateId() === template.id) {
        const first = this.pickerTemplates()[0];
        if (first) this.selectedTemplateId.set(first.id);
      }
    }
  }

  async onPickerHtmlUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const newTemplate = await this.templateService.uploadHtmlTemplate(file);
    this.selectedTemplateId.set(newTemplate.id);
    input.value = '';
  }

  // ─── Editable Content Blocks ───
  getEmptyBlocks(): CampaignEditableBlocks {
    return { greeting: '', intro: '', body: '', closing: '', ctaLabel: 'Learn More', ctaUrl: 'https://cat-i.ai' };
  }

  onBlocksChange() {
    this.ctaText = this.blocks.ctaLabel || 'Learn More';
    this.ctaUrl = this.blocks.ctaUrl || 'https://cat-i.ai';
  }

  // ─── Send Test Email ───
  openTestSendModal() {
    this.testSendEmail = this.authService.user()?.email ?? '';
    this.testSendResult.set(null);
    this.showTestSendModal.set(true);
  }

  closeTestSendModal() {
    this.showTestSendModal.set(false);
    this.testSendResult.set(null);
  }

  submitTestSend() {
    if (!this.testSendEmail || !this.newCampaign.subject) return;
    this.testSending.set(true);

    if (this.editorContent && !this.htmlImported()) {
      this.newCampaign.bodyHtml = this.editorContent.nativeElement.innerHTML;
    }

    this.http.post<any>(`${environment.apiUrl}/email/test-send`, {
      to: this.testSendEmail,
      subject: `[TEST] ${this.newCampaign.subject}`,
      bodyHtml: this.newCampaign.bodyHtml || '',
      fromName: this.newCampaign.fromName || this.authService.user()?.name,
      fromEmail: this.newCampaign.fromEmail || 'dev@cat-i.ai',
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.testSending.set(false);
        this.testSendResult.set({ ok: true, message: `Test email sent to ${this.testSendEmail}` });
      },
      error: (err) => {
        this.testSending.set(false);
        this.testSendResult.set({ ok: false, message: err?.error?.error || 'Failed to send test email' });
      },
    });
  }

  // ─── Preview Recipient ───
  onPreviewRecipientChange() {
    // Triggers re-render of preview via change detection
  }

  scheduleCampaign(campaign: EmailCampaign) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().split('T')[0];
    this.dataService.updateCampaign(campaign.id, { status: 'Scheduled', scheduledDate });
  }

  sendCampaign(campaign: EmailCampaign) {
    const opens = Math.floor(campaign.recipients * (0.2 + Math.random() * 0.3));
    const clicks = Math.floor(opens * (0.1 + Math.random() * 0.2));
    this.dataService.sendCampaign(campaign.id);
    this.dataService.updateCampaign(campaign.id, { opens, clicks });
  }

  deleteCampaign(campaign: EmailCampaign) {
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      this.dataService.deleteCampaign(campaign.id);
    }
  }
}
