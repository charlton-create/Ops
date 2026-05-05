import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note } from '../../../core/models';
import { TeamUtilService } from '../../utils/team.service';

/**
 * Platform-wide comment / note thread.
 *
 * Parent owns the data (notes array) and handles persistence via the Output.
 * The component enforces:
 *   - blank / whitespace rejection
 *   - double-submit prevention
 *   - newest-first rendering
 *   - humanized timestamps (Just now · "5m ago" · "Apr 20, 4:35 PM")
 *   - empty state
 *   - multi-line rendering, safe long-text wrap
 */
@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="comment-thread">
      <!-- Composer -->
      <div class="composer">
        <div class="composer-avatar" [style.background]="teamUtil.getColor(currentAuthor)">
          {{ currentAuthor ? currentAuthor.charAt(0).toUpperCase() : '?' }}
        </div>
        <div class="composer-input">
          <textarea
            [(ngModel)]="draft"
            [placeholder]="placeholder"
            rows="2"
            [disabled]="submitting()"
            (keydown.meta.enter)="submit()"
            (keydown.control.enter)="submit()"
          ></textarea>
          <div class="composer-row">
            <span class="composer-hint">⌘/Ctrl + Enter to submit</span>
            <button
              type="button"
              class="composer-btn"
              (click)="submit()"
              [disabled]="!canSubmit()"
            >
              @if (submitting()) { <span class="spinner"></span> Saving... }
              @else { {{ submitLabel }} }
            </button>
          </div>
        </div>
      </div>

      <!-- List -->
      @if (sortedComments().length === 0) {
        <div class="empty-state">
          <p>{{ emptyTitle }}</p>
          <span>{{ emptySubtitle }}</span>
        </div>
      } @else {
        <ul class="comment-list">
          @for (c of sortedComments(); track c.id) {
            <li class="comment-card">
              <div class="comment-avatar" [style.background]="teamUtil.getColor(c.author)">
                {{ c.author.charAt(0).toUpperCase() }}
              </div>
              <div class="comment-body">
                <div class="comment-meta">
                  <span class="comment-author">{{ c.author }}</span>
                  <span class="comment-dot">·</span>
                  <span class="comment-time" [title]="formatFullTime(c.createdAt)">{{ formatRelativeTime(c.createdAt) }}</span>
                </div>
                <div class="comment-text">{{ c.content }}</div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .comment-thread { display: flex; flex-direction: column; gap: 14px; }

    /* Composer */
    .composer { display: flex; gap: 10px; align-items: flex-start; }
    .composer-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 13px; font-weight: 600;
    }
    .composer-input { flex: 1; min-width: 0; }
    .composer-input textarea {
      width: 100%; padding: 10px 12px; border: 1px solid var(--color-border);
      border-radius: 8px; font-size: 13px; line-height: 1.5; color: var(--color-gray-900);
      font-family: inherit; resize: vertical; min-height: 62px; box-sizing: border-box;
      background: white;
    }
    .composer-input textarea:focus { outline: none; border-color: #8860D0; box-shadow: 0 0 0 3px rgba(136,96,208,0.12); }
    .composer-input textarea:disabled { background: var(--color-gray-50); cursor: not-allowed; }
    .composer-row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px; margin-top: 6px;
    }
    .composer-hint { font-size: 11px; color: var(--color-gray-400); }
    .composer-btn {
      padding: 6px 14px; border: none; background: #8860D0; color: white;
      border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .composer-btn:hover:not(:disabled) { background: #7550C0; }
    .composer-btn:disabled { background: var(--color-gray-300); cursor: not-allowed; }
    .spinner {
      display: inline-block; width: 10px; height: 10px; border: 2px solid currentColor;
      border-right-color: transparent; border-radius: 50%; animation: ct-spin 0.6s linear infinite;
    }
    @keyframes ct-spin { to { transform: rotate(360deg); } }

    /* List */
    .comment-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .comment-card {
      display: flex; gap: 10px; padding: 10px 12px;
      background: var(--color-gray-50); border-radius: 8px;
      border: 1px solid transparent;
    }
    .comment-card:hover { border-color: var(--color-border); }
    .comment-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 600;
    }
    .comment-body { flex: 1; min-width: 0; }
    .comment-meta { display: flex; gap: 4px; align-items: center; font-size: 12px; margin-bottom: 2px; }
    .comment-author { font-weight: 600; color: var(--color-gray-900); }
    .comment-dot { color: var(--color-gray-300); }
    .comment-time { color: var(--color-gray-500); }
    .comment-text {
      font-size: 13px; color: var(--color-gray-800); line-height: 1.55;
      white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere;
    }

    /* Empty */
    .empty-state {
      padding: 20px; text-align: center; border: 1px dashed var(--color-border);
      border-radius: 8px; background: white;
    }
    .empty-state p { margin: 0 0 4px; font-size: 13px; font-weight: 500; color: var(--color-gray-700); }
    .empty-state span { font-size: 12px; color: var(--color-gray-500); }
  `]
})
export class CommentThreadComponent {
  @Input({ required: true }) comments: Note[] = [];
  @Input() currentAuthor = '';
  @Input() placeholder = 'Add a note or comment…';
  @Input() emptyTitle = 'No comments yet';
  @Input() emptySubtitle = 'Add the first note to start the discussion.';
  @Input() submitLabel = 'Post';

  @Output() submitNote = new EventEmitter<string>();

  draft = '';
  submitting = signal(false);
  teamUtil = new TeamUtilService();

  sortedComments(): Note[] {
    return [...(this.comments || [])].sort((a, b) => {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  canSubmit(): boolean {
    return this.draft.trim().length > 0 && !this.submitting();
  }

  submit() {
    const text = this.draft.trim();
    if (!text || this.submitting()) return;
    this.submitting.set(true);
    this.submitNote.emit(text);
    // Release the lock on next microtask — parent updates the signal synchronously,
    // so by the time the composer re-renders the new note is already in the list.
    queueMicrotask(() => {
      this.draft = '';
      this.submitting.set(false);
    });
  }

  formatRelativeTime(iso: string): string {
    if (!iso) return '—';
    const then = new Date(iso);
    if (isNaN(then.getTime())) return iso;
    const diff = Date.now() - then.getTime();
    if (diff < 45_000) return 'Just now';
    if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
    if (diff < 7 * 24 * 60 * 60_000) return `${Math.floor(diff / (24 * 60 * 60_000))}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatFullTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  }
}
