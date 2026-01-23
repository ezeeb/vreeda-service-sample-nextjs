import { NextResponse } from 'next/server';
import { getUserId } from "@/lib/auth";
import { getDevices } from '@/lib/devices';

/**
 * API Route to list devices
 * Uses central business logic from @/lib/devices
 */
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const devices = await getDevices(userId);

    if (devices === null) {
      return NextResponse.json(
        { error: 'Grant not active or tokens missing' },
        { status: 401 }
      );
    }

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
