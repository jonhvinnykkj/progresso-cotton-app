import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { BaleTimeline } from "@/components/bale-timeline";
import { StatusBadge } from "@/components/status-badge";
import type { Bale } from "@shared/schema";
import {
  ArrowLeft,
  Hash,
  Wheat,
  QrCode,
  Calendar,
  Loader2,
  Users,
  Trash2,
  Package,
  Clock,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { getAuthHeaders } from "@/lib/api-client";
import { API_URL } from "@/lib/api-config";
import { Page, PageContent } from "@/components/layout/page";
import logoFavicon from "/favicon.png";

export default function BaleDetails() {
  const [, params] = useRoute("/bale/:id");
  const [, setLocation] = useLocation();
  const { selectedRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const baleId = params?.id ? decodeURIComponent(params.id) : undefined;

  const { data: bale, isLoading } = useQuery<Bale>({
    queryKey: ["/api/bales", baleId],
    queryFn: async () => {
      const url = API_URL
        ? `${API_URL}/api/bales/${encodeURIComponent(baleId!)}`
        : `/api/bales/${encodeURIComponent(baleId!)}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Fardo não encontrado");
      }
      return response.json();
    },
    enabled: !!baleId,
  });

  const { data: users = [] } = useQuery<
    Array<{ id: string; displayName: string }>
  >({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const url = API_URL ? `${API_URL}/api/users` : "/api/users";
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  const getUserDisplayName = (userId: string | null | undefined): string => {
    if (!userId) return "Não identificado";
    const user = users.find((u) => String(u.id) === String(userId));
    return user?.displayName || `Usuário #${userId}`;
  };

  const deleteBaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = API_URL
        ? `${API_URL}/api/bales/${encodeURIComponent(id)}`
        : `/api/bales/${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir fardo");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bales"] });
      toast({
        variant: "success",
        title: "Fardo excluído!",
        description: "O fardo foi removido do sistema com sucesso.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir fardo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Page>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground font-semibold">
              Carregando detalhes do fardo...
            </p>
          </div>
        </PageContent>
      </Page>
    );
  }

  if (!bale) {
    return (
      <Page>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-card p-8 rounded-2xl text-center max-w-md animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-surface mb-4 inline-block">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Fardo não encontrado</h2>
            <p className="text-sm text-muted-foreground mb-6">
              O fardo solicitado não existe no sistema
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full h-12 rounded-xl btn-neon"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </PageContent>
      </Page>
    );
  }

  const getStatusColor = () => {
    switch (bale.status) {
      case "campo":
        return "primary";
      case "patio":
        return "orange";
      case "beneficiado":
        return "cyan";
      default:
        return "primary";
    }
  };

  const statusColor = getStatusColor();

  return (
    <Page>
      <PageContent className="max-w-3xl space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              statusColor === "primary"
                ? "from-primary/10"
                : statusColor === "orange"
                  ? "from-neon-orange/10"
                  : "from-neon-cyan/10"
            } via-transparent to-transparent`}
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <img
                      src={logoFavicon}
                      alt="Cotton"
                      className="h-10 w-10"
                    />
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${
                      statusColor === "primary"
                        ? "bg-primary"
                        : statusColor === "orange"
                          ? "bg-neon-orange"
                          : "bg-neon-cyan"
                    }`}
                  >
                    <Sparkles className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold">
                    Detalhes do Fardo
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Rastreabilidade completa
                  </p>
                </div>
              </div>

              <StatusBadge status={bale.status} size="lg" />
            </div>

            {selectedRole === "superadmin" && (
              <div className="flex justify-end pt-3 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Fardo
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Informações Básicas</h2>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Número</span>
                </div>
                <p
                  className="text-3xl font-display font-bold"
                  data-testid="text-numero"
                >
                  {bale.numero}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Wheat className="w-4 h-4 text-accent" />
                  <span className="font-semibold">Talhão</span>
                </div>
                <p
                  className="text-3xl font-display font-bold"
                  data-testid="text-talhao"
                >
                  {bale.talhao}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <QrCode className="w-4 h-4 text-primary" />
                <span className="font-semibold">ID / QR Code</span>
              </div>
              <p
                className="font-mono text-sm bg-background/50 p-3 rounded-lg break-all border border-border/30"
                data-testid="text-qrcode"
              >
                {bale.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
              <div className="p-3 rounded-xl bg-surface border border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-semibold">Criado em</span>
                </div>
                <p className="text-sm font-bold">
                  {format(new Date(bale.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-semibold">Última Atualização</span>
                </div>
                <p className="text-sm font-bold">
                  {format(new Date(bale.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Rastreabilidade */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                <Users className="w-5 h-5 text-neon-cyan" />
              </div>
              <h2 className="text-lg font-semibold">
                Histórico de Rastreabilidade
              </h2>
            </div>
          </div>

          <div className="p-5">
            <BaleTimeline bale={bale} getUserDisplayName={getUserDisplayName} />
          </div>
        </div>

        {/* Botão Voltar */}
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          className="w-full h-12 rounded-xl border-border/50 hover:border-primary/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-2xl border-border/50 bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-destructive/20">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-base pt-2">
                <p>
                  Tem certeza que deseja excluir o fardo{" "}
                  <strong className="text-foreground">{bale.id}</strong>?
                </p>
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <p className="text-destructive font-semibold text-sm">
                    Esta ação não pode ser desfeita e todos os dados do fardo
                    serão permanentemente removidos.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="h-11 rounded-xl border-border/50">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteBaleMutation.mutate(bale.id)}
                className="h-11 rounded-xl bg-destructive hover:bg-destructive/90"
                disabled={deleteBaleMutation.isPending}
              >
                {deleteBaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Excluir Fardo"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContent>
    </Page>
  );
}
