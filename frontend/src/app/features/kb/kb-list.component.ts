import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { KBDocument } from '../../core/models';
import { KB_CATEGORIES, KB_CATEGORY_BADGES } from '../../core/constants/seed.data';
import { IconComponent } from '../../shared/icons';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterConfig, FilterValues } from '../../shared/components/filter-bar/filter.types';
import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { HighlightPipe } from '../../shared/pipes/highlight.pipe';
import { TeamUtilService } from '../../shared/utils/team.service';
import { CommentThreadComponent } from '../../shared/components/comment-thread/comment-thread.component';

type DocType = 'document' | 'playbook' | 'template' | 'file' | 'link' | 'folder';

@Component({
  selector: 'app-kb-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, FilterBarComponent, ActivityTimelineComponent, HighlightPipe, CommentThreadComponent],
  template: `
    <div class="kb-root" (dragover)="onPageDragOver($event)" (dragleave)="onPageDragLeave($event)" (drop)="onPageDrop($event)">
      @if (showDropzone()) {
        <div class="page-dropzone">
          <div class="page-dropzone-inner">
            <app-icon name="upload"></app-icon>
            <p>Drop files to upload{{ filterState['category'] ? ' to ' + filterState['category'] : '' }}</p>
            <span>Files will be added to the Knowledge Base</span>
          </div>
        </div>
      }
      <div class="table-card">

        <!-- ── Toolbar ─────────────────────────────────────────── -->
        <div class="kb-toolbar">
          <div class="kb-toolbar-left">
            <h1>Knowledge Base</h1>
            @if (viewMode() === 'table') {
              <span class="doc-count">{{ filteredDocs().length }} {{ filteredDocs().length === 1 ? 'item' : 'items' }}</span>
            } @else {
              <span class="doc-count">{{ dataService.kbDocs().length }} total items</span>
            }
          </div>
          <div class="kb-toolbar-right">
            <!-- View toggle -->
            <div class="view-toggle">
              <button class="view-btn" [class.active]="viewMode() === 'table'"
                      (click)="viewMode.set('table')" title="Table view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              <button class="view-btn" [class.active]="viewMode() === 'grid'"
                      (click)="viewMode.set('grid')" title="Grid view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
            </div>
            @if (isAdmin()) {
              <div class="dropdown" [class.open]="showNewDropdown()">
                <button class="btn-primary btn-sm" (click)="showNewDropdown.set(!showNewDropdown())">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14"/><path d="M5 12h14"/>
                  </svg>
                  New
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                <div class="dropdown-menu">
                  <button (click)="openUploadModal()">
                    <app-icon name="upload"></app-icon>
                    {{ currentFolder() ? 'Upload to ' + currentFolder()!.title : 'Upload File' }}
                  </button>
                  <button (click)="openCreateModal('link')">
                    <app-icon name="link"></app-icon>
                    {{ currentFolder() ? 'Add Link in ' + currentFolder()!.title : 'Add Link' }}
                  </button>
                  @if (!currentFolder()) {
                    <button (click)="openCreateModal('document')">
                      <app-icon name="file-text"></app-icon>
                      New Document
                    </button>
                    <button (click)="openCreateModal('playbook')">
                      <app-icon name="book-open"></app-icon>
                      New Playbook
                    </button>
                    @if (filterState['category']) {
                      <div class="dropdown-divider"></div>
                      <button (click)="openCreateModal('folder')">
                        <app-icon name="folder"></app-icon>
                        New Folder in {{ filterState['category'] }}
                      </button>
                    } @else {
                      <button (click)="openCreateModal('folder')">
                        <app-icon name="folder"></app-icon>
                        Create Folder
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Filter Bar (table view only) ─────────────────────── -->
        @if (viewMode() === 'table') {
          <app-filter-bar [filters]="kbFilters" [(values)]="filterState" (valuesChange)="onFilterChange($event)"></app-filter-bar>
        }

        <!-- ── GRID / TILE VIEW ──────────────────────────────────── -->
        @if (viewMode() === 'grid') {
          <div class="kb-tiles-wrapper">

            <!-- Home Overview: Quick Access + Recently Added -->
            @if (pinnedDocs().length > 0 || recentlyAdded().length > 0) {
              <div class="kb-home-overview">
                <div class="kb-overview-col">
                  <div class="kb-overview-header">
                    <h3>
                      <app-icon name="star" [size]="14"></app-icon>
                      Quick Access
                    </h3>
                    <span class="kb-overview-count">{{ pinnedDocs().length }} pinned</span>
                  </div>
                  @if (pinnedDocs().length === 0) {
                    <div class="kb-overview-empty">
                      <p>Pin any resource from its detail view to see it here.</p>
                    </div>
                  } @else {
                    <div class="kb-resource-list">
                      @for (doc of pinnedDocs(); track doc.id) {
                        <button class="kb-resource-row" (click)="selectDoc(doc)">
                          <div class="kb-resource-icon" [style.background]="getCategoryColor(doc.category) + '1A'" [style.color]="getCategoryColor(doc.category)">
                            <app-icon [name]="getFileIcon(doc)" [size]="14"></app-icon>
                          </div>
                          <div class="kb-resource-body">
                            <div class="kb-resource-title">{{ doc.title }}</div>
                            <div class="kb-resource-sub">
                              <span class="kb-resource-cat">{{ doc.category }}</span>
                              <span class="kb-resource-dot">·</span>
                              <span>{{ doc.updated }}</span>
                            </div>
                          </div>
                          <button class="kb-resource-unpin" (click)="togglePin(doc, $event)" title="Unpin">
                            <app-icon name="x" [size]="12"></app-icon>
                          </button>
                        </button>
                      }
                    </div>
                  }
                </div>

                <div class="kb-overview-col">
                  <div class="kb-overview-header">
                    <h3>
                      <app-icon name="clock" [size]="14"></app-icon>
                      Recently Added
                    </h3>
                    <span class="kb-overview-count">last {{ recentlyAdded().length }}</span>
                  </div>
                  <div class="kb-resource-list">
                    @for (doc of recentlyAdded(); track doc.id) {
                      <button class="kb-resource-row" (click)="selectDoc(doc)">
                        <div class="kb-resource-icon" [style.background]="getCategoryColor(doc.category) + '1A'" [style.color]="getCategoryColor(doc.category)">
                          <app-icon [name]="getFileIcon(doc)" [size]="14"></app-icon>
                        </div>
                        <div class="kb-resource-body">
                          <div class="kb-resource-title">{{ doc.title }}</div>
                          <div class="kb-resource-sub">
                            <span class="kb-resource-cat">{{ doc.category }}</span>
                            <span class="kb-resource-dot">·</span>
                            <span>by {{ doc.author }}</span>
                            <span class="kb-resource-dot">·</span>
                            <span>{{ doc.updated }}</span>
                          </div>
                        </div>
                        <button class="kb-resource-pin" [class.active]="doc.pinned" (click)="togglePin(doc, $event)" [title]="doc.pinned ? 'Unpin' : 'Pin'">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 6.95H21.5l-5.89 4.28 2.25 6.92L12 15.9l-5.86 4.25 2.25-6.92L2.5 8.95h7.11z"/></svg>
                        </button>
                      </button>
                    }
                  </div>
                </div>

                @if (popularDocs().length > 0) {
                  <div class="kb-overview-col">
                    <div class="kb-overview-header">
                      <h3>
                        <app-icon name="activity" [size]="14"></app-icon>
                        Frequently Accessed
                      </h3>
                      <span class="kb-overview-count">{{ popularDocs().length }}</span>
                    </div>
                    <div class="kb-resource-list">
                      @for (doc of popularDocs(); track doc.id) {
                        <button class="kb-resource-row" (click)="selectDoc(doc)">
                          <div class="kb-resource-icon" [style.background]="getCategoryColor(doc.category) + '1A'" [style.color]="getCategoryColor(doc.category)">
                            <app-icon [name]="getFileIcon(doc)" [size]="14"></app-icon>
                          </div>
                          <div class="kb-resource-body">
                            <div class="kb-resource-title">{{ doc.title }}</div>
                            <div class="kb-resource-sub">
                              <span class="kb-resource-cat">{{ doc.category }}</span>
                              <span class="kb-resource-dot">·</span>
                              <span>{{ doc.views || 0 }} {{ (doc.views || 0) === 1 ? 'view' : 'views' }}</span>
                            </div>
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <div class="kb-section-heading">
              <span>Categories</span>
              <span class="kb-section-subheading">Browse the full library</span>
            </div>

            <div class="kb-tiles-grid">
              @for (tile of kbTiles(); track tile.category) {
                <div class="kb-tile" (click)="selectTile(tile.category)">
                  <div class="kb-tile-icon-wrap" [style.background]="tile.bg" [style.color]="tile.color">
                    @switch (tile.category) {
                      @case ('Documents') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      }
                      @case ('Playbooks') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      }
                      @case ('Compliance') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      }
                      @case ('Cheat Sheets') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <line x1="8" y1="6" x2="21" y2="6"/>
                          <line x1="8" y1="12" x2="21" y2="12"/>
                          <line x1="8" y1="18" x2="21" y2="18"/>
                          <line x1="3" y1="6" x2="3.01" y2="6"/>
                          <line x1="3" y1="12" x2="3.01" y2="12"/>
                          <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                      }
                      @case ('Skills') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      }
                      @case ('Branding & Identity') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <circle cx="12" cy="12" r="10"/>
                          <circle cx="12" cy="10" r="3"/>
                          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
                        </svg>
                      }
                      @case ('Useful Links') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      }
                      @default {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      }
                    }
                  </div>
                  <div class="kb-tile-content">
                    <div class="kb-tile-title">{{ tile.category }}</div>
                    <div class="kb-tile-count">{{ categoryCounts()[tile.category] || 0 }} {{ (categoryCounts()[tile.category] || 0) === 1 ? 'item' : 'items' }}</div>
                  </div>
                  <svg class="kb-tile-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              }
            </div>
          </div>
        }

        <!-- ── TABLE VIEW ────────────────────────────────────────── -->
        @if (viewMode() === 'table') {
          <!-- Breadcrumb: KB › Category › Folder -->
          @if (filterState['category']) {
            <div class="kb-breadcrumb-row">
              <nav class="kb-breadcrumb" aria-label="Breadcrumb">
                <button class="kb-crumb" (click)="clearCategoryFilter(); viewMode.set('grid')">Knowledge Base</button>
                <span class="kb-crumb-sep">›</span>
                <button class="kb-crumb" [class.kb-crumb-current]="!currentFolder()" (click)="closeFolder()">{{ filterState['category'] }}</button>
                @if (currentFolder()) {
                  <span class="kb-crumb-sep">›</span>
                  <span class="kb-crumb kb-crumb-current">{{ currentFolder()!.title }}</span>
                }
              </nav>
              <div class="kb-breadcrumb-actions">
                @if (currentFolder()) {
                  <button class="btn-text" (click)="closeFolder()">← Back to {{ filterState['category'] }}</button>
                }
              </div>
            </div>
          }

          <!-- Folders section (category root only, one level deep) -->
          @if (filterState['category'] && !currentFolder() && foldersInView().length > 0) {
            <div class="kb-folders-block">
              <div class="kb-section-label">
                <span>Folders</span>
                <span class="kb-section-sublabel">{{ foldersInView().length }}</span>
              </div>
              <div class="kb-folders-grid">
                @for (folder of foldersInView(); track folder.id) {
                  <div class="kb-folder-card" (click)="openFolder(folder)">
                    <div class="kb-folder-icon" [style.background]="getCategoryColor(folder.category) + '1A'" [style.color]="getCategoryColor(folder.category)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div class="kb-folder-body">
                      <div class="kb-folder-name">{{ folder.title }}</div>
                      <div class="kb-folder-meta">
                        {{ folderCount(folder.id) }} {{ folderCount(folder.id) === 1 ? 'item' : 'items' }}
                        @if (folder.updated) { <span class="kb-folder-dot">·</span> Updated {{ folder.updated }} }
                      </div>
                    </div>
                    @if (isAdmin()) {
                      <div class="kb-folder-actions">
                        <button class="icon-btn" title="Rename" (click)="renameFolder(folder, $event)">
                          <app-icon name="edit" [size]="12"></app-icon>
                        </button>
                        <button class="icon-btn danger" title="Delete folder" (click)="confirmDeleteFolder(folder); $event.stopPropagation()">
                          <app-icon name="trash" [size]="12"></app-icon>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Resources section heading (only when there are also folders OR we're in a folder) -->
          @if (filterState['category'] && (foldersInView().length > 0 || currentFolder())) {
            <div class="kb-section-label kb-section-label--resources">
              <span>{{ currentFolder() ? currentFolder()!.title + ' contents' : 'Files & resources' }}</span>
              <span class="kb-section-sublabel">{{ filteredDocs().length }}</span>
            </div>
          }

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40%">Title</th>
                  <th style="width: 12%">Category</th>
                  <th style="width: 10%">Type</th>
                  <th style="width: 13%">Author</th>
                  <th style="width: 10%">Updated</th>
                  <th style="width: 15%"></th>
                </tr>
              </thead>
              <tbody>
                @for (doc of filteredDocs(); track doc.id) {
                  <tr (click)="selectDoc(doc)" [class.selected]="selectedDoc()?.id === doc.id">
                    <td>
                      <div class="doc-entity">
                        <div class="doc-icon" [style.background]="getCategoryColor(doc.category)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div class="doc-entity-text">
                          <span class="doc-title" [innerHTML]="doc.title | highlight:filterState['search']"></span>
                          <span class="doc-desc">{{ doc.description }}</span>
                          @if (doc.fileName) {
                            <span class="file-badge">
                              <app-icon name="paperclip"></app-icon>
                              {{ doc.fileName }}
                            </span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class]="'badge-' + getCategoryBadge(doc.category)">{{ doc.category }}</span>
                    </td>
                    <td>
                      <span class="badge" [class]="'badge-' + getTypeBadge(doc.type)">{{ getTypeLabel(doc.type) }}</span>
                    </td>
                    <td>
                      <div class="author-cell">
                        <div class="author-avatar" [style.background]="teamUtil.getColor(doc.author)">
                          {{ doc.author.charAt(0) }}
                        </div>
                        <span>{{ doc.author }}</span>
                      </div>
                    </td>
                    <td class="text-muted">{{ doc.updated || '—' }}</td>
                    <td>
                      <div class="row-actions">
                        @if (doc.fileDataUrl) {
                          <a class="icon-btn" title="Download" [href]="doc.fileDataUrl" [download]="doc.fileName"
                             (click)="$event.stopPropagation()">
                            <app-icon name="download"></app-icon>
                          </a>
                        }
                        <button class="icon-btn" title="Send to Team Chat" (click)="openSendModal(doc); $event.stopPropagation()">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                          </svg>
                        </button>
                        @if (isAdmin()) {
                          <button class="icon-btn" title="Edit" (click)="editDoc(doc); $event.stopPropagation()">
                            <app-icon name="edit"></app-icon>
                          </button>
                          <button class="icon-btn danger" title="Delete" (click)="confirmDelete(doc); $event.stopPropagation()">
                            <app-icon name="trash"></app-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <div class="empty-icon"><app-icon name="{{ getEmptyIcon() }}"></app-icon></div>
                        <p>{{ currentFolder() ? 'This folder is empty' : getEmptyTitle() }}</p>
                        <span>{{ currentFolder() ? 'Upload a file or add a link to populate ' + currentFolder()!.title + '.' : getEmptySubtitle() }}</span>
                        @if (isAdmin() && filterState['category']) {
                          <div class="empty-actions">
                            <button class="btn-primary btn-sm" (click)="openUploadModal()">
                              <app-icon name="upload"></app-icon>
                              {{ currentFolder() ? 'Upload to folder' : 'Upload File' }}
                            </button>
                            @if (filterState['category'] === 'Useful Links') {
                              <button class="btn-secondary btn-sm" (click)="openCreateModal('link')">
                                <app-icon name="link"></app-icon>
                                Add Link
                              </button>
                            } @else if (!currentFolder()) {
                              <button class="btn-secondary btn-sm" (click)="openCreateModal('folder')">
                                <app-icon name="folder"></app-icon>
                                Create Folder
                              </button>
                            }
                          </div>
                        } @else if (!filterState['category']) {
                          <button class="inline-link" (click)="viewMode.set('grid')">Browse all categories</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

      </div>
    </div>

    <!-- ── Preview Modal ─────────────────────────────────────────── -->
    @if (selectedDoc()) {
      <div class="modal-overlay preview-overlay" (click)="selectedDoc.set(null)">
        <div class="preview-modal" (click)="$event.stopPropagation()">

          <div class="preview-modal-header">
            <div class="preview-modal-meta">
              <div class="preview-doc-icon" [style.background]="getCategoryColor(selectedDoc()!.category)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="preview-modal-title-group">
                <h2 class="preview-modal-title">{{ selectedDoc()!.title }}</h2>
                <div class="preview-modal-badges">
                  <span class="badge" [class]="'badge-' + getCategoryBadge(selectedDoc()!.category)">{{ selectedDoc()!.category }}</span>
                  <span class="badge" [class]="'badge-' + getTypeBadge(selectedDoc()!.type)">{{ getTypeLabel(selectedDoc()!.type) }}</span>
                  <span class="preview-meta-chip">
                    <div class="author-avatar sm" [style.background]="teamUtil.getColor(selectedDoc()!.author)">{{ selectedDoc()!.author.charAt(0) }}</div>
                    {{ selectedDoc()!.author }}
                  </span>
                  <span class="preview-meta-sep">·</span>
                  <span class="preview-meta-date">{{ selectedDoc()!.updated || '—' }}</span>
                </div>
              </div>
            </div>
            <div class="preview-modal-header-actions">
              <button class="preview-header-action" [class.active]="selectedDoc()!.pinned" (click)="togglePin(selectedDoc()!, $event)" [title]="selectedDoc()!.pinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'">
                <svg width="15" height="15" viewBox="0 0 24 24" [attr.fill]="selectedDoc()!.pinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><path d="M12 2l2.39 6.95H21.5l-5.89 4.28 2.25 6.92L12 15.9l-5.86 4.25 2.25-6.92L2.5 8.95h7.11z"/></svg>
              </button>
              <button class="preview-close-btn" (click)="selectedDoc.set(null)" title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="preview-modal-body">
            @if (selectedDoc()!.fileDataUrl) {
              <div class="preview-modal-file-bar">
                <app-icon [name]="getFileIcon(selectedDoc()!)"></app-icon>
                <span class="file-meta-name">{{ selectedDoc()!.fileName }}</span>
                <span class="file-size">{{ formatFileSize(selectedDoc()!.fileSize || 0) }}</span>
              </div>
              @if (isPdfFile(selectedDoc()!)) {
                <iframe [src]="getSafeUrl(selectedDoc()!.fileDataUrl!)" class="preview-modal-pdf"></iframe>
              } @else if (isImageFile(selectedDoc()!)) {
                <div class="preview-modal-image-wrap">
                  <img [src]="selectedDoc()!.fileDataUrl" class="preview-modal-image" [alt]="selectedDoc()!.fileName">
                </div>
              } @else if (isTextFile(selectedDoc()!)) {
                <pre class="preview-modal-text">{{ decodeTextFromDataUrl(selectedDoc()!.fileDataUrl!) }}</pre>
              } @else {
                <div class="preview-modal-unavailable">
                  <div class="preview-unavail-icon">
                    <app-icon name="file-text"></app-icon>
                  </div>
                  <p>Preview not available</p>
                  <span>{{ selectedDoc()!.fileName }} — this format cannot be previewed in the browser.</span>
                  <a [href]="selectedDoc()!.fileDataUrl" [download]="selectedDoc()!.fileName"
                     class="btn-secondary btn-sm" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 6px;">
                    <app-icon name="download"></app-icon>
                    Download to open
                  </a>
                </div>
              }
            } @else if (selectedDoc()!.type === 'link' && selectedDoc()!.url) {
              <div class="preview-modal-link">
                <div class="link-preview-icon">
                  <app-icon name="link"></app-icon>
                </div>
                <a [href]="selectedDoc()!.url" target="_blank" rel="noopener noreferrer" class="link-preview-url">
                  {{ selectedDoc()!.url }}
                </a>
                @if (selectedDoc()!.content) {
                  <p class="link-preview-notes">{{ selectedDoc()!.content }}</p>
                }
                <a [href]="selectedDoc()!.url" target="_blank" rel="noopener noreferrer"
                   class="btn-primary btn-sm" style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 6px;">
                  <app-icon name="external-link"></app-icon>
                  Open Link
                </a>
              </div>
            } @else if (selectedDoc()!.type === 'folder') {
              <div class="preview-modal-empty">
                <div class="preview-unavail-icon"><app-icon name="folder"></app-icon></div>
                <p>Folder</p>
                <span>Folders help organize related files. Click items inside to preview them.</span>
              </div>
            } @else if (selectedDoc()!.content) {
              <pre class="preview-modal-text preview-modal-content">{{ selectedDoc()!.content }}</pre>
            } @else {
              <!-- Graceful fallback: metadata-rich card rather than a blank modal -->
              <div class="preview-meta-card">
                <div class="preview-meta-icon" [style.background]="getCategoryColor(selectedDoc()!.category) + '1A'" [style.color]="getCategoryColor(selectedDoc()!.category)">
                  <app-icon [name]="getFileIcon(selectedDoc()!)"></app-icon>
                </div>
                <div class="preview-meta-body">
                  <div class="preview-meta-title">{{ selectedDoc()!.fileName || selectedDoc()!.title }}</div>
                  <div class="preview-meta-chips">
                    <span class="preview-meta-chip">{{ selectedDoc()!.category }}</span>
                    @if (selectedDoc()!.fileType) {
                      <span class="preview-meta-chip mono">{{ fileKindLabel(selectedDoc()!) }}</span>
                    }
                    @if (selectedDoc()!.fileSize) {
                      <span class="preview-meta-chip mono">{{ formatFileSize(selectedDoc()!.fileSize!) }}</span>
                    }
                    @if (selectedDoc()!.version) {
                      <span class="preview-meta-chip">v{{ selectedDoc()!.version }}</span>
                    }
                  </div>
                  <p class="preview-meta-note">
                    @if (selectedDoc()!.fileDataUrl) {
                      Preview is not available for this format — use <strong>Download</strong> to open it locally, or <strong>Send to Chat</strong> to share it with the team.
                    } @else {
                      No file attached yet. You can add one via Edit, attach a link, or write content inline.
                    }
                  </p>
                  @if (selectedDoc()!.notes) {
                    <div class="preview-meta-notes-block">
                      <div class="preview-meta-notes-label">Notes</div>
                      <p>{{ selectedDoc()!.notes }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Team comments on this resource -->
          <div class="preview-modal-comments">
            <h4 class="preview-modal-comments-title">Team comments</h4>
            <app-comment-thread
              [comments]="selectedDoc()!.comments || []"
              [currentAuthor]="currentUser()"
              placeholder="Add a note on this resource…"
              emptyTitle="No comments yet"
              emptySubtitle="Leave a note — ideas, edits, context for your teammates."
              (submitNote)="addKBComment($event)"
            ></app-comment-thread>
          </div>

          <div class="preview-modal-footer">
            @if (selectedDoc()!.description) {
              <p class="preview-modal-desc">{{ selectedDoc()!.description }}</p>
            }
            <div class="preview-footer-actions">
              <button class="preview-send-btn" (click)="openSendModal(selectedDoc()!); selectedDoc.set(null)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
                Send to Chat
              </button>
              @if (selectedDoc()!.fileDataUrl) {
                <a [href]="selectedDoc()!.fileDataUrl" [download]="selectedDoc()!.fileName"
                   class="preview-download-link">
                  <app-icon name="download"></app-icon>
                  Download
                </a>
              }
            </div>
          </div>

        </div>
      </div>
    }

    <!-- ── New / Edit Modal ──────────────────────────────────────── -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-container modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingDoc() ? 'Edit' : docForm.type === 'file' ? 'Upload' : docForm.type === 'link' ? 'Add' : docForm.type === 'folder' ? 'Create' : 'New' }} {{ getTypeLabel(docForm.type) }}</h2>
            <button class="modal-close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            @if (docForm.type !== 'file' && docForm.type !== 'link' && docForm.type !== 'folder') {
              <div class="form-group">
                <label class="form-label">Type</label>
                <div class="type-toggle">
                  <button type="button" [class.active]="docForm.type === 'document'" (click)="docForm.type = 'document'">
                    <app-icon name="file-text"></app-icon>
                    Document
                  </button>
                  <button type="button" [class.active]="docForm.type === 'playbook'" (click)="docForm.type = 'playbook'">
                    <app-icon name="book-open"></app-icon>
                    Playbook
                  </button>
                  <button type="button" [class.active]="docForm.type === 'template'" (click)="docForm.type = 'template'">
                    <app-icon name="layout"></app-icon>
                    Template
                  </button>
                </div>
              </div>
            }

            <div class="form-group">
              <label class="form-label">Title <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="docForm.title" placeholder="{{ docForm.type === 'folder' ? 'Folder name...' : docForm.type === 'link' ? 'Link title...' : 'Enter title...' }}">
            </div>

            @if (docForm.type === 'link' || isLinkCategory(docForm.category)) {
              <div class="form-group">
                <label class="form-label">URL <span class="required">*</span></label>
                <input type="url" class="form-input" [(ngModel)]="docForm.url" placeholder="https://example.com">
                @if (isLinkCategory(docForm.category) && docForm.type !== 'link') {
                  <p class="form-hint">Useful Links resources need a destination URL. File upload is optional.</p>
                }
              </div>
            }

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" [(ngModel)]="docForm.category" (ngModelChange)="onFormCategoryChange($event)">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
                @if (categoryUploadHint(docForm.category)) {
                  <p class="form-hint">{{ categoryUploadHint(docForm.category) }}</p>
                }
              </div>
              <div class="form-group">
                <label class="form-label">Author</label>
                <select class="form-select" [(ngModel)]="docForm.author">
                  @for (member of team; track member.id) {
                    <option [value]="member.name">{{ member.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="docForm.description" placeholder="Brief summary...">
            </div>

            <!-- Folder assignment (only when not creating a folder itself) -->
            @if (docForm.type !== 'folder' && foldersForCategory(docForm.category).length > 0) {
              <div class="form-group">
                <label class="form-label">Folder <span class="optional">(optional)</span></label>
                <select class="form-select" [(ngModel)]="docForm.parentFolder">
                  <option [ngValue]="undefined">— No folder (category root) —</option>
                  @for (f of foldersForCategory(docForm.category); track f.id) {
                    <option [ngValue]="f.id">{{ f.title }}</option>
                  }
                </select>
              </div>
            }

            <!-- File Upload (not for folders; optional for Useful Links) -->
            @if (docForm.type !== 'folder' && docForm.type !== 'link') {
              <div class="form-group">
                <label class="form-label">
                  {{ docForm.type === 'file' ? 'File' : 'Attachment' }}
                  @if (isLinkCategory(docForm.category)) {
                    <span class="optional">(optional)</span>
                  }
                </label>
                @if (fileReading()) {
                  <div class="upload-reading">
                    <div class="upload-spinner"></div>
                    <span>Reading file…</span>
                  </div>
                } @else if (docForm.fileName) {
                  <div class="file-attached">
                    <div class="file-info">
                      <app-icon name="paperclip"></app-icon>
                      <span>{{ docForm.fileName }}</span>
                      <span class="file-size">{{ formatFileSize(docForm.fileSize || 0) }}</span>
                    </div>
                    <button type="button" class="remove-file" (click)="removeFile()">
                      <app-icon name="x"></app-icon>
                    </button>
                  </div>
                } @else {
                  <div class="upload-zone" (click)="fileInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
                    <app-icon name="upload"></app-icon>
                    <p>Drag & drop a file here or click to browse</p>
                    <span>{{ categoryUploadHint(docForm.category) }}</span>
                    <input #fileInput type="file" hidden (change)="onFileSelected($event)"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.json,.csv,.tsv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.tar,.gz,.rar,.7z,.html,.htm,.yaml,.yml,.skill,.prompt,.py,.js,.ts,.sh,.sql,.xml,.toml,.cfg,.ini,.env,.conf">
                  </div>
                }
              </div>
            }

            <!-- Notes — shown for link resources + archive categories where it helps explain what's inside -->
            @if (docForm.type === 'link' || isLinkCategory(docForm.category) || isArchiveCategory(docForm.category)) {
              <div class="form-group">
                <label class="form-label">Notes <span class="optional">(optional)</span></label>
                <textarea class="form-textarea" rows="3" [(ngModel)]="docForm.notes"
                  [placeholder]="isLinkCategory(docForm.category) ? 'Why is this link useful? Any context?' : 'What is in this package? Usage notes, version, intended audience.'"></textarea>
              </div>
            }

            @if (docForm.type !== 'folder' && docForm.type !== 'file') {
              <div class="form-group">
                <label class="form-label">Content <span class="optional">(optional{{ docForm.type === 'link' ? '' : ' if file attached' }})</span></label>
                <textarea class="form-textarea content-area" [(ngModel)]="docForm.content" rows="8" placeholder="{{ docForm.type === 'link' ? 'Notes about this link...' : 'Document content...' }}"></textarea>
              </div>
            }

            @if (editingDoc()) {
              <app-activity-timeline entityType="kb" [entityId]="editingDoc()!.id"></app-activity-timeline>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="saveDoc()" [disabled]="!docForm.title || (docForm.type === 'link' && !docForm.url) || (docForm.type === 'file' && !docForm.fileName)">
              {{ editingDoc() ? 'Update' : docForm.type === 'file' ? 'Upload' : docForm.type === 'link' ? 'Save' : 'Create' }} {{ getTypeLabel(docForm.type) }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Delete Confirmation ───────────────────────────────────── -->
    @if (deletingDoc()) {
      <div class="modal-overlay" (click)="deletingDoc.set(null)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Delete {{ getTypeLabel(deletingDoc()!.type) }}?</h2>
            <button class="modal-close-btn" (click)="deletingDoc.set(null)">&times;</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete "{{ deletingDoc()!.title }}"?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="deletingDoc.set(null)">Cancel</button>
            <button class="btn-danger" (click)="deleteDoc()">Delete</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Send to Team Chat Modal ───────────────────────────────── -->
    @if (showSendModal()) {
      <div class="modal-overlay" (click)="showSendModal.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Send to Team Chat</h2>
            <button class="modal-close-btn" (click)="showSendModal.set(false)">&times;</button>
          </div>
          <div class="modal-body">
            @if (sendingDoc()) {
              <div class="send-doc-preview">
                <div class="doc-icon-sm" [style.background]="getCategoryColor(sendingDoc()!.category)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div class="send-doc-title">{{ sendingDoc()!.title }}</div>
                  <div class="send-doc-meta">{{ sendingDoc()!.category }} · {{ getTypeLabel(sendingDoc()!.type) }}</div>
                </div>
              </div>
            }
            <p class="send-label">Choose recipient</p>
            <div class="send-members">
              @for (member of sendableTeam(); track member.id) {
                <button class="send-member-btn" [class.selected]="sendTarget() === member.name"
                        (click)="sendTarget.set(member.name)">
                  <div class="author-avatar" [style.background]="teamUtil.getColor(member.name)">
                    {{ member.name.charAt(0) }}
                  </div>
                  <div class="member-info">
                    <div class="member-name">{{ member.name }}</div>
                    <div class="member-role">{{ member.role }}</div>
                  </div>
                  @if (sendTarget() === member.name) {
                    <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  }
                </button>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="showSendModal.set(false)">Cancel</button>
            <button class="btn-primary send-confirm-btn" [disabled]="!sendTarget()" (click)="sendToChat()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
              </svg>
              Send
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    .kb-root {
      padding: 1.5rem;
      min-height: 0;
    }

    /* The single inner "card" that holds toolbar + content should not
       impose its own height — let content determine height and the host scroll. */
    .table-card {
      display: flex;
      flex-direction: column;
    }

    /* ─── Toolbar ──────────────────────────────────────────────── */
    .kb-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
    }

    .kb-toolbar-left {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }

    .kb-toolbar h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .doc-count {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .kb-toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* ─── View Toggle ──────────────────────────────────────────── */
    .view-toggle {
      display: flex;
      gap: 2px;
      padding: 2px;
      background: var(--color-gray-100);
      border-radius: var(--radius-md);
    }

    .view-btn {
      width: 32px;
      height: 28px;
      border: none;
      background: none;
      border-radius: var(--radius);
      color: var(--color-gray-500);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .view-btn:hover {
      color: var(--color-gray-700);
    }

    .view-btn.active {
      background: white;
      color: var(--color-gray-900);
      box-shadow: var(--card-shadow);
    }

    /* ─── Tile Grid View ───────────────────────────────────────── */
    .kb-tiles-wrapper {
      padding: 1.25rem 1.5rem 1.75rem;
    }

    /* Home overview — Quick Access + Recently Added + Popular */
    .kb-home-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .kb-overview-col {
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 120px;
    }
    .kb-overview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-hairline);
    }
    .kb-overview-header h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-gray-700);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kb-overview-count {
      font-size: 11px;
      color: var(--color-gray-400);
      font-weight: 500;
    }
    .kb-overview-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-400);
      font-size: 12px;
      padding: 12px;
      text-align: center;
    }
    .kb-overview-empty p { margin: 0; }
    .kb-resource-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kb-resource-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s;
    }
    .kb-resource-row:hover {
      background: var(--color-gray-50);
      border-color: var(--border-hairline);
    }
    .kb-resource-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kb-resource-body { flex: 1; min-width: 0; }
    .kb-resource-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kb-resource-sub {
      font-size: 11px;
      color: var(--color-gray-500);
      display: flex;
      gap: 4px;
      align-items: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kb-resource-cat { color: var(--color-gray-600); font-weight: 500; }
    .kb-resource-dot { color: var(--color-gray-300); }
    .kb-resource-pin,
    .kb-resource-unpin {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: var(--color-gray-300);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .kb-resource-row:hover .kb-resource-pin,
    .kb-resource-row:hover .kb-resource-unpin { opacity: 1; }
    .kb-resource-pin.active { color: #D97706; opacity: 1; }
    .kb-resource-pin:hover { color: #D97706; background: #FEF3C7; }
    .kb-resource-unpin:hover { color: var(--color-error-hover); background: #FEF2F2; }

    .kb-section-heading {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 12px;
      padding: 0 2px;
    }
    .kb-section-heading span:first-child {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-gray-700);
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    .kb-section-subheading {
      font-size: 12px;
      color: var(--color-gray-400);
    }

    /* Metadata fallback card in preview modal */
    .preview-meta-card {
      display: flex;
      gap: 20px;
      padding: 32px;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      margin: 0 auto;
      max-width: 620px;
      align-items: flex-start;
    }
    .preview-meta-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .preview-meta-icon app-icon :is(svg) { width: 24px; height: 24px; }
    .preview-meta-body { flex: 1; min-width: 0; }
    .preview-meta-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-gray-900);
      margin-bottom: 10px;
      word-break: break-word;
    }
    .preview-meta-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .preview-meta-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-gray-600);
    }
    .preview-meta-chip.mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .preview-meta-note {
      font-size: 13px;
      color: var(--color-gray-600);
      line-height: 1.5;
      margin: 0;
    }
    .preview-meta-notes-block {
      margin-top: 14px;
      padding: 12px 14px;
      background: white;
      border-radius: 8px;
      border: 1px solid var(--border-hairline);
    }
    .preview-meta-notes-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--color-gray-400);
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .preview-meta-notes-block p { margin: 0; font-size: 13px; color: var(--color-gray-700); line-height: 1.5; }

    /* Form hint + header actions */
    .form-hint { font-size: 12px; color: var(--color-gray-500); margin: 6px 0 0; line-height: 1.4; }
    .preview-modal-header-actions { display: flex; align-items: center; gap: 6px; }
    .preview-header-action {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border-hairline);
      background: white;
      border-radius: 6px;
      cursor: pointer;
      color: var(--color-gray-500);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .preview-header-action:hover { color: #D97706; background: #FEF3C7; border-color: #FDE68A; }
    .preview-header-action.active { color: #D97706; background: #FEF3C7; border-color: #FDE68A; }

    .preview-modal-comments { padding: 16px 24px; border-top: 1px solid var(--color-border); background: var(--color-gray-50); }
    .preview-modal-comments-title { margin: 0 0 10px; font-size: 12px; font-weight: 600; color: var(--color-gray-600); text-transform: uppercase; letter-spacing: 0.4px; }

    /* Breadcrumb + Folders section */
    .kb-breadcrumb-row { padding: 16px 1.5rem 4px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .kb-breadcrumb { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .kb-crumb { background: none; border: none; padding: 4px 6px; color: var(--color-gray-500); font-size: 13px; cursor: pointer; border-radius: 4px; }
    .kb-crumb:hover { color: var(--color-gray-900); background: var(--color-gray-100); }
    .kb-crumb-current { color: var(--color-gray-900); font-weight: 600; cursor: default; }
    .kb-crumb-current:hover { background: transparent; }
    .kb-crumb-sep { color: var(--color-gray-300); font-size: 14px; }
    .kb-breadcrumb-actions .btn-text { background: none; border: none; color: var(--color-gray-600); font-size: 13px; cursor: pointer; padding: 4px 8px; }
    .kb-breadcrumb-actions .btn-text:hover { color: var(--color-gray-900); }

    .kb-folders-block { padding: 12px 1.5rem 4px; }
    .kb-section-label { display: flex; align-items: baseline; gap: 8px; padding: 6px 2px 10px; }
    .kb-section-label > span:first-child { font-size: 11px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--color-gray-500); }
    .kb-section-sublabel { font-size: 11px; color: var(--color-gray-400); }
    .kb-section-label--resources { padding: 16px 1.5rem 10px; }

    .kb-folders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    .kb-folder-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      position: relative;
    }
    .kb-folder-card:hover {
      border-color: var(--color-gray-300);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .kb-folder-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kb-folder-body { flex: 1; min-width: 0; }
    .kb-folder-name { font-size: 14px; font-weight: 500; color: var(--color-gray-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kb-folder-meta { font-size: 11px; color: var(--color-gray-500); margin-top: 2px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .kb-folder-dot { color: var(--color-gray-300); }
    .kb-folder-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
    .kb-folder-card:hover .kb-folder-actions { opacity: 1; }
    .dropdown-divider { height: 1px; background: var(--border-hairline); margin: 4px 0; }

    .kb-tiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }

    .kb-tile {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 1rem 1.25rem;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-lg);
      background: white;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .kb-tile:hover {
      border-color: var(--color-gray-300);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .kb-tile-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kb-tile-content {
      flex: 1;
      min-width: 0;
    }

    .kb-tile-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .kb-tile-count {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      margin-top: 2px;
    }

    .kb-tile-arrow {
      color: var(--color-gray-300);
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .kb-tile:hover .kb-tile-arrow {
      color: var(--color-gray-500);
      transform: translateX(3px);
    }

    /* ─── Filter Breadcrumb ────────────────────────────────────── */
    .filter-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.625rem 1.5rem;
      background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
      font-size: 0.8125rem;
    }

    .breadcrumb-label {
      color: var(--color-gray-500);
    }

    .breadcrumb-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 6px 2px 8px;
      background: #EBF5FF;
      border: 1px solid var(--color-info-light);
      border-radius: var(--radius);
      color: var(--color-primary-hover);
      font-weight: 500;
    }

    .breadcrumb-clear {
      border: none;
      background: none;
      color: #93C5FD;
      cursor: pointer;
      padding: 1px;
      border-radius: 3px;
      display: flex;
      align-items: center;
    }

    .breadcrumb-clear:hover {
      color: var(--color-primary-hover);
    }

    .breadcrumb-grid-link {
      border: none;
      background: none;
      color: var(--color-gray-400);
      font-size: 0.8125rem;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;
    }

    .breadcrumb-grid-link:hover {
      color: var(--color-gray-700);
    }

    /* ─── Document entity cell ─────────────────────────────────── */
    .doc-entity {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .doc-icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .doc-entity-text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .doc-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .doc-desc {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }

    .file-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      background: var(--color-gray-100);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      color: var(--color-gray-600);
      width: fit-content;
    }

    /* ─── Author cell ──────────────────────────────────────────── */
    .author-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--color-gray-700);
    }

    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.6875rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .author-avatar.sm {
      width: 20px;
      height: 20px;
      font-size: 0.625rem;
    }

    /* ─── Row actions ──────────────────────────────────────────── */
    .row-actions {
      display: flex;
      gap: 4px;
      justify-content: flex-end;
    }

    .icon-btn {
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-gray-400);
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    .icon-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .icon-btn.danger:hover {
      background: var(--color-error-light);
      color: var(--color-error-hover);
    }

    /* ─── Table tweaks ─────────────────────────────────────────── */
    .data-table tbody tr {
      cursor: pointer;
    }

    .data-table tbody tr:hover {
      background: var(--color-gray-50);
    }

    .data-table tbody tr.selected {
      background: var(--status-blue-bg);
    }

    .text-muted {
      font-size: 0.8125rem;
      color: var(--color-gray-500);
    }

    /* ─── Inline link in empty state ───────────────────────────── */
    .inline-link {
      border: none;
      background: none;
      color: var(--color-primary);
      cursor: pointer;
      font-size: inherit;
      padding: 0;
      text-decoration: underline;
    }

    /* ─── Empty State ──────────────────────────────────────────── */
    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      color: var(--color-gray-300);
    }

    .empty-state p {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .empty-state span {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    /* ─── Dropdown ─────────────────────────────────────────────── */
    .dropdown {
      position: relative;
    }

    .dropdown .btn-primary {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      min-width: 160px;
      z-index: 100;
      display: none;
    }

    .dropdown.open .dropdown-menu {
      display: block;
    }

    .dropdown-menu button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.625rem 1rem;
      border: none;
      background: none;
      font-size: 0.875rem;
      color: var(--color-gray-700);
      cursor: pointer;
      text-align: left;
    }

    .dropdown-menu button:hover {
      background: var(--color-gray-50);
    }

    .dropdown-menu button:first-child { border-radius: var(--radius-md) var(--radius-md) 0 0; }
    .dropdown-menu button:last-child { border-radius: 0 0 var(--radius-md) var(--radius-md); }

    /* ─── Modal ────────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-container {
      background: white;
      border-radius: var(--radius-lg);
      width: 90%;
      max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-container.modal-lg {
      max-width: 640px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-hairline);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .modal-close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      font-size: 1.25rem;
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius);
    }

    .modal-close-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-hairline);
    }

    /* ─── Form ─────────────────────────────────────────────────── */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .required { color: var(--color-error-hover); }
    .optional { font-weight: 400; color: var(--color-gray-400); }

    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }

    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
    }

    .content-area {
      font-family: monospace;
      font-size: 0.8125rem;
      resize: vertical;
    }

    /* ─── Type Toggle ──────────────────────────────────────────── */
    .type-toggle {
      display: flex;
      gap: 8px;
    }

    .type-toggle button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border-hairline);
      background: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-600);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .type-toggle button:hover {
      border-color: var(--color-gray-300);
    }

    .type-toggle button.active {
      border-color: var(--color-primary);
      background: var(--status-blue-bg);
      color: var(--color-primary);
    }

    /* ─── Upload Zone ──────────────────────────────────────────── */
    .upload-zone {
      border: 2px dashed var(--border-hairline);
      border-radius: var(--radius-md);
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .upload-zone:hover {
      border-color: var(--color-primary);
      background: #F8FAFC;
    }

    .upload-zone p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-gray-600);
    }

    .upload-zone span {
      display: block;
      margin-top: 4px;
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    .file-attached {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--color-gray-700);
    }

    .file-size {
      color: var(--color-gray-400);
    }

    .remove-file {
      padding: 4px;
      border: none;
      background: none;
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius-sm);
    }

    .remove-file:hover {
      background: var(--color-error-light);
      color: var(--color-error-hover);
    }

    .upload-reading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 1rem;
      background: var(--color-gray-50);
      border: 1px dashed var(--border-hairline);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .upload-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--color-gray-200);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── Page-level dropzone ─────────────────────────────────── */
    .page-dropzone {
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(26, 86, 219, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .page-dropzone-inner {
      background: var(--color-surface);
      border: 3px dashed var(--color-primary);
      border-radius: var(--radius-lg);
      padding: 3rem 4rem;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .page-dropzone-inner app-icon { font-size: 2rem; color: var(--color-primary); }
    .page-dropzone-inner p { margin: 0.75rem 0 0; font-size: 1rem; font-weight: 600; color: var(--color-text-primary); }
    .page-dropzone-inner span { font-size: 0.8125rem; color: var(--color-gray-500); }

    /* ─── Empty state actions ─────────────────────────────────── */
    .empty-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* ─── Link preview ────────────────────────────────────────── */
    .preview-modal-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      text-align: center;
    }
    .link-preview-icon { width: 48px; height: 48px; background: var(--color-gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-primary); margin-bottom: 1rem; }
    .link-preview-url { font-size: 0.875rem; color: var(--color-primary); word-break: break-all; text-decoration: underline; }
    .link-preview-notes { margin-top: 1rem; font-size: 0.8125rem; color: var(--color-gray-600); max-width: 400px; }

    /* ─── Buttons ──────────────────────────────────────────────── */
    .btn-primary {
      padding: 0.625rem 1rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-primary:hover {
      background: #1648B8;
    }

    .btn-primary:disabled {
      background: var(--color-gray-300);
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.625rem 1rem;
      background: white;
      color: var(--color-gray-700);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-secondary:hover {
      background: var(--color-gray-50);
      border-color: var(--color-gray-300);
    }

    .btn-danger {
      padding: 0.625rem 1rem;
      background: var(--color-error-hover);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-danger:hover {
      background: #B91C1C;
    }

    .btn-sm {
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem;
    }

    .warning-text {
      color: var(--color-error-hover);
      font-size: 0.875rem;
    }

    /* ─── Badge ────────────────────────────────────────────────── */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-blue    { background: #DBEAFE; color: var(--color-primary-hover); }
    .badge-green   { background: #D1FAE5; color: #065F46; }
    .badge-purple  { background: #EDE9FE; color: #5B21B6; }
    .badge-orange  { background: #FFEDD5; color: #C2410C; }
    .badge-cyan    { background: #CFFAFE; color: #0E7490; }
    .badge-yellow  { background: var(--color-warning-light); color: #B45309; }
    .badge-gray    { background: var(--color-gray-100); color: var(--color-gray-600); }
    .badge-pink    { background: #FCE7F3; color: #9D174D; }
    .badge-indigo  { background: #E0E7FF; color: #3730A3; }

    /* ─── Preview Modal ────────────────────────────────────────── */
    .preview-overlay {
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
    }

    .preview-modal {
      background: white;
      border-radius: var(--radius-xl);
      width: 92vw;
      max-width: 920px;
      height: 88vh;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }

    .preview-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-hairline);
      flex-shrink: 0;
      gap: 1rem;
    }

    .preview-modal-meta {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    .preview-doc-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .preview-modal-title-group {
      min-width: 0;
      flex: 1;
    }

    .preview-modal-title {
      margin: 0 0 6px;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-modal-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .preview-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8125rem;
      color: var(--color-gray-600);
    }

    .preview-meta-sep { color: var(--color-gray-300); font-size: 0.8125rem; }
    .preview-meta-date { font-size: 0.8125rem; color: var(--color-gray-500); }

    .preview-close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: none;
      color: var(--color-gray-400);
      cursor: pointer;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .preview-close-btn:hover {
      background: var(--color-gray-100);
      color: var(--color-gray-700);
    }

    .preview-modal-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .preview-modal-file-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0.625rem 1.25rem;
      background: var(--color-gray-50);
      border-bottom: 1px solid var(--border-hairline);
      font-size: 0.8125rem;
      color: var(--color-gray-600);
      flex-shrink: 0;
    }

    .file-meta-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
      color: var(--color-gray-800);
    }

    .preview-modal-pdf {
      flex: 1;
      width: 100%;
      border: none;
      display: block;
      background: #f5f5f5;
      min-height: 500px;
    }

    .preview-modal-text {
      flex: 1;
      font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
      font-size: 0.8125rem;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
      background: #FAFAFA;
      padding: 1.5rem;
      overflow-y: auto;
      margin: 0;
      color: var(--color-gray-800);
      min-height: 0;
    }

    .preview-modal-content {
      font-family: inherit;
      font-size: 0.9375rem;
      line-height: 1.7;
    }

    .preview-modal-image-wrap {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--color-gray-50);
    }

    .preview-modal-image {
      max-width: 100%;
      max-height: 100%;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
    }

    .preview-modal-unavailable,
    .preview-modal-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 3rem 2rem;
      text-align: center;
      color: var(--color-gray-500);
    }

    .preview-unavail-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-xl);
      background: var(--color-gray-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-gray-400);
      margin-bottom: 0.5rem;
    }

    .preview-modal-unavailable p,
    .preview-modal-empty p {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-gray-700);
    }

    .preview-modal-unavailable span,
    .preview-modal-empty span {
      font-size: 0.875rem;
      color: var(--color-gray-400);
      max-width: 340px;
    }

    .preview-modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
      padding: 0.875rem 1.5rem;
      border-top: 1px solid var(--border-hairline);
      flex-shrink: 0;
      background: var(--color-gray-50);
    }

    .preview-modal-desc {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-gray-500);
      line-height: 1.5;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: auto;
    }

    .preview-footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .preview-send-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      background: white;
      color: var(--color-gray-700);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .preview-send-btn:hover {
      background: var(--status-blue-bg);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .preview-download-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      background: white;
      color: var(--color-gray-700);
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .preview-download-link:hover {
      background: var(--color-gray-50);
      border-color: var(--color-gray-300);
      color: var(--color-gray-900);
    }

    /* ─── Send to Chat modal ───────────────────────────────────── */
    .send-doc-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.875rem 1rem;
      background: var(--color-gray-50);
      border: 1px solid var(--border-hairline);
      border-radius: var(--radius-md);
      margin-bottom: 1.25rem;
    }

    .doc-icon-sm {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .send-doc-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .send-doc-meta {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      margin-top: 2px;
    }

    .send-label {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .send-members {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 320px;
      overflow-y: auto;
    }

    .send-member-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.625rem 0.875rem;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: white;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: all 0.15s ease;
    }

    .send-member-btn:hover {
      background: var(--color-gray-50);
      border-color: var(--border-hairline);
    }

    .send-member-btn.selected {
      background: var(--status-blue-bg);
      border-color: var(--color-primary);
    }

    .member-info {
      flex: 1;
      min-width: 0;
    }

    .member-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-gray-900);
    }

    .member-role {
      font-size: 0.75rem;
      color: var(--color-gray-500);
      margin-top: 1px;
    }

    .check-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .send-confirm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* ─── Responsive ───────────────────────────────────────────── */
    @media (max-width: 768px) {

      /* ── Layout ── */
      .kb-root { padding: 0.75rem; }

      /* ── Toolbar ── */
      .kb-toolbar {
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
      }

      .kb-toolbar-left {
        flex: 1 1 100%;
        justify-content: space-between;
      }

      .kb-toolbar-right {
        flex: 1 1 100%;
        justify-content: space-between;
      }

      /* View toggle buttons: touch-friendly */
      .view-btn {
        width: 40px;
        height: 40px;
        min-height: 40px;
      }

      /* "New" dropdown button */
      .btn-primary.btn-sm {
        min-height: 40px;
        padding: 0.5rem 0.875rem;
      }

      /* Filter bar: scrollable row */
      app-filter-bar {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        display: block;
      }

      /* Search input fills available width */
      app-filter-bar input[type="text"],
      app-filter-bar input[type="search"] {
        width: 100%;
        min-width: 0;
      }

      /* ── Tile / Grid view: max 2 columns ── */
      .kb-tiles-wrapper {
        padding: 0.875rem 1rem 1.25rem;
      }

      .kb-tiles-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .kb-tile {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        padding: 0.875rem 1rem;
        min-height: 64px;
      }

      .kb-tile-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
      }

      .kb-tile-arrow {
        display: none;
      }

      /* ── Table / List view: card layout ── */
      .table-scroll {
        overflow: visible;
        flex: none;
        min-height: auto;
      }

      .data-table {
        display: block;
        width: 100%;
      }

      .data-table thead { display: none; }

      .data-table tbody { display: block; }

      .data-table tbody tr {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 1rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        margin-bottom: 10px;
        background: var(--color-surface);
        box-shadow: var(--card-shadow);
        min-height: auto;
        cursor: pointer;
      }

      .data-table tbody tr:hover {
        background: var(--color-surface-hover);
      }

      /* Hide secondary columns; keep title, category, date, actions */
      .data-table td {
        display: none;
        padding: 0;
        border: none;
        white-space: normal;
        overflow: visible;
        height: auto;
        text-overflow: unset;
      }
      .data-table td:nth-child(1),
      .data-table td:nth-child(2),
      .data-table td:nth-child(5),
      .data-table td:nth-child(6) {
        display: block;
      }

      /* Title cell: full width, ensure content visible */
      .data-table td:nth-child(1) {
        width: 100%;
      }
      .doc-entity {
        gap: 10px;
      }
      .doc-icon {
        min-width: 32px;
        min-height: 32px;
        width: 32px;
        height: 32px;
      }
      .doc-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text-primary);
      }
      .doc-desc {
        max-width: 100%;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--color-gray-500);
      }

      /* Category badge: inline */
      .data-table td:nth-child(2) {
        margin-top: 2px;
      }

      /* Date cell: small muted text */
      .data-table td:nth-child(5) {
        font-size: 0.75rem;
        color: var(--color-gray-400);
      }

      /* Row actions: align left on mobile */
      .data-table td:nth-child(6) .row-actions {
        justify-content: flex-start;
      }

      /* All icon buttons: touch-friendly */
      .icon-btn {
        min-height: 40px;
        min-width: 40px;
        padding: 8px;
      }

      /* ── Filter breadcrumb ── */
      .filter-breadcrumb {
        flex-wrap: wrap;
        gap: 6px;
        padding: 0.625rem 1rem;
      }

      /* ── Preview Modal: full-screen on mobile ── */
      .preview-overlay {
        align-items: flex-end;
      }

      .preview-modal {
        width: 100vw;
        max-width: 100vw;
        height: 95vh;
        max-height: 95vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        box-shadow: var(--shadow-lg);
      }

      .preview-modal-header {
        padding: 1rem;
        position: sticky;
        top: 0;
        z-index: 10;
        background: white;
      }

      /* Close button: prominent and touch-friendly */
      .preview-close-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        background: var(--color-gray-100);
        color: var(--color-gray-700);
        border-radius: 50%;
      }

      .preview-modal-body {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .preview-modal-title {
        font-size: 1rem;
        white-space: normal;
      }

      .preview-modal-footer {
        padding: 0.75rem 1rem;
        flex-wrap: wrap;
        gap: 8px;
      }

      .preview-modal-desc {
        flex: 1 1 100%;
        white-space: normal;
        font-size: 0.8125rem;
      }

      .preview-footer-actions {
        flex: 1 1 100%;
        justify-content: flex-end;
      }

      /* Footer action buttons: touch-friendly */
      .preview-send-btn,
      .preview-download-link {
        min-height: 44px;
        padding: 0.625rem 1rem;
      }

      /* ── Form modals: full-screen on mobile ── */
      .modal-container {
        width: 100%;
        max-width: 100%;
        max-height: 92vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        margin: 0;
      }

      .modal-overlay {
        align-items: flex-end;
      }

      .modal-body {
        padding: 1.25rem 1rem;
      }

      .modal-footer {
        padding: 0.875rem 1rem;
      }

      /* Form row: stack vertically */
      .form-row {
        grid-template-columns: 1fr;
      }

      /* Type toggle: stack on small screens */
      .type-toggle {
        flex-wrap: wrap;
      }

      .type-toggle button {
        flex: 1 1 calc(50% - 4px);
        min-height: 44px;
      }

      /* Buttons: touch-friendly */
      .btn-primary,
      .btn-secondary,
      .btn-danger {
        min-height: 44px;
      }

      /* Send-member list: comfortable touch targets */
      .send-member-btn {
        min-height: 48px;
        padding: 0.75rem 0.875rem;
      }
    }
  `]
})
export class KbListComponent implements OnInit {
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  dataService = inject(ApiService);
  private authService = inject(AuthService);
  teamUtil = inject(TeamUtilService);

