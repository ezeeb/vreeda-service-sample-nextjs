import { NextResponse } from 'next/server';
import { listDevices } from '@/lib/vreedaApiClient'; // Replace with your actual utility import
import UserContext from "@/models/UserContext";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userContext = await UserContext.findOne({ userId });
    if (!userContext) {
      return NextResponse.json({ granted: false, message: "User context not found" }, { status: 404 });
    }

    const { apiAccessTokens } = userContext;
    if (!apiAccessTokens?.accessToken || !apiAccessTokens?.refreshToken) {
      return NextResponse.json({ granted: false, message: "Tokens are missing" }, { status: 401 });
    }

    const devices = await listDevices(apiAccessTokens?.accessToken);
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}