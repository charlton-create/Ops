import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_REGISTRY } from './icon-registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<span class="icon-wrap" [innerHTML]="svgHtml" [style.width.px]="size" [style.height.px]="size"></span>`,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    .icon-wrap ::ng-deep svg {
      width: 100%;
      height: 100%;
    }
  `]
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() name = '';
  @Input() size = 18;

  get svgHtml(): SafeHtml {
    const svg = ICON_REGISTRY[this.name] || '';
    if (!svg) return '';
    // Replace width/height in the SVG with the requested size
    const sized = svg
      .replace(/width="\d+"/, `width="${this.size}"`)
      .replace(/height="\d+"/, `height="${this.size}"`);
    return this.sanitizer.bypassSecurityTrustHtml(sized);
  }
}
