import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MESSection, MESField, MESModule } from '../../../core/models';
import { MES_STANDARD_SECTIONS, MES_MODULES } from '../../../core/constants/seed.data';
import { AuthService } from '../../../core/services/auth.service';
import { MesConfigService } from '../../../core/services/mes-config.service';
import { IconComponent } from '../../../shared/icons';
import { ComingSoonComponent } from '../../../shared/components/coming-soon/coming-soon.component';

type AdminTab = 'builder' | 'modules' | 'export' | 'history';

interface ConfigVersion {
  id: string;
  timestamp: string;
  user: string;
  description: string;
  sections: (MESSection & { enabled: boolean })[];
  modules: MESModule[];
  exportConfig: typeof MesAdminComponent.prototype.exportConfig;
}

const FIELD_TYPE_META: Record<string, { label: string; color: string; group: string }> = {
  text:       { label: 'Text',        color: 'gray',    group: 'Inputs' },
  textarea:   { label: 'Textarea',    color: 'gray',    group: 'Inputs' },
  number:     { label: 'Number',      color: 'blue',    group: 'Inputs' },
  date:       { label: 'Date',        color: 'teal',    group: 'Inputs' },
  email:      { label: 'Email',       color: 'purple',  group: 'Inputs' },
  phone:      { label: 'Phone',       color: 'purple',  group: 'Inputs' },
  url:        { label: 'URL / Link',  color: 'indigo',  group: 'Inputs' },
  select:     { label: 'Select',      color: 'amber',   group: 'Choice' },
  multi:      { label: 'Multi-Select',color: 'amber',   group: 'Choice' },
  radio:      { label: 'Radio Group', color: 'orange',  group: 'Choice' },
  tags:       { label: 'Tags',        color: 'pink',    group: 'Choice' },
  checkbox:   { label: 'Checkbox',    color: 'green',   group: 'Boolean' },
  toggle:     { label: 'Toggle',      color: 'green',   group: 'Boolean' },
  file:       { label: 'File Upload', color: 'red',     group: 'Special' },
  audit_blocks: { label: 'Audit Blocks', color: 'teal', group: 'Special' },
};

