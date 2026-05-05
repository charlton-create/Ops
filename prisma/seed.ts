import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

// In Prisma 7, use accelerateUrl to pass the connection string for non-adapter usage
// Or use pg adapter for direct connections
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FKs)
  await prisma.zohoInvoice.deleteMany();
  await prisma.dealExpansion.deleteMany();
  await prisma.projectTask.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.message.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.demoRequest.deleteMany();
  await prisma.emailCampaign.deleteMany();
  await prisma.contentPiece.deleteMany();
  await prisma.kBDocument.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.project.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.mESConfig.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.teamMember.deleteMany();

  // --- TEAM MEMBERS ---
  const teamData = [
    { name: "Aisha", role: "CEO / Founder", color: "#A02195", status: "online", tz: "PST", city: "Seattle, WA", utcOffset: -7, email: "aisha@cat-i.ai" },
    { name: "Suresh", role: "CTO", color: "#1A56DB", status: "online", tz: "IST", city: "India", utcOffset: 5.5, email: "suresh@cat-i.ai" },
    { name: "Artem", role: "COO", color: "#0D9488", status: "away", tz: "EET", city: "Ukraine", utcOffset: 2, email: "artem@cat-i.ai" },
    { name: "Charlton", role: "CPO", color: "#7C3AED", status: "online", tz: "EST", city: "East Coast", utcOffset: -4, email: "charlton@cat-i.ai" },
    { name: "Tiffini", role: "CAO", color: "#D97706", status: "offline", tz: "CST", city: "Central US", utcOffset: -5, email: "tiffini@cat-i.ai" },
    { name: "David", role: "Customer Success", color: "#34A125", status: "online", tz: "PST", city: "West Coast", utcOffset: -7, email: "david@cat-i.ai" },
    { name: "Igor", role: "Developer", color: "#E11D48", status: "online", tz: "EET", city: "Ukraine", utcOffset: 2, email: "igor@cat-i.ai" },
    { name: "Ahilan", role: "Developer", color: "#D99808", status: "away", tz: "IST", city: "India", utcOffset: 5.5, email: "ahilan@cat-i.ai" },
    { name: "Yael", role: "Content & Marketing", color: "#EC6B15", status: "online", tz: "PST", city: "West Coast", utcOffset: -7, email: "yael@cat-i.ai" },
  ];

  const team: Record<string, { id: number }> = {};
  for (const t of teamData) {
    const member = await prisma.teamMember.create({ data: t });
    team[t.name] = member;
  }
  console.log(`  Created ${teamData.length} team members`);

  // --- APP USERS (with hashed passwords) ---
  const defaultPassword = await bcrypt.hash("catops2026", 10);
  const userRoles: Record<string, string> = {
    Aisha: "admin", Suresh: "admin",
    Artem: "manager", Charlton: "manager", Tiffini: "manager",
    David: "user", Igor: "user", Ahilan: "user", Yael: "user",
  };

  for (const [name, member] of Object.entries(team)) {
    await prisma.appUser.create({
      data: {
        teamMemberId: member.id,
        email: teamData.find((t) => t.name === name)!.email,
        passwordHash: defaultPassword,
        name,
        role: userRoles[name],
        status: "active",
        permissions: [],
      },
    });
  }
  console.log(`  Created ${Object.keys(team).length} app users`);

  // --- LEADS ---
  const leadsData = [
    { company: "SunFresh Foods", contact: "Maria Chen", title: "VP Quality", stage: "Technical Review", value: 72000, probability: 40, modules: ["CAT-I", "CAT-QT"], certifications: ["SQF L2", "FSSC 22000"], facilities: 3, owner: "David", priority: "high", lastActivity: new Date("2026-03-23"), nextAction: "Complete solution design", source: "Website", notes: "Interested in AI doc generation. Currently using spreadsheets for HACCP.", industry: "Produce", email: "mchen@sunfresh.com", phone: "" },
    { company: "Pacific Grain Co", contact: "James Wright", title: "Dir Food Safety", stage: "Module Selection", value: 108000, probability: 70, modules: ["CAT-I", "CAT-MES", "CAT-QT"], certifications: ["SQF L3", "ISCC Plus"], facilities: 5, owner: "Charlton", priority: "high", lastActivity: new Date("2026-03-22"), nextAction: "Confirm final module selection", source: "Referral", notes: "Multi-facility. Need enterprise pricing.", industry: "Bakery", email: "jwright@pacgrain.com", phone: "" },
    { company: "Bright Harvest Dairy", contact: "Susan Park", title: "QA Manager", stage: "Qualified", value: 36000, probability: 15, modules: ["CAT-I"], certifications: ["SQF L2"], facilities: 1, owner: "David", priority: "medium", lastActivity: new Date("2026-03-20"), nextAction: "Schedule MES Intake call", source: "Trade Show", notes: "Met at IAFP. Small but growing.", industry: "Dairy", email: "spark@brightharvest.com", phone: "" },
    { company: "Coastal Seafood Inc", contact: "Robert Tanaka", title: "CEO", stage: "New Lead", value: 51000, probability: 5, modules: ["CAT-I", "CAT-SCAN"], certifications: ["BRC", "BAP"], facilities: 2, owner: "Aisha", priority: "medium", lastActivity: new Date("2026-03-24"), nextAction: "Send intro email", source: "LinkedIn", notes: "Inbound from LinkedIn. BRC, may need SQF transition.", industry: "Seafood", email: "rtanaka@coastalseafood.com", phone: "" },
    { company: "Green Valley Organics", contact: "Diana Reeves", title: "Plant Mgr", stage: "Contract Review", value: 72000, probability: 85, modules: ["Full Platform"], certifications: ["SQF L2", "USDA Organic"], facilities: 2, owner: "Charlton", priority: "high", lastActivity: new Date("2026-03-24"), nextAction: "Final contract review with legal", source: "Referral", notes: "Full platform. Legal reviewing MSA. Target close: Apr 5.", industry: "Produce", email: "dreeves@greenvalley.com", phone: "" },
    { company: "Mountain Bake Co", contact: "Tom Hendricks", title: "Quality Dir", stage: "Closed Won", value: 72000, probability: 100, modules: ["CAT-I", "CAT-QT", "CAT-MES"], certifications: ["SQF L2"], facilities: 2, owner: "David", priority: "high", lastActivity: new Date("2026-03-15"), nextAction: "Kickoff onboarding", source: "Website", notes: "Signed Mar 15. Onboarding starts Apr 1.", industry: "Bakery", email: "thendricks@mountainbake.com", phone: "", convertedToCustomer: true },
    { company: "Delta Mills LLC", contact: "Karen Foster", title: "Compliance", stage: "Closed Lost", value: 36000, probability: 0, modules: ["CAT-I"], certifications: ["FSSC 22000"], facilities: 1, owner: "David", priority: "low", lastActivity: new Date("2026-03-10"), nextAction: "Follow up Q3", source: "Cold Outreach", notes: "Chose competitor. Budget. Revisit 6 months.", industry: "Bakery", email: "kfoster@deltamills.com", phone: "" },
    { company: "Apex Protein Inc", contact: "Liam O'Brien", title: "SVP Ops", stage: "Discovery", value: 108000, probability: 25, modules: ["Full Platform"], certifications: ["SQF L3"], facilities: 4, owner: "Aisha", priority: "high", lastActivity: new Date("2026-03-25"), nextAction: "Complete MES Intake form", source: "Conference", notes: "Enterprise. 4 facilities, 3 states. Very interested in MES.", industry: "Meat & Poultry", email: "lobrien@apexprotein.com", phone: "" },
    { company: "Sunrise Bakery Group", contact: "Jennifer Walsh", title: "Dir Quality Assurance", stage: "Proposal Sent", value: 87000, probability: 55, modules: ["CAT-I", "CAT-QT"], certifications: ["SQF L2"], facilities: 3, owner: "David", priority: "high", lastActivity: new Date("2026-03-26"), nextAction: "Follow up on proposal", source: "Website", notes: "Converted from web demo request. Interested in HACCP and NCR modules.", industry: "Bakery", email: "jwalsh@sunrisebakery.com", phone: "" },
  ];

  const leads: Record<string, { id: number }> = {};
  for (const l of leadsData) {
    const { owner, ...rest } = l;
    const lead = await prisma.lead.create({
      data: { ...rest, ownerId: team[owner].id },
    });
    leads[l.company] = lead;
  }
  console.log(`  Created ${leadsData.length} leads`);

  // --- CUSTOMERS ---
  await prisma.customer.create({
    data: {
      leadId: leads["Mountain Bake Co"].id,
      company: "Mountain Bake Co",
      contact: "Tom Hendricks",
      title: "Quality Dir",
      email: "thendricks@mountainbake.com",
      phone: "(555) 123-4567",
      industry: "Bakery",
      modules: ["CAT-I", "CAT-QT", "CAT-MES"],
      certifications: ["SQF L2"],
      facilities: 2,
      ownerId: team["David"].id,
      contractValue: 72000,
      contractStart: new Date("2026-03-15"),
      contractEnd: new Date("2027-03-15"),
      status: "onboarding",
      billingStatus: "current",
      zohoCustomerId: "ZC-1001",
      notes: "Signed Mar 15. Onboarding starts Apr 1.",
      invoices: {
        create: {
          id: "INV-001",
          invoiceNumber: "INV-00001",
          date: new Date("2026-03-15"),
          dueDate: new Date("2026-04-15"),
          amount: 72000,
          status: "paid",
          zohoUrl: "https://books.zoho.com/invoices/1",
        },
      },
    },
  });
  console.log("  Created 1 customer with invoice");

  // --- PROJECTS ---
  const projectsData = [
    { name: "Mountain Bake Onboarding", status: "In Progress", owner: "David", due: new Date("2026-04-15"), progress: 25, type: "customer", tasks: [{ text: "Kickoff call", done: true }, { text: "Facility profile setup", done: true }, { text: "Doc template migration", done: false }, { text: "Admin training", done: false }, { text: "Go-live checklist", done: false }] },
    { name: "CAT-MES v2.1 Sprint", status: "In Progress", owner: "Suresh", due: new Date("2026-04-10"), progress: 60, type: "product", tasks: [{ text: "AI scheduling algorithm", done: true }, { text: "Sanitation checklist module", done: true }, { text: "Machine layout drag-drop", done: true }, { text: "QC portal integration", done: false }, { text: "Performance testing", done: false }] },
    { name: "Website Redesign", status: "In Progress", owner: "Charlton", due: new Date("2026-04-20"), progress: 40, type: "marketing", tasks: [{ text: "5-module architecture copy", done: true }, { text: "Pricing page update", done: true }, { text: "Case studies section", done: false }, { text: "Demo request flow", done: false }, { text: "SEO optimization", done: false }] },
    { name: "SOC 2 Type II Prep", status: "Not Started", owner: "Artem", due: new Date("2026-06-30"), progress: 0, type: "compliance", tasks: [{ text: "Gap assessment", done: false }, { text: "Policy documentation", done: false }, { text: "Access control audit", done: false }, { text: "Vendor risk review", done: false }] },
  ];

  const projects: Record<string, { id: number }> = {};
  for (const p of projectsData) {
    const { owner, tasks, ...rest } = p;
    const project = await prisma.project.create({
      data: {
        ...rest,
        ownerId: team[owner].id,
        tasks: {
          create: tasks.map((t, i) => ({ text: t.text, done: t.done, sortOrder: i })),
        },
      },
    });
    projects[p.name] = project;
  }
  console.log(`  Created ${projectsData.length} projects with tasks`);

  // --- KB DOCUMENTS ---
  const kbData = [
    { title: "Sales Playbook", type: "playbook", category: "Sales", author: "Charlton", description: "Positioning, objection handling, competitive intel" },
    { title: "Demo Script — Full Platform", type: "playbook", category: "Sales", author: "David", description: "Step-by-step demo flow for all 5 modules" },
    { title: "Pricing Guide 2026", type: "document", category: "Sales", author: "Aisha", description: "CAT-I Base $36K, modules $15K each, Full $72K" },
    { title: "Customer Onboarding Checklist", type: "playbook", category: "Operations", author: "David", description: "8-step onboarding from signed contract to go-live" },
    { title: "Platform Architecture Overview", type: "document", category: "Engineering", author: "Suresh", description: "AWS infra, Next.js frontend, API routes backend" },
    { title: "Contract Template", type: "template", category: "Legal", author: "Aisha", description: "Standard MSA and SOW templates" },
    { title: "Competitive Landscape", type: "document", category: "Sales", author: "Charlton", description: "FoodDocs, SafetyChain, Aptean comparison" },
    { title: "FDA 21 CFR Part 11 Compliance", type: "document", category: "Engineering", author: "Suresh", description: "E-signatures, audit trails, data integrity" },
    { title: "Email Sequences", type: "template", category: "Marketing", author: "Charlton", description: "Nurture and follow-up email templates" },
    { title: "New Hire Onboarding", type: "playbook", category: "Operations", author: "Aisha", description: "First week checklist for new team members" },
  ];
  await prisma.kBDocument.createMany({ data: kbData });
  console.log(`  Created ${kbData.length} KB documents`);

  // --- ACTIVITIES ---
  const activitiesData = [
    { who: "David", action: "moved", target: "Mountain Bake Co", detail: "to Closed Won", type: "stage_change", leadId: leads["Mountain Bake Co"].id },
    { who: "Charlton", action: "sent proposal to", target: "Pacific Grain Co", detail: "$108K", type: "email", leadId: leads["Pacific Grain Co"].id },
    { who: "Aisha", action: "added lead", target: "Coastal Seafood Inc", detail: "LinkedIn", type: "general", leadId: leads["Coastal Seafood Inc"].id },
    { who: "Suresh", action: "deployed", target: "CAT-MES v2.0.8", detail: "hotfix", type: "general" },
    { who: "Igor", action: "completed", target: "Machine layout drag-drop", detail: "Sprint", type: "general", projectId: projects["CAT-MES v2.1 Sprint"].id },
    { who: "Charlton", action: "updated", target: "Prospective Customer Intake Form", detail: "added certification fields", type: "general" },
    { who: "David", action: "scheduled demo", target: "SunFresh Foods", detail: "Mar 28", type: "meeting", leadId: leads["SunFresh Foods"].id },
    { who: "Artem", action: "created project", target: "SOC 2 Type II Prep", detail: "target: Jun 30", type: "general", projectId: projects["SOC 2 Type II Prep"].id },
  ];
  await prisma.activity.createMany({ data: activitiesData });
  console.log(`  Created ${activitiesData.length} activities`);

  // --- MESSAGES ---
  const messagesData = [
    { fromUser: "Aisha", toUser: "Suresh", text: "Suresh - can you review the API architecture doc before the SOC 2 kickoff?", read: true, createdAt: new Date("2026-03-25T14:30:00") },
    { fromUser: "Suresh", toUser: "Aisha", text: "Will do. I'll have comments by tomorrow morning IST.", read: true, createdAt: new Date("2026-03-25T15:15:00") },
    { fromUser: "David", toUser: "Charlton", text: "Pacific Grain needs the revised pricing by Thursday. Can you review?", read: false, contextType: "lead", contextId: leads["Pacific Grain Co"].id, contextName: "Pacific Grain Co", createdAt: new Date("2026-03-24T16:00:00") },
    { fromUser: "Charlton", toUser: "David", text: "On it. Will send you the updated proposal tonight.", read: true, contextType: "lead", contextId: leads["Pacific Grain Co"].id, contextName: "Pacific Grain Co", createdAt: new Date("2026-03-24T17:30:00") },
    { fromUser: "Aisha", toUser: "Artem", text: "SOC 2 gap assessment — do we have a vendor list ready?", read: false, contextType: "project", contextId: projects["SOC 2 Type II Prep"].id, contextName: "SOC 2 Type II Prep", createdAt: new Date("2026-03-23T11:00:00") },
  ];
  await prisma.message.createMany({ data: messagesData });
  console.log(`  Created ${messagesData.length} messages`);

  // --- CALENDAR EVENTS ---
  const calendarData = [
    { title: "Demo call with SunFresh Foods", date: new Date("2026-03-28"), time: "10:00 AM", type: "meeting", description: "Full platform demo for Maria Chen", relatedType: "lead", relatedId: leads["SunFresh Foods"].id, relatedName: "SunFresh Foods", assignee: "David" },
    { title: "Send revised pricing to Pacific Grain", date: new Date("2026-03-27"), time: "2:00 PM", type: "task", description: "Multi-facility enterprise pricing proposal", relatedType: "lead", relatedId: leads["Pacific Grain Co"].id, relatedName: "Pacific Grain Co", assignee: "Charlton" },
    { title: "Mountain Bake onboarding kickoff", date: new Date("2026-04-01"), time: "9:00 AM", type: "meeting", description: "Kickoff call with new customer", relatedType: "project", relatedId: projects["Mountain Bake Onboarding"].id, relatedName: "Mountain Bake Onboarding", assignee: "David" },
    { title: "Follow up with Coastal Seafood", date: new Date("2026-03-29"), type: "reminder", description: "Send intro email and case study", relatedType: "lead", relatedId: leads["Coastal Seafood Inc"].id, relatedName: "Coastal Seafood Inc", assignee: "Aisha" },
    { title: "Green Valley contract deadline", date: new Date("2026-04-05"), type: "deadline", description: "Target close date for full platform deal", relatedType: "lead", relatedId: leads["Green Valley Organics"].id, relatedName: "Green Valley Organics", assignee: "Charlton" },
    { title: "CAT-MES v2.1 release", date: new Date("2026-04-10"), type: "deadline", description: "Sprint completion target", relatedType: "project", relatedId: projects["CAT-MES v2.1 Sprint"].id, relatedName: "CAT-MES v2.1 Sprint", assignee: "Suresh" },
    { title: "Weekly team standup", date: new Date("2026-03-28"), time: "11:00 AM", type: "meeting", description: "Weekly all-hands sync", relatedType: "general", relatedName: "Team", assignee: "Aisha" },
    { title: "Call Apex Protein", date: new Date("2026-03-30"), time: "3:00 PM", type: "call", description: "Discovery call - 4 facilities, enterprise opportunity", relatedType: "lead", relatedId: leads["Apex Protein Inc"].id, relatedName: "Apex Protein Inc", assignee: "Aisha" },
    { title: "Website redesign review", date: new Date("2026-04-02"), time: "2:00 PM", type: "meeting", relatedType: "project", relatedId: projects["Website Redesign"].id, relatedName: "Website Redesign", assignee: "Charlton" },
    { title: "SOC 2 kickoff meeting", date: new Date("2026-04-08"), time: "10:00 AM", type: "meeting", description: "Initial gap assessment review", relatedType: "project", relatedId: projects["SOC 2 Type II Prep"].id, relatedName: "SOC 2 Type II Prep", assignee: "Artem" },
  ];
  await prisma.calendarEvent.createMany({ data: calendarData });
  console.log(`  Created ${calendarData.length} calendar events`);

  // --- DEMO REQUESTS ---
  const demoData = [
    { fullName: "Jennifer Walsh", email: "jwalsh@sunrisebakery.com", position: "Director of Quality Assurance", companyName: "Sunrise Bakery Group", businessType: "Manufacturing", industry: "Bakery", preferredTime: "Morning (9am-12pm)", preferredDate: new Date("2026-04-02"), selectedModules: [{ module: "CAT-I.AI", subModules: ["Document Control", "HACCP Plan Builder", "Audit Management"] }, { module: "CAT-QT", subModules: ["Non-Conformance Reports", "CAPA Management"] }], demoFocus: "We need to modernize our HACCP documentation and improve our audit preparation process.", status: "new", submittedAt: new Date("2026-03-27T09:15:00Z") },
    { fullName: "Michael Torres", email: "mtorres@coastalmeats.com", position: "Plant Manager", companyName: "Coastal Meats Processing", businessType: "Manufacturing", industry: "Meat & Poultry", preferredTime: "Afternoon (1pm-5pm)", preferredDate: new Date("2026-04-03"), selectedModules: [{ module: "CAT-MES", subModules: ["Production Scheduling", "Batch Tracking & Traceability", "OEE & Downtime Monitoring"] }, { module: "CAT-SCAN", subModules: ["Master Sanitation Scheduling", "Pre-Op & Post-Op Inspections"] }], demoFocus: "Looking to improve production visibility and sanitation tracking.", status: "contacted", assignedTo: "David", submittedAt: new Date("2026-03-26T14:30:00Z") },
    { fullName: "Amanda Richardson", email: "arichardson@pureorganic.com", position: "VP Operations", companyName: "Pure Organic Foods", businessType: "Manufacturing", industry: "Produce", preferredTime: "Morning (9am-12pm)", preferredDate: new Date("2026-03-29"), selectedModules: [{ module: "CAT-I.AI", subModules: ["Document Control", "Training & Certification", "Food Safety Culture"] }, { module: "CAT-iLOG", subModules: ["Product Specifications", "Allergen Management", "Label Generation & Approval"] }], demoFocus: "Expanding to 3 facilities and need a scalable compliance platform.", status: "scheduled", assignedTo: "Charlton", submittedAt: new Date("2026-03-25T11:00:00Z") },
    { fullName: "David Kim", email: "dkim@premiumsnacks.com", position: "Quality Manager", companyName: "Premium Snacks Inc", businessType: "Manufacturing", industry: "Snack Foods", preferredTime: "Afternoon (1pm-5pm)", preferredDate: new Date("2026-04-05"), selectedModules: [{ module: "CAT-I.AI", subModules: ["Document Control", "Audit Management", "AI-Powered Generation"] }], demoFocus: "Preparing for SQF certification. Need help with documentation and gap analysis.", status: "new", submittedAt: new Date("2026-03-27T16:45:00Z") },
    { fullName: "Rachel Foster", email: "rfoster@bayareabev.com", position: "Food Safety Director", companyName: "Bay Area Beverages", businessType: "Manufacturing", industry: "Beverage", preferredTime: "Morning (9am-12pm)", preferredDate: new Date("2026-03-28"), selectedModules: [{ module: "CAT-I.AI", subModules: ["Document Control", "Training & Certification", "HACCP Plan Builder"] }, { module: "CAT-MES", subModules: ["Batch Tracking & Traceability", "Inventory Transactions"] }, { module: "CAT-SCAN", subModules: ["Chemical & SDS Management", "Environmental Monitoring"] }], demoFocus: "Full platform evaluation. We have 2 production facilities and are opening a third.", status: "converted", assignedTo: "David", convertedToLeadId: leads["Apex Protein Inc"].id, submittedAt: new Date("2026-03-20T10:00:00Z") },
  ];
  await prisma.demoRequest.createMany({ data: demoData });
  console.log(`  Created ${demoData.length} demo requests`);

  // --- CONTENT ---
  const contentData = [
    { title: "CAT-MES v2.1 Feature Announcement", description: "Announce new AI scheduling and sanitation checklist features", stage: "Under Review", type: "Blog Post", platforms: ["Website Blog", "LinkedIn", "Email"], owner: "Artem", createdBy: "Yael", scheduledDate: new Date("2026-04-01"), blockers: [], tags: ["product-update", "CAT-MES"], attachments: [], linkedLeads: [], body: "" },
    { title: "Food Safety Compliance Checklist Infographic", description: "Visual checklist for SQF/GFSI compliance steps", stage: "In Development", type: "Social Image", platforms: ["Instagram", "LinkedIn"], owner: "Yael", createdBy: "Yael", blockers: ["Need final copy approval"], tags: ["food-safety", "infographic"], attachments: [], linkedLeads: [], body: "" },
    { title: "Customer Spotlight: Mountain Bake Co", description: "Case study on Mountain Bake onboarding and ROI", stage: "Ideas", type: "Case Study", platforms: ["Website Blog", "Email", "LinkedIn"], owner: "Aisha", createdBy: "Artem", blockers: ["Waiting for customer approval to publish"], tags: ["case-study", "customer"], attachments: [], linkedLeads: [], body: "", notes: "Tom Hendricks agreed in principle, need written OK" },
    { title: "March Newsletter — Platform Updates", description: "Monthly newsletter covering new features and industry news", stage: "Approved", type: "Newsletter", platforms: ["Email"], owner: "Aisha", createdBy: "Yael", scheduledDate: new Date("2026-03-28"), blockers: [], tags: ["newsletter", "monthly"], attachments: [], linkedLeads: [], body: "" },
    { title: "Why Spreadsheets Are Killing Your Food Safety Program", description: "Thought leadership piece on moving from manual to digital compliance", stage: "Ideas", type: "Blog Post", platforms: ["Website Blog", "LinkedIn"], owner: "Yael", createdBy: "Aisha", blockers: [], tags: ["thought-leadership", "food-safety"], attachments: [], linkedLeads: [], body: "" },
    { title: "CAT-ALOG Label Compliance Demo Video", description: "90-second product demo for social", stage: "In Development", type: "Social Video", platforms: ["LinkedIn", "YouTube", "Instagram"], owner: "Igor", createdBy: "Yael", blockers: ["Igor needs screen recording software"], tags: ["product-demo", "CAT-ALOG", "video"], attachments: [], linkedLeads: [], body: "" },
  ];
  await prisma.contentPiece.createMany({ data: contentData });
  console.log(`  Created ${contentData.length} content pieces`);

  // --- EMAIL CAMPAIGNS ---
  const campaignData = [
    { name: "March Newsletter Blast", fromName: "Aisha", fromEmail: "aisha@cat-i.ai", subject: "CAT-I.AI March Update: New MES Features & More", status: "Scheduled", audience: { type: "all_leads" }, scheduledDate: new Date("2026-03-28"), recipients: 8, bodyHtml: "<p>Hello,</p><p>We are excited to share our March platform updates with you!</p>", createdBy: "Yael" },
    { name: "MES Feature Launch — Targeted", fromName: "David", fromEmail: "david@cat-i.ai", subject: "New AI Scheduling in CAT-MES — See It in Action", status: "Draft", audience: { type: "by_module", modules: ["CAT-MES", "Full Platform"] }, recipients: 4, bodyHtml: "", createdBy: "Yael" },
  ];
  await prisma.emailCampaign.createMany({ data: campaignData });
  console.log(`  Created ${campaignData.length} email campaigns`);

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
