"use server";

import { prisma } from "./prisma";

export async function logActivity(params: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
}) {
  await prisma.activityLog.create({
    data: {
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      detail: params.detail || null,
    },
  });
}

export async function getRecentActivity(limit = 20) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getEntityActivity(entityType: string, entityId: string, limit = 20) {
  return prisma.activityLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
