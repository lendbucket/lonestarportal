import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }
  return session.user;
}

export async function requireSubcontractor() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUBCONTRACTOR") {
    throw new Error("Unauthorized.");
  }

  const sub = await prisma.subcontractor.findUnique({
    where: { userId: session.user.id },
  });

  if (!sub) {
    throw new Error("No subcontractor profile linked to this account.");
  }

  return { user: session.user, subcontractorId: sub.id };
}
