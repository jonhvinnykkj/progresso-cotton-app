import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/api-client';

export interface Settings {
  defaultSafra: string;
}

async function fetchSettings(): Promise<Settings> {
  const response = await fetch('/api/settings/default-safra', {
    headers: getAuthHeaders(),
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
