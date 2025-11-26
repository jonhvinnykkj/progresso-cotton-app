const PROD_API_URL = 'https://progresso-cotton-app-production.up.railway.app';

// API Configuration for different environments
export const getApiUrl = (): string => {
  // Allow override via env for testing: set VITE_API_URL to '', http://localhost:5000, etc.
  const envApiUrl = import.meta.env?.VITE_API_URL?.trim();
  if (envApiUrl !== undefined && envApiUrl !== null && envApiUrl !== '') {
    return envApiUrl;
  }

  // Check if running in Capacitor (mobile app)
  // @ts-ignore - Capacitor is added globally by the plugin
  const isNative = typeof window !== 'undefined' && window.Capacitor !== undefined;

  // When developing locally in the browser, use relative paths so Vite's proxy can avoid CORS
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  if (!isNative && isLocalhost) {
    return '';
  }

  // Default to production API (mobile builds and hosted web)
  return PROD_API_URL;
};

export const API_URL = getApiUrl();

