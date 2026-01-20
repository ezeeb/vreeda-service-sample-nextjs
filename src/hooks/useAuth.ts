'use client';

import { useSession } from 'next-auth/react';
import { useIsWebView } from './useIsWebView';

/**
 * Unified Authentication Hook
 *
 * Encapsulates Browser (NextAuth) and WebView authentication.
 * Components no longer need to distinguish between modes.
 *
 * @returns {
 *   user: { name?: string, email?: string } | null - User information
 *   isAuthenticated: boolean - Is the user logged in?
 *   isLoading: boolean - Is authentication loading?
 *   isWebView: boolean - Is it WebView mode? (for UI adjustments)
 * }
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const isWebView = useIsWebView();

  // Unified State
  const isAuthenticated = isWebView || !!session;
  const isLoading = !isWebView && status === 'loading';

  // User information (if available)
  const user = session?.user
    ? {
        name: session.user.name || undefined,
        email: session.user.email || undefined
      }
    : isWebView
      ? { name: 'WebView User' }
      : null;

  return {
    user,
    isAuthenticated,
    isLoading,
    isWebView, // For UI-specific adjustments (e.g., hide Logout button)
  };
}
