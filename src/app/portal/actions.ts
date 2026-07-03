"use server";

import { prisma } from "@/lib/prisma";
import { requireSubcontractor } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { uploadPrivateFile, getSignedUrl } from "@/lib/storage";

export async function getJobPhotoUrl(photoPath: string) {
  await requireSubcontractor();
  return getSignedUrl("job-photos", photoPath);
}

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

  const storagePath = `${jobId}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadPrivateFile("job-photos", storagePath, buffer, file.type);

  await prisma.jobPhoto.create({
    data: {
      jobId,
      url: storagePath,
      caption: caption?.trim() || null,
      uploadedBySubcontractorId: subcontractorId,
    },
  });

  revalidatePath("/portal");
  revalidatePath(`/admin/jobs/${jobId}`);
}
