import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/api-client';
import { API_URL } from '@/lib/api-config';

export interface Settings {
  defaultSafra: string;
}

async function fetchSettings(): Promise<Settings> {
  const url = API_URL ? `${API_URL}/api/settings/default-safra` : '/api/settings/default-safra';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  const data = await response.json();
  return { defaultSafra: data.value };
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 300000, // 5 minutos
  });
}
