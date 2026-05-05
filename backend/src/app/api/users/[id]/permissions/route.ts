import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

// GET — return the user's effective permissions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("admin.access");
  if (error) return error;

  const { id } = await params;
  const user = await prisma.appUser.findUnique({
    where: { id: parseInt(id) },
    select: { permissions: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ permissions: user.permissions, role: user.role });
}

// PUT — replace the user's custom permissions
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("admin.access");
  if (error) return error;

  const { id } = await params;
  const { permissions } = await request.json();

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
  }

  const user = await prisma.appUser.update({
    where: { id: parseInt(id) },
    data: { permissions },
    select: { id: true, name: true, permissions: true },
  });

  return NextResponse.json(user);
}
