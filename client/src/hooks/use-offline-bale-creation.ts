import { useMutation } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offline-storage';
import { queryClient } from '@/lib/queryClient';
import { useToast } from './use-toast';
import type { Bale } from '@shared/schema';

interface CreateBaleData {
  id: string;
  safra: string;
  talhao: string;
  numero: number;
}

interface CreateBatchData {
  safra: string;
  talhao: string;
  quantidade: number;
}

export function useOfflineBaleCreation() {
  const { toast } = useToast();

  const createBale = useMutation({
    mutationFn: async (bale: CreateBaleData) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Tentar criar online primeiro
        try {
          const response = await fetch('/api/bales', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(bale),
          });

          if (!response.ok) {
            throw new Error('Failed to create bale');
          }

          const result = await response.json();
          return result;
        } catch (error) {
          // Se falhar online, salvar offline
          console.warn('⚠️ Falha ao criar online, salvando offline:', error);
          return saveBaleOffline(bale);
        }
      } else {
        // Salvar offline diretamente
        return saveBaleOffline(bale);
      }
    },
    onSuccess: (data, bale) => {
      if (data.offline) {
        toast({
          variant: 'default',
          title: 'Fardo salvo localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else {
        toast({
          variant: 'success',
          title: 'Fardo criado',
          description: `Fardo ${bale.id} criado com sucesso.`,
        });
      }

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar fardo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  const createBatch = useMutation({
    mutationFn: async (data: CreateBatchData) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          const response = await fetch('/api/bales/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error('Failed to create batch');
          }

          const result = await response.json();
          return result;
        } catch (error) {
          console.warn('⚠️ Falha ao criar lote online, salvando offline:', error);
          return saveBatchOffline(data);
        }
      } else {
        return saveBatchOffline(data);
      }
    },
    onSuccess: (data, variables) => {
      if (data.offline) {
        toast({
          variant: 'default',
          title: 'Lote salvo localmente',
          description: `${variables.quantidade} fardo(s) serão sincronizados quando houver conexão.`,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Lote criado',
          description: `${variables.quantidade} fardo(s) criado(s) com sucesso.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar lote',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  return {
    createBale,
    createBatch,
  };
}

async function saveBaleOffline(bale: CreateBaleData) {
  const operationId = crypto.randomUUID();

  await offlineStorage.savePendingOperation({
    type: 'create',
    data: bale,
  });

  // Adicionar ao cache local para aparecer na UI
  const localBale: Partial<Bale> = {
    id: bale.id,
    safra: bale.safra,
    talhao: bale.talhao,
    numero: bale.numero,
    status: 'campo',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'offline-user',
  };

  await offlineStorage.addBaleLocally(localBale as Bale);

  return { offline: true, id: operationId };
}

async function saveBatchOffline(data: CreateBatchData) {
  const operations = [];

  for (let i = 0; i < data.quantidade; i++) {
    const operationId = crypto.randomUUID();

    const baleData: CreateBatchData = {
      safra: data.safra,
      talhao: data.talhao,
      quantidade: 1, // Cada operação cria 1 fardo
    };

    await offlineStorage.savePendingOperation({
      type: 'create',
      data: baleData,
    });

    operations.push(operationId);
  }

  return { offline: true, operations };
}
