import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, email, password } = body;

  if (!token || !email || !password) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Look up the verification token
  const verification = await prisma.verificationToken.findFirst({
    where: {
      identifier: email.toLowerCase().trim(),
      token,
    },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }

  if (verification.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verification.identifier,
          token: verification.token,
        },
      },
    });
    return NextResponse.json({ error: "This link has expired. Contact your administrator for a new one." }, { status: 400 });
  }

  // Hash the password and update the user
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { passwordHash: hash },
  });

  // Delete the used token
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: verification.identifier,
        token: verification.token,
      },
    },
  });

  return NextResponse.json({ success: true });
}
