import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserId } from "@/lib/auth";
import { getUserConfiguration, updateUserConfiguration } from '@/lib/userConfiguration';

/**
 * API Route to get user configuration
 * Uses central business logic from @/lib/userConfiguration
 */
export async function GET(req: Request) {
  const userId = await getUserId(req);

  try {
    const configuration = await getUserConfiguration(userId);
    return NextResponse.json(configuration, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    if (errorMessage === 'User context not found') {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    console.error("Error fetching configuration:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

/**
 * API Route to update user configuration
 * Uses central business logic from @/lib/userConfiguration
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);

  try {
    const body = await req.json();
    const { configuration } = body;

    const updatedConfiguration = await updateUserConfiguration(userId, configuration);
    return NextResponse.json(updatedConfiguration, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    if (errorMessage === 'Invalid or missing configuration') {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.error("Error updating configuration:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
