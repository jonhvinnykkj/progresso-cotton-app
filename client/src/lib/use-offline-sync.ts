import { useEffect, useState, useRef } from 'react';
import { offlineStorage } from './offline-storage';
import { queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from './api-client';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [totalOps, setTotalOps] = useState(0);
  const [processedOps, setProcessedOps] = useState(0);
  const [failedOps, setFailedOps] = useState(0);
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
    setProcessedOps(0);
    setFailedOps(0);

    try {
      // Cleanup old ops first
      await offlineStorage.cleanupOldPendingOperations(7);

      const operations = await offlineStorage.getAllPendingOperations();
      const pending = operations.filter((op) => !op.status || op.status === 'pending');

      if (pending.length === 0) {
        console.log('✅ Nenhuma operação pendente');
        syncInProgressRef.current = false;
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Sincronizando ${pending.length} operações pendentes...`);
      setTotalOps(pending.length);

      let successCount = 0;
      let errorCount = 0;

      const MAX_ATTEMPTS = 3;

      for (const operation of pending) {
        try {
          // Skip if already exceeded attempts
          const attempts = operation.attemptCount || 0;
          if (attempts >= MAX_ATTEMPTS) {
            // mark as failed
            await offlineStorage.updatePendingOperation(operation.id, { status: 'failed' });
            errorCount++;
            setFailedOps((f) => f + 1);
            setProcessedOps((p) => p + 1);
            continue;
          }

          if (operation.type === 'create') {
            await syncCreateBale(operation);
          } else if (operation.type === 'update_status') {
            await syncUpdateStatus(operation);
          }

          await offlineStorage.removePendingOperation(operation.id);
          successCount++;
          setProcessedOps((p) => p + 1);
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar operação ${operation.id}:`, error);

          // increment attemptCount and set lastAttempt
          const newAttempts = (operation.attemptCount || 0) + 1;
          const patch: any = { attemptCount: newAttempts, lastAttempt: new Date().toISOString() };

          // If server responded with info, we can inspect error.response (fetch doesn't provide), so check error.message
          // If attempts exhausted mark failed
          if (newAttempts >= MAX_ATTEMPTS) {
            patch.status = 'failed';
            errorCount++;
            setFailedOps((f) => f + 1);
          }

          await offlineStorage.updatePendingOperation(operation.id, patch);
          setProcessedOps((p) => p + 1);
        }
      }

      if (successCount > 0 || errorCount > 0) {
        toast({
          variant: 'success',
          title: 'Sincronização concluída',
          description: `${successCount} operação(ões) sincronizada(s), ${errorCount} falharam.`,
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

    if (response.ok) {
      const created = await response.json();
      // If server assigned a different ID, update local cache
      try {
        if (created && created.id && created.id !== operation.data.id) {
          // remove temporary local bale (if exists) and add the server one
          await offlineStorage.addBaleLocally(created);
        }
      } catch (err) {
        console.warn('Não foi possível reconciliar bale localmente:', err);
      }
      return;
    }

    // Handle common HTTP errors
    if (response.status === 409) {
      // Already exists on server: fetch server record and reconcile
      try {
        const encoded = encodeURIComponent(operation.data.id);
        const getResp = await fetch(`/api/bales/${encoded}`, { headers: getAuthHeaders() });
        if (getResp.ok) {
          const serverBale = await getResp.json();
          await offlineStorage.addBaleLocally(serverBale);
        }
      } catch (err) {
        console.warn('Erro ao recuperar bale existente para reconciliar:', err);
      }
      // treat as success and remove pending op
      return;
    }

    // Other errors: throw to let caller increment attempts
    throw new Error(`Failed to create bale: ${response.status} ${response.statusText}`);
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
    if (response.ok) {
      return;
    }

    // Conflict or not found handling
    if (response.status === 404) {
      // Bale not found on server — remove local cached bale and treat as failed
      try {
        await offlineStorage.removePendingOperation(operation.id);
        // also remove local cached bale if present
        // best-effort: attempt to delete from bales store
        // (we don't have a deleteBale method; use get+put approach is heavy, so skip)
      } catch (err) {
        console.warn('Erro ao limpar bale local após 404:', err);
      }
      throw new Error('Bale not found on server');
    }

    if (response.status === 409) {
      // Conflict — fetch server bale to see state
      try {
        const getResp = await fetch(`/api/bales/${encodedId}`, { headers: getAuthHeaders() });
        if (getResp.ok) {
          const serverBale = await getResp.json();
          if (serverBale.status === operation.data.status) {
            // status already applied on server, treat as success
            return;
          } else {
            // server has different status — mark operation failed for manual review
            throw new Error('Conflict: server has a different status');
          }
        }
      } catch (err) {
        console.warn('Erro ao recuperar bale para resolver conflito:', err);
      }
    }

    throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
  };

  return {
    isSyncing,
    isOnline,
    totalOps,
    processedOps,
    failedOps,
    progress: totalOps > 0 ? Math.round((processedOps / totalOps) * 100) : 0,
    syncAllPendingOperations,
  };
}
