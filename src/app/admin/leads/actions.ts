"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadStage, LeadType } from "@prisma/client";

const PAGE_SIZE = 25;

function buildLeadWhere(params: {
  search?: string;
  type?: string;
  stage?: string;
  serviceSlug?: string;
  citySlug?: string;
}) {
  const { search, type, stage, serviceSlug, citySlug } = params;
  return {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    ...(type && type !== "ALL" ? { type: type as LeadType } : {}),
    ...(stage && stage !== "ALL" ? { stage: stage as LeadStage } : {}),
    ...(serviceSlug ? { service: { slug: serviceSlug } } : {}),
    ...(citySlug ? { city: { slug: citySlug } } : {}),
  };
}

export async function getLeads(params: {
  search?: string;
  type?: string;
  stage?: string;
  serviceSlug?: string;
  citySlug?: string;
  page?: number;
}) {
  await requireAdmin();
  const page = Math.max(1, params.page || 1);
  const where = buildLeadWhere(params);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        service: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function exportLeadsCsv(params: {
  search?: string;
  type?: string;
  stage?: string;
  serviceSlug?: string;
  citySlug?: string;
}) {
  await requireAdmin();
  const where = buildLeadWhere(params);

  const rows = await prisma.lead.findMany({
    where,
    include: {
      service: { select: { name: true } },
      city: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Name,Email,Phone,Type,Stage,Service,City,Source,Date";
  const lines = rows.map((r) =>
    [
      csvEscape(r.name),
      csvEscape(r.email || ""),
      csvEscape(r.phone || ""),
      r.type,
      r.stage,
      csvEscape(r.service?.name || ""),
      csvEscape(r.city?.name || ""),
      r.source,
      new Date(r.createdAt).toISOString().split("T")[0],
    ].join(",")
  );

  return header + "\n" + lines.join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function getLead(id: string) {
  await requireAdmin();
  return prisma.lead.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, name: true, slug: true } },
      city: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  await requireAdmin();
  await prisma.lead.update({
    where: { id },
    data: { stage },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function updateLeadNotes(id: string, notes: string) {
  await requireAdmin();
  await prisma.lead.update({
    where: { id },
    data: { notes: notes.trim() },
  });
  revalidatePath(`/admin/leads/${id}`);
}

export async function convertLeadToJob(leadId: string) {
  await requireAdmin();
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { service: true, city: true },
  });

  if (!lead || lead.type !== "CUSTOMER") {
    throw new Error("Only customer leads can be converted to jobs.");
  }

  if (!lead.serviceId || !lead.cityId) {
    throw new Error("Lead must have a service and city to convert to a job.");
  }

  const job = await prisma.job.create({
    data: {
      title: `${lead.service?.name || "Job"} - ${lead.name}`,
      serviceId: lead.serviceId,
      cityId: lead.cityId,
      customerName: lead.name,
      customerPhone: lead.phone,
      customerEmail: lead.email,
      scope: lead.scope,
      leadId: lead.id,
      status: "DRAFT",
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "WON" },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs/${job.id}`);
}

export async function convertLeadToSubcontractor(leadId: string) {
  await requireAdmin();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead || lead.type !== "SUBCONTRACTOR") {
    throw new Error("Only subcontractor leads can be converted.");
  }

  const sub = await prisma.subcontractor.create({
    data: {
      companyName: lead.name,
      contactName: lead.name,
      phone: lead.phone || "",
      email: lead.email || "",
      status: "PENDING",
      notes: lead.scope,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "WON" },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/subcontractors");
  redirect(`/admin/subcontractors/${sub.id}`);
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
