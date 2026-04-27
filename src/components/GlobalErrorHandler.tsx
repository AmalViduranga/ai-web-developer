'use client';

import { useEffect } from 'react';
import { getErrorMessage } from '@/utils/error';

export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', getErrorMessage(event.reason));
      // You can also add UI toast notifications here later
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global Error:', getErrorMessage(event.error));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
