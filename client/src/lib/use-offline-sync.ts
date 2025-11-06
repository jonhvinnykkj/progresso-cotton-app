import { useEffect, useState, useRef } from 'react';
import { offlineStorage } from './offline-storage';
import { queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from './api-client';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Voltou online');
      setIsOnline(true);
      syncAllPendingOperations();
    };

    const handleOffline = () => {
      console.log('📴 Ficou offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Tentar sincronizar ao montar se estiver online
    if (isOnline) {
      syncAllPendingOperations();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncAllPendingOperations = async () => {
    if (!isOnline || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const operations = await offlineStorage.getAllPendingOperations();

      if (operations.length === 0) {
        console.log('✅ Nenhuma operação pendente');
        syncInProgressRef.current = false;
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Sincronizando ${operations.length} operações pendentes...`);

      let successCount = 0;
      let errorCount = 0;

      for (const operation of operations) {
        try {
          if (operation.type === 'create') {
            await syncCreateBale(operation);
          } else if (operation.type === 'update_status') {
            await syncUpdateStatus(operation);
          }

          await offlineStorage.removePendingOperation(operation.id);
          successCount++;
        } catch (error) {
          console.error(`❌ Erro ao sincronizar operação ${operation.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          variant: 'success',
          title: 'Sincronização concluída',
          description: `${successCount} operação(ões) sincronizada(s)${errorCount > 0 ? `, ${errorCount} falhou(aram)` : ''}.`,
        });

        // Atualizar cache
        queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
      }
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  };

  const syncCreateBale = async (operation: any) => {
    const response = await fetch('/api/bales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(operation.data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create bale: ${response.statusText}`);
    }
  };

  const syncUpdateStatus = async (operation: any) => {
    const encodedId = encodeURIComponent(operation.data.id);
    const response = await fetch(`/api/bales/${encodedId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        status: operation.data.status,
        userId: operation.data.userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.statusText}`);
    }
  };

  return {
    isSyncing,
    isOnline,
    syncAllPendingOperations,
  };
}
