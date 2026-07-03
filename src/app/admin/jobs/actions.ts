"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus } from "@prisma/client";
import { getSignedUrl } from "@/lib/storage";

export async function getJobs() {
  await requireAdmin();
  return prisma.job.findMany({
    include: {
      service: { select: { name: true } },
      city: { select: { name: true } },
      assignments: {
        include: { subcontractor: { select: { companyName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJob(id: string) {
  await requireAdmin();
  return prisma.job.findUnique({
    where: { id },
    include: {
      service: { select: { id: true, name: true, slug: true } },
      city: { select: { id: true, name: true, slug: true } },
      lead: { select: { id: true, name: true } },
      assignments: {
        include: {
          subcontractor: { select: { id: true, companyName: true, contactName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      photos: {
        include: { subcontractor: { select: { companyName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createJob(formData: FormData) {
  await requireAdmin();
  const title = formData.get("title") as string;
  const serviceId = formData.get("serviceId") as string;
  const cityId = formData.get("cityId") as string;
  const customerName = formData.get("customerName") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const scope = formData.get("scope") as string;
  const amount = formData.get("amount") as string;

  if (!title || !serviceId || !cityId || !customerName) {
    throw new Error("Required fields missing.");
  }

  const job = await prisma.job.create({
    data: {
      title: title.trim(),
      serviceId,
      cityId,
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || null,
      customerEmail: customerEmail?.trim()?.toLowerCase() || null,
      scope: scope?.trim() || null,
      amount: amount ? parseFloat(amount) : null,
      status: "DRAFT",
    },
  });

  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs/${job.id}`);
}

export async function updateJobStatus(id: string, status: JobStatus) {
  await requireAdmin();
  await prisma.job.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${id}`);
}

export async function updateJobSchedule(id: string, formData: FormData) {
  await requireAdmin();
  const scheduledDate = formData.get("scheduledDate") as string;
  const amount = formData.get("amount") as string;

  await prisma.job.update({
    where: { id },
    data: {
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      amount: amount ? parseFloat(amount) : null,
    },
  });
  revalidatePath(`/admin/jobs/${id}`);
}

export async function getMatchingSubcontractors(serviceId: string, cityId: string) {
  await requireAdmin();
  return prisma.subcontractor.findMany({
    where: {
      status: "ACTIVE",
      trades: { some: { id: serviceId } },
      serviceAreas: { some: { id: cityId } },
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

export async function offerJobToSubs(jobId: string, subcontractorIds: string[]) {
  await requireAdmin();
  if (subcontractorIds.length === 0) throw new Error("No subcontractors selected.");

  // Create assignments
  await prisma.jobAssignment.createMany({
    data: subcontractorIds.map((subId) => ({
      jobId,
      subcontractorId: subId,
      status: "OFFERED",
    })),
    skipDuplicates: true,
  });

  // Move job to OFFERED status
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "OFFERED" },
  });

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
}

export async function getJobPhotoSignedUrl(photoPath: string) {
  await requireAdmin();
  return getSignedUrl("job-photos", photoPath);
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
