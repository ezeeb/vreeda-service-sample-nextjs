import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserContext from "@/models/UserContext";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';

// Handle GET and POST requests
export async function GET() {
  const session: Session | null = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id; // Extract user ID
  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
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
  const session: Session | null = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id; // Extract user ID
  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
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
