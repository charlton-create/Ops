import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../layout/header.component';
import { MES_MODULES, MES_AUDIT_MAP, MES_STANDARD_SECTIONS } from '../../../core/constants/seed.data';
import { MesConfigService } from '../../../core/services/mes-config.service';
import { IconComponent } from '../../../shared/icons';

interface ModuleDetail {
  id: string;
  name: string;
  iconName: string;
  description: string;
  fields: { id: string; label: string }[];
  auditTypes: string[];
}

@Component({
  selector: 'app-mes-landing',
  standalone: true,
  imports: [CommonModule, HeaderComponent, IconComponent],
  template: `
    <app-header
      title="MES Intake"
      subtitle="Manufacturing Execution System Discovery Interview"
      icon="factory"
      gradient="linear-gradient(135deg, #0D9488 0%, #0F766E 100%)"
    >
      <button class="btn-secondary btn-sm" (click)="openAdmin()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Admin Config
      </button>
      <button class="btn-primary btn-sm" (click)="startInterview()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Begin Interview
      </button>
    </app-header>

    <div class="mes-landing-content">
      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Standard Sections</span>
            <span class="stat-value">{{ sectionCount }}</span>
          </div>
          <div class="stat-icon">
            <app-icon name="clipboard" [size]="22"></app-icon>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Industry Modules</span>
            <span class="stat-value">{{ moduleCount }}</span>
          </div>
          <div class="stat-icon">
            <app-icon name="layers" [size]="22"></app-icon>
          </div>
        </div>
        <div class="stat-card stat-accent">
          <div class="stat-body">
            <span class="stat-label">Est. Total Time</span>
            <span class="stat-value">~{{ mesConfig.totalMinutes() }}<span class="stat-unit"> min</span></span>
          </div>
          <div class="stat-icon stat-icon-teal">
            <app-icon name="clock" [size]="22"></app-icon>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-body">
            <span class="stat-label">Completion</span>
            <span class="stat-value">{{ completionPct() }}<span class="stat-unit">%</span></span>
          </div>
          <div class="stat-icon stat-icon-gray">
            <app-icon name="check-circle" [size]="22"></app-icon>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">
        <!-- Standard Sections Card -->
        <div class="card sections-card">
          <div class="card-header">
            <h3>Standard Interview Sections</h3>
            <span class="card-hint">{{ sectionCount }} sections · {{ mesConfig.totalMinutes() }} min total</span>
          </div>
          <div class="card-body">
            <div class="sections-list">
              @for (section of sectionRows; track section.id; let i = $index) {
                <div class="section-row">
                  <span class="section-num">{{ i + 1 }}</span>
                  <span class="section-icon-wrap">
                    <app-icon [name]="section.iconName" [size]="16"></app-icon>
                  </span>
                  <span class="section-name">{{ section.title }}</span>
                  <span class="time-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {{ mesConfig.getTimingForSection(section.id) }} min
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Industry Modules Card -->
        <div class="card modules-card">
          <div class="card-header">
            <h3>Available Industry Modules</h3>
            <span class="card-hint">Click a module to see details</span>
          </div>
          <div class="card-body">
            <div class="modules-grid">
              @for (mod of moduleList; track mod.id) {
                <button
                  type="button"
                  class="module-item"
                  [class.selected]="selectedModule() === mod.id"
                  (click)="openModuleModal(mod.id)"
                >
                  <span class="module-icon-wrap">
                    <app-icon [name]="mod.iconName" [size]="24"></app-icon>
                  </span>
                  <span class="module-name">{{ mod.name }}</span>
                  <span class="module-desc">{{ mod.shortDesc }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Module Detail Modal -->
    @if (selectedModule()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          @if (selectedModuleDetail()) {
            <div class="modal-header">
              <div class="modal-title">
                <span class="modal-icon-wrap">
                  <app-icon [name]="selectedModuleDetail()!.iconName" [size]="28"></app-icon>
                </span>
                <h2>{{ selectedModuleDetail()!.name }}</h2>
              </div>
              <button class="modal-close-btn" (click)="closeModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <p class="module-description">{{ selectedModuleDetail()!.description }}</p>

              <div class="modal-section">
                <h5 class="section-label">Specialized Questions</h5>
                <div class="chips-container">
                  @for (field of selectedModuleDetail()!.fields; track field.id) {
                    <span class="chip chip-gray">{{ field.label }}</span>
                  }
                </div>
              </div>

              <div class="modal-section">
                <h5 class="section-label">Industry-Specific Audit Types</h5>
                <div class="chips-container">
                  @for (audit of selectedModuleDetail()!.auditTypes; track audit) {
                    <span class="chip chip-amber">{{ audit }}</span>
                  }
                </div>
              </div>

              <p class="field-count-summary">
                This module adds <strong>{{ selectedModuleDetail()!.fields.length }}</strong> specialized questions to the interview
              </p>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn-begin" (click)="startInterviewWithModule(selectedModuleDetail()!.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Begin Interview with {{ selectedModuleDetail()!.name }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .mes-landing-content {
      padding: 1.5rem;
      flex: 1;
      overflow-y: auto;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border-hairline);
      transition: box-shadow 0.15s ease;
    }

    .stat-card.stat-accent {
      border-color: #99F6E4;
      background: #F0FDFA;
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
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-gray-900);
      line-height: 1;
    }

    .stat-unit {
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-gray-500);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0D9488;
      flex-shrink: 0;
    }

    .stat-icon.stat-icon-teal {
      background: linear-gradient(135deg, #99F6E4 0%, #5EEAD4 100%);
      color: #0F766E;
    }

    .stat-icon.stat-icon-gray {
      background: var(--color-gray-100);
      color: var(--color-gray-500);
    }

    /* Content grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .card {
      background: var(--color-white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-hairline);
      overflow: hidden;
    }

    .card-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-hairline);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .card-hint {
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    .card-body {
      padding: 1rem 1.25rem;
    }

    /* Sections list */
    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .section-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      transition: background 0.1s ease;
    }

    .section-row:hover {
      background: #F0FDFA;
    }

    .section-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #0D9488;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .section-icon-wrap {
      color: #0D9488;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .section-name {
      flex: 1;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .time-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #0D9488;
      background: #CCFBF1;
      padding: 2px 8px;
      border-radius: var(--radius-md);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Modules grid */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .module-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 1rem 0.75rem;
      background: var(--color-gray-50);
      border: 2px solid transparent;
      border-radius: var(--radius-md);
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .module-item:hover {
      background: var(--status-cyan-bg);
      border-color: #99F6E4;
    }

    .module-item.selected {
      background: var(--status-yellow-bg);
      border-color: var(--color-warning);
    }

    .module-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: white;
      border: 1px solid var(--border-hairline);
      color: #0D9488;
      transition: all 0.15s ease;
    }

    .module-item:hover .module-icon-wrap {
      background: #0D9488;
      border-color: #0D9488;
      color: white;
    }

    .module-item.selected .module-icon-wrap {
      background: var(--color-warning);
      border-color: var(--color-warning);
      color: white;
    }

    .module-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .module-desc {
      font-size: 0.6875rem;
      color: var(--color-gray-500);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-container {
      width: 560px;
      max-height: 80vh;
      background: var(--color-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      animation: slideUp 200ms ease;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .modal-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0D9488;
      flex-shrink: 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .modal-close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-500);
      transition: all 0.15s ease;
    }

    .modal-close-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .module-description {
      margin: 0 0 1.5rem 0;
      font-size: 0.9375rem;
      color: var(--color-gray-600);
      line-height: 1.6;
    }

    .modal-section {
      margin-bottom: 1.5rem;
    }

    .section-label {
      margin: 0 0 0.625rem 0;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-gray-500);
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--radius-xl);
      font-size: 12px;
      font-weight: 500;
    }

    .chip-gray {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .chip-amber {
      background: var(--status-yellow-bg);
      color: var(--color-warning);
    }

    .field-count-summary {
      margin: 0;
      padding: 1rem;
      background: var(--color-gray-50);
      border-radius: var(--radius);
      font-size: 0.875rem;
      color: var(--color-gray-600);
      text-align: center;
    }

    .field-count-summary strong {
      color: var(--color-gray-900);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      background: var(--color-gray-50);
      border-top: 1px solid var(--border-hairline);
    }

    .btn-begin {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--color-warning);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-begin:hover {
      background: #B45309;
    }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .content-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: 1fr; }
      .modules-grid { grid-template-columns: 1fr; }
      .modal-container { width: calc(100% - 2rem); margin: 1rem; }
    }

    /* ══════════════════════════════════════════════════════════════
       MOBILE  ≤ 768px
       Targeted additions — desktop layout is untouched.
    ══════════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {

      /* ── Page padding ── */
      .mes-landing-content {
        padding: 1rem;
      }

      /* ── Stats grid → 2-col on 768, already 1-col at 640 via rule above ── */
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      /* ── Stat cards: keep compact on small screens ── */
      .stat-card {
        padding: 1rem;
      }
      .stat-value {
        font-size: 1.375rem;
      }
      .stat-icon {
        width: 40px;
        height: 40px;
      }

      /* ── Content grid → single column ── */
      .content-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      /* ── Card header — stack on very small screens ── */
      .card-header {
        flex-wrap: wrap;
        gap: 4px;
      }

      /* ── Modules grid → 2 tight columns (already 1-col at 640) ── */
      .modules-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.625rem;
      }

      /* ── Module items — comfortable tap target ── */
      .module-item {
        min-height: 44px;
        padding: 0.875rem 0.5rem;
      }
      .module-icon-wrap {
        width: 40px;
        height: 40px;
      }

      /* ── Section rows — ensure comfortable tap area ── */
      .section-row {
        min-height: 44px;
        padding: 0.5rem 0.75rem;
      }

      /* ── Modal — slide-up sheet on mobile ── */
      .modal-overlay {
        align-items: flex-end;
        padding: 0;
      }
      .modal-container {
        width: 100%;
        max-width: 100%;
        margin: 0;
        max-height: 92vh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      /* ── Modal footer — full-width stacked buttons ── */
      .modal-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
      }
      .modal-footer .btn-secondary,
      .modal-footer .btn-begin {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }

      /* ── Header action buttons (passed via ng-content) ── */
      /* These live inside app-header but share global btn classes */
      .btn-primary,
      .btn-secondary {
        min-height: 44px;
      }
    }
  `]
})
export class MesLandingComponent {
  selectedModule = signal<string | null>(null);
  completionPct = signal<number>(0);