  // View state
  viewMode = signal<'table' | 'grid'>('grid');
  selectedDoc = signal<KBDocument | null>(null);
  showModal = signal(false);
  showNewDropdown = signal(false);
  editingDoc = signal<KBDocument | null>(null);
  deletingDoc = signal<KBDocument | null>(null);
  fileReading = signal(false);
  showSendModal = signal(false);
  sendingDoc = signal<KBDocument | null>(null);
  sendTarget = signal<string>('');
  currentUser = computed(() => this.authService.user()?.name ?? 'User');
  private filterTrigger = signal(0);

  team = this.dataService.team();
  categories = KB_CATEGORIES;

  // Admin check
  isAdmin = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'admin' || role === 'manager';
  });

  // Team members the current user can send to
  sendableTeam = computed(() => this.dataService.team().filter(m => m.name !== this.currentUser()));

  // ── Tile style map (color/bg per category) ──────────────────
  private tileStyleMap: Record<string, { color: string; bg: string }> = {
    'Documents':          { color: '#1A56DB', bg: '#EBF5FF' },
    'Playbooks':          { color: '#059669', bg: '#D1FAE5' },
    'Compliance':         { color: '#7C3AED', bg: '#EDE9FE' },
    'Cheat Sheets':       { color: '#D97706', bg: '#FEF3C7' },
    'Skills':             { color: '#0891B2', bg: '#CFFAFE' },
    'Branding & Identity':{ color: '#DB2777', bg: '#FCE7F3' },
    'Useful Links':       { color: '#DC2626', bg: '#FEE2E2' },
  };
  private defaultTileStyle = { color: '#6B7280', bg: '#F3F4F6' };

  // ── Tile definitions derived from actual data ───────────────
  kbTiles = computed(() => {
    const docs = this.dataService.kbDocs();
    // Collect unique categories in the order they first appear
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const d of docs) {
      if (d.category && !seen.has(d.category)) {
        seen.add(d.category);
        cats.push(d.category);
      }
    }
    return cats.map(cat => ({
      category: cat,
      ...(this.tileStyleMap[cat] || this.defaultTileStyle),
    }));
  });

  // ── Folder navigation ────────────────────────────────────────
  currentFolderId = signal<number | null>(null);

  currentFolder = computed<KBDocument | null>(() => {
    const id = this.currentFolderId();
    if (!id) return null;
    return this.dataService.kbDocs().find(d => d.id === id && d.type === 'folder') || null;
  });

  /** Folders in the active category, at the current folder level (root). */
  foldersInView = computed<KBDocument[]>(() => {
    this.filterTrigger();
    const category = this.filterState['category'] as string;
    if (!category) return [];
    const parent = this.currentFolderId();
    // Only support one level of nesting — don't render folders inside a folder.
    if (parent) return [];
    const search = ((this.filterState['search'] as string) || '').toLowerCase();
    return this.dataService.kbDocs().filter(d =>
      d.type === 'folder' &&
      d.category === category &&
      !d.parentFolder &&
      (!search || d.title.toLowerCase().includes(search) || (d.description || '').toLowerCase().includes(search))
    );
  });

  folderCount = (folderId: number) =>
    this.dataService.kbDocs().filter(d => d.parentFolder === folderId && d.type !== 'folder').length;

  foldersForCategory(category: string): KBDocument[] {
    return this.dataService.kbDocs().filter(d => d.type === 'folder' && d.category === category && !d.parentFolder);
  }

  openFolder(folder: KBDocument) {
    this.currentFolderId.set(folder.id);
    // Scroll to top so user lands at the folder header
    const host = (document.querySelector('app-kb-list') as HTMLElement | null);
    host?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  closeFolder() {
    this.currentFolderId.set(null);
  }

  confirmDeleteFolder(folder: KBDocument) {
    const count = this.folderCount(folder.id);
    const msg = count > 0
      ? `Delete folder "${folder.title}"? ${count} resource${count === 1 ? '' : 's'} will be moved back to the category root.`
      : `Delete empty folder "${folder.title}"?`;
    if (!confirm(msg)) return;
    // Unfile any items that were inside the folder
    this.dataService.kbDocs()
      .filter(d => d.parentFolder === folder.id)
      .forEach(d => this.dataService.updateKBDoc(d.id, { parentFolder: undefined }));
    this.dataService.deleteKBDoc(folder.id);
    if (this.currentFolderId() === folder.id) this.currentFolderId.set(null);
  }

  renameFolder(folder: KBDocument, event?: Event) {
    event?.stopPropagation();
    const next = prompt('Rename folder', folder.title);
    if (!next || next.trim() === folder.title) return;
    this.dataService.updateKBDoc(folder.id, { title: next.trim() });
  }

  // ── Home widget selectors ────────────────────────────────────
  /** Ordering helper: newer ISO timestamp first; fall back to higher id */
  private compareByRecency = (a: KBDocument, b: KBDocument): number => {
    const at = a.updatedAtIso || a.createdAt;
    const bt = b.updatedAtIso || b.createdAt;
    if (at && bt) return bt.localeCompare(at);
    if (at) return -1;
    if (bt) return 1;
    return b.id - a.id;
  };

  recentlyAdded = computed(() => {
    return [...this.dataService.kbDocs()]
      .filter(d => d.type !== 'folder')
      .sort(this.compareByRecency)
      .slice(0, 6);
  });

  pinnedDocs = computed(() =>
    this.dataService.kbDocs()
      .filter(d => d.pinned && d.type !== 'folder')
      .sort(this.compareByRecency)
      .slice(0, 6)
  );

  popularDocs = computed(() =>
    [...this.dataService.kbDocs()]
      .filter(d => (d.views || 0) > 0 && d.type !== 'folder')
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 6)
  );

  // ── Per-category counts (reactive, respects search + author) ─
  categoryCounts = computed(() => {
    this.filterTrigger();
    const docs = this.dataService.kbDocs();
    const search = this.filterState['search'];
    const author = this.filterState['author'];
    const counts: Record<string, number> = {};
    for (const d of docs) {
      if (author && d.author !== author) continue;
      if (search) {
        const q = (search as string).toLowerCase();
        if (!d.title.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q)) continue;
      }
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
    return counts;
  });

  // ── Filters ─────────────────────────────────────────────────
  filterState: FilterValues = { search: '', category: '', author: '', sort: 'updated' };
  kbFilters: FilterConfig[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search knowledge base...' },
    {
      key: 'category', label: 'Category', type: 'select', placeholder: 'All categories',
      options: KB_CATEGORIES.map(c => ({ value: c, label: c }))
    },
    {
      key: 'author', label: 'Author', type: 'select', placeholder: 'All authors',
      options: this.dataService.team().map((m: any) => ({ value: m.name, label: m.name }))
    },
    {
      key: 'sort', label: 'Sort', type: 'select', defaultValue: 'updated',
      options: [
        { value: 'updated', label: 'Recently Updated' },
        { value: 'title', label: 'Title A–Z' },
        { value: 'author', label: 'Author' },
      ]
    },
  ];

  docForm: {
    type: DocType;
    title: string;
    category: string;
    author: string;
    description: string;
    content: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileDataUrl?: string;
    url?: string;
    notes?: string;
    version?: string;
    parentFolder?: number;
  } = this.getEmptyForm();

  // Page-level drag-and-drop state
  showDropzone = signal(false);

  ngOnInit() {
    document.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('.dropdown')) {
        this.showNewDropdown.set(false);
      }
    });
  }

  onFilterChange(values: FilterValues) {
    const oldCategory = this.filterState['category'];
    this.filterState = values;
    if (values['category'] !== oldCategory) {
      this.currentFolderId.set(null);
    }
    this.filterTrigger.update(v => v + 1);
  }

  filteredDocs = computed(() => {
    this.filterTrigger();
    let docs = this.dataService.kbDocs();

    // Never show folders in the resources list — they render separately
    docs = docs.filter(d => d.type !== 'folder');

    const category = this.filterState['category'];
    if (category) {
      docs = docs.filter(d => d.category === category);
    }

    // Folder scope: inside a folder we only show that folder's contents;
    // at category root we only show loose/unfiled items.
    const folderId = this.currentFolderId();
    if (category) {
      if (folderId) {
        docs = docs.filter(d => d.parentFolder === folderId);
      } else {
        docs = docs.filter(d => !d.parentFolder);
      }
    }

    const author = this.filterState['author'];
    if (author) {
      docs = docs.filter(d => d.author === author);
    }

    const search = this.filterState['search'];
    if (search) {
      const q = (search as string).toLowerCase();
      docs = docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.content && d.content.toLowerCase().includes(q))
      );
    }

    const sortBy = this.filterState['sort'] || 'updated';
    return [...docs].sort((a, b) => {
      switch (sortBy) {
        case 'title':  return a.title.localeCompare(b.title);
        case 'author': return a.author.localeCompare(b.author);
        default:       return 0;
      }
    });
  });

  // Count docs per category (delegates to reactive computed)
  getCategoryCount(category: string): number {
    return this.categoryCounts()[category] || 0;
  }

  selectDoc(doc: KBDocument) {
    this.selectedDoc.set(doc);
    if (doc.type !== 'folder') {
      this.dataService.incrementKBViews(doc.id);
    }
  }

  togglePin(doc: KBDocument, event?: Event) {
    event?.stopPropagation();
    this.dataService.toggleKBPin(doc.id);
    if (this.selectedDoc()?.id === doc.id) {
      const refreshed = this.dataService.kbDocs().find(d => d.id === doc.id) || null;
      this.selectedDoc.set(refreshed);
    }
  }

  addKBComment(content: string) {
    const doc = this.selectedDoc();
    if (!doc) return;
    this.dataService.addKBDocNote(doc.id, this.currentUser(), content);
    // Re-sync the selected doc so the thread updates immediately
    const refreshed = this.dataService.kbDocs().find(d => d.id === doc.id) || null;
    this.selectedDoc.set(refreshed);
  }

  selectTile(category: string) {
    this.filterState = { ...this.filterState, category };
    this.currentFolderId.set(null);
    this.filterTrigger.update(v => v + 1);
    this.viewMode.set('table');
  }

  clearCategoryFilter() {
    this.filterState = { ...this.filterState, category: '' };
    this.currentFolderId.set(null);
    this.filterTrigger.update(v => v + 1);
  }

  getEmptyForm() {
    return {
      type: 'document' as DocType,
      title: '',
      category: this.filterState['category'] || 'Documents',
      author: 'Aisha',
      description: '',
      content: '',
      fileName: undefined as string | undefined,
      fileSize: undefined as number | undefined,
      fileType: undefined as string | undefined,
      fileDataUrl: undefined as string | undefined,
      url: undefined as string | undefined,
      notes: undefined as string | undefined,
      version: undefined as string | undefined,
      parentFolder: undefined as number | undefined,
    };
  }

  /** Keep the form type coherent with the chosen category — e.g. auto-switch to 'link' for Useful Links. */
  onFormCategoryChange(category: string) {
    if (this.isLinkCategory(category) && this.docForm.type !== 'link' && !this.docForm.fileName) {
      this.docForm.type = 'link';
    }
  }

  openUploadModal() {
    this.docForm = this.getEmptyForm();
    this.docForm.type = 'file';
    this.prefillFromContext();
    this.showNewDropdown.set(false);
    this.showModal.set(true);
  }

  /** Prefill category + parentFolder from current navigation context. */
  private prefillFromContext() {
    const cat = this.filterState['category'] as string | undefined;
    if (cat) this.docForm.category = cat;
    const folderId = this.currentFolderId();
    if (folderId) this.docForm.parentFolder = folderId;
  }

  getTypeLabel(type: DocType): string {
    const labels: Record<DocType, string> = {
      'document': 'Document',
      'playbook': 'Playbook',
      'template': 'Template',
      'file': 'File',
      'link': 'Link',
      'folder': 'Folder'
    };
    return labels[type];
  }

  getTypeBadge(type: DocType): string {
    const badges: Record<string, string> = {
      'document': 'blue',
      'playbook': 'green',
      'template': 'purple',
      'file': 'gray',
      'link': 'orange',
      'folder': 'yellow'
    };
    return badges[type] || 'gray';
  }

  getCategoryColor(category: string): string {
    const tile = this.kbTiles().find(t => t.category === category);
    return tile?.color ?? '#64748B';
  }

  getCategoryBadge(category: string): string {
    return KB_CATEGORY_BADGES[category] || 'gray';
  }

  getEmptyIcon(): string {
    const cat = this.filterState['category'];
    const icons: Record<string, string> = {
      'Documents': 'file-text', 'Playbooks': 'book-open', 'Compliance': 'shield',
      'Cheat Sheets': 'list', 'Skills': 'zap', 'Branding & Identity': 'image',
      'Useful Links': 'link'
    };
    return icons[cat as string] || 'file-text';
  }

  getEmptyTitle(): string {
    const cat = this.filterState['category'];
    if (!cat) return 'No items found';
    return `No ${cat} yet`;
  }

  getEmptySubtitle(): string {
    const cat = this.filterState['category'];
    const hints: Record<string, string> = {
      'Documents': 'Upload working documents, guides, and references.',
      'Playbooks': 'Add operational playbooks and execution guides.',
      'Compliance': 'Upload compliance materials, policies, and evidence.',
      'Cheat Sheets': 'Add quick-reference cards and summaries.',
      'Skills': 'Upload skill files, prompt bundles, ZIPs, or markdown.',
      'Branding & Identity': 'Upload logos, icons, brand assets, and templates.',
      'Useful Links': 'Add useful links and external references.'
    };
    return hints[cat as string] || 'Adjust your filters or browse all categories.';
  }

  openCreateModal(type: DocType) {
    this.docForm = this.getEmptyForm();
    this.docForm.type = type;
    this.prefillFromContext();
    // Folders always live at the category root — never inside another folder
    if (type === 'folder') {
      this.docForm.parentFolder = undefined;
    }
    this.showNewDropdown.set(false);
    this.showModal.set(true);
  }

  editDoc(doc: KBDocument) {
    this.selectedDoc.set(null);
    this.editingDoc.set(doc);
    this.docForm = {
      type: doc.type,
      title: doc.title,
      category: doc.category,
      author: doc.author,
      description: doc.description,
      content: doc.content,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      fileDataUrl: doc.fileDataUrl,
      url: doc.url,
      notes: doc.notes,
      version: doc.version,
      parentFolder: doc.parentFolder,
    };
    this.showModal.set(true);
  }

  confirmDelete(doc: KBDocument) {
    this.deletingDoc.set(doc);
  }

  deleteDoc() {
    const doc = this.deletingDoc();
    if (doc) {
      if (this.selectedDoc()?.id === doc.id) this.selectedDoc.set(null);
      this.dataService.deleteKBDoc(doc.id);
      this.deletingDoc.set(null);
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editingDoc.set(null);
    this.docForm = this.getEmptyForm();
  }

  saveDoc() {
    const editing = this.editingDoc();
    const docData: any = {
      type: this.docForm.type,
      title: this.docForm.title,
      category: this.docForm.category,
      author: this.docForm.author,
      description: this.docForm.description,
      content: this.docForm.content,
      fileName: this.docForm.fileName,
      fileSize: this.docForm.fileSize,
      fileType: this.docForm.fileType,
      fileDataUrl: this.docForm.fileDataUrl,
      url: this.docForm.url,
      notes: this.docForm.notes,
      version: this.docForm.version,
      parentFolder: this.docForm.parentFolder,
      updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    if (editing) {
      this.dataService.updateKBDoc(editing.id, docData);
      if (this.selectedDoc()?.id === editing.id) {
        const updated = this.dataService.kbDocs().find(d => d.id === editing.id);
        this.selectedDoc.set(updated || null);
      }
    } else {
      this.dataService.addKBDoc(docData);
    }

    this.closeModal();
  }

  // ── Page-level drag-and-drop ─────────────────────────────────
  onPageDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types.includes('Files')) {
      this.showDropzone.set(true);
    }
  }

  onPageDragLeave(event: DragEvent) {
    const target = event.relatedTarget as Element;
    if (!target || !(event.currentTarget as Element).contains(target)) {
      this.showDropzone.set(false);
    }
  }

  onPageDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.showDropzone.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Open upload modal with the first file pre-loaded
      this.docForm = this.getEmptyForm();
      this.docForm.type = 'file';
      this.showModal.set(true);
      this.readFile(files[0]);
    }
  }

  // ── File handling ────────────────────────────────────────────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.readFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.readFile(event.dataTransfer.files[0]);
    }
  }

  private readFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }
    this.docForm.fileName = file.name;
    this.docForm.fileSize = file.size;
    this.docForm.fileType = file.type || this.guessMimeFromName(file.name);
    this.fileReading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.docForm.fileDataUrl = reader.result as string;
      this.fileReading.set(false);
    };
    reader.onerror = () => {
      this.fileReading.set(false);
      alert('Could not read file. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  private guessMimeFromName(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      csv: 'text/csv',
      tsv: 'text/tab-separated-values',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      zip: 'application/zip',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      html: 'text/html',
      htm: 'text/html',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      skill: 'text/plain',
      prompt: 'text/plain',
      sh: 'text/plain',
      py: 'text/plain',
      js: 'text/plain',
      ts: 'text/plain',
      css: 'text/plain',
      sql: 'text/plain',
      ini: 'text/plain',
      cfg: 'text/plain',
      conf: 'text/plain',
      env: 'text/plain',
      toml: 'text/plain',
      properties: 'text/plain',
    };
    return map[ext] ?? 'application/octet-stream';
  }

  removeFile() {
    this.docForm.fileName = undefined;
    this.docForm.fileSize = undefined;
    this.docForm.fileType = undefined;
    this.docForm.fileDataUrl = undefined;
  }

  private _pdfBlobUrls = new Map<string, SafeResourceUrl>();

  getSafeUrl(dataUrl: string): SafeResourceUrl {
    // Convert base64 data URL to Blob URL for reliable iframe rendering
    if (this._pdfBlobUrls.has(dataUrl)) return this._pdfBlobUrls.get(dataUrl)!;
    try {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bytes = atob(parts[1]);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const safe = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      this._pdfBlobUrls.set(dataUrl, safe);
      return safe;
    } catch {
      return this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
    }
  }

  decodeTextFromDataUrl(dataUrl: string): string {
    try {
      const base64 = dataUrl.split(',')[1];
      return atob(base64);
    } catch {
      return '(Unable to decode file content)';
    }
  }

  isPdfFile(doc: KBDocument): boolean {
    const type = doc.fileType || '';
    const name = (doc.fileName || '').toLowerCase();
    return type === 'application/pdf' || name.endsWith('.pdf');
  }

  isImageFile(doc: KBDocument): boolean {
    return (doc.fileType || '').startsWith('image/');
  }

  isTextFile(doc: KBDocument): boolean {
    const type = doc.fileType || '';
    const name = (doc.fileName || '').toLowerCase();
    const textTypes = ['text/plain', 'text/markdown', 'text/csv', 'text/tab-separated-values', 'application/json', 'text/html', 'text/yaml', 'application/xml'];
    const textExts  = ['.txt', '.md', '.json', '.csv', '.tsv', '.xml', '.yaml', '.yml', '.log', '.html', '.htm', '.skill', '.prompt', '.conf', '.cfg', '.ini', '.env', '.sh', '.bat', '.py', '.js', '.ts', '.css', '.scss', '.sql', '.graphql', '.toml', '.properties'];
    return textTypes.includes(type) || textExts.some(e => name.endsWith(e));
  }

  isSpreadsheetFile(doc: KBDocument): boolean {
    const type = doc.fileType || '';
    const name = (doc.fileName || '').toLowerCase();
    return type.includes('spreadsheet') || type.includes('excel') ||
           name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
  }

  getFileIcon(doc: KBDocument): string {
    if (this.isPdfFile(doc))        return 'file-text';
    if (this.isImageFile(doc))      return 'image';
    if (this.isSpreadsheetFile(doc)) return 'grid';
    if (this.isArchiveFile(doc))    return 'archive';
    if (doc.type === 'link')        return 'link';
    if (doc.type === 'folder')      return 'folder';
    return 'file-text';
  }

  isArchiveFile(doc: KBDocument): boolean {
    const name = (doc.fileName || '').toLowerCase();
    const archiveExts = ['.zip', '.tar', '.gz', '.rar', '.7z', '.tar.gz', '.tgz'];
    return archiveExts.some(e => name.endsWith(e));
  }

  fileKindLabel(doc: KBDocument): string {
    const name = (doc.fileName || '').toLowerCase();
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext) return ext.toUpperCase();
    const t = doc.fileType || '';
    if (t.includes('/')) return t.split('/')[1].toUpperCase();
    return 'FILE';
  }

  /** Does the given category primarily store link resources? */
  isLinkCategory(category?: string): boolean {
    return category === 'Useful Links';
  }

  /** Does the given category commonly hold archives / packages that can't preview inline? */
  isArchiveCategory(category?: string): boolean {
    return category === 'Skills' || category === 'Branding & Identity';
  }

  categoryUploadHint(category?: string): string {
    const hints: Record<string, string> = {
      'Documents': 'PDF, DOCX, XLSX, PPTX, TXT, MD, CSV — previewable where possible.',
      'Playbooks': 'PDF or MD playbooks, operational guides, execution checklists.',
      'Compliance': 'Policies, audit evidence, certificates — PDF preferred.',
      'Cheat Sheets': 'Quick reference cards — image, PDF, or markdown.',
      'Skills': 'Skill files, .skill bundles, ZIPs, .md, .json, .prompt — archives supported.',
      'Branding & Identity': 'Logos, icons, brand packs — PNG, SVG, ZIP, AI, Figma exports.',
      'Useful Links': 'External URL is required. File upload is optional.',
    };
    return hints[category || ''] || 'PDF, DOCX, XLSX, PPTX, TXT, MD, JSON, CSV, PNG, JPG, ZIP — max 25MB';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ── Send to Chat ─────────────────────────────────────────────
  openSendModal(doc: KBDocument) {
    this.sendingDoc.set(doc);
    this.sendTarget.set('');
    this.showSendModal.set(true);
  }

  sendToChat() {
    const doc = this.sendingDoc();
    const target = this.sendTarget();
    if (!doc || !target) return;
    this.dataService.addMessage({
      from: this.currentUser(),
      to: target,
      text: `Shared from Knowledge Base: ${doc.title}${doc.description ? '\n' + doc.description : ''}`,
      time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      read: false,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      fileDataUrl: doc.fileDataUrl,
    });
    this.showSendModal.set(false);
    this.sendingDoc.set(null);
    this.sendTarget.set('');
  }
}
