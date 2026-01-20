import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { getUserId } from "@/lib/auth";

// Handle GET and POST requests
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const userContext = await UserContext.findOne({ userId });
    if (!userContext) {
      return NextResponse.json({ error: "User context not found" }, { status: 404 });
    }

    return NextResponse.json(userContext.configuration || {}, { status: 200 });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { configuration } = body;

    if (!configuration || typeof configuration !== "object") {
      return NextResponse.json({ error: "Invalid or missing configuration" }, { status: 400 });
    }

    await connectToDatabase();

    const updatedContext = await UserContext.findOneAndUpdate(
      { userId },
      {
        $set: { configuration },
        $currentDate: { updatedAt: true },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedContext.configuration, { status: 200 });
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
