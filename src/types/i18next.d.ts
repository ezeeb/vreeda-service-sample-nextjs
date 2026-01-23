/**
 * TypeScript type definitions for i18next
 * Provides autocomplete and type safety for translation keys
 */

import 'i18next';
import en from '../../public/locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
