"use server";

import { prisma } from "@/lib/prisma";
import { notifyOwnerDraftsReady } from "@/lib/notify";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }
  return session;
}

export async function getSolicitations(params: {
  status?: string;
  source?: string;
  search?: string;
}) {
  const { status, source, search } = params;

  return prisma.solicitation.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as "NEW" | "DRAFTING" | "DRAFT_READY" | "NEEDS_DOC" | "APPROVED" | "SUBMITTED" | "WON" | "LOST" | "SKIPPED" } : {}),
      ...(source && source !== "ALL" ? { source: source as "GMAIL" | "BIDNET" | "MANUAL" } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { issuingEntity: { contains: search, mode: "insensitive" } },
              { solicitationNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      draft: { select: { id: true, generatedAt: true, approvedAt: true, submittedAt: true } },
    },
    orderBy: [{ dueDate: "asc" }, { receivedAt: "desc" }],
  });
}

export async function getSolicitation(id: string) {
  return prisma.solicitation.findUnique({
    where: { id },
    include: {
      attachments: true,
      draft: true,
      job: { select: { id: true, title: true, status: true } },
    },
  });
}

export async function updateSolicitationStatus(id: string, status: string) {
  await requireAdmin();
  await prisma.solicitation.update({
    where: { id },
    data: { status: status as "NEW" | "DRAFTING" | "DRAFT_READY" | "NEEDS_DOC" | "APPROVED" | "SUBMITTED" | "WON" | "LOST" | "SKIPPED" },
  });
  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function skipSolicitation(id: string) {
  await requireAdmin();
  await prisma.solicitation.update({
    where: { id },
    data: { status: "SKIPPED" },
  });
  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function getSolicitationCounts() {
  const [total, newCount, draftReady, needsDoc, approved] = await Promise.all([
    prisma.solicitation.count(),
    prisma.solicitation.count({ where: { status: "NEW" } }),
    prisma.solicitation.count({ where: { status: "DRAFT_READY" } }),
    prisma.solicitation.count({ where: { status: "NEEDS_DOC" } }),
    prisma.solicitation.count({ where: { status: "APPROVED" } }),
  ]);
  return { total, new: newCount, draftReady, needsDoc, approved };
}

export async function completeSolicitation(id: string, formData: FormData) {
  await requireAdmin();
  const text = formData.get("solicitationText") as string;
  if (!text?.trim()) throw new Error("Solicitation text is required.");

  await prisma.solicitation.update({
    where: { id },
    data: {
      scope: text.trim(),
      needsSourceDocument: false,
      status: "NEW",
    },
  });

  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function uploadSolicitationDocument(id: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Storage not configured.");

  const fileName = `solicitations/${id}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/solicitation-attachments/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": file.type,
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) throw new Error("Failed to upload document.");

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/solicitation-attachments/${fileName}`;

  await prisma.solicitationAttachment.create({
    data: {
      solicitationId: id,
      label: file.name,
      fileUrl: publicUrl,
      mimeType: file.type || null,
    },
  });

  revalidatePath(`/admin/solicitations/${id}`);
}

// ─── Draft actions ───

export async function generateDraft(id: string) {
  await requireAdmin();
  const { generateBidDraft } = await import("@/lib/ai");

  const solicitation = await prisma.solicitation.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!solicitation) throw new Error("Solicitation not found.");

  const profile = await prisma.companyBidProfile.findFirst({
    include: {
      licenses: true,
      insurancePolicies: true,
      certifications: true,
      references: true,
      documents: true,
    },
  });
  if (!profile) throw new Error("Company bid profile not found. Complete the bid profile first.");

  await prisma.solicitation.update({
    where: { id },
    data: { status: "DRAFTING" },
  });

  try {
    const result = await generateBidDraft(
      {
        title: solicitation.title,
        issuingEntity: solicitation.issuingEntity,
        solicitationNumber: solicitation.solicitationNumber,
        scope: solicitation.scope,
        location: solicitation.location,
        dueDate: solicitation.dueDate?.toISOString() || null,
        submissionMethod: solicitation.submissionMethod,
        submissionContact: solicitation.submissionContact,
        requirements: (solicitation.requirements as string[]) || [],
        rawEmailExcerpt: solicitation.rawEmailExcerpt,
      },
      {
        legalName: profile.legalName,
        dba: profile.dba,
        address: [profile.addressStreet, profile.addressCity, profile.addressState, profile.addressZip]
          .filter(Boolean)
          .join(", "),
        phone: profile.phone,
        email: profile.email,
        websiteUrl: profile.websiteUrl,
        uei: profile.uei,
        cage: profile.cage,
        duns: profile.duns,
        naicsCodes: profile.naicsCodes,
        bondingCapacity: profile.bondingCapacity,
        standardMarkupNotes: profile.standardMarkupNotes,
        capabilityStatement: profile.capabilityStatement,
        licenses: profile.licenses.map((l) => ({
          type: l.type,
          number: l.number,
          state: l.state,
        })),
        insurancePolicies: profile.insurancePolicies.map((p) => ({
          type: p.type,
          carrier: p.carrier,
          limit: p.limit,
        })),
        certifications: profile.certifications.map((c) => ({
          name: c.name,
          number: c.number,
          issuer: c.issuer,
        })),
        references: profile.references.map((r) => ({
          projectName: r.projectName,
          clientName: r.clientName,
          value: r.value ? r.value.toString() : null,
          year: r.year,
          scopeSummary: r.scopeSummary,
        })),
        documents: profile.documents.map((d) => ({
          id: d.id,
          label: d.label,
        })),
      }
    );

    // Upsert the draft
    const existingDraft = await prisma.bidDraft.findUnique({
      where: { solicitationId: id },
    });

    if (existingDraft) {
      await prisma.bidDraft.update({
        where: { id: existingDraft.id },
        data: {
          generatedContent: result.content,
          editedContent: null,
          enclosures: result.suggestedEnclosures,
          aiModel: result.model,
          generatedAt: new Date(),
          approvedAt: null,
          approvedByUserId: null,
          submittedAt: null,
          submissionNotes: null,
        },
      });
    } else {
      await prisma.bidDraft.create({
        data: {
          solicitationId: id,
          generatedContent: result.content,
          enclosures: result.suggestedEnclosures,
          aiModel: result.model,
        },
      });
    }

    await prisma.solicitation.update({
      where: { id },
      data: { status: "DRAFT_READY" },
    });

    // Notify owner
    await notifyOwnerDraftsReady(1);
  } catch (err: unknown) {
    // Revert status on failure
    await prisma.solicitation.update({
      where: { id },
      data: { status: solicitation.needsSourceDocument ? "NEEDS_DOC" : "NEW" },
    });
    throw err;
  }

  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function saveDraftEdits(id: string, formData: FormData) {
  await requireAdmin();
  const editedContent = formData.get("editedContent") as string;
  const enclosureIds = formData.getAll("enclosureIds") as string[];

  const draft = await prisma.bidDraft.findUnique({
    where: { solicitationId: id },
  });
  if (!draft) throw new Error("No draft found.");

  await prisma.bidDraft.update({
    where: { id: draft.id },
    data: {
      editedContent: editedContent || null,
      enclosures: enclosureIds.length > 0 ? enclosureIds : (draft.enclosures ?? undefined),
    },
  });

  revalidatePath(`/admin/solicitations/${id}`);
}

export async function approveDraft(id: string, userId: string) {
  await requireAdmin();
  const draft = await prisma.bidDraft.findUnique({
    where: { solicitationId: id },
  });
  if (!draft) throw new Error("No draft found.");

  await prisma.bidDraft.update({
    where: { id: draft.id },
    data: { approvedAt: new Date(), approvedByUserId: userId },
  });

  await prisma.solicitation.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function markSubmitted(id: string, formData: FormData) {
  await requireAdmin();
  const notes = (formData.get("submissionNotes") as string)?.trim() || null;

  const draft = await prisma.bidDraft.findUnique({
    where: { solicitationId: id },
  });
  if (!draft) throw new Error("No draft found.");

  await prisma.bidDraft.update({
    where: { id: draft.id },
    data: { submittedAt: new Date(), submissionNotes: notes },
  });

  await prisma.solicitation.update({
    where: { id },
    data: { status: "SUBMITTED" },
  });

  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function markWon(id: string) {
  await requireAdmin();
  await prisma.solicitation.update({
    where: { id },
    data: { status: "WON" },
  });
  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function markLost(id: string) {
  await requireAdmin();
  await prisma.solicitation.update({
    where: { id },
    data: { status: "LOST" },
  });
  revalidatePath("/admin/solicitations");
  revalidatePath(`/admin/solicitations/${id}`);
}

export async function convertToJob(id: string) {
  await requireAdmin();
  const solicitation = await prisma.solicitation.findUnique({ where: { id } });
  if (!solicitation) throw new Error("Solicitation not found.");

  // We need a service and city to create a job. Use defaults or first available.
  const defaultService = await prisma.service.findFirst();
  const defaultCity = await prisma.city.findFirst();

  if (!defaultService || !defaultCity) {
    throw new Error("At least one service and one city must exist to create a job.");
  }

  const job = await prisma.job.create({
    data: {
      title: solicitation.title,
      serviceId: defaultService.id,
      cityId: defaultCity.id,
      customerName: solicitation.issuingEntity,
      scope: solicitation.scope,
      status: "DRAFT",
    },
  });

  await prisma.solicitation.update({
    where: { id },
    data: { jobId: job.id, status: "WON" },
  });

  revalidatePath("/admin/solicitations");
  revalidatePath("/admin/jobs");
  redirect(`/admin/jobs/${job.id}`);
}

export async function getBidProfileDocuments() {
  const profile = await prisma.companyBidProfile.findFirst({
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  return profile?.documents || [];
}
