"use server";

import { prisma } from "@/lib/prisma";
import { requireSubcontractor } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function getMyJobs() {
  const { subcontractorId } = await requireSubcontractor();

  return prisma.jobAssignment.findMany({
    where: { subcontractorId },
    include: {
      job: {
        include: {
          service: { select: { name: true } },
          city: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptJob(assignmentId: string) {
  const { subcontractorId } = await requireSubcontractor();

  const assignment = await prisma.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: { job: true },
  });

  if (!assignment || assignment.subcontractorId !== subcontractorId) {
    throw new Error("Assignment not found.");
  }

  if (assignment.status !== "OFFERED") {
    throw new Error("This offer is no longer available.");
  }

  // Accept this assignment
  await prisma.jobAssignment.update({
    where: { id: assignmentId },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  // Decline all other offers for this job
  await prisma.jobAssignment.updateMany({
    where: {
      jobId: assignment.jobId,
      id: { not: assignmentId },
      status: "OFFERED",
    },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  // Update job status to ASSIGNED
  await prisma.job.update({
    where: { id: assignment.jobId },
    data: { status: "ASSIGNED" },
  });

  revalidatePath("/portal");
  revalidatePath("/admin/jobs");
}

export async function declineJob(assignmentId: string) {
  const { subcontractorId } = await requireSubcontractor();

  const assignment = await prisma.jobAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || assignment.subcontractorId !== subcontractorId) {
    throw new Error("Assignment not found.");
  }

  await prisma.jobAssignment.update({
    where: { id: assignmentId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  revalidatePath("/portal");
  revalidatePath("/admin/jobs");
}

export async function uploadJobPhoto(jobId: string, formData: FormData) {
  const { subcontractorId } = await requireSubcontractor();

  // Verify the sub is assigned to this job
  const assignment = await prisma.jobAssignment.findFirst({
    where: {
      jobId,
      subcontractorId,
      status: "ACCEPTED",
    },
  });

  if (!assignment) throw new Error("Not assigned to this job.");

  const file = formData.get("file") as File;
  const caption = formData.get("caption") as string;

  if (!file || file.size === 0) throw new Error("No file provided.");

  // Upload to Supabase Storage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Storage not configured.");
  }

  const fileName = `${jobId}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/job-photos/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": file.type,
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    throw new Error("Failed to upload photo.");
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/job-photos/${fileName}`;

  await prisma.jobPhoto.create({
    data: {
      jobId,
      url: publicUrl,
      caption: caption?.trim() || null,
      uploadedBySubcontractorId: subcontractorId,
    },
  });

  revalidatePath("/portal");
  revalidatePath(`/admin/jobs/${jobId}`);
}
