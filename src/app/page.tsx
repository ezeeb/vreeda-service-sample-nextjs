import { cookies } from 'next/headers';
import HomeClient from './HomeClient';
import { getServerUserId } from '@/lib/server/getServerUserId';
import { checkGrantStatus } from '@/lib/server/checkGrantStatus';

/**
 * Server Component that reads WebView detection and grant status
 * and passes them to the Client Component
 */
export default async function Home() {
  const cookieStore = await cookies();
  const isWebView = cookieStore.get('x-vreeda-webview')?.value === 'true';

  // Load grant status server-side
  const userId = await getServerUserId();
  const grantStatus = await checkGrantStatus(userId);

  return <HomeClient isWebView={isWebView} initialGrantStatus={grantStatus} />;
}
