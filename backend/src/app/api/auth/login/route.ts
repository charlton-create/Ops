import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.appUser.findUnique({
    where: { email },
    include: { teamMember: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Update lastLogin + auto-activate pending users on first login
  await prisma.appUser.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      ...(user.status === "pending" ? { status: "active" } : {}),
    },
  });

  // Create JWT token
  const token = await new SignJWT({
    sub: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    teamMemberId: user.teamMemberId,
    color: user.teamMember?.color ?? "#6B7280",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return NextResponse.json({
    token,
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      teamMemberId: user.teamMemberId,
      color: user.teamMember?.color ?? "#6B7280",
    },
  });
}

// Verify token endpoint
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);
    return NextResponse.json({
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        teamMemberId: payload.teamMemberId,
        color: payload.color,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
