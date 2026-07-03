"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const PAGE_SIZE = 25;

export async function getSubcontractors(params: {
  search?: string;
  status?: string;
  tradeSlug?: string;
  citySlug?: string;
  page?: number;
}) {
  await requireAdmin();
  const { search, status, tradeSlug, citySlug } = params;
  const page = Math.max(1, params.page || 1);

  const where = {
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { contactName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    ...(status && status !== "ALL" ? { status: status as "PENDING" | "ACTIVE" | "INACTIVE" } : {}),
    ...(tradeSlug
      ? { trades: { some: { slug: tradeSlug } } }
      : {}),
    ...(citySlug
      ? { serviceAreas: { some: { slug: citySlug } } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.subcontractor.findMany({
      where,
      include: {
        trades: { select: { id: true, name: true, slug: true } },
        serviceAreas: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subcontractor.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getSubcontractor(id: string) {
  await requireAdmin();
  return prisma.subcontractor.findUnique({
    where: { id },
    include: {
      trades: { select: { id: true, name: true, slug: true } },
      serviceAreas: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, email: true } },
    },
  });
}

export async function createSubcontractor(formData: FormData) {
  await requireAdmin();
  const companyName = formData.get("companyName") as string;
  const contactName = formData.get("contactName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const crewSize = formData.get("crewSize") as string;
  const yearsInTrade = formData.get("yearsInTrade") as string;
  const licenseInfo = formData.get("licenseInfo") as string;
  const insuranceStatus = formData.get("insuranceStatus") as string;
  const notes = formData.get("notes") as string;
  const tradeIds = formData.getAll("tradeIds") as string[];
  const cityIds = formData.getAll("cityIds") as string[];

  if (!companyName || !contactName || !phone || !email) {
    throw new Error("Required fields missing.");
  }

  const sub = await prisma.subcontractor.create({
    data: {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      crewSize: crewSize ? parseInt(crewSize) : null,
      yearsInTrade: yearsInTrade ? parseInt(yearsInTrade) : null,
      licenseInfo: licenseInfo?.trim() || null,
      insuranceStatus: insuranceStatus?.trim() || null,
      notes: notes?.trim() || null,
      status: "PENDING",
      trades: { connect: tradeIds.map((id) => ({ id })) },
      serviceAreas: { connect: cityIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/admin/subcontractors");
  redirect(`/admin/subcontractors/${sub.id}`);
}

export async function updateSubcontractor(id: string, formData: FormData) {
  await requireAdmin();
  const companyName = formData.get("companyName") as string;
  const contactName = formData.get("contactName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const crewSize = formData.get("crewSize") as string;
  const yearsInTrade = formData.get("yearsInTrade") as string;
  const licenseInfo = formData.get("licenseInfo") as string;
  const insuranceStatus = formData.get("insuranceStatus") as string;
  const notes = formData.get("notes") as string;
  const tradeIds = formData.getAll("tradeIds") as string[];
  const cityIds = formData.getAll("cityIds") as string[];

  if (!companyName || !contactName || !phone || !email) {
    throw new Error("Required fields missing.");
  }

  await prisma.subcontractor.update({
    where: { id },
    data: {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      crewSize: crewSize ? parseInt(crewSize) : null,
      yearsInTrade: yearsInTrade ? parseInt(yearsInTrade) : null,
      licenseInfo: licenseInfo?.trim() || null,
      insuranceStatus: insuranceStatus?.trim() || null,
      notes: notes?.trim() || null,
      trades: { set: tradeIds.map((id) => ({ id })) },
      serviceAreas: { set: cityIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/admin/subcontractors");
  revalidatePath(`/admin/subcontractors/${id}`);
  redirect(`/admin/subcontractors/${id}`);
}

export async function activateSubcontractor(id: string) {
  await requireAdmin();
  const sub = await prisma.subcontractor.findUnique({ where: { id } });
  if (!sub) throw new Error("Subcontractor not found.");

  // Generate a secure token for the set-password link
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  // Create user account
  const tempHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
  const user = await prisma.user.create({
    data: {
      email: sub.email.toLowerCase(),
      passwordHash: tempHash,
      name: sub.contactName,
      role: "SUBCONTRACTOR",
    },
  });

  // Store the token in verification tokens
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: tokenExpiry,
    },
  });

  // Link user to subcontractor and set ACTIVE
  await prisma.subcontractor.update({
    where: { id },
    data: { userId: user.id, status: "ACTIVE" },
  });

  // Send invite email via Resend
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const setPasswordUrl = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.LEAD_FROM_EMAIL || "portal@lonestarcontractinggroup.com",
          to: sub.email,
          subject: "Welcome to the Lone Star Portal - Set Your Password",
          html: `
            <div style="font-family: sans-serif; max-width: 480px;">
              <h2 style="color: #1E2A38;">Welcome to Lone Star Portal</h2>
              <p>Hi ${sub.contactName},</p>
              <p>Your subcontractor account has been activated. Click the link below to set your password and access the portal.</p>
              <p><a href="${setPasswordUrl}" style="display: inline-block; background: #A8451C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Set Your Password</a></p>
              <p style="color: #6B6660; font-size: 14px;">This link expires in 72 hours. If you did not expect this email, you can safely ignore it.</p>
              <p style="color: #6B6660; font-size: 14px;">Lone Star Contracting Group</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        console.error("Failed to send invite email:", await res.text());
      }
    } catch (err) {
      console.error("Error sending invite email:", err);
    }
  } else {
    console.log("RESEND_API_KEY not set. Invite URL:", setPasswordUrl);
  }

  revalidatePath("/admin/subcontractors");
  revalidatePath(`/admin/subcontractors/${id}`);
}

export async function deactivateSubcontractor(id: string) {
  await requireAdmin();
  await prisma.subcontractor.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  revalidatePath("/admin/subcontractors");
  revalidatePath(`/admin/subcontractors/${id}`);
}

export async function toggleSmsOptOut(id: string) {
  await requireAdmin();
  const sub = await prisma.subcontractor.findUnique({
    where: { id },
    select: { smsOptOut: true },
  });
  if (!sub) throw new Error("Subcontractor not found.");

  await prisma.subcontractor.update({
    where: { id },
    data: { smsOptOut: !sub.smsOptOut },
  });

  revalidatePath(`/admin/subcontractors/${id}`);
}

export async function getServicesGrouped() {
  await requireAdmin();
  return prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: { orderBy: { name: "asc" } },
    },
  });
}

export async function getCities() {
  await requireAdmin();
  return prisma.city.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
  });
}
