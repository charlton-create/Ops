import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/api";
import { validatePassword } from "@/lib/auth/password-policy";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("admin.access");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // If password is being changed, validate and hash it
  const data: any = { ...body };
  if (data.password) {
    const pwCheck = validatePassword(data.password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  // Don't allow directly setting passwordHash from client
  delete data.color;
  delete data.teamMemberId;

  const user = await prisma.appUser.update({
    where: { id: parseInt(id) },
    data,
    include: { teamMember: true },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    teamMemberId: user.teamMemberId,
    color: user.teamMember?.color ?? "#6B7280",
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requirePermission("admin.access");
  if (error) return error;

  const { id } = await params;
  const userId = parseInt(id);

  // Prevent deleting yourself
  if (Number(session?.user?.id) === userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role === "admin") {
    return NextResponse.json({ error: "Cannot delete an admin user" }, { status: 403 });
  }

  // Delete the AppUser only — the TeamMember record stays so historical
  // lead/customer/project ownership references remain valid
  await prisma.appUser.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
