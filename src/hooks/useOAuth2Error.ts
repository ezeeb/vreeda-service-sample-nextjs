import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export interface OAuth2Error {
  error: string;
  errorDescription?: string;
  state?: string;
}

/**
 * Parse OAuth2 error parameters from URL (RFC 6749 §4.1.2.1)
 * ConsentService redirects with ?error=xxx&error_description=yyy&state=zzz
 *
 * This hook automatically:
 * 1. Detects OAuth2 error parameters in the URL
 * 2. Extracts and returns error information
 * 3. Cleans the URL by removing error parameters
 */
export function useOAuth2Error() {
  const searchParams = useSearchParams();
  const [oauth2Error, setOauth2Error] = useState<OAuth2Error | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      setOauth2Error({
        error,
        errorDescription: searchParams.get('error_description') || undefined,
        state: searchParams.get('state') || undefined,
      });

      // Clean URL (remove OAuth2 error parameters)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('error_description');
      newUrl.searchParams.delete('state');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const clearError = () => setOauth2Error(null);

  return { oauth2Error, clearError };
}
