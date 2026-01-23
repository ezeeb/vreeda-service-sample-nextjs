import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { checkGrantStatus } from "@/lib/grant";

/**
 * API Route to check if user has granted OAuth2 consent
 * Uses central business logic from @/lib/grant
 */
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    console.error('User granted check: No user ID found');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const grantStatus = await checkGrantStatus(userId);

    if (grantStatus === "active") {
      return NextResponse.json({ granted: true, message: "Access granted" }, { status: 200 });
    } else {
      return NextResponse.json({ granted: false, message: "Grant renewal needed" }, { status: 401 });
    }
  } catch (error) {
    console.error('User granted check failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Failed to validate user context" }, { status: 500 });
  }
}
