import { requirePermission } from "@/lib/auth/api";
import { zohoPing } from "@/lib/zoho/client";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("admin.access");
  if (error) return error;

  const result = await zohoPing();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
