// API Configuration for different environments
export const getApiUrl = (): string => {
  // Check if running in Capacitor (mobile app)
  // @ts-ignore - Capacitor is added globally by the plugin
  const isNative = typeof window !== 'undefined' && window.Capacitor !== undefined;
  
  // Check if running on Railway (production web)
  const isRailwayWeb = typeof window !== 'undefined' && 
    window.location.hostname === 'progresso-cotton-app-production.up.railway.app';

  // SEMPRE use Railway em produção (mobile ou web hospedado)
  if (isNative || isRailwayWeb) {
    return 'https://progresso-cotton-app-production.up.railway.app';
  }

  // Para localhost: usa Railway também (para não precisar de backend local)
  // Se quiser testar com backend local, mude para: return '';
  return 'https://progresso-cotton-app-production.up.railway.app';
};

export const API_URL = getApiUrl();


