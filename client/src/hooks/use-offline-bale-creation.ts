import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from './use-toast';
import { API_URL } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/api-client';

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

  const createSingle = useMutation({
    mutationFn: async (data: CreateBaleData) => {
      // Sempre criar online - sem fallback offline
      const url = API_URL ? `${API_URL}/api/bales` : '/api/bales';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create bale');
      }

      return await response.json();
    },
    onSuccess: (data, bale) => {
      toast({
        variant: 'success',
        title: 'Fardo criado',
        description: `Fardo ${bale.id} criado com sucesso.`,
      });

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar fardo',
        description: error instanceof Error ? error.message : 'Verifique sua conexão com a internet.',
      });
    },
  });

  const createBatch = useMutation({
    mutationFn: async (data: CreateBatchData) => {
      // Sempre criar online - sem fallback offline
      const url = API_URL ? `${API_URL}/api/bales/batch` : '/api/bales/batch';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create batch');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        variant: 'success',
        title: 'Lote criado',
        description: `${variables.quantidade} fardo(s) criado(s) com sucesso. Agora você pode imprimir as etiquetas.`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales/stats'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar lote',
        description: error instanceof Error ? error.message : 'Verifique sua conexão com a internet.',
      });
    },
  });

  return {
    createBale: createSingle,
    createBatch,
  };
}
