"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createManualSolicitation(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }
  const title = (formData.get("title") as string)?.trim();
  const issuingEntity = (formData.get("issuingEntity") as string)?.trim();

  if (!title || !issuingEntity) {
    throw new Error("Title and issuing entity are required.");
  }

  const dueDateStr = formData.get("dueDate") as string;
  const requirementsStr = (formData.get("requirements") as string)?.trim();
  const requirements = requirementsStr
    ? requirementsStr
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  const solicitation = await prisma.solicitation.create({
    data: {
      source: "MANUAL",
      receivedAt: new Date(),
      issuingEntity,
      solicitationNumber: (formData.get("solicitationNumber") as string)?.trim() || null,
      title,
      scope: (formData.get("scope") as string)?.trim() || null,
      tradeCategory: (formData.get("tradeCategory") as string)?.trim() || null,
      location: (formData.get("location") as string)?.trim() || null,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      submissionMethod: (formData.get("submissionMethod") as string)?.trim() || null,
      submissionContact: (formData.get("submissionContact") as string)?.trim() || null,
      requirements: requirements.length > 0 ? requirements : undefined,
      sourceLink: (formData.get("sourceLink") as string)?.trim() || null,
      status: "NEW",
    },
  });

  revalidatePath("/admin/solicitations");
  redirect(`/admin/solicitations/${solicitation.id}`);
}
