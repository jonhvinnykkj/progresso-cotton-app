import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/api-config';

export interface TalhaoStats {
  talhao: string;
  totalFardos: number;
  produtividade: number; // fardos/hectare
  area: number;
  ultimoFardo?: {
    data: string;
    numero: string;
  };
  status: 'em_colheita' | 'concluido' | 'nao_iniciado';
  metaFardos?: number;
  progresso?: number; // percentual
  campo: number;
  patio: number;
  beneficiado: number;
}

export interface TalhaoStatsMap {
  [talhao: string]: TalhaoStats;
}

async function fetchTalhaoStats(safra: string): Promise<TalhaoStatsMap> {
  const url = API_URL ? `${API_URL}/api/bales/stats-by-talhao?safra=${safra}` : `/api/bales/stats-by-talhao?safra=${safra}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch talhao stats');
  }
  return response.json();
}

export function useTalhaoStats(safra: string) {
  return useQuery({
    queryKey: ['talhao-stats', safra],
    queryFn: () => fetchTalhaoStats(safra),
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });
}
