import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/api";
import { validatePassword } from "@/lib/auth/password-policy";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const users = await prisma.appUser.findMany({
    include: { teamMember: true },
    orderBy: { id: "asc" },
  });

  // Return users without password hash
  const sanitized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    status: u.status,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    teamMemberId: u.teamMemberId,
    color: u.teamMember?.color ?? "#6B7280",
  }));

  return NextResponse.json(sanitized);
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("admin.access");
  if (error) return error;

  const body = await request.json();
  const { name, email, role, department, status, password } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  // Check if email already exists
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const pw = password || "catops2026";
  const pwCheck = validatePassword(pw);
  if (!pwCheck.valid) {
    return NextResponse.json({ error: pwCheck.error }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(pw, 10);

  // Find or create team member
  let teamMember = await prisma.teamMember.findFirst({ where: { email } });
  if (!teamMember) {
    teamMember = await prisma.teamMember.create({
      data: { name, email, role: department ?? "Team Member", color: "#6B7280", status: "offline" },
    });
  }

  const user = await prisma.appUser.create({
    data: {
      name,
      email,
      role: role ?? "user",
      department: department ?? "",
      status: status ?? "active",
      passwordHash,
      teamMemberId: teamMember.id,
      permissions: [],
    },
    include: { teamMember: true },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    lastLogin: null,
    teamMemberId: user.teamMemberId,
    color: user.teamMember?.color ?? "#6B7280",
  }, { status: 201 });
}
