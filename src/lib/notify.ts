import "server-only";

/**
 * Send notification emails via Resend.
 */
export async function notifyOwnerNewSolicitations(count: number) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[notify] RESEND_API_KEY not set. ${count} new solicitations ready.`);
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log("[notify] ADMIN_EMAIL not set, skipping notification.");
    return;
  }

  const portalUrl = process.env.NEXTAUTH_URL || "https://portal.lonestarcontractinggroup.com";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL || "portal@lonestarcontractinggroup.com",
        to: adminEmail,
        subject: `${count} new bid solicitation${count > 1 ? "s" : ""} ready for review`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2 style="color: #1E2A38;">New Bid Solicitations</h2>
            <p>${count} new solicitation${count > 1 ? "s have" : " has"} been extracted from your email and ${count > 1 ? "are" : "is"} ready for review.</p>
            <p><a href="${portalUrl}/admin/solicitations?status=NEW" style="display: inline-block; background: #A8451C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Solicitations</a></p>
            <p style="color: #6B6660; font-size: 14px;">Lone Star Contracting Group</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error("[notify] Failed to send notification:", await res.text());
    }
  } catch (err) {
    console.error("[notify] Error sending notification:", err);
  }
}

export async function notifyOwnerDraftsReady(count: number) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

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
        subject: `${count} bid draft${count > 1 ? "s" : ""} ready for approval`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2 style="color: #1E2A38;">Bid Drafts Ready</h2>
            <p>${count} bid draft${count > 1 ? "s have" : " has"} been generated and ${count > 1 ? "are" : "is"} ready for your review and approval.</p>
            <p><a href="${portalUrl}/admin/solicitations?status=DRAFT_READY" style="display: inline-block; background: #A8451C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Drafts</a></p>
            <p style="color: #6B6660; font-size: 14px;">Lone Star Contracting Group</p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[notify] Error sending drafts notification:", err);
  }
}
