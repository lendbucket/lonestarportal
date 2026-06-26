"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncGmail } from "@/lib/sync-gmail";

export async function getGmailConnection() {
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
  const conn = await prisma.gmailConnection.findFirst();
  if (conn) {
    await prisma.gmailConnection.delete({ where: { id: conn.id } });
  }
  revalidatePath("/admin/settings/integrations");
}

export async function triggerSync() {
  const result = await syncGmail();
  revalidatePath("/admin/settings/integrations");
  revalidatePath("/admin/solicitations");
  return result;
}
