import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.solicitation.count({
    where: { status: { in: ["NEW", "DRAFT_READY", "NEEDS_DOC"] } },
  });

  return NextResponse.json({ count });
}
