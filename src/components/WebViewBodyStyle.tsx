'use client';

import { useEffect } from 'react';
import { useIsWebView } from '@/hooks/useIsWebView';

/**
 * Component that removes body background in WebView mode
 */
export default function WebViewBodyStyle() {
  const isWebView = useIsWebView();

  useEffect(() => {
    if (isWebView) {
      // Remove background in WebView mode
      document.body.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    } else {
      // Restore original background in Browser mode
      document.body.style.background = '';
      document.documentElement.style.backgroundColor = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.background = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, [isWebView]);

  return null;
}
