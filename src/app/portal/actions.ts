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
    include: {
      job: { include: { city: { select: { name: true } } } },
      subcontractor: { select: { companyName: true, contactName: true } },
    },
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

  // Notify admin by email (Resend)
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (apiKey && adminEmail) {
    const portalUrl = process.env.NEXTAUTH_URL || "https://portal.lonestarcontractinggroup.com";
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.LEAD_FROM_EMAIL || "portal@lonestarcontractinggroup.com",
          to: adminEmail,
          subject: `Job accepted: ${assignment.job.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px;">
              <h2 style="color: #1E2A38;">Job Accepted</h2>
              <p><strong>${assignment.subcontractor.companyName}</strong> (${assignment.subcontractor.contactName}) has accepted the job:</p>
              <p><strong>${assignment.job.title}</strong> in ${assignment.job.city.name}</p>
              <p>All other offers for this job have been automatically declined.</p>
              <p><a href="${portalUrl}/admin/jobs/${assignment.jobId}" style="display: inline-block; background: #A8451C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Job</a></p>
              <p style="color: #6B6660; font-size: 14px;">Lone Star Contracting Group</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error("[notify] Error sending job accepted email:", err);
    }
  }

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
