import { NextRequest, NextResponse } from "next/server";
import { syncGmail } from "@/lib/sync-gmail";

export async function GET(req: NextRequest) {
  // Verify cron secret for automated calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGmail();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Gmail sync cron error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
