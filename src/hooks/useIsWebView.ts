'use client';

import { useEffect, useState } from 'react';

/**
 * WebView Detection Hook
 *
 * Detects if the app is running in the Vreeda WebView.
 * The app sets window.isVreedaWebView = true on load.
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
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.isVreedaWebView === true) {
      setIsWebView(true);
    }
  }, []);

  return isWebView;
}

// TypeScript extension for window.isVreedaWebView
declare global {
  interface Window {
    isVreedaWebView?: boolean;
  }
}
