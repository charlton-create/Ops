// One-shot migration: copy data from Project + ProjectTask into HubProject + HubTask.
// Idempotent: skips projects whose name+createdAt already exist in hub_projects.
// Run with: npm run db:migrate-hub
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STATUS_MAP: Record<string, string> = {
  "Not Started": "planning",
  "In Progress": "in_progress",
  "Pending": "on_hold",
  "Completed": "completed",
};

async function main() {
  const oldProjects = await prisma.project.findMany({
    include: { owner: true, tasks: { orderBy: { sortOrder: "asc" } } },
  });
  console.log(`Found ${oldProjects.length} old Project rows.`);

  let migrated = 0;
  let skipped = 0;

  for (const p of oldProjects) {
    const exists = await prisma.hubProject.findFirst({
      where: { name: p.name, createdAt: p.createdAt },
    });
    if (exists) { skipped++; continue; }

    const ownerName = p.owner?.name || "Unassigned";

    const hub = await prisma.hubProject.create({
      data: {
        name: p.name,
        description: null,
        type: p.type ?? "general",
        status: STATUS_MAP[p.status] ?? "planning",
        currentPhase: "M",
        ownerId: p.ownerId,
        ownerLabel: null,
        startDate: null,
        targetDate: p.due,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        tasks: {
          create: p.tasks.map((t, idx) => ({
            title: t.text,
            description: null,
            phase: "M",
            status: t.done ? "done" : "todo",
            responsible: ownerName,
            accountable: ownerName,
            informed: null,
            startDate: null,
            dueDate: t.dueDate,
            sortOrder: t.sortOrder ?? idx,
          })),
        },
      },
    });
    console.log(`  Migrated project #${p.id} "${p.name}" -> hub #${hub.id} (${p.tasks.length} tasks)`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, skipped (already exists): ${skipped}.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
