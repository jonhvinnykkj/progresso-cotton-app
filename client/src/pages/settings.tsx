import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/api-client";
import { Footer } from "@/components/footer";
import { Settings, LogOut, Save, Loader2, Trash2, AlertTriangle } from "lucide-react";
import logoProgresso from "/favicon.png";
import { z } from "zod";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { cn } from "@/lib/utils";

const safraSettingsSchema = z.object({
  safra: z.string().min(1, "Safra é obrigatória"),
});

type SafraSettingsForm = z.infer<typeof safraSettingsSchema>;

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { logout, user, selectedRole } = useAuth();
  const { collapsed } = useSidebar();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verificar se é superadmin
  if (selectedRole !== "superadmin") {
    return <Redirect to="/dashboard" />;
  }

  // Buscar safra padrão atual
  const { data: defaultSafraData, isLoading } = useQuery<{ value: string }>({
    queryKey: ["/api/settings/default-safra"],
  });

  const form = useForm<SafraSettingsForm>({
    resolver: zodResolver(safraSettingsSchema),
    values: {
      safra: defaultSafraData?.value || "",
    },
  });

  // Mutation para atualizar safra padrão
  const updateSafraMutation = useMutation({
    mutationFn: async (data: SafraSettingsForm) => {
      const response = await fetch("/api/settings/default-safra", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ value: data.safra }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar safra");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/default-safra"] });
      toast({
        title: "Configurações salvas",
        description: "Safra padrão atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    },
  });

  const handleSave = (data: SafraSettingsForm) => {
    updateSafraMutation.mutate(data);
  };

  const handleDeleteAllBales = async () => {
    setIsDeleting(true);
    try {
      console.log("🗑️ Iniciando deleção de todos os fardos...");
      console.log("Enviando confirmação: DELETE_ALL_BALES");
      
      const response = await apiRequest("DELETE", "/api/bales/all", {
        confirm: "DELETE_ALL_BALES",
      });

      console.log("Response status:", response.status);
      const data = await response.json() as { message?: string; deletedCount: number };
      console.log("Response data:", data);

      toast({
        title: "Fardos deletados",
        description: data.message || `${data.deletedCount} fardo(s) deletado(s) com sucesso`,
      });

      // Invalidate all bale-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/bales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bales/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bales/stats-by-talhao"] });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error("❌ Erro ao deletar fardos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar fardos",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <>
      <NavSidebar />
      <div className={cn("mobile-page transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        {/* Header modernizado */}
        <header className="mobile-header bg-background/95 backdrop-blur-md border-b shadow-sm lg:sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-3 py-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg shrink-0">
              <img
                src={logoProgresso}
                alt="Grupo Progresso"
                className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                Configurações
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Administrador: {user?.username}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mobile-content bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
          
          {/* Configuração de Safra Padrão */}
          <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 pb-8 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
              </div>
              
              <div className="relative">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white font-bold">
                  Safra Padrão
                </CardTitle>
                <CardDescription className="text-white/90 text-sm mt-1">
                  Defina qual safra será incluída automaticamente em todos os novos fardos
                </CardDescription>
              </div>
            </div>
            
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="safra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary" />
                            Safra
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 2024/2025"
                              data-testid="input-safra"
                              className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all focus:scale-[1.01] duration-300 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Esta safra será automaticamente incluída em todos os QR codes gerados pelos operadores de campo
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-13 rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:scale-[1.02] transition-all duration-300 font-bold text-base"
                      disabled={updateSafraMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSafraMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Salvar Configurações
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card className="shadow-lg border-2 rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-4 p-6">
              <CardTitle className="text-lg font-bold">Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground px-6 pb-6">
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                A safra definida aqui será automaticamente incluída em todos os fardos criados pelos operadores de campo
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Os operadores não precisam informar a safra manualmente - ela virá pré-definida
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                A safra aparecerá nos QR codes e etiquetas dos fardos
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                Você pode alterar a safra padrão a qualquer momento (afetará apenas fardos novos)
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-2 border-destructive shadow-xl rounded-2xl animate-fade-in-up overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 pb-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              </div>
              
              <div className="relative">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white font-bold">
                  Zona de Perigo
                </CardTitle>
                <CardDescription className="text-white/90 text-sm mt-1">
                  Ações irreversíveis que afetam permanentemente os dados do sistema
                </CardDescription>
              </div>
            </div>
            
            <CardContent className="space-y-4 p-6">
              {/* Delete All Bales */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-5 border-2 border-destructive/30 rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 hover:scale-[1.01] transition-all duration-300">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Deletar Todos os Fardos
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Remove permanentemente todos os fardos cadastrados do banco de dados de
                    produção. Esta ação não pode ser desfeita.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="button-delete-all-bales"
                  className="shrink-0 h-11 rounded-xl px-6 font-bold hover:scale-105 transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-confirm-delete" className="rounded-2xl border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl font-bold">
              <div className="p-2 bg-destructive/10 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-base pt-2">
                <p className="font-semibold text-foreground">
                  Você está prestes a deletar TODOS os fardos do banco de dados de produção.
                </p>
                <p>Esta ação é <strong className="text-destructive">PERMANENTE</strong> e <strong className="text-destructive">IRREVERSÍVEL</strong>.</p>
                <p>Todos os fardos cadastrados serão perdidos.</p>
                <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-xl mt-3">
                  <p className="text-destructive font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Tem certeza que deseja continuar?
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              data-testid="button-cancel-delete"
              className="h-11 rounded-xl border-2 hover:scale-105 transition-all duration-300 font-semibold"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllBales}
              disabled={isDeleting}
              data-testid="button-confirm-delete"
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 transition-all duration-300 font-bold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Sim, Deletar Tudo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <Footer />
      </div>
    </>
  );
}
