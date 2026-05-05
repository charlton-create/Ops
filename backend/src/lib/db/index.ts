import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient>;
  migrationsRun: boolean;
};

function createPool() {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("rds.amazonaws.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

function createPrismaClient() {
  const pool = createPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Auto-migrate: create missing tables on startup (idempotent)
const MIGRATIONS: { table: string; sql: string }[] = [
  {
    table: "project_templates",
    sql: `CREATE TABLE IF NOT EXISTS "project_templates" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'customer',
      "tasks" JSONB NOT NULL DEFAULT '[]',
      "builtIn" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id")
    );`,
  },
  {
    table: "campaign_recipients",
    sql: `CREATE TABLE IF NOT EXISTS "campaign_recipients" (
      "id" SERIAL NOT NULL,
      "campaignId" INTEGER NOT NULL,
      "leadId" INTEGER,
      "email" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'sent',
      "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "openedAt" TIMESTAMP(3),
      "error" TEXT,
      "remindedAt" TIMESTAMP(3),
      CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE
    );`,
  },
];

async function runStartupMigrations() {
  if (globalForPrisma.migrationsRun) return;
  globalForPrisma.migrationsRun = true;

  const pool = createPool();
  try {
    for (const m of MIGRATIONS) {
      const check = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [m.table]
      );
      if (!check.rows[0].exists) {
        await pool.query(m.sql);
        console.log(`[db] Auto-created table: ${m.table}`);
      }
    }
  } catch (err) {
    console.error("[db] Startup migration failed:", err);
  } finally {
    await pool.end();
  }
}

runStartupMigrations();
