"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { sendSms, isTwilioConfigured, normalizePhone } from "@/lib/twilio";
import { logActivity } from "@/lib/activity-log";

export async function getActiveSubcontractors(params?: {
  tradeSlug?: string;
  citySlug?: string;
}) {
  await requireAdmin();
  return prisma.subcontractor.findMany({
    where: {
      status: "ACTIVE",
      smsOptOut: false,
      phone: { not: "" },
      ...(params?.tradeSlug ? { trades: { some: { slug: params.tradeSlug } } } : {}),
      ...(params?.citySlug ? { serviceAreas: { some: { slug: params.citySlug } } } : {}),
    },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      phone: true,
    },
    orderBy: { companyName: "asc" },
  });
}

export async function getJobs() {
  await requireAdmin();
  return prisma.job.findMany({
    where: {
      status: { in: ["OFFERED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS"] },
    },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSmsHistory() {
  await requireAdmin();
  return prisma.smsBlast.findMany({
    include: {
      sentBy: { select: { name: true } },
      job: { select: { id: true, title: true } },
      recipients: {
        select: { id: true, phone: true, status: true, subcontractor: { select: { companyName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function sendSmsBlast(params: {
  message: string;
  jobId?: string;
  subcontractorIds: string[];
}) {
  const admin = await requireAdmin();

  const { message, jobId, subcontractorIds } = params;

  if (!message.trim()) throw new Error("Message is required.");
  if (subcontractorIds.length === 0) throw new Error("No recipients selected.");

  // Fetch subs with phone numbers
  const subs = await prisma.subcontractor.findMany({
    where: { id: { in: subcontractorIds }, status: "ACTIVE" },
    select: { id: true, phone: true },
  });

  if (subs.length === 0) throw new Error("No valid recipients found.");

  // Construct the full message
  let fullMessage = message.trim();

  if (jobId) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fullMessage += `\n\nView job: ${baseUrl}/portal`;
  }

  // Add opt-out line
  fullMessage += "\n\nReply STOP to opt out.";

  // Normalize phone numbers
  const normalizedSubs = await Promise.all(
    subs.map(async (sub) => ({
      ...sub,
      normalizedPhone: await normalizePhone(sub.phone),
    }))
  );

  // Create the blast record with normalized phone numbers
  const blast = await prisma.smsBlast.create({
    data: {
      message: fullMessage,
      jobId: jobId || null,
      sentByUserId: admin.id,
      recipients: {
        create: normalizedSubs.map((sub) => ({
          subcontractorId: sub.id,
          phone: sub.normalizedPhone,
          status: "queued",
        })),
      },
    },
    include: { recipients: true },
  });

  // Send via centralized Twilio lib
  if (await isTwilioConfigured()) {
    for (const recipient of blast.recipients) {
      const result = await sendSms(recipient.phone, fullMessage);
      await prisma.smsRecipient.update({
        where: { id: recipient.id },
        data: {
          twilioSid: result.sid || null,
          status: result.success ? "sent" : "failed",
        },
      });
    }
  } else {
    console.log("Twilio not configured. Blast created but not sent.");
    await prisma.smsRecipient.updateMany({
      where: { blastId: blast.id },
      data: { status: "not_configured" },
    });
  }

  await logActivity({ userId: admin.id, action: "sms_blast_sent", entityType: "SmsBlast", entityId: blast.id, detail: `${blast.recipients.length} recipient(s)` });

  revalidatePath("/admin/sms");
}

export async function getServices() {
  await requireAdmin();
  return prisma.service.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true },
  });
}

export async function getCities() {
  await requireAdmin();
  return prisma.city.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, region: true },
  });
}
