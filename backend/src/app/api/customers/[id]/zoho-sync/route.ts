import { requirePermission } from "@/lib/auth/api";
import { activateZohoBilling } from "@/lib/zoho/billing";
import { NextRequest, NextResponse } from "next/server";

// Manually trigger Zoho Books contact + invoice creation for an existing customer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("customers.billing");
  if (error) return error;

  const { id } = await params;
  const customerId = parseInt(id);

  try {
    await activateZohoBilling(customerId, true);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
