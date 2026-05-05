import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EmailTemplate } from '../models';
import { EMAIL_TEMPLATES } from '../constants/seed.data';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'catops_email_templates_v6'; // coffee show templates now embedded in seed data

interface PersistedState {
  uploaded: EmailTemplate[];
  overrides: Record<string, { name?: string; featured?: boolean; updatedAt?: string }>;
  loadedBuiltins: Record<string, string>; // id -> htmlTemplate (cached after async fetch)
}

/**
 * Rewrite raw email HTML so it exposes the tokens the campaign editor relies on.
 * Strategy: keep layout/markup intact, only swap well-known recipient / signature
 * strings for tokens so the preview renderer can merge campaign content into them.
 */
function tokenizeImportedHtml(html: string): string {
  let out = html;

  // Greeting — match "Hi," / "Hi there," / "Hi {Name}," at start of a paragraph
  out = out.replace(
    />(\s*)Hi(?:\s+there)?(?:\s+[A-Z][a-zA-Z]+)?(,\s*)</,
    '>$1Hi {{first_name}}$2<'
  );

  // Sender line — "Warmly, Team" / "Warmly, <strong>Team</strong>"
  out = out.replace(
    /Warmly,\s*(<strong[^>]*>)?\s*Team\s*(<\/strong>)?/gi,
    'Warmly, $1{{sender_name}}$2'
  );
  // Also handle "Warmly, <strong>{{from_name}}</strong>" variants already using tokens
  out = out.replace(/\{\{from_name\}\}/g, '{{sender_name}}');
  out = out.replace(/\{\{from_role\}\}/g, '{{sender_title}}');
  out = out.replace(/\{\{from_email\}\}/g, '{{sender_email}}');
  out = out.replace(/\{\{contact_name\}\}/g, '{{first_name}}');
  out = out.replace(/\{\{body_content\}\}/g, '{{body_html}}');

  // Wrap the hero paragraph(s) inside the body zone with a body token if not
  // already tokenized. We look for a single <p> containing "pleasure connecting"
  // (from the World of Coffee templates) and swap its contents for {{body_html}}.
  if (!/\{\{body_html\}\}/.test(out)) {
    out = out.replace(
      /(<p[^>]*>[^<]*?(pleasure connecting|We loved hearing|love to understand)[\s\S]*?<\/p>\s*)+/,
      '<div class="template-body-slot">{{body_html}}</div>'
    );
  }

  return out;
}

