import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasPermission, type Permission, type UserRole } from "./types";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requirePermission(permission: Permission) {
  const { error, session } = await requireAuth();
  if (error) return { error, session: null };

  const role = (session!.user as any).role as UserRole;
  if (!hasPermission(role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session: session! };
}
