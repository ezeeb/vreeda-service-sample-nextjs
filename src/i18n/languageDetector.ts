/**
 * Custom language detector for i18next with WebView support
 * Detects language from VREEDA WebView or falls back to browser
 */

declare global {
  interface Window {
    VreedaWebView?: {
      language?: string;
    };
  }
}

export function getBrowserLocale(): string {
  // 1. Check if running in VREEDA WebView and language is available
  if (typeof window !== 'undefined' && window.VreedaWebView?.language) {
    const vreedaLocale = window.VreedaWebView.language.trim().split(/-|_/)[0];
    if (vreedaLocale) {
      console.log('[i18n] Detected WebView language:', vreedaLocale);
      return vreedaLocale;
    }
  }

  // 2. Fallback to browser language
  if (typeof navigator !== 'undefined') {
    const browserLocales = navigator.languages || [navigator.language];
    const browserLocale = browserLocales[0]?.trim().split(/-|_/)[0];
    if (browserLocale) {
      console.log('[i18n] Detected browser language:', browserLocale);
      return browserLocale;
    }
  }

  // 3. Final fallback to English
  console.log('[i18n] Using fallback language: en');
  return 'en';
}

/**
 * Custom language detector plugin for i18next
 */
export const vreedaLanguageDetector = {
  type: 'languageDetector' as const,
  async: false,
  detect: getBrowserLocale,
  init: () => {},
  cacheUserLanguage: () => {},
};
