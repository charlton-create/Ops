import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TeamMember, Lead, Message } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';

@Component({
  selector: 'app-team-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent, FilterBarComponent],
  template: `
    <!-- Page Navigation Tabs -->
    <div class="page-tabs">
      <button class="page-tab" [class.active]="viewMode() === 'team'" (click)="navigateToPage('team')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/>
        </svg>
        Team Hub
      </button>
      <button class="page-tab" [class.active]="viewMode() === 'messages'" (click)="navigateToPage('messages')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Messages
      </button>
    </div>

    <app-header
      [title]="viewMode() === 'messages' ? 'Messages' : 'Team Hub'"
      [subtitle]="viewMode() === 'messages' ? 'Team Conversations' : 'Team Directory & Messaging'"
      [icon]="viewMode() === 'messages' ? 'messages' : 'team'"
      gradient="linear-gradient(135deg, #39219F 0%, #1E1B4B 100%)"
    ></app-header>

    <div class="team-content" [class.messages-view]="viewMode() === 'messages'">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Team Size</span>
            <span class="stat-value">{{ team.length }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Online</span>
            <span class="stat-value">{{ onlineCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Time Zones</span>
            <span class="stat-value">{{ timezones.size }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Countries</span>
            <span class="stat-value">3</span>
          </div>
        </div>
      </div>

      <!-- Team Filter Bar -->
      <app-filter-bar
        [filters]="teamFilterConfig"
        [values]="teamFilterValues"
        (valuesChange)="onTeamFilterChange($event)"
      ></app-filter-bar>

      <!-- Main Content -->
      <div class="team-main">
        <!-- Team Directory -->
        <div class="team-directory">
          <h3>Team Directory</h3>
          <div class="team-list">
            @for (member of filteredTeam(); track member.id) {
              <div class="team-card" [class.selected]="selectedMember()?.id === member.id" (click)="selectMember(member)">
                <div class="member-avatar-lg" [style.background]="member.color">
                  {{ member.name.charAt(0) }}
                  <span class="status-dot" [class]="member.status"></span>
                </div>
                <div class="member-details">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-role">{{ member.role }}</span>
                  <div class="member-meta">
                    <span class="local-time">{{ getLocalTime(member.utcOffset) }}</span>
                    <span class="location">{{ member.city }}</span>
                  </div>
                </div>
                <div class="member-email">{{ member.email }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Messaging Panel -->
        <div class="messaging-panel">
          @if (selectedMember()) {
            <!-- Chat Header -->
            <div class="chat-header">
              <div class="chat-user">
                <div class="chat-avatar" [style.background]="selectedMember()!.color">
                  {{ selectedMember()!.name.charAt(0) }}
                </div>
                <div>
                  <span class="chat-name">{{ selectedMember()!.name }}</span>
                  <span class="chat-status" [class]="selectedMember()!.status">{{ selectedMember()!.status }}</span>
                </div>
              </div>
              <div class="chat-filter">
                <select class="filter-select" [(ngModel)]="contextFilter" (change)="filterConversation()">
                  <option value="all">All Messages</option>
                  <option value="lead">Lead/Customer</option>
                  <option value="project">Project</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <!-- Messages Area (scrollable) -->
            <div class="chat-messages" #messagesContainer>
              @if (filteredConversation().length > 0) {
                @for (msg of filteredConversation(); track msg.id) {
                  <div class="message" [class.sent]="msg.from === currentUser" [class.received]="msg.from !== currentUser">
                    @if (msg.context && msg.context.name) {
                      <div class="message-context">
                        <span class="context-badge" [class]="'badge-' + getContextBadge(msg.context.type)">
                          {{ msg.context.name }}
                        </span>
                      </div>
                    }
                    <div class="message-bubble">
                      <span [innerHTML]="linkifyText(msg.text)"></span>
                      @if (msg.fileName) {
                        <div class="msg-file">
                          @if (msg.fileType?.startsWith('image/') && msg.fileDataUrl) {
                            <img [src]="msg.fileDataUrl" class="msg-image-preview" alt="Attached image">
                          } @else {
                            <div class="msg-file-card">
                              <app-icon name="file-text" [size]="16"></app-icon>
                              <div class="msg-file-info">
                                <span class="msg-file-name">{{ msg.fileName }}</span>
                                <span class="msg-file-size">{{ formatFileSize(msg.fileSize || 0) }}</span>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                    <span class="message-time">{{ msg.time }}</span>
                    <button class="msg-action-btn" (click)="createTaskFromMessage(msg)" title="Create task from message">
                      <app-icon name="clipboard" [size]="12"></app-icon>
                    </button>
                  </div>
                }
              } @else {
                <div class="no-messages">
                  <p>No messages yet</p>
                  <span>Start a conversation with {{ selectedMember()!.name }}</span>
                </div>
              }
            </div>

            <!-- Pending File Chip -->
            @if (pendingFile()) {
              <div class="pending-file">
                <app-icon name="paperclip" [size]="14"></app-icon>
                <span>{{ pendingFile()!.name }}</span>
                <span class="file-size">{{ formatFileSize(pendingFile()!.size) }}</span>
                <button class="remove-file-btn" (click)="removePendingFile()">
                  <app-icon name="x" [size]="12"></app-icon>
                </button>
              </div>
            }

            <!-- Message Input Bar (ALWAYS visible at bottom) -->
            <div class="chat-input-bar">
              <button class="attach-btn" (click)="fileInput.click()" title="Attach file">
                <app-icon name="paperclip" [size]="16"></app-icon>
              </button>
              <input #fileInput type="file" hidden (change)="onFileSelected($event)">
              <input
                type="text"
                class="chat-input-field"
                [placeholder]="'Message ' + selectedMember()!.name + '...'"
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
              />
              <button
                class="chat-send-btn"
                [class.disabled]="!newMessage.trim() && !pendingFile()"
                [disabled]="!newMessage.trim() && !pendingFile()"
                (click)="sendMessage()"
              >
                Send
              </button>
            </div>
          } @else {
            <div class="no-selection">
              <div class="no-selection-icon"><app-icon name="messages" [size]="48"></app-icon></div>
              <p>Select a team member to start messaging</p>
            </div>
          }
        </div>
      </div>
    </div>

    @if (taskCreatedMsg()) {
      <div class="toast">
        <app-icon name="check" [size]="14"></app-icon>
        {{ taskCreatedMsg() }}
      </div>
    }
  `,
  styles: [`
    /* Page Navigation Tabs */
    .page-tabs {
      display: flex;
      gap: 4px;
      padding: 0.75rem 1.5rem;
      background: var(--color-white);
      border-bottom: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }

    .page-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--color-gray-600);
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .page-tab:hover {
      background: var(--color-gray-50);
      color: var(--color-gray-900);
    }

    .page-tab.active {
      background: #EDE9FE;
      color: #39219F;
    }

    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    :host ::ng-deep app-header {
      flex-shrink: 0;
    }

    .team-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      flex-shrink: 0;
    }

    .stat-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      border: 1px solid var(--border-hairline);
    }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      font-weight: 500;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-gray-900);
    }

    .team-main {
      flex: 1;
      display: grid;
      grid-template-columns: 400px 1fr;
      grid-template-rows: 1fr;
      align-items: stretch;
      gap: 1rem;
      min-height: 0;
      overflow: hidden;
    }

    /* Messages-focused view: narrower team list, wider messages */
    .messages-view .team-main {
      grid-template-columns: 280px 1fr;
    }

    .messages-view .team-directory h3 {
      font-size: 0.8125rem;
      padding: 0.75rem 1rem;
    }

    .messages-view .team-card {
      padding: 0.5rem 0.75rem;
    }

    .messages-view .member-avatar-lg {
      width: 36px;
      height: 36px;
      font-size: 0.875rem;
    }

    .messages-view .member-email {
      display: none;
    }

    .messages-view .member-meta {
      display: none;
    }

    .team-directory {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .team-directory h3 {
      margin: 0;
      padding: 1rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }

    .team-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .team-card {
      padding: 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .team-card:hover {
      background: var(--color-gray-50);
    }

    .team-card.selected {
      background: var(--color-primary-light);
      border: 1px solid var(--color-primary);
    }

    .member-avatar-lg {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1.125rem;
      position: relative;
      flex-shrink: 0;
    }

    .status-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-dot.online { background: var(--color-success); }
    .status-dot.away { background: var(--color-warning); }
    .status-dot.offline { background: var(--color-gray-400); }

    .member-details {
      flex: 1;
      min-width: 0;
    }

    .member-name {
      display: block;
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-gray-900);
    }

    .member-role {
      display: block;
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-bottom: 4px;
    }

    .member-meta {
      display: flex;
      gap: 12px;
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    .member-email {
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    /* Messaging Panel */
    .messaging-panel {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .chat-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .chat-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    .chat-name {
      display: block;
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .chat-status {
      font-size: 0.75rem;
      text-transform: capitalize;
    }

    .chat-status.online { color: var(--color-success); }
    .chat-status.away { color: var(--color-warning); }
    .chat-status.offline { color: var(--color-gray-400); }

    .chat-filter {
      display: flex;
      gap: 8px;
    }

    .filter-select {
      padding: 6px 10px;
      font-size: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: white;
    }

    /* Messages Area */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 70%;
    }

    .message.sent {
      align-self: flex-end;
    }

    .message.received {
      align-self: flex-start;
    }

    .message-bubble {
      padding: 10px 14px;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .message.received .message-bubble {
      background: var(--color-gray-100);
      color: var(--color-gray-900);
      border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 0;
    }

    .message.sent .message-bubble {
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-lg) var(--radius-lg) 0 var(--radius-lg);
    }

    .message-time {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
      margin-top: 4px;
      padding: 0 4px;
    }

    .message.sent .message-time {
      text-align: right;
    }

    .message-context {
      margin-bottom: 4px;
    }

    .context-badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 500;
      border-radius: var(--radius-sm);
    }

    .badge-blue {
      background: var(--color-info-light);
      color: var(--color-primary-hover);
    }

    .badge-orange {
      background: #FFEDD5;
      color: #C2410C;
    }

    .badge-gray {
      background: var(--color-gray-100);
      color: var(--color-gray-600);
    }

    .no-messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-400);
      text-align: center;
    }

    .no-messages p {
      margin: 0;
      font-weight: 500;
    }

    .no-messages span {
      font-size: 0.8125rem;
    }

    /* Message Input Bar - Fixed at bottom */
    .chat-input-bar {
      padding: 12px 16px;
      border-top: 1px solid var(--color-border);
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      background: #fff;
    }

    .chat-input-field {
      flex: 1;
      padding: 10px 14px;
      font-size: 13px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .chat-input-field:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);
    }

    .chat-send-btn {
      height: 40px;
      padding: 0 20px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: #fff;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease;
    }

    .chat-send-btn:hover:not(.disabled) {
      background: var(--color-primary-hover);
    }

    .chat-send-btn.disabled {
      background: var(--color-gray-400);
      cursor: not-allowed;
    }

    .no-selection {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-400);
    }

    .no-selection-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .no-selection p {
      margin: 0;
      font-size: 0.9375rem;
    }

    .attach-btn {
      padding: 6px 8px;
      border: none;
      background: none;
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius);
      transition: all 0.15s ease;
    }

    .attach-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .pending-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      margin: 0 16px 4px;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }

    .file-size {
      color: var(--color-gray-400);
      font-size: 0.75rem;
    }

    .remove-file-btn {
      margin-left: auto;
      padding: 2px;
      border: none;
      background: none;
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius-sm);
    }

    .remove-file-btn:hover {
      background: var(--color-error-light);
      color: var(--color-error-hover);
    }

    .msg-file {
      margin-top: 6px;
    }

    .msg-image-preview {
      max-width: 200px;
      max-height: 150px;
      border-radius: var(--radius-md);
      display: block;
    }

    .msg-file-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.05);
      border-radius: var(--radius-md);
    }

    .msg-file-info {
      display: flex;
      flex-direction: column;
    }

    .msg-file-name {
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .msg-file-size {
      font-size: 0.6875rem;
      color: inherit;
      opacity: 0.7;
    }

    .chat-link {
      color: inherit;
      text-decoration: underline;
    }

    .message {
      position: relative;
    }

    .msg-action-btn {
      position: absolute;
      top: 0;
      right: -28px;
      padding: 4px;
      border: none;
      background: var(--color-gray-100);
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius-sm);
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .message:hover .msg-action-btn {
      opacity: 1;
    }

    .msg-action-btn:hover {
      background: var(--color-gray-200);
      color: var(--color-gray-700);
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--status-green-text);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      z-index: 1100;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 900px) {
      .team-main {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TeamHubComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private router = inject(Router);
  private authService = inject(AuthService);
  dataService = inject(ApiService);

  get team() { return this.dataService.team(); }
  currentUser = this.authService.user()?.name ?? 'User';

  teamFilterConfig: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'tabs',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'online', label: 'Online' },
        { value: 'away', label: 'Away' },
        { value: 'offline', label: 'Offline' },
      ]
    }
  ];

  teamFilterValues: FilterValues = { status: 'all' };
  statusFilter = signal<string>('all');

  onTeamFilterChange(values: FilterValues) {
    this.teamFilterValues = values;
    this.statusFilter.set(values['status'] || 'all');
  }

  filteredTeam = computed(() => {
    const status = this.statusFilter();
    if (status === 'all') return this.team;
    return this.team.filter(m => m.status === status);
  });
  selectedMember = signal<TeamMember | null>(null);
  pendingFile = signal<{ name: string; type: string; size: number; dataUrl: string } | null>(null);
  taskCreatedMsg = signal<string | null>(null);
  newMessage = '';
  contextFilter = 'all';
  viewMode = signal<'team' | 'messages'>('team');
  private shouldScrollToBottom = false;

  messageContext: { type: 'general' | 'lead' | 'project'; id?: number } = {
    type: 'general',
    id: undefined
  };

  timezones = new Set(this.dataService.team().map(m => m.tz));

  onlineCount = computed(() => this.team.filter(m => m.status === 'online').length);

  ngOnInit() {
    // Detect view mode from URL
    if (this.router.url.includes('/team/messages')) {
      this.viewMode.set('messages');
      // Auto-select first team member if none selected
      if (!this.selectedMember() && this.team.length > 0) {
        this.selectedMember.set(this.team[0]);
        this.shouldScrollToBottom = true;
      }
    } else {
      this.viewMode.set('team');
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  navigateToPage(mode: 'team' | 'messages') {
    const routes = {
      'team': '/team',
      'messages': '/team/messages'
    };
    this.router.navigate([routes[mode]]);
  }

  conversation = computed(() => {
    const member = this.selectedMember();
    if (!member) return [];
    return this.dataService.getMessagesBetween(this.currentUser, member.name);
  });

  filteredConversation = computed(() => {
    const messages = this.conversation();
    if (this.contextFilter === 'all') return messages;
    return messages.filter(m => {
      if (this.contextFilter === 'general') return !m.context || m.context.type === 'general';
      return m.context?.type === this.contextFilter;
    });
  });

  selectMember(member: TeamMember) {
    this.selectedMember.set(member);
    this.shouldScrollToBottom = true;
  }

  getLocalTime(utcOffset: number): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (utcOffset * 3600000));
    return localTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  onContextTypeChange() {
    this.messageContext.id = undefined;
  }

  filterConversation() {
    // Trigger re-computation
  }

  getContextBadge(type: string): string {
    const badges: Record<string, string> = {
      lead: 'blue',
      project: 'orange',
      general: 'gray'
    };
    return badges[type] || 'gray';
  }

  getContextName(): string | undefined {
    if (this.messageContext.type === 'general') return undefined;
    if (this.messageContext.type === 'lead' && this.messageContext.id) {
      const lead = this.dataService.leads().find(l => l.id === this.messageContext.id);
      return lead?.company;
    }
    if (this.messageContext.type === 'project' && this.messageContext.id) {
      const project = this.dataService.projects().find(p => p.id === this.messageContext.id);
      return project?.name;
    }
    return undefined;
  }

  sendMessage() {
    const member = this.selectedMember();
    const file = this.pendingFile();
    if (!member || (!this.newMessage.trim() && !file)) return;

    const contextName = this.getContextName();
    const context = this.messageContext.type !== 'general' && this.messageContext.id
      ? { type: this.messageContext.type, id: this.messageContext.id, name: contextName }
      : undefined;

    const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const messageData: any = {
      from: this.currentUser,
      to: member.name,
      text: this.newMessage.trim(),
      time: now,
      read: false,
      context
    };

    if (file) {
      messageData.fileName = file.name;
      messageData.fileType = file.type;
      messageData.fileSize = file.size;
      messageData.fileDataUrl = file.dataUrl;
    }

    this.dataService.addMessage(messageData);
    this.newMessage = '';
    this.pendingFile.set(null);
    this.shouldScrollToBottom = true;
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || file.size > 25 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.pendingFile.set({
        name: file.name, type: file.type,
        size: file.size, dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  }

  removePendingFile(): void {
    this.pendingFile.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  linkifyText(text: string): string {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener" class="chat-link">$1</a>');
  }

  async createTaskFromMessage(msg: Message): Promise<void> {
    const projects = this.dataService.activeProjects();
    if (projects.length === 0) return;
    const project = projects[0];
    const ownerName = project.ownerName || project.ownerLabel || this.currentUser;
    await this.dataService.addHubTask(project.id, {
      title: msg.text.slice(0, 120),
      description: msg.text,
      phase: project.currentPhase,
      status: 'todo',
      responsible: this.currentUser,
      accountable: ownerName,
    });
    this.taskCreatedMsg.set(`Task added to "${project.name}"`);
    setTimeout(() => this.taskCreatedMsg.set(null), 3000);
  }
}
