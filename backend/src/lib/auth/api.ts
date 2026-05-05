import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { hasPermission, type Permission, type UserRole } from "./types";
import { prisma } from "@/lib/db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function requireAuth() {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);

    const session = {
      user: {
        id: payload.sub,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
        teamMemberId: payload.teamMemberId as number | null,
        color: payload.color as string,
      },
    };

    return { error: null, session };
  } catch {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }), session: null };
  }
}

export async function requirePermission(permission: Permission) {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };

  // Check user-specific permissions from DB first (supports admin overrides)
  const userId = parseInt(session!.user.id as string);
  if (!isNaN(userId)) {
    const dbUser = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { permissions: true, role: true },
    });
    if (dbUser && dbUser.permissions.length > 0) {
      // User has custom permissions set — use those
      if (!dbUser.permissions.includes(permission)) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
      }
      return { error: null, session: session! };
    }
  }

  // Fall back to role-based permissions
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session: session! };
}
