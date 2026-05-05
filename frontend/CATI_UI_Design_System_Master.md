# CAT-I.AI Design System Master Reference

> **Version:** 1.0
> **Audited:** 2026-04-06
> **Platform:** Angular 17+ (standalone components, signals, OnPush)
> **Font:** MozaicGEO (100-900 weights, OTF)
> **Theme:** Light + Dark (CSS custom property switching via `data-theme`)
> **Purpose:** Canonical handoff document for any engineer or designer to replicate, extend, or migrate the CAT-I.AI UI system.

---

## Table of Contents

1. [Purpose and Usage](#1-purpose-and-usage)
2. [Source of Truth and Audit Methodology](#2-source-of-truth-and-audit-methodology)
3. [Canonical Design Principles](#3-canonical-design-principles)
4. [Layout Architecture](#4-layout-architecture)
5. [Core Tokens and Visual Rules](#5-core-tokens-and-visual-rules)
6. [Component Patterns](#6-component-patterns)
7. [Dashboard Patterns](#7-dashboard-patterns)
8. [Table and List Patterns](#8-table-and-list-patterns)
9. [Forms and Modal Patterns](#9-forms-and-modal-patterns)
10. [Media, Avatar, and Image Rules](#10-media-avatar-and-image-rules)
11. [Interaction Rules](#11-interaction-rules)
12. [Content and Spacing Rules](#12-content-and-spacing-rules)
13. [Cross-Module Consistency Rules](#13-cross-module-consistency-rules)
14. [Legacy Patterns to Avoid](#14-legacy-patterns-to-avoid)
15. [Migration and Implementation Checklist](#15-migration-and-implementation-checklist)
16. [Handoff Guidance](#16-handoff-guidance-for-another-repo-or-team)
17. [Audited Reference Screens and Files](#17-audited-reference-screens-and-files)

---

## 1. Purpose and Usage

This document is the **single canonical design system reference** for the CAT-I.AI product family. It captures the real, implemented UI rules — extracted from a full codebase audit — not aspirational design specs.

**Use this document to:**
- Build new modules that match the existing product
- Restyle or migrate a separate app to look and behave like CAT-I
- Onboard a new engineer or designer to the visual system
- Identify and fix legacy inconsistencies
- Create a component library in another framework (React, Vue, etc.)

**This document is opinionated.** Where the codebase has inconsistencies (legacy vs. modern), this document specifies which pattern is canonical and which is legacy. Follow the canonical rules.

---

## 2. Source of Truth and Audit Methodology

### Primary Source Files

| Priority | File | Role |
|----------|------|------|
| 1 | `apps/cati-web/src/styles.scss` (1300+ lines) | All CSS custom properties, global component classes, dark mode overrides, animations, responsive breakpoints |
| 2 | `apps/cati-web/CLAUDE.md` | Design rules, color palette definitions, component SCSS patterns, architecture conventions |
| 3 | `apps/cati-web/src/app/shared/components/` | Reusable components: UserAvatar, TableToolbar, TablePagination, EmptyState, DatePicker, LoadingSpinner, SkeletonLoader |
| 4 | `apps/cati-web/src/app/core/layout/` | App shell: MainLayout, Header, Sidebar |

### Secondary / Module-Specific Files

| File | Role | Status |
|------|------|--------|
| `apps/cati-web/src/app/features/mes/styles/_variables.scss` | MES-specific SCSS variables (orange theme) | MODULE-SPECIFIC — only for MES portal |
| `apps/cati-web/src/app/features/mes/styles/_mixins.scss` | MES-specific SCSS mixins | MODULE-SPECIFIC |
| `apps/cati-web/src/app/core/services/theme.service.ts` | Theme toggle (light/dark) via `data-theme` attribute | INFRASTRUCTURE |

### Canonical Reference Modules

These modules represent the **most current, most canonical** implementation of the design system:

| Module | What it exemplifies |
|--------|-------------------|
| `audit-management` | KPI stat cards, SVG charts, card grids, filter popovers, kebab action menus, modal overlays |
| `documents` | Table + toolbar + pagination, file upload modal, multi-tab UI, CRUD modals |
| `trainings` | Dashboard composition, participant tables, complex filtering, stepper forms |
| `company-settings` | Settings tabs, summary cards, form modals, nested form objects |
| `compliance` | Full table system v2, segmented tabs, status badges |

### Legacy / Outdated Modules

| Module | Issue |
|--------|-------|
| Early MES layouts (pre-unification) | Used separate SCSS variable system instead of CSS custom properties |
| Old dashboard implementations | May use hardcoded colors instead of CSS variables |

### Audit Method

1. Read and analyzed `styles.scss` (all 1300+ lines of global styles)
2. Read and analyzed `CLAUDE.md` (design tokens, component patterns, architecture rules)
3. Inspected all shared components in `shared/components/`
4. Inspected core layout components (MainLayout, Header, Sidebar)
5. Inspected MES-specific variable system for module-specific patterns
6. Cross-referenced patterns across multiple feature modules

---

## 3. Canonical Design Principles

### 3.1 CSS Variables First

Every color, shadow, border, spacing token, and surface color is defined as a CSS custom property in `:root`. Components consume these variables — never hardcoded hex values.

**Why:** Enables dark mode, theming, and consistent updates across the product.

**Rule:** If a new color is needed, add it to `:root` in `styles.scss` with both light and dark mode values. Never inline a hex value.

### 3.2 Shadow-Only Surfaces (No Visible Borders on Cards)

Cards, panels, and content surfaces use `box-shadow` for elevation — NOT `border: 1px solid`. The `--border-hairline` token (rgba-based, nearly invisible) is used for internal dividers within cards, but the card outer boundary is defined by shadow alone.

**Why:** Creates a modern, clean surface hierarchy. Borders make surfaces feel heavier and more dated.

**Do:** `box-shadow: var(--card-shadow);` with `border: 1px solid transparent;`
**Don't:** `border: 1px solid #E5E7EB;` on card wrappers

### 3.3 Dark Mode is a First-Class Citizen

Every token has a light and dark variant. Dark mode is toggled by setting `data-theme="dark"` on `<html>`. All CSS variable overrides live in a single `[data-theme="dark"]` block in `styles.scss`.

**Rule:** Never use raw color values that won't work in dark mode. Always use CSS variables.

### 3.4 Flat Hierarchy, No Card Nesting

Pages follow a flat hierarchy: **page background → single content card → content inside**. Cards are never nested inside other cards. Sections within a card use hairline dividers, not nested card wrappers.

**Why:** Prevents visual noise, depth confusion, and inconsistent padding.

### 3.5 Density Scales by Context

| Context | Density | Row height | Padding |
|---------|---------|-----------|---------|
| Dashboard KPIs | Comfortable | N/A | `1rem 1.25rem` |
| Data tables | Medium | `64px` | `0 16px` td |
| Table headers | Compact | N/A | `10px 16px` |
| Filters | Compact | N/A | `4px 10px` chips |
| Modals | Comfortable | N/A | `1.5rem` body |

### 3.6 MozaicGEO Typography

The entire product uses the **MozaicGEO** font family (custom, OTF format, weights 100-900). No system font mixing. Monospace font (`SFMono-Regular, Consolas, Liberation Mono`) is reserved exclusively for document IDs, code, and numeric data cells.

---

## 4. Layout Architecture

### 4.1 App Shell

```
┌─────────────────────────────────────────────────┐
│  Sidebar (fixed, left)   │  Main Content Area    │
│  width: 260px            │  flex: 1              │
│  collapsed: 70px         │                       │
│                          │  ┌─ Header ─────────┐ │
│  Logo area (60px h)      │  │ gradient bar      │ │
│  Nav sections (scroll)   │  │ page title + acts │ │
│  Footer (40px h)         │  └───────────────────┘ │
│                          │  ┌─ Page Content ────┐ │
│                          │  │ padding: 1.5rem   │ │
│                          │  │ overflow-y: auto  │ │
│                          │  │ flex: 1           │ │
│                          │  └───────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Key layout tokens:**

| Token | Value |
|-------|-------|
| `--sidebar-width` | `260px` |
| `--sidebar-collapsed-width` | `70px` |
| `--header-height` | `60px` |
| Page content padding | `1.5rem` (24px) |

**Rules:**
- The `main-content` uses `margin-left` (not padding) equal to sidebar width, with smooth transition on collapse
- `page-content` is the scrollable area (`overflow-y: auto; flex: 1; min-height: 0`)
- The entire app viewport is `overflow: hidden` — only the page content area scrolls
- Sidebar is `position: fixed; left: 0; top: 0; bottom: 0`

### 4.2 Sidebar

The sidebar uses a **premium animated gradient background** with three visual layers:

1. **Layer A (base):** Layered linear + radial gradients (pastel lavender → teal → warm gold)
2. **Layer B (drift):** CSS animation that slowly shifts the gradient position
3. **Layer C (shimmer):** `::before` pseudo-element with diagonal light band animation
4. **Layer D (grain):** `::after` pseudo-element with subtle noise texture

**Navigation structure:**
- Color-coded section headers (gradient text using `--section-color` per module)
- Accordion expand/collapse using `grid-template-rows: 0fr → 1fr` transition
- Active nav link: premium glass effect with `backdrop-filter: blur(8px)`, section-colored text, layered background
- Icons use CSS `mask-image` technique (background-color controls icon color)

**Section colors (per module group):**

| Section | Color variable value |
|---------|---------------------|
| Core workspace | `#A02195` (purple) |
| Product & supplier | `#D99808` (orange) |
| Document management | `#21799F` (teal) |
| Training & interviews | `#39219F` (deep blue) |
| Settings | `#8B6720` (gold) |
| Workflow/compliance | `#219F73` (green) |
| Vendor management | `#9F2C21` (red) |
| Messaging/approvals | `#21979F` (cyan) |
| MES portal | `#D97706` (amber) |

### 4.3 Header

The header is a full-width **gradient bar** above the page content. It uses `--header-gradient` (per-section gradient set dynamically) with an optional SVG pattern overlay.

**Header contents (left to right):**
1. Page icon (SVG from `/assets/icons/`)
2. Page title (`<h1>`)
3. Optional context pills (e.g., MES line switcher)
4. Right-aligned actions: Global search, Theme toggle, Notifications, User menu

**Header action buttons:** Circle icon buttons (`32×32px`, transparent background, hover state).

### 4.4 Page Content Patterns

**Pattern 1: Table Page (most common)**
```
.table-page (flex column, gap: 0.75rem, full height)
  ├── .stats-grid (optional KPI cards row)
  ├── .table-card (flex: 1, card with shadow)
  │   ├── .toolbar-tabs (optional segmented tabs)
  │   ├── .table-toolbar (search + filters + action button)
  │   ├── .active-chips-row (optional active filter chips)
  │   ├── .table-scroll (flex: 1, overflow auto)
  │   │   └── .data-table-v2 (sticky header, fixed layout)
  │   └── .table-footer (pagination strip)
  └── (no bottom padding needed — page-content has 1.5rem)
```

**Pattern 2: Dashboard Page**
```
.table-page (reused as page wrapper)
  ├── KPI stat cards row (.stats-grid)
  ├── Chart panels row (grid or flex)
  ├── Lower content panels
  └── Activity/list panels
```

**Pattern 3: Detail / Edit Page**
```
Single .card or .panel wrapping the form/detail content
  ├── .card-header or section title
  ├── .card-body with form fields / detail sections
  └── .card-footer with action buttons (optional)
```

---

## 5. Core Tokens and Visual Rules

### 5.1 Color Palette

#### Primary Brand

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#1A56DB` | `#3B82F6` | Buttons, links, active states |
| `--color-primary-hover` | `#1E40AF` | `#60A5FA` | Button hover |
| `--color-primary-light` | `#E1EFFE` | `rgba(59,130,246,0.15)` | Light primary backgrounds |
| `--primary-400` | `#3B7BE8` | `#60A5FA` | Premium CTA accents |
| `--primary-500` | `#0F54AE` | `#3B82F6` | Sapphire-based active states |
| `--primary-ring` | `rgba(15,84,174,0.35)` | `rgba(59,130,246,0.35)` | Focus rings |

#### Neutral Scale

| Token | Light | Dark |
|-------|-------|------|
| `--color-gray-50` | `#F9FAFB` | `#111827` |
| `--color-gray-100` | `#F3F4F6` | `#1F2937` |
| `--color-gray-200` | `#E5E7EB` | `#374151` |
| `--color-gray-300` | `#D1D5DB` | `#4B5563` |
| `--color-gray-400` | `#9CA3AF` | `#6B7280` |
| `--color-gray-500` | `#6B7280` | `#9CA3AF` |
| `--color-gray-600` | `#4B5563` | `#D1D5DB` |
| `--color-gray-700` | `#374151` | `#E5E7EB` |
| `--color-gray-800` | `#1F2937` | `#F3F4F6` |
| `--color-gray-900` | `#111827` | `#F9FAFB` |

#### Semantic Text

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text-primary` | `#111827` | `#F9FAFB` | Headings, primary text |
| `--color-text-secondary` | `#6B7280` | `#9CA3AF` | Labels, descriptions |
| `--color-text-muted` | `#9CA3AF` | `#6B7280` | Placeholders, hints |

#### Backgrounds

| Token | Light | Dark |
|-------|-------|------|
| `--color-bg-white` | `#FFFFFF` | `#1F2937` |
| `--color-bg-gray` | `#F9FAFB` | `#111827` |
| `--color-bg-light` | `#F3F4F6` | `#1F2937` |
| `--color-surface` | `#FFFFFF` | `#1F2937` |
| `--color-surface-elevated` | `#FFFFFF` | `#283548` |

#### Borders

| Token | Light | Dark |
|-------|-------|------|
| `--color-border` | `#E5E7EB` | `#374151` |
| `--color-border-light` | `#F3F4F6` | `#1F2937` |
| `--border-hairline` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |

#### Semantic Status

| Token | Light | Dark |
|-------|-------|------|
| `--color-success` | `#10B981` | `#34D399` |
| `--color-warning` | `#F59E0B` | `#FBBF24` |
| `--color-error` | `#EF4444` | `#F87171` |
| `--color-info` | `#3B82F6` | `#60A5FA` |

### 5.2 Status Badge Colors

Status badges are the **most critical visual element** in the product (food safety workflows depend on clear status indication).

| Status | BG token | Text token | Light BG | Light Text |
|--------|----------|-----------|----------|-----------|
| Gray (Draft, Not started) | `--status-gray-bg` | `--status-gray-text` | `#F3F4F6` | `#374151` |
| Blue (To-do, Created) | `--status-blue-bg` | `--status-blue-text` | `#EFF6FF` | `#2563EB` |
| Yellow (In-progress, Pending) | `--status-yellow-bg` | `--status-yellow-text` | `#FFFBEB` | `#D97706` |
| Orange (Submitted, Changes req.) | `--status-orange-bg` | `--status-orange-text` | `#FFF7ED` | `#EA580C` |
| Red (Delayed, Rejected, Failed) | `--status-red-bg` | `--status-red-text` | `#FFF1F2` | `#E11D48` |
| Green (Approved, Completed) | `--status-green-bg` | `--status-green-text` | `#ECFDF5` | `#059669` |
| Purple (Late, Abandoned) | `--status-purple-bg` | `--status-purple-text` | `#F5F3FF` | `#7C3AED` |
| Cyan (Imported, Flowchart) | `--status-cyan-bg` | `--status-cyan-text` | `#ECFEFF` | `#0891B2` |

All badge colors have dark mode overrides with `rgba()` backgrounds and lighter text colors.

### 5.3 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family` | `'MozaicGEO', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Everything |
| Monospace | `'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace` | Document IDs (`.td-id`), code |
| Page titles | `1.125rem` (18px), weight 600-700 | Header `<h1>` |
| Section titles / panel headers | `0.875rem` (14px), weight 600 | `.panel-header h2` |
| Body text | `0.875rem` (14px) or `0.8125rem` (13px), weight 400 | Table cells, descriptions |
| Table headers | `0.6875rem` (11px), weight 600, uppercase, `letter-spacing: 0.05em` | `th` in `.data-table-v2` |
| Label text | `14px`, weight 500 | `.form-label` |
| Meta/muted text | `0.75rem` (12px), weight 500 | Timestamps, counts |
| Stat card value | `1.125rem` (18px), weight 700 | `.stat-value` |
| Stat card label | `0.625rem` (10px), weight 600, uppercase | `.stat-label` |
| Badge text | `12px` (badges) or `0.6875rem` (11px, pills), weight 500 | `.badge`, `.status-pill` |
| ID cells | `0.6875rem` (11px), weight 400, monospace | `.td-id` |

### 5.4 Spacing System

Base unit: **4px** (with common multiples).

| Token / Value | Pixels | Usage |
|---------------|--------|-------|
| `4px` | 4 | Minimal gaps (chip gaps, icon margins) |
| `6px` | 6 | Label-to-input gap, small chip padding |
| `8px` | 8 | Standard component gap, badge padding-y |
| `10px` | 10 | Input padding-y, toolbar gaps |
| `12px` | 12 | Card inner gaps, badge padding-x |
| `14px` | 14 | Panel header padding-y |
| `16px` | 16 | Standard content padding, toolbar padding |
| `20px` | 20 | Panel scroll padding, modal header/footer padding |
| `24px` (1.5rem) | 24 | Page content padding, card body padding, modal body padding |
| `48px` (3rem) | 48 | Empty state vertical padding |

### 5.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Action buttons, small controls, checkboxes |
| `--radius` | `6px` | Default inputs, small cards, dropdown items |
| `--radius-md` | `8px` | Inputs, search boxes, toolbar buttons |
| `--radius-lg` | `12px` | Cards, panels, table-card, modals, upload zone |
| `--radius-xl` | `16px` | Badges (pill shape), status pills |
| `9999px` | Full pill | Chips, pills, avatar, toggle switches |

### 5.6 Shadows

| Token | Light | Dark |
|-------|-------|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | stronger |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | stronger |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | stronger |
| `--card-shadow` | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | `0 1px 4px rgba(0,0,0,0.3)...` |
| `--card-shadow-hover` | `0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)` | `0 4px 16px rgba(0,0,0,0.35)...` |

### 5.7 Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms ease` | Button hovers, icon color |
| `--transition` | `200ms ease` | Default transitions |
| `--transition-slow` | `300ms ease` | Layout shifts (sidebar collapse) |

### 5.8 Z-Index Scale

| Layer | Value |
|-------|-------|
| Dropdowns | `100` |
| Sticky headers | `200` |
| Fixed elements | `300` |
| Modal backdrop | `400` (or `999` for action menus) |
| Modal content | `500` (or `1000` for action menus) |
| Popovers | `600` |
| Tooltips | `700` |
| Sidebar | `100` |
| Sidebar collapse toggle | `101` |

### 5.9 Breakpoints

| Name | Value | Usage |
|------|-------|-------|
| sm | `640px` | Mobile |
| md | `768px` | Tablet / stat grid collapse to 2-col |
| lg | `1024px` | Small desktop |
| xl | `1280px` | Standard desktop |
| 2xl | `1536px` | Large desktop |
| `1440px` | — | Table density reduction trigger |
| `1366px` | — | Compact table mode trigger |

---

## 6. Component Patterns

### 6.1 Buttons

**Canonical button structure:**
```scss
// All button variants share this base:
height: 40px;
padding: 0 16px;
font-size: 0.875rem;
font-weight: 500;
border-radius: 10px;
border: 1px solid transparent;
display: inline-flex;
align-items: center;
gap: 8px;
```

| Variant | Class | Background | Text | Border |
|---------|-------|------------|------|--------|
| Primary | `.btn-primary` | `var(--color-primary)` | `#FFFFFF` | transparent |
| Secondary | `.btn-secondary` | `var(--color-white)` | `var(--color-text-primary)` | `var(--color-border)` |
| Text | `.btn-text` | transparent | `var(--color-primary)` | none |
| Success | `.btn-success` | `var(--color-success)` | `#FFFFFF` | transparent |
| Danger | `.btn-danger` | `var(--color-error)` | `#FFFFFF` | transparent |
| Danger Outline | `.btn-danger-outline` | `var(--color-white)` | `var(--color-error)` | `#FECACA` |

**Size variants:**

| Size | Class | Height | Padding | Font size |
|------|-------|--------|---------|-----------|
| Extra small | `.btn-xs` | `28px` | `0 10px` | `0.75rem` |
| Small | `.btn-sm` | `34px` | `0 12px` | `0.8125rem` |
| Default | (none) | `40px` | `0 16px` | `0.875rem` |
| Large | `.btn-lg` | `44px` | `0 20px` | `0.9375rem` |
| Toolbar | (inside `.table-toolbar`) | `36px` | `0 14px` | `0.8125rem` |

**Disabled state:** `opacity: 0.5; cursor: not-allowed;` (primary variant uses gray background instead of opacity).

**Do:** Use the global `.btn-*` classes from `styles.scss`.
**Don't:** Create custom button styles per component. Don't use Material buttons.

### 6.2 Status Badges and Pills

**Status badge (standard):**
```scss
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 16px;
}
```
Use `.badge-gray`, `.badge-blue`, `.badge-yellow`, `.badge-orange`, `.badge-red`, `.badge-green`, `.badge-purple`, `.badge-cyan`.

**Status pill (compact variant):**
```scss
.status-pill {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 9999px;
}
```

**Department pill:**
```scss
.dept-pill {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 9999px;
  // Color set dynamically per department
}
```

**Rule:** Status badges use the `--status-*-bg` and `--status-*-text` CSS variables. Never hardcode badge colors.

**Do:** Use pill shape (`border-radius: 16px` or `9999px`) for all status indicators.
**Don't:** Use rectangular badges, outlined badges, or badge-with-icon for status. Don't use badges for document IDs (use `.td-id` plain text instead).

### 6.3 Tabs (Segmented Pill Pattern)

The **canonical tab style** is a segmented pill (not underline tabs):

```scss
.toolbar-tabs {
  display: flex;
  background: var(--tab-rail-bg);    // gray-50 light, gray-200 dark
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
  width: fit-content;
}

.tab-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 8px;
  color: var(--tab-text);
  background: transparent;

  &.active {
    background: var(--tab-active-bg);   // white light, surface dark
    color: var(--tab-active-text);      // gray-900 light, text-primary dark
    box-shadow: var(--tab-active-shadow); // subtle elevation
  }
}
```

**Tab features:**
- Optional `.tab-count` badge (pill inside tab button, shows count)
- Optional `.tab-dot` (colored circle indicator)
- Optional `.tab-icon` (small SVG icon)
- Small variant: `.toolbar-tabs--sm` (2px padding, 4px radius, 0.75rem font)

**Placement rules:**
- Inside a card as first child: `margin: 16px 20px 0`
- Inside toolbar-left: `flex-shrink: 0`, no extra margin
- Always above the table scroll area

**Do:** Use the segmented pill pattern for all tab navigation.
**Don't:** Use underline tabs (legacy), Material tabs, or custom tab implementations.

### 6.4 Empty States

```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
```

**Structure:**
1. Icon: 48×48 SVG, stroke-only, `color: #9CA3AF`
2. Title: `16px`, weight 600, `color: --color-text-primary`
3. Description: `14px`, `color: --color-text-secondary`, max-width `360px`
4. Optional action button: primary-light style

**Available icons:** `search`, `folder`, `users`, `clipboard`, `default` (briefcase).

**Use the shared `<app-empty-state>` component:**
```html
<app-empty-state
  icon="folder"
  title="No documents yet"
  description="Upload your first document to get started."
  actionLabel="Upload Document"
  (action)="openUpload()"
/>
```

### 6.5 Loading States

- **Spinner:** `24×24px` circular border animation (`.loader` class)
- **Skeleton loader:** `<app-skeleton-loader>` shared component for content placeholders

---

## 7. Dashboard Patterns

### 7.1 KPI Stat Cards

```scss
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  // or repeat(5, 1fr) with .stats-grid--5
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--color-white);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);     // 12px
  box-shadow: var(--card-shadow);
  transition: box-shadow .22s ease;
  &:hover { box-shadow: var(--card-shadow-hover); }
}
```

**Stat card internal structure:**
```
.stat-card
  ├── .stat-icon (flex center, 0.55 opacity, icon SVG)
  ├── .stat-body (flex column)
  │   ├── .stat-label (10px, uppercase, gray-500, ORDER: -1 → renders above value)
  │   └── .stat-value (18px, weight 700, gray-900) + optional .stat-unit
```

**Key rules:**
- Label is styled with `order: -1` so it visually appears ABOVE the value despite being after it in DOM
- Icon opacity is `0.55` (muted, not competing with value)
- No border on stat cards — shadow only
- Responsive: collapses to 2-column grid at `768px`

### 7.2 Dashboard Panels

```scss
.panel {
  background: var(--color-white);
  border-radius: var(--radius-lg);  // 12px
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-hairline);
  h2 { font-size: 0.875rem; font-weight: 600; }
}

.panel-scroll {
  padding: 20px;
  overflow-y: auto;
  // Custom thin scrollbar styling
}
```

**"View all" link:** `.view-link` — `0.75rem`, weight 500, primary color, right-aligned in panel header.

### 7.3 Chart Containers

Charts are placed inside `.panel` components. The panel header contains the chart title and optional view-link. Chart content sits in `.panel-scroll` or a custom chart wrapper.

**Chart color tokens:**
- `--meter-green`: `#5FD492` (light) / `#34D399` (dark)
- `--meter-blue`: `#8A9DDC` (light) / `#93C5FD` (dark)
- `--meter-amber`: `#E8C96E` (light) / `#FCD34D` (dark)

### 7.4 Progress Meters

```scss
.meter-cell { display: flex; align-items: center; gap: 6px; }
.meter { flex: 1; max-width: 64px; height: 4px; background: var(--color-gray-200); border-radius: 2px; }
.meter-fill { height: 100%; border-radius: 2px; transition: width .3s ease; }
.meter-label { font-size: 0.75rem; color: var(--color-gray-500); font-variant-numeric: tabular-nums; }
```

---

## 8. Table and List Patterns

### 8.1 Table System v2 (Canonical)

The canonical table system is `.data-table-v2` inside a `.table-card` container.

**Full structure:**
```
.table-page (flex column, height: 100%, gap: 0.75rem)
  ├── .stats-grid (optional)
  ├── .table-card (flex: 1, shadow card)
  │   ├── .toolbar-tabs (optional segmented tabs)
  │   ├── app-table-toolbar (or .table-toolbar inline)
  │   │   ├── .toolbar-left (search + tabs + result count)
  │   │   └── .toolbar-right (filter btn + action btn)
  │   ├── .active-chips-row (optional filter chips)
  │   ├── .table-scroll (flex: 1, overflow auto)
  │   │   └── table.data-table-v2
  │   │       ├── thead (sticky top: 0)
  │   │       └── tbody
  │   └── .table-footer (pagination)
```

### 8.2 Table Header

```scss
th {
  padding: 10px 16px;
  font-size: 0.6875rem;         // 11px
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-500);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
  white-space: nowrap;
}
```

### 8.3 Table Rows

```scss
tbody tr {
  height: 64px;
  cursor: pointer;
  transition: background .1s;
  &:hover { background: var(--color-gray-50); }
  &:last-child td { border-bottom: none; }
}

td {
  padding: 0 16px;
  font-size: 0.8125rem;       // 13px
  color: var(--color-gray-700);
  border-bottom: 1px solid var(--color-gray-100);
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### 8.4 Special Cell Types

**ID cell (document numbers):**
```scss
.td-id {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--color-gray-400);
  letter-spacing: 0.02em;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  font-variant-numeric: tabular-nums;  // implied by monospace
}
```

**Entity cell (name + subtitle):**
```scss
.entity-cell { display: flex; align-items: center; gap: 10px; }
.entity-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-gray-900); }
.entity-sub { font-size: 0.6875rem; color: var(--color-gray-400); }
```

**Numeric cell:** `.num-cell` — `font-variant-numeric: tabular-nums;`

**Zero/empty value:** `.zero-muted` — gray-300, no bold

**Activity/date text:** `.activity-text` — `0.75rem`, gray-500

**Overdue text:** `.overdue-text` — error color, weight 500

### 8.5 Action Column

```scss
.action-btn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);  // 4px
  color: var(--color-gray-400);
  &:hover { background: var(--color-gray-100); color: var(--color-gray-700); }
}

.action-dropdown-fixed {
  position: fixed;              // Portal-based, not relative
  min-width: 190px;
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);  // 8px
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  z-index: 1000;
  padding: 4px;
}

.dropdown-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  font-size: 0.8125rem;
  border-radius: var(--radius-sm);
  &:hover { background: var(--color-gray-50); }
}
```

**Rule:** Action menus always use the kebab (three dots) button. Never inline action buttons in table rows.

### 8.6 Table Footer (Pagination)

```scss
.table-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border-hairline);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
```

Shows: "Showing X to Y of Z" info (left) + page size select + page navigation (right).

### 8.7 Table Toolbar

The `<app-table-toolbar>` shared component provides:
- Left side: tabs, search box, result count
- Right side: filter button (with popover), primary action button
- Two variants: `standalone` (own card) or `embedded` (flat strip inside table-card)

**Search box:**
```scss
.search-box {
  min-width: 260px; max-width: 380px;
  height: 36px;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  &:focus-within { border-color: var(--color-sapphire); box-shadow: 0 0 0 3px rgba(15,84,174,.08); }
}
```

### 8.8 Filter System

**Filter popover:**
```scss
.filter-popover {
  position: absolute;
  top: calc(100% + 6px);
  width: 360px;
  max-height: 520px;
  overflow-y: auto;
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px rgba(0,0,0,.14);
  z-index: 200;
  padding: 0.875rem;
}
```

**Filter chips (selection):**
```scss
.filter-chip {
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 9999px;
  &.active { background: rgba(15,84,174,.1); color: var(--color-sapphire); border-color: var(--color-sapphire); }
}
```

**Active filter chips (applied):**
```scss
.active-chip {
  padding: 3px 10px;
  font-size: 0.6875rem;
  color: var(--color-sapphire);
  background: rgba(15,84,174,.06);
  border: 1px solid rgba(15,84,174,.18);
  border-radius: 9999px;
}
```

---

## 9. Forms and Modal Patterns

### 9.1 Form Fields

**Standard form group:**
```scss
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.form-hint { font-size: 14px; color: var(--color-text-secondary); margin-top: 6px; }
.form-error { font-size: 14px; color: var(--color-error); margin-top: 6px; }
```

**Input field:**
```scss
.form-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);  // 8px
  background: var(--color-white);
  &:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--primary-ring); }
  &::placeholder { color: var(--color-text-muted); }
  &.error { border-color: var(--color-error); }
}
```

**Select:** `.form-select` extends `.form-input` with custom chevron SVG via `background-image`.

**Textarea:** `.form-textarea` extends `.form-input` with `min-height: 100px; resize: vertical;`

**Small variant:** `.form-input--sm` — `padding: 6px 10px; font-size: 0.8125rem;`

### 9.2 Checkboxes and Toggles

**Custom checkbox (inside filters):**
```scss
.checkbox-custom {
  width: 16px; height: 16px;
  border: 2px solid var(--color-gray-300);
  border-radius: 3px;
  // Checked: primary color background with white checkmark
}
```

**Toggle switch:**
```scss
.toggle-switch {
  width: 36px; height: 20px;
  border-radius: 10px;
  background: var(--color-gray-300);
  &.active { background: var(--color-sapphire); }
  .toggle-knob { width: 16px; height: 16px; border-radius: 50%; background: white; }
}
```

### 9.3 Modals / Dialogs

**Modal overlay:**
```scss
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: fadeIn var(--transition-fast);
}
```

**Modal container:**
```scss
.modal, .modal-container {
  background: var(--color-white);
  border-radius: var(--radius-lg);  // 12px
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp var(--transition);
}
```

**Modal structure:**
```
.modal-container
  ├── .modal-header (padding: 16px 20px, border-bottom)
  │   ├── h2 (1rem, weight 600)
  │   └── .close-btn (32×32, radius 6px, X icon)
  ├── .modal-body (padding: 1.5rem, overflow-y: auto)
  └── .modal-footer (padding: 12px 20px, border-top, gray-50 background)
      └── buttons (right-aligned, gap: 8px)
```

**Modal footer actions:** Always `justify-content: flex-end`. Cancel button first (secondary), confirm button second (primary).

**Upload modal variant:** `.modal-container.upload` — fixed `width: 480px`, includes dropzone and file list.

### 9.4 Upload Dropzone

```scss
.upload-dropzone {
  padding: 2rem 1.5rem;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-gray);
  &:hover, &.drag-over { border-color: var(--color-primary); background: var(--color-primary-light); }
}
```

**Structure:** Icon (48px circle) → "Click to upload" text with primary-colored link → hint text (formats/size).

### 9.5 File Info Row

```scss
.upload-file-info {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-gray);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
```

---

## 10. Media, Avatar, and Image Rules

### 10.1 User Avatars

Use the shared `<app-user-avatar>` component. **All avatars are always circular.**

**Sizes:**

| Size | Dimensions | Font size |
|------|-----------|-----------|
| `sm` | `28×28px` | `0.625rem` |
| `md` | `32×32px` | `0.6875rem` |
| `lg` | `48×48px` | `1rem` |
| `xl` | `64×64px` | `1.375rem` |

**Visual treatment:**
- No image: Deterministic gradient background (12-color vivid palette) based on name hash
- With image: `object-fit: cover; border-radius: 50%;`
- Ring: `box-shadow: 0 0 0 2px rgba(255,255,255,.85), 0 0 0 3px rgba(0,0,0,.06)`
- Optional department color ring

**Rule:** Never use square avatars. Never use plain colored circles without gradient. Always use `<app-user-avatar>`.

### 10.2 Avatar Gradient Palette

12 deterministic gradient pairs (from → to):

| Index | From | To | Name |
|-------|------|----|------|
| 0 | `#5B5CE8` | `#7B86F2` | indigo |
| 1 | `#7C52EA` | `#A07AE8` | violet |
| 2 | `#0EB5D0` | `#5CD8EE` | cyan |
| 3 | `#10B882` | `#58E0B8` | emerald |
| 4 | `#E8A010` | `#F0C640` | amber |
| 5 | `#E8488E` | `#F298C2` | pink |
| 6 | `#3A7EEC` | `#88B8F4` | blue |
| 7 | `#14B8A0` | `#52E0CC` | teal |
| 8 | `#F07818` | `#F4A868` | orange |
| 9 | `#7C52EA` | `#A898EC` | purple |
| 10 | `#18A0DC` | `#70C8F2` | sky |
| 11 | `#78C018` | `#A8E050` | lime |

Gradient direction: `135deg` with a `radial-gradient` overlay at 30% 30% for depth.

### 10.3 Icons

- Custom SVG icon set in `/assets/icons/` (176+ icons)
- Inline SVG preferred for interactive elements
- Standard icon sizes: `16px`, `18px`, `20px`, `24px`, `32px`, `48px`
- Sidebar icons use CSS `mask-image` technique (color controlled via `background-color`)
- Stroke-based icons (not filled) for consistency

---

## 11. Interaction Rules

### 11.1 Hover States

| Element | Hover effect |
|---------|-------------|
| Table rows | `background: var(--color-gray-50)` |
| Cards / stat cards | `box-shadow: var(--card-shadow-hover)` |
| Buttons | Background color shift (darker primary, lighter secondary) |
| Nav links | `background: rgba(255,255,255,0.5)` |
| Action buttons | `background: var(--color-gray-100); color: var(--color-gray-700)` |
| Dropdown items | `background: var(--color-gray-50)` |

### 11.2 Focus States

All interactive elements use `box-shadow: 0 0 0 3px var(--primary-ring)` on focus, with `outline: none`. The focus ring color adapts to dark mode.

### 11.3 Active / Selected States

- Nav link active: Glass effect with `backdrop-filter: blur(8px)` and section color
- Tab active: White background with subtle shadow (`.tab-active-shadow`)
- Filter chip active: Sapphire border + background tint
- Table row selected: Not implemented globally (row click navigates)

### 11.4 Scrollbar Styling

```scss
scrollbar-width: thin;
scrollbar-color: rgba(0,0,0,0.08) transparent;
&::-webkit-scrollbar { width: 5px; }
&::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
```

Dark mode uses `rgba(255,255,255,0.12)` for scrollbar thumb.

### 11.5 Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `fadeIn` | `var(--transition-fast)` | Modal overlay |
| `slideUp` | `var(--transition)` | Modal content entry |
| `spin` | `1s linear infinite` | Loading spinner |
| `sbGradientFlow` | `18s` | Sidebar gradient drift |
| `sbShimmer` | `12s` | Sidebar shimmer effect |

**Reduced motion:** All animations respect `prefers-reduced-motion: reduce`.

### 11.6 Dropdown / Popover Placement

- Action dropdowns: `position: fixed` (portal-based), calculated from trigger element position
- Filter popovers: `position: absolute`, right-aligned by default, with auto-flip logic
- All dropdowns use a transparent full-screen backdrop overlay for click-outside dismissal

---

## 12. Content and Spacing Rules

### 12.1 Page-Level Spacing

| Area | Spacing |
|------|---------|
| Page content padding | `1.5rem` (24px) all sides |
| Gap between stat cards and table card | `0.75rem` (12px) |
| Stat grid internal gap | `0.75rem` (12px) |
| Between major page sections | `0.75rem` (12px, via `.table-page` gap) |

### 12.2 Card-Level Spacing

| Area | Spacing |
|------|---------|
| Card body | `1.5rem` (24px) |
| Card header | `1rem 1.5rem` (16px 24px) |
| Card footer | `1rem 1.5rem` (16px 24px) |
| Panel header | `14px 20px` |
| Panel scroll body | `20px` |

### 12.3 Table-Level Spacing

| Area | Spacing |
|------|---------|
| Toolbar padding | `16px` |
| Table header cell | `10px 16px` |
| Table body cell | `0 16px` (vertical from row height) |
| Table footer | `12px 16px` |
| Active chips row | `0 16px 12px` |

### 12.4 Form Spacing

| Area | Spacing |
|------|---------|
| Form group bottom margin | `1rem` (16px) |
| Label to input gap | `6px` |
| Input padding | `10px 14px` |
| Hint/error top margin | `6px` |
| Modal body | `1.5rem` (24px) padding, or `20px` padding + `12px` gap for upload |

### 12.5 Vertical Rhythm in Content

- Use consistent `gap` values (flex/grid gap) over manual margins
- Primary gap values: `4px`, `6px`, `8px`, `10px`, `12px`, `16px`, `20px`, `24px`
- Never use arbitrary gaps (e.g., `7px`, `11px`, `17px`)

---

## 13. Cross-Module Consistency Rules

### 13.1 Every Table Page Must Follow Table System v2

Structure: `.table-page` → optional `.stats-grid` → `.table-card` → toolbar → table → footer.

**No exceptions.** All modules that show a list of entities must use this pattern.

### 13.2 Every Status Uses the Same Badge System

All status values across all modules must map to one of the 8 badge colors (gray, blue, yellow, orange, red, green, purple, cyan). No custom status colors per module.

### 13.3 Document IDs Are Always Plain Monospace

`.td-id` class: monospace font, gray-400, 11px. Never badges, chips, or styled pills for IDs.

### 13.4 All Action Menus Use Kebab Pattern

Three-dot button → fixed-position dropdown. Never inline buttons in table rows.

### 13.5 Empty States Use the Shared Component

`<app-empty-state>` with icon, title, description, and optional action. Never custom empty state HTML.

### 13.6 User Avatars Use the Shared Component

`<app-user-avatar>` with deterministic gradients. Never manual avatar circles.

### 13.7 All Forms Use Global Form Classes

`.form-group`, `.form-label`, `.form-input`, `.form-error`, `.form-hint`. Never custom input styling.

### 13.8 Buttons Use Global Button Classes

`.btn-primary`, `.btn-secondary`, `.btn-text`, `.btn-danger`, etc. Size variants via `.btn-sm`, `.btn-xs`, `.btn-lg`.

### 13.9 Color References Are Always CSS Variables

No hardcoded hex in component styles. If a color is needed, reference a `--color-*` or `--status-*` variable.

### 13.10 Cards Use Shadow-Only Surfaces

`box-shadow: var(--card-shadow)` with `border: 1px solid transparent`. Not `border: 1px solid var(--color-border)`.

---

## 14. Legacy Patterns to Avoid

### 14.1 Underline Tabs

**Legacy:** `border-bottom: 2px solid` active indicator on tabs.
**Canonical:** Segmented pill tabs (`.toolbar-tabs` + `.tab-btn`).

### 14.2 Bordered Cards

**Legacy:** Cards with `border: 1px solid #E5E7EB`.
**Canonical:** Cards with `box-shadow: var(--card-shadow)` and `border: 1px solid transparent`.

### 14.3 Hardcoded Colors

**Legacy:** `color: #6B7280;` directly in component SCSS.
**Canonical:** `color: var(--color-text-secondary);`

### 14.4 Material Angular Components

**Legacy:** Using `mat-table`, `mat-tab-group`, `mat-dialog`, `mat-button`.
**Canonical:** Custom HTML + global CSS classes. No Angular Material dependency in UI components.

### 14.5 Inline Action Buttons in Tables

**Legacy:** Edit/Delete buttons visible in every row.
**Canonical:** Kebab menu (`.action-btn`) that opens a fixed-position dropdown.

### 14.6 Square Avatars

**Legacy:** Rectangular or rounded-square avatar images.
**Canonical:** Always circular (`border-radius: 50%`) via `<app-user-avatar>`.

### 14.7 Custom Status Colors Per Module

**Legacy:** Module-specific status color definitions.
**Canonical:** Shared `--status-*-bg` and `--status-*-text` variables for all modules.

### 14.8 `.data-table` (v1)

**Legacy:** `.data-table` class with different padding, header styling.
**Canonical:** `.data-table-v2` with sticky headers, fixed layout, standardized density.

### 14.9 SCSS Variables Instead of CSS Custom Properties

**Legacy:** `$indigo: #56006E;` in SCSS files (MES `_variables.scss`).
**Canonical:** CSS custom properties (`--color-primary: #1A56DB;`) in `:root` for runtime theming.

**Exception:** MES module SCSS variables are acceptable for MES-specific build-time values, but shared tokens must use CSS custom properties.

### 14.10 Non-Standard Button Sizing

**Legacy:** Custom heights (42px, 38px, etc.) and padding per component.
**Canonical:** Standard sizes: `28px` (xs), `34px` (sm), `40px` (default), `44px` (lg), `36px` (toolbar).

---

## 15. Migration and Implementation Checklist

Use this checklist when building a new module or migrating an existing one:

### New Module Checklist

- [ ] Page uses `.table-page` wrapper (flex column, full height)
- [ ] KPI section uses `.stats-grid` + `.stat-card` pattern
- [ ] Table uses `.table-card` → `.table-toolbar` → `.data-table-v2` → `.table-footer`
- [ ] Tabs use segmented pill (`.toolbar-tabs` + `.tab-btn`)
- [ ] Status badges use `.badge-{color}` with CSS variables
- [ ] ID cells use `.td-id` (monospace, gray, no badge)
- [ ] Actions use kebab dropdown (`.action-btn` + `.action-dropdown-fixed`)
- [ ] Entity cells use `.entity-cell` + `<app-user-avatar>` (if showing people)
- [ ] Empty states use `<app-empty-state>` component
- [ ] Forms use `.form-group` + `.form-label` + `.form-input`
- [ ] Modals use `.modal-overlay` + `.modal-container` + header/body/footer
- [ ] All colors reference CSS variables (no hardcoded hex)
- [ ] Dark mode works correctly (test with theme toggle)
- [ ] Responsive behavior tested at 1440px, 1366px, 768px breakpoints

### Migration from Legacy Checklist

- [ ] Replace `border` on cards with `box-shadow: var(--card-shadow)` + transparent border
- [ ] Replace underline tabs with segmented pill tabs
- [ ] Replace `.data-table` with `.data-table-v2`
- [ ] Replace hardcoded colors with CSS variables
- [ ] Replace inline action buttons with kebab menu
- [ ] Replace Material components with custom HTML + global classes
- [ ] Replace custom avatar implementations with `<app-user-avatar>`
- [ ] Replace custom empty states with `<app-empty-state>`
- [ ] Add dark mode support (verify all colors use CSS variables)

---

## 16. Handoff Guidance for Another Repo or Team

### What to Copy

1. **CSS custom properties** — The entire `:root` and `[data-theme="dark"]` blocks from `styles.scss`
2. **Global component classes** — All `.btn-*`, `.badge-*`, `.data-table-v2`, `.stat-card`, `.panel`, `.modal-*`, `.form-*`, `.toolbar-*` classes
3. **MozaicGEO font files** — 9 weight variants (OTF) from `/assets/fonts/`
4. **Shared component contracts** — Empty state, user avatar, table toolbar, table pagination, date picker

### What to Adapt

1. **Section header colors** — Replace module color map with your own product's section colors
2. **Sidebar gradient** — Replace pastel palette with your brand gradient
3. **Primary color** — Change `--color-primary` (currently `#1A56DB`) to your brand blue
4. **Font family** — Replace MozaicGEO with your brand font (keep the same size scale)
5. **Icon set** — Replace SVG icons with your icon library (keep same sizes)

### What to Preserve

1. **Shadow-only card pattern** — Do not add borders
2. **Segmented pill tabs** — Do not use underline tabs
3. **Status badge color system** — 8 semantic colors, pill shape
4. **Table system v2 density** — 64px rows, 10px+16px header, sticky headers
5. **Spacing scale** — 4px base, multiples of 4
6. **Dark mode architecture** — CSS variable overrides in single `[data-theme]` block
7. **Avatar system** — Always circular, gradient backgrounds, ring shadow

### Implementation Order (for a new app)

1. Set up CSS variables (`:root` + dark overrides)
2. Load fonts and define base typography
3. Build app shell (sidebar + header + content area)
4. Implement global button, form, and badge classes
5. Build table system (table-card → toolbar → data-table-v2 → footer)
6. Build modal system
7. Build dashboard patterns (stat cards, panels, charts)
8. Build shared components (avatar, empty state, toolbar, pagination)
9. Apply to first feature module and verify all patterns
10. Dark mode QA pass

---

## 17. Audited Reference Screens and Files

### Primary Files Inspected

| File | Lines | Content |
|------|-------|---------|
| `apps/cati-web/src/styles.scss` | ~1300 | All global CSS: variables, resets, buttons, forms, cards, tables, badges, modals, tabs, filters, animations, responsive |
| `apps/cati-web/CLAUDE.md` | ~570 | Design rules, color palette, component patterns, architecture conventions |
| `apps/cati-web/src/app/core/layout/main-layout.component.html` | 28 | App shell template |
| `apps/cati-web/src/app/core/layout/main-layout.component.scss` | 55 | App shell styles |
| `apps/cati-web/src/app/core/layout/sidebar/sidebar.component.scss` | 949 | Full sidebar styles (light + dark, animations) |
| `apps/cati-web/src/app/core/layout/header/header.component.html` | 326 | Header template (search, theme, notifications, user menu) |
| `apps/cati-web/src/app/core/services/theme.service.ts` | 56 | Theme toggle (light/dark) |
| `apps/cati-web/src/app/features/mes/services/mes-theme.service.ts` | 31 | MES theme delegation |
| `apps/cati-web/src/app/features/mes/styles/_variables.scss` | 248 | MES-specific SCSS tokens |
| `apps/cati-web/src/app/shared/components/empty-state/empty-state.component.ts` | 134 | Shared empty state |
| `apps/cati-web/src/app/shared/components/table-toolbar/table-toolbar.component.ts` | 153 | Shared table toolbar |
| `apps/cati-web/src/app/shared/components/user-avatar/user-avatar.component.ts` | 261 | Shared avatar component |

### Shared Component Inventory

| Component | Selector | Purpose |
|-----------|----------|---------|
| UserAvatar | `<app-user-avatar>` | Deterministic gradient avatars |
| TableToolbar | `<app-table-toolbar>` | Shared table toolbar with search, tabs, filters |
| TablePagination | `<app-table-pagination>` | Shared pagination |
| EmptyState | `<app-empty-state>` | Centered empty/zero state |
| DatePicker | `<app-date-picker>` | Styled date picker (Flatpickr) |
| LoadingSpinner | `<app-loading-spinner>` | Circular loading animation |
| SkeletonLoader | `<app-skeleton-loader>` | Content placeholder |
| ErrorPanel | `<app-error-panel>` | Error display |
| CopilotWidget | `<app-copilot-widget>` | AI assistant overlay |

### Canonical Reference Modules

| Module | Best example of |
|--------|----------------|
| `audit-management` | KPI cards, charts, card grids, filters, kebab menus |
| `documents` | Table + toolbar + pagination, upload modal, CRUD |
| `trainings` | Dashboard composition, participant tables, stepper forms |
| `company-settings` | Settings tabs, summary cards, form modals |
| `compliance` | Full table system v2, segmented tabs, status badges |
| `safety-incidents` | Detail pages, form layouts, cross-module references |

### MES-Specific Reference

| File | Purpose |
|------|---------|
| `mes/styles/_variables.scss` | Orange-themed SCSS variables for MES portal |
| `mes/styles/_mixins.scss` | MES-specific SCSS mixins |
| `mes/services/mes-theme.service.ts` | Delegates to global ThemeService |

---

## Appendix A: Quick Token Reference Card

```
COLORS
  Primary:     --color-primary (#1A56DB / #3B82F6)
  Text:        --color-text-primary | secondary | muted
  Background:  --color-bg-white | gray | light
  Border:      --color-border | border-light | border-hairline
  Surface:     --color-surface | surface-elevated | surface-hover

TYPOGRAPHY
  Font:        MozaicGEO (100-900)
  Mono:        SFMono-Regular, Consolas
  Sizes:       0.625rem · 0.6875rem · 0.75rem · 0.8125rem · 0.875rem · 1rem · 1.125rem · 1.25rem · 1.5rem
  Weights:     400 (body) · 500 (labels) · 600 (headings) · 700 (stats)

SPACING
  4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 48 px

RADIUS
  4 · 6 · 8 · 10 · 12 · 16 · 9999 px

SHADOWS
  --card-shadow (default) → --card-shadow-hover (interactive)
  --shadow-sm · --shadow · --shadow-md · --shadow-lg

Z-INDEX
  100 dropdown · 200 sticky · 300 fixed · 400-500 modal · 600 popover · 700 tooltip

BUTTONS
  Height: 28 (xs) · 34 (sm) · 36 (toolbar) · 40 (default) · 44 (lg)
  Radius: 10px · 6px (xs)

TABLE ROWS
  Height: 64px (default) · 56px (compact at <1366px) · 52px (v1 legacy)

STATUS BADGES
  gray · blue · yellow · orange · red · green · purple · cyan
  Pill: border-radius 16px, padding 4px 12px, 12px font
```

---

## Appendix B: Dark Mode Token Mapping

The dark mode system inverts the gray scale and adjusts brand/status colors for contrast.

**Key inversion rule:** Gray scale values swap position (gray-50 becomes the darkest, gray-900 becomes the lightest). Brand colors shift toward brighter/lighter variants. Status badge backgrounds use `rgba()` with ~20% opacity.

**Testing:** Toggle dark mode via the sun/moon icon in the header. Verify all surfaces, text, borders, badges, and interactive states are readable.

---

*End of CAT-I.AI Design System Master Reference*
