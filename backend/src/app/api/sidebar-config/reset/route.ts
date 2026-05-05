import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { DEFAULT_SIDEBAR_LAYOUT } from "@/lib/sidebar/defaults";
import { NextResponse } from "next/server";

export async function POST() {
  const { error, session } = await requirePermission("admin.access");
  if (error) return error;

  let row = await prisma.sidebarConfig.findFirst();
  if (!row) {
    row = await prisma.sidebarConfig.create({ data: { layout: DEFAULT_SIDEBAR_LAYOUT as any } });
  } else {
    row = await prisma.sidebarConfig.update({
      where: { id: row.id },
      data: { layout: DEFAULT_SIDEBAR_LAYOUT as any },
    });
  }

  await prisma.activity.create({
    data: {
      who: session?.user.name || "System",
      action: "reset sidebar layout to defaults",
      target: "Operations Sidebar",
      type: "admin",
    },
  });

  return NextResponse.json({ layout: row.layout, updatedAt: row.updatedAt });
}
