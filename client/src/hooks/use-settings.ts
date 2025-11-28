import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/api-config';

export interface Safra {
  id: string;
  nome: string;
  descricao: string | null;
  isAtiva: number;
  createdAt: string;
}

export interface TalhaoSafra {
  id: string;
  safraId: string;
  nome: string;
  hectares: string;
  geometry: string;
  centroid: string | null;
  cultura: string;
}

export interface Settings {
  defaultSafra: string;
  safraAtiva: Safra | null;
  talhoesSafra: TalhaoSafra[];
}

async function fetchSafraAtiva(): Promise<Safra | null> {
  const url = API_URL ? `${API_URL}/api/safras/ativa` : '/api/safras/ativa';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function fetchTalhoesSafra(safraId: string): Promise<TalhaoSafra[]> {
  const url = API_URL ? `${API_URL}/api/safras/${safraId}/talhoes` : `/api/safras/${safraId}/talhoes`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function fetchSettings(): Promise<Settings> {
  // Buscar safra ativa do novo sistema
  const safraAtiva = await fetchSafraAtiva();

  // Se existe safra ativa, buscar os talhões
  let talhoesSafra: TalhaoSafra[] = [];
  if (safraAtiva) {
    talhoesSafra = await fetchTalhoesSafra(safraAtiva.id);
  }

  return {
    defaultSafra: safraAtiva?.nome || '',
    safraAtiva,
    talhoesSafra,
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings', 'safra-ativa'],
    queryFn: fetchSettings,
    staleTime: 300000, // 5 minutos
  });
}

// Hook adicional para buscar apenas a safra ativa (mais leve)
export function useSafraAtiva() {
  return useQuery({
    queryKey: ['/api/safras/ativa'],
    queryFn: fetchSafraAtiva,
    staleTime: 300000,
  });
}

// Hook para buscar talhões de uma safra específica
export function useTalhoesSafra(safraId: string | undefined) {
  return useQuery({
    queryKey: [`/api/safras/${safraId}/talhoes`],
    queryFn: () => safraId ? fetchTalhoesSafra(safraId) : Promise.resolve([]),
    enabled: !!safraId,
    staleTime: 300000,
  });
}
