import { NextResponse } from "next/server";
import { cleanupExpiredPKCEStates } from "@/lib/pkceStore";

/**
 * PKCE Cleanup Job
 * Removes expired PKCE states from UserContext documents.
 * Should be called periodically (e.g., every 5 minutes via cron).
 * Protected by API key (API_JOBS_KEY environment variable).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("key");

  if (apiKey !== process.env.API_JOBS_KEY) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedCount = await cleanupExpiredPKCEStates();

    return NextResponse.json({
      success: true,
      message: "PKCE cleanup completed successfully",
      deletedCount
    });
  } catch (error) {
    console.error("PKCE cleanup job failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: "Failed to cleanup PKCE states" },
      { status: 500 }
    );
  }
}