@Component({
  selector: 'app-mes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ComingSoonComponent],
  template: `
    <div class="admin-layout">
      <!-- Header -->
      <header class="admin-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1>MES Intake Admin</h1>
            <span>Configure sections, fields, and export settings</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="resetDefaults()">Reset to Defaults</button>
          <button class="btn-primary" (click)="saveConfig()">Save Configuration</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="admin-tabs">
        <button class="admin-tab" [class.active]="activeTab() === 'builder'" (click)="activeTab.set('builder')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
          </svg>
          Form Builder
        </button>
        <button class="admin-tab" [class.active]="activeTab() === 'modules'" (click)="activeTab.set('modules')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
          </svg>
          Industry Modules
        </button>
        <button class="admin-tab" [class.active]="activeTab() === 'export'" (click)="activeTab.set('export')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Export Settings
        </button>
        <button class="admin-tab" [class.active]="activeTab() === 'history'" (click)="activeTab.set('history')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
          </svg>
          Version History
        </button>
        <div class="tab-spacer"></div>
        <button class="btn-preview-toggle" [class.active]="showPreview()" (click)="togglePreview()">
          @if (showPreview()) {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
            Builder Only
          } @else {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Preview Form
          }
        </button>
      </div>

      <!-- Content -->
      <div class="admin-content" [class.has-preview]="showPreview()">
        <div class="content-left">
        @switch (activeTab()) {

          <!-- ═══════════════════════════════ FORM BUILDER ═══════════════════════════════ -->
          @case ('builder') {
            <div class="builder-layout">
              <div class="builder-header">
                <div>
                  <h2>Form Builder</h2>
                  <p>Drag sections to reorder · Click to expand · Add and configure fields inline</p>
                </div>
                <div class="builder-header-right">
                  <div class="timing-total-chip">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    ~{{ mesConfig.totalMinutes() }} min total
                  </div>
                  <button class="btn-secondary btn-sm" (click)="showAddSectionModal.set(true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14"/><path d="M12 5v14"/>
                    </svg>
                    Add Section
                  </button>
                </div>
              </div>

              <div class="sections-builder"
                   (dragover)="$event.preventDefault()"
                   (drop)="onListDrop($event)">
                @for (section of sections(); track section.id; let i = $index) {
                  <div
                    class="section-card"
                    [class.disabled]="!section.enabled"
                    [class.drag-over]="dragOverIndex() === i && dragSectionIndex() !== i"
                    [class.dragging]="dragSectionIndex() === i"
                    [class.expanded]="isSectionExpanded(section.id)"
                    draggable="true"
                    (dragstart)="onSectionDragStart($event, i)"
                    (dragover)="onSectionDragOver($event, i)"
                    (dragleave)="onSectionDragLeave($event)"
                    (drop)="onSectionDrop($event, i)"
                    (dragend)="onSectionDragEnd()"
                  >
                    <!-- Section Header Row -->
                    <div class="section-card-header" (click)="toggleExpand(section.id)">
                      <div class="drag-handle" (click)="$event.stopPropagation()" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
                          <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                          <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
                        </svg>
                      </div>

                      <span class="section-num">{{ i + 1 }}</span>

                      <span class="section-icon-wrap"><app-icon [name]="section.icon || 'clipboard'" [size]="16"></app-icon></span>

                      <div class="section-meta">
                        <span class="section-title-text">{{ section.title }}</span>
                        <span class="section-desc-text">{{ section.desc }}</span>
                      </div>

                      <div class="section-badges">
                        <span class="field-pill">{{ section.fields.length }} fields</span>
                        <div class="timing-control" (click)="$event.stopPropagation()">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <input
                            type="number"
                            class="timing-input"
                            [value]="mesConfig.getTimingForSection(section.id)"
                            (change)="mesConfig.updateTiming(section.id, +$any($event.target).value)"
                            min="1" max="60"
                          >
                          <span class="timing-unit">min</span>
                        </div>
                      </div>

                      <label class="toggle" (click)="$event.stopPropagation()">
                        <input type="checkbox" [(ngModel)]="section.enabled">
                        <span class="toggle-slider"></span>
                      </label>

                      <button class="btn-icon-sm" (click)="$event.stopPropagation(); openEditSectionMeta(section)" title="Edit section info">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                        </svg>
                      </button>

                      <button class="btn-icon-sm danger" (click)="$event.stopPropagation(); deleteSection(section)" title="Delete section">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>

                      <div class="expand-chevron" [class.open]="isSectionExpanded(section.id)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                    </div>

                    <!-- Expanded Fields Panel -->
                    @if (isSectionExpanded(section.id)) {
                      <div class="section-fields-panel"
                           (dragover)="$event.preventDefault()"
                           (drop)="$event.stopPropagation()">

                        @if (section.fields.length === 0) {
                          <div class="fields-empty">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                            </svg>
                            <p>No fields yet</p>
                            <span>Add your first field below</span>
                          </div>
                        }

                        @for (field of section.fields; track field.id; let fi = $index) {
                          <div
                            class="field-item"
                            [class.field-hidden]="field.visible === false"
                            [class.field-drag-over]="dragOverFieldKey() === (section.id + ':' + fi) && dragFieldKey() !== (section.id + ':' + fi)"
                            [class.field-dragging]="dragFieldKey() === (section.id + ':' + fi)"
                            draggable="true"
                            (dragstart)="onFieldDragStart($event, section.id, fi)"
                            (dragover)="onFieldDragOver($event, section.id, fi)"
                            (dragleave)="onFieldDragLeave()"
                            (drop)="onFieldDrop($event, section.id, fi)"
                            (dragend)="onFieldDragEnd()"
                          >
                            <div class="field-drag-grip" title="Drag to reorder">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
                                <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                                <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
                              </svg>
                            </div>
                            <span class="field-num">{{ fi + 1 }}</span>
                            <div class="field-item-info">
                              <span class="field-item-label">{{ field.label }}</span>
                              @if (field.hint) {
                                <span class="field-item-hint">{{ field.hint }}</span>
                              }
                            </div>
                            @if (field.visible === false) {
                              <span class="hidden-badge">Hidden</span>
                            }
                            <span class="type-badge type-{{ getTypeMeta(field.type).color }}">
                              {{ getTypeMeta(field.type).label }}
                            </span>
                            @if (field.required) {
                              <span class="req-badge">Required</span>
                            }
                            <!-- Visibility toggle -->
                            <button
                              class="btn-icon-sm visibility-btn"
                              [class.is-hidden]="field.visible === false"
                              (click)="toggleFieldVisibility(section.id, fi)"
                              [title]="field.visible === false ? 'Hidden from live form — click to show' : 'Visible in live form — click to hide'"
                            >
                              @if (field.visible === false) {
                                <!-- eye-off -->
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                                  <line x1="2" x2="22" y1="2" y2="22"/>
                                </svg>
                              } @else {
                                <!-- eye -->
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              }
                            </button>
                            <button class="btn-icon-sm" (click)="openEditFieldModal(field, section.id)" title="Edit field">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                              </svg>
                            </button>
                            <button class="btn-icon-sm danger" (click)="deleteFieldInSection(section.id, fi)" title="Delete field">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        }

                        <button class="btn-add-field" (click)="addFieldToSection(section.id)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"/><path d="M12 5v14"/>
                          </svg>
                          Add Field
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Add section dashed button -->
              <button class="add-section-btn" (click)="showAddSectionModal.set(true)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                Add New Section
              </button>
            </div>
          }

          <!-- ═══════════════════════════════ MODULES ═══════════════════════════════ -->
          @case ('modules') {
            <div class="panel">
              <div class="panel-header">
                <h2>Industry Modules</h2>
                <p>Enable or customize industry-specific question modules.</p>
              </div>
              <div class="modules-grid">
                @for (mod of modules(); track mod.id) {
                  <div class="module-card" [class.active]="mod.active">
                    <div class="module-card-header">
                      <span class="module-icon"><app-icon [name]="moduleIconMap[mod.id] ?? 'briefcase'" [size]="28"></app-icon></span>
                      <label class="toggle">
                        <input type="checkbox" [(ngModel)]="mod.active">
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                    <h3>{{ mod.name }}</h3>
                    <p>{{ mod.desc }}</p>
                    <span class="module-field-count">{{ mod.fields.length }} fields</span>
                    @if (mod.builtIn) {
                      <span class="badge badge-blue">Built-in</span>
                    }
                    <button class="btn-text btn-sm" (click)="editModule(mod)">Edit Fields</button>
                  </div>
                }
              </div>
              <button class="btn-secondary" (click)="addModule()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                Create Custom Module
              </button>
            </div>
          }

          <!-- ═══════════════════════════════ EXPORT ═══════════════════════════════ -->
          @case ('export') {
            <div class="panel">
              <div class="panel-header">
                <h2>Export Settings</h2>
                <p>Configure Google Sheets integration and export options.</p>
              </div>
              <div class="export-settings">
                <div class="setting-card">
                  <div class="setting-header">
                    <span class="setting-icon"><app-icon name="bar-chart" [size]="24"></app-icon></span>
                    <div>
                      <h3>Google Sheets</h3>
                      <p>Auto-export interview data to a spreadsheet</p>
                    </div>
                    <label class="toggle">
                      <input type="checkbox" [(ngModel)]="exportConfig.sheetsEnabled">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  @if (exportConfig.sheetsEnabled) {
                    <div class="setting-body">
                      <div class="form-group">
                        <label class="form-label">Spreadsheet ID</label>
                        <input type="text" class="form-input" [(ngModel)]="exportConfig.spreadsheetId"
                               placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms">
                        <span class="form-hint">Found in your Google Sheet URL after /d/</span>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Tab Name</label>
                        <input type="text" class="form-input" [(ngModel)]="exportConfig.tabName" placeholder="e.g., MES Intakes">
                      </div>
                      <div class="form-group">
                        <label class="form-label">OAuth Token</label>
                        <input type="password" class="form-input" [(ngModel)]="exportConfig.token" placeholder="Your Google API token">
                        <span class="form-hint">Required for authentication</span>
                      </div>
                      <button class="btn-secondary btn-sm" (click)="testSheetsConnection()">Test Connection</button>
                    </div>
                  }
                </div>
                <div class="setting-card">
                  <div class="setting-header">
                    <span class="setting-icon"><app-icon name="save" [size]="24"></app-icon></span>
                    <div><h3>Auto-Save</h3><p>Automatically save progress to local storage</p></div>
                    <label class="toggle">
                      <input type="checkbox" [(ngModel)]="exportConfig.autoSave">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                <div class="setting-card">
                  <div class="setting-header">
                    <span class="setting-icon"><app-icon name="mail" [size]="24"></app-icon></span>
                    <div><h3>Email Summary</h3><p>Send completed interviews via email</p></div>
                    <label class="toggle">
                      <input type="checkbox" [(ngModel)]="exportConfig.emailEnabled">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  @if (exportConfig.emailEnabled) {
                    <div class="setting-body">
                      <div class="form-group">
                        <label class="form-label">Default Recipients</label>
                        <input type="text" class="form-input" [(ngModel)]="exportConfig.emailRecipients"
                               placeholder="email1@example.com, email2@example.com">
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- ═══════════════════════════════ HISTORY ═══════════════════════════════ -->
          @case ('history') {
            <div class="panel">
              <div class="panel-header">
                <h2>Version History</h2>
                <p>Track changes and revert to previous configurations.</p>
              </div>
              <div class="history-list">
                @if (versionHistory().length === 0) {
                  <div class="empty-history">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
                    </svg>
                    <p>No version history yet</p>
                    <span>Save your configuration to create the first version.</span>
                  </div>
                } @else {
                  @for (version of versionHistory(); track version.id; let i = $index) {
                    <div class="history-item" [class.current]="i === 0">
                      <div class="history-icon">
                        @if (i === 0) {
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        } @else {
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                        }
                      </div>
                      <div class="history-info">
                        <span class="history-desc">{{ version.description }}</span>
                        <span class="history-meta">
                          <span class="history-user">{{ version.user }}</span>
                          <span class="history-time">{{ formatVersionDate(version.timestamp) }}</span>
                        </span>
                      </div>
                      @if (i === 0) {
                        <span class="badge badge-green">Current</span>
                      } @else {
                        <div class="history-actions">
                          <button class="btn-secondary btn-sm" (click)="viewVersion(version)">View</button>
                          <button class="btn-primary btn-sm" (click)="revertToVersion(version)">Revert</button>
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            </div>
          }
        }
        </div><!-- /content-left -->

        <!-- ═══════════════════════════════ PREVIEW PANE ═══════════════════════════════ -->
        @if (showPreview()) {
          <div class="preview-pane">

            <!-- Interview-style header (visual replica, non-functional) -->
            <div class="pv-header">
              <div class="pv-header-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.75);flex-shrink:0">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <div>
                  <div class="pv-header-title">MES Interview</div>
                  <div class="pv-header-sub">Live Preview</div>
                </div>
              </div>
              <div class="pv-header-progress">
                <span class="pv-progress-text">0 / {{ previewSections().length }} sections</span>
                <div class="pv-progress-bar-mini"><div class="pv-progress-fill-mini" style="width:0%"></div></div>
              </div>
              <div class="pv-header-right">
                @if (previewSections().length > 0) {
                  <div class="pv-timer-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ~{{ mesConfig.getTimingForSection(previewSections()[previewSafeIndex()].id) }} min
                  </div>
                }
                <span class="pv-hdr-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  Tips
                </span>
                <span class="pv-hdr-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  Record
                </span>
                <button class="pv-hdr-close" (click)="showPreview.set(false)" title="Close preview">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            @if (previewSections().length === 0) {
              <div class="pv-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
                <p>No visible sections</p>
                <span>Enable at least one section to preview.</span>
              </div>
            } @else {
              <div class="pv-body">

                <!-- Sidebar (mirrors .mes-sidebar) -->
                <aside class="pv-sidebar">
                  <div class="pv-sidebar-hdr">
                    <h2>Interview Sections</h2>
                  </div>
                  <div class="pv-section-list">
                    @for (sec of previewSections(); track sec.id; let i = $index) {
                      <button
                        class="pv-section-btn"
                        [class.active]="previewSafeIndex() === i"
                        (click)="previewGoToSection(i)"
                      >
                        <span class="pv-sec-icon"><app-icon [name]="sec.icon || 'clipboard'" [size]="14"></app-icon></span>
                        <span class="pv-sec-title">{{ sec.title }}</span>
                      </button>
                    }
                  </div>
                  <div class="pv-sidebar-footer">
                    <span>0 / {{ previewSections().length }} sections</span>
                    <div class="pv-progress-bar">
                      <div class="pv-progress-fill" style="width:0%"></div>
                    </div>
                  </div>
                </aside>

                <!-- Main content (mirrors .mes-main) -->
                <main class="pv-main">
                  <div class="pv-main-header">
                    <div class="pv-section-info">
                      <span class="pv-section-badge">
                        <span>{{ previewSections()[previewSafeIndex()].icon }}</span>
                        {{ previewSections()[previewSafeIndex()].title }}
                      </span>
                      @if (previewSections()[previewSafeIndex()].desc) {
                        <p>{{ previewSections()[previewSafeIndex()].desc }}</p>
                      }
                    </div>
                    <span class="pv-mic-btn" title="Voice input (preview only)">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                      </svg>
                    </span>
                  </div>

                  <div class="pv-fields-container">
                    @if (previewSections()[previewSafeIndex()].fields.length === 0) {
                      <div class="pv-no-fields">No visible fields in this section.</div>
                    }
                    @for (field of previewSections()[previewSafeIndex()].fields; track field.id) {
                      <div class="pv-field-group">
                        <label class="pv-field-label">
                          {{ field.label }}
                          @if (field.required) { <span class="pv-req">*</span> }
                        </label>
                        @if (field.hint) {
                          <p class="pv-field-hint">{{ field.hint }}</p>
                        }
                        @switch (field.type) {
                          @case ('textarea') {
                            <textarea class="pv-form-input" rows="3" [placeholder]="field.placeholder || ''" readonly tabindex="-1"></textarea>
                          }
                          @case ('number') {
                            <input type="text" class="pv-form-input" [placeholder]="field.placeholder || '0'" readonly tabindex="-1">
                          }
                          @case ('date') {
                            <input type="text" class="pv-form-input" placeholder="mm/dd/yyyy" readonly tabindex="-1">
                          }
                          @case ('email') {
                            <input type="text" class="pv-form-input" [placeholder]="field.placeholder || 'email@example.com'" readonly tabindex="-1">
                          }
                          @case ('phone') {
                            <input type="text" class="pv-form-input" [placeholder]="field.placeholder || '(555) 000-0000'" readonly tabindex="-1">
                          }
                          @case ('select') {
                            <select class="pv-form-input" disabled tabindex="-1">
                              <option>{{ field.placeholder || 'Select...' }}</option>
                              @for (opt of field.options; track opt) { <option>{{ opt }}</option> }
                            </select>
                          }
                          @case ('multi') {
                            <div class="pv-multi-select">
                              @if (field.options?.length) {
                                @for (opt of field.options; track opt) {
                                  <span class="pv-chip-option">{{ opt }}</span>
                                }
                              } @else {
                                <span class="pv-chip-muted">No options configured</span>
                              }
                            </div>
                          }
                          @case ('radio') {
                            <div class="pv-multi-select">
                              @if (field.options?.length) {
                                @for (opt of field.options; track opt) {
                                  <span class="pv-chip-option">{{ opt }}</span>
                                }
                              } @else {
                                <span class="pv-chip-muted">No options configured</span>
                              }
                            </div>
                          }
                          @case ('checkbox') {
                            <label class="pv-chip-option">
                              <input type="checkbox" disabled tabindex="-1">
                              <span>{{ field.placeholder || field.label }}</span>
                            </label>
                          }
                          @case ('toggle') {
                            <div class="pv-toggle-row">
                              <span class="pv-toggle-track"></span>
                              <span class="pv-toggle-label">{{ field.placeholder || 'Off' }}</span>
                            </div>
                          }
                          @case ('file') {
                            <div class="pv-file-drop">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
                              </svg>
                              <span>{{ field.placeholder || 'Click to upload or drag file here' }}</span>
                            </div>
                          }
                          @case ('tags') {
                            <input type="text" class="pv-form-input" [placeholder]="field.placeholder || 'Add tags...'" readonly tabindex="-1">
                          }
                          @case ('module_select') {
                            <div class="pv-module-grid">
                              @for (mod of mesConfig.configuredModules(); track mod.id) {
                                <div class="pv-module-card">
                                  <span class="pv-mod-icon-wrap"><app-icon [name]="moduleIconMap[mod.id] ?? mod.icon ?? 'briefcase'" [size]="24"></app-icon></span>
                                  <span class="pv-mod-name">{{ mod.name }}</span>
                                  <span class="pv-mod-desc">{{ mod.desc }}</span>
                                </div>
                              }
                            </div>
                          }
                          @case ('audit_blocks') {
                            <div class="pv-audit-shell">
                              <div class="pv-audit-block">
                                <div class="pv-audit-block-hdr">
                                  <span class="pv-audit-num">Audit 1</span>
                                </div>
                                <div class="pv-audit-block-body">
                                  <div class="pv-audit-row">
                                    <div class="pv-audit-field">
                                      <label>AUDIT TYPE</label>
                                      <input class="pv-form-input" placeholder="e.g., SQF, BRC, Internal" readonly tabindex="-1">
                                    </div>
                                    <div class="pv-audit-field">
                                      <label>FREQUENCY</label>
                                      <input class="pv-form-input" placeholder="Annually..." readonly tabindex="-1">
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span class="pv-add-audit-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                                Add Audit
                              </span>
                            </div>
                          }
                          @case ('audit_dynamic') {
                            <div class="pv-multi-select">
                              <span class="pv-chip-option">SQF</span>
                              <span class="pv-chip-option">BRC</span>
                              <span class="pv-chip-option">Internal</span>
                              <span class="pv-chip-muted">+More based on module</span>
                            </div>
                          }
                          @default {
                            <input type="text" class="pv-form-input" [placeholder]="field.placeholder || ''" readonly tabindex="-1">
                          }
                        }
                      </div>
                    }
                  </div>

                  <!-- Nav footer (mirrors .nav-footer) -->
                  <div class="pv-nav-footer">
                    <button class="btn-secondary btn-sm" [disabled]="previewSafeIndex() === 0" (click)="previewPrevSection()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                      Previous
                    </button>
                    <span class="pv-section-counter">{{ previewSafeIndex() + 1 }} / {{ previewSections().length }}</span>
                    @if (previewSafeIndex() < previewSections().length - 1) {
                      <button class="btn-primary btn-sm" (click)="previewNextSection()">
                        Next
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    } @else {
                      <button class="btn-primary btn-sm pv-complete-btn">
                        Complete
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    }
                  </div>
                </main>

              </div>
            }

          </div>
        }<!-- /preview-pane -->

      </div><!-- /admin-content -->
    </div><!-- /admin-layout -->

    <!-- ═══════════════════════════════ ADD SECTION MODAL ═══════════════════════════════ -->
    @if (showAddSectionModal()) {
      <div class="modal-overlay" (click)="showAddSectionModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add New Section</h2>
            <button class="modal-close-btn" (click)="showAddSectionModal.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Section Title <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="newSection.title" placeholder="e.g., Quality Assurance">
            </div>
            <div class="form-group">
              <label class="form-label">Icon</label>
              <div class="icon-picker">
                @for (name of sectionIconOptions; track name) {
                  <button type="button" class="icon-pick-btn" [class.selected]="newSection.icon === name" (click)="newSection.icon = name" [title]="name">
                    <app-icon [name]="name" [size]="16"></app-icon>
                  </button>
                }
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="newSection.desc" placeholder="Brief description of this section">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showAddSectionModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="addSection()" [disabled]="!newSection.title">Create Section</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════ EDIT SECTION META MODAL ═══════════════════════════════ -->
    @if (editingSectionMeta()) {
      <div class="modal-overlay" (click)="closeEditSectionMeta()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Edit Section</h2>
            <button class="modal-close-btn" (click)="closeEditSectionMeta()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Section Title</label>
              <input type="text" class="form-input" [(ngModel)]="editingSectionMeta()!.title">
            </div>
            <div class="form-group">
              <label class="form-label">Icon</label>
              <div class="icon-picker">
                @for (name of sectionIconOptions; track name) {
                  <button type="button" class="icon-pick-btn" [class.selected]="editingSectionMeta()!.icon === name" (click)="editingSectionMeta()!.icon = name" [title]="name">
                    <app-icon [name]="name" [size]="16"></app-icon>
                  </button>
                }
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="editingSectionMeta()!.desc">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeEditSectionMeta()">Cancel</button>
            <button class="btn-primary" (click)="saveSectionMeta()">Save</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════ FIELD EDITOR MODAL ═══════════════════════════════ -->
    @if (editingField()) {
      <div class="modal-overlay" (click)="closeFieldModal()">
        <div class="modal-container modal-field" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isNewField ? 'Add Field' : 'Edit Field' }}</h2>
            <button class="modal-close-btn" (click)="closeFieldModal()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body modal-body-scroll">

            <!-- Label + Required -->
            <div class="form-row">
              <div class="form-group" style="flex: 1">
                <label class="form-label">Label <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="editingField()!.label" placeholder="e.g., Company Name">
              </div>
              <div class="form-group form-group-toggle">
                <label class="form-label">Required</label>
                <label class="toggle">
                  <input type="checkbox" [(ngModel)]="editingField()!.required">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- Field Type -->
            <div class="form-group">
              <label class="form-label">Field Type</label>
              <div class="type-grid">
                @for (group of typeGroups; track group.name) {
                  <div class="type-group">
                    <span class="type-group-label">{{ group.name }}</span>
                    <div class="type-options">
                      @for (t of group.types; track t.value) {
                        <button
                          type="button"
                          class="type-option"
                          [class.selected]="editingField()!.type === t.value"
                          (click)="setFieldType(t.value)"
                        >
                          <span class="type-option-icon" [innerHTML]="t.icon"></span>
                          <span>{{ t.label }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Placeholder -->
            <div class="form-group">
              <label class="form-label">Placeholder Text</label>
              <input type="text" class="form-input" [(ngModel)]="editingField()!.placeholder"
                     placeholder="e.g., Enter a value...">
              <span class="form-hint">Shown inside the input when empty</span>
            </div>

            <!-- Helper Text -->
            <div class="form-group">
              <label class="form-label">Helper Text</label>
              <input type="text" class="form-input" [(ngModel)]="editingField()!.hint"
                     placeholder="e.g., Explain what this field means...">
              <span class="form-hint">Shown below the field label as a guide</span>
            </div>

            <!-- Default Value (text types only) -->
            @if (isSimpleInputType(editingField()!.type)) {
              <div class="form-group">
                <label class="form-label">Default Value</label>
                <input type="text" class="form-input" [(ngModel)]="editingField()!.defaultValue"
                       placeholder="Pre-fill with this value">
              </div>
            }

            <!-- Options (select, multi, radio) -->
            @if (hasOptions(editingField()!.type)) {
              <div class="form-group">
                <div class="options-header">
                  <label class="form-label">Options</label>
                  <button class="btn-text btn-sm" (click)="addOption()">+ Add Option</button>
                </div>
                <div class="options-list">
                  @for (opt of editingFieldOptions; let oi = $index; track oi) {
                    <div class="option-row">
                      <svg class="option-grip" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
                        <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                      </svg>
                      <input type="text" class="form-input form-input-sm" [(ngModel)]="editingFieldOptions[oi]"
                             placeholder="Option {{ oi + 1 }}">
                      <button class="btn-icon-sm danger" (click)="removeOption(oi)" [disabled]="editingFieldOptions.length <= 1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
                <div class="form-group-row" style="margin-top: 10px">
                  <label class="toggle-inline">
                    <label class="toggle toggle-sm">
                      <input type="checkbox" [(ngModel)]="editingField()!.allowCustom">
                      <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">Allow custom "Other" entry</span>
                  </label>
                </div>
              </div>
            }

            <!-- Number validation -->
            @if (editingField()!.type === 'number') {
              <div class="form-row">
                <div class="form-group" style="flex: 1">
                  <label class="form-label">Min Value</label>
                  <input type="number" class="form-input" [ngModel]="editingField()!.validation?.min"
                         (ngModelChange)="setValidationMin($event)" placeholder="No minimum">
                </div>
                <div class="form-group" style="flex: 1">
                  <label class="form-label">Max Value</label>
                  <input type="number" class="form-input" [ngModel]="editingField()!.validation?.max"
                         (ngModelChange)="setValidationMax($event)" placeholder="No maximum">
                </div>
              </div>
            }

          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeFieldModal()">Cancel</button>
            <button class="btn-primary" (click)="saveField()" [disabled]="!editingField()!.label">
              {{ isNewField ? 'Add Field' : 'Save Field' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════ MODULE EDIT MODAL ═══════════════════════════════ -->
    @if (editingModule()) {
      <div class="modal-overlay" (click)="closeModuleModal()">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>
              <span class="module-edit-icon">{{ editingModule()!.icon }}</span>
              Edit Module: {{ editingModule()!.name }}
            </h2>
            <button class="modal-close-btn" (click)="closeModuleModal()"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body modal-body-scroll">
            <div class="form-row">
              <div class="form-group" style="flex: 1">
                <label class="form-label">Module Name</label>
                <input type="text" class="form-input" [(ngModel)]="editingModule()!.name">
              </div>
              <div class="form-group">
                <label class="form-label">Icon</label>
                <input type="text" class="form-input icon-input" [(ngModel)]="editingModule()!.icon" maxlength="2">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="editingModule()!.desc">
            </div>
            <div class="module-fields-section">
              <div class="section-header-row">
                <h3>Module Fields</h3>
                <button class="btn-secondary btn-sm" (click)="addModuleField()">+ Add Field</button>
              </div>
              <div class="module-fields-list">
                @for (field of editingModule()!.fields; track field.id; let i = $index) {
                  <div class="module-field-row" [class.module-field-hidden]="field.visible === false">
                    <div class="reorder-buttons">
                      <button class="reorder-btn" [disabled]="i === 0" (click)="moveModuleField(i, -1)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                      </button>
                      <button class="reorder-btn" [disabled]="i === editingModule()!.fields.length - 1" (click)="moveModuleField(i, 1)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                    </div>
                    <div class="module-field-content" [class.module-field-content-hidden]="field.visible === false">
                      <input type="text" class="form-input form-input-sm" [(ngModel)]="field.label" placeholder="Field label">
                      <select class="form-select form-select-sm" [(ngModel)]="field.type">
                        @for (group of typeGroups; track group.name) {
                          <optgroup [label]="group.name">
                            @for (t of group.types; track t.value) {
                              <option [value]="t.value">{{ t.label }}</option>
                            }
                          </optgroup>
                        }
                      </select>
                      <label class="toggle toggle-sm">
                        <input type="checkbox" [(ngModel)]="field.required">
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">Req</span>
                    </div>
                    @if (field.visible === false) {
                      <span class="hidden-badge">Hidden</span>
                    }
                    <button
                      class="btn-icon-sm visibility-btn"
                      [class.is-hidden]="field.visible === false"
                      (click)="toggleModuleFieldVisibility(i)"
                      [title]="field.visible === false ? 'Hidden from live form — click to show' : 'Visible in live form — click to hide'"
                    >
                      @if (field.visible === false) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                          <line x1="2" x2="22" y1="2" y2="22"/>
                        </svg>
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      }
                    </button>
                    <button class="btn-icon-sm danger" (click)="deleteModuleField(i)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                } @empty {
                  <div class="no-fields">No fields yet. Add your first field above.</div>
                }
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModuleModal()">Cancel</button>
            <button class="btn-primary" (click)="saveModule()">Save Module</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════ VERSION VIEW MODAL ═══════════════════════════════ -->
    @if (viewingVersion()) {
      <div class="modal-overlay" (click)="viewingVersion.set(null)">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Version Details</h2>
            <button class="modal-close-btn" (click)="viewingVersion.set(null)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body modal-body-scroll">
            <div class="version-detail-header">
              <div class="version-meta-lg">
                <span class="version-user-lg">{{ viewingVersion()!.user }}</span>
                <span class="version-time-lg">{{ formatVersionDate(viewingVersion()!.timestamp) }}</span>
              </div>
              <p class="version-desc-lg">{{ viewingVersion()!.description }}</p>
            </div>
            <div class="summary-grid">
              <div class="summary-item"><span class="summary-label">Sections</span><span class="summary-value">{{ viewingVersion()!.sections.length }}</span></div>
              <div class="summary-item"><span class="summary-label">Enabled</span><span class="summary-value">{{ getEnabledSectionsCount(viewingVersion()!) }}</span></div>
              <div class="summary-item"><span class="summary-label">Modules</span><span class="summary-value">{{ viewingVersion()!.modules.length }}</span></div>
              <div class="summary-item"><span class="summary-label">Active Modules</span><span class="summary-value">{{ getActiveModulesCount(viewingVersion()!) }}</span></div>
            </div>
            <div class="version-items-list" style="margin-top: 1.5rem">
              @for (section of viewingVersion()!.sections; track section.id) {
                <div class="version-item" [class.disabled]="!section.enabled">
                  <span class="vi-icon"><app-icon [name]="section.icon || 'clipboard'" [size]="14"></app-icon></span>
                  <span class="vi-name">{{ section.title }}</span>
                  <span class="vi-count">{{ section.fields.length }} fields</span>
                  <span class="badge" [class]="section.enabled ? 'badge-green' : 'badge-gray'">
                    {{ section.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="viewingVersion.set(null)">Close</button>
            <button class="btn-primary" (click)="revertToVersion(viewingVersion()!); viewingVersion.set(null)">Revert to This Version</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════ SAVE MODAL ═══════════════════════════════ -->
    @if (showSaveModal()) {
      <div class="modal-overlay" (click)="showSaveModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Save Configuration</h2>
            <button class="modal-close-btn" (click)="showSaveModal.set(false)"><app-icon name="close" [size]="16"></app-icon></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Description of Changes</label>
              <textarea class="form-textarea" rows="3" [(ngModel)]="saveDescription"
                        placeholder="e.g., Added new fields to company section, enabled dairy module..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Your Name</label>
              <input type="text" class="form-input" [(ngModel)]="currentUser" placeholder="Enter your name">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showSaveModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="confirmSave()" [disabled]="!saveDescription || !currentUser">Save Version</button>
          </div>
        </div>
      </div>
    }

    <app-coming-soon
      [isOpen]="showComingSoon()"
      [feature]="comingSoonFeature"
      [description]="comingSoonDesc"
      (closed)="showComingSoon.set(false)"
    ></app-coming-soon>
  `,
  styles: [`
    :host { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

    .admin-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

    /* ── Header ── */
    .admin-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.5rem; background: var(--color-white);
      border-bottom: 1px solid var(--border-hairline);
    }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .header-left h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .header-left span { font-size: 0.8125rem; color: var(--color-gray-500); }
    .header-actions { display: flex; gap: 0.75rem; }
    .back-btn {
      width: 36px; height: 36px; border: none; background: var(--color-gray-100);
      border-radius: var(--radius); cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: var(--color-gray-600);
    }
    .back-btn:hover { background: var(--color-gray-200); }

    /* ── Tabs ── */
    .admin-tabs {
      display: flex; gap: 0.25rem; padding: 0 1.5rem;
      background: var(--color-white); border-bottom: 1px solid var(--border-hairline);
    }
    .admin-tab {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.875rem 1.25rem; border: none; background: transparent;
      font-size: 0.875rem; font-weight: 500; color: var(--color-gray-500); cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s ease;
    }
    .admin-tab:hover { color: var(--color-gray-700); }
    .admin-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

    /* ── Content ── */
    .admin-content { flex: 1; overflow-y: auto; padding: 1.5rem; background: var(--color-gray-50); min-height: 0; }
    .admin-content.has-preview {
      display: flex; flex-direction: row; gap: 0; padding: 0; overflow: hidden;
    }
    .content-left {
      flex: 1; overflow-y: auto; padding: 1.5rem; background: var(--color-gray-50);
      min-width: 0;
    }

    /* ── Tabs spacer + preview toggle ── */
    .tab-spacer { flex: 1; }
    .btn-preview-toggle {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; margin: auto 0; border-radius: var(--radius);
      border: 1px solid var(--color-gray-200); background: var(--color-white);
      font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-600);
      cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
    }
    .btn-preview-toggle:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .btn-preview-toggle.active {
      background: var(--color-primary); color: #fff; border-color: var(--color-primary);
    }

    /* ══ Preview Pane — outer container ══ */
    .preview-pane {
      width: 46%; min-width: 480px;
      border-left: 1px solid var(--color-gray-200);
      display: flex; flex-direction: column; overflow: hidden;
      background: var(--color-gray-50);
    }

    /* ── Preview: interview-style header ── */
    .pv-header {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 0.625rem 1rem;
      background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
      flex-shrink: 0;
    }
    .pv-header-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .pv-header-title { font-size: 0.875rem; font-weight: 700; color: #fff; line-height: 1.2; }
    .pv-header-sub { font-size: 0.6875rem; color: rgba(255,255,255,0.65); }
    .pv-header-progress { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .pv-progress-text { font-size: 0.75rem; color: rgba(255,255,255,0.85); font-weight: 500; white-space: nowrap; }
    .pv-progress-bar-mini { width: 72px; height: 5px; background: rgba(255,255,255,0.25); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
    .pv-progress-fill-mini { height: 100%; background: #fff; border-radius: 3px; }
    .pv-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .pv-timer-badge {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700;
      font-variant-numeric: tabular-nums; background: rgba(255,255,255,0.18);
      color: rgba(255,255,255,0.85); white-space: nowrap;
    }
    .pv-hdr-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 8px; border-radius: var(--radius-sm); font-size: 0.6875rem; font-weight: 500;
      color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.12);
      cursor: default; white-space: nowrap;
    }
    .pv-hdr-close {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: var(--radius-sm); border: none;
      background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85);
      cursor: pointer; flex-shrink: 0; transition: background 0.15s;
    }
    .pv-hdr-close:hover { background: rgba(255,255,255,0.28); }

    /* ── Preview: empty state ── */
    .pv-empty {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 2rem; text-align: center; color: var(--color-gray-400);
    }
    .pv-empty svg { margin-bottom: 0.75rem; opacity: 0.35; }
    .pv-empty p { margin: 0 0 4px; font-size: 0.9375rem; font-weight: 600; color: var(--color-gray-500); }
    .pv-empty span { font-size: 0.8125rem; }

    /* ── Preview: interview body (sidebar + main) ── */
    .pv-body { flex: 1; display: flex; overflow: hidden; }

    /* ── Preview: sidebar (mirrors .mes-sidebar) ── */
    .pv-sidebar {
      width: 185px; flex-shrink: 0;
      background: var(--color-white); border-right: 1px solid var(--border-hairline);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .pv-sidebar-hdr {
      padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-hairline);
    }
    .pv-sidebar-hdr h2 { margin: 0; font-size: 0.8125rem; font-weight: 600; color: var(--color-gray-700); }
    .pv-section-list { flex: 1; overflow-y: auto; padding: 0.375rem; }
    .pv-section-btn {
      width: 100%; display: flex; align-items: center; gap: 0.625rem;
      padding: 0.625rem 0.75rem; border: none; background: transparent;
      border-radius: var(--radius-md); cursor: pointer; text-align: left;
      transition: all 0.15s ease;
    }
    .pv-section-btn:hover { background: var(--color-gray-50); }
    .pv-section-btn.active {
      background: var(--color-primary-light); border: 1px solid var(--color-primary);
    }
    .pv-sec-icon { flex-shrink: 0; display: flex; align-items: center; color: var(--color-gray-400); }
    .pv-sec-title { flex: 1; font-size: 0.8125rem; font-weight: 500; color: var(--color-gray-700); line-height: 1.3; }
    .pv-section-btn.active .pv-sec-title { color: var(--color-primary); }
    .pv-sidebar-footer {
      padding: 0.75rem 1rem; border-top: 1px solid var(--border-hairline);
      font-size: 0.6875rem; color: var(--color-gray-500);
      display: flex; flex-direction: column; gap: 6px;
    }
    .pv-progress-bar { height: 4px; background: var(--color-gray-100); border-radius: 2px; overflow: hidden; }
    .pv-progress-fill { height: 100%; background: var(--color-primary); border-radius: 2px; }

    /* ── Preview: main content (mirrors .mes-main) ── */
    .pv-main {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
      background: var(--color-gray-50); min-width: 0;
    }
    .pv-main-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 1rem 1.25rem; background: var(--color-white);
      border-bottom: 1px solid var(--border-hairline); flex-shrink: 0;
    }
    .pv-section-info { display: flex; flex-direction: column; gap: 0.375rem; flex: 1; min-width: 0; }
    .pv-section-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.375rem 0.75rem; background: var(--status-blue-bg);
      color: var(--status-blue-text); border-radius: var(--radius-md);
      font-weight: 600; font-size: 0.875rem; width: fit-content;
    }
    .pv-section-info p { margin: 0; font-size: 0.8125rem; color: var(--color-gray-500); }
    .pv-mic-btn {
      width: 34px; height: 34px; border: 1px solid var(--color-border);
      background: var(--color-white); border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center;
      color: var(--color-gray-400); flex-shrink: 0; cursor: default;
    }
    .pv-fields-container {
      flex: 1; overflow-y: auto; padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .pv-no-fields {
      padding: 1.25rem; text-align: center; color: var(--color-gray-400);
      font-size: 0.8125rem; border: 1px dashed var(--color-gray-200); border-radius: var(--radius-md);
    }
    .pv-field-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .pv-field-label { font-size: 0.875rem; font-weight: 500; color: var(--color-gray-700); }
    .pv-req { color: var(--color-error); }
    .pv-field-hint {
      margin: 0; font-size: 0.75rem; color: var(--color-gray-500); line-height: 1.5;
      background: var(--color-gray-50); border-left: 2px solid #0D9488;
      padding: 3px 7px; border-radius: 0 4px 4px 0;
    }
    .pv-form-input {
      width: 100%; padding: 7px 10px; border: 1px solid var(--color-gray-200);
      border-radius: var(--radius); font-size: 0.875rem; background: var(--color-white);
      color: var(--color-gray-500); box-sizing: border-box;
      font-family: inherit; resize: none;
    }
    .pv-multi-select { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .pv-chip-option {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; background: var(--color-white);
      border: 1px solid var(--color-border); border-radius: var(--radius);
      font-size: 0.8125rem; color: var(--color-gray-600); cursor: default;
    }
    .pv-chip-muted { font-size: 0.75rem; color: var(--color-gray-400); padding: 5px 0; }
    .pv-toggle-row { display: flex; align-items: center; gap: 10px; }
    .pv-toggle-track {
      width: 36px; height: 20px; border-radius: var(--radius-md);
      background: var(--color-gray-200); flex-shrink: 0;
    }
    .pv-toggle-label { font-size: 0.8125rem; color: var(--color-gray-500); }
    .pv-file-drop {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; border: 1.5px dashed var(--color-gray-200); border-radius: var(--radius-md);
      padding: 1rem; text-align: center; font-size: 0.8125rem;
      color: var(--color-gray-400); background: var(--color-gray-50);
    }
    /* Module cards (matches .module-select / .module-card) */
    .pv-module-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;
    }
    .pv-module-card {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 1rem 0.75rem; background: var(--color-white);
      border: 2px solid var(--color-border); border-radius: var(--radius-lg);
      text-align: center; cursor: default;
    }
    .pv-mod-icon-wrap { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--color-gray-100); color: #0D9488; }
    .pv-mod-name { font-weight: 600; font-size: 0.8125rem; color: var(--color-gray-900); }
    .pv-mod-desc { font-size: 0.6875rem; color: var(--color-gray-500); }
    /* Audit blocks */
    .pv-audit-shell { display: flex; flex-direction: column; gap: 0.75rem; }
    .pv-audit-block {
      background: var(--color-white); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); overflow: hidden;
    }
    .pv-audit-block-hdr {
      padding: 0.4rem 0.75rem; background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
    }
    .pv-audit-num { font-size: 0.6875rem; font-weight: 600; color: #0D9488; text-transform: uppercase; letter-spacing: 0.05em; }
    .pv-audit-block-body { padding: 0.625rem; }
    .pv-audit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .pv-audit-field { display: flex; flex-direction: column; gap: 3px; }
    .pv-audit-field label { font-size: 0.625rem; font-weight: 600; color: var(--color-gray-500); text-transform: uppercase; letter-spacing: 0.04em; }
    .pv-add-audit-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px; border: 1px dashed var(--color-border); border-radius: var(--radius-md);
      color: #0D9488; font-size: 0.8125rem; font-weight: 500; cursor: default; width: fit-content;
    }

    /* ── Preview: nav footer (mirrors .nav-footer) ── */
    .pv-nav-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1.25rem; background: var(--color-white);
      border-top: 1px solid var(--border-hairline); flex-shrink: 0;
    }
    .pv-section-counter { font-size: 0.875rem; color: var(--color-gray-500); }
    .pv-complete-btn { background: var(--color-success) !important; pointer-events: none; }

    /* ── Builder Layout ── */
    .builder-layout { display: flex; flex-direction: column; gap: 0; max-width: 860px; margin: 0 auto; }
    .builder-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .builder-header h2 { margin: 0 0 0.25rem; font-size: 1.125rem; font-weight: 600; }
    .builder-header p { margin: 0; font-size: 0.8125rem; color: var(--color-gray-500); }
    .builder-header-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

    .timing-total-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px; background: #F0FDFA; border: 1px solid #99F6E4;
      border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; color: #0F766E;
    }

    /* ── Section Builder List ── */
    .sections-builder { display: flex; flex-direction: column; gap: 6px; }

    /* ── Section Card ── */
    .section-card {
      background: var(--color-white);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: box-shadow 0.15s, border-color 0.15s, opacity 0.15s;
    }
    .section-card:hover { border-color: var(--color-gray-300); box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
    .section-card.disabled { opacity: 0.55; }
    .section-card.drag-over {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(160, 33, 149, 0.15);
    }
    .section-card.dragging {
      opacity: 0.4;
      border-style: dashed;
    }
    .section-card.expanded { border-color: var(--color-primary); }

    /* ── Section Card Header ── */
    .section-card-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; cursor: pointer; user-select: none;
      transition: background 0.12s;
    }
    .section-card-header:hover { background: var(--color-gray-50); }

    .drag-handle {
      cursor: grab; color: var(--color-gray-300); flex-shrink: 0;
      display: flex; align-items: center; padding: 4px;
      border-radius: var(--radius-sm); transition: color 0.15s;
    }
    .drag-handle:hover { color: var(--color-gray-500); }
    .drag-handle:active { cursor: grabbing; }

    .section-num {
      width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
      background: var(--color-gray-100); border-radius: 50%;
      font-size: 0.6875rem; font-weight: 700; color: var(--color-gray-500); flex-shrink: 0;
    }
    .section-card.expanded .section-num { background: var(--color-primary); color: white; }

    .section-icon-wrap { flex-shrink: 0; display: flex; align-items: center; color: var(--color-gray-500); }
    .icon-picker { display: flex; flex-wrap: wrap; gap: 4px; }
    .icon-pick-btn {
      width: 32px; height: 32px; border: 1px solid var(--color-gray-200);
      border-radius: var(--radius); background: var(--color-white); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--color-gray-500); transition: all 0.12s; flex-shrink: 0;
    }
    .icon-pick-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .icon-pick-btn.selected { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

    .section-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .section-title-text { font-weight: 600; font-size: 0.9375rem; }
    .section-desc-text { font-size: 0.75rem; color: var(--color-gray-400); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .section-badges { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .field-pill {
      font-size: 0.6875rem; font-weight: 600; color: var(--color-gray-500);
      background: var(--color-gray-100); border-radius: var(--radius-full); padding: 2px 8px; white-space: nowrap;
    }

    .timing-control { display: flex; align-items: center; gap: 4px; color: #0D9488; }
    .timing-input {
      width: 40px; padding: 2px 4px; border: 1px solid var(--border-hairline);
      border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600; text-align: center;
      color: var(--color-gray-900); background: white; appearance: textfield;
    }
    .timing-input::-webkit-inner-spin-button,
    .timing-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .timing-input:focus { outline: none; border-color: #0D9488; box-shadow: 0 0 0 2px rgba(13,148,136,0.15); }
    .timing-unit { font-size: 0.6875rem; color: var(--color-gray-400); }

    .expand-chevron { color: var(--color-gray-400); transition: transform 0.2s ease; flex-shrink: 0; }
    .expand-chevron.open { transform: rotate(180deg); color: var(--color-primary); }

    /* ── Expanded Fields Panel ── */
    .section-fields-panel {
      border-top: 1px solid var(--color-gray-100);
      background: #FAFAFA;
      padding: 10px 14px 14px;
    }

    .fields-empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 1.5rem; color: var(--color-gray-400); text-align: center; gap: 6px;
    }
    .fields-empty p { margin: 0; font-size: 0.875rem; font-weight: 500; }
    .fields-empty span { font-size: 0.8125rem; }

    /* ── Field Item ── */
    .field-item {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 10px; background: var(--color-white);
      border: 1px solid var(--color-gray-200); border-radius: 7px;
      margin-bottom: 4px; cursor: default;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field-item:hover { border-color: var(--color-gray-300); }
    .field-item.field-drag-over { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(160,33,149,0.12); }
    .field-item.field-dragging { opacity: 0.35; border-style: dashed; }

    .field-drag-grip {
      cursor: grab; color: var(--color-gray-300); flex-shrink: 0;
      display: flex; align-items: center; padding: 2px;
    }
    .field-drag-grip:hover { color: var(--color-gray-500); }
    .field-drag-grip:active { cursor: grabbing; }

    .field-num {
      width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
      background: var(--color-gray-100); border-radius: 50%;
      font-size: 0.625rem; font-weight: 700; color: var(--color-gray-500); flex-shrink: 0;
    }

    .field-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .field-item-label { font-size: 0.875rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .field-item-hint { font-size: 0.6875rem; color: var(--color-gray-400); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Type Badges ── */
    .type-badge {
      font-size: 0.625rem; font-weight: 600; padding: 2px 7px;
      border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
    }
    .type-gray   { background: var(--color-gray-100); color: var(--color-gray-600); }
    .type-blue   { background: var(--status-blue-bg); color: #1D4ED8; }
    .type-teal   { background: #F0FDFA; color: #0F766E; }
    .type-purple { background: #FAF5FF; color: #7E22CE; }
    .type-indigo { background: #EEF2FF; color: #4338CA; }
    .type-amber  { background: var(--status-yellow-bg); color: #B45309; }
    .type-orange { background: var(--status-orange-bg); color: #C2410C; }
    .type-green  { background: #F0FDF4; color: #166534; }
    .type-pink   { background: #FDF2F8; color: #9D174D; }
    .type-red    { background: #FEF2F2; color: #B91C1C; }

    .req-badge {
      font-size: 0.625rem; font-weight: 600; padding: 2px 7px;
      border-radius: var(--radius-full); background: #FEF2F2; color: #B91C1C; flex-shrink: 0;
    }

    /* ── Hidden field state ── */
    .field-item.field-hidden {
      opacity: 0.6;
      background: var(--color-gray-50);
    }
    .field-item.field-hidden .field-item-label {
      color: var(--color-gray-400);
      text-decoration: line-through;
      text-decoration-color: var(--color-gray-300);
    }

    .hidden-badge {
      font-size: 0.625rem; font-weight: 600; padding: 2px 7px;
      border-radius: var(--radius-full); background: var(--status-orange-bg); color: #C2410C;
      border: 1px solid #FED7AA; flex-shrink: 0; letter-spacing: 0.04em; text-transform: uppercase;
    }

    /* ── Visibility button ── */
    .visibility-btn { color: var(--color-gray-300); }
    .visibility-btn:hover { background: var(--color-gray-100); color: var(--color-gray-500); }
    .visibility-btn.is-hidden { color: var(--color-warning); }
    .visibility-btn.is-hidden:hover { background: var(--status-orange-bg); color: #92400E; }

    /* ── Add Field Button ── */
    .btn-add-field {
      display: flex; align-items: center; gap: 6px;
      width: 100%; padding: 8px 10px; margin-top: 4px;
      border: 1.5px dashed var(--color-gray-300); border-radius: 7px;
      background: transparent; color: var(--color-gray-500);
      font-size: 0.8125rem; font-weight: 500; cursor: pointer;
      transition: all 0.15s;
    }
    .btn-add-field:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }

    /* ── Add Section Button ── */
    .add-section-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 8px; padding: 14px; width: 100%;
      border: 2px dashed var(--color-gray-300); border-radius: var(--radius-md);
      background: transparent; color: var(--color-gray-500);
      font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
    }
    .add-section-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }

    /* ── Misc reusable ── */
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--color-gray-300); border-radius: 24px; transition: 0.2s; }
    .toggle-slider::before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--color-primary); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

    .toggle-sm { width: 36px; height: 20px; }
    .toggle-sm .toggle-slider::before { height: 14px; width: 14px; }
    .toggle-sm input:checked + .toggle-slider::before { transform: translateX(16px); }

    .toggle-label { font-size: 0.75rem; color: var(--color-gray-500); white-space: nowrap; }
    .toggle-inline { display: flex; align-items: center; gap: 10px; }

    .btn-icon-sm {
      width: 30px; height: 30px; border: none; background: transparent; border-radius: var(--radius);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: var(--color-gray-400); flex-shrink: 0; transition: all 0.12s;
    }
    .btn-icon-sm:hover { background: var(--color-gray-100); color: var(--color-gray-600); }
    .btn-icon-sm.danger:hover { background: var(--color-error-light); color: var(--color-error); }

    /* ── Panel (modules/export/history) ── */
    .panel { background: var(--color-white); border-radius: var(--radius-lg); box-shadow: var(--card-shadow); padding: 1.5rem; }
    .panel-header { margin-bottom: 1.5rem; }
    .panel-header h2 { margin: 0 0 0.25rem; font-size: 1.125rem; font-weight: 600; }
    .panel-header p { margin: 0; font-size: 0.875rem; color: var(--color-gray-500); }

    /* ── Modules Grid ── */
    .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .module-card { padding: 1.25rem; background: var(--color-gray-50); border: 2px solid var(--color-gray-200); border-radius: var(--radius-lg); transition: all 0.15s ease; }
    .module-card.active { border-color: var(--color-primary); background: var(--color-white); }
    .module-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .module-card h3 { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 600; }
    .module-card p { margin: 0 0 0.75rem; font-size: 0.8125rem; color: var(--color-gray-500); }
    .module-field-count { font-size: 0.75rem; color: var(--color-gray-400); display: block; margin-bottom: 0.5rem; }

    /* ── Export ── */
    .export-settings { display: flex; flex-direction: column; gap: 1rem; }
    .setting-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .setting-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--color-gray-50); }
    .setting-header > div { flex: 1; }
    .setting-header h3 { margin: 0; font-size: 0.9375rem; font-weight: 600; }
    .setting-header p { margin: 0; font-size: 0.8125rem; color: var(--color-gray-500); }
    .setting-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

    /* ── History ── */
    .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .empty-history { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; color: var(--color-gray-400); text-align: center; }
    .empty-history p { margin: 1rem 0 0.25rem; font-weight: 500; }
    .empty-history span { font-size: 0.875rem; }
    .history-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius-md); border-left: 3px solid var(--color-gray-300); }
    .history-item.current { border-left-color: var(--color-success); background: var(--status-green-bg); }
    .history-icon { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--color-white); border-radius: 50%; color: var(--color-gray-500); }
    .history-item.current .history-icon { color: var(--color-success); }
    .history-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .history-desc { font-weight: 500; font-size: 0.9375rem; }
    .history-meta { display: flex; gap: 12px; font-size: 0.8125rem; color: var(--color-gray-500); }
    .history-user { font-weight: 500; }
    .history-actions { display: flex; gap: 8px; }

    /* ── Modals ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-container { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 500px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; max-height: 90vh; }
    .modal-container.modal-lg { max-width: 700px; }
    .modal-container.modal-field { max-width: 580px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-gray-200); flex-shrink: 0; }
    .modal-header h2 { margin: 0; font-size: 1.0625rem; font-weight: 600; }
    .modal-close-btn { background: none; border: none; cursor: pointer; color: var(--color-gray-400); width: 32px; height: 32px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; padding: 0; }
    .modal-close-btn:hover { background: var(--color-gray-100); color: var(--color-gray-700); }
    .modal-body { padding: 1.5rem; overflow-y: visible; }
    .modal-body-scroll { overflow-y: auto; max-height: 60vh; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--color-gray-200); display: flex; justify-content: flex-end; gap: 0.75rem; flex-shrink: 0; }

    /* ── Form Controls ── */
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; }
    .form-group:last-child { margin-bottom: 0; }
    .form-group-toggle { align-items: flex-start; flex-shrink: 0; }
    .form-group-row { display: flex; align-items: center; gap: 12px; }
    .form-row { display: flex; gap: 1rem; }
    .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--color-gray-700); }
    .form-input { padding: 8px 12px; border: 1px solid var(--color-gray-300); border-radius: 7px; font-size: 0.875rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; background: white; width: 100%; box-sizing: border-box; }
    .form-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(160,33,149,0.1); }
    .form-input-sm { padding: 6px 10px; font-size: 0.8125rem; }
    .form-select { padding: 8px 12px; border: 1px solid var(--color-gray-300); border-radius: 7px; font-size: 0.875rem; outline: none; background: white; width: 100%; }
    .form-select-sm { padding: 6px 10px; font-size: 0.8125rem; }
    .form-textarea { padding: 8px 12px; border: 1px solid var(--color-gray-300); border-radius: 7px; font-size: 0.875rem; resize: vertical; width: 100%; box-sizing: border-box; outline: none; }
    .form-textarea:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(160,33,149,0.1); }
    .form-hint { font-size: 0.75rem; color: var(--color-gray-400); }
    .required { color: var(--color-error); }
    .icon-input { width: 60px !important; text-align: center; font-size: 1.25rem; }

    /* ── Type Grid in Field Modal ── */
    .type-grid { display: flex; flex-direction: column; gap: 12px; }
    .type-group { display: flex; flex-direction: column; gap: 6px; }
    .type-group-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-gray-400); }
    .type-options { display: flex; flex-wrap: wrap; gap: 6px; }
    .type-option {
      display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      border: 1.5px solid var(--color-gray-200); border-radius: 7px;
      background: white; cursor: pointer; font-size: 0.8125rem; font-weight: 500;
      color: var(--color-gray-600); transition: all 0.12s;
    }
    .type-option:hover { border-color: var(--color-gray-400); color: var(--color-gray-800); background: var(--color-gray-50); }
    .type-option.selected { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
    .type-option-icon { font-size: 0.875rem; }

    /* ── Options List ── */
    .options-header { display: flex; justify-content: space-between; align-items: center; }
    .options-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 200px; overflow-y: auto; }
    .option-row { display: flex; align-items: center; gap: 8px; }
    .option-grip { color: var(--color-gray-300); flex-shrink: 0; }

    /* ── Module Fields ── */
    .module-fields-section { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-gray-200); }
    .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header-row h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .module-fields-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .module-field-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--color-gray-50); border-radius: var(--radius); transition: opacity 0.15s, background 0.15s; }
    .module-field-row.module-field-hidden { opacity: 0.55; background: var(--color-gray-100); }
    .module-field-content { flex: 1; display: flex; align-items: center; gap: 0.75rem; }
    .module-field-content.module-field-content-hidden input[type="text"] { text-decoration: line-through; color: var(--color-gray-400); }
    .module-field-content input[type="text"] { flex: 1; }
    .module-field-content select { width: 140px; }
    .reorder-buttons { display: flex; flex-direction: column; gap: 2px; }
    .reorder-btn { width: 24px; height: 20px; border: 1px solid var(--color-gray-300); background: var(--color-white); border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-gray-500); }
    .reorder-btn:hover:not(:disabled) { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }
    .reorder-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .no-fields { text-align: center; padding: 2rem; color: var(--color-gray-400); font-size: 0.875rem; }

    /* ── Version view ── */
    .version-detail-header { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-gray-200); }
    .version-meta-lg { display: flex; gap: 12px; margin-bottom: 0.5rem; }
    .version-user-lg { font-weight: 600; }
    .version-time-lg { color: var(--color-gray-500); }
    .version-desc-lg { margin: 0; color: var(--color-gray-700); }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .summary-item { padding: 1rem; background: var(--color-gray-50); border-radius: var(--radius); text-align: center; }
    .summary-label { display: block; font-size: 0.75rem; color: var(--color-gray-500); margin-bottom: 4px; }
    .summary-value { font-size: 1.5rem; font-weight: 700; color: var(--color-gray-900); }
    .version-items-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .version-item { display: flex; align-items: center; gap: 12px; padding: 0.75rem 1rem; background: var(--color-gray-50); border-radius: var(--radius); }
    .version-item.disabled { opacity: 0.5; }
    .vi-name { flex: 1; font-weight: 500; }
    .vi-count { font-size: 0.8125rem; color: var(--color-gray-500); }

    /* ── Badges ── */
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.6875rem; font-weight: 600; }
    .badge-blue  { background: var(--status-blue-bg); color: #1D4ED8; }
    .badge-green { background: #F0FDF4; color: #166534; }
    .badge-gray  { background: var(--color-gray-100); color: var(--color-gray-600); }
    .badge-red   { background: #FEF2F2; color: #B91C1C; }

    /* ── Buttons ── */
    .btn-primary { padding: 8px 16px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { padding: 8px 16px; background: white; color: var(--color-gray-700); border: 1px solid var(--color-gray-300); border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
    .btn-secondary:hover { background: var(--color-gray-50); border-color: var(--color-gray-400); }
    .btn-sm { padding: 6px 12px; font-size: 0.8125rem; }
    .btn-text { background: none; border: none; font-size: 0.8125rem; font-weight: 500; color: var(--color-primary); cursor: pointer; padding: 4px 0; }
    .btn-text:hover { text-decoration: underline; }

    .module-edit-icon { margin-right: 8px; }

    /* ══════════════════════════════════════════════════════════════
       MOBILE  ≤ 768px
       All rules are additions/overrides — desktop is untouched.
    ══════════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {

      /* ── Header ── */
      .admin-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
      }
      .header-actions {
        width: 100%;
        flex-direction: column;
        gap: 0.5rem;
      }
      .header-actions .btn-secondary,
      .header-actions .btn-primary {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }

      /* ── Tabs bar — horizontal scroll ── */
      .admin-tabs {
        padding: 0 0.75rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        gap: 0;
      }
      .admin-tab {
        padding: 0.75rem 0.875rem;
        font-size: 0.8125rem;
        white-space: nowrap;
        flex-shrink: 0;
      }
      /* Move preview-toggle below the tab bar on its own row */
      .tab-spacer { display: none; }
      .btn-preview-toggle {
        display: none; /* replaced by mobile panel-switch tabs below */
      }

      /* ── Split view → stacked panels ── */
      /* Builder + preview panels are toggled via JS (showPreview signal).
         On mobile we stack them full-width instead of side-by-side.       */
      .admin-content.has-preview {
        flex-direction: column;
        overflow-y: auto;
        padding: 0;
      }
      .admin-content.has-preview .content-left {
        width: 100%;
        min-width: 0;
        padding: 1rem;
      }
      .preview-pane {
        width: 100%;
        min-width: 0;
        border-left: none;
        border-top: 2px solid var(--color-gray-200);
      }
      /* Non-split content area */
      .admin-content:not(.has-preview) {
        padding: 1rem;
      }

      /* ── Builder layout ── */
      .builder-layout {
        max-width: 100%;
      }
      .builder-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .builder-header-right {
        width: 100%;
        justify-content: space-between;
      }
      .builder-header-right .btn-secondary {
        min-height: 44px;
      }

      /* ── Section cards ── */
      .section-card-header {
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
      }
      /* On small screens abbreviate the badge row and allow wrapping */
      .section-badges {
        flex-wrap: wrap;
        gap: 6px;
      }
      /* Make all action icon buttons a comfortable tap target */
      .btn-icon-sm {
        width: 38px;
        height: 38px;
        min-height: 44px;
        min-width: 38px;
      }
      /* Drag handle is replaced by up/down reorder buttons on mobile.
         Keep it in DOM but shrink so it's out of the way. */
      .drag-handle {
        display: none;
      }
      .field-drag-grip {
        display: none;
      }

      /* ── Field items ── */
      .field-item {
        flex-wrap: wrap;
        padding: 10px;
        gap: 6px;
      }
      .field-item-info {
        min-width: 60%;
      }

      /* ── Add Section / Add Field buttons ── */
      .btn-add-field,
      .add-section-btn {
        min-height: 44px;
      }

      /* ── Modules grid ── */
      .modules-grid {
        grid-template-columns: 1fr;
      }

      /* ── Icon picker — 2-row horizontal scroll ── */
      .icon-picker {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
        gap: 4px;
        max-height: 80px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      .icon-pick-btn {
        width: 36px;
        height: 36px;
        min-height: 36px;
      }

      /* ── Modals ── */
      .modal-overlay {
        align-items: flex-end;
        padding: 0;
      }
      .modal-container,
      .modal-container.modal-lg,
      .modal-container.modal-field {
        max-width: 100%;
        width: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        max-height: 92vh;
      }
      .modal-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
      }
      .modal-footer .btn-secondary,
      .modal-footer .btn-primary {
        width: 100%;
        min-height: 44px;
        justify-content: center;
      }

      /* ── Form rows stack vertically in modals ── */
      .form-row {
        flex-direction: column;
        gap: 0;
      }

      /* ── Type grid in field modal ── */
      .type-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .type-option {
        min-height: 40px;
        justify-content: center;
      }

      /* ── Module field rows (edit modal) ── */
      .module-field-content {
        flex-wrap: wrap;
      }
      .module-field-content select {
        width: 100%;
      }

      /* ── Summary grid (version view) ── */
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      /* ── History items ── */
      .history-item {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .history-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .history-actions .btn-secondary,
      .history-actions .btn-primary {
        min-height: 44px;
        flex: 1;
        justify-content: center;
      }

      /* ── Preview pane header on mobile ── */
      .pv-hdr-btn { display: none; }
      .pv-progress-bar-mini { display: none; }
    }
  `]
})
export class MesAdminComponent {
  activeTab = signal<AdminTab>('builder');
  private authService = inject(AuthService);
  mesConfig = inject(MesConfigService);

