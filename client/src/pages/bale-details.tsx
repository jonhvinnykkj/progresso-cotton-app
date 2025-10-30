import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BaleTimeline } from "@/components/bale-timeline";
import type { Bale } from "@shared/schema";
import { ArrowLeft, Hash, Wheat, QrCode, Calendar, Loader2, User, Users, Trash2, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { getAuthHeaders } from "@/lib/api-client";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";

export default function BaleDetails() {
  const [, params] = useRoute("/bale/:id");
  const [, setLocation] = useLocation();
  const { selectedRole } = useAuth();
  const { collapsed } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const baleId = params?.id ? decodeURIComponent(params.id) : undefined;

  const { data: bale, isLoading } = useQuery<Bale>({
    queryKey: ["/api/bales", baleId],
    queryFn: async () => {
      const response = await fetch(`/api/bales/${encodeURIComponent(baleId!)}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Fardo não encontrado");
      }
      return response.json();
    },
    enabled: !!baleId,
  });

  // Fetch users to map IDs to display names
  const { data: users = [] } = useQuery<Array<{ id: string; displayName: string }>>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  // Helper function to get user display name by ID
  const getUserDisplayName = (userId: string | null | undefined): string => {
    if (!userId) return "Não identificado";
    const user = users.find(u => String(u.id) === String(userId));
    return user?.displayName || `Usuário #${userId}`;
  };

  // Mutation para excluir fardo
  const deleteBaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/bales/${encodeURIComponent(id)}`, {
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
      <>
        <NavSidebar />
        <div className={cn("min-h-screen bg-gradient-to-br from-green-50/30 via-yellow-50/20 to-green-50/40 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-green-600" />
            <p className="text-green-700 font-semibold">Carregando detalhes do fardo...</p>
          </div>
        </div>
      </>
    );
  }

  if (!bale) {
    return (
      <>
        <NavSidebar />
        <div className={cn("min-h-screen bg-gradient-to-br from-green-50/30 via-yellow-50/20 to-green-50/40 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
          <Card className="max-w-md shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              </div>
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl w-fit mx-auto mb-3">
                <Hash className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardContent className="pt-6 text-center space-y-4 p-6">
              <div>
                <h2 className="text-xl font-bold">Fardo não encontrado</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  O fardo solicitado não existe no sistema
                </p>
              </div>
              <Button
                onClick={() => setLocation("/dashboard")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <NavSidebar />
      <div className={cn("min-h-screen bg-gradient-to-br from-green-50/30 via-yellow-50/20 to-green-50/40 dark:from-gray-900 dark:to-gray-800 transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        <header className="bg-gradient-to-r from-green-50 via-yellow-50/30 to-green-50 dark:from-gray-900 dark:to-gray-800 border-b-2 border-green-200 dark:border-gray-700 shadow-md">
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <div className="flex flex-col gap-4">
              {/* Top row: Logo + Title */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <img
                    src={logoProgresso}
                    alt="Grupo Progresso"
                    className="h-7 w-7 sm:h-9 sm:w-9 transition-transform hover:scale-110 duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 via-green-500 to-yellow-600 bg-clip-text text-transparent">
                      Detalhes do Fardo
                    </h1>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-shadow ${
                      bale.status === 'campo' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      bale.status === 'patio' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      'bg-gradient-to-r from-green-700 to-green-800'
                    }`}>
                      <Package className="w-3.5 h-3.5" />
                      {bale.status.charAt(0).toUpperCase() + bale.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 font-medium mt-1">
                    Rastreabilidade completa
                  </p>
                </div>
              </div>

              {/* Bottom row: Actions */}
              {selectedRole === "superadmin" && (
                <div className="flex justify-end pt-3 border-t border-green-100 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-2 border-red-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 hover:text-red-700 rounded-xl hover:scale-105 transition-all duration-300 font-bold shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Excluir Fardo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
          {/* Basic Information */}
          <Card className="shadow-xl border-2 border-green-200 rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-yellow-500 p-6 pb-8 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-300 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              </div>

              <div className="relative">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3 shadow-lg">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white font-bold">
                  Informações Básicas
                </CardTitle>
              </div>
            </div>

            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-xl border-2 border-green-300 hover:scale-[1.02] hover:border-yellow-400 transition-all duration-300 shadow-md">
                  <div className="flex items-center gap-2 text-sm text-green-700 mb-2 font-semibold">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <Hash className="w-3.5 h-3.5 text-white" />
                    </div>
                    Número do Fardo
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent" data-testid="text-numero">
                    {bale.numero}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl border-2 border-yellow-300 hover:scale-[1.02] hover:border-green-400 transition-all duration-300 shadow-md">
                  <div className="flex items-center gap-2 text-sm text-yellow-700 mb-2 font-semibold">
                    <div className="p-1.5 bg-yellow-500 rounded-lg">
                      <Wheat className="w-3.5 h-3.5 text-white" />
                    </div>
                    Talhão
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-yellow-700 to-yellow-600 bg-clip-text text-transparent" data-testid="text-talhao">
                    {bale.talhao}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-yellow-50 rounded-xl border-2 border-green-300 hover:border-yellow-400 transition-colors shadow-md">
                <div className="flex items-center gap-2 text-sm text-green-700 mb-3 font-semibold">
                  <div className="p-1.5 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg shadow-md">
                    <QrCode className="w-3.5 h-3.5 text-white" />
                  </div>
                  ID / QR Code
                </div>
                <p className="font-mono text-sm bg-white p-3 rounded-lg break-all border-2 border-green-200" data-testid="text-qrcode">
                  {bale.id}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-green-200">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
                  <div className="flex items-center gap-2 text-xs text-green-700 mb-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Criado em
                  </div>
                  <p className="text-sm font-bold text-green-800">
                    {format(new Date(bale.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
                  <div className="flex items-center gap-2 text-xs text-yellow-700 mb-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Última Atualização
                  </div>
                  <p className="text-sm font-bold text-yellow-800">
                    {format(new Date(bale.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Rastreabilidade com Usuários */}
          <Card className="shadow-xl border-2 border-green-200 rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-yellow-500 p-6 pb-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-yellow-300 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              </div>

              <div className="relative">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3 shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white font-bold flex items-center gap-2">
                  Histórico de Rastreabilidade
                </CardTitle>
              </div>
            </div>

            <CardContent className="p-6">
              <BaleTimeline bale={bale} getUserDisplayName={getUserDisplayName} />
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <Footer />

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl font-bold">
              <div className="p-2 bg-destructive/10 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-base pt-2">
              <p>
                Tem certeza que deseja excluir o fardo <strong className="text-foreground font-bold">{bale.id}</strong>?
              </p>
              <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-xl">
                <p className="text-destructive font-bold text-sm">
                  Esta ação não pode ser desfeita e todos os dados do fardo serão permanentemente removidos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="h-11 rounded-xl border-2 hover:scale-105 transition-all duration-300 font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBaleMutation.mutate(bale.id)}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 hover:scale-105 transition-all duration-300 font-bold"
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
      </div>
    </>
  );
}
