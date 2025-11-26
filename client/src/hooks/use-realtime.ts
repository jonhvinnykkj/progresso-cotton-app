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
        queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bales/stats-by-talhao'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bales/stats-by-safra'] });
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
