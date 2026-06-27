"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function getActiveSubcontractors(params?: {
  tradeSlug?: string;
  citySlug?: string;
}) {
  await requireAdmin();
  return prisma.subcontractor.findMany({
    where: {
      status: "ACTIVE",
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

  // Create the blast record
  const blast = await prisma.smsBlast.create({
    data: {
      message: fullMessage,
      jobId: jobId || null,
      sentByUserId: admin.id,
      recipients: {
        create: subs.map((sub) => ({
          subcontractorId: sub.id,
          phone: sub.phone,
          status: "queued",
        })),
      },
    },
    include: { recipients: true },
  });

  // Send via Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    for (const recipient of blast.recipients) {
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: recipient.phone,
              From: fromNumber,
              Body: fullMessage,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          await prisma.smsRecipient.update({
            where: { id: recipient.id },
            data: { twilioSid: data.sid, status: "sent" },
          });
        } else {
          await prisma.smsRecipient.update({
            where: { id: recipient.id },
            data: { status: "failed" },
          });
        }
      } catch {
        await prisma.smsRecipient.update({
          where: { id: recipient.id },
          data: { status: "failed" },
        });
      }
    }
  } else {
    console.log("Twilio not configured. Blast created but not sent.");
    // Mark all as unsent
    await prisma.smsRecipient.updateMany({
      where: { blastId: blast.id },
      data: { status: "not_configured" },
    });
  }

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