  readonly moduleIconMap: Record<string, string> = {
    m_coffee: 'coffee', m_food: 'utensils', m_pharma: 'pill',
    m_plastics: 'layers', m_metal: 'wrench', m_elec: 'cpu', m_chem: 'flask',
  };

  // Field type groups for the type picker
  readonly typeGroups = [
    {
      name: 'Text Inputs',
      types: [
        { value: 'text',     label: 'Text',      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>' },
        { value: 'textarea', label: 'Textarea',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>' },
        { value: 'number',   label: 'Number',    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h.01M7.5 4.5 6 7h3"/><path d="M6 15v4"/><circle cx="9" cy="9" r="1"/><path d="m21 3-1 1 1 1"/><path d="M18 9h4v4h-4z"/><path d="M18 19h3"/><path d="M19.5 19v-3"/></svg>' },
        { value: 'email',    label: 'Email',     icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' },
        { value: 'phone',    label: 'Phone',     icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' },
        { value: 'url',      label: 'URL',       icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' },
        { value: 'date',     label: 'Date',      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>' },
      ]
    },
    {
      name: 'Choice',
      types: [
        { value: 'select',  label: 'Select',       icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' },
        { value: 'multi',   label: 'Multi-Select', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="13" height="13" rx="1"/><path d="m21 5-9 9-4-4"/></svg>' },
        { value: 'radio',   label: 'Radio Group',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>' },
        { value: 'tags',    label: 'Tags',         icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>' },
      ]
    },
    {
      name: 'Boolean',
      types: [
        { value: 'checkbox', label: 'Checkbox', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>' },
        { value: 'toggle',   label: 'Toggle',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="12" x="2" y="6" rx="6"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>' },
      ]
    },
    {
      name: 'Special',
      types: [
        { value: 'file',         label: 'File Upload',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>' },
        { value: 'audit_blocks', label: 'Audit Blocks',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
      ]
    },
  ];

  // Data
  sections = signal<(MESSection & { enabled: boolean })[]>(
    MES_STANDARD_SECTIONS.map(s => ({ ...s, enabled: true }))
  );
  modules = signal<MESModule[]>([...MES_MODULES]);

  // Accordion state
  expandedSections = signal<Set<string>>(new Set());

  // Drag state — sections
  dragSectionIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  // Drag state — fields
  dragFieldKey = signal<string | null>(null);  // "sectionId:fieldIndex"
  dragOverFieldKey = signal<string | null>(null);

  // Section meta editing (title/icon/desc only)
  editingSectionMeta = signal<(MESSection & { enabled: boolean }) | null>(null);
  private editingSectionMetaId: string | null = null;

  showAddSectionModal = signal(false);
  newSection = { title: '', icon: 'clipboard', desc: '' };

  // Field editing
  editingField = signal<MESField | null>(null);
  editingFieldSectionId: string | null = null;
  editingFieldOriginalId: string | null = null;
  isNewField = false;
  editingFieldOptions: string[] = [];

  // Module editing
  editingModule = signal<MESModule | null>(null);
  editingModuleOriginal: MESModule | null = null;

  // Version control
  versionHistory = signal<ConfigVersion[]>([]);
  viewingVersion = signal<ConfigVersion | null>(null);
  showSaveModal = signal(false);
  saveDescription = '';
  currentUser = this.authService.user()?.name ?? 'User';

  exportConfig = {
    sheetsEnabled: false,
    spreadsheetId: '',
    tabName: 'MES Intakes',
    token: '',
    autoSave: true,
    emailEnabled: false,
    emailRecipients: ''
  };

  showComingSoon = signal(false);
  comingSoonFeature = '';
  comingSoonDesc = '';

  // ── Section icon picker ───────────────────────────────────────────────────
  readonly sectionIconOptions = [
    'building','factory','clipboard','microscope','package','archive',
    'analytics','integrations','check-circle','wrench','flask','coffee',
    'utensils','pill','cpu','layers','bar-chart','globe','note',
    'calendar','briefcase','projects','star','flag','settings','documents',
  ];

  // ── Preview Panel ─────────────────────────────────────────────────────────
  showPreview = signal(false);
  previewSectionIndex = signal(0);

  previewSections = computed(() =>
    this.sections()
      .filter(s => s.enabled !== false)
      .map(s => ({ ...s, fields: s.fields.filter(f => f.visible !== false) }))
  );

  previewSafeIndex = computed(() => {
    const max = this.previewSections().length - 1;
    if (max < 0) return 0;
    return Math.min(Math.max(0, this.previewSectionIndex()), max);
  });

  constructor(private router: Router) {
    this.loadFromStorage();
  }

  // ── Accordion ─────────────────────────────────────────────────────────────

  isSectionExpanded(id: string): boolean {
    return this.expandedSections().has(id);
  }

  toggleExpand(id: string) {
    this.expandedSections.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Section Drag & Drop ───────────────────────────────────────────────────

  onSectionDragStart(event: DragEvent, index: number) {
    this.dragSectionIndex.set(index);
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onSectionDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dragSectionIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onSectionDragLeave(event: DragEvent) {
    const target = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;
    if (!related || !target.contains(related)) {
      this.dragOverIndex.set(null);
    }
  }

  onSectionDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const from = this.dragSectionIndex();
    if (from === null || from === targetIndex) {
      this.onSectionDragEnd();
      return;
    }
    this.sections.update(arr => {
      const next = [...arr];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    this.onSectionDragEnd();
  }

  onListDrop(event: DragEvent) {
    event.preventDefault();
  }

  onSectionDragEnd() {
    this.dragSectionIndex.set(null);
    this.dragOverIndex.set(null);
  }

  // ── Field Drag & Drop ─────────────────────────────────────────────────────

  onFieldDragStart(event: DragEvent, sectionId: string, index: number) {
    const key = `${sectionId}:${index}`;
    this.dragFieldKey.set(key);
    event.dataTransfer?.setData('text/plain', key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
  }

  onFieldDragOver(event: DragEvent, sectionId: string, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const key = `${sectionId}:${index}`;
    if (this.dragFieldKey() !== key) {
      this.dragOverFieldKey.set(key);
    }
  }

  onFieldDragLeave() {
    this.dragOverFieldKey.set(null);
  }

  onFieldDrop(event: DragEvent, sectionId: string, targetIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const fromKey = this.dragFieldKey();
    if (!fromKey) { this.onFieldDragEnd(); return; }

    const [fromSection, fromIdxStr] = fromKey.split(':');
    const fromIndex = parseInt(fromIdxStr, 10);

    if (fromSection === sectionId && fromIndex === targetIndex) { this.onFieldDragEnd(); return; }

    this.sections.update(sections => {
      return sections.map(s => {
        if (s.id === fromSection) {
          const fields = [...s.fields];
          const [moved] = fields.splice(fromIndex, 1);
          if (fromSection === sectionId) {
            fields.splice(targetIndex, 0, moved);
            return { ...s, fields };
          }
          return { ...s, fields };
        }
        return s;
      }).map(s => {
        if (s.id === sectionId && fromSection !== sectionId) {
          const src = sections.find(x => x.id === fromSection);
          if (!src) return s;
          const movedField = src.fields[fromIndex];
          const fields = [...s.fields];
          fields.splice(targetIndex, 0, movedField);
          return { ...s, fields };
        }
        return s;
      });
    });
    this.onFieldDragEnd();
  }

  onFieldDragEnd() {
    this.dragFieldKey.set(null);
    this.dragOverFieldKey.set(null);
  }

  // ── Section CRUD ──────────────────────────────────────────────────────────

  addSection() {
    const newSec: MESSection & { enabled: boolean } = {
      id: `section_${Date.now()}`,
      title: this.newSection.title,
      icon: this.newSection.icon || 'clipboard',
      desc: this.newSection.desc || '',
      fields: [],
      enabled: true
    };
    this.sections.update(s => [...s, newSec]);
    this.showAddSectionModal.set(false);
    this.newSection = { title: '', icon: 'clipboard', desc: '' };
    // Auto-expand new section
    this.expandedSections.update(set => { const next = new Set(set); next.add(newSec.id); return next; });
  }

  openEditSectionMeta(section: MESSection & { enabled: boolean }) {
    this.editingSectionMetaId = section.id;
    this.editingSectionMeta.set({ ...section });
  }

  closeEditSectionMeta() {
    this.editingSectionMeta.set(null);
    this.editingSectionMetaId = null;
  }

  saveSectionMeta() {
    const edited = this.editingSectionMeta();
    if (!edited || !this.editingSectionMetaId) return;
    this.sections.update(sections =>
      sections.map(s => s.id === this.editingSectionMetaId ? { ...s, title: edited.title, icon: edited.icon, desc: edited.desc } : s)
    );
    this.closeEditSectionMeta();
  }

  deleteSection(section: MESSection & { enabled: boolean }) {
    if (!confirm(`Delete section "${section.title}"? This will also delete all ${section.fields.length} fields in it.`)) return;
    this.sections.update(s => s.filter(x => x.id !== section.id));
  }

  // ── Field CRUD ────────────────────────────────────────────────────────────

  addFieldToSection(sectionId: string) {
    const newField: MESField = { id: `field_${Date.now()}`, label: '', type: 'text' };
    this.isNewField = true;
    this.editingFieldSectionId = sectionId;
    this.editingFieldOriginalId = null;
    this.editingFieldOptions = [];
    this.editingField.set({ ...newField });
  }

  openEditFieldModal(field: MESField, sectionId: string) {
    this.isNewField = false;
    this.editingFieldSectionId = sectionId;
    this.editingFieldOriginalId = field.id;
    this.editingFieldOptions = field.options ? [...field.options] : [];
    this.editingField.set({ ...field });
  }

  closeFieldModal() {
    this.editingField.set(null);
    this.editingFieldSectionId = null;
    this.editingFieldOriginalId = null;
    this.isNewField = false;
  }

  setFieldType(type: string) {
    const f = this.editingField();
    if (!f) return;
    this.editingField.set({ ...f, type: type as MESField['type'] });
    // Clear options when switching away from choice types
    if (!this.hasOptions(type as MESField['type'])) {
      this.editingFieldOptions = [];
    } else if (this.editingFieldOptions.length === 0) {
      this.editingFieldOptions = ['Option 1', 'Option 2', 'Option 3'];
    }
  }

  hasOptions(type: MESField['type']): boolean {
    return ['select', 'multi', 'radio'].includes(type);
  }

  isSimpleInputType(type: MESField['type']): boolean {
    return ['text', 'textarea', 'number', 'email', 'phone', 'url'].includes(type);
  }

  addOption() { this.editingFieldOptions.push(''); }

  removeOption(index: number) {
    this.editingFieldOptions.splice(index, 1);
  }

  setValidationMin(val: number) {
    const f = this.editingField();
    if (!f) return;
    this.editingField.set({ ...f, validation: { ...f.validation, min: val } });
  }

  setValidationMax(val: number) {
    const f = this.editingField();
    if (!f) return;
    this.editingField.set({ ...f, validation: { ...f.validation, max: val } });
  }

  saveField() {
    const field = this.editingField();
    if (!field || !this.editingFieldSectionId) return;

    // Attach current options
    if (this.hasOptions(field.type)) {
      field.options = this.editingFieldOptions.filter(o => o.trim());
    }

    if (this.isNewField) {
      this.sections.update(sections =>
        sections.map(s => s.id === this.editingFieldSectionId
          ? { ...s, fields: [...s.fields, { ...field }] }
          : s
        )
      );
    } else {
      this.sections.update(sections =>
        sections.map(s => {
          if (s.id !== this.editingFieldSectionId) return s;
          return { ...s, fields: s.fields.map(f => f.id === this.editingFieldOriginalId ? { ...field } : f) };
        })
      );
    }
    this.closeFieldModal();
  }

  toggleFieldVisibility(sectionId: string, fieldIndex: number) {
    this.sections.update(sections =>
      sections.map(s => {
        if (s.id !== sectionId) return s;
        const fields = s.fields.map((f, i) =>
          i === fieldIndex ? { ...f, visible: f.visible === false ? true : false } : f
        );
        return { ...s, fields };
      })
    );
  }

  deleteFieldInSection(sectionId: string, fieldIndex: number) {
    this.sections.update(sections =>
      sections.map(s => {
        if (s.id !== sectionId) return s;
        const fields = [...s.fields];
        fields.splice(fieldIndex, 1);
        return { ...s, fields };
      })
    );
  }

  getTypeMeta(type: string): { label: string; color: string; group: string } {
    return FIELD_TYPE_META[type] ?? { label: type, color: 'gray', group: '' };
  }

  // ── Module CRUD ───────────────────────────────────────────────────────────

  editModule(mod: MESModule) {
    this.editingModuleOriginal = mod;
    this.editingModule.set(JSON.parse(JSON.stringify(mod)));
  }

  closeModuleModal() {
    this.editingModule.set(null);
    this.editingModuleOriginal = null;
  }

  saveModule() {
    const edited = this.editingModule();
    if (!edited || !this.editingModuleOriginal) return;
    this.modules.update(mods => mods.map(m => m.id === this.editingModuleOriginal!.id ? { ...edited } : m));
    this.closeModuleModal();
  }

  addModule() {
    const newMod: MESModule = {
      id: `m_${Date.now()}`, name: 'New Module', icon: 'factory',
      desc: 'Custom module description', active: true, builtIn: false, fields: []
    };
    this.modules.update(mods => [...mods, newMod]);
    this.editModule(newMod);
  }

  addModuleField() {
    const mod = this.editingModule();
    if (!mod) return;
    const newField: MESField = { id: `mf_${Date.now()}`, label: 'New Field', type: 'text' };
    this.editingModule.set({ ...mod, fields: [...mod.fields, newField] });
  }

  moveModuleField(index: number, direction: number) {
    const mod = this.editingModule();
    if (!mod) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= mod.fields.length) return;
    const fields = [...mod.fields];
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
    this.editingModule.set({ ...mod, fields });
  }

  toggleModuleFieldVisibility(index: number) {
    const mod = this.editingModule();
    if (!mod) return;
    const fields = mod.fields.map((f, i) =>
      i === index ? { ...f, visible: f.visible === false ? true : false } : f
    );
    this.editingModule.set({ ...mod, fields });
  }

  deleteModuleField(index: number) {
    const mod = this.editingModule();
    if (!mod) return;
    const fields = [...mod.fields];
    fields.splice(index, 1);
    this.editingModule.set({ ...mod, fields });
  }

  // ── Config Persistence ────────────────────────────────────────────────────

  loadFromStorage() {
    const saved = localStorage.getItem('mes-admin-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.sections) this.sections.set(config.sections);
        if (config.modules) this.modules.set(config.modules);
        if (config.exportConfig) this.exportConfig = config.exportConfig;
      } catch (e) { console.error('Failed to load config', e); }
    }
    const history = localStorage.getItem('mes-admin-history');
    if (history) {
      try { this.versionHistory.set(JSON.parse(history)); } catch (e) {}
    }
  }

  goBack() { this.router.navigate(['/intake/mes']); }

  resetDefaults() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      this.sections.set(MES_STANDARD_SECTIONS.map(s => ({ ...s, enabled: true })));
      this.modules.set([...MES_MODULES]);
    }
  }

  saveConfig() { this.showSaveModal.set(true); }

  confirmSave() {
    const version: ConfigVersion = {
      id: `v_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: this.currentUser,
      description: this.saveDescription,
      sections: JSON.parse(JSON.stringify(this.sections())),
      modules: JSON.parse(JSON.stringify(this.modules())),
      exportConfig: { ...this.exportConfig }
    };
    this.versionHistory.update(h => [version, ...h]);
    localStorage.setItem('mes-admin-config', JSON.stringify({ sections: this.sections(), modules: this.modules(), exportConfig: this.exportConfig }));
    localStorage.setItem('mes-admin-history', JSON.stringify(this.versionHistory()));
    this.showSaveModal.set(false);
    this.saveDescription = '';
    alert('Configuration saved!');
  }

  // ── Version History ───────────────────────────────────────────────────────

  getEnabledSectionsCount(version: ConfigVersion): number {
    return version.sections.filter(s => s.enabled).length;
  }

  getActiveModulesCount(version: ConfigVersion): number {
    return version.modules.filter(m => m.active).length;
  }

  formatVersionDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) { const m = Math.floor(diff / 60000); return `${m} minute${m > 1 ? 's' : ''} ago`; }
    if (diff < 86400000) { const h = Math.floor(diff / 3600000); return `${h} hour${h > 1 ? 's' : ''} ago`; }
    if (diff < 604800000) { const d = Math.floor(diff / 86400000); return `${d} day${d > 1 ? 's' : ''} ago`; }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  viewVersion(version: ConfigVersion) { this.viewingVersion.set(version); }

  revertToVersion(version: ConfigVersion) {
    if (!confirm(`Revert to this version?\n\n"${version.description}"\nSaved by ${version.user} on ${this.formatVersionDate(version.timestamp)}`)) return;
    const currentVersion: ConfigVersion = {
      id: `v_${Date.now()}`, timestamp: new Date().toISOString(), user: this.currentUser,
      description: `Auto-save before reverting to: "${version.description}"`,
      sections: JSON.parse(JSON.stringify(this.sections())),
      modules: JSON.parse(JSON.stringify(this.modules())),
      exportConfig: { ...this.exportConfig }
    };
    this.versionHistory.update(h => [currentVersion, ...h]);
    this.sections.set(JSON.parse(JSON.stringify(version.sections)));
    this.modules.set(JSON.parse(JSON.stringify(version.modules)));
    this.exportConfig = { ...version.exportConfig };
    localStorage.setItem('mes-admin-config', JSON.stringify({ sections: this.sections(), modules: this.modules(), exportConfig: this.exportConfig }));
    localStorage.setItem('mes-admin-history', JSON.stringify(this.versionHistory()));
    alert('Configuration reverted successfully!');
  }

  // ── Preview Panel Methods ─────────────────────────────────────────────────

  togglePreview() { this.showPreview.update(v => !v); }

  previewGoToSection(i: number) { this.previewSectionIndex.set(i); }

  previewNextSection() {
    const max = this.previewSections().length - 1;
    this.previewSectionIndex.update(i => Math.min(i + 1, max));
  }

  previewPrevSection() {
    this.previewSectionIndex.update(i => Math.max(i - 1, 0));
  }

  isSectionCompleted_preview(_sec: MESSection): boolean {
    return false; // Static readonly preview — no completion state
  }

  // ── Coming Soon ───────────────────────────────────────────────────────────

  openComingSoon(feature: string, desc: string) {
    this.comingSoonFeature = feature;
    this.comingSoonDesc = desc;
    this.showComingSoon.set(true);
  }

  testSheetsConnection() {
    this.openComingSoon('Google Sheets Integration', 'Test and verify your Google Sheets API connection for automatic interview data sync.');
  }
}
