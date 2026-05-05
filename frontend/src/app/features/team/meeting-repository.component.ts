import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icons';
import { Meeting, MeetingStatus, MEETING_STATUS_META } from '../../core/models';

type ViewMode = 'list' | 'live' | 'detail';

interface NewMeetingForm {
  title: string;
  attendees: string[];
  attendeeIds: number[];
  agenda: string[];
}

interface ImportForm {
  title: string;
  date: string;
  attendees: string[];
  attendeeIds: number[];
  agenda: string[];
  content: string;
  useAi: boolean;
}

@Component({
  selector: 'app-meeting-repository',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="Meeting Repository" subtitle="Centralized minutes, transcripts, and supporting files"
      icon="mic" gradient="linear-gradient(135deg, #39219F 0%, #1E1B4B 100%)">
      @if (view() === 'list') {
        <button class="btn btn-secondary btn-sm" (click)="openImport()"><app-icon name="plus" [size]="14"></app-icon> Import Past</button>
        <button class="btn btn-primary btn-sm" (click)="openNew()"><app-icon name="mic" [size]="14"></app-icon> New Meeting</button>
      }
      @if (view() !== 'list') {
        <button class="btn btn-ghost btn-sm" (click)="goList()">← Repository</button>
      }
    </app-header>

    <div class="content">
      @if (view() === 'list') {
        <!-- Stats -->
        <div class="stat-row">
          <div class="stat"><span class="k">Total</span><span class="v">{{ meetings().length }}</span></div>
          <div class="stat success"><span class="k">Completed</span><span class="v">{{ completedCount() }}</span></div>
          <div class="stat danger"><span class="k">Live</span><span class="v">{{ liveCount() }}</span></div>
          <div class="stat"><span class="k">Imported</span><span class="v">{{ importedCount() }}</span></div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <input [(ngModel)]="search" class="search-input" placeholder="Search meetings, summaries, attendees…" />
          <div class="seg-tabs">
            @for (f of FILTERS; track f.id) {
              <button [class.active]="filter() === f.id" (click)="filter.set(f.id)">{{ f.label }}</button>
            }
          </div>
        </div>

        @if (filteredMeetings().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🎙</div>
            <div class="empty-title">{{ meetings().length === 0 ? 'Your repository is empty' : 'No meetings match this filter' }}</div>
            <div class="empty-text">
              {{ meetings().length === 0 ? 'Start your first meeting to begin building the team archive.' : 'Try a different filter or clear the search.' }}
            </div>
            @if (meetings().length === 0) {
              <div style="display:flex; gap:10px; justify-content:center;">
                <button class="btn btn-primary" (click)="openNew()"><app-icon name="mic" [size]="14"></app-icon> Start New</button>
                <button class="btn btn-ghost" (click)="openImport()"><app-icon name="plus" [size]="14"></app-icon> Import Past</button>
              </div>
            }
          </div>
        } @else {
          <div class="meeting-grid">
            @for (m of filteredMeetings(); track m.id) {
              <div class="meeting-card" (click)="open(m)">
                <div class="card-head">
                  <div class="card-meta">📅 {{ formatDate(m.date) }} · {{ formatTime(m.date) }}</div>
                  <span class="status-pill"
                        [style.background]="STATUS_META[m.status].bg"
                        [style.color]="STATUS_META[m.status].color">
                    @if (m.status === 'live') { <span class="pulse"></span> }
                    {{ STATUS_META[m.status].label }}
                  </span>
                </div>
                <h3 class="card-title">{{ m.title }}</h3>
                <p class="card-snippet">
                  {{ m.snippet || (m.imported ? 'Imported meeting — open to view structured content.' : 'No summary yet — open to view details.') }}
                </p>
                <div class="card-foot">
                  <span>👥 {{ m.attendeeCount || m.attendees.length }} attendee{{ (m.attendeeCount || m.attendees.length) === 1 ? '' : 's' }}</span>
                  <button class="icon-btn" (click)="confirmDelete(m, $event)" title="Delete"><app-icon name="trash" [size]="13"></app-icon></button>
                </div>
              </div>
            }
          </div>
        }
      }

      @if (view() === 'live' && active()) {
        <ng-container *ngIf="active() as m">
          <div class="live-shell">
            <div class="live-main">
              <div class="live-header">
                <div>
                  <h2 class="live-title">{{ m.title }}</h2>
                  <div class="live-meta">
                    <span>📅 {{ formatDate(m.date) }}</span>
                    <span>🕒 Started {{ formatTime(m.date) }}</span>
                    <span>👥 {{ m.attendees.length }}</span>
                    @if (recording()) { <span class="rec-tag"><span class="pulse"></span> Recording</span> }
                    @if (paused()) { <span class="paused-tag">⏸ Paused</span> }
                  </div>
                </div>
                <div class="live-actions">
                  @if (!recording()) {
                    <button class="btn btn-danger btn-sm" [disabled]="!speechSupported()" (click)="startRecording()">
                      <app-icon name="mic" [size]="14"></app-icon>
                      {{ paused() ? 'Resume' : 'Start Recording' }}
                    </button>
                  } @else {
                    <button class="btn btn-warning btn-sm" (click)="pauseRecording()">⏸ Pause</button>
                  }
                  <button class="btn btn-primary btn-sm" (click)="confirmEnd.set(true)">⏹ End Meeting</button>
                </div>
              </div>

              @if (!speechSupported()) {
                <div class="alert warn">
                  <strong>Voice-to-text unavailable.</strong> Use Chrome, Edge, or Safari (desktop) for live transcription. You can still take manual notes below.
                </div>
              }
              @if (speechError()) {
                <div class="alert warn">{{ speechError() }}</div>
              }

              <div class="card transcript-card">
                <div class="card-toolbar">
                  <span class="card-toolbar-label">Live Transcript</span>
                  <span class="card-toolbar-meta">{{ wordCount(transcript()) }} words</span>
                </div>
                <div class="transcript-body" #transcriptBody>
                  @if (transcript() || interim()) {
                    @if (transcript()) { <span>{{ transcript() }}</span> }
                    @if (interim()) { <span class="interim"> {{ interim() }}</span> }
                  } @else {
                    <div class="transcript-empty">
                      {{ recording() ? 'Listening… start speaking to see the transcription appear here.' : 'Press "Start Recording" to begin.' }}
                    </div>
                  }
                </div>
              </div>

              <div class="card">
                <div class="card-toolbar">
                  <span class="card-toolbar-label">Manual Notes (Optional)</span>
                </div>
                <textarea class="notes-area"
                  [ngModel]="m.discussion ?? ''"
                  (ngModelChange)="updateField('discussion', $event)"
                  placeholder="Add manual notes or corrections to the transcript here…"></textarea>
              </div>
            </div>

            <aside class="live-side">
              <div class="side-card">
                <div class="side-title">👥 Attendees · {{ m.attendees.length }}</div>
                @if (m.attendees.length === 0) { <div class="side-empty">None added</div> }
                @for (a of m.attendees; track a) {
                  <div class="att-row">
                    <span class="avatar">{{ initials(a) }}</span>
                    <span>{{ a }}</span>
                  </div>
                }
              </div>

              <div class="side-card">
                <div class="side-title">📋 Agenda · {{ m.agenda.length }}</div>
                @if (m.agenda.length === 0) { <div class="side-empty">No agenda items</div> }
                @for (item of m.agenda; track i; let i = $index) {
                  <div class="agenda-row">
                    <span class="agenda-num">{{ i + 1 }}</span>
                    <span>{{ item }}</span>
                  </div>
                }
              </div>
            </aside>
          </div>
        </ng-container>
      }

      @if (view() === 'detail' && active()) {
        <ng-container *ngIf="active() as m">
          <div class="detail-head">
            <div>
              <h2 class="live-title">{{ m.title }}</h2>
              <div class="live-meta">
                <span>📅 {{ formatDate(m.date) }} · {{ formatTime(m.date) }}</span>
                <span>👥 {{ m.attendees.length }} attendees</span>
                <span class="status-pill"
                      [style.background]="STATUS_META[m.status].bg"
                      [style.color]="STATUS_META[m.status].color">{{ STATUS_META[m.status].label }}</span>
                @if (m.imported) { <span class="status-pill imported">Imported</span> }
              </div>
            </div>
            <div class="live-actions">
              <button class="btn btn-ghost btn-sm" (click)="exportText(m)">⬇ Export</button>
              <button class="btn btn-secondary btn-sm" [disabled]="regenerating()" (click)="regenerateSummary(m)">
                {{ regenerating() ? 'Regenerating…' : '✨ Regenerate Summary' }}
              </button>
              <button class="btn btn-danger btn-sm" (click)="confirmDelete(m, null)"><app-icon name="trash" [size]="13"></app-icon></button>
            </div>
          </div>

          <div class="detail-shell">
            <div>
              @if (m.summary) {
                <div class="ai-banner">
                  <div>
                    <div class="ai-banner-label">✨ AI-Generated Summary</div>
                    <div class="ai-banner-text">{{ m.summary }}</div>
                  </div>
                </div>
              }

              <div class="section">
                <div class="section-title">📝 Discussion</div>
                @if (m.discussion) {
                  <div class="section-content">{{ m.discussion }}</div>
                } @else {
                  <div class="section-empty">No discussion notes recorded.</div>
                }
              </div>

              <div class="section">
                <div class="section-title">
                  ✓ Action Items
                  @if (m.actionItems.length > 0) {
                    <span class="action-count">{{ openActionCount(m) }} open</span>
                  }
                </div>
                @if (m.actionItems.length === 0) {
                  <div class="section-empty">No action items.</div>
                }
                @for (a of m.actionItems; track a.id) {
                  <div class="action-item">
                    <button class="action-check" [class.done]="a.done" (click)="toggleAction(m, a)" [title]="a.done ? 'Mark open' : 'Mark complete'">
                      @if (a.done) { ✓ }
                    </button>
                    <div style="flex: 1;">
                      <div class="action-task" [class.done]="a.done">{{ a.task }}</div>
                      <div class="action-meta">
                        @if (a.owner) { <span>👤 {{ a.owner }}</span> }
                        @if (a.dueDate) { <span>📅 {{ a.dueDate }}</span> }
                      </div>
                    </div>
                    <button class="icon-btn" (click)="deleteActionItem(m, a)" title="Delete"><app-icon name="trash" [size]="12"></app-icon></button>
                  </div>
                }
              </div>

              <div class="section">
                <div class="section-title">🕒 Follow-Up Tasks</div>
                @if (m.followUps.length === 0) {
                  <div class="section-empty">No follow-up tasks.</div>
                }
                @for (f of m.followUps; track f.id) {
                  <div class="action-item">
                    <span class="followup-num">{{ ($index ?? 0) + 1 }}</span>
                    <div style="flex:1">
                      <div class="action-task">{{ f.task }}</div>
                      @if (f.context) { <div class="action-meta"><span>{{ f.context }}</span></div> }
                    </div>
                  </div>
                }
              </div>

              <details class="section">
                <summary class="section-title-summary">Full Transcript ({{ wordCount(m.transcript ?? '') }} words)</summary>
                <pre class="transcript-pre">{{ m.transcript || '(No transcript available.)' }}</pre>
              </details>
            </div>

            <aside>
              <div class="side-card">
                <div class="side-title">👥 Attendees · {{ m.attendees.length }}</div>
                @if (m.attendees.length === 0) { <div class="side-empty">None added</div> }
                @for (a of m.attendees; track a) {
                  <div class="att-row">
                    <span class="avatar">{{ initials(a) }}</span>
                    <span>{{ a }}</span>
                  </div>
                }
              </div>

              @if (m.agenda.length > 0) {
                <div class="side-card">
                  <div class="side-title">📋 Agenda</div>
                  @for (item of m.agenda; track i; let i = $index) {
                    <div class="agenda-row">
                      <span class="agenda-num">{{ i + 1 }}</span>
                      <span>{{ item }}</span>
                    </div>
                  }
                </div>
              }

              <div class="side-card">
                <div class="side-title">📎 Files & Links · {{ m.files.length }}</div>
                @if (m.files.length === 0) {
                  <div class="side-empty">No files attached</div>
                }
                @for (f of m.files; track f.id) {
                  <div class="file-row">
                    <span class="file-icon">{{ f.kind === 'linked' ? '🔗' : fileExt(f.name) }}</span>
                    <div style="flex:1; min-width:0;">
                      <div class="file-name" [title]="f.name">{{ f.name }}</div>
                      <div class="file-meta">{{ f.kind === 'linked' ? 'External link' : (f.fileSize ? fileSize(f.fileSize) : '—') }}</div>
                    </div>
                    <button class="icon-btn" (click)="openFile(f)" title="Open">{{ f.kind === 'linked' ? '↗' : '⬇' }}</button>
                    <button class="icon-btn" (click)="removeFile(m, f)" title="Remove"><app-icon name="trash" [size]="12"></app-icon></button>
                  </div>
                }
                <div class="file-actions">
                  <input #fileInput type="file" hidden (change)="onFileSelected($event, m)" />
                  <button class="btn btn-ghost btn-xs" (click)="fileInput.click()" [disabled]="uploadingFile()">
                    {{ uploadingFile() ? 'Uploading…' : '+ Upload' }}
                  </button>
                  <button class="btn btn-ghost btn-xs" (click)="showLinkModal.set(true)">+ Link</button>
                </div>
                @if (uploadError()) {
                  <div class="alert warn small">{{ uploadError() }}</div>
                }
              </div>
            </aside>
          </div>
        </ng-container>
      }
    </div>

    <!-- New Meeting modal -->
    @if (showNewModal()) {
      <div class="modal-overlay" (click)="onOverlay($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>New Meeting</h3>
            <button class="icon-btn" (click)="showNewModal.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <label class="field">Title *
              <input [(ngModel)]="newForm.title" placeholder="e.g. Weekly Operations Review" />
            </label>

            <div class="field-label">Attendees</div>
            <div class="att-pick-row">
              <input [(ngModel)]="newAttendeeInput"
                     (keydown.enter)="$event.preventDefault(); addAttendee()"
                     placeholder="Pick a team member or type a name…"
                     list="team-members" />
              <datalist id="team-members">
                @for (t of api.team(); track t.id) { <option [value]="t.name"></option> }
              </datalist>
              <button class="btn btn-ghost btn-sm" (click)="addAttendee()">Add</button>
            </div>
            <div class="chip-row">
              @for (a of newForm.attendees; track a) {
                <span class="chip">{{ a }} <button (click)="removeAttendee(a)">×</button></span>
              }
            </div>

            <div class="field-label" style="margin-top: 14px;">Agenda</div>
            <div class="att-pick-row">
              <input [(ngModel)]="newAgendaInput"
                     (keydown.enter)="$event.preventDefault(); addAgenda()"
                     placeholder="Type an agenda item and press Enter…" />
              <button class="btn btn-ghost btn-sm" (click)="addAgenda()">Add</button>
            </div>
            <ol class="agenda-list">
              @for (item of newForm.agenda; track i; let i = $index) {
                <li>
                  <span>{{ item }}</span>
                  <button class="icon-btn" (click)="removeAgenda(i)"><app-icon name="close" [size]="12"></app-icon></button>
                </li>
              }
            </ol>

            <div class="alert info">
              ✨ The meeting starts in <strong>live recording</strong> mode. Voice will be transcribed automatically.
            </div>
            @if (modalError()) { <div class="alert warn">{{ modalError() }}</div> }
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showNewModal.set(false)">Cancel</button>
            <button class="btn btn-primary" [disabled]="creating()" (click)="submitNew()">
              {{ creating() ? 'Starting…' : '🎙 Start Meeting' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Import Past modal -->
    @if (showImportModal()) {
      <div class="modal-overlay" (click)="onOverlay($event)">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width: 640px;">
          <div class="modal-head">
            <h3>Import Past Meeting</h3>
            <button class="icon-btn" (click)="showImportModal.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <div class="field-row">
              <label class="field">Title *
                <input [(ngModel)]="importForm.title" placeholder="e.g. Q3 Planning Review" />
              </label>
              <label class="field">Date *
                <input type="date" [(ngModel)]="importForm.date" [max]="todayISO" />
              </label>
            </div>

            <div class="field-label">Attendees</div>
            <div class="att-pick-row">
              <input [(ngModel)]="importAttendeeInput"
                     (keydown.enter)="$event.preventDefault(); addImportAttendee()"
                     placeholder="Pick or type a name…"
                     list="team-members-import" />
              <datalist id="team-members-import">
                @for (t of api.team(); track t.id) { <option [value]="t.name"></option> }
              </datalist>
              <button class="btn btn-ghost btn-sm" (click)="addImportAttendee()">Add</button>
            </div>
            <div class="chip-row">
              @for (a of importForm.attendees; track a) {
                <span class="chip">{{ a }} <button (click)="removeImportAttendee(a)">×</button></span>
              }
            </div>

            <div class="field-label" style="margin-top: 14px;">Agenda (optional)</div>
            <div class="att-pick-row">
              <input [(ngModel)]="importAgendaInput"
                     (keydown.enter)="$event.preventDefault(); addImportAgenda()"
                     placeholder="Add agenda item…" />
              <button class="btn btn-ghost btn-sm" (click)="addImportAgenda()">Add</button>
            </div>
            <ol class="agenda-list">
              @for (item of importForm.agenda; track i; let i = $index) {
                <li>
                  <span>{{ item }}</span>
                  <button class="icon-btn" (click)="removeImportAgenda(i)"><app-icon name="close" [size]="12"></app-icon></button>
                </li>
              }
            </ol>

            <div class="field-label" style="margin-top: 14px;">Meeting Content *</div>
            <input #importFileInput type="file" hidden accept=".txt,.md,.markdown,.csv"
                   (change)="onImportFileSelected($event)" />
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
              <button class="btn btn-ghost btn-sm" (click)="importFileInput.click()">⬆ Upload .txt / .md / .csv</button>
              @if (importSourceFileName()) {
                <span style="font-size: 12px; color: var(--text-muted, #6B7280);">Loaded: <strong>{{ importSourceFileName() }}</strong></span>
              }
            </div>
            <textarea class="notes-area"
              [(ngModel)]="importForm.content"
              placeholder="Paste meeting notes, transcript, or email recap here…"
              style="min-height: 160px;"></textarea>
            <div style="font-size: 11px; color: var(--text-muted, #6B7280); margin-top: 4px;">
              {{ wordCount(importForm.content) }} words
            </div>

            <label class="ai-toggle">
              <input type="checkbox" [(ngModel)]="importForm.useAi" />
              <div>
                <div class="ai-toggle-title">✨ Auto-structure with Claude AI</div>
                <div class="ai-toggle-sub">Parse the content into discussion notes, action items, follow-ups, and an executive summary.</div>
              </div>
            </label>

            @if (modalError()) { <div class="alert warn">{{ modalError() }}</div> }
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showImportModal.set(false)" [disabled]="importing()">Cancel</button>
            <button class="btn btn-primary" [disabled]="importing()" (click)="submitImport()">
              {{ importing() ? (importForm.useAi ? 'Structuring with AI…' : 'Filing…') : '📥 Import & File' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Link External File modal -->
    @if (showLinkModal()) {
      <div class="modal-overlay" (click)="onOverlay($event)">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width: 460px;">
          <div class="modal-head">
            <h3>Link External File</h3>
            <button class="icon-btn" (click)="showLinkModal.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <label class="field">Display Name *
              <input [(ngModel)]="linkName" placeholder="e.g. Q4 Sales Report" />
            </label>
            <label class="field">URL *
              <input [(ngModel)]="linkUrl" type="url" placeholder="https://sharepoint.com/..." />
            </label>
            <div class="alert info small">For files in SharePoint, Google Drive, OneDrive, or any shared location.</div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showLinkModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="submitLink()">Add Link</button>
          </div>
        </div>
      </div>
    }

    <!-- End Meeting confirm -->
    @if (confirmEnd()) {
      <div class="modal-overlay" (click)="confirmEnd.set(false)">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width: 460px;">
          <div class="modal-head">
            <h3>End meeting?</h3>
            <button class="icon-btn" (click)="confirmEnd.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <p>The recording will stop and Claude will generate a structured summary report containing the discussion notes, action items, and follow-up tasks. The complete record will be filed in the repository.</p>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="confirmEnd.set(false)">Keep Recording</button>
            <button class="btn btn-primary" [disabled]="endingMeeting()" (click)="endMeeting()">
              {{ endingMeeting() ? 'Generating summary…' : '✨ End & Generate Summary' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .content { padding: 1.5rem; max-width: 1280px; margin: 0 auto; }

    .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .stat { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-left: 4px solid #39219F; border-radius: 10px; padding: 14px 18px; }
    .stat.success { border-left-color: #10B981; }
    .stat.danger { border-left-color: #E11D48; }
    .stat .k { font-size: 11px; font-weight: 700; color: var(--text-muted, #6B7280); text-transform: uppercase; letter-spacing: 0.05em; display: block; }
    .stat .v { font-size: 26px; font-weight: 800; display: block; margin-top: 4px; color: #39219F; }
    .stat.success .v { color: #047857; }
    .stat.danger .v { color: #BE123C; }

    .toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
    .search-input { flex: 1; max-width: 420px; padding: 9px 12px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 13px; background: var(--bg-elevated, #fff); font-family: inherit; }
    .seg-tabs { display: inline-flex; background: var(--bg-soft, #F3F4F6); border-radius: 999px; padding: 3px; gap: 2px; }
    .seg-tabs button { padding: 6px 14px; border: none; background: transparent; color: var(--text-muted, #6B7280); border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .seg-tabs button.active { background: var(--bg-elevated, #fff); color: #39219F; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .empty-state { background: var(--bg-elevated, #fff); border: 1px dashed var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 60px 24px; text-align: center; color: var(--text-muted, #6B7280); }
    .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.6; }
    .empty-title { font-weight: 700; color: var(--text, #111827); margin-bottom: 6px; font-size: 15px; }
    .empty-text { margin-bottom: 16px; }

    .meeting-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    .meeting-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 18px; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; display: flex; flex-direction: column; gap: 10px; }
    .meeting-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .card-meta { font-size: 12px; color: var(--text-muted, #6B7280); }
    .card-title { font-size: 15px; font-weight: 700; line-height: 1.3; margin: 0; }
    .card-snippet { font-size: 12px; color: var(--text-muted, #6B7280); line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 36px; }
    .card-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-hairline, #E5E7EB); font-size: 11px; color: var(--text-muted, #6B7280); }

    .status-pill { padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; display: inline-flex; gap: 5px; align-items: center; text-transform: capitalize; }
    .status-pill.imported { background: #EDE9FE; color: #6D28D9; }
    .pulse { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }

    .icon-btn { width: 26px; height: 26px; border: none; background: transparent; color: var(--text-muted, #6B7280); cursor: pointer; border-radius: 6px; display: grid; place-items: center; }
    .icon-btn:hover { background: var(--bg-soft, #F3F4F6); color: var(--text, #111827); }

    /* Live shell */
    .live-shell { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
    @media (max-width: 980px) { .live-shell { grid-template-columns: 1fr; } }
    .live-main { display: flex; flex-direction: column; gap: 14px; }
    .live-header { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-left: 4px solid #E11D48; border-radius: 12px; padding: 18px 22px; display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
    .live-title { font-size: 18px; font-weight: 800; margin: 0; }
    .live-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--text-muted, #6B7280); margin-top: 6px; }
    .rec-tag { color: #E11D48; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
    .paused-tag { color: #B45309; font-weight: 700; }
    .live-actions { display: flex; gap: 6px; flex-wrap: wrap; }

    .alert { padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 0; }
    .alert.info { background: #EEF2FF; color: #1E40AF; border: 1px solid #C7D6F7; }
    .alert.warn { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
    .alert.small { font-size: 11px; padding: 6px 10px; }

    .card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; }
    .card-toolbar { padding: 12px 16px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); display: flex; justify-content: space-between; align-items: center; }
    .card-toolbar-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); }
    .card-toolbar-meta { font-size: 11px; color: var(--text-muted, #6B7280); }

    .transcript-card { display: flex; flex-direction: column; min-height: 320px; }
    .transcript-body { flex: 1; padding: 18px 22px; overflow-y: auto; font-size: 14px; line-height: 1.7; color: var(--text, #111827); max-height: 420px; min-height: 240px; }
    .transcript-empty { color: var(--text-muted, #9CA3AF); font-style: italic; text-align: center; padding: 60px 20px; }
    .interim { color: var(--text-muted, #6B7280); font-style: italic; }

    .notes-area { width: 100%; padding: 14px 16px; border: none; font-family: inherit; font-size: 13px; line-height: 1.6; resize: vertical; min-height: 100px; background: var(--bg-elevated, #fff); border-radius: 0 0 12px 12px; outline: none; box-sizing: border-box; }

    .live-side { display: flex; flex-direction: column; gap: 12px; }
    .side-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 14px 16px; }
    .side-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); margin-bottom: 10px; }
    .side-empty { font-size: 12px; color: var(--text-muted, #9CA3AF); }

    .att-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 13px; }
    .avatar { width: 26px; height: 26px; border-radius: 50%; background: #EDE9FE; color: #39219F; display: grid; place-items: center; font-size: 11px; font-weight: 700; }

    .agenda-row { display: flex; gap: 8px; padding: 5px 0; font-size: 13px; }
    .agenda-num { width: 18px; height: 18px; border-radius: 50%; background: var(--bg-soft, #F3F4F6); color: var(--text-muted, #6B7280); display: grid; place-items: center; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }

    /* Detail */
    .detail-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 14px; flex-wrap: wrap; }
    .detail-shell { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
    @media (max-width: 980px) { .detail-shell { grid-template-columns: 1fr; } }

    .ai-banner { background: linear-gradient(135deg, #CCFBF1, #DBEAFE); border: 1px solid #0D9488; border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; }
    .ai-banner-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0F766E; margin-bottom: 4px; }
    .ai-banner-text { font-size: 13px; color: var(--text, #111827); }

    .section { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-content { font-size: 13px; line-height: 1.65; color: var(--text-secondary, #4B5563); white-space: pre-wrap; }
    .section-empty { font-size: 12px; color: var(--text-muted, #9CA3AF); font-style: italic; }
    .action-count { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #FEF3C7; color: #92400E; margin-left: 6px; }

    .action-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-hairline, #E5E7EB); }
    .action-item:last-child { border-bottom: none; }
    .action-check { width: 18px; height: 18px; border: 1.5px solid var(--border-hairline, #D1D5DB); border-radius: 4px; cursor: pointer; flex-shrink: 0; margin-top: 2px; display: grid; place-items: center; background: var(--bg-elevated, #fff); font-size: 10px; }
    .action-check.done { background: #10B981; border-color: #10B981; color: white; }
    .action-task { font-weight: 600; color: var(--text, #111827); margin-bottom: 2px; font-size: 13px; }
    .action-task.done { text-decoration: line-through; color: var(--text-muted, #6B7280); }
    .action-meta { font-size: 11px; color: var(--text-muted, #6B7280); display: flex; gap: 12px; }
    .followup-num { width: 22px; height: 22px; border-radius: 6px; background: #EDE9FE; color: #6D28D9; display: grid; place-items: center; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }

    .section-title-summary { font-size: 14px; font-weight: 700; cursor: pointer; }
    .transcript-pre { margin-top: 12px; padding: 12px; background: var(--bg-soft, #F9FAFB); border-radius: 8px; max-height: 360px; overflow-y: auto; white-space: pre-wrap; font-family: inherit; font-size: 12px; line-height: 1.6; }

    .file-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; margin-bottom: 6px; }
    .file-icon { width: 28px; height: 28px; border-radius: 6px; background: #EDE9FE; color: #6D28D9; display: grid; place-items: center; font-size: 9px; font-weight: 700; flex-shrink: 0; text-transform: uppercase; }
    .file-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-meta { font-size: 10px; color: var(--text-muted, #6B7280); }
    .file-actions { display: flex; gap: 6px; margin-top: 10px; }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.5); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
    .modal { background: var(--bg-elevated, #fff); border-radius: 12px; max-width: 560px; width: 100%; max-height: calc(100vh - 80px); display: flex; flex-direction: column; overflow: hidden; }
    .modal-head { padding: 16px 22px; border-bottom: 1px solid var(--border-hairline, #E5E7EB); display: flex; justify-content: space-between; align-items: center; }
    .modal-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
    .modal-body { padding: 18px 22px; overflow-y: auto; }
    .modal-foot { padding: 12px 22px; border-top: 1px solid var(--border-hairline, #E5E7EB); background: var(--bg-soft, #F9FAFB); display: flex; gap: 8px; justify-content: flex-end; }

    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .field input, .field textarea, .field select { padding: 8px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 13px; background: var(--bg-elevated, #fff); font-family: inherit; }
    .field-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #4B5563); margin-bottom: 6px; }
    .field-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
    .att-pick-row { display: flex; gap: 6px; }
    .att-pick-row input { flex: 1; padding: 8px 10px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 13px; font-family: inherit; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: #EDE9FE; color: #6D28D9; font-size: 11px; font-weight: 600; }
    .chip button { background: none; border: none; color: #6D28D9; cursor: pointer; font-size: 14px; padding: 0; }
    .agenda-list { padding-left: 20px; margin: 8px 0 0; color: var(--text-secondary, #4B5563); font-size: 12px; }
    .agenda-list li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; }

    .ai-toggle { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: #CCFBF1; border: 1px solid #0D9488; border-radius: 8px; cursor: pointer; margin-top: 14px; }
    .ai-toggle input { margin-top: 2px; accent-color: #0D9488; }
    .ai-toggle-title { font-weight: 700; color: #0F766E; font-size: 12px; }
    .ai-toggle-sub { font-size: 11px; color: var(--text-secondary, #4B5563); margin-top: 2px; }

    .btn { padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; }
    .btn-primary { background: #39219F; color: white; }
    .btn-primary:hover { background: #2D1B7A; }
    .btn-ghost { background: var(--bg-soft, #F9FAFB); color: var(--text, #111827); border: 1px solid var(--border-hairline, #E5E7EB); }
    .btn-secondary { background: var(--bg-elevated, #fff); color: var(--text, #111827); border: 1px solid var(--border-hairline, #E5E7EB); }
    .btn-danger { background: #E11D48; color: white; }
    .btn-warning { background: #F59E0B; color: white; }
    .btn-sm { padding: 6px 10px; font-size: 11px; }
    .btn-xs { padding: 4px 9px; font-size: 11px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class MeetingRepositoryComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  @ViewChild('transcriptBody') transcriptBody?: ElementRef<HTMLDivElement>;

  readonly STATUS_META = MEETING_STATUS_META;
  readonly FILTERS: { id: 'all' | MeetingStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'completed', label: 'Completed' },
    { id: 'draft', label: 'Draft' },
  ];

  view = signal<ViewMode>('list');
  active = signal<Meeting | null>(null);
  filter = signal<'all' | MeetingStatus>('all');
  search = '';
  todayISO = new Date().toISOString().slice(0, 10);

  // Modal state
  showNewModal = signal(false);
  showImportModal = signal(false);
  showLinkModal = signal(false);
  confirmEnd = signal(false);
  modalError = signal('');
  creating = signal(false);
  importing = signal(false);
  endingMeeting = signal(false);
  regenerating = signal(false);
  uploadingFile = signal(false);
  uploadError = signal('');

  newForm: NewMeetingForm = { title: '', attendees: [], attendeeIds: [], agenda: [] };
  newAttendeeInput = '';
  newAgendaInput = '';

  importForm: ImportForm = {
    title: '', date: new Date().toISOString().slice(0, 10),
    attendees: [], attendeeIds: [], agenda: [], content: '', useAi: true,
  };
  importAttendeeInput = '';
  importAgendaInput = '';
  importSourceFileName = signal<string | null>(null);

  linkName = '';
  linkUrl = '';

  // Live recording state
  recording = signal(false);
  paused = signal(false);
  speechSupported = signal(true);
  speechError = signal('');
  transcript = signal('');
  interim = signal('');
  private recognition: any = null;
  private recordingRef = false;
  private transcriptRef = '';
  private autoSaveTimer: any = null;

  meetings = computed(() => this.api.meetings());
  liveCount = computed(() => this.meetings().filter(m => m.status === 'live').length);
  completedCount = computed(() => this.meetings().filter(m => m.status === 'completed').length);
  importedCount = computed(() => this.meetings().filter(m => m.imported).length);

  filteredMeetings = computed(() => {
    const q = this.search.trim().toLowerCase();
    return this.meetings()
      .filter(m => this.filter() === 'all' || m.status === this.filter())
      .filter(m => !q
        || (m.title || '').toLowerCase().includes(q)
        || (m.snippet || '').toLowerCase().includes(q)
        || m.attendees.some(a => a.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  ngOnInit() {
    this.api.refreshMeetings();
    this.api.loadAll();
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    this.stopRecognition();
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
  }

  // ─── Speech Recognition ─────────────────────────────────────────────────────
  initSpeechRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.speechSupported.set(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        const next = (this.transcriptRef + ' ' + finalText).trim().replace(/\s+/g, ' ');
        this.transcript.set(next);
        this.transcriptRef = next;
        this.scheduleAutoSave();
      }
      this.interim.set(interimText);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.speechError.set('Microphone permission denied. Please grant access in your browser settings.');
        this.recording.set(false);
        this.recordingRef = false;
      } else if (e.error === 'no-speech') {
        // silent
      } else {
        this.speechError.set(`Recognition error: ${e.error}`);
      }
    };

    rec.onend = () => {
      // Auto-restart if still supposed to be recording (browsers auto-stop on silence)
      if (this.recordingRef) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    this.recognition = rec;
  }

  stopRecognition() {
    this.recordingRef = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
    }
  }

  startRecording() {
    if (!this.recognition) return;
    this.speechError.set('');
    try {
      this.recognition.start();
      this.recording.set(true);
      this.recordingRef = true;
      this.paused.set(false);
    } catch {
      this.recording.set(true);
      this.recordingRef = true;
    }
  }

  pauseRecording() {
    this.recordingRef = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
    }
    this.recording.set(false);
    this.paused.set(true);
    this.interim.set('');
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(async () => {
      const m = this.active();
      if (!m) return;
      const t = this.transcript();
      if (t !== m.transcript) {
        try {
          await this.api.updateMeeting(m.id, { transcript: t });
          this.active.set({ ...m, transcript: t });
        } catch (err) {
          console.warn('Transcript auto-save failed:', err);
        }
      }
    }, 1500);
  }

  // ─── List view ──────────────────────────────────────────────────────────────
  goList() {
    this.stopRecognition();
    this.recording.set(false);
    this.paused.set(false);
    this.transcript.set('');
    this.interim.set('');
    this.active.set(null);
    this.view.set('list');
    this.api.refreshMeetings();
  }

  async open(m: Meeting) {
    const full = await this.api.getMeeting(m.id);
    this.active.set(full);
    if (full.status === 'live') {
      this.transcript.set(full.transcript ?? '');
      this.transcriptRef = full.transcript ?? '';
      this.view.set('live');
    } else {
      this.view.set('detail');
    }
  }

  async confirmDelete(m: Meeting, ev: any) {
    if (ev) ev.stopPropagation();
    if (!confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    await this.api.deleteMeeting(m.id);
    if (this.active()?.id === m.id) this.goList();
  }

  // ─── New Meeting modal ─────────────────────────────────────────────────────
  openNew() {
    this.newForm = { title: '', attendees: [], attendeeIds: [], agenda: [] };
    this.newAttendeeInput = '';
    this.newAgendaInput = '';
    this.modalError.set('');
    this.showNewModal.set(true);
  }

  addAttendee() {
    const name = this.newAttendeeInput.trim();
    if (!name || this.newForm.attendees.includes(name)) return;
    const member = this.api.team().find(t => t.name === name);
    this.newForm.attendees = [...this.newForm.attendees, name];
    if (member && !this.newForm.attendeeIds.includes(member.id)) {
      this.newForm.attendeeIds = [...this.newForm.attendeeIds, member.id];
    }
    this.newAttendeeInput = '';
  }

  removeAttendee(name: string) {
    this.newForm.attendees = this.newForm.attendees.filter(a => a !== name);
    const member = this.api.team().find(t => t.name === name);
    if (member) this.newForm.attendeeIds = this.newForm.attendeeIds.filter(id => id !== member.id);
  }

  addAgenda() {
    const item = this.newAgendaInput.trim();
    if (!item) return;
    this.newForm.agenda = [...this.newForm.agenda, item];
    this.newAgendaInput = '';
  }

  removeAgenda(i: number) {
    this.newForm.agenda = this.newForm.agenda.filter((_, idx) => idx !== i);
  }

  async submitNew() {
    if (!this.newForm.title.trim()) { this.modalError.set('Title is required.'); return; }
    this.creating.set(true);
    this.modalError.set('');
    try {
      const created = await this.api.addMeeting({
        title: this.newForm.title.trim(),
        attendees: this.newForm.attendees,
        attendeeIds: this.newForm.attendeeIds,
        agenda: this.newForm.agenda,
        status: 'live',
      });
      this.showNewModal.set(false);
      this.active.set(created as Meeting);
      this.transcript.set('');
      this.transcriptRef = '';
      this.view.set('live');
      // Auto-start recording if supported
      setTimeout(() => { if (this.speechSupported()) this.startRecording(); }, 200);
    } catch (err: any) {
      this.modalError.set(err?.error?.error || err?.message || 'Failed to start meeting.');
    } finally {
      this.creating.set(false);
    }
  }

  // ─── Import modal ──────────────────────────────────────────────────────────
  openImport() {
    this.importForm = {
      title: '', date: new Date().toISOString().slice(0, 10),
      attendees: [], attendeeIds: [], agenda: [], content: '', useAi: true,
    };
    this.importAttendeeInput = '';
    this.importAgendaInput = '';
    this.importSourceFileName.set(null);
    this.modalError.set('');
    this.showImportModal.set(true);
  }

  addImportAttendee() {
    const name = this.importAttendeeInput.trim();
    if (!name || this.importForm.attendees.includes(name)) return;
    const member = this.api.team().find(t => t.name === name);
    this.importForm.attendees = [...this.importForm.attendees, name];
    if (member && !this.importForm.attendeeIds.includes(member.id)) {
      this.importForm.attendeeIds = [...this.importForm.attendeeIds, member.id];
    }
    this.importAttendeeInput = '';
  }

  removeImportAttendee(name: string) {
    this.importForm.attendees = this.importForm.attendees.filter(a => a !== name);
    const member = this.api.team().find(t => t.name === name);
    if (member) this.importForm.attendeeIds = this.importForm.attendeeIds.filter(id => id !== member.id);
  }

  addImportAgenda() {
    const item = this.importAgendaInput.trim();
    if (!item) return;
    this.importForm.agenda = [...this.importForm.agenda, item];
    this.importAgendaInput = '';
  }

  removeImportAgenda(i: number) {
    this.importForm.agenda = this.importForm.agenda.filter((_, idx) => idx !== i);
  }

  async onImportFileSelected(ev: any) {
    const file: File | undefined = ev.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['txt', 'md', 'markdown', 'csv'].includes(ext || '')) {
      this.modalError.set(`Unsupported file type ".${ext}". Use .txt, .md, or .csv — or paste content directly.`);
      ev.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      this.importForm.content = this.importForm.content
        ? `${this.importForm.content}\n\n${text}`
        : text;
      this.importSourceFileName.set(file.name);
      if (!this.importForm.title) {
        this.importForm.title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      }
      this.modalError.set('');
    } catch (err: any) {
      this.modalError.set(`Failed to read file: ${err.message}`);
    }
    ev.target.value = '';
  }

  async submitImport() {
    if (!this.importForm.title.trim()) { this.modalError.set('Title is required.'); return; }
    if (!this.importForm.content.trim()) { this.modalError.set('Content is required.'); return; }
    if (!this.importForm.date) { this.modalError.set('Date is required.'); return; }
    this.importing.set(true);
    this.modalError.set('');
    try {
      const created = await this.api.importMeeting({
        title: this.importForm.title.trim(),
        date: new Date(this.importForm.date + 'T12:00:00').toISOString(),
        attendees: this.importForm.attendees,
        attendeeIds: this.importForm.attendeeIds,
        agenda: this.importForm.agenda,
        content: this.importForm.content,
        useAi: this.importForm.useAi,
      });
      this.showImportModal.set(false);
      this.active.set(created as Meeting);
      this.view.set('detail');
    } catch (err: any) {
      this.modalError.set(err?.error?.error || err?.message || 'Failed to import meeting.');
    } finally {
      this.importing.set(false);
    }
  }

  // ─── Live actions ──────────────────────────────────────────────────────────
  async updateField(field: keyof Meeting, value: any) {
    const m = this.active();
    if (!m) return;
    this.active.set({ ...m, [field]: value });
    try {
      await this.api.updateMeeting(m.id, { [field]: value } as any);
    } catch (err) {
      console.warn('Update failed:', err);
    }
  }

  async endMeeting() {
    const m = this.active();
    if (!m) return;
    this.endingMeeting.set(true);
    this.stopRecognition();
    this.recording.set(false);
    try {
      const result = await this.api.endMeeting(m.id, {
        transcript: this.transcript(),
        discussion: m.discussion ?? '',
      });
      this.active.set(result);
      this.confirmEnd.set(false);
      this.view.set('detail');
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Failed to end meeting.');
    } finally {
      this.endingMeeting.set(false);
    }
  }

  // ─── Detail actions ────────────────────────────────────────────────────────
  async toggleAction(m: Meeting, item: { id: number; done: boolean }) {
    const updated = await this.api.toggleMeetingActionItem(m.id, item.id, !item.done);
    const list = m.actionItems.map(a => a.id === item.id ? { ...a, ...updated } : a);
    const newM = { ...m, actionItems: list };
    this.active.set(newM);
  }

  async deleteActionItem(m: Meeting, item: { id: number }) {
    if (!confirm('Delete this action item?')) return;
    await this.api.deleteMeetingActionItem(m.id, item.id);
    this.active.set({ ...m, actionItems: m.actionItems.filter(a => a.id !== item.id) });
  }

  async regenerateSummary(m: Meeting) {
    if (!confirm('Re-run the AI summary? This replaces the current summary, action items, and follow-ups.')) return;
    this.regenerating.set(true);
    try {
      const updated = await this.api.regenerateMeetingSummary(m.id);
      const fresh = await this.api.getMeeting(m.id);
      this.active.set(fresh);
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Regenerate failed.');
    } finally {
      this.regenerating.set(false);
    }
  }

  // ─── Files ─────────────────────────────────────────────────────────────────
  async onFileSelected(ev: any, m: Meeting) {
    const file: File | undefined = ev.target.files?.[0];
    if (!file) return;
    this.uploadError.set('');
    this.uploadingFile.set(true);
    try {
      const created = await this.api.uploadMeetingFile(m.id, file);
      const fresh = await this.api.getMeeting(m.id);
      this.active.set(fresh);
    } catch (err: any) {
      const msg = err?.error?.error || err?.message || 'Upload failed.';
      this.uploadError.set(msg + ' Try the Link option for files hosted elsewhere.');
    } finally {
      this.uploadingFile.set(false);
      ev.target.value = '';
    }
  }

  async submitLink() {
    const m = this.active();
    if (!m) return;
    if (!this.linkName.trim() || !this.linkUrl.trim()) {
      alert('Both name and URL are required.');
      return;
    }
    try {
      await this.api.addLinkedMeetingFile(m.id, this.linkName.trim(), this.linkUrl.trim());
      const fresh = await this.api.getMeeting(m.id);
      this.active.set(fresh);
      this.showLinkModal.set(false);
      this.linkName = '';
      this.linkUrl = '';
    } catch (err: any) {
      alert(err?.error?.error || err?.message || 'Add link failed.');
    }
  }

  async removeFile(m: Meeting, file: { id: number; name: string }) {
    if (!confirm(`Remove "${file.name}"?`)) return;
    await this.api.deleteMeetingFile(m.id, file.id);
    const fresh = await this.api.getMeeting(m.id);
    this.active.set(fresh);
  }

  openFile(file: { kind: string; url?: string | null; downloadUrl?: string | null; name: string }) {
    const url = file.kind === 'linked' ? file.url : file.downloadUrl;
    if (!url) {
      alert('File URL not available.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  // ─── Export ────────────────────────────────────────────────────────────────
  exportText(m: Meeting) {
    const sep = '='.repeat(60);
    const dash = '-'.repeat(60);
    const lines = [
      `MEETING MINUTES — ${m.title}`,
      sep, '',
      `Date: ${this.formatDate(m.date)} ${this.formatTime(m.date)}`,
      `Attendees: ${m.attendees.join(', ') || 'None'}`,
      '',
      'AGENDA', dash,
      ...(m.agenda.length ? m.agenda.map((a, i) => `${i + 1}. ${a}`) : ['(No agenda)']),
      '',
      'EXECUTIVE SUMMARY', dash,
      m.summary || '(No summary)', '',
      'DISCUSSION', dash,
      m.discussion || '(No discussion notes)', '',
      'ACTION ITEMS', dash,
      ...(m.actionItems.length
        ? m.actionItems.map((a, i) => `${i + 1}. [${a.done ? 'X' : ' '}] ${a.task} (Owner: ${a.owner || 'Unassigned'}${a.dueDate ? `, Due: ${a.dueDate}` : ''})`)
        : ['(No action items)']),
      '',
      'FOLLOW-UP TASKS', dash,
      ...(m.followUps.length
        ? m.followUps.map((f, i) => `${i + 1}. ${f.task}${f.context ? ` — ${f.context}` : ''}`)
        : ['(No follow-ups)']),
      '',
      'FULL TRANSCRIPT', dash,
      m.transcript || '(No transcript)',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = m.title.replace(/[^a-z0-9]+/gi, '_') + '_minutes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  openActionCount(m: Meeting): number {
    return m.actionItems.filter(a => !a.done).length;
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') || '?';
  }
  fileExt(name: string): string {
    return (name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase();
  }
  fileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  wordCount(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }
  onOverlay(ev: any) {
    if (ev.target === ev.currentTarget) {
      this.showNewModal.set(false);
      this.showImportModal.set(false);
      this.showLinkModal.set(false);
    }
  }
}
