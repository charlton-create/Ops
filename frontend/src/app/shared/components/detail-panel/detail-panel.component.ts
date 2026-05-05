import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../icons';

@Component({
  selector: 'app-detail-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen) {
      <div class="slideover-overlay" (click)="closed.emit()"></div>
      <div class="slideover-panel" [class]="'slideover-' + size">
        <div class="slideover-header">
          <div class="panel-title-area">
            <h2>{{ title }}</h2>
            <ng-content select="[panel-subtitle]"></ng-content>
          </div>
          <button class="modal-close-btn" (click)="closed.emit()">
            <app-icon name="close" [size]="16"></app-icon>
          </button>
        </div>
        <div class="slideover-body">
          <ng-content select="[panel-body]"></ng-content>
        </div>
        <div class="slideover-footer" *ngIf="hasFooter">
          <ng-content select="[panel-footer]"></ng-content>
        </div>
      </div>
    }
  `,
  styles: [`
    .slideover-panel.slideover-sm { width: 380px; }
    .slideover-panel.slideover-md { width: 480px; }
    .slideover-panel.slideover-lg { width: 600px; }
    .panel-title-area {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .panel-title-area h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class DetailPanelComponent {
  @Input() title = '';
  @Input() isOpen = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() hasFooter = false;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.closed.emit();
  }
}
