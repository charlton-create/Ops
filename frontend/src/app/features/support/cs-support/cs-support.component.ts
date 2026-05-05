import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../layout/header.component';
import { ApiService } from '../../../core/services/api.service';
import { IconComponent } from '../../../shared/icons';

interface Msg { role: 'user' | 'assistant'; content: string; }

@Component({
  selector: 'app-cs-support',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, IconComponent],
  template: `
    <app-header title="CS Support" subtitle="AI assistant — quick answers for live support agents"
      icon="headset" gradient="linear-gradient(135deg, #6D28D9 0%, #1E1B4B 100%)" />

    <div class="content">
      <div class="layout">
        <!-- Chat -->
        <div class="chat-card">
          <div class="chat-scroll" #scrollArea>
            @for (m of messages(); track $index) {
              <div class="msg" [class.user]="m.role === 'user'">
                <div class="bubble" [class.user]="m.role === 'user'">
                  @if (m.role === 'assistant') {
                    <div class="agent-tag">✨ CAT-I AI · L1 SUPPORT</div>
                  }
                  <div class="text">{{ m.content }}</div>
                </div>
              </div>
            }
            @if (loading()) {
              <div class="msg">
                <div class="bubble">
                  <div class="dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            }
            @if (notConfigured()) {
              <div class="warning">⚠️ AI is not configured. Set <code>ANTHROPIC_API_KEY</code> on the backend.</div>
            }
          </div>

          <div class="chat-input">
            <input [(ngModel)]="input"
                   (keydown.enter)="send()"
                   placeholder="Ask a training or how-to question…"
                   [disabled]="loading()" />
            <button class="btn-primary" [disabled]="loading() || !input.trim()" (click)="send()">Send</button>
          </div>
        </div>

        <!-- Quick prompts -->
        <div class="quick-panel">
          <div class="quick-label">QUICK QUESTIONS</div>
          @for (q of QUICK; track q) {
            <button class="quick-btn" (click)="sendPrompt(q)" [disabled]="loading()">{{ q }}</button>
          }
          <div class="quick-note">
            These prompts ask the AI for help. Use the <strong>AI Assist panel</strong> on a specific ticket
            (Ticketing tab) when you want a draft reply tailored to that ticket.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .content { padding: 1.5rem; height: calc(100vh - 80px); display: flex; flex-direction: column; }

    .layout { display: grid; grid-template-columns: 1fr 240px; gap: 14px; flex: 1; min-height: 0; }
    @media (max-width: 1024px) { .layout { grid-template-columns: 1fr; } .quick-panel { max-height: 200px; } }

    .chat-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
    .chat-scroll { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; }

    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .bubble { max-width: 78%; padding: 10px 14px; border-radius: 14px 14px 14px 4px; background: var(--bg-soft, #F9FAFB); border: 1px solid var(--border-hairline, #E5E7EB); font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    .bubble.user { background: #1A56DB; color: white; border: none; border-radius: 14px 14px 4px 14px; }
    .agent-tag { font-size: 10px; font-weight: 700; color: #6D28D9; margin-bottom: 4px; letter-spacing: 0.05em; }

    .dots { display: flex; gap: 4px; padding: 4px 0; }
    .dots span { width: 6px; height: 6px; border-radius: 50%; background: #6D28D9; animation: bounce 1.2s infinite; }
    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }

    .warning { font-size: 12px; color: #92400E; background: #FEF3C7; padding: 8px 12px; border-radius: 6px; margin-top: 8px; }
    .warning code { background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; font-size: 11px; }

    .chat-input { padding: 14px; border-top: 1px solid var(--border-hairline, #E5E7EB); display: flex; gap: 8px; }
    .chat-input input { flex: 1; padding: 9px 14px; border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 13px; outline: none; font-family: inherit; }
    .btn-primary { padding: 9px 18px; background: #1A56DB; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .quick-panel { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
    .quick-label { font-weight: 700; font-size: 11px; color: var(--text-muted, #6B7280); letter-spacing: 0.05em; margin-bottom: 4px; }
    .quick-btn { padding: 9px 12px; background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-radius: 8px; font-size: 11px; text-align: left; cursor: pointer; line-height: 1.4; font-family: inherit; color: var(--text, #111827); }
    .quick-btn:hover:not(:disabled) { background: var(--bg-soft, #F9FAFB); }
    .quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .quick-note { margin-top: 12px; font-size: 11px; color: var(--text-muted, #6B7280); line-height: 1.5; padding: 10px; background: var(--bg-soft, #F9FAFB); border-radius: 8px; }
  `]
})
export class CsSupportComponent implements AfterViewChecked {
  private api = inject(ApiService);
  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;

  readonly QUICK = [
    'How do I run a HACCP audit report?',
    'How do I add a new user?',
    'Explain the corrective action workflow in CAT-QT',
    'How do I create a label template in CAT-ALOG?',
    'How does the sanitation scheduler work in CAT-SCAN?',
    'What goes into a batch production record in CAT-MES?',
  ];

  messages = signal<Msg[]>([
    { role: 'assistant', content: "Hi! I'm the CAT-I.AI L1 Support Assistant. I help live CS agents draft answers to training, how-to, and navigation questions. What can I help you with?" },
  ]);
  input = '';
  loading = signal(false);
  notConfigured = signal(false);
  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  async send(text?: string) {
    const userText = (text ?? this.input).trim();
    if (!userText || this.loading()) return;
    this.input = '';
    this.messages.update(m => [...m, { role: 'user', content: userText }]);
    this.shouldScroll = true;
    this.loading.set(true);
    try {
      const result = await this.api.aiChat(this.messages());
      if (!result.configured) {
        this.notConfigured.set(true);
        this.messages.update(m => [...m, { role: 'assistant', content: result.reply }]);
      } else {
        this.notConfigured.set(false);
        this.messages.update(m => [...m, { role: 'assistant', content: result.reply }]);
      }
    } catch (err: any) {
      this.messages.update(m => [...m, { role: 'assistant', content: `Error: ${err?.message || 'connection failed'}` }]);
    } finally {
      this.loading.set(false);
      this.shouldScroll = true;
    }
  }

  sendPrompt(q: string) { this.send(q); }
}
