import { Injectable } from '@angular/core';
import Tesseract from 'tesseract.js';

export interface ParsedContact {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  extractedFields: string[];
  rawText: string;
  confidence: number;
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s.\-()]{6,}\d/g;
const WEBSITE_RE = /(?:(?:https?:\/\/)?(?:www\.)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(?:\/\S*)?)/gi;
const ADDRESS_RE = /\d+\s+[\w\s]+(?:st(?:reet)?|ave(?:nue)?|blvd|boulevard|rd|road|dr(?:ive)?|ln|lane|ct|court|way|pl(?:ace)?|pkwy|hwy)[\s,.]*/gi;

const TITLE_KEYWORDS = /\b(?:realtor|director|manager|president|vp|vice\s*president|ceo|cfo|coo|cto|chief|head|lead|senior|sr|junior|jr|supervisor|coordinator|specialist|analyst|engineer|consultant|advisor|associate|assistant|administrator|officer|founder|partner|owner|executive|general\s*manager|quality|operations|sales|marketing|procurement|supply\s*chain|compliance|safety|production|plant|facility|regional|national|global|broker|agent|attorney|lawyer|accountant|architect|designer|developer|photographer|therapist|nurse|doctor|dentist|professor|teacher|coach)\b/i;

@Injectable({ providedIn: 'root' })
export class OcrService {

  async extractFromImage(
    imageDataUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<ParsedContact> {
    // Preprocess: grayscale + contrast boost for better OCR
    const processed = await this.preprocessImage(imageDataUrl);

    const result = await Tesseract.recognize(processed, 'eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    return this.parseText(rawText, confidence);
  }

  /** Canvas-based preprocessing: grayscale + contrast stretch for phone photos */
  private preprocessImage(imageDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1600;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;

        // Pass 1: find min/max for contrast stretching
        let min = 255, max = 0;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        const range = max - min || 1;

        // Pass 2: grayscale + contrast stretch + mild threshold
        for (let i = 0; i < d.length; i += 4) {
          let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Stretch to full 0-255 range
          gray = ((gray - min) / range) * 255;
          // Sharpen: push toward black or white
          gray = gray < 140 ? gray * 0.6 : Math.min(255, gray * 1.2 + 40);
          d[i] = d[i + 1] = d[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageDataUrl); // fallback to original
      img.src = imageDataUrl;
    });
  }

  private parseText(rawText: string, confidence: number): ParsedContact {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 1);

    // Extract structured fields (regex-based, most reliable)
    const emails = rawText.match(EMAIL_RE) || [];
    const phones = this.extractPhones(rawText);
    const websites = rawText.match(WEBSITE_RE) || [];
    const addresses = rawText.match(ADDRESS_RE) || [];

    const email = emails[0] || '';
    const phone = phones[0] || '';
    const website = websites[0] || '';
    const address = addresses[0]?.trim() || '';

    // Build consumed set for filtering candidate lines
    const consumed = new Set<string>();
    [email, phone, website, address].forEach(v => {
      if (v) consumed.add(v.toLowerCase().substring(0, 15));
    });

    // Filter to lines not consumed by structured fields
    const candidateLines = lines.filter(line => {
      const lower = line.toLowerCase();
      for (const c of consumed) {
        if (c && lower.includes(c)) return false;
      }
      if (line.length < 3) return false;
      if (/^\d+$/.test(line)) return false;
      if (this.isGarbage(line)) return false;
      return true;
    });

    let name = '';
    let title = '';
    let company = '';

    // Score each candidate line
    const scored = candidateLines.map(line => {
      let nameScore = 0;
      let titleScore = 0;
      let companyScore = 0;

      const words = line.split(/\s+/);

      // Name: 2-4 capitalized words, no company/junk markers
      if (words.length >= 2 && words.length <= 4) {
        const allCap = words.every(w => /^[A-Z]/.test(w));
        if (allCap) nameScore += 3;
        if (!/[&,.]|inc|llc|ltd|corp|group|co\b/i.test(line)) nameScore += 2;
        // ALL CAPS names (common on cards)
        if (line === line.toUpperCase() && /^[A-Z\s]+$/.test(line) && words.length <= 3) nameScore += 3;
      }

      // Title
      if (TITLE_KEYWORDS.test(line)) titleScore += 5;
      // Short title-like line (1-4 words, mostly alpha)
      if (words.length <= 4 && words.length >= 1 && /^[A-Za-z\s&\/\-]+$/.test(line) && !TITLE_KEYWORDS.test(line)) {
        titleScore += 1; // weak title candidate
      }

      // Company
      if (/\b(?:inc|llc|ltd|corp|co|company|group|foods|bakery|industries|solutions|services|enterprises|international|global|systems|technologies|consulting|realty|properties|associates)\b/i.test(line)) {
        companyScore += 5;
      }

      return { line, nameScore, titleScore, companyScore };
    });

    const usedLines = new Set<string>();

    // Company
    const companyCand = scored.filter(s => s.companyScore > 0).sort((a, b) => b.companyScore - a.companyScore)[0];
    if (companyCand) { company = companyCand.line; usedLines.add(company); }

    // Title
    const titleCand = scored.filter(s => s.titleScore >= 4 && !usedLines.has(s.line)).sort((a, b) => b.titleScore - a.titleScore)[0];
    if (titleCand) { title = titleCand.line; usedLines.add(title); }

    // Name: highest name score
    const nameCand = scored.filter(s => s.nameScore >= 3 && !usedLines.has(s.line)).sort((a, b) => b.nameScore - a.nameScore)[0];
    if (nameCand) { name = nameCand.line; }

    // Quality gate: reject garbage from free-text fields
    if (name && this.isGarbage(name)) name = '';
    if (title && this.isGarbage(title)) title = '';
    if (company && this.isGarbage(company)) company = '';

    // Clean up: title-case the name if ALL CAPS
    if (name && name === name.toUpperCase()) {
      name = name.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    }

    const extractedFields: string[] = [];
    if (name) extractedFields.push('name');
    if (title) extractedFields.push('title');
    if (company) extractedFields.push('company');
    if (email) extractedFields.push('email');
    if (phone) extractedFields.push('phone');
    if (website) extractedFields.push('website');
    if (address) extractedFields.push('address');

    return { name, title, company, email, phone, website, address, extractedFields, rawText, confidence };
  }

  /** Extract phone numbers, filtering out sequences that are too short */
  private extractPhones(text: string): string[] {
    const matches = text.match(PHONE_RE) || [];
    return matches.filter(p => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    });
  }

  /** Detect OCR garbage: text that is obviously not a real word/phrase */
  private isGarbage(text: string): boolean {
    if (!text || text.length < 2) return true;

    // Too many non-alpha characters (allow spaces, hyphens, apostrophes, periods)
    const cleaned = text.replace(/[\s\-'.,]/g, '');
    const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (cleaned.length > 0 && alphaCount / cleaned.length < 0.6) return true;

    // Contains bracket/equals/pipe junk typical of OCR noise
    if (/[[\]=|{}\\<>~`#^]/.test(text)) return true;

    // Too many single-character "words" (OCR splitting letters)
    const words = text.split(/\s+/);
    const singleChars = words.filter(w => w.length === 1 && /[a-zA-Z]/.test(w)).length;
    if (words.length >= 3 && singleChars / words.length > 0.4) return true;

    // Check for real words: at least some words should be 3+ chars
    const realWords = words.filter(w => w.length >= 3 && /^[a-zA-Z]/.test(w));
    if (words.length >= 2 && realWords.length === 0) return true;

    return false;
  }
}
