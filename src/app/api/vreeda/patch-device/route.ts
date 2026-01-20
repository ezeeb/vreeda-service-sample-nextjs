import { NextRequest, NextResponse } from 'next/server';
import { DeviceRequestModel, DevicesResponse } from "@/types/vreedaApi";
import { patchDevice } from '@/lib/vreedaApiClient'; // Replace with your API client path
import UserContext from "@/models/UserContext";
import { getUserId } from "@/lib/auth";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

    // Parse the incoming request body
    const { deviceId, request }: { deviceId: string; request: DeviceRequestModel } = await req.json();

    //console.log("patching device " + deviceId + " -> " + JSON.stringify(request));

    if (!deviceId || !request) {
      return NextResponse.json({ error: 'Missing deviceId or request body' }, { status: 400 });
    }

    // Call the patchDevice client function
    const updatedDevice: DevicesResponse = await patchDevice(deviceId, request, apiAccessTokens?.accessToken);

    return NextResponse.json(updatedDevice, { status: 200 });
  } catch (error) {
    console.error('Error patching device:', error);
    return NextResponse.json({ error: 'Failed to patch device' }, { status: 500 });
  }
}
