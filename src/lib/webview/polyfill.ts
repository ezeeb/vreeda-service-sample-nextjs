/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import invoke from './invokeWebView';

// WebView Bindings
const webViewLog = invoke.bind('ServiceViewLog');
const webViewFetch = invoke.bind('ServiceViewFetch');

// Extend window type for debug flag
declare global {
  interface Window {
    VREEDA_DEBUG?: boolean;
  }
}

/**
 * Check if we're running in WebView mode
 */
function isWebViewMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).isVreedaWebView === true;
}

/**
 * Debug Logging (only when window.VREEDA_DEBUG = true)
 * Can be enabled at runtime: window.VREEDA_DEBUG = true
 */
function debugLog(...args: any[]) {
  if (typeof window !== 'undefined' && window.VREEDA_DEBUG) {
    console.log(...args);
  }
}

// Store original fetch function
let originalFetch: typeof fetch;

/**
 * Fetch Polyfill for WebView Mode
 *
 * Overrides the global fetch() function:
 * - In Browser Mode: Uses original fetch()
 * - In WebView Mode: Uses webViewFetch() via React Native Bridge
 */
export function installFetchPolyfill() {
  if (typeof window === 'undefined') return;

  // Store original fetch on first call
  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }

  // Override global fetch function
  window.fetch = async function polyfillFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method?.toUpperCase() || 'GET';

    // Debug Logging (only when window.VREEDA_DEBUG = true)
    debugLog('[fetch polyfill] Request:', { url, method, isWebView: isWebViewMode() });

    // Browser Mode: Original fetch API
    if (!isWebViewMode()) {
      debugLog('[fetch polyfill] Using native fetch (Browser Mode)');
      return originalFetch(input, init);
    }

    // WebView Mode: React Native Bridge
    debugLog('[fetch polyfill] Using webViewFetch (WebView Mode)');
    if (window.VREEDA_DEBUG) {
      webViewLog(`[fetch] Calling ${url} via WebView Bridge`);
    }

    try {
      // WebView Fetch with Next.js API URL (passed directly to app)
      const options = {
        method: method.toLowerCase(),
        headers: init?.headers || {},
        ...(init?.body && { body: init.body })
      };

      debugLog('[fetch polyfill] WebView options:', options);

      // Call via Bridge with actual Next.js URL (app automatically adds Bearer Token)
      const result = await webViewFetch(url, options);

      if (window.VREEDA_DEBUG) {
        webViewLog(`[fetch] ${url} response: ${JSON.stringify(result).substring(0, 200)}`);
      }
      debugLog('[fetch polyfill] WebView result:', result);

      // Convert WebView response to Fetch Response format
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      if (window.VREEDA_DEBUG) {
        webViewLog(`[fetch] ${url} error: ${JSON.stringify(error)}`);
      }
      console.error('[fetch polyfill] WebView error:', error);

      // Convert Error to Fetch Response format
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  };

  debugLog('[fetch polyfill] Installed successfully');
}

/**
 * Console Polyfill for WebView Mode
 *
 * Extends console.log/error/warn/info with WebView logging
 * - console.error: Always sent to WebView (important for errors)
 * - console.log/warn/info: Only when window.VREEDA_DEBUG = true
 */
export function installConsolePolyfill() {
  if (typeof window === 'undefined') return;
  if (!isWebViewMode()) return;

  const originalLog = console.log.bind(console);
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalInfo = console.info.bind(console);

  // console.log - only sent to WebView in Debug Mode
  console.log = function polyfillLog(...args: any[]) {
    originalLog(...args);
    if (window.VREEDA_DEBUG) {
      try {
        const message = '[LOG] ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        webViewLog(message);
      } catch (error) {
        originalLog('[console polyfill] Error sending to WebView:', error);
      }
    }
  };

  // console.error - ALWAYS sent to WebView (errors are important!)
  console.error = function polyfillError(...args: any[]) {
    originalError(...args);
    try {
      const message = '[ERROR] ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      webViewLog(message);
    } catch (error) {
      originalError('[console polyfill] Error sending to WebView:', error);
    }
  };

  // console.warn - only sent to WebView in Debug Mode
  console.warn = function polyfillWarn(...args: any[]) {
    originalWarn(...args);
    if (window.VREEDA_DEBUG) {
      try {
        const message = '[WARN] ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        webViewLog(message);
      } catch (error) {
        originalWarn('[console polyfill] Error sending to WebView:', error);
      }
    }
  };

  // console.info - only sent to WebView in Debug Mode
  console.info = function polyfillInfo(...args: any[]) {
    originalInfo(...args);
    if (window.VREEDA_DEBUG) {
      try {
        const message = '[INFO] ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        webViewLog(message);
      } catch (error) {
        originalInfo('[console polyfill] Error sending to WebView:', error);
      }
    }
  };

  debugLog('[console polyfill] Installed successfully');
}

/**
 * Install all WebView Polyfills
 *
 * Enable Debug Mode:
 * - In Browser Console: window.VREEDA_DEBUG = true
 * - In the App: window.isVreedaWebView = true; window.VREEDA_DEBUG = true;
 *
 * Logging Behavior:
 * - console.error: ALWAYS sent to WebView (important for error tracking)
 * - console.log/warn/info: Only when VREEDA_DEBUG = true
 * - Fetch Polyfill: Logging only when VREEDA_DEBUG = true
 */
export function installWebViewPolyfills() {
  installFetchPolyfill();
  installConsolePolyfill();
}
