import { Lead, Note, KBDocument, Activity, Message, TeamMember, MESSection, MESModule, CalendarEvent, Customer, DemoRequest, ContentPiece, EmailCampaign, EmailTemplate, IntakeSubmission } from '../models';

// CONSTANTS
export const MODULE_PRICES: Record<string, number> = {
  'CAT-I': 36000,
  'CAT-MES': 15000,
  'CAT-QT': 15000,
  'CAT-SCAN': 15000,
  'CAT-ALOG': 15000,
  'Full Platform': 72000,
};

export const ALL_MODULES = ['CAT-I', 'CAT-MES', 'CAT-QT', 'CAT-SCAN', 'CAT-ALOG', 'Full Platform'];
export const SOURCES = ['Website', 'Referral', 'Trade Show', 'LinkedIn', 'Conference', 'Cold Outreach', 'Intake Form', 'Other'];
export const INDUSTRIES = ['Bakery', 'Beverage', 'Dairy', 'Meat & Poultry', 'Produce', 'Seafood', 'Snack Foods', 'Other'];
export const CERT_OPTIONS = ['SQF', 'BRC', 'FSSC 22000', 'IFS', 'USDA Organic', 'ISCC Plus', 'BAP', 'None'];

// TEAM
export const TEAM: TeamMember[] = [
  { id: 1, name: 'Aisha', role: 'CEO / Founder', color: '#A02195', status: 'online', tz: 'PST', city: 'Seattle, WA', utcOffset: -7, email: 'aisha@cat-i.ai' },
  { id: 2, name: 'Suresh', role: 'CTO', color: '#1A56DB', status: 'online', tz: 'IST', city: 'India', utcOffset: 5.5, email: 'suresh@cat-i.ai' },
  { id: 3, name: 'Artem', role: 'COO', color: '#0D9488', status: 'away', tz: 'EET', city: 'Ukraine', utcOffset: 2, email: 'artem@cat-i.ai' },
  { id: 4, name: 'Charlton', role: 'CPO', color: '#7C3AED', status: 'online', tz: 'EST', city: 'East Coast', utcOffset: -4, email: 'charlton@cat-i.ai' },
  { id: 5, name: 'Tiffini', role: 'CAO', color: '#D97706', status: 'offline', tz: 'CST', city: 'Central US', utcOffset: -5, email: 'tiffini@cat-i.ai' },
  { id: 6, name: 'David', role: 'Customer Success', color: '#34A125', status: 'online', tz: 'PST', city: 'West Coast', utcOffset: -7, email: 'david@cat-i.ai' },
  { id: 7, name: 'Igor', role: 'Developer', color: '#E11D48', status: 'online', tz: 'EET', city: 'Ukraine', utcOffset: 2, email: 'igor@cat-i.ai' },
  { id: 8, name: 'Ahilan', role: 'Developer', color: '#D99808', status: 'away', tz: 'IST', city: 'India', utcOffset: 5.5, email: 'ahilan@cat-i.ai' },
  { id: 9, name: 'Yael', role: 'Content & Marketing', color: '#EC6B15', status: 'online', tz: 'PST', city: 'West Coast', utcOffset: -7, email: 'yael@cat-i.ai' },
];

// Helper to create seed notes
function seedNote(id: number, author: string, content: string, daysAgo: number): Note {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id, author, content, createdAt: d.toISOString() };
}

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

