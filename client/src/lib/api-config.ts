// API Configuration for different environments
export const getApiUrl = (): string => {
  // Check if running in Capacitor (mobile app)
  // @ts-ignore - Capacitor is added globally by the plugin
  const isNative = typeof window !== 'undefined' && window.Capacitor !== undefined;
  
  // Check if running on Railway (production web)
  const isRailwayWeb = typeof window !== 'undefined' && 
    window.location.hostname === 'progresso-cotton-app-production.up.railway.app';

  if (isNative || isRailwayWeb) {
    // PRODUCTION: Railway server URL (para mobile e web em produção)
    return 'https://progresso-cotton-app-production.up.railway.app';
  }

  // DEVELOPMENT: For local web browser (Vite proxy handles /api, /auth, /version, /events)
  // Make sure your backend is running with: npm run dev:server
  return '';
};

export const API_URL = getApiUrl();

