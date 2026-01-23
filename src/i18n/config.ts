/**
 * i18next configuration with HTTP Backend and WebView language detection
 * Loads translations lazily from public/locales/{lng}.json
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import { vreedaLanguageDetector } from './languageDetector';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'nl', 'cs'] as const;
const DEFAULT_LANGUAGE = 'en';

// Initialize i18next
const isServer = typeof window === 'undefined';

if (isServer) {
  // Server-side: Initialize without backend (SSR compatibility)
  i18next
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      resources: {}, // Empty resources for SSR
    });
} else {
  // Client-side: Initialize with HTTP Backend
  i18next
    .use(HttpBackend)
    .use(vreedaLanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,

      backend: {
        loadPath: '/locales/{{lng}}.json',
        requestOptions: {
          cache: 'no-cache',
        },
      },

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: false,
      },

      detection: {
        order: ['vreedaLanguageDetector', 'navigator', 'htmlTag'],
        caches: [],
      },
    });
}

export default i18next;