function deriveDefaultBody(html: string): string {
  const match = html.match(/<p[^>]*>\s*It was a pleasure connecting[\s\S]*?<\/p>/);
  if (match) {
    // Return two paragraphs that match the visible copy in the uploaded templates.
    return `<p style="margin: 0 0 14px;">It was a pleasure connecting with you at the World of Coffee Show! We loved hearing about what you're building and believe CAT-I.AI can make a real difference in your food safety compliance workflow.</p><p style="margin: 0;">We'd love to understand your priorities a little better. Please take a few minutes to complete this short survey.</p>`;
  }
  return '<p>Write your message here...</p>';
}

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private readonly _templates = signal<EmailTemplate[]>([...EMAIL_TEMPLATES]);
  readonly templates = this._templates.asReadonly();

  readonly pickerTemplates = computed(() =>
    this._templates()
      .slice()
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
  );

  readonly primaryTemplate = computed(() =>
    this._templates().find(t => t.featured) || this._templates()[0]
  );

  constructor() {
    this.hydrateFromStorage();
    // Coffee Show templates are now embedded in seed data (pre-processed HTML).
    // Only load Complex/Simple from assets as optional extras.
    void this.loadImportedTemplate('imported-complex', 'Complex Template', 'assets/email-templates/Complex.html',
      'Full branded gradient card, responsive, signature CTA');
    void this.loadImportedTemplate('imported-simple', 'Simple Template', 'assets/email-templates/Simple.html',
      'Simplified follow-up — Gmail-safe, minimal markup');
  }

  private hydrateFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as PersistedState;
      const seed = [...EMAIL_TEMPLATES];
      const overrides = state.overrides || {};
      const cached = state.loadedBuiltins || {};

      // Apply overrides to seed templates
      for (const t of seed) {
        const o = overrides[t.id];
        if (o?.name) t.name = o.name;
        if (o?.featured !== undefined) t.featured = o.featured;
        if (o?.updatedAt) t.updatedAt = o.updatedAt;
      }

      // Imported templates (coffee show, complex, simple) are always re-fetched
      // from assets — don't restore from cache. Only user-uploaded ones are cached.

      // Append user-uploaded templates
      for (const t of state.uploaded || []) {
        if (!seed.find(s => s.id === t.id)) seed.push(t);
      }

      this._templates.set(seed);
    } catch {
      // ignore corrupt state
    }
  }

  private persist() {
    try {
      const all = this._templates();
      const uploaded = all.filter(t => t.source === 'uploaded');
      const overrides: PersistedState['overrides'] = {};
      for (const t of all) {
        if (t.source === 'builtin' || t.source === 'imported') {
          overrides[t.id] = { name: t.name, featured: t.featured, updatedAt: t.updatedAt };
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ uploaded, overrides, loadedBuiltins: {} }));
    } catch {
      // ignore storage errors (quota, private mode)
    }
  }

  private http = inject(HttpClient);

  private async processHtmlViaBackend(rawHtml: string): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ html: string }>(`${environment.apiUrl}/campaigns/process-html`, { html: rawHtml }, { withCredentials: true })
      );
      return res.html;
    } catch {
      return rawHtml; // fallback to raw if backend unavailable
    }
  }

  private async loadImportedTemplate(id: string, displayName: string, assetUrl: string, description: string) {
    // Always re-fetch imported templates to pick up updates
    try {
      const resp = await fetch(`${assetUrl}?v=${Date.now()}`);
      if (!resp.ok) return;
      const raw = await resp.text();
      // Process through backend to strip VML + upload base64 images to S3
      const processed = await this.processHtmlViaBackend(raw);
      const html = tokenizeImportedHtml(processed);
      const defaultBody = deriveDefaultBody(raw);
      this._templates.update(list => {
        const idx = list.findIndex(t => t.id === id);
        const tpl: EmailTemplate = {
          id,
          name: list[idx]?.name || displayName,
          description,
          previewColor: '#c4d8e8',
          htmlTemplate: html,
          hasCta: false,
          hasImage: false,
          source: 'imported',
          sourceFileName: displayName,
          updatedAt: new Date().toISOString().split('T')[0],
          createdBy: 'System Import',
          defaultBody,
          featured: list[idx]?.featured,
        };
        if (idx >= 0) {
          const next = [...list];
          next[idx] = tpl;
          return next;
        }
        return [...list, tpl];
      });
      this.persist();
    } catch (err) {
      console.warn(`[EmailTemplateService] failed to load ${assetUrl}`, err);
    }
  }

  async uploadHtmlTemplate(file: File): Promise<EmailTemplate> {
    const raw = await file.text();
    // Process through backend to strip VML + upload base64 images to S3
    const processed = await this.processHtmlViaBackend(raw);
    const html = tokenizeImportedHtml(processed);
    const defaultBody = deriveDefaultBody(raw);

    const baseName = file.name.replace(/\.(html?|htm)$/i, '');
    const id = `uploaded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tpl: EmailTemplate = {
      id,
      name: baseName,
      description: 'User-uploaded HTML template',
      previewColor: '#E0E7FF',
      htmlTemplate: html,
      hasCta: false,
      hasImage: false,
      source: 'uploaded',
      sourceFileName: file.name,
      updatedAt: new Date().toISOString().split('T')[0],
      createdBy: 'User',
      defaultBody,
    };
    this._templates.update(list => [...list, tpl]);
    this.persist();
    return tpl;
  }

  renameTemplate(id: string, newName: string) {
    const name = newName.trim();
    if (!name) return;
    this._templates.update(list =>
      list.map(t => (t.id === id ? { ...t, name, updatedAt: new Date().toISOString().split('T')[0] } : t))
    );
    this.persist();
  }

  deleteTemplate(id: string) {
    const t = this._templates().find(x => x.id === id);
    if (!t || t.source === 'builtin') return; // never delete built-in
    this._templates.update(list => list.filter(x => x.id !== id));
    this.persist();
  }

  setPrimary(id: string) {
    this._templates.update(list => list.map(t => ({ ...t, featured: t.id === id })));
    this.persist();
  }

  getTemplate(id: string | undefined): EmailTemplate | undefined {
    if (!id) return undefined;
    return this._templates().find(t => t.id === id);
  }
}
