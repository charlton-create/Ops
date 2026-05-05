// One-shot, idempotent script to ensure the "CS Support Policy" KB document exists.
// Safe to run repeatedly — updates content if already present, creates it if missing.
// Used both by the main seed (`db:seed`) and on its own (`db:seed-cs-policy`)
// so existing databases pick up the policy without a full re-seed.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { CS_POLICY_CONTENT } from "./cs-policy-content.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.kBDocument.findFirst({ where: { title: "CS Support Policy" } });

  const data = {
    title: "CS Support Policy",
    type: "document",
    category: "CS Policy",
    author: "Aisha",
    description: "Official customer support policy: tier definitions, response protocols, escalation rules, and SLA targets.",
    content: CS_POLICY_CONTENT,
  };

  if (existing) {
    await prisma.kBDocument.update({ where: { id: existing.id }, data });
    console.log(`Updated CS Support Policy (id=${existing.id}) in category "CS Policy".`);
  } else {
    const created = await prisma.kBDocument.create({ data });
    console.log(`Created CS Support Policy (id=${created.id}) in category "CS Policy".`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
