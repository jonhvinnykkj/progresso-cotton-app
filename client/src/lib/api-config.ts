// API Configuration for different environments
export const getApiUrl = (): string => {
  // Check if running in Capacitor (mobile app)
  // @ts-ignore - Capacitor is added globally by the plugin
  const isNative = typeof window !== 'undefined' && window.Capacitor !== undefined;

  if (isNative) {
    // PRODUCTION: Railway server URL (sem /api no final pois as rotas já incluem)
    return 'https://progresso-cotton-app-production.up.railway.app';

    // DEVELOPMENT: Local development server
    // Uncomment this line and comment the production URL above to test locally
    // Make sure your backend is running with: npm run dev:server
    // return 'http://192.168.86.88:5000';
  }

  // For web browser (Vite proxy handles /api)
  return '';
};

export const API_URL = getApiUrl();

// Helper para construir URLs de API (adiciona /api apenas se não for nativo)
export const buildApiUrl = (path: string): string => {
  const isNative = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  
  if (isNative) {
    // Mobile: URL completa do servidor
    return `${API_URL}${path}`;
  } else {
    // Desktop: usa proxy do Vite, path já começa com /api
    return path;
  }
};
