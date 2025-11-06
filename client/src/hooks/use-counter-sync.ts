import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offline-storage';
import { useAuth } from '@/lib/auth-context';
import { API_URL } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/api-client';

export function useCounterSync() {
  const { isAuthenticated } = useAuth();

  // Buscar contadores do servidor
  const { data: counters } = useQuery({
    queryKey: ['/api/talhao-counters'],
    queryFn: async () => {
      const url = API_URL ? `${API_URL}/api/talhao-counters` : '/api/talhao-counters';
      const response = await fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch counters');
      }
      return response.json();
    },
    // Atualizar a cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000, // 1 minuto
    retry: 1,
    retryDelay: 1000,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Sincronizar com IndexedDB quando houver dados
  useEffect(() => {
    if (counters && counters.length > 0) {
      offlineStorage.syncCountersFromServer(counters).catch((error) => {
        console.error('❌ Erro ao sincronizar contadores:', error);
      });
    }
  }, [counters]);

  return {
    counters,
  };
}