  mesConfig = inject(MesConfigService);

  readonly sectionCount = MES_STANDARD_SECTIONS.length;
  readonly moduleCount = MES_MODULES.length;

  // Section icon map (id → icon registry name)
  private sectionIconMap: Record<string, string> = {
    company: 'building',
    production: 'factory',
    products: 'package',
    qc: 'microscope',
    team: 'users',
    inventory: 'warehouse',
    downtime: 'trending-down',
    integration: 'link',
    audits: 'clipboard',
    summary: 'flag',
  };

  // Module icon map (id → icon registry name)
  private moduleIconMap: Record<string, string> = {
    m_coffee: 'coffee',
    m_food: 'utensils',
    m_pharma: 'pill',
    m_plastics: 'layers',
    m_metal: 'wrench',
    m_elec: 'cpu',
    m_chem: 'flask',
  };

  // Build section rows for template
  sectionRows = MES_STANDARD_SECTIONS.map(s => ({
    id: s.id,
    title: s.title,
    iconName: this.sectionIconMap[s.id] ?? 'file-text',
  }));

  // Module descriptions
  private moduleDescriptions: Record<string, string> = {
    m_coffee: 'Comprehensive roasting operation assessment covering roaster equipment, in-roast and post-roast quality control parameters, cupping protocols (SCA or custom), green coffee storage and handling, and integration with roasting software like Cropster or Artisan.',
    m_food: 'Food safety and compliance assessment covering HACCP plan status, allergen management programs, FDA registration, nutrition and ingredient labeling requirements, cold chain management, and sanitation program (SSOP) evaluation.',
    m_pharma: 'Pharmaceutical manufacturing assessment covering cGMP compliance status, 21 CFR Part 11 electronic records requirements, batch record systems, CAPA and deviation management, validation protocols (IQ/OQ/PQ), and cleanroom classifications.',
    m_plastics: 'Plastics manufacturing assessment covering process types (injection, blow, extrusion), mold tracking and preventive maintenance, resin management and regrind ratios, and critical process parameter monitoring.',
    m_metal: 'Metal fabrication assessment covering CNC and manual processes, tooling life and offset management, dimensional inspection methods (CMM, calipers), and material certification requirements including DFARS/ITAR compliance.',
    m_elec: 'Electronics assembly assessment covering SMT and through-hole processes, moisture-sensitive device handling, test coverage (AOI, X-ray, ICT, functional), and regulatory compliance (RoHS, REACH, UL, CE, FCC).',
    m_chem: 'Chemical processing assessment covering batch reactor and continuous operations, formula and concentration management, safety compliance (SDS, EPA, OSHA PSM), and hazardous material storage requirements.',
  };

