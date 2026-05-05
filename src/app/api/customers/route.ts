import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const customers = await prisma.customer.findMany({
    include: { owner: true, invoices: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
}
