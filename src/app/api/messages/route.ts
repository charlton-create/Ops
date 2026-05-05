import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const between = request.nextUrl.searchParams.get("between");
  if (between) {
    const [user1, user2] = between.split(",");
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUser: user1, toUser: user2 },
          { fromUser: user2, toUser: user1 },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }

  const messages = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const message = await prisma.message.create({ data: body });
  return NextResponse.json(message, { status: 201 });
}
