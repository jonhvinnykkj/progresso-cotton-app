import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/lib/api-config';

export function useRealtime(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isAuthenticated) return;

    const url = API_URL ? `${API_URL}/api/events` : '/api/events';
    const eventSource = new EventSource(url);

    eventSource.addEventListener('bale-update', () => {
      // Debounce para evitar múltiplas invalidações simultâneas
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        // Usar predicate para invalidar queries que começam com o prefixo (inclui variações com safra)
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === '/api/bales' ||
                   key === '/api/bales/stats' ||
                   key === '/api/bales/stats-by-talhao' ||
                   key === '/api/bales/stats-by-safra';
          }
        });
      }, 300);
    });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      eventSource.close();
    };
  }, [queryClient, isAuthenticated]);
}
