// API Configuration for different environments
export const getApiUrl = (): string => {
  // Check if running in Capacitor (mobile app)
  // @ts-ignore - Capacitor is added globally by the plugin
  const isNative = typeof window !== 'undefined' && window.Capacitor !== undefined;

  if (isNative) {
    // PRODUCTION: Railway server URL
    return 'https://progresso-cotton-app-production.up.railway.app/api';

    // DEVELOPMENT: Local development server
    // Uncomment this line and comment the production URL above to test locally
    // Make sure your backend is running with: npm run dev:server
    // return 'http://192.168.86.88:5000/api';
  }

  // For web browser (Vite proxy handles /api)
  return '/api';
};

export const API_URL = getApiUrl();
