'use client';

/**
 * WebView Detection Hook
 *
 * Detects if the app is running in the Vreeda WebView by checking:
 * 1. Cookie set by middleware (works server-side and client-side)
 * 2. Fallback to window.isVreedaWebView (set by app)
 *
 * The middleware sets a cookie when Authorization: Bearer header is present,
 * which indicates WebView mode (vs Browser mode using NextAuth cookies).
 *
 * This hook directly reads without using state, avoiding re-renders.
 *
 * @returns boolean - Is it WebView mode?
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isWebView = useIsWebView();
 *
 *   return (
 *     <div>
 *       {!isWebView && <LogoutButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsWebView(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check cookie first (set by middleware based on Authorization header)
  const cookies = document.cookie.split(';');
  const webViewCookie = cookies.find(c => c.trim().startsWith('x-vreeda-webview='));
  if (webViewCookie) {
    return webViewCookie.split('=')[1] === 'true';
  }

  // Fallback to window property (for backward compatibility)
  return window.isVreedaWebView === true;
}

// TypeScript extension for window.isVreedaWebView
declare global {
  interface Window {
    isVreedaWebView?: boolean;
  }
}
