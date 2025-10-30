import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtime(isAuthenticated: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Don't connect if not authenticated
    if (!isAuthenticated) {
      console.log('⏸️ SSE disabled - user not authenticated');
      return;
    }

    console.log('🚀 Initializing SSE connection...');
    
    // Connect to Server-Sent Events
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
    };

    eventSource.addEventListener('connected', (event) => {
      console.log('🔌 Connected to real-time updates', event);
    });

    eventSource.addEventListener('bale-update', (event) => {
      console.log('📦 Bale update received!', event);
      
      // Invalidate all bale-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats-by-talhao'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats-by-safra'] });
      
      console.log('✨ Queries invalidated, refetching...');
    });

    eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      console.log('🔄 Attempting to reconnect...');
    };

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing SSE connection');
      eventSource.close();
    };
  }, [queryClient, isAuthenticated]);
}
