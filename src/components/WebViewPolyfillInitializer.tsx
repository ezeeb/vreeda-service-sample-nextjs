'use client';

import { useEffect } from 'react';
import { installWebViewPolyfills } from '@/lib/webview/polyfill';

/**
 * WebView Polyfill Initializer
 *
 * Installiert fetch und console.log Polyfills beim App-Start.
 * Muss in der Root Layout als Client Component eingebunden werden.
 */
export default function WebViewPolyfillInitializer() {
  useEffect(() => {
    // Polyfills nur einmal beim Mount installieren
    installWebViewPolyfills();
  }, []);

  // Keine UI - nur Polyfill Installation
  return null;
}