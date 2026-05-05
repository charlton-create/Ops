import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { DEFAULT_SIDEBAR_LAYOUT } from "@/lib/sidebar/defaults";
import { NextRequest, NextResponse } from "next/server";

async function getOrInit() {
  let row = await prisma.sidebarConfig.findFirst();
  if (!row) {
    row = await prisma.sidebarConfig.create({
      data: { layout: DEFAULT_SIDEBAR_LAYOUT as any },
    });
  }
  return row;
}

export async function GET() {
  // Any authenticated user can read the layout (the whole UI depends on it)
  const { error } = await requireAuth();
  if (error) return error;
  const row = await getOrInit();
  return NextResponse.json({ layout: row.layout, updatedAt: row.updatedAt });
}

export async function PATCH(request: NextRequest) {
  const { error, session } = await requirePermission("admin.access");
  if (error) return error;

  try {
    const body = await request.json();
    if (!Array.isArray(body.layout)) {
      return NextResponse.json({ error: "layout must be an array of items" }, { status: 400 });
    }

    const existing = await getOrInit();
    const updatedById = session?.user.id ? parseInt(session.user.id as string) : null;
    const updated = await prisma.sidebarConfig.update({
      where: { id: existing.id },
      data: {
        layout: body.layout,
        updatedById: isNaN(updatedById as number) ? null : updatedById,
      },
    });
    await prisma.activity.create({
      data: {
        who: session?.user.name || "System",
        action: "updated sidebar layout",
        target: "Operations Sidebar",
        type: "admin",
      },
    });
    return NextResponse.json({ layout: updated.layout, updatedAt: updated.updatedAt });
  } catch (err: any) {
    console.error("PATCH /api/sidebar-config error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