// LEADS
export const SEED_LEADS: Lead[] = [
  { id: 1, company: 'SunFresh Foods', contact: 'Maria Chen', title: 'VP Quality', stage: 'Demo', value: 72000, probability: 55, modules: ['CAT-I', 'CAT-QT'], certifications: ['SQF L2', 'FSSC 22000'], facilities: 3, owner: 'David', priority: 'high', lastActivity: 'Mar 23', nextAction: 'Deliver product demo', source: 'Website', notes: [seedNote(1, 'David', 'Interested in AI doc generation. Currently using spreadsheets for HACCP.', 7)], industry: 'Produce', email: 'mchen@sunfresh.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(80), intakeStatus: 'completed' },
  { id: 2, company: 'Pacific Grain Co', contact: 'James Wright', title: 'Dir Food Safety', stage: 'Follow-up', value: 108000, probability: 75, modules: ['CAT-I', 'CAT-MES', 'CAT-QT'], certifications: ['SQF L3', 'ISCC Plus'], facilities: 5, owner: 'Charlton', priority: 'high', lastActivity: 'Mar 22', nextAction: 'Address pricing questions and close', source: 'Referral', notes: [seedNote(2, 'Charlton', 'Multi-facility. Need enterprise pricing.', 8), seedNote(3, 'David', 'James mentioned they want CAT-SCAN too — revisit pricing.', 3)], industry: 'Bakery', email: 'jwright@pacgrain.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(60), intakeStatus: 'completed' },
  { id: 3, company: 'Bright Harvest Dairy', contact: 'Susan Park', title: 'QA Manager', stage: 'Discovery', value: 36000, probability: 10, modules: ['CAT-I'], certifications: ['SQF L2'], facilities: 1, owner: 'David', priority: 'medium', lastActivity: 'Mar 20', nextAction: 'Schedule MES Intake call', source: 'Event', notes: [seedNote(4, 'David', 'Met at IAFP. Small but growing.', 10)], industry: 'Dairy', email: 'spark@brightharvest.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(40) },
  { id: 4, company: 'Coastal Seafood Inc', contact: 'Robert Tanaka', title: 'CEO', stage: 'Discovery', value: 51000, probability: 10, modules: ['CAT-I', 'CAT-SCAN'], certifications: ['BRC', 'BAP'], facilities: 2, owner: 'Aisha', priority: 'medium', lastActivity: 'Mar 24', nextAction: 'Send intro email and qualify', source: 'LinkedIn', notes: [seedNote(5, 'Aisha', 'Inbound from LinkedIn. BRC, may need SQF transition.', 6)], industry: 'Seafood', email: 'rtanaka@coastalseafood.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(20) },
  { id: 5, company: 'Green Valley Organics', contact: 'Diana Reeves', title: 'Plant Mgr', stage: 'Follow-up', value: 72000, probability: 75, modules: ['Full Platform'], certifications: ['SQF L2', 'USDA Organic'], facilities: 2, owner: 'Charlton', priority: 'high', lastActivity: 'Mar 24', nextAction: 'Final review — close by Apr 5', source: 'Referral', notes: [seedNote(6, 'Charlton', 'Full platform. Legal reviewing MSA. Target close: Apr 5.', 5)], industry: 'Produce', email: 'dreeves@greenvalley.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(150), intakeStatus: 'completed' },
  { id: 6, company: 'Mountain Bake Co', contact: 'Tom Hendricks', title: 'Quality Dir', stage: 'Closed Won', value: 72000, probability: 100, modules: ['CAT-I', 'CAT-QT', 'CAT-MES'], certifications: ['SQF L2'], facilities: 2, owner: 'David', priority: 'high', lastActivity: 'Mar 15', nextAction: 'Kickoff onboarding', source: 'Website', notes: [seedNote(7, 'David', 'Signed Mar 15. Onboarding starts Apr 1.', 15)], industry: 'Bakery', email: 'thendricks@mountainbake.com', phone: '', expansions: [], convertedToCustomer: true },
  { id: 7, company: 'Delta Mills LLC', contact: 'Karen Foster', title: 'Compliance', stage: 'Closed Lost', value: 36000, probability: 0, modules: ['CAT-I'], certifications: ['FSSC 22000'], facilities: 1, owner: 'David', priority: 'low', lastActivity: 'Mar 10', nextAction: 'Follow up Q3', source: 'Manual', notes: [seedNote(8, 'David', 'Chose competitor. Budget. Revisit 6 months.', 20)], industry: 'Bakery', email: 'kfoster@deltamills.com', phone: '', expansions: [] },
  { id: 8, company: 'Apex Protein Inc', contact: "Liam O'Brien", title: 'SVP Ops', stage: 'Intake', value: 108000, probability: 25, modules: ['Full Platform'], certifications: ['SQF L3'], facilities: 4, owner: 'Aisha', priority: 'high', lastActivity: 'Mar 25', nextAction: 'Complete MES Intake interview', source: 'Event', notes: [seedNote(9, 'Aisha', 'Enterprise. 4 facilities, 3 states. Very interested in MES.', 5)], industry: 'Meat & Poultry', email: 'lobrien@apexprotein.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(65), intakeStatus: 'in_progress' },
  { id: 9, company: 'Sunrise Bakery Group', contact: 'Jennifer Walsh', title: 'Dir Quality Assurance', stage: 'Follow-up', value: 87000, probability: 75, modules: ['CAT-I', 'CAT-QT'], certifications: ['SQF L2'], facilities: 3, owner: 'David', priority: 'high', lastActivity: 'Mar 26', nextAction: 'Follow up on proposal', source: 'Website', notes: [seedNote(10, 'David', 'Converted from web demo request. Interested in HACCP and NCR modules.', 4)], industry: 'Bakery', email: 'jwalsh@sunrisebakery.com', phone: '', expansions: [], stageEnteredAt: hoursAgo(110), intakeStatus: 'completed' },
];

// INTAKE SUBMISSIONS
export const SEED_INTAKE_SUBMISSIONS: IntakeSubmission[] = [
  {
    id: 1,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'submitted',
    interviewedBy: 'David',
    leadId: undefined,
    companyName: 'Summit Roasting Company',
    industry: 'Beverage',
    facilities: 2,
    employees: 87,
    contactName: 'Marcus Chen',
    contactTitle: 'Director of Operations',
    contactEmail: 'mchen@summitroasting.com',
    contactPhone: '+1 (503) 555-0192',
    certifications: ['SQF', 'USDA Organic'],
    gfsiBenchmarked: 'Yes — SQF Level 2 (current)',
    lastAuditDate: '2025-06-14',
    biggestChallenge: 'Multi-origin lot traceability — sourcing green coffee beans from Ethiopia, Colombia, Guatemala, and Kenya. Manual blending records and inconsistent temperature monitoring across our two drum roasters. Preparing for FSMA Preventive Controls compliance ahead of new facility expansion planned for Q3 2026.',
    modulesOfInterest: ['CAT-I', 'CAT-MES', 'CAT-SCAN'],
    timeline: 'Q3 2026 (align with new facility go-live)',
    source: 'Trade Show',
    notes: 'Very interested in lot traceability and blend recipe management. Currently on spreadsheets for quality checks and roast logs. Mentioned they roast ~200,000 lbs/month across both facilities. Open to Full Platform if bundle pricing makes sense. Follow-up call scheduled with Marcus and their QA Manager Lisa Park.',
  },
  {
    id: 2,
    submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'reviewed',
    interviewedBy: 'Charlton',
    leadId: 1,
    companyName: 'SunFresh Foods',
    industry: 'Produce',
    facilities: 3,
    employees: 210,
    contactName: 'Maria Chen',
    contactTitle: 'VP Quality',
    contactEmail: 'mchen@sunfresh.com',
    contactPhone: '+1 (415) 555-0108',
    certifications: ['SQF', 'FSSC 22000'],
    gfsiBenchmarked: 'Yes — SQF Level 2 + FSSC 22000',
    lastAuditDate: '2025-09-22',
    biggestChallenge: 'Managing HACCP plans and corrective actions across 3 separate facilities with different certification requirements. Currently using Excel for CCP monitoring logs.',
    modulesOfInterest: ['CAT-I', 'CAT-QT'],
    timeline: 'Q2 2026',
    source: 'Website',
    notes: 'Very interested in AI document generation for HACCP. Wants centralized NCR management. Maria mentioned they are also evaluating FoodDocs.',
  },
];

// KNOWLEDGE BASE
export const SEED_KB: KBDocument[] = [
  // Documents
  { id: 1, title: 'Pricing Guide 2026', type: 'document', category: 'Documents', updated: 'Mar 15', author: 'Aisha', description: 'CAT-I Base $36K, add-on modules $15K each, Full Platform $72K', content: '' },
  { id: 2, title: 'Platform Architecture Overview', type: 'document', category: 'Documents', updated: 'Mar 10', author: 'Suresh', description: 'AWS infrastructure, Angular frontend, FastAPI backend overview', content: '' },
  { id: 3, title: 'Competitive Landscape 2026', type: 'document', category: 'Documents', updated: 'Mar 12', author: 'Charlton', description: 'FoodDocs, SafetyChain, Aptean — feature comparison and positioning', content: '' },
  { id: 4, title: 'Email Nurture Sequences', type: 'document', category: 'Documents', updated: 'Mar 8', author: 'Yael', description: 'Outbound email templates: intro, follow-up, re-engagement', content: '' },
  // Playbooks
  { id: 5, title: 'Sales Playbook', type: 'playbook', category: 'Playbooks', updated: 'Mar 20', author: 'Charlton', description: 'Positioning, objection handling, competitive intel, deal velocity', content: '' },
  { id: 6, title: 'Demo Script — Full Platform', type: 'playbook', category: 'Playbooks', updated: 'Mar 18', author: 'David', description: 'Step-by-step demo flow for all 5 modules with talking points', content: '' },
  { id: 7, title: 'Customer Onboarding Checklist', type: 'playbook', category: 'Playbooks', updated: 'Mar 22', author: 'David', description: '8-step onboarding from signed contract to go-live', content: '' },
  { id: 8, title: 'Support Escalation Runbook', type: 'playbook', category: 'Playbooks', updated: 'Mar 15', author: 'David', description: 'P1/P2 incident response, customer escalation steps, and hotfix deployment checklist', content: '' },
  // Compliance
  { id: 9, title: 'Contract Template (MSA + SOW)', type: 'template', category: 'Compliance', updated: 'Mar 5', author: 'Aisha', description: 'Standard Master Service Agreement and Statement of Work templates', content: '' },
  { id: 10, title: 'FDA 21 CFR Part 11 Compliance Guide', type: 'document', category: 'Compliance', updated: 'Feb 28', author: 'Suresh', description: 'E-signatures, audit trails, data integrity requirements for our platform', content: '' },
  // Cheat Sheets
  { id: 11, title: 'Discovery Call Cheat Sheet', type: 'document', category: 'Cheat Sheets', updated: 'Mar 21', author: 'Charlton', description: 'Top 10 discovery questions, common pain points, and qualifying signals', content: '' },
  { id: 12, title: 'Module Pricing Quick Reference', type: 'document', category: 'Cheat Sheets', updated: 'Mar 16', author: 'Aisha', description: 'One-page pricing breakdown for all modules and bundles', content: '' },
  { id: 13, title: 'HACCP Quick Reference Card', type: 'document', category: 'Cheat Sheets', updated: 'Mar 3', author: 'David', description: '7 HACCP principles, CCP decision tree, and common corrective actions', content: '' },
  // Skills
  { id: 14, title: 'New Hire Onboarding Guide', type: 'playbook', category: 'Skills', updated: 'Mar 1', author: 'Aisha', description: 'First week checklist, tools setup, team intro, and culture overview', content: '' },
  { id: 15, title: 'Customer Onboarding SOP', type: 'playbook', category: 'Skills', updated: 'Mar 24', author: 'David', description: 'Standard operating procedure: signed contract → go-live, 8 key steps', content: '' },
  { id: 16, title: 'Sales Training Guide', type: 'playbook', category: 'Skills', updated: 'Mar 19', author: 'Charlton', description: 'Product positioning, demo walkthrough, discovery questions, objection handling', content: '' },
  { id: 17, title: 'CAT-I Platform Training', type: 'playbook', category: 'Skills', updated: 'Mar 10', author: 'Aisha', description: 'End-to-end platform training for new team members: modules, workflows, admin panel', content: '' },
  // Branding & Identity
  { id: 18, title: 'Brand Style Guide', type: 'document', category: 'Branding & Identity', updated: 'Mar 20', author: 'Yael', description: 'Logo usage, color palette, typography system, and brand tone of voice', content: '' },
  { id: 19, title: 'Logo Package', type: 'document', category: 'Branding & Identity', updated: 'Mar 18', author: 'Yael', description: 'SVG and PNG logo variants — full color, white, dark, monochrome', content: '' },
  { id: 20, title: 'Marketing Deck 2026', type: 'template', category: 'Branding & Identity', updated: 'Mar 25', author: 'Charlton', description: 'Company overview and 5-module product slide deck for sales presentations', content: '' },
  { id: 21, title: 'Product Screenshot Library', type: 'document', category: 'Branding & Identity', updated: 'Mar 22', author: 'Suresh', description: 'High-res platform screenshots for web, decks, and proposals', content: '' },
  // Useful Links
  { id: 22, title: 'FDA FSMA Resource Hub', type: 'document', category: 'Useful Links', updated: 'Mar 7', author: 'David', description: 'FDA FSMA preventive controls guidance, compliance deadlines, and official forms', content: '' },
  { id: 23, title: 'SQF Institute — Certification Resources', type: 'document', category: 'Useful Links', updated: 'Mar 4', author: 'David', description: 'SQF code editions, audit guidance, and practitioner certification links', content: '' },
  { id: 24, title: 'GFSI Benchmarked Standards Overview', type: 'document', category: 'Useful Links', updated: 'Feb 20', author: 'Charlton', description: 'Comparison of SQF, BRC, FSSC 22000, IFS — scope, recognition, and requirements', content: '' },
];

// ACTIVITIES
export const SEED_ACTIVITIES: Activity[] = [
  { id: 1, who: 'David', action: 'moved', target: 'Mountain Bake Co', detail: 'to Closed Won', time: '2h ago' },
  { id: 2, who: 'Charlton', action: 'sent proposal to', target: 'Pacific Grain Co', detail: '$108K', time: '3h ago' },
  { id: 3, who: 'Aisha', action: 'added lead', target: 'Coastal Seafood Inc', detail: 'LinkedIn', time: '5h ago' },
  { id: 4, who: 'Suresh', action: 'deployed', target: 'CAT-MES v2.0.8', detail: 'hotfix', time: '6h ago' },
  { id: 5, who: 'Igor', action: 'completed', target: 'Machine layout drag-drop', detail: 'Sprint', time: '8h ago' },
  { id: 6, who: 'Charlton', action: 'updated', target: 'Prospective Customer Intake Form', detail: 'added certification fields', time: '1d ago' },
  { id: 7, who: 'David', action: 'scheduled demo', target: 'SunFresh Foods', detail: 'Mar 28', time: '1d ago' },
  { id: 8, who: 'Artem', action: 'created project', target: 'SOC 2 Type II Prep', detail: 'target: Jun 30', time: '2d ago' },
];

// MESSAGES
export const SEED_MESSAGES: Message[] = [
  { id: 1, from: 'Aisha', to: 'Suresh', text: 'Suresh - can you review the API architecture doc before the SOC 2 kickoff?', time: 'Mar 25, 2:30 PM', read: true },
  { id: 2, from: 'Suresh', to: 'Aisha', text: "Will do. I'll have comments by tomorrow morning IST. Here's the current architecture doc.", time: 'Mar 25, 3:15 PM', read: true, fileName: 'platform-architecture-v3.pdf', fileType: 'application/pdf', fileSize: 245000 },
  { id: 3, from: 'David', to: 'Charlton', text: 'Pacific Grain needs the revised pricing by Thursday. Can you review?', time: 'Mar 24, 4:00 PM', read: false, context: { type: 'lead', id: 2, name: 'Pacific Grain Co' } },
  { id: 4, from: 'Charlton', to: 'David', text: 'On it. Will send you the updated proposal tonight.', time: 'Mar 24, 5:30 PM', read: true, context: { type: 'lead', id: 2, name: 'Pacific Grain Co' } },
  { id: 5, from: 'Aisha', to: 'Artem', text: 'SOC 2 gap assessment — do we have a vendor list ready?', time: 'Mar 23, 11:00 AM', read: false, context: { type: 'project', id: 4, name: 'SOC 2 Type II Prep' } },
];

// CALENDAR EVENTS
export const SEED_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 1, title: 'Demo call with SunFresh Foods', date: '2026-03-28', time: '10:00 AM', type: 'meeting', description: 'Full platform demo for Maria Chen', relatedTo: { type: 'lead', id: 1, name: 'SunFresh Foods' }, assignee: 'David' },
  { id: 2, title: 'Send revised pricing to Pacific Grain', date: '2026-03-27', time: '2:00 PM', type: 'task', description: 'Multi-facility enterprise pricing proposal', relatedTo: { type: 'lead', id: 2, name: 'Pacific Grain Co' }, assignee: 'Charlton' },
  { id: 3, title: 'Mountain Bake onboarding kickoff', date: '2026-04-01', time: '9:00 AM', type: 'meeting', description: 'Kickoff call with new customer', relatedTo: { type: 'project', id: 1, name: 'Mountain Bake Onboarding' }, assignee: 'David' },
  { id: 4, title: 'Follow up with Coastal Seafood', date: '2026-03-29', type: 'reminder', description: 'Send intro email and case study', relatedTo: { type: 'lead', id: 4, name: 'Coastal Seafood Inc' }, assignee: 'Aisha' },
  { id: 5, title: 'Green Valley contract deadline', date: '2026-04-05', type: 'deadline', description: 'Target close date for full platform deal', relatedTo: { type: 'lead', id: 5, name: 'Green Valley Organics' }, assignee: 'Charlton' },
  { id: 6, title: 'CAT-MES v2.1 release', date: '2026-04-10', type: 'deadline', description: 'Sprint completion target', relatedTo: { type: 'project', id: 2, name: 'CAT-MES v2.1 Sprint' }, assignee: 'Suresh' },
  { id: 7, title: 'Weekly team standup', date: '2026-03-28', time: '11:00 AM', type: 'meeting', description: 'Weekly all-hands sync', relatedTo: { type: 'general', name: 'Team' }, assignee: 'Aisha' },
  { id: 8, title: 'Call Apex Protein', date: '2026-03-30', time: '3:00 PM', type: 'call', description: 'Discovery call - 4 facilities, enterprise opportunity', relatedTo: { type: 'lead', id: 8, name: 'Apex Protein Inc' }, assignee: 'Aisha' },
  { id: 9, title: 'Website redesign review', date: '2026-04-02', time: '2:00 PM', type: 'meeting', relatedTo: { type: 'project', id: 3, name: 'Website Redesign' }, assignee: 'Charlton' },
  { id: 10, title: 'SOC 2 kickoff meeting', date: '2026-04-08', time: '10:00 AM', type: 'meeting', description: 'Initial gap assessment review', relatedTo: { type: 'project', id: 4, name: 'SOC 2 Type II Prep' }, assignee: 'Artem' },
];

// CUSTOMERS (converted from Closed Won leads)
export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 1,
    leadId: 6,
    company: 'Mountain Bake Co',
    contact: 'Tom Hendricks',
    title: 'Quality Dir',
    email: 'thendricks@mountainbake.com',
    phone: '(555) 123-4567',
    industry: 'Bakery',
    modules: ['CAT-I', 'CAT-QT', 'CAT-MES'],
    certifications: ['SQF L2'],
    facilities: 2,
    owner: 'David',
    contractValue: 72000,
    annualRevenue: 72000,
    contractStart: '2026-03-15',
    contractEnd: '2027-03-15',
    renewalDate: '2027-03-15',
    status: 'onboarding',
    billingStatus: 'current',
    zohoCustomerId: 'ZC-1001',
    zohoInvoices: [
      { id: 'INV-001', invoiceNumber: 'INV-00001', date: '2026-03-15', dueDate: '2026-04-15', amount: 72000, status: 'paid', zohoUrl: 'https://books.zoho.com/invoices/1' }
    ],
    notes: [
      { id: 1, author: 'David', content: 'Signed Mar 15. Onboarding starts Apr 1.', createdAt: '2026-03-15T10:00:00Z' },
      { id: 2, author: 'David', content: 'Kickoff call scheduled for Apr 1. Tom confirmed 2 facilities for initial rollout.', createdAt: '2026-03-20T14:30:00Z' },
    ],
    createdAt: '2026-03-15',
    zohoSync: { syncStatus: 'synced', lastSyncAt: '2026-03-15T10:00:00Z' }
  },
  {
    id: 2,
    leadId: 3,
    company: 'Pacific Seafood Group',
    contact: 'Linda Nakamura',
    title: 'VP Operations',
    email: 'lnakamura@pacificseafood.com',
    phone: '(555) 234-5678',
    industry: 'Seafood',
    modules: ['CAT-I', 'CAT-SCAN', 'CAT-QT'],
    certifications: ['BRC A', 'HACCP'],
    facilities: 3,
    owner: 'David',
    contractValue: 96000,
    annualRevenue: 96000,
    contractStart: '2025-11-01',
    contractEnd: '2026-10-31',
    renewalDate: '2026-10-31',
    status: 'active',
    billingStatus: 'current',
    zohoCustomerId: 'ZC-1002',
    zohoInvoices: [
      { id: 'INV-002', invoiceNumber: 'INV-00002', date: '2025-11-01', dueDate: '2025-12-01', amount: 96000, status: 'paid', zohoUrl: 'https://books.zoho.com/invoices/2' }
    ],
    notes: [
      { id: 1, author: 'David', content: 'Active since Nov 2025. Running 3 facilities on CAT-I, CAT-SCAN, CAT-QT.', createdAt: '2025-11-01T09:00:00Z' },
    ],
    createdAt: '2025-11-01',
    zohoSync: { syncStatus: 'synced', lastSyncAt: '2026-03-01T08:00:00Z' }
  },
  {
    id: 3,
    leadId: 5,
    company: 'Heartland Dairy',
    contact: 'Greg Morrison',
    title: 'Quality Manager',
    email: 'gmorrison@heartlanddairy.com',
    phone: '(555) 345-6789',
    industry: 'Dairy',
    modules: ['CAT-I', 'CAT-MES', 'CAT-iLOG'],
    certifications: ['SQF L3', 'FSSC 22000'],
    facilities: 4,
    owner: 'Charlton',
    contractValue: 144000,
    annualRevenue: 144000,
    contractStart: '2025-08-15',
    contractEnd: '2026-08-15',
    renewalDate: '2026-08-15',
    status: 'active',
    billingStatus: 'current',
    zohoCustomerId: 'ZC-1003',
    zohoInvoices: [
      { id: 'INV-003', invoiceNumber: 'INV-00003', date: '2025-08-15', dueDate: '2025-09-15', amount: 144000, status: 'paid', zohoUrl: 'https://books.zoho.com/invoices/3' }
    ],
    notes: [
      { id: 1, author: 'Charlton', content: 'Largest account — 4 facilities, full module suite. Renewal coming up Aug 2026.', createdAt: '2025-08-15T10:00:00Z' },
    ],
    createdAt: '2025-08-15',
    zohoSync: { syncStatus: 'synced', lastSyncAt: '2026-02-20T12:00:00Z' }
  },
  {
    id: 4,
    leadId: 7,
    company: 'Golden Grain Mills',
    contact: 'Sarah Chen',
    title: 'Food Safety Director',
    email: 'schen@goldengrain.com',
    phone: '(555) 456-7890',
    industry: 'Grain & Cereal',
    modules: ['CAT-I', 'CAT-QT'],
    certifications: ['SQF L2'],
    facilities: 1,
    owner: 'David',
    contractValue: 48000,
    annualRevenue: 48000,
    contractStart: '2026-01-10',
    contractEnd: '2027-01-10',
    renewalDate: '2027-01-10',
    status: 'active',
    billingStatus: 'overdue',
    zohoCustomerId: 'ZC-1004',
    zohoInvoices: [
      { id: 'INV-004', invoiceNumber: 'INV-00004', date: '2026-01-10', dueDate: '2026-02-10', amount: 48000, status: 'overdue', zohoUrl: 'https://books.zoho.com/invoices/4' }
    ],
    notes: [
      { id: 1, author: 'David', content: 'Invoice overdue — follow up with Sarah on payment status.', createdAt: '2026-02-15T11:00:00Z' },
    ],
    createdAt: '2026-01-10',
    zohoSync: { syncStatus: 'synced', lastSyncAt: '2026-03-10T09:00:00Z' }
  }
];

// DEMO REQUESTS (from website contact form)
export const SEED_DEMO_REQUESTS: DemoRequest[] = [
  {
    id: 1,
    fullName: 'Jennifer Walsh',
    email: 'jwalsh@sunrisebakery.com',
    position: 'Director of Quality Assurance',
    companyName: 'Sunrise Bakery Group',
    businessType: 'Manufacturing',
    industry: 'Bakery',
    preferredTime: 'Morning (9am-12pm)',
    preferredDate: '2026-04-02',
    selectedModules: [
      { module: 'CAT-I.AI', subModules: ['Document Control', 'HACCP Plan Builder', 'Audit Management'] },
      { module: 'CAT-QT', subModules: ['Non-Conformance Reports', 'CAPA Management'] }
    ],
    demoFocus: 'We need to modernize our HACCP documentation and improve our audit preparation process. Currently using paper-based systems.',
    status: 'new',
    submittedAt: '2026-03-27T09:15:00Z'
  },
  {
    id: 2,
    fullName: 'Michael Torres',
    email: 'mtorres@coastalmeats.com',
    position: 'Plant Manager',
    companyName: 'Coastal Meats Processing',
    businessType: 'Manufacturing',
    industry: 'Meat & Poultry',
    preferredTime: 'Afternoon (1pm-5pm)',
    preferredDate: '2026-04-03',
    selectedModules: [
      { module: 'CAT-MES', subModules: ['Production Scheduling', 'Batch Tracking & Traceability', 'OEE & Downtime Monitoring'] },
      { module: 'CAT-SCAN', subModules: ['Master Sanitation Scheduling', 'Pre-Op & Post-Op Inspections'] }
    ],
    demoFocus: 'Looking to improve production visibility and sanitation tracking. USDA audits are becoming more stringent.',
    status: 'contacted',
    assignedTo: 'David',
    submittedAt: '2026-03-26T14:30:00Z'
  },
  {
    id: 3,
    fullName: 'Amanda Richardson',
    email: 'arichardson@pureorganic.com',
    position: 'VP Operations',
    companyName: 'Pure Organic Foods',
    businessType: 'Manufacturing',
    industry: 'Produce',
    preferredTime: 'Morning (9am-12pm)',
    preferredDate: '2026-03-29',
    selectedModules: [
      { module: 'CAT-I.AI', subModules: ['Document Control', 'Training & Certification', 'Food Safety Culture'] },
      { module: 'CAT-iLOG', subModules: ['Product Specifications', 'Allergen Management', 'Label Generation & Approval'] }
    ],
    demoFocus: 'Expanding to 3 facilities and need a scalable compliance platform. Also interested in label management for organic products.',
    status: 'scheduled',
    assignedTo: 'Charlton',
    submittedAt: '2026-03-25T11:00:00Z'
  },
  {
    id: 4,
    fullName: 'David Kim',
    email: 'dkim@premiumsnacks.com',
    position: 'Quality Manager',
    companyName: 'Premium Snacks Inc',
    businessType: 'Manufacturing',
    industry: 'Snack Foods',
    preferredTime: 'Afternoon (1pm-5pm)',
    preferredDate: '2026-04-05',
    selectedModules: [
      { module: 'CAT-I.AI', subModules: ['Document Control', 'Audit Management', 'AI-Powered Generation'] }
    ],
    demoFocus: 'Preparing for SQF certification. Need help with documentation and gap analysis.',
    status: 'new',
    submittedAt: '2026-03-27T16:45:00Z'
  },
  {
    id: 5,
    fullName: 'Rachel Foster',
    email: 'rfoster@bayareabev.com',
    position: 'Food Safety Director',
    companyName: 'Bay Area Beverages',
    businessType: 'Manufacturing',
    industry: 'Beverage',
    preferredTime: 'Morning (9am-12pm)',
    preferredDate: '2026-03-28',
    selectedModules: [
      { module: 'CAT-I.AI', subModules: ['Document Control', 'Training & Certification', 'HACCP Plan Builder'] },
      { module: 'CAT-MES', subModules: ['Batch Tracking & Traceability', 'Inventory Transactions'] },
      { module: 'CAT-SCAN', subModules: ['Chemical & SDS Management', 'Environmental Monitoring'] }
    ],
    demoFocus: 'Full platform evaluation. We have 2 production facilities and are opening a third. Need integrated solution.',
    status: 'converted',
    assignedTo: 'David',
    convertedToLeadId: 8,
    submittedAt: '2026-03-20T10:00:00Z'
  }
];

// KB CATEGORIES
export const KB_CATEGORIES = ['Documents', 'Playbooks', 'Compliance', 'Cheat Sheets', 'Skills', 'Branding & Identity', 'Useful Links'];

export const KB_CATEGORY_BADGES: Record<string, string> = {
  'Documents': 'blue',
  'Playbooks': 'green',
  'Compliance': 'purple',
  'Cheat Sheets': 'yellow',
  'Skills': 'cyan',
  'Branding & Identity': 'pink',
  'Useful Links': 'orange',
};

// MES Standard Sections
export const MES_STANDARD_SECTIONS: MESSection[] = [
  {
    id: 'company', title: 'Company Profile', icon: 'building', timeMinutes: 3,
    desc: 'Basic company info — and what they want to talk about',
    fields: [
      { id: 'company_name', label: 'Company Name', type: 'text', required: true },
      { id: 'industry_vertical', label: 'Industry', type: 'text', placeholder: 'e.g., Bakery, Dairy, Beverage, Produce...' },
      { id: '_mod_sel', label: 'Industry Module', type: 'module_select' },
      { id: 'contact_name', label: 'Primary Contact', type: 'text', required: true },
      { id: 'contact_email', label: 'Email', type: 'text' },
      { id: 'contact_phone', label: 'Phone', type: 'text' },
      { id: 'location', label: 'Location / Headquarters', type: 'text' },
      { id: 'facilities', label: 'Number of Facilities', type: 'select', options: ['1', '2–3', '4–6', '7–10', '10+'] },
      { id: 'company_size', label: 'Employees', type: 'select', options: ['Under 25', '25–100', '100–500', '500+'] },
      { id: 'certifications', label: 'Current Certifications', type: 'multi', options: ['SQF', 'BRC', 'FSSC 22000', 'IFS', 'USDA Organic', 'ISCC Plus', 'GMP / cGMP', 'Kosher / Halal', 'None', 'Other'] },
      { id: 'interests', label: 'What are you most interested in?', type: 'multi',
        hint: 'Select everything that applies — helps tailor the demo to what matters most',
        options: ['Audit Readiness', 'Compliance & HACCP', 'Labeling & Traceability', 'Sanitation', 'Manufacturing Execution (MES)', 'Document Control', 'NCR & Corrective Actions', 'Other'] },
      { id: 'current_process', label: 'How do you currently manage food safety records?', type: 'multi',
        hint: 'Understanding their current setup helps us show the right features first',
        options: ['Paper Records', 'Excel / Google Sheets', 'Google Drive', 'OneDrive / SharePoint', 'Shared Folder (local)', 'Existing Software (ERP / QMS)', 'Other'] },
      { id: 'current_process_notes', label: 'Anything else about how they work today?', type: 'textarea', placeholder: 'e.g., Excel for HACCP logs, paper binders for pre-ops, no real system...' },
      { id: 'pain', label: 'Key challenges / pain points', type: 'textarea', placeholder: 'What is frustrating right now? What are they trying to fix or improve?' },
    ]
  },
  {
    id: 'products', title: 'Products & SKUs', icon: 'package', timeMinutes: 3,
    desc: 'What they make, how many SKUs, any labeling or shelf-life complexity',
    fields: [
      { id: 'sku_count', label: 'How many products / SKUs do they have?', type: 'select', options: ['1–10', '11–50', '51–200', '200+', 'Not sure'] },
      { id: 'product_types', label: 'What types of products?', type: 'multi', options: ['Finished goods', 'Ingredients / raw materials', 'Semi-processed', 'Co-manufactured', 'Private label', 'Other'] },
      { id: 'shelf_life', label: 'Are there shelf life or expiry challenges?', type: 'select', options: ['Yes — a major issue', 'Yes — minor issue', 'No', 'Not sure'] },
      { id: 'labeling_complexity', label: 'How complex is their labeling?', type: 'select', options: ['Simple — one label per product', 'Moderate — multiple variants', 'Complex — multi-region or regulatory labels', 'Not applicable', 'Not sure'] },
      { id: 'recipe_complexity', label: 'Do products have many ingredients or complex formulas?', type: 'select',
        hint: 'Simple: 3–5 ingredients. Complex: 20+ ingredients, multi-stage blending, or sub-recipes',
        options: ['Simple (under 10 ingredients)', 'Medium (10–30 ingredients)', 'Complex (30+ or multi-stage)', 'Not applicable', 'Not sure'] },
      { id: 'products_notes', label: 'Product notes', type: 'textarea', placeholder: 'Any other product or SKU details that came up...' },
    ]
  },
  {
    id: 'audits', title: 'Audits & Compliance', icon: 'clipboard', timeMinutes: 4,
    desc: 'Audit history, current compliance state, and pain points — a core value conversation',
    fields: [
      { id: 'audit_gfsi', label: 'Are they currently certified or working toward a food safety standard?', type: 'select',
        hint: 'GFSI-benchmarked standards include SQF, BRC, FSSC 22000, and IFS. Common for retail and foodservice suppliers',
        options: ['Yes — SQF', 'Yes — BRC / BRCGS', 'Yes — FSSC 22000', 'Yes — IFS', 'Working toward certification', 'No — internal standards only', 'Not sure'] },
      { id: 'audit_frequency', label: 'How often are they audited externally?', type: 'select', options: ['Annually', 'Bi-annually', 'Quarterly', 'Multiple times a year', 'Not regularly', 'Not sure'] },
      { id: 'audit_blocks', label: 'Audits they conduct or have had', type: 'audit_blocks' },
      { id: 'audit_prep', label: 'How do they currently prepare for audits?', type: 'multi', options: ['Spreadsheets', 'Paper-based binders', 'A QMS / compliance software', 'Consultant-led', 'Internal team handles it', 'Not much prep', 'Other'] },
      { id: 'audit_pain', label: 'Biggest audit challenge or pain point', type: 'textarea', placeholder: "e.g., can't find records fast enough, too many repeat findings, no traceability, prep takes weeks..." },
      { id: 'observations', label: 'Recent findings or open observations (optional)', type: 'textarea', placeholder: 'Any recurring issues, open CARs, or ongoing observations worth noting...' },
    ]
  },
  {
    id: 'qc', title: 'Quality & Compliance', icon: 'microscope', timeMinutes: 3,
    desc: 'How they monitor and manage quality day-to-day',
    fields: [
      { id: 'ccp_method', label: 'How are critical control points (CCPs) monitored?', type: 'multi',
        hint: 'CCPs are the key checkpoints in a HACCP plan — e.g., cooking temperature, pH, metal detection, chlorine levels',
        options: ['Paper forms / binders', 'Excel / spreadsheets', 'Digital checklists / tablet app', 'Automated sensors / monitoring', 'Not formally tracked', 'Other'] },
      { id: 'nc_tracking', label: 'How are quality failures or non-conformances recorded?', type: 'multi',
        hint: "A non-conformance (NC) is when something doesn't meet a standard — failed test, customer complaint, or production deviation",
        options: ['Paper log', 'Spreadsheet', 'QMS software', 'Email / chat message', 'Not tracked', 'Other'] },
      { id: 'corrective_actions', label: 'Are corrective actions (CARs) formally tracked and followed up?', type: 'select', options: ['Yes — with formal follow-up', 'Partially — some tracking', 'No', 'Not sure'] },
      { id: 'testing_labs', label: 'Do they use external labs or testing services?', type: 'select', options: ['Yes — regularly', 'Sometimes', 'No', 'Not sure'] },
      { id: 'qc_pain', label: 'Biggest quality management challenge', type: 'textarea', placeholder: 'Where does quality management break down? What takes too long or falls through the cracks?' },
    ]
  },
  {
    id: 'production', title: 'Production', icon: 'factory', timeMinutes: 3,
    desc: 'How production is run day-to-day — keep this light for a first conversation',
    fields: [
      { id: 'line_count', label: 'Number of production lines or work areas', type: 'select', options: ['1', '2–3', '4–6', '7–10', '10+'] },
      { id: 'shift_structure', label: 'How do they run shifts?', type: 'select', options: ['Single shift', 'Two shifts', 'Three shifts / 24-7', 'Variable', 'Other'] },
      { id: 'batch_vs_continuous', label: 'How do they run production?', type: 'select',
        hint: 'Batch = produce a set quantity, then clean/switch. Continuous = ongoing production without stopping between runs',
        options: ['Batch (make a run, then switch)', 'Continuous (always running)', 'Both', 'Not sure'] },
      { id: 'scheduling_method', label: 'How is production scheduled / planned?', type: 'multi', options: ['Whiteboard / paper', 'Excel', 'ERP system', 'MES system', 'Production manager knows it', 'Other'] },
      { id: 'production_pain', label: 'Biggest production headache', type: 'textarea', placeholder: 'What slows them down? Where do things go wrong on the floor?' },
    ]
  },
  {
    id: 'inventory', title: 'Inventory', icon: 'archive', timeMinutes: 2,
    desc: 'Raw materials, lot tracking, FIFO — keep lightweight',
    fields: [
      { id: 'inventory_tracking', label: 'How is inventory currently tracked?', type: 'multi', options: ['Paper / manual count', 'Spreadsheet', 'ERP / inventory system', 'Barcode scanning', 'Not formally tracked', 'Other'] },
      { id: 'fifo', label: 'Do they use FIFO (first in, first out)?', type: 'select',
        hint: 'FIFO means using the oldest stock first — important for shelf life management and compliance',
        options: ['Yes — enforced', 'Mostly yes', 'No', 'Not sure'] },
      { id: 'lot_traceability', label: 'Can they trace a lot from supplier to finished product?', type: 'select', options: ['Yes — fully', 'Partially', 'No', 'Not sure'] },
      { id: 'inventory_notes', label: 'Inventory notes', type: 'textarea', placeholder: 'Any other relevant inventory or materials management details...' },
    ]
  },
  {
    id: 'downtime', title: 'Downtime & Equipment', icon: 'analytics', timeMinutes: 2,
    desc: 'Equipment reliability and maintenance — brief check',
    fields: [
      { id: 'maintenance_tracking', label: 'How is equipment maintenance tracked?', type: 'multi', options: ['Paper / whiteboard', 'Spreadsheet', 'CMMS / maintenance software', 'Work order system', 'Not tracked', 'Other'] },
      { id: 'downtime_freq', label: 'How often does unplanned downtime happen?', type: 'select', options: ['Rarely (under monthly)', 'Monthly', 'Weekly', 'Daily or very often', 'Not sure'] },
      { id: 'equipment_age', label: 'How old is the main production equipment?', type: 'select', options: ['Under 5 years', '5–10 years', 'Over 10 years', 'Mixed ages', 'Not sure'] },
      { id: 'downtime_notes', label: 'Notes', type: 'textarea', placeholder: 'Any major equipment issues or maintenance pain points...' },
    ]
  },
  {
    id: 'integration', title: 'Integrations & Systems', icon: 'integrations', timeMinutes: 2,
    desc: "What systems they already use — and what they'd want to connect. Keep this brief.",
    fields: [
      { id: 'current_erp', label: 'What ERP or main software do they use?', type: 'text', placeholder: 'e.g., SAP, QuickBooks, NetSuite, Oracle, or none' },
      { id: 'other_systems', label: 'Any other key systems in use?', type: 'textarea', placeholder: 'e.g., lab management (LIMS), QMS, warehouse system, labeling software...' },
      { id: 'integration_wants', label: 'What would they want to connect with CAT-I?', type: 'multi', options: ['ERP / accounting', 'Lab / LIMS', 'Quality system (QMS)', 'Supplier portal', 'WMS / warehouse', 'Labeling software', 'Other'] },
      { id: 'integration_notes', label: 'Integration notes (optional)', type: 'textarea', placeholder: 'Any specific requirements, concerns, or systems mentioned...' },
    ]
  },
  {
    id: 'summary', title: 'Wrap-Up', icon: 'check-circle', timeMinutes: 3,
    desc: 'Close the conversation — timeline, next steps, and what they asked about',
    fields: [
      { id: 'timeline', label: 'What is their target timeline to get started?', type: 'select', options: ['ASAP / under 3 months', '3–6 months', '6–12 months', 'No set timeline', 'Just exploring', 'Not sure'] },
      { id: 'decision_makers', label: 'Who makes the final decision?', type: 'text', placeholder: 'e.g., VP Quality, COO, CEO — and are they on this call?' },
      { id: 'budget_awareness', label: 'Is budget available or approved?', type: 'select', options: ['Yes — budget allocated', 'Budget being evaluated', 'No budget yet', 'Not discussed'] },
      { id: 'modules_interest', label: 'Which CAT-I modules seemed most relevant?', type: 'multi', options: ['CAT-I (Core platform)', 'CAT-MES (Manufacturing execution)', 'CAT-QT (Quality & testing)', 'CAT-SCAN (Traceability & scanning)', 'CAT-ALOG (Cataloging)', 'Full Platform', 'Not sure yet'] },
      { id: 'client_questions', label: 'What did the client ask about?', type: 'textarea', placeholder: 'Capture anything they specifically asked — pricing, features, integrations, implementation, competitors...' },
      { id: 'followup_needed', label: 'Is a follow-up action needed?', type: 'select', options: ['Yes — urgent (within 24h)', 'Yes — within a week', 'Send info / resources', 'Schedule a demo', 'No follow-up needed', 'Not sure'] },
      { id: 'notes', label: 'Final notes', type: 'textarea', placeholder: 'Tone, interest level, anything else worth capturing — objections, buying signals, next steps discussed...' },
    ]
  },
];


// MES Industry Modules
export const MES_MODULES: MESModule[] = [
  {id:"m_coffee",name:"Coffee Roasting",icon:"coffee",desc:"Roasting, cupping, green coffee",active:true,builtIn:true,fields:[{id:"mc1",label:"Roasters",type:"textarea"},{id:"mc2",label:"In-roast QC",type:"multi",options:["Bean temp","RoR","First crack","DTR%","End temp","Time","Airflow","Drum speed","Gas","Exhaust"]},{id:"mc3",label:"Post-roast QC",type:"multi",options:["Agtron","Moisture","Weight loss","Cupping","Grind","CO2"]},{id:"mc4",label:"Cupping",type:"select",options:["SCA","Custom","Pass/fail","None"]},{id:"mc5",label:"Green storage",type:"multi",options:["GrainPro","Jute","Climate","Non-climate","Silos"]},{id:"mc6",label:"Software",type:"multi",options:["Cropster","Artisan","RoastLog","Native","Custom","None"]}]},
  {id:"m_food",name:"Food & Bev",icon:"utensils",desc:"HACCP, allergens, FDA",active:true,builtIn:true,fields:[{id:"mf1",label:"HACCP",type:"select",options:["Implemented","Developing","Not started","Not required"]},{id:"mf2",label:"Allergens",type:"multi",options:["Milk","Eggs","Fish","Shellfish","Nuts","Peanuts","Wheat","Soy","Sesame","None"]},{id:"mf3",label:"FDA?",type:"select",options:["Yes","No","In process"]},{id:"mf4",label:"Labeling",type:"multi",options:["Nutrition","Ingredients","Allergens","Origin","Date","Lot","Organic","Non-GMO"]},{id:"mf5",label:"Cold chain?",type:"select",options:["Full","Partial","No"]},{id:"mf6",label:"Sanitation",type:"select",options:["SSOP","Schedule","Basic","None"]}]},
  {id:"m_pharma",name:"Pharma",icon:"pill",desc:"cGMP, CFR 11",active:true,builtIn:true,fields:[{id:"mp1",label:"GMP",type:"select",options:["cGMP","EU","WHO","Not yet","R&D"]},{id:"mp2",label:"CFR 11?",type:"select",options:["Critical","Planning","No"]},{id:"mp3",label:"Batch records",type:"select",options:["Paper","Partial","EBR","Transitioning"]},{id:"mp4",label:"CAPA",type:"multi",options:["Deviations","CAPA","OOS","Change control","Complaints","Recalls"]},{id:"mp5",label:"Validation",type:"multi",options:["IQ/OQ/PQ","Process","Cleaning","CSV","Method"]},{id:"mp6",label:"Cleanroom",type:"multi",options:["ISO 5","ISO 7","ISO 8","Controlled","None"]}]},
  {id:"m_plastics",name:"Plastics",icon:"layers",desc:"Molds, resin",active:true,builtIn:true,fields:[{id:"mpl1",label:"Processes",type:"multi",options:["Injection","Blow","Extrusion","Thermoform","3D print","Rotational","Compression"]},{id:"mpl2",label:"Mold tracking",type:"multi",options:["Shots","PM","Location","Cavity","Qualification"]},{id:"mpl3",label:"Resin",type:"multi",options:["Lot tracking","Drying","Regrind%","Color","Certs","Masterbatch"]},{id:"mpl4",label:"Parameters",type:"multi",options:["Barrel temps","Pressure","Cycle","Cooling","Pack/hold","Screw speed","Clamp"]}]},
  {id:"m_metal",name:"Metal Fab",icon:"wrench",desc:"CNC, tooling",active:true,builtIn:true,fields:[{id:"mm1",label:"Processes",type:"multi",options:["CNC mill","CNC turn","Welding","Laser","Stamping","Bending","Grinding","EDM","Casting","Forging","Heat treat"]},{id:"mm2",label:"Tools",type:"multi",options:["Life","Offsets","Inventory","Qualification","Regrinding"]},{id:"mm3",label:"Inspection",type:"multi",options:["CMM","Calipers","Comparator","Surface","Hardness","NDT","FAI"]},{id:"mm4",label:"Certs",type:"select",options:["Mill certs","Customer","DFARS/ITAR","Basic"]}]},
  {id:"m_elec",name:"Electronics",icon:"cpu",desc:"SMT, RoHS",active:true,builtIn:true,fields:[{id:"me1",label:"Assembly",type:"multi",options:["SMT","Wave","Reflow","Hand","Through-hole","Cable","Box build","Conformal"]},{id:"me2",label:"Components",type:"multi",options:["MSD","Reel/feeder","Date codes","AVL","Counterfeit"]},{id:"me3",label:"Testing",type:"multi",options:["AOI","X-ray","ICT","Flying probe","Functional","Burn-in","ESS"]},{id:"me4",label:"Compliance",type:"multi",options:["RoHS","REACH","UL","CE","FCC","IPC","J-STD","None"]}]},
  {id:"m_chem",name:"Chemical",icon:"flask",desc:"Formulas, SDS",active:true,builtIn:true,fields:[{id:"mch1",label:"Processes",type:"multi",options:["Batch reactor","Continuous","Blending","Distillation","Filtration","Drying","Milling","Polymerization"]},{id:"mch2",label:"Formulas",type:"multi",options:["Multi-component","Concentration","pH","Viscosity","Density","Color"]},{id:"mch3",label:"Safety",type:"multi",options:["SDS","EPA","OSHA PSM","REACH","GHS","Waste","Emissions","TSCA"]},{id:"mch4",label:"Storage",type:"multi",options:["Hazmat","Temp","Incompatibility","Shelf life","Tank levels"]}]}
];

// MES Audit Map
export const MES_AUDIT_MAP: Record<string, string[]> = {
  _u: ["Internal Quality","Management Review","Supplier","Customer","Regulatory","Environmental","Safety/OSHA","Documentation","Process","Facility"],
  m_coffee: ["Organic (USDA)","Fair Trade","Rainforest Alliance","SCA Quality","Roast Facility","Green Supplier","Cupping Calibration","SQF/GFSI","Kosher","Import"],
  m_food: ["FSMA/FDA","SQF","BRC","FSSC 22000","HACCP","Allergen Control","Sanitation","Organic","Kosher/Halal","Pest Control","Cold Chain","Labeling","Recall Drill"],
  m_pharma: ["FDA cGMP","EU GMP","PAI","Post-Approval","DEA","CFR Part 11","Data Integrity","Cleaning Validation","CSV","Supplier Qualification","Pharmacovigilance","WHO"],
  m_plastics: ["ISO 9001","IATF 16949","Customer Quality","Process Capability","Mold Qualification","Material Traceability","ISO 14001","UL","Regrind"],
  m_metal: ["ISO 9001","AS9100","IATF 16949","Nadcap","DFARS/ITAR","Weld Qualification","NDT Cert","Source Inspection","Material Cert","FAI","Calibration"],
  m_elec: ["ISO 9001","IPC","RoHS/REACH","UL","CE","ESD","Counterfeit","Customer Quality","Soldering","Test Coverage","ITAR"],
  m_chem: ["EPA","OSHA PSM","ISO 9001","ISO 14001","REACH","TSCA","GHS","Waste Mgmt","Process Safety","SDS","Tank Integrity","Emissions"]
};

// CONTENT
export const SEED_CONTENT: ContentPiece[] = [
  { id: 1, title: 'CAT-MES v2.1 Feature Announcement', description: 'Announce new AI scheduling and sanitation checklist features', stage: 'Under Review', type: 'Blog Post', platforms: ['Website Blog', 'LinkedIn', 'Email'], owner: 'Artem', createdBy: 'Yael', createdAt: 'Mar 20', updatedAt: 'Mar 24', blockers: [], tags: ['product-update', 'CAT-MES'], notes: '', attachments: [], linkedLeads: [], body: '', scheduledDate: '2026-04-01', campaignId: 2 },
  { id: 2, title: 'Food Safety Compliance Checklist Infographic', description: 'Visual checklist for SQF/GFSI compliance steps', stage: 'In Development', type: 'Social Image', platforms: ['Instagram', 'LinkedIn'], owner: 'Yael', createdBy: 'Yael', createdAt: 'Mar 22', updatedAt: 'Mar 24', blockers: ['Need final copy approval'], tags: ['food-safety', 'infographic'], notes: '', attachments: [], linkedLeads: [], body: '' },
  { id: 3, title: 'Customer Spotlight: Mountain Bake Co', description: 'Case study on Mountain Bake onboarding and ROI', stage: 'Ideas', type: 'Case Study', platforms: ['Website Blog', 'Email', 'LinkedIn'], owner: 'Aisha', createdBy: 'Artem', createdAt: 'Mar 24', updatedAt: 'Mar 24', blockers: ['Waiting for customer approval to publish'], tags: ['case-study', 'customer'], notes: 'Tom Hendricks agreed in principle, need written OK', attachments: [], linkedLeads: [], body: '' },
  { id: 4, title: 'March Newsletter — Platform Updates', description: 'Monthly newsletter covering new features and industry news', stage: 'Approved', type: 'Newsletter', platforms: ['Email'], owner: 'Aisha', createdBy: 'Yael', createdAt: 'Mar 15', updatedAt: 'Mar 25', blockers: [], tags: ['newsletter', 'monthly'], notes: '', attachments: [], linkedLeads: [], body: '', scheduledDate: '2026-03-28', campaignId: 1 },
  { id: 5, title: 'Why Spreadsheets Are Killing Your Food Safety Program', description: 'Thought leadership piece on moving from manual to digital compliance', stage: 'Ideas', type: 'Blog Post', platforms: ['Website Blog', 'LinkedIn'], owner: 'Yael', createdBy: 'Aisha', createdAt: 'Mar 25', updatedAt: 'Mar 25', blockers: [], tags: ['thought-leadership', 'food-safety'], notes: '', attachments: [], linkedLeads: [], body: '' },
  { id: 6, title: 'CAT-ALOG Label Compliance Demo Video', description: '90-second product demo for social', stage: 'In Development', type: 'Social Video', platforms: ['LinkedIn', 'YouTube', 'Instagram'], owner: 'Igor', createdBy: 'Yael', createdAt: 'Mar 23', updatedAt: 'Mar 25', blockers: ['Igor needs screen recording software'], tags: ['product-demo', 'CAT-ALOG', 'video'], notes: '', attachments: [], linkedLeads: [], body: '' },
];

// EMAIL CAMPAIGNS
export const SEED_CAMPAIGNS: EmailCampaign[] = [
  { id: 1, name: 'March Newsletter Blast', fromName: 'Aisha', fromEmail: 'aisha@cat-i.ai', subject: 'CAT-I.AI March Update: New MES Features & More', contentPieceId: 4, status: 'Scheduled', audience: { type: 'all_leads' }, scheduledDate: '2026-03-28', recipients: 8, bodyHtml: '<p>Hello,</p><p>We are excited to share our March platform updates with you!</p>', createdBy: 'Yael', emailType: 'marketing' },
  { id: 2, name: 'MES Feature Launch — Targeted', fromName: 'David', fromEmail: 'david@cat-i.ai', subject: 'New AI Scheduling in CAT-MES — See It in Action', contentPieceId: 1, status: 'Draft', audience: { type: 'by_module', modules: ['CAT-MES', 'Full Platform'] }, recipients: 4, bodyHtml: '', createdBy: 'Yael', emailType: 'marketing' },
];

// EMAIL TEMPLATES
import { COFFEE_SHOW_SURVEY_HTML, COFFEE_SHOW_NO_SURVEY_HTML } from './email-templates';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Coffee Show templates — processed HTML with S3 image URLs (no base64)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'coffee-show-survey',
    name: 'Coffee Show with Survey',
    description: 'World of Coffee follow-up with survey CTA button',
    previewColor: '#c4d8e8',
    hasCta: true,
    hasImage: false,
    htmlTemplate: COFFEE_SHOW_SURVEY_HTML,
    featured: true,
    source: 'builtin',
  },
  {
    id: 'coffee-show-no-survey',
    name: 'Coffee Show without Survey',
    description: 'World of Coffee follow-up — no survey button',
    previewColor: '#c4d8e8',
    hasCta: false,
    hasImage: false,
    htmlTemplate: COFFEE_SHOW_NO_SURVEY_HTML,
    source: 'builtin',
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PRIMARY: CAT-I branded follow-up — imported from World_of_Coffee_Email_Template_V2
  // Merge fields: {{contact_name}}, {{body_content}}, {{from_name}}, {{from_role}}
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'woc-followup',
    name: 'CAT-I Branded Follow-Up',
    description: 'Branded follow-up with pre-demo survey CTA — CAT-I.AI\'s primary outbound template',
    previewColor: '#c4d8e8',
    hasCta: false,
    hasImage: false,
    featured: true,
    defaultBody: `<p style="margin: 0 0 14px;">It was a pleasure connecting with you at the World of Coffee Show! We loved hearing about what you're building and believe CAT-I.AI can make a real difference in your food safety compliance workflow.</p><p style="margin: 0;">To make our 30-minute demo as valuable as possible for you, we'd love to understand your priorities before we meet. It takes less than 3 minutes.</p>`,
    htmlTemplate: `<div style="background-color: #f0eff3; padding: 36px 16px 40px 16px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0eff3;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(101,60,223,0.07), 0 2px 8px rgba(0,0,0,0.03);">

          <!-- GRADIENT ZONE: Logo + Greeting + Body -->
          <tr>
            <td style="background: linear-gradient(160deg, #d4ecf7 0%, #c4d8e8 100%); padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- CAT-I.AI Logo -->
                <tr>
                  <td align="center" style="padding: 28px 40px 10px 40px;">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDk5IiBoZWlnaHQ9IjE5MyIgdmlld0JveD0iMCAwIDQ5OSAxOTMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xNTk4XzE2MDI0NykiPgo8cGF0aCBkPSJNMTI3LjY3MyA3Mi45MDcyQzEyNy42NzMgNzIuOTA3MiAxMjUuNjEzIDg1Ljg5MDggMTE3LjgzNSA5NS4wMDM1QzExMC41MTYgMTAzLjU4MiA5Ny43MDcgMTA3LjA3OSA5Ny43MDcgMTA3LjA3OUM5Ny43MDcgMTA3LjA3OSAxMDguNjg5IDEwMS42MDkgMTE1LjMxOSA5NC4wOTE2QzEyMi43MTYgODUuNzEyMyAxMjcuNjczIDcyLjkwNzIgMTI3LjY3MyA3Mi45MDcyWiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzE1OThfMTYwMjQ3KSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE0Ni40MjkgNDkuNjcxOUMxNDYuNDI1IDQ5LjcwMDkgMTQzLjY2OCA3Mi42NDE2IDEzNi4zNjIgODQuOTc4OEMxMjguMzczIDk4LjQ4MDEgMTIxLjM2OSAxMDUuOTczIDEwNy4wODUgMTEyLjU0NUM5Ni4xOTAzIDExNy41NTkgODguODg4NiAxMTcuODQ1IDc2Ljg5NTggMTE4LjIzOUM2OS4wMTggMTE4LjUgNTYuNzY0IDExNi44NzIgNTYuNzY0IDExNi44NzJDNTYuNzUzOCAxMTYuODc0IDUzLjk5MDUgMTE3LjUgNTMuMzMyOCAxMTkuMTUxQzUyLjMzNDMgMTIxLjY3OSA1Ni43NjQgMTI1LjUyOCA1Ni43NjQgMTI1LjUyOEM1Ni43NTE0IDEyNS41MzEgNTMuODcyNyAxMjYuMjA2IDUyLjQyMTMgMTI1LjUyOEM1MS4xMDg4IDEyNC45MjIgNDkuNjg1MiAxMjMuMDQxIDQ5LjY3MzggMTIzLjAyNUM0OS42NzM4IDEyMy4wMjUgNDguNTQyMyAxMjUuMDIzIDQ4LjA3NCAxMjYuNjY4QzQ3LjAzMSAxMzAuMzQzIDUwLjEyNiAxMzYuMjIyIDUwLjEzMzcgMTM2LjIzNkM0MS42Njc0IDEzMi41OTQgMzcuNTQgMTE5LjAyNiAzOC40NjgyIDEwNi4zOTVDMzkuMTM1NCA5Ny4yNzQzIDQxLjAyNSA5Mi4wMjM4IDQ1LjU1ODUgODQuMDY3M0M1MS4xMDc0IDc0LjMyODggNTYuMjQ2IDY5LjY1MDEgNjUuNjg2MSA2My41NjY2Qzc0LjQ0NjYgNTcuOTIyNSA4MC4zMDIzIDU1LjU1MjEgOTAuNjE2OCA1My45OTgxQzk3LjEzMTEgNTMuMDIwMSAxMDUuNTQzIDUzLjQzODkgMTEzLjgyMyA1My44NDkyQzEyMC45NTUgNTQuMjAxNCAxMjcuOTg0IDU0LjU0OTIgMTMzLjYxOSA1My45OTgxQzE0My4yNjcgNTMuMDU0NCAxNDYuNDIxIDQ5LjY4MDMgMTQ2LjQyOSA0OS42NzE5Wk0xMzMuNjE5IDY3LjIxMzdDMTMzLjYxOSA2Ny4yMTM3IDEyNi43OTggNjcuOTI2MyAxMjIuNDEgNjguMTI1MkMxMTcuMDU2IDY4LjM2MTUgMTA4LjY4OSA2OC4xMjUyIDEwOC42ODkgNjguMTI1MkMxMDguNjkzIDY4LjE1MDEgMTEzLjI1IDk3Ljk2OTIgOTAuNjE2OCAxMDQuOEM3NS42NjkyIDEwOS4zMTMgNjEuNzk5MSA5NC4zNTY5IDU5LjA1MTYgODAuODgwNUM0NS40MjYxIDkxLjcyOTYgNDYuMTM4NyAxMTEuOTAzIDY2LjE0MTkgMTE0LjU5NkM4My4wNzAzIDExNi44NzEgMTA3Ljc3MyAxMTQuNTk2IDEyMy4zMjYgOTQuMDkxNkMxMzAuNDQzIDg0LjcwNTggMTMzLjYxMSA2Ny4yNjE1IDEzMy42MTkgNjcuMjEzN1pNMTAxLjU1OSA3Mi4xNDk5QzEwMC45NDMgNjcuNjc2NSA5OC4xNDc1IDY0LjM2NjQgOTUuMzE1NyA2NC43NTY1QzkyLjQ4MzggNjUuMTQ2NSA5MC42ODc3IDY5LjA4OSA5MS4zMDM4IDczLjU2MjNDOTEuOTIgNzguMDM1NiA5NC43MTUgODEuMzQ1NyA5Ny41NDY4IDgwLjk1NTdDMTAwLjM3OSA4MC41NjU3IDEwMi4xNzUgNzYuNjIzMiAxMDEuNTU5IDcyLjE0OTlaIiBmaWxsPSJ1cmwoI3BhaW50MV9saW5lYXJfMTU5OF8xNjAyNDcpIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNjEuNDMzMSA2LjU3NzgzQzc5LjU0MDMgLTAuNDU5ODYyIDk5LjM1ODkgLTEuODg5MDYgMTE4LjI5NSAyLjQ3NzI5QzEzNy4yMzIgNi44NDM2NCAxNTQuNDAyIDE2LjgwMjEgMTY3LjU2MiAzMS4wNDkyTDE1Mi40MTEgNDQuOTI5OEMxNDIuMDU5IDMzLjcyMTEgMTI4LjU0OSAyNS44ODY2IDExMy42NTIgMjIuNDUxNEM5OC43NTQzIDE5LjAxNjMgODMuMTYyNCAyMC4xNDA2IDY4LjkxNyAyNS42Nzc0QzU0LjY3MTUgMzEuMjE0MiA0Mi40MzYzIDQwLjkwNTMgMzMuODEyOCA1My40ODI0QzI1LjE4OTEgNjYuMDU5NiAyMC41NzkgODAuOTM2OCAyMC41ODU2IDk2LjE2NjZDMjAuNTkyNCAxMTEuMzk3IDI1LjIxNTUgMTI2LjI3IDMzLjg1MDEgMTM4Ljg0QzQyLjQ4NDcgMTUxLjQwOCA1NC43MjgzIDE2MS4wODkgNjguOTc4NiAxNjYuNjE0QzgzLjIyODggMTcyLjEzOCA5OC44MjE3IDE3My4yNDkgMTEzLjcxNiAxNjkuODAxQzEyOC42MTEgMTY2LjM1MyAxNDIuMTEzIDE1OC41MDYgMTUyLjQ1NyAxNDcuMjg5TDE2Ny42MTkgMTYxLjE1NkMxNTQuNDcyIDE3NS40MTUgMTM3LjMxIDE4NS4zODggMTE4LjM3NyAxODkuNzcxQzk5LjQ0NDYgMTk0LjE1NCA3OS42MjQ4IDE5Mi43NDIgNjEuNTExNCAxODUuNzJDNDMuMzk4MiAxNzguNjk4IDI3LjgzNTQgMTY2LjM5NCAxNi44NjAyIDE1MC40MTdDNS44ODQ5MiAxMzQuNDQgMC4wMDg0Nzc5OSAxMTUuNTM0IDkuMTY4MzhlLTA2IDk2LjE3NTZDLTAuMDA4NDYwNTIgNzYuODE3MSA1Ljg1MTQ0IDU3LjkwNyAxNi44MTI3IDQxLjkyMDNDMjcuNzc0IDI1LjkzMzggNDMuMzI2IDEzLjYxNTYgNjEuNDMzMSA2LjU3NzgzWiIgZmlsbD0iI0VEQTgwNyIvPgo8cGF0aCBkPSJNMTk4LjU1NSAwTDEwNS4wMDQgMTY1LjE1OEMxMDUuMDA0IDE2NS4xNTggMTE1LjQzOSAxNjMuNjQ1IDEyMS43MDEgMTYxLjI4NUMxMjYuODU3IDE1OS4zNDQgMTM0LjI4MiAxNTQuOTA4IDEzNC4yODIgMTU0LjkwOEwyMDUuMzAyIDMwLjUyNTlMMjQ2LjgxNyAxMDMuOTA0SDIwNS40MTdMMTk0LjQzNyAxMjQuNjA5SDI1OC41MzFMMjk2LjY3OSAxOTIuMDM5SDMyMC40NjdMMjEyLjA0OSAwSDIwNS4zMDJIMTk4LjU1NVoiIGZpbGw9IiMyMzk4ODgiLz4KPHBhdGggZD0iTTM2MS44NTcgMEgyMTguNjcyTDIzMC4zMzcgMjAuNzMwM0gyODEuMTE2VjExMS4xNjlMMzAxLjkzIDE0OC4wNzNWMjAuNzMwM0gzNjEuODU3VjBaIiBmaWxsPSIjOUYyMDk0Ii8+CjxwYXRoIGQ9Ik0zMzQuMTcyIDEwMy40NDFIMzA5LjAxMlYxMjMuOTQ0SDMzNC4xNzJWMTAzLjQ0MVoiIGZpbGw9IiMwRjU0QUUiLz4KPHBhdGggZD0iTTM2Mi4wODYgNTUuODM1OUgzNDEuMDQzVjE5Mi4wNjRIMzYyLjA4NlY1NS44MzU5WiIgZmlsbD0iIzU2MDA2RSIvPgo8cGF0aCBkPSJNMzU1Ljk4NyAzNS4xNDc2TDM1MS44OSAyNi4xMzI4TDM0Ny43OTIgMzUuMTQ3NkwzMzguNzc3IDM5LjI0NTJMMzQ3Ljc5MiA0My4zNDI4TDM1MS44OSA1Mi4zNTc2TDM1NS45ODcgNDMuMzQyOEwzNjUuMDAyIDM5LjI0NTJMMzU1Ljk4NyAzNS4xNDc2WiIgZmlsbD0idXJsKCNwYWludDJfbGluZWFyXzE1OThfMTYwMjQ3KSIvPgo8cGF0aCBkPSJNNDIwLjU5NSA5NS41TDM3My41NTUgMTc4LjU0OEMzNzMuNTU1IDE3OC41NDggMzc4LjgwMiAxNzcuNzg3IDM4MS45NTEgMTc2LjZDMzg0LjU0MyAxNzUuNjI0IDM4OC4yNzcgMTczLjM5MyAzODguMjc3IDE3My4zOTNMNDIzLjk4OCAxMTAuODVMNDQ0Ljg2MyAxNDcuNzQ3SDQyNC4wNDZMNDE4LjUyNSAxNTguMTU4SDQ1MC43NTRMNDY5LjkzNiAxOTIuMDY0SDQ4MS44OTdMNDI3LjM4MSA5NS41SDQyMy45ODhINDIwLjU5NVoiIGZpbGw9IiMwRjU0QUUiLz4KPHBhdGggZD0iTTQ5OC41MzYgMTEyLjA1OUg0ODYuMTc2VjE5Mi4wNzhINDk4LjUzNlYxMTIuMDU5WiIgZmlsbD0iIzBGNTRBRSIvPgo8Y2lyY2xlIGN4PSI0OTIuNTUiIGN5PSIxMDIuODE5IiByPSI1Ljc3NjMxIiBmaWxsPSIjMEY1NEFFIi8+CjxjaXJjbGUgY3g9IjM4MC40ODciIGN5PSIxODYuMzgyIiByPSI1Ljc3NjMxIiBmaWxsPSIjMEY1NEFFIi8+CjwvZz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNTk4XzE2MDI0NyIgeDE9IjU3Ljk0NjciIHkxPSIxMzkuNjQ0IiB4Mj0iMTQ2LjM5NCIgeTI9IjUxLjE5NjgiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzY5NTEyQSIvPgo8c3RvcCBvZmZzZXQ9IjAuMjUiIHN0b3AtY29sb3I9IiNFNEM0OTEiLz4KPHN0b3Agb2Zmc2V0PSIwLjU1Mjg4NSIgc3RvcC1jb2xvcj0iIzk3NkQ0MCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1OTM2MUUiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzE1OThfMTYwMjQ3IiB4MT0iNTcuOTQ2NyIgeTE9IjEzOS42NDQiIHgyPSIxNDYuMzk0IiB5Mj0iNTEuMTk2OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjNjk1MTJBIi8+CjxzdG9wIG9mZnNldD0iMC4yNSIgc3RvcC1jb2xvcj0iI0U0QzQ5MSIvPgo8c3RvcCBvZmZzZXQ9IjAuNTUyODg1IiBzdG9wLWNvbG9yPSIjOTc2RDQwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzU5MzYxRSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Ml9saW5lYXJfMTU5OF8xNjAyNDciIHgxPSIzNDIuNjc3IiB5MT0iMjguNTU5OCIgeDI9IjM2Mi45NTgiIHkyPSIyNi44NDc5IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxNTVFRUYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkYzQjhEIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMTU5OF8xNjAyNDciPgo8cmVjdCB3aWR0aD0iNDk4LjUzNSIgaGVpZ2h0PSIxOTIuMjY3IiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=" alt="CAT-I.AI" width="140" style="display: block; max-width: 140px; height: auto; margin: 0 auto;" />
                  </td>
                </tr>

                <!-- Tagline -->
                <tr>
                  <td align="center" style="padding: 0 40px 20px 40px;">
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; margin: 0; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Audit-Ready &bull; All the Time</p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding: 0 48px 16px 48px;">
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.75; color: #2a2a38; margin: 0; font-weight: 600;">Hi {{contact_name}},</p>
                  </td>
                </tr>

                <!-- Body content (editable slot) -->
                <tr>
                  <td style="padding: 0 48px 24px 48px;">
                    <div class="template-body-slot" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.75; color: #2a2a38;">{{body_content}}</div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- WHITE ACTION ZONE: Closing + Signature + CTA + Footer -->
          <tr>
            <td style="background-color: #ffffff; background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIwLjgiIGZpbGw9IiNjNGM0Y2UiIG9wYWNpdHk9IjAuMzYiLz48L3N2Zz4K'); background-repeat: repeat; background-size: 20px 20px; padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Closing line -->
                <tr>
                  <td style="padding: 28px 48px 18px 48px;">
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.75; color: #2a2a38; margin: 0;">Looking forward to showing you what Audit-Ready All the Time really looks like.</p>
                  </td>
                </tr>

                <!-- Signature -->
                <tr>
                  <td style="padding: 0 48px 28px 48px;">
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #2a2a38; margin: 0;">
                      Warmly, <strong style="font-weight: 600;">{{from_name}}</strong>&nbsp;&nbsp;<span style="color: #b8b8c8;">&middot;</span>&nbsp;&nbsp;<span style="font-size: 13px; color: #6e6e82;">{{from_role}}, CAT-I.AI, Inc.</span>
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 4px 56px 10px 56px;">
                    <a href="https://survey.zohopublic.com/zs/gWjK9A" target="_blank" style="display: inline-block; padding: 17px 48px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.4px; border-radius: 120px; background: linear-gradient(90deg, #40c0a8 0%, #50acd8 35%, #6888e0 65%, #8860d0 100%); box-shadow: 0 4px 20px rgba(64,192,168,0.28), 0 2px 4px rgba(0,0,0,0.06);">Complete Your Quick Pre-Demo Survey</a>
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #a0a5b8; margin: 10px 0 0 0;">Less than 3 minutes &bull; 6 quick questions</p>
                  </td>
                </tr>

                <!-- Footer contacts -->
                <tr>
                  <td align="center" style="padding: 24px 48px 32px 48px; border-top: 1px solid #e8e8f0;">
                    <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #4a4a5e; margin: 0;">
                      <a href="mailto:artem@cat-i.ai" style="color: #4a4a5e; text-decoration: none;">artem@cat-i.ai</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;+1 206 844 4888&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="https://cat-i.ai" style="color: #4a4a5e; text-decoration: none;">cat-i.ai</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>`
  },
  {
    id: 'cat-i-standard',
    name: 'CAT-I Standard',
    description: 'Dark themed branded template with rainbow accents',
    previewColor: '#1F2937',
    hasCta: true,
    hasImage: false,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif;">
  <div style="height: 4px; background: linear-gradient(to right, #E11D48, #EA580C, #D97706, #34A125, #0891B2, #1A56DB, #7C3AED);"></div>
  <div style="background: #1F2937; padding: 0;">
    <div style="text-align: center; padding: 32px 24px 24px;">
      <div style="font-size: 28px; font-weight: 700; color: #fff;">
        <span style="color: #D97706;">C</span><span style="color: #1A56DB;">A</span><span style="color: #34A125;">T</span><span style="color: #7C3AED;">-I</span><span style="color: #9CA3AF;">.AI</span>
      </div>
    </div>
    <div style="background: #fff; margin: 0 24px 24px; border-radius: 8px; padding: 32px;">
      <p style="font-size: 16px; color: #111827; margin-bottom: 16px;">Hi {{contact_name}},</p>
      <div class="template-body-slot">{{body_content}}</div>
      {{cta_block}}
      <p style="font-size: 14px; color: #111827; margin-top: 24px; font-style: italic; color: #0D9488;">Looking forward to showing you what Audit-Ready All the Time really looks like.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="font-size: 14px; color: #6B7280;">Warmly,</p>
      <p style="font-size: 16px; font-weight: 600; color: #0D9488; margin-top: 4px;">{{from_name}}</p>
      <p style="font-size: 13px; color: #6B7280;">{{from_role}}, <a href="https://cat-i.ai" style="color: #1A56DB; text-decoration: none;">CAT-I.AI</a>, Inc.</p>
      <p style="font-size: 13px; color: #6B7280;">{{from_email}} | +1 206 844 4888 | <a href="https://cat-i.ai" style="color: #1A56DB; text-decoration: none;">cat-i.ai</a></p>
    </div>
    <div style="height: 4px; background: linear-gradient(to right, #E11D48, #EA580C, #D97706, #34A125, #0891B2, #1A56DB, #7C3AED);"></div>
    <div style="text-align: center; padding: 16px 24px;">
      <p style="font-size: 12px; color: #6B7280;"><a href="https://cat-i.ai" style="color: #0891B2; text-decoration: none;">CAT-I.AI</a>, Inc. | AUDIT-READY ALL THE TIME | <a href="https://cat-i.ai" style="color: #0891B2; text-decoration: none;">cat-i.ai</a></p>
    </div>
  </div>
</div>`
  },
  {
    id: 'product-update',
    name: 'Product Update',
    description: 'Clean layout for feature announcements',
    previewColor: '#1A56DB',
    hasCta: true,
    hasImage: true,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; background: #fff;">
  <div style="padding: 24px;">
    <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">
      <span style="color: #D97706;">C</span><span style="color: #1A56DB;">A</span><span style="color: #34A125;">T</span><span style="color: #7C3AED;">-I</span><span style="color: #6B7280;">.AI</span>
    </div>
  </div>
  <div style="height: 6px; background: linear-gradient(to right, #9F2094, #1A56DB);"></div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">Hi {{contact_name}},</p>
    <div class="template-body-slot">{{body_content}}</div>
    {{image_block}}
    {{cta_block}}
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 24px;" />
    <p style="font-size: 14px; color: #6B7280; margin-bottom: 4px;">{{from_name}}</p>
    <p style="font-size: 13px; color: #9CA3AF;">{{from_role}} · CAT-I.AI, Inc.</p>
  </div>
  <div style="background: #F9FAFB; padding: 16px 24px; text-align: center;">
    <p style="font-size: 12px; color: #9CA3AF;">CAT-I.AI, Inc. · Compliance & Traceability Intelligence · <a href="https://cat-i.ai" style="color: #1A56DB;">cat-i.ai</a></p>
  </div>
</div>`
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Multi-section layout for monthly updates',
    previewColor: '#059669',
    hasCta: false,
    hasImage: false,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; background: #fff;">
  <div style="text-align: center; padding: 32px 24px 24px; border-bottom: 1px solid #E5E7EB;">
    <div style="font-size: 28px; font-weight: 700;">
      <span style="color: #D97706;">C</span><span style="color: #1A56DB;">A</span><span style="color: #34A125;">T</span><span style="color: #7C3AED;">-I</span><span style="color: #6B7280;">.AI</span>
    </div>
    <p style="font-size: 13px; color: #6B7280; margin-top: 8px;">Monthly Newsletter</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 15px; color: #374151; margin-bottom: 24px;">Hi {{contact_name}},</p>
    <div class="template-body-slot">{{body_content}}</div>
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="font-size: 14px; color: #6B7280;">Best regards,</p>
      <p style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 4px;">{{from_name}}</p>
      <p style="font-size: 13px; color: #6B7280;">{{from_role}} · CAT-I.AI</p>
    </div>
  </div>
  <div style="background: #1F2937; padding: 24px; text-align: center;">
    <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 12px;">Follow us</p>
    <p style="font-size: 12px; color: #6B7280;">LinkedIn · Twitter · YouTube</p>
    <p style="font-size: 11px; color: #6B7280; margin-top: 16px;"><a href="https://cat-i.ai" style="color: #0891B2;">cat-i.ai</a> · Unsubscribe</p>
  </div>
</div>`
  },
  {
    id: 'event-invite',
    name: 'Event / Webinar',
    description: 'Dark header with event details',
    previewColor: '#7C3AED',
    hasCta: true,
    hasImage: false,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif;">
  <div style="background: linear-gradient(135deg, #1F2937, #111827); padding: 40px 24px; text-align: center;">
    <p style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">You're Invited</p>
    <h1 style="font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 16px;">{{event_name}}</h1>
    <div style="display: inline-block; background: rgba(255,255,255,0.1); padding: 12px 24px; border-radius: 8px;">
      <p style="font-size: 14px; color: #fff; margin: 0;">📅 {{event_date}} · 🕐 {{event_time}}</p>
    </div>
  </div>
  <div style="background: #fff; padding: 32px 24px;">
    <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">Hi {{contact_name}},</p>
    <div class="template-body-slot">{{body_content}}</div>
    {{cta_block}}
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 24px;" />
    <p style="font-size: 14px; color: #6B7280;">{{from_name}}</p>
    <p style="font-size: 13px; color: #9CA3AF;">{{from_role}} · CAT-I.AI, Inc.</p>
  </div>
  <div style="background: #F9FAFB; padding: 16px 24px; text-align: center;">
    <p style="font-size: 12px; color: #9CA3AF;">CAT-I.AI, Inc. · <a href="https://cat-i.ai" style="color: #1A56DB;">cat-i.ai</a></p>
  </div>
</div>`
  },
  {
    id: 'simple-text',
    name: 'Simple Text',
    description: 'Minimal design for personal emails',
    previewColor: '#6B7280',
    hasCta: false,
    hasImage: false,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 32px 24px;">
  <div style="margin-bottom: 32px;">
    <div style="font-size: 20px; font-weight: 700;">
      <span style="color: #D97706;">C</span><span style="color: #1A56DB;">A</span><span style="color: #34A125;">T</span><span style="color: #7C3AED;">-I</span><span style="color: #6B7280;">.AI</span>
    </div>
  </div>
  <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">Hi {{contact_name}},</p>
  <div class="template-body-slot" style="font-size: 15px; color: #374151; line-height: 1.7;">{{body_content}}</div>
  <div style="margin-top: 32px;">
    <p style="font-size: 14px; color: #6B7280;">Best,</p>
    <p style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 4px;">{{from_name}}</p>
    <p style="font-size: 13px; color: #6B7280;">{{from_role}}</p>
    <p style="font-size: 13px; color: #6B7280;">{{from_email}}</p>
    <p style="font-size: 13px; color: #1A56DB; margin-top: 4px;"><a href="https://cat-i.ai" style="color: #1A56DB;">cat-i.ai</a></p>
  </div>
</div>`
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    previewColor: '#E5E7EB',
    hasCta: false,
    hasImage: false,
    htmlTemplate: `<div style="max-width: 640px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 32px 24px;">
  <div class="template-body-slot">{{body_content}}</div>
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
    <p style="font-size: 12px; color: #9CA3AF;">Sent by CAT-I.AI · Compliance & Traceability Intelligence · <a href="https://cat-i.ai" style="color: #6B7280;">cat-i.ai</a></p>
  </div>
</div>`
  }
];
