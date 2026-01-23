'use client';

import { useEffect } from 'react';
import '@/i18n/config';

/**
 * Client-side i18n provider
 * Ensures i18next is initialized on the client
 */
export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // i18n is initialized when the config module is imported
  }, []);

  return <>{children}</>;
}
