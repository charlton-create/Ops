import { Component, EventEmitter, Input, Output, inject, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmailTemplateService } from '../../../core/services/email-template.service';
import { EmailTemplate, CampaignEditableBlocks } from '../../../core/models';
import { resolveEmailTemplate, recipientFromLead, SenderInfo } from '../../utils/email-template-render';
import { IconComponent } from '../../icons';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

export interface DirectEmailRecipient {
  email: string;
  contactName?: string;
  company?: string;
}

export interface DirectEmailSentPayload {
  to: string;
  subject: string;
  templateId: string;
  templateName: string;
  from: string;
}

/**
 * One-to-one send composer built on the shared template renderer.
 *
 * Used from Leads (and any future entity that has a single email recipient).
 * Flow: template picker → editor (with prefilled recipient from entity) → preview → send.
 *
 * Deliberately omits campaign-only fields (audience, stages, modules, scheduled send,
 * estimated recipients). This is a direct send.
 */
@Component({
  selector: 'app-direct-email-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (open) {
      <div class="dec-backdrop" (click)="cancel()"></div>
      <div class="dec-modal">
        <!-- STEP 1: Template Picker -->
        @if (step() === 'template') {
          <div class="dec-header">
            <div>
              <h2>Choose a template</h2>
              <p class="dec-subtitle">Sending to <strong>{{ displayRecipient() }}</strong></p>
            </div>
            <button class="dec-close" (click)="cancel()">&times;</button>
          </div>
          <div class="dec-body dec-template-body">
            @if (templates().length === 0) {
              <div class="dec-empty">No templates available.</div>
            } @else {
              <div class="dec-template-grid">
                @for (tpl of templates(); track tpl.id) {
                  <button type="button"
                          class="dec-template-card"
                          [class.selected]="selectedTemplateId() === tpl.id"
                          (click)="useTemplate(tpl)">
                    @if (tpl.featured) {
                      <div class="dec-template-badge">★ Primary</div>
                    }
                    <div class="dec-template-thumb" [style.background]="tpl.previewColor || '#E5E7EB'">
                      <span class="dec-template-initial">{{ tpl.name.charAt(0) }}</span>
                    </div>
                    <div class="dec-template-name">{{ tpl.name }}</div>
                    <div class="dec-template-desc">{{ tpl.description || '—' }}</div>
                  </button>
                }
              </div>
            }
          </div>
          <div class="dec-footer">
            <button class="btn-secondary" (click)="cancel()">Cancel</button>
          </div>
        }

        <!-- STEP 2: Compose -->
        @if (step() === 'compose') {
          <div class="dec-header">
            <button class="dec-back" (click)="step.set('template')" title="Back to templates">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h2>Send Email</h2>
              <p class="dec-subtitle">To <strong>{{ displayRecipient() }}</strong> · Template: {{ selectedTemplate()?.name }}</p>
            </div>
            <div class="dec-tabs">
              <button [class.active]="tab() === 'edit'" (click)="tab.set('edit')">Edit</button>
              <button [class.active]="tab() === 'preview'" (click)="tab.set('preview')">Preview</button>
            </div>
            <button class="dec-close" (click)="cancel()">&times;</button>
          </div>

          @if (tab() === 'edit') {
            <div class="dec-body">
              <!-- Recipient summary -->
              <div class="dec-recipient-card">
                <div class="dec-recipient-avatar">{{ recipientInitial() }}</div>
                <div class="dec-recipient-info">
                  <div class="dec-recipient-name">{{ recipient?.contactName || '(no contact name)' }}</div>
                  <div class="dec-recipient-meta">
                    {{ recipient?.company || '—' }}
                    <span class="dec-dot">·</span>
                    <span class="dec-recipient-email">{{ recipient?.email || '(no email)' }}</span>
                  </div>
                </div>
                @if (!recipient?.email) {
                  <span class="dec-warn-chip">No email on file</span>
                }
              </div>

              <div class="dec-form-row">
                <div class="dec-field flex-1">
                  <label>From *</label>
                  <select [(ngModel)]="selectedFrom" (change)="onFromChange()">
                    @for (opt of fromOptions(); track opt.email) {
                      <option [value]="opt.email">{{ opt.display }}</option>
                    }
                  </select>
                </div>
                <div class="dec-field flex-2">
                  <label>Subject *</label>
                  <input type="text" [(ngModel)]="subject" placeholder="Email subject" />
                </div>
              </div>

              <div class="dec-field">
                <label>Email body</label>
                <textarea [(ngModel)]="bodyHtml" rows="6" placeholder="Write the message body…"></textarea>
              </div>

              <div class="dec-section">
                <div class="dec-section-label">Content blocks</div>
                <div class="dec-form-row">
                  <div class="dec-field flex-1">
                    <label>Greeting</label>
                    <input type="text" [(ngModel)]="blocks.greeting" placeholder="Hi {{'{{'}}first_name{{'}}'}}," />
                  </div>
                  <div class="dec-field flex-1">
                    <label>Closing line</label>
                    <input type="text" [(ngModel)]="blocks.closing" placeholder="Looking forward to connecting." />
                  </div>
                </div>
                <div class="dec-form-row">
                  <div class="dec-field flex-1">
                    <label>CTA button text</label>
                    <input type="text" [(ngModel)]="blocks.ctaLabel" placeholder="Book a time" />
                  </div>
                  <div class="dec-field flex-2">
                    <label>CTA button URL</label>
                    <input type="text" [(ngModel)]="blocks.ctaUrl" placeholder="https://..." />
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <div class="dec-body dec-preview-body">
              <div class="dec-preview-canvas" [innerHTML]="renderedPreview()"></div>
            </div>
          }

          <div class="dec-footer">
            <span class="dec-integration">
              <app-icon name="link" [size]="12"></app-icon> via Amazon SES
            </span>
            @if (sendResult()) {
              <span class="dec-inline-result" [class.error]="!sendResult()!.ok">{{ sendResult()!.message }}</span>
            }
            <div class="dec-spacer"></div>
            <button class="btn-secondary" (click)="cancel()" [disabled]="sending()">Cancel</button>
            <button
              class="btn-primary"
              (click)="send()"
              [disabled]="!canSend()"
              [title]="sendDisabledReason()"
            >
              @if (sending()) { <span class="dec-spinner"></span> Sending… }
              @else { Send Email }
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }
    .dec-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 1400; }
    .dec-modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(760px, 94vw); max-height: 90vh;
      background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      z-index: 1401; display: flex; flex-direction: column; overflow: hidden;
    }

    .dec-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--color-border); }
    .dec-header h2 { margin: 0; font-size: 17px; font-weight: 600; color: var(--color-gray-900); }
    .dec-subtitle { margin: 2px 0 0; font-size: 12px; color: var(--color-gray-500); }
    .dec-close { background: none; border: none; font-size: 22px; color: var(--color-gray-400); cursor: pointer; padding: 0; margin-left: auto; line-height: 1; }
    .dec-close:hover { color: var(--color-gray-700); }
    .dec-back { background: none; border: 1px solid var(--color-border); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-gray-600); }
    .dec-back:hover { background: var(--color-gray-50); }
    .dec-tabs { display: flex; gap: 2px; padding: 2px; background: var(--color-gray-100); border-radius: 6px; margin-left: auto; }
    .dec-tabs button { border: none; background: transparent; padding: 4px 12px; border-radius: 4px; font-size: 12px; color: var(--color-gray-600); cursor: pointer; }
    .dec-tabs button.active { background: white; color: var(--color-gray-900); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .dec-body { padding: 18px 22px; overflow: auto; flex: 1; min-height: 0; }
    .dec-template-body { background: var(--color-gray-50); }
    .dec-template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .dec-template-card {
      position: relative; background: white; border: 1px solid var(--color-border); border-radius: 10px;
      padding: 14px; text-align: left; cursor: pointer; transition: all 0.15s;
      display: flex; flex-direction: column; gap: 6px;
    }
    .dec-template-card:hover { border-color: var(--color-gray-300); box-shadow: 0 4px 10px rgba(0,0,0,0.04); transform: translateY(-1px); }
    .dec-template-card.selected { border-color: #8860D0; box-shadow: 0 0 0 3px rgba(136,96,208,0.12); }
    .dec-template-badge { position: absolute; top: 8px; right: 8px; font-size: 10px; font-weight: 600; color: #6B21A8; background: #F3E8FF; padding: 2px 8px; border-radius: 999px; }
    .dec-template-thumb { height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 700; }
    .dec-template-name { font-size: 13px; font-weight: 600; color: var(--color-gray-900); }
    .dec-template-desc { font-size: 11px; color: var(--color-gray-500); line-height: 1.4; }

    .dec-empty { padding: 40px; text-align: center; color: var(--color-gray-500); }

    .dec-recipient-card {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; background: var(--color-gray-50); border: 1px solid var(--color-border); border-radius: 8px;
      margin-bottom: 14px;
    }
    .dec-recipient-avatar { width: 36px; height: 36px; border-radius: 50%; background: #8860D0; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0; }
    .dec-recipient-info { flex: 1; min-width: 0; }
    .dec-recipient-name { font-size: 14px; font-weight: 600; color: var(--color-gray-900); }
    .dec-recipient-meta { font-size: 12px; color: var(--color-gray-500); }
    .dec-dot { margin: 0 6px; color: var(--color-gray-300); }
    .dec-recipient-email { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .dec-warn-chip { font-size: 11px; font-weight: 600; background: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }

    .dec-form-row { display: flex; gap: 12px; }
    .dec-form-row + .dec-form-row { margin-top: 12px; }
    .dec-field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .dec-field.flex-1 { flex: 1; }
    .dec-field.flex-2 { flex: 2; }
    .dec-field label { font-size: 12px; font-weight: 500; color: var(--color-gray-700); }
    .dec-field input, .dec-field select, .dec-field textarea {
      padding: 9px 11px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 13px; font-family: inherit;
      color: var(--color-gray-900); background: white; width: 100%; box-sizing: border-box;
    }
    .dec-field input:focus, .dec-field select:focus, .dec-field textarea:focus { outline: none; border-color: #8860D0; box-shadow: 0 0 0 3px rgba(136,96,208,0.12); }
    .dec-field textarea { resize: vertical; line-height: 1.5; }
    .dec-section { margin-top: 16px; padding: 14px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-gray-50); }
    .dec-section-label { font-size: 12px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 10px; letter-spacing: 0.2px; text-transform: uppercase; }

    .dec-preview-body { background: var(--color-gray-50); }
    .dec-preview-canvas { max-width: 680px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

    .dec-footer { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--color-border); background: white; }
    .dec-integration { font-size: 12px; color: var(--color-gray-500); display: inline-flex; align-items: center; gap: 6px; }
    .dec-inline-result { font-size: 12px; color: #065F46; }
    .dec-inline-result.error { color: var(--color-error-hover); }
    .dec-spacer { flex: 1; }
    .btn-primary { padding: 8px 16px; background: #8860D0; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary:hover:not(:disabled) { background: #7550C0; }
    .btn-primary:disabled { background: var(--color-gray-300); cursor: not-allowed; }
    .btn-secondary { padding: 8px 16px; background: var(--color-gray-100); color: var(--color-gray-700); border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .btn-secondary:hover:not(:disabled) { background: var(--color-border); }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .dec-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: dec-spin 0.6s linear infinite; }
    @keyframes dec-spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .dec-modal { width: 100vw; max-height: 100vh; border-radius: 0; }
      .dec-form-row { flex-direction: column; gap: 0; }
      .dec-tabs { display: none; }
    }
  `]
})
export class DirectEmailComposerComponent implements OnChanges {
  @Input() open = false;
  @Input() recipient: DirectEmailRecipient | null = null;
  @Input() currentUserEmail = 'aisha@cat-i.ai';

  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<DirectEmailSentPayload>();

  private templateService = inject(EmailTemplateService);
  private sanitizer = inject(DomSanitizer);

  templates = this.templateService.pickerTemplates;
  selectedTemplateId = signal<string>('');
  step = signal<'template' | 'compose'>('template');
  tab = signal<'edit' | 'preview'>('edit');

  subject = '';
  bodyHtml = '';
  blocks: CampaignEditableBlocks = {};

  private dataService = inject(ApiService);
  private http = inject(HttpClient);
  fromOptions = computed(() =>
    this.dataService.team()
      .filter(t => t.email)
      .map(t => ({ name: t.name, email: t.email, role: t.role, display: `${t.name} <${t.email}>` }))
  );
  selectedFrom = 'aisha@cat-i.ai';

  sending = signal(false);
  sendResult = signal<{ ok: boolean; message: string } | null>(null);

  selectedTemplate = computed(() =>
    this.templates().find(t => t.id === this.selectedTemplateId())
  );

  displayRecipient = computed(() => {
    if (!this.recipient) return '—';
    return this.recipient.contactName || this.recipient.company || this.recipient.email || '—';
  });

  recipientInitial = computed(() => {
    const name = this.recipient?.contactName || this.recipient?.company || this.recipient?.email || '?';
    return name.charAt(0).toUpperCase();
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.reset();
    }
    if (changes['currentUserEmail'] && this.currentUserEmail) {
      this.selectedFrom = this.currentUserEmail;
    }
  }

  private reset() {
    this.step.set('template');
    this.tab.set('edit');
    this.subject = '';
    this.bodyHtml = '';
    this.blocks = {};
    this.sendResult.set(null);
    this.sending.set(false);
    const primary = this.templateService.primaryTemplate();
    this.selectedTemplateId.set(primary?.id || this.templates()[0]?.id || '');
  }

  onFromChange() { /* selectedFrom is bound to ngModel — just triggers preview re-render */ }

  useTemplate(tpl: EmailTemplate) {
    this.selectedTemplateId.set(tpl.id);
    if (tpl.defaultBody) this.bodyHtml = tpl.defaultBody;
    if (tpl.defaultCtaLabel) this.blocks.ctaLabel = tpl.defaultCtaLabel;
    if (tpl.defaultCtaUrl) this.blocks.ctaUrl = tpl.defaultCtaUrl;
    // Default subject if none set yet
    if (!this.subject) {
      this.subject = `${tpl.name} — ${this.recipient?.company || ''}`.trim().replace(/—\s*$/, '');
    }
    this.step.set('compose');
  }

  renderedPreview(): SafeHtml {
    const tpl = this.selectedTemplate();
    if (!tpl) return this.sanitizer.bypassSecurityTrustHtml('');
    const fromOpt = this.fromOptions().find(o => o.email === this.selectedFrom);
    const sender: SenderInfo = fromOpt ? { name: fromOpt.name, role: fromOpt.role, email: fromOpt.email } : {};
    const recipient = recipientFromLead({
      contact: this.recipient?.contactName,
      company: this.recipient?.company,
      email: this.recipient?.email,
    });
    return this.sanitizer.bypassSecurityTrustHtml(
      resolveEmailTemplate(tpl, this.blocks, this.bodyHtml, sender, recipient)
    );
  }

  canSend(): boolean {
    return (
      !!this.recipient?.email &&
      !!this.selectedTemplate() &&
      this.subject.trim().length > 0 &&
      !this.sending()
    );
  }

  sendDisabledReason(): string {
    if (!this.recipient?.email) return 'This lead does not have an email address yet.';
    if (!this.selectedTemplate()) return 'Choose a template';
    if (!this.subject.trim()) return 'Enter a subject line';
    return 'Send email via Amazon SES';
  }

  async send() {
    if (!this.canSend()) return;
    this.sending.set(true);
    this.sendResult.set(null);

    const tpl = this.selectedTemplate()!;
    const fromOpt = this.fromOptions().find(o => o.email === this.selectedFrom);
    const sender: SenderInfo = fromOpt ? { name: fromOpt.name, role: fromOpt.role, email: fromOpt.email } : {};
    const recipient = recipientFromLead({
      contact: this.recipient?.contactName,
      company: this.recipient?.company,
      email: this.recipient?.email,
    });

    // Resolve template tokens (same as preview) so the email has real names, not {{tokens}}
    let resolvedHtml = resolveEmailTemplate(tpl, this.blocks, this.bodyHtml, sender, recipient);

    try {
      // Process through backend to strip VML + upload base64 images to S3
      const processed = await firstValueFrom(
        this.http.post<{ html: string }>(`${environment.apiUrl}/campaigns/process-html`, { html: resolvedHtml }, { withCredentials: true })
      );
      resolvedHtml = processed.html;
    } catch {
      // If processing fails, send as-is
    }

    try {
      await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/email/test-send`, {
          to: this.recipient!.email,
          subject: this.subject.trim(),
          bodyHtml: resolvedHtml,
          fromName: fromOpt?.name || 'CAT-I Team',
          fromEmail: fromOpt?.email,
        }, { withCredentials: true })
      );

      this.sent.emit({
        to: this.recipient!.email,
        subject: this.subject.trim(),
        templateId: tpl.id,
        templateName: tpl.name,
        from: this.selectedFrom,
      });
      this.sendResult.set({ ok: true, message: `Sent to ${this.recipient!.email}` });
      setTimeout(() => this.close(), 1200);
    } catch (err: any) {
      this.sendResult.set({ ok: false, message: err?.error?.error || 'Failed to send — please try again.' });
    } finally {
      this.sending.set(false);
    }
  }

  cancel() { this.close(); }

  private close() { this.closed.emit(); }
}
