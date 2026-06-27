"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { syncGmail } from "@/lib/sync-gmail";

export async function getGmailConnection() {
  await requireAdmin();
  return prisma.gmailConnection.findFirst({
    select: {
      id: true,
      emailAddress: true,
      status: true,
      lastSyncedAt: true,
      lastHistoryId: true,
    },
  });
}

export async function disconnectGmail() {
  await requireAdmin();
  const conn = await prisma.gmailConnection.findFirst();
  if (conn) {
    await prisma.gmailConnection.delete({ where: { id: conn.id } });
  }
  revalidatePath("/admin/settings/integrations");
}

export async function triggerSync() {
  await requireAdmin();
  const result = await syncGmail();
  revalidatePath("/admin/settings/integrations");
  revalidatePath("/admin/solicitations");
  return result;
}
