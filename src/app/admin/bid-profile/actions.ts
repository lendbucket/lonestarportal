"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { uploadPrivateFile, getSignedUrl } from "@/lib/storage";

export async function getBidProfile() {
  await requireAdmin();
  return prisma.companyBidProfile.findFirst({
    include: {
      licenses: { orderBy: { createdAt: "desc" } },
      insurancePolicies: { orderBy: { createdAt: "desc" } },
      certifications: { orderBy: { createdAt: "desc" } },
      references: { orderBy: { year: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function upsertBidProfile(formData: FormData) {
  await requireAdmin();
  const data = {
    legalName: (formData.get("legalName") as string)?.trim(),
    dba: (formData.get("dba") as string)?.trim() || null,
    addressStreet: (formData.get("addressStreet") as string)?.trim() || null,
    addressCity: (formData.get("addressCity") as string)?.trim() || null,
    addressState: (formData.get("addressState") as string)?.trim() || null,
    addressZip: (formData.get("addressZip") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim()?.toLowerCase() || null,
    websiteUrl: (formData.get("websiteUrl") as string)?.trim() || null,
    uei: (formData.get("uei") as string)?.trim() || null,
    cage: (formData.get("cage") as string)?.trim() || null,
    duns: (formData.get("duns") as string)?.trim() || null,
    naicsCodes: (formData.get("naicsCodes") as string)
      ?.split(",")
      .map((c) => c.trim())
      .filter(Boolean) || [],
    bondingCapacity: (formData.get("bondingCapacity") as string)?.trim() || null,
    standardMarkupNotes: (formData.get("standardMarkupNotes") as string)?.trim() || null,
    capabilityStatement: (formData.get("capabilityStatement") as string)?.trim() || null,
    w9OnFile: formData.get("w9OnFile") === "on",
  };

  if (!data.legalName) {
    throw new Error("Legal name is required.");
  }

  const existing = await prisma.companyBidProfile.findFirst();

  if (existing) {
    await prisma.companyBidProfile.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.companyBidProfile.create({ data });
  }

  revalidatePath("/admin/bid-profile");
}

// ─── Licenses ───

export async function addLicense(formData: FormData) {
  await requireAdmin();
  const profile = await prisma.companyBidProfile.findFirst();
  if (!profile) throw new Error("Create the company profile first.");

  await prisma.bidLicense.create({
    data: {
      profileId: profile.id,
      type: (formData.get("type") as string).trim(),
      number: (formData.get("number") as string).trim(),
      state: (formData.get("state") as string).trim(),
      expiresOn: formData.get("expiresOn")
        ? new Date(formData.get("expiresOn") as string)
        : null,
    },
  });

  revalidatePath("/admin/bid-profile");
}

export async function deleteLicense(id: string) {
  await requireAdmin();
  await prisma.bidLicense.delete({ where: { id } });
  revalidatePath("/admin/bid-profile");
}

// ─── Insurance Policies ───

export async function addInsurancePolicy(formData: FormData) {
  await requireAdmin();
  const profile = await prisma.companyBidProfile.findFirst();
  if (!profile) throw new Error("Create the company profile first.");

  await prisma.insurancePolicy.create({
    data: {
      profileId: profile.id,
      type: (formData.get("type") as string).trim(),
      carrier: (formData.get("carrier") as string).trim(),
      policyNumber: (formData.get("policyNumber") as string).trim(),
      limit: (formData.get("limit") as string)?.trim() || null,
      expiresOn: formData.get("expiresOn")
        ? new Date(formData.get("expiresOn") as string)
        : null,
    },
  });

  revalidatePath("/admin/bid-profile");
}

export async function deleteInsurancePolicy(id: string) {
  await requireAdmin();
  await prisma.insurancePolicy.delete({ where: { id } });
  revalidatePath("/admin/bid-profile");
}

// ─── Certifications ───

export async function addCertification(formData: FormData) {
  await requireAdmin();
  const profile = await prisma.companyBidProfile.findFirst();
  if (!profile) throw new Error("Create the company profile first.");

  await prisma.certification.create({
    data: {
      profileId: profile.id,
      name: (formData.get("name") as string).trim(),
      number: (formData.get("number") as string)?.trim() || null,
      issuer: (formData.get("issuer") as string)?.trim() || null,
      expiresOn: formData.get("expiresOn")
        ? new Date(formData.get("expiresOn") as string)
        : null,
    },
  });

  revalidatePath("/admin/bid-profile");
}

export async function deleteCertification(id: string) {
  await requireAdmin();
  await prisma.certification.delete({ where: { id } });
  revalidatePath("/admin/bid-profile");
}

// ─── References ───

export async function addReference(formData: FormData) {
  await requireAdmin();
  const profile = await prisma.companyBidProfile.findFirst();
  if (!profile) throw new Error("Create the company profile first.");

  const value = formData.get("value") as string;

  await prisma.bidReference.create({
    data: {
      profileId: profile.id,
      projectName: (formData.get("projectName") as string).trim(),
      clientName: (formData.get("clientName") as string).trim(),
      contactName: (formData.get("contactName") as string)?.trim() || null,
      contactPhone: (formData.get("contactPhone") as string)?.trim() || null,
      contactEmail: (formData.get("contactEmail") as string)?.trim()?.toLowerCase() || null,
      value: value ? parseFloat(value) : null,
      year: formData.get("year") ? parseInt(formData.get("year") as string, 10) : null,
      scopeSummary: (formData.get("scopeSummary") as string)?.trim() || null,
    },
  });

  revalidatePath("/admin/bid-profile");
}

export async function deleteReference(id: string) {
  await requireAdmin();
  await prisma.bidReference.delete({ where: { id } });
  revalidatePath("/admin/bid-profile");
}

// ─── Documents ───

export async function uploadBidDocument(formData: FormData) {
  await requireAdmin();
  const profile = await prisma.companyBidProfile.findFirst();
  if (!profile) throw new Error("Create the company profile first.");

  const file = formData.get("file") as File;
  const label = (formData.get("label") as string)?.trim();

  if (!file || file.size === 0) throw new Error("No file provided.");
  if (!label) throw new Error("Label is required.");

  const storagePath = `bid-documents/${profile.id}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadPrivateFile("bid-documents", storagePath, buffer, file.type);

  await prisma.bidDocument.create({
    data: {
      profileId: profile.id,
      label,
      fileUrl: storagePath,
      mimeType: file.type || null,
    },
  });

  revalidatePath("/admin/bid-profile");
}

export async function getBidDocumentSignedUrl(filePath: string) {
  await requireAdmin();
  return getSignedUrl("bid-documents", filePath);
}

export async function deleteBidDocument(id: string) {
  await requireAdmin();
  await prisma.bidDocument.delete({ where: { id } });
  revalidatePath("/admin/bid-profile");
}
