import { useMutation } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offline-storage';
import { queryClient } from '@/lib/queryClient';
import { useToast } from './use-toast';
import type { Bale } from '@shared/schema';
import { TALHOES_INFO } from '@shared/talhoes';

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

      // Basic offline validation
      if (!bale.safra || !bale.talhao) {
        throw new Error('Safra e talhão são obrigatórios');
      }
      const talhaoExists = TALHOES_INFO.some(t => t.nome === bale.talhao);
      if (!talhaoExists) {
        throw new Error('Talhão inválido');
      }

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
          description: `${variables.quantidade} fardo(s) serão sincronizados quando houver conexão. Agora você pode imprimir as etiquetas.`,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Lote criado',
          description: `${variables.quantidade} fardo(s) criado(s) com sucesso. Agora você pode imprimir as etiquetas.`,
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

  // Validate minimal fields before saving offline
  if (!bale.safra || !bale.talhao) {
    throw new Error('Safra e talhão são obrigatórios');
  }
  const talhaoExists = TALHOES_INFO.some(t => t.nome === bale.talhao);
  if (!talhaoExists) {
    throw new Error('Talhão inválido');
  }

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
  // Basic validations
  if (!data.safra || !data.talhao) throw new Error('Safra e talhão são obrigatórios');
  const talhaoExists = TALHOES_INFO.some(t => t.nome === data.talhao);
  if (!talhaoExists) throw new Error('Talhão inválido');
  if (data.quantidade < 1 || data.quantidade > 1000) throw new Error('Quantidade inválida');

  const createdBales: Bale[] = [];

  for (let i = 0; i < data.quantidade; i++) {
    // Incrementar contador local para obter próximo número
    const nextNumber = await offlineStorage.incrementCounter(data.safra, data.talhao);
    
    // Formatar número com 5 dígitos
    const formattedNumber = String(nextNumber).padStart(5, '0');
    
    // Gerar ID do fardo
    const baleId = `${data.safra}-${data.talhao}-${formattedNumber}`;
    
    const baleData: CreateBaleData = {
      id: baleId,
      safra: data.safra,
      talhao: data.talhao,
      numero: nextNumber,
    };

    await offlineStorage.savePendingOperation({
      type: 'create',
      data: baleData,
    });

    // Adicionar ao cache local para aparecer na UI
    const localBale: Bale = {
      id: baleId,
      safra: data.safra,
      talhao: data.talhao,
      numero: nextNumber,
      status: 'campo',
      statusHistory: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'offline-user',
      updatedBy: null,
      transportedAt: null,
      transportedBy: null,
      processedAt: null,
      processedBy: null,
    };

    await offlineStorage.addBaleLocally(localBale);
    createdBales.push(localBale);
  }

  console.log(`✅ ${data.quantidade} fardos criados offline com numeração sequencial`);
  
  // Retornar no mesmo formato que o backend retorna (array de bales)
  return { 
    offline: true, 
    bales: createdBales,
    count: createdBales.length
  };
}