  private moduleShortDescs: Record<string, string> = {
    m_coffee: 'Roasting, cupping, green coffee',
    m_food: 'HACCP, allergens, FDA',
    m_pharma: 'cGMP, CFR 11',
    m_plastics: 'Molds, resin',
    m_metal: 'CNC, tooling',
    m_elec: 'SMT, RoHS',
    m_chem: 'Formulas, SDS',
  };

  // Build module list
  moduleList = MES_MODULES.map(mod => ({
    id: mod.id,
    name: mod.name,
    iconName: this.moduleIconMap[mod.id] ?? 'briefcase',
    shortDesc: this.moduleShortDescs[mod.id] ?? mod.desc,
    fields: mod.fields,
  }));

  constructor(private router: Router) {}

  selectedModuleDetail = () => {
    const id = this.selectedModule();
    if (!id) return null;

    const mod = MES_MODULES.find(m => m.id === id);
    if (!mod) return null;

    return {
      id: mod.id,
      name: mod.name,
      iconName: this.moduleIconMap[mod.id] ?? 'briefcase',
      description: this.moduleDescriptions[mod.id] ?? mod.desc,
      fields: mod.fields,
      auditTypes: MES_AUDIT_MAP[mod.id] ?? [],
    } as ModuleDetail;
  };

  openModuleModal(moduleId: string) {
    this.selectedModule.set(moduleId);
  }

  closeModal() {
    this.selectedModule.set(null);
  }

  startInterview() {
    this.router.navigate(['/intake/mes/interview']);
  }

  startInterviewWithModule(moduleId: string) {
    this.router.navigate(['/intake/mes/interview'], {
      queryParams: { module: moduleId },
    });
  }

  openAdmin() {
    this.router.navigate(['/intake/mes/admin']);
  }
}
