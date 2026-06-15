import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads
 *
 * Accepts a lead payload from the marketing site.
 * Authenticated via the X-Lead-Intake-Secret header.
 *
 * Expected payload:
 * {
 *   type: "CUSTOMER" | "SUBCONTRACTOR",
 *   name: string,                          // required
 *   email?: string,
 *   phone?: string,
 *   serviceSlug?: string,                  // slug from the service taxonomy
 *   citySlug?: string,                     // slug from the city list
 *   propertyType?: string,
 *   scope?: string,
 *   source?: string                        // e.g. "website-customer-form", "website-sub-form"
 * }
 *
 * Returns:
 * { success: true, leadId: string }
 */
export async function POST(req: NextRequest) {
  // Authenticate
  const secret = req.headers.get("x-lead-intake-secret");
  if (!secret || secret !== process.env.LEAD_INTAKE_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate required fields
  const { type, name, email, phone, serviceSlug, citySlug, propertyType, scope, source } = body as {
    type?: string;
    name?: string;
    email?: string;
    phone?: string;
    serviceSlug?: string;
    citySlug?: string;
    propertyType?: string;
    scope?: string;
    source?: string;
  };

  if (!type || !["CUSTOMER", "SUBCONTRACTOR"].includes(type)) {
    return NextResponse.json({ error: "type must be CUSTOMER or SUBCONTRACTOR." }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  // Resolve service and city by slug
  let serviceId: string | null = null;
  if (serviceSlug && typeof serviceSlug === "string") {
    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
    if (service) serviceId = service.id;
  }

  let cityId: string | null = null;
  if (citySlug && typeof citySlug === "string") {
    const city = await prisma.city.findUnique({ where: { slug: citySlug } });
    if (city) cityId = city.id;
  }

  const lead = await prisma.lead.create({
    data: {
      type: type as "CUSTOMER" | "SUBCONTRACTOR",
      name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      phone: phone ? String(phone).trim() : null,
      serviceId,
      cityId,
      propertyType: propertyType ? String(propertyType).trim() : null,
      scope: scope ? String(scope).trim() : null,
      source: source ? String(source).trim() : "website-customer-form",
      stage: "NEW",
    },
  });

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
