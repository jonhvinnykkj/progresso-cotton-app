import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification, CreateNotification } from "@shared/schema";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";

export function useAdminNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Recarrega a cada 1 minuto
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateNotification) => {
      const url = API_URL ? `${API_URL}/api/notifications` : '/api/notifications';
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar notificação");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = API_URL ? `${API_URL}/api/notifications/${id}` : `/api/notifications/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao deletar notificação");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  return {
    notifications,
    isLoading,
    createNotification: createMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
