import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { ApiService } from '../../core/services/api.service';
import { IconComponent } from '../../shared/icons';
import { CurrencyShortPipe } from '../../shared/utils/format.pipe';
import { TeamUtilService } from '../../shared/utils/team.service';
import { Ticket, TicketStatus, TICKET_LEVEL_META, TICKET_STATUS_META } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, IconComponent, CurrencyShortPipe],
  template: `
    <app-header
      title="Dashboard"
      subtitle="CAT-I.AI Internal Operations"
      icon="bar-chart"
      gradient="linear-gradient(135deg, #A02195 0%, #56006E 100%)"
    ></app-header>

    <div class="dashboard-content">
      <!-- Role Tabs -->
      <div class="toolbar-tabs">
        <button class="tab-btn" [class.active]="dashRole() === 'overview'" (click)="dashRole.set('overview')">Overview</button>
        <button class="tab-btn" [class.active]="dashRole() === 'sales'" (click)="dashRole.set('sales')">Sales</button>
        <button class="tab-btn" [class.active]="dashRole() === 'operations'" (click)="dashRole.set('operations')">Operations</button>
        <button class="tab-btn" [class.active]="dashRole() === 'support'" (click)="dashRole.set('support')">Support</button>
        <button class="tab-btn" [class.active]="dashRole() === 'marketing'" (click)="dashRole.set('marketing')">Marketing</button>
      </div>

      <!-- KPI Row -->
      <div class="stats-grid stats-grid--5">
        @for (kpi of currentKpis(); track kpi.label) {
          <div class="stat-card">
            <div class="stat-body">
              <span class="stat-label">{{ kpi.label }}</span>
              <span class="stat-value">{{ kpi.formatted }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Support Dashboard (replaces standard grid when role === 'support') -->
      @if (dashRole() === 'support') {
        <div class="support-dash">
          @if (criticalTickets().length > 0) {
            <div class="critical-banner">
              <span class="critical-icon">🚨</span>
              <div class="critical-text">
                <strong>CRITICAL — {{ criticalTickets().length }} L3 Issue{{ criticalTickets().length === 1 ? '' : 's' }} Active</strong>
                <span class="critical-list">{{ criticalSubjects() }}</span>
              </div>
              <a routerLink="/support/tickets" class="critical-cta">View Queue →</a>
            </div>
          }

          <div class="support-grid">
            <div class="card">
              <div class="card-header"><h3>Volume by Level</h3></div>
              <div class="card-body">
                @for (l of [1, 2, 3]; track l) {
                  <div class="vol-row">
                    <div class="vol-head">
                      <span class="vol-label" [style.color]="levelColor(l)">{{ levelLabel(l) }}</span>
                      <span class="vol-count">{{ ticketsAtLevel(l) }}</span>
                    </div>
                    <div class="vol-track"><div class="vol-fill" [style.width.%]="volumePct(l)" [style.background]="levelColor(l)"></div></div>
                  </div>
                }
              </div>
            </div>

            <div class="card">
              <div class="card-header"><h3>Status Breakdown</h3></div>
              <div class="card-body">
                @for (s of supportStatuses; track s) {
                  <div class="status-row">
                    <span class="status-pill" [style.background]="statusBg(s)" [style.color]="statusColor(s)">{{ s }}</span>
                    <span class="status-count">{{ ticketsByStatus(s) }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          @if (customerMetrics().length > 0) {
            <div class="card cust-metrics-card">
              <div class="card-header">
                <h3>Customer Support Metrics</h3>
                <span class="card-sub">{{ customerMetrics().length }} customer{{ customerMetrics().length === 1 ? '' : 's' }} with tickets · sorted by L3 critical, then open volume</span>
              </div>
              <div class="card-body">
                <div class="cust-grid">
                  @for (c of customerMetrics(); track c.key) {
                    <div class="cust-card" [class.has-l3]="c.l3Open > 0" [class.has-breach]="c.slaBreached > 0">
                      <div class="cust-card-head">
                        <div>
                          <div class="cust-name" [title]="c.name">{{ c.name }}</div>
                          <div class="cust-email" [title]="c.contactEmail || ''">{{ c.contactEmail || '—' }}</div>
                        </div>
                        <div class="cust-total">
                          <span class="cust-total-num">{{ c.total }}</span>
                          <span class="cust-total-label">tickets</span>
                        </div>
                      </div>

                      <div class="cust-status-row">
                        <div class="cust-stat open" [class.zero]="c.open === 0">
                          <span class="stat-num">{{ c.open }}</span>
                          <span class="stat-label">Open</span>
                        </div>
                        <div class="cust-stat in-progress" [class.zero]="c.inProgress === 0">
                          <span class="stat-num">{{ c.inProgress }}</span>
                          <span class="stat-label">In Progress</span>
                        </div>
                        <div class="cust-stat resolved" [class.zero]="(c.resolved + c.closed) === 0">
                          <span class="stat-num">{{ c.resolved + c.closed }}</span>
                          <span class="stat-label">Resolved</span>
                        </div>
                      </div>

                      <div class="cust-level-row">
                        <span class="level-pill l1" [class.zero]="c.l1 === 0">L1: {{ c.l1 }}</span>
                        <span class="level-pill l2" [class.zero]="c.l2 === 0">L2: {{ c.l2 }}</span>
                        <span class="level-pill l3" [class.zero]="c.l3 === 0" [class.alert]="c.l3Open > 0">
                          L3: {{ c.l3 }}@if (c.l3Open > 0) { <span> · {{ c.l3Open }} open</span> }
                        </span>
                      </div>

                      <div class="cust-perf-row">
                        <div class="cust-perf">
                          <span class="perf-label">Avg resolve</span>
                          <span class="perf-val">{{ c.avgResolutionHours !== null ? c.avgResolutionHours.toFixed(1) + 'h' : '—' }}</span>
                        </div>
                        <div class="cust-perf">
                          <span class="perf-label">SLA on-time</span>
                          <span class="perf-val" [style.color]="slaRateColor(c.slaOnTimeRate)">
                            {{ c.slaOnTimeRate !== null ? c.slaOnTimeRate + '%' : '—' }}
                          </span>
                        </div>
                        <div class="cust-perf">
                          <span class="perf-label">Last update</span>
                          <span class="perf-val">{{ formatRelative(c.lastUpdate) }}</span>
                        </div>
                      </div>

                      @if (c.slaBreached > 0) {
                        <div class="cust-breach">⚠ {{ c.slaBreached }} ticket{{ c.slaBreached === 1 ? '' : 's' }} past SLA</div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @if (slaWatchTickets().length > 0) {
            <div class="card sla-card">
              <div class="card-header">
                <h3>⏱ SLA Watch — {{ slaWatchTickets().length }} Ticket{{ slaWatchTickets().length === 1 ? '' : 's' }} Approaching/Exceeding SLA</h3>
              </div>
              <div class="card-body">
                @for (t of slaWatchTickets(); track t.id) {
                  <div class="sla-row">
                    <span class="sla-num">{{ t.ticketNumber }}</span>
                    <span class="sla-badge" [style.background]="levelBg(t.level)" [style.color]="levelColor(t.level)">L{{ t.level }}</span>
                    <span class="sla-subject" [title]="t.subject">{{ t.subject }}</span>
                    <div class="sla-track">
                      <div class="sla-fill"
                           [style.width.%]="slaProgressPct(t)"
                           [style.background]="slaIsOver(t) ? '#E11D48' : '#F59E0B'"></div>
                    </div>
                    <span class="sla-hours" [style.color]="slaIsOver(t) ? '#E11D48' : '#92400E'">
                      {{ slaHoursOpen(t) }}h / {{ slaTargetHours(t) }}h
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <div class="card">
            <div class="card-header">
              <h3>Recent Ticket Activity</h3>
              <a routerLink="/support/tickets" class="view-all">View all</a>
            </div>
            <div class="card-body">
              @if (recentTickets().length === 0) {
                <div class="empty-state"><p>No tickets yet. New tickets will appear here.</p></div>
              }
              <table class="recent-table">
                <thead><tr><th>Ticket</th><th>Level</th><th>Customer</th><th>Subject</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  @for (t of recentTickets(); track t.id) {
                    <tr>
                      <td class="num">{{ t.ticketNumber }}</td>
                      <td><span class="sla-badge" [style.background]="levelBg(t.level)" [style.color]="levelColor(t.level)">L{{ t.level }}</span></td>
                      <td>{{ t.customerName || t.customerCompany }}</td>
                      <td class="subject-cell" [title]="t.subject">{{ t.subject }}</td>
                      <td><span class="status-pill" [style.background]="statusBg(t.status)" [style.color]="statusColor(t.status)">{{ t.status }}</span></td>
                      <td class="muted">{{ formatTicketDate(t.updatedAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      } @else {
      <!-- Main Grid -->
      <div class="dashboard-grid">
        <!-- Activity Feed -->
        <div class="card activity-card">
          <div class="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="card-body activity-feed">
            @for (activity of dataService.activities(); track activity.id) {
              <div class="activity-item">
                <div class="activity-avatar" [style.background]="teamUtil.getColor(activity.who)">
                  {{ activity.who.charAt(0) }}
                </div>
                <div class="activity-content">
                  <p>
                    <strong>{{ activity.who }}</strong>
                    {{ activity.action }}
                    <span class="activity-target">{{ activity.target }}</span>
                    @if (activity.detail) {
                      <span class="activity-detail">{{ activity.detail }}</span>
                    }
                  </p>
                  <span class="activity-time">{{ activity.time }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Team Status -->
        <div class="card team-card">
          <div class="card-header">
            <h3>Team Status</h3>
          </div>
          <div class="card-body team-grid">
            @for (member of team; track member.id) {
              <div class="team-member">
                <div class="member-avatar" [style.background]="member.color">
                  {{ member.name.charAt(0) }}
                  <span class="status-dot" [class]="member.status"></span>
                </div>
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-role">{{ member.role }}</span>
                </div>
                <div class="member-time">
                  <span class="local-time">{{ getLocalTime(member.utcOffset) }}</span>
                  <span class="timezone">{{ member.tz }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Deals Needing Action -->
        <div class="card deals-card">
          <div class="card-header">
            <h3>High Priority Deals</h3>
            <a routerLink="/leads" class="view-all">View all</a>
          </div>
          <div class="card-body deals-list">
            @for (deal of dataService.highPriorityDeals(); track deal.id) {
              <div class="deal-item" routerLink="/leads">
                <div class="deal-main">
                  <div class="deal-avatar" [style.background]="teamUtil.getColor(deal.owner)">
                    {{ deal.company.charAt(0) }}
                  </div>
                  <div class="deal-info">
                    <span class="deal-company">{{ deal.company }}</span>
                    <span class="deal-action">{{ deal.nextAction }}</span>
                  </div>
                </div>
                <div class="deal-meta">
                  <span class="badge" [class]="'badge-' + getStageColor(deal.stage)">{{ deal.stage }}</span>
                  <span class="deal-value">{{ deal.value | currencyShort }}</span>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <p>No high priority deals</p>
              </div>
            }
          </div>
        </div>
      </div>

      }

      <!-- CheatSheet Card -->
      @if (dashRole() !== 'support') {
      <div class="canvas-card" (click)="showCanvas.set(true)">
        <div class="canvas-preview">
          <div class="canvas-grid-preview">
            <div class="cp-block cp-kp"></div>
            <div class="cp-block cp-ka"></div>
            <div class="cp-block cp-vp"></div>
            <div class="cp-block cp-cr"></div>
            <div class="cp-block cp-cs"></div>
            <div class="cp-block cp-kr"></div>
            <div class="cp-block cp-ch"></div>
            <div class="cp-block cp-cost"></div>
            <div class="cp-block cp-rev"></div>
          </div>
        </div>
        <div class="canvas-info">
          <div class="canvas-icon">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="12" rx="9" ry="9" fill="#EDA807" opacity="0.85"/>
              <ellipse cx="24" cy="12" rx="9" ry="9" fill="#239888" opacity="0.85"/>
              <ellipse cx="12" cy="24" rx="9" ry="9" fill="#9F2094" opacity="0.85"/>
              <ellipse cx="24" cy="24" rx="9" ry="9" fill="#0F54AE" opacity="0.85"/>
              <circle  cx="18" cy="18" r="5"  fill="#56006E"/>
            </svg>
          </div>
          <div class="canvas-text">
            <h3>CheatSheet</h3>
            <p>AI-Powered Quality Management Platform</p>
          </div>
          <button class="canvas-btn">
            View CheatSheet
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
      }
    </div>

    <!-- CheatSheet Modal -->
    @if (showCanvas()) {
      <div class="canvas-modal-overlay" (click)="showCanvas.set(false)">
        <div class="canvas-modal" (click)="$event.stopPropagation()">
          <div class="canvas-modal-header">
            <div class="canvas-logo-mark">
              <svg class="logo-clover" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="12" cy="12" rx="9" ry="9" fill="#EDA807" opacity="0.85"/>
                <ellipse cx="24" cy="12" rx="9" ry="9" fill="#239888" opacity="0.85"/>
                <ellipse cx="12" cy="24" rx="9" ry="9" fill="#9F2094" opacity="0.85"/>
                <ellipse cx="24" cy="24" rx="9" ry="9" fill="#0F54AE" opacity="0.85"/>
                <circle  cx="18" cy="18" r="5"  fill="#56006E"/>
                <line x1="18" y1="28" x2="18" y2="35" stroke="#56006E" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              <img src="assets/images/cat-i-logo.png" alt="CAT-I.AI" class="canvas-logo-img">
            </div>
            <div class="canvas-title-group">
              <h1>CheatSheet</h1>
              <p>AI-Powered Quality Management Platform · Food &amp; Beverage Manufacturing</p>
            </div>
            <button class="canvas-close-btn" (click)="showCanvas.set(false)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="canvas-modal-body">
            <div class="bmc-canvas">
              <!-- KEY PARTNERS -->
              <div class="bmc-block bmc-kp bmc-accent-purple">
                <div class="bmc-block-title">Key Partners</div>
                <div class="bmc-section-label">Technology</div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>AI / LLM providers</strong> — Claude/OpenAI for document generation, quiz creation, flowchart AI</span></div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>Cloud infrastructure</strong> — AWS/Azure for secure SaaS hosting, backups, uptime SLA</span></div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>eSignature &amp; identity</strong> — DocuSign / Auth0 for approval workflows and user permissions</span></div>
                <hr class="bmc-divider">
                <div class="bmc-section-label">Industry</div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>Food safety consultants</strong> — Channel partners who recommend CAT-I during audits and FSMA implementation</span></div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>Certification bodies</strong> — SQF, BRC, FSSC 22000 — alignment with their audit frameworks drives adoption</span></div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>ERP / WMS vendors</strong> — NetSuite, SAP integrations for supplier and production data sync</span></div>
                <hr class="bmc-divider">
                <div class="bmc-section-label">Go-to-Market</div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>Food industry associations</strong> — GMA, FMI, RFG for exposure to mid-market food manufacturers</span></div>
                <div class="bmc-item"><span class="bmc-dot purple"></span><span class="bmc-text"><strong>Implementation &amp; SI partners</strong> — System integrators for enterprise rollouts</span></div>
              </div>

              <!-- KEY ACTIVITIES -->
              <div class="bmc-block bmc-ka bmc-accent-teal">
                <div class="bmc-block-title">Key Activities</div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>AI model fine-tuning</strong> for food safety document generation and hazard analysis</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Platform R&amp;D</strong> — continuous feature dev across 9 modules (HACCP, training, suppliers, docs…)</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Compliance monitoring</strong> — tracking FSMA, GFSI, OSHA regulatory changes to keep templates current</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Customer onboarding &amp; success</strong> — guided setup, audit template configuration, SOP migration</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Sales &amp; marketing</strong> — content marketing to quality managers, trade show presence, channel partnerships</span></div>
              </div>

              <!-- VALUE PROPOSITION (Hero) — Purple gradient per brand spec -->
              <div class="bmc-block bmc-vp bmc-vp-hero">
                <div class="bmc-block-title">Value Proposition</div>
                <div class="bmc-vp-headline">Audit-ready, every day — not just the week before.</div>
                <div class="bmc-vp-sub">One AI-powered platform that consolidates food safety, quality management, training, and supplier compliance — eliminating the chaos of spreadsheets, email chains, and scattered folders.</div>
                <div class="bmc-section-label">Core jobs done for customers</div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>Always audit-ready</strong> — all compliance evidence in one place, continuously maintained</span></div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>Prevent recalls before they happen</strong> — AI risk analytics across product lines and suppliers</span></div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>Eliminate document chaos</strong> — AI-generated, version-controlled, approval-routed documents</span></div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>Track supplier compliance automatically</strong> — cert expiry alerts, risk dashboards, automated follow-ups</span></div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>Build a real safety culture</strong> — continuous training, AI quizzes, measurable accountability</span></div>
                <div class="bmc-item"><span class="bmc-dot"></span><span class="bmc-text"><strong>HACCP without spreadsheets</strong> — integrated hazard analysis, CCPs, and corrective actions</span></div>
                <hr class="bmc-divider bmc-divider-light">
                <div class="bmc-section-label">Differentiators</div>
                <div class="bmc-badges">
                  <span class="bmc-badge">AI document generator</span>
                  <span class="bmc-badge">BUILD risk system</span>
                  <span class="bmc-badge">HACCP integration</span>
                  <span class="bmc-badge">Supplier cert automation</span>
                  <span class="bmc-badge">AI quiz generation</span>
                  <span class="bmc-badge">Food-industry specific</span>
                </div>
              </div>

              <!-- CUSTOMER RELATIONSHIPS -->
              <div class="bmc-block bmc-cr bmc-accent-coral">
                <div class="bmc-block-title">Customer Relationships</div>
                <div class="bmc-item"><span class="bmc-dot coral"></span><span class="bmc-text"><strong>Guided onboarding</strong> — white-glove setup of audit templates, SOPs, and user hierarchy</span></div>
                <div class="bmc-item"><span class="bmc-dot coral"></span><span class="bmc-text"><strong>Dedicated customer success</strong> — ongoing check-ins tied to audit calendar and compliance deadlines</span></div>
                <div class="bmc-item"><span class="bmc-dot coral"></span><span class="bmc-text"><strong>Self-service knowledge base</strong> — in-platform help docs, training videos, searchable guides</span></div>
                <div class="bmc-item"><span class="bmc-dot coral"></span><span class="bmc-text"><strong>Community &amp; benchmarking</strong> — peer network for food safety professionals, shared best practices</span></div>
                <div class="bmc-item"><span class="bmc-dot coral"></span><span class="bmc-text"><strong>Automated alerts</strong> — proactive notifications for cert expiry, overdue tasks, compliance gaps</span></div>
              </div>

              <!-- CUSTOMER SEGMENTS -->
              <div class="bmc-block bmc-cs bmc-accent-amber">
                <div class="bmc-block-title">Customer Segments</div>
                <div class="bmc-section-label">Primary</div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>Food &amp; beverage manufacturers</strong> — 50–2,000 employees, pursuing SQF/BRC/FSSC certification or annual re-certification</span></div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>Food retailers &amp; distributors</strong> — managing supplier compliance across a broad vendor base</span></div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>Packaging &amp; ingredients suppliers</strong> — complying with customer-mandated food safety standards</span></div>
                <hr class="bmc-divider">
                <div class="bmc-section-label">Decision Makers</div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>VP / Director of Quality</strong> — primary champion; owns audit outcomes</span></div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>Food Safety Manager</strong> — daily user; manages HACCP, CCPs, non-conformances</span></div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>Operations / Plant Manager</strong> — cares about uptime, recall prevention, OSHA incidents</span></div>
                <div class="bmc-item"><span class="bmc-dot amber"></span><span class="bmc-text"><strong>HR / Training Manager</strong> — owns workforce certification and training records</span></div>
                <hr class="bmc-divider">
                <div class="bmc-section-label">Excluded (for now)</div>
                <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text">Restaurants &amp; food service (different regulatory framework)</span></div>
                <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text">Pharma / medical devices (FDA 21 CFR Part 11 different scope)</span></div>
              </div>

              <!-- KEY RESOURCES -->
              <div class="bmc-block bmc-kr bmc-accent-teal">
                <div class="bmc-block-title">Key Resources</div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>AI &amp; ML capabilities</strong> — proprietary models for document generation, quiz creation, risk scoring</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Compliance content library</strong> — pre-built HACCP templates, SOP frameworks, audit checklists mapped to GFSI standards</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Multi-tenant SaaS platform</strong> — secure, scalable cloud infrastructure with role-based permissions</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Domain expertise</strong> — food safety &amp; regulatory knowledge embedded into product decisions</span></div>
                <div class="bmc-item"><span class="bmc-dot teal"></span><span class="bmc-text"><strong>Customer data network</strong> — anonymized benchmarks across manufacturers improve AI accuracy over time</span></div>
              </div>

              <!-- CHANNELS -->
              <div class="bmc-block bmc-ch bmc-accent-blue">
                <div class="bmc-block-title">Channels</div>
                <div class="bmc-item"><span class="bmc-dot blue"></span><span class="bmc-text"><strong>Direct SaaS sales</strong> — inside sales team targeting quality managers at mid-market food companies</span></div>
                <div class="bmc-item"><span class="bmc-dot blue"></span><span class="bmc-text"><strong>cat-i.ai website</strong> — inbound marketing, demo requests, freemium trial funnel</span></div>
                <div class="bmc-item"><span class="bmc-dot blue"></span><span class="bmc-text"><strong>Food safety consultants</strong> — referral channel; consultants license or resell CAT-I to clients</span></div>
                <div class="bmc-item"><span class="bmc-dot blue"></span><span class="bmc-text"><strong>Trade shows &amp; conferences</strong> — IFT, Pack Expo, GFSI Global Conference for brand awareness</span></div>
                <div class="bmc-item"><span class="bmc-dot blue"></span><span class="bmc-text"><strong>LinkedIn &amp; content marketing</strong> — targeting QA/food safety professionals with compliance education content</span></div>
              </div>

              <!-- COST STRUCTURE -->
              <div class="bmc-block bmc-cost bmc-accent-gray">
                <div class="bmc-block-title">Cost Structure</div>
                <div class="bmc-three-col">
                  <div>
                    <div class="bmc-section-label">Technology</div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>AI / LLM API costs</strong> — per-use costs for document generation, quiz creation, risk analysis</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Cloud infrastructure</strong> — AWS/Azure compute, storage, CDN, backups, security</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Third-party SaaS</strong> — eSignature, email automation, monitoring tools</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>R&amp;D / Engineering</strong> — product and platform development team</span></div>
                  </div>
                  <div>
                    <div class="bmc-section-label">People</div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Engineering &amp; product</strong> — largest cost center; continuous platform development</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Customer success</strong> — onboarding specialists and ongoing account management</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Food safety SMEs</strong> — domain experts maintaining compliance content library</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Sales &amp; marketing</strong> — inside sales, content, and events team</span></div>
                  </div>
                  <div>
                    <div class="bmc-section-label">Go-to-Market</div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Trade show &amp; events</strong> — booth presence at IFT, Pack Expo, GFSI</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Channel partner enablement</strong> — training, co-marketing with consultants and SIs</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Content marketing</strong> — SEO, blog, webinars targeting QA professionals</span></div>
                    <div class="bmc-item"><span class="bmc-dot gray"></span><span class="bmc-text"><strong>Support &amp; ops</strong> — helpdesk, security compliance (SOC 2), legal</span></div>
                  </div>
                </div>
              </div>

              <!-- REVENUE STREAMS -->
              <div class="bmc-block bmc-rev">
                <div class="bmc-block-title">Revenue Streams</div>
                <div class="bmc-two-col">
                  <div>
                    <div class="bmc-section-label bmc-section-label-purple">Recurring SaaS</div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Monthly / Annual subscriptions</strong> — tiered by user count, module access, and company size</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Enterprise licenses</strong> — multi-site, multi-brand food companies with custom pricing</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Module add-ons</strong> — HACCP, supplier management, and BUILD system as premium tiers</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>AI usage billing</strong> — consumption-based charges for high-volume document and quiz generation</span></div>
                  </div>
                  <div>
                    <div class="bmc-section-label bmc-section-label-purple">Services &amp; Expansion</div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Onboarding &amp; implementation</strong> — paid setup, SOP migration, and audit template configuration</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Training &amp; certification services</strong> — managed food safety training programs for client teams</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Consultant reseller margin</strong> — revenue share from food safety consultant channel partners</span></div>
                    <div class="bmc-item"><span class="bmc-dot rev-dot"></span><span class="bmc-text rev-text"><strong>Compliance benchmarking reports</strong> — anonymized industry data insights sold as premium content</span></div>
                  </div>
                </div>
              </div>
            </div>
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

    /* Support Dashboard */
    .support-dash { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .critical-banner {
      background: #FEF2F2; border: 1.5px solid #E11D48; border-radius: 8px;
      padding: 12px 18px; display: flex; gap: 12px; align-items: center;
    }
    :host-context([data-theme="dark"]) .critical-banner { background: rgba(225, 29, 72, 0.12); }
    .critical-icon { font-size: 22px; }
    .critical-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .critical-text strong { color: #E11D48; font-size: 13px; }
    .critical-list { color: #7F1D1D; font-size: 12px; }
    :host-context([data-theme="dark"]) .critical-list { color: #FCA5A5; }
    .critical-cta {
      background: #E11D48; color: white; padding: 6px 14px; border-radius: 6px;
      font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap;
    }

    .support-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 900px) { .support-grid { grid-template-columns: 1fr; } }

    .vol-row { margin-bottom: 12px; }
    .vol-row:last-child { margin-bottom: 0; }
    .vol-head { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
    .vol-label { font-weight: 700; }
    .vol-count { color: var(--text-muted, #6B7280); font-weight: 700; }
    .vol-track { height: 8px; background: var(--bg-soft, #F9FAFB); border-radius: 4px; overflow: hidden; }
    .vol-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }

    .status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .status-row:last-child { margin-bottom: 0; }
    .status-pill { border-radius: 12px; padding: 2px 10px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .status-count { font-weight: 700; font-size: 14px; }

    .cust-metrics-card { border-left: 4px solid #6366F1; }
    .cust-metrics-card .card-header { display: flex; justify-content: space-between; align-items: baseline; }
    .cust-metrics-card .card-sub { font-size: 11px; color: var(--text-muted, #6B7280); font-weight: 500; }

    .cust-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .cust-card { background: var(--bg-elevated, #fff); border: 1px solid var(--border-hairline, #E5E7EB); border-left: 3px solid #6366F1; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: box-shadow 0.15s, border-color 0.15s; }
    .cust-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .cust-card.has-l3 { border-left-color: #E11D48; background: linear-gradient(180deg, #FEF2F2 0%, var(--bg-elevated, #fff) 30%); }
    .cust-card.has-breach:not(.has-l3) { border-left-color: #F59E0B; }

    .cust-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .cust-name { font-size: 13px; font-weight: 800; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
    .cust-email { font-size: 10px; color: var(--text-muted, #6B7280); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
    .cust-total { display: flex; flex-direction: column; align-items: flex-end; }
    .cust-total-num { font-size: 22px; font-weight: 800; color: #6366F1; line-height: 1; }
    .cust-total-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #6B7280); font-weight: 700; margin-top: 2px; }

    .cust-status-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 8px 0; border-top: 1px solid var(--border-hairline, #E5E7EB); border-bottom: 1px solid var(--border-hairline, #E5E7EB); }
    .cust-stat { text-align: center; padding: 4px 6px; border-radius: 6px; }
    .cust-stat .stat-num { display: block; font-size: 16px; font-weight: 800; line-height: 1; }
    .cust-stat .stat-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #6B7280); font-weight: 700; margin-top: 3px; }
    .cust-stat.open .stat-num { color: #1A56DB; }
    .cust-stat.in-progress .stat-num { color: #92400E; }
    .cust-stat.resolved .stat-num { color: #047857; }
    .cust-stat.zero .stat-num { color: #D1D5DB; }
    .cust-stat.zero .stat-label { color: #D1D5DB; }

    .cust-level-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .level-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .level-pill.l1 { background: #D1FAE5; color: #047857; }
    .level-pill.l2 { background: #FEF3C7; color: #92400E; }
    .level-pill.l3 { background: #FEE2E2; color: #BE123C; }
    .level-pill.l3.alert { box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.25); }
    .level-pill.zero { background: var(--bg-soft, #F3F4F6); color: #9CA3AF; box-shadow: none; }

    .cust-perf-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .cust-perf { display: flex; flex-direction: column; }
    .cust-perf .perf-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #6B7280); font-weight: 700; }
    .cust-perf .perf-val { font-size: 12px; font-weight: 700; color: var(--text, #111827); margin-top: 2px; }

    .cust-breach { background: #FEE2E2; color: #BE123C; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; text-align: center; }

    .sla-card { border-left: 4px solid #F59E0B; }
    .sla-row {
      display: grid;
      grid-template-columns: 80px 60px 1fr 1fr 110px;
      gap: 10px; align-items: center; margin-bottom: 8px;
    }
    .sla-row:last-child { margin-bottom: 0; }
    .sla-num { font-family: monospace; font-weight: 700; font-size: 11px; color: #1A56DB; }
    .sla-badge {
      border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700;
      text-align: center; border: 1px solid currentColor;
    }
    .sla-subject {
      font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--text, #111827);
    }
    .sla-track { height: 6px; background: var(--bg-soft, #F3F4F6); border-radius: 3px; }
    .sla-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    .sla-hours { font-size: 11px; font-weight: 700; text-align: right; }

    .recent-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .recent-table th {
      text-align: left; padding: 8px 10px; font-weight: 600;
      color: var(--text-muted, #6B7280); border-bottom: 1px solid var(--border-hairline, #E5E7EB);
      background: var(--bg-soft, #F9FAFB);
    }
    .recent-table td {
      padding: 9px 10px; border-bottom: 1px solid var(--border-hairline, #E5E7EB);
    }
    .recent-table tr:last-child td { border-bottom: none; }
    .recent-table .num { font-family: monospace; font-weight: 700; color: #1A56DB; }
    .recent-table .subject-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .recent-table .muted { color: var(--text-muted, #6B7280); }

    .dashboard-content {
      flex: 1;
      padding: 1rem 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      flex: 1;
      min-height: 0;
    }

    .card {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-header h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .view-all {
      font-size: 0.8125rem;
      color: var(--color-primary);
      text-decoration: none;
    }
    .view-all:hover {
      text-decoration: underline;
    }

    .card-body {
      flex: 1;
      overflow-y: auto;
    }

    /* Activity Feed */
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      gap: 12px;
    }

    .activity-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-content p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-gray-700);
      line-height: 1.4;
    }

    .activity-target {
      color: var(--color-primary);
      font-weight: 500;
    }

    .activity-detail {
      color: var(--color-gray-500);
    }

    .activity-time {
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    /* Team Grid */
    .team-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .team-member {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
      position: relative;
      flex-shrink: 0;
    }

    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-dot.online { background: var(--color-success); }
    .status-dot.away { background: var(--color-warning); }
    .status-dot.offline { background: var(--color-gray-400); }

    .member-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .member-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .member-role {
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .member-time {
      text-align: right;
      display: flex;
      flex-direction: column;
    }

    .local-time {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .timezone {
      font-size: 0.6875rem;
      color: var(--color-gray-400);
    }

    /* Deals List */
    .deals-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .deal-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: var(--color-gray-50);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .deal-item:hover {
      background: var(--color-gray-100);
    }

    .deal-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .deal-avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .deal-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .deal-company {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .deal-action {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .deal-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .deal-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Business Model Canvas Card */
    .canvas-card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #085041 0%, #0F6E56 50%, #1D9E75 100%);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .canvas-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(8, 80, 65, 0.3);
    }

    .canvas-preview {
      width: 120px;
      height: 70px;
      background: rgba(255,255,255,0.1);
      border-radius: var(--radius-md);
      padding: 8px;
      flex-shrink: 0;
    }

    .canvas-grid-preview {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 3px;
      height: 100%;
    }

    .cp-block {
      background: rgba(255,255,255,0.25);
      border-radius: 2px;
    }

    .cp-kp { grid-column: 1; grid-row: 1 / 3; background: rgba(175,169,236,0.6); }
    .cp-ka { grid-column: 2; grid-row: 1; background: rgba(93,202,165,0.6); }
    .cp-vp { grid-column: 3; grid-row: 1 / 3; background: rgba(255,255,255,0.5); }
    .cp-cr { grid-column: 4; grid-row: 1; background: rgba(240,153,123,0.6); }
    .cp-cs { grid-column: 5; grid-row: 1 / 3; background: rgba(239,159,39,0.6); }
    .cp-kr { grid-column: 2; grid-row: 2; background: rgba(93,202,165,0.6); }
    .cp-ch { grid-column: 4; grid-row: 2; background: rgba(133,183,235,0.6); }
    .cp-cost { grid-column: 1 / 4; grid-row: 3; background: rgba(200,200,200,0.4); }
    .cp-rev { grid-column: 4 / 6; grid-row: 3; background: rgba(93,202,165,0.4); }

    .canvas-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .canvas-icon svg {
      width: 40px;
      height: 40px;
    }

    .canvas-text h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
    }

    .canvas-text p {
      margin: 4px 0 0;
      font-size: 0.8125rem;
      color: rgba(255,255,255,0.7);
    }

    .canvas-btn {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: var(--radius-md);
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .canvas-btn:hover {
      background: rgba(255,255,255,0.25);
    }

    /* Canvas Modal */
    .canvas-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .canvas-modal {
      width: 100%;
      max-width: 1500px;
      max-height: 95vh;
      background: #F8F8F6;
      border-radius: var(--radius-xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .canvas-modal-header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px 24px;
      background: white;
      border-bottom: 1px solid #EFEFEB;
    }

    .canvas-logo-mark {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-clover {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .canvas-logo-img {
      height: 36px;
      object-fit: contain;
    }

    .canvas-title-group {
      flex: 1;
    }

    .canvas-title-group h1 {
      margin: 0;
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #56006E;
    }

    .canvas-title-group p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #888780;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .canvas-close-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: #F8F8F6;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5F5E5A;
    }

    .canvas-close-btn:hover {
      background: #EFEFEB;
    }

    .canvas-modal-body {
      flex: 1;
      overflow: auto;
      padding: 24px;
    }

    /* Business Model Canvas Grid */
    .bmc-canvas {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: auto auto auto;
      gap: 10px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .bmc-block {
      background: white;
      border: 1px solid #EFEFEB;
      border-radius: var(--radius-lg);
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .bmc-block::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    }

    .bmc-accent-purple::before { background: #AFA9EC; }
    .bmc-accent-teal::before { background: #1D9E75; }
    .bmc-accent-coral::before { background: #F0997B; }
    .bmc-accent-amber::before { background: #EF9F27; }
    .bmc-accent-blue::before { background: #85B7EB; }
    .bmc-accent-gray::before { background: #D3D1C7; }
    .bmc-accent-teal-light::before { background: #5DCAA5; }

    .bmc-kp { grid-column: 1; grid-row: 1 / 3; }
    .bmc-ka { grid-column: 2; grid-row: 1; }
    .bmc-vp { grid-column: 3; grid-row: 1 / 3; }
    .bmc-cr { grid-column: 4; grid-row: 1; }
    .bmc-cs { grid-column: 5; grid-row: 1 / 3; }
    .bmc-kr { grid-column: 2; grid-row: 2; }
    .bmc-ch { grid-column: 4; grid-row: 2; }
    .bmc-cost { grid-column: 1 / 4; grid-row: 3; }
    .bmc-rev { grid-column: 4 / 6; grid-row: 3; }

    /* Value Proposition Hero Block — Purple brand gradient */
    .bmc-vp-hero {
      background: linear-gradient(135deg, #9F2094, #56006E);
      border-color: #56006E;
      color: white;
    }

    .bmc-vp-hero::before { background: #EDA807; }
    .bmc-vp-hero .bmc-block-title { color: rgba(255,255,255,0.7); }
    .bmc-vp-hero .bmc-section-label { color: #EDA807; }
    .bmc-vp-hero .bmc-dot { background: #EDA807; }
    .bmc-vp-hero .bmc-divider { border-color: rgba(255,255,255,0.12); }
    .bmc-vp-hero .bmc-text { color: rgba(255,255,255,0.88); }
    .bmc-vp-hero .bmc-text strong { color: white; }

    .bmc-vp-headline {
      font-size: 15px;
      font-weight: 600;
      color: white;
      margin-bottom: 6px;
      line-height: 1.35;
    }

    .bmc-vp-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .bmc-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 6px;
    }

    .bmc-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      background: rgba(255,255,255,0.12);
      color: #EDA807;
    }

    /* Revenue Block — Purple tint per brand spec */
    .bmc-rev {
      background: #F5F3FF;
      border-color: #DDD6FE;
    }

    .bmc-rev .bmc-block-title { color: #56006E; }
    .bmc-rev-dot { background: #9F2094 !important; }

    .bmc-dot.rev-dot { background: #9F2094; }
    .bmc-text.rev-text { color: #56006E; }
    .bmc-text.rev-text strong { color: #3B0053; }

    .bmc-section-label-purple { color: #9F2094 !important; }

    .bmc-block-title {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #888780;
      margin-bottom: 12px;
      padding-left: 4px;
    }

    .bmc-section-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1D9E75;
      margin: 10px 0 6px;
    }

    .bmc-divider {
      border: none;
      border-top: 1px solid #EFEFEB;
      margin: 10px 0;
    }

    .bmc-divider-light {
      border-color: rgba(255,255,255,0.15);
    }

    .bmc-item {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-bottom: 6px;
    }

    .bmc-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #1D9E75;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .bmc-dot.purple { background: #AFA9EC; }
    .bmc-dot.teal { background: #1D9E75; }
    .bmc-dot.coral { background: #F0997B; }
    .bmc-dot.amber { background: #EF9F27; }
    .bmc-dot.blue { background: #85B7EB; }
    .bmc-dot.gray { background: #D3D1C7; }

    .bmc-text {
      font-size: 11px;
      line-height: 1.5;
      color: #5F5E5A;
    }

    .bmc-text strong {
      font-weight: 500;
      color: #2C2C2A;
    }

    .bmc-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 20px;
    }

    .bmc-three-col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0 20px;
    }

    /* dash-tabs/dash-tab replaced by global .toolbar-tabs/.tab-btn */

    @media (max-width: 1200px) {
      .bmc-canvas {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: auto;
      }
      .bmc-kp, .bmc-ka, .bmc-vp, .bmc-cr, .bmc-cs,
      .bmc-kr, .bmc-ch, .bmc-cost, .bmc-rev {
        grid-column: auto;
        grid-row: auto;
      }
      .bmc-two-col, .bmc-three-col {
        grid-template-columns: 1fr;
      }
    }

    /* ── Mobile (≤768px) ─────────────────────────────────────── */
    @media (max-width: 768px) {
      /* Let host flow naturally on mobile instead of fixed-height flex */
      :host {
        overflow: visible;
        min-height: auto;
      }

      /* Dashboard content: natural flow, no internal scroll trap */
      .dashboard-content {
        padding: 0.75rem 1rem;
        gap: 0.75rem;
        overflow: visible;
        flex: none;
      }

      /* Tab bar: allow horizontal scroll on very narrow screens */
      .toolbar-tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 0.75rem;
        margin-bottom: 1rem;
        gap: 2px;
        scrollbar-width: none;
      }
      .toolbar-tabs::-webkit-scrollbar { display: none; }

      .tab-btn {
        padding: 0.4rem 0.75rem;
        font-size: 0.8125rem;
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* Stats grid: 2 columns, slightly reduced card padding */
      .stat-card {
        padding: 0.625rem 0.75rem !important;
      }

      /* Main grid: single column, natural height flow */
      .dashboard-grid {
        grid-template-columns: 1fr;
        flex: none;
        min-height: auto;
      }

      /* Cards: natural height on mobile, no internal scroll */
      .card {
        min-height: auto;
      }
      .card-body {
        overflow: visible;
        flex: none;
      }

      /* Limit activity feed to 5 items on mobile */
      .activity-item:nth-child(n+6) { display: none; }
      /* Limit deals to 5 on mobile */
      .deal-item:nth-child(n+6) { display: none; }

      /* Deal rows: ensure minimum tap target */
      .deal-item {
        min-height: 52px;
      }

      /* Activity items: ensure minimum tap target */
      .activity-item {
        min-height: 52px;
        align-items: center;
      }

      /* Team member rows: ensure minimum tap target */
      .team-member {
        min-height: 52px;
      }

      /* Section card headers: slightly more compact */
      .card-header h3 {
        font-size: 0.8125rem;
      }

      /* CheatSheet card: stack vertically on mobile */
      .canvas-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
      }

      .canvas-preview {
        width: 100%;
        height: 52px;
      }

      .canvas-info {
        flex-wrap: wrap;
        gap: 0.75rem;
        width: 100%;
      }

      .canvas-btn {
        margin-left: 0;
        width: 100%;
        justify-content: center;
      }

      /* CheatSheet modal: full-screen with tighter padding */
      .canvas-modal-overlay {
        padding: 0;
        align-items: flex-end;
      }

      .canvas-modal {
        max-width: 100%;
        max-height: 96vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      }

      .canvas-modal-header {
        padding: 16px;
        gap: 12px;
        flex-wrap: wrap;
      }

      .canvas-title-group h1 {
        font-size: 18px;
      }

      .canvas-title-group p {
        font-size: 10px;
      }

      .canvas-modal-body {
        padding: 16px;
      }

      /* BMC canvas: single column on mobile */
      .bmc-canvas {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .bmc-kp, .bmc-ka, .bmc-vp, .bmc-cr, .bmc-cs,
      .bmc-kr, .bmc-ch, .bmc-cost, .bmc-rev {
        grid-column: auto;
        grid-row: auto;
      }

      .bmc-block {
        padding: 12px;
      }

      .bmc-two-col, .bmc-three-col {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent {
  dataService = inject(ApiService);
  teamUtil = inject(TeamUtilService);
  get team() { return this.dataService.team(); }
  showCanvas = signal(false);
  dashRole = signal<'overview' | 'sales' | 'operations' | 'support' | 'marketing'>('overview');

  currentKpis = computed(() => {
    const ds = this.dataService;
    switch (this.dashRole()) {
      case 'sales': return [
        { label: 'Pipeline Value', formatted: this.formatCurrency(ds.pipelineValue()) },
        { label: 'Won Revenue', formatted: this.formatCurrency(ds.wonRevenue()) },
        { label: 'Avg Deal Size', formatted: this.formatCurrency(ds.avgDealSize()) },
        { label: 'Win Rate', formatted: this.getWinRate() + '%' },
        { label: 'Active Deals', formatted: String(ds.activeLeads().length) },
      ];
      case 'operations': return [
        { label: 'Active Projects', formatted: String(ds.activeProjects().length) },
        { label: 'Completed', formatted: String(ds.completedProjects().length) },
        { label: 'Active Customers', formatted: String(ds.activeCustomers().length) },
        { label: 'Onboarding', formatted: String(ds.onboardingCustomers().length) },
        { label: 'Overdue Payments', formatted: String(ds.customersWithOverduePayments().length) },
      ];
      case 'marketing': return [
        { label: 'Total Content', formatted: String(ds.content().length) },
        { label: 'Scheduled', formatted: String(ds.scheduledContent().length) },
        { label: 'Campaigns Sent', formatted: String(ds.campaigns().filter(c => c.status === 'Sent').length) },
        { label: 'Drafts', formatted: String(ds.campaigns().filter(c => c.status === 'Draft').length) },
        { label: 'Published', formatted: String(ds.publishedContent().length) },
      ];
      case 'support': return [
        { label: 'L1 Open', formatted: String(this.openTicketsByLevel(1)) },
        { label: 'L2 Open', formatted: String(this.openTicketsByLevel(2)) },
        { label: 'L3 Open', formatted: String(this.openTicketsByLevel(3)) },
        { label: 'Resolved', formatted: String(this.resolvedTicketsCount()) },
        { label: 'Avg Open Hours', formatted: this.avgOpenHours() },
      ];
      default: return [
        { label: 'Pipeline Value', formatted: this.formatCurrency(ds.pipelineValue()) },
        { label: 'Won Revenue', formatted: this.formatCurrency(ds.wonRevenue()) },
        { label: 'Avg Deal Size', formatted: this.formatCurrency(ds.avgDealSize()) },
        { label: 'High Priority', formatted: String(ds.highPriorityDeals().length) },
        { label: 'Active Projects', formatted: String(ds.activeProjects().length) },
      ];
    }
  });

  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      'Discovery':  'cyan',
      'Intake':     'indigo',
      'Demo':       'yellow',
      'Follow-up':  'orange',
      'Closed Won': 'green',
      'Closed Lost': 'red',
      'Closed Failed': 'gray'
    };
    return colors[stage] || 'gray';
  }

  getLocalTime(utcOffset: number): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (utcOffset * 3600000));
    return localTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + Math.round(value / 1000) + 'K';
    return '$' + value;
  }

  private getWinRate(): number {
    const won = this.dataService.wonLeads().length;
    const lost = this.dataService.lostLeads().length;
    const total = won + lost;
    return total > 0 ? Math.round((won / total) * 100) : 0;
  }

  // ─── Support Dashboard helpers ──────────────────────────────────────────────
  readonly supportStatuses: TicketStatus[] = ['open', 'in-progress', 'resolved', 'escalated', 'closed'];

  private isOpen(t: Ticket) { return t.status !== 'closed' && t.status !== 'resolved'; }

  openTicketsByLevel(level: number): number {
    return this.dataService.tickets().filter(t => t.level === level && this.isOpen(t)).length;
  }
  resolvedTicketsCount(): number {
    return this.dataService.tickets().filter(t => t.status === 'resolved' || t.status === 'closed').length;
  }
  ticketsAtLevel(level: number): number {
    return this.dataService.tickets().filter(t => t.level === level).length;
  }
  ticketsByStatus(status: TicketStatus): number {
    return this.dataService.tickets().filter(t => t.status === status).length;
  }
  volumePct(level: number): number {
    const total = this.dataService.tickets().length;
    if (total === 0) return 0;
    return (this.ticketsAtLevel(level) / total) * 100;
  }
  avgOpenHours(): string {
    const open = this.dataService.tickets().filter(t => this.isOpen(t));
    if (open.length === 0) return '0h';
    const total = open.reduce((sum, t) => sum + (Date.now() - new Date(t.createdAt).getTime()) / 3600000, 0);
    return (total / open.length).toFixed(1) + 'h';
  }
  criticalTickets = computed(() =>
    this.dataService.tickets().filter(t => t.level === 3 && this.isOpen(t))
  );
  criticalSubjects(): string {
    return this.criticalTickets().map(t => t.subject).join(' · ');
  }
  recentTickets = computed(() =>
    [...this.dataService.tickets()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
  );
  slaWatchTickets = computed(() =>
    this.dataService.tickets().filter(t => {
      if (!this.isOpen(t)) return false;
      const target = TICKET_LEVEL_META[t.level].slaHours;
      const hours = (Date.now() - new Date(t.createdAt).getTime()) / 3600000;
      return hours > target * 0.75;
    })
  );
  customerMetrics = computed(() => {
    const tickets = this.dataService.tickets();
    const now = Date.now();
    interface Row {
      key: string; name: string; contactEmail: string;
      total: number; open: number; inProgress: number; resolved: number; closed: number;
      l1: number; l2: number; l3: number; l3Open: number;
      slaBreached: number;
      resolvedHoursList: number[];
      slaHits: number; slaTotal: number;
      lastUpdate: string;
    }
    const map = new Map<string, Row>();
    for (const t of tickets) {
      const key = t.customerId ? `c-${t.customerId}` : `s-${t.customerCompany || 'Unknown'}`;
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          name: t.customerName || t.customerCompany || 'Unknown',
          contactEmail: t.contactEmail || '',
          total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0,
          l1: 0, l2: 0, l3: 0, l3Open: 0,
          slaBreached: 0,
          resolvedHoursList: [],
          slaHits: 0, slaTotal: 0,
          lastUpdate: t.updatedAt,
        };
        map.set(key, row);
      }
      row.total++;
      if (t.level === 1) row.l1++;
      if (t.level === 2) row.l2++;
      if (t.level === 3) row.l3++;
      if (t.status === 'in-progress') row.inProgress++;
      if (t.status === 'resolved') row.resolved++;
      if (t.status === 'closed') row.closed++;
      if (this.isOpen(t)) {
        row.open++;
        if (t.level === 3) row.l3Open++;
        const hoursOpen = (now - new Date(t.createdAt).getTime()) / 3600000;
        const sla = TICKET_LEVEL_META[t.level].slaHours;
        if (hoursOpen > sla) row.slaBreached++;
      }
      if ((t.status === 'resolved' || t.status === 'closed') && t.resolvedAt) {
        const hours = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
        row.resolvedHoursList.push(hours);
        const sla = TICKET_LEVEL_META[t.level].slaHours;
        row.slaTotal++;
        if (hours <= sla) row.slaHits++;
      }
      if (new Date(t.updatedAt) > new Date(row.lastUpdate)) row.lastUpdate = t.updatedAt;
      // Pick up email from any ticket if not set
      if (!row.contactEmail && t.contactEmail) row.contactEmail = t.contactEmail;
    }
    return Array.from(map.values())
      .map(r => ({
        ...r,
        avgResolutionHours: r.resolvedHoursList.length > 0
          ? r.resolvedHoursList.reduce((s, h) => s + h, 0) / r.resolvedHoursList.length
          : null as number | null,
        slaOnTimeRate: r.slaTotal > 0 ? Math.round((r.slaHits / r.slaTotal) * 100) : null as number | null,
      }))
      .sort((a, b) => b.l3Open - a.l3Open || b.open - a.open || new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
  });

  slaRateColor(rate: number | null): string {
    if (rate === null) return 'inherit';
    if (rate >= 90) return '#10B981';
    if (rate >= 75) return '#F59E0B';
    return '#E11D48';
  }

  formatRelative(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  slaHoursOpen(t: Ticket): string {
    return ((Date.now() - new Date(t.createdAt).getTime()) / 3600000).toFixed(1);
  }
  slaTargetHours(t: Ticket): number {
    return TICKET_LEVEL_META[t.level].slaHours;
  }
  slaProgressPct(t: Ticket): number {
    const target = this.slaTargetHours(t);
    const hours = parseFloat(this.slaHoursOpen(t));
    return Math.min((hours / target) * 100, 100);
  }
  slaIsOver(t: Ticket): boolean {
    return parseFloat(this.slaHoursOpen(t)) > this.slaTargetHours(t);
  }
  levelColor(level: number): string { return TICKET_LEVEL_META[level as 1|2|3]?.color || '#6B7280'; }
  levelBg(level: number): string { return TICKET_LEVEL_META[level as 1|2|3]?.bg || '#F3F4F6'; }
  levelIcon(level: number): string { return TICKET_LEVEL_META[level as 1|2|3]?.icon || '•'; }
  levelLabel(level: number): string { return TICKET_LEVEL_META[level as 1|2|3]?.label || ''; }
  statusBg(status: TicketStatus): string { return TICKET_STATUS_META[status]?.bg || '#F3F4F6'; }
  statusColor(status: TicketStatus): string { return TICKET_STATUS_META[status]?.color || '#6B7280'; }
  formatTicketDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
