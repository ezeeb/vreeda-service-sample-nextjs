import { cookies } from 'next/headers';
import HomeClient from './HomeClient';
import { getServerUserId } from '@/lib/auth';
import { checkGrantStatus } from '@/lib/grant';
import { getDevices } from '@/lib/devices';
import { getSelectedDevices } from '@/lib/userConfiguration';

/**
 * Server Component that reads WebView detection and grant status
 * and passes them to the Client Component
 * Also pre-fetches devices and selected devices if grant is active
 */
export default async function Home() {
  const cookieStore = await cookies();
  const isWebView = cookieStore.get('x-vreeda-webview')?.value === 'true';

  // Load grant status server-side
  const userId = await getServerUserId();
  const grantStatus = await checkGrantStatus(userId);

  // Pre-fetch devices and selected devices if grant is active
  let initialDevices = null;
  let initialSelectedDevices: string[] = [];

  if (grantStatus === "active") {
    // Load both in parallel for better performance
    try {
      [initialDevices, initialSelectedDevices] = await Promise.all([
        getDevices(userId),
        getSelectedDevices(userId)
      ]);
    } catch (error) {
      console.error('Error pre-fetching data:', error);
      // Graceful degradation - client will fetch data if server fetch fails
    }
  }

  return (
    <HomeClient
      isWebView={isWebView}
      initialGrantStatus={grantStatus}
      initialDevices={initialDevices}
      initialSelectedDevices={initialSelectedDevices}
    />
  );
}
