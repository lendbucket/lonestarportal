import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Validate OAuth state parameter to prevent CSRF
  const state = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (!state || !storedState || !crypto.timingSafeEqual(
    Buffer.from(state),
    Buffer.from(storedState)
  )) {
    const params = new URLSearchParams({
      gmailError: "Invalid OAuth state. Please try connecting again.",
    });
    return NextResponse.redirect(
      new URL(`/admin/settings/integrations?${params}`, req.url)
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    const params = new URLSearchParams({
      gmailError: error || "No authorization code received.",
    });
    return NextResponse.redirect(
      new URL(`/admin/settings/integrations?${params}`, req.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GMAIL_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Token exchange failed: ${body}`);
    }

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. Revoke access at myaccount.google.com/permissions and reconnect."
      );
    }

    // Get the email address from the Gmail profile
    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!profileRes.ok) {
      throw new Error("Failed to fetch Gmail profile.");
    }

    const profile = await profileRes.json();

    // Upsert the connection (singleton)
    const existing = await prisma.gmailConnection.findFirst();
    const data = {
      emailAddress: profile.emailAddress,
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      encryptedAccessToken: encrypt(tokens.access_token),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      lastHistoryId: String(profile.historyId),
      status: "connected",
    };

    if (existing) {
      await prisma.gmailConnection.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.gmailConnection.create({ data });
    }

    return NextResponse.redirect(
      new URL("/admin/settings/integrations?gmailConnected=true", req.url)
    );
  } catch (err: unknown) {
    console.error("Gmail OAuth error:", err);
    const params = new URLSearchParams({
      gmailError: err instanceof Error ? err.message : "Connection failed.",
    });
    return NextResponse.redirect(
      new URL(`/admin/settings/integrations?${params}`, req.url)
    );
  }
}
