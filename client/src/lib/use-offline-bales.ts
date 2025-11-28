import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Bale, UpdateBaleStatus } from "@shared/schema";
import { offlineStorage } from "./offline-storage";
import { queryClient, apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "./api-client";
import { API_URL } from "./api-config";

export function useOfflineBales() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingUpdates();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "warning",
        title: "Modo Offline",
        description: "Você está offline. Os dados serão sincronizados quando voltar online.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch bales with offline support
  const { data: bales = [], isLoading, error } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    queryFn: async () => {
      if (!isOnline) {
        return await offlineStorage.getAllBales();
      }

      try {
        const url = API_URL ? `${API_URL}/api/bales` : "/api/bales";
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        await offlineStorage.saveBales(data);
        return data;
      } catch {
        return await offlineStorage.getAllBales();
      }
    },
    staleTime: isOnline ? 30000 : Infinity, // 30s when online, never stale offline
    gcTime: Infinity, // Keep in memory
    retry: isOnline ? 3 : 0, // Retry only when online
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
  });

  // Update bale status with offline support
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBaleStatus }) => {
      if (!isOnline) {
        await offlineStorage.updateBaleStatus(id, data.status);
        
        // Update local query cache immediately
        queryClient.setQueryData(["/api/bales"], (old: Bale[] = []) => {
          return old.map((bale) =>
            bale.id === id
              ? { ...bale, status: data.status }
              : bale
          );
        });
        
        return { id, ...data, _offlineUpdate: true } as any;
      }

      // Update via API
      const encodedId = encodeURIComponent(id);
      return apiRequest("PATCH", `/api/bales/${encodedId}/status`, data);
    },
    onSuccess: (data, variables) => {
      if ((data as any)._offlineUpdate) {
        // Offline update - show toast
        toast({
          variant: "info",
          title: "Atualização salva localmente",
          description: "Será sincronizada quando você voltar online.",
        });
      } else {
        // Online update successful
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key === '/api/bales' || key === '/api/bales/stats' || key === '/api/bales/stats-by-talhao';
          }
        });
        toast({
          variant: "success",
          title: "Status atualizado",
          description: "Fardo atualizado com sucesso.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message || "Tente novamente.",
      });
    },
  });

  // Sync pending updates when back online
  const syncPendingUpdates = async () => {
    if (!isOnline || syncInProgress) return;

    setSyncInProgress(true);
    try {
      const pending = await offlineStorage.getPendingUpdates();

      if (pending.length === 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/bales"] });
        setSyncInProgress(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const update of pending) {
        try {
          const encodedId = encodeURIComponent(update.id);
          await apiRequest("PATCH", `/api/bales/${encodedId}/status`, {
            status: update.status as any,
          });
          await offlineStorage.clearPendingUpdate(update.id);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          variant: "success",
          title: "Sincronização concluída",
          description: `${successCount} atualizações sincronizadas${errorCount > 0 ? `, ${errorCount} falharam` : ""}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bales"] });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar todas as atualizações.",
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  return {
    bales,
    isLoading,
    error,
    isOnline,
    syncInProgress,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    syncPendingUpdates,
  };
}
