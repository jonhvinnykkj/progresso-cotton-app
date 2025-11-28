import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
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
import {
  Loader2,
  Trash2,
  AlertTriangle,
  Bell,
  ArrowLeft,
  Sparkles,
  Wheat,
  CheckCircle,
  Info,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import logoFavicon from "/favicon.png";
import { SafraConfig } from "@/components/safra-config";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, selectedRole } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (selectedRole !== "superadmin") {
    return <Redirect to="/dashboard" />;
  }

  const handleDeleteAllBales = async () => {
    setIsDeleting(true);
    try {
      const response = await apiRequest("DELETE", "/api/bales/all", {
        confirm: "DELETE_ALL_BALES",
      });

      const data = (await response.json()) as { message?: string; deletedCount: number };

      toast({
        variant: "success",
        title: "Fardos deletados",
        description: data.message || `${data.deletedCount} fardo(s) deletado(s) com sucesso`,
      });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/bales' || key === '/api/bales/stats' || key === '/api/bales/stats-by-talhao';
        }
      });

      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao deletar fardos",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Page>
      <PageContent className="max-w-3xl space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 via-transparent to-primary/5" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <img src={logoFavicon} alt="Cotton" className="h-10 w-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-neon-orange flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">
                    <span className="gradient-text">Configurações</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Administrador: {user?.username}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl border-border/50 hover:border-primary/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </div>

        {/* Configuração de Safras */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Wheat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Configuração de Safras</h2>
                <p className="text-sm text-muted-foreground">
                  Configure safras e importe talhões de algodão via shapefile
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <SafraConfig />
          </div>
        </div>

        {/* How It Works */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Como funciona</h2>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {[
              "Crie uma safra e faça upload do shapefile do plano de plantio",
              "Selecione quais talhões são de algodão - a área é calculada automaticamente",
              "Ative a safra para que ela seja a padrão em todas as operações",
              "Os talhões configurados aparecerão nas estatísticas e relatórios",
            ].map((text, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border/30">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications (superadmin only) */}
        {user?.roles && JSON.parse(user.roles).includes("superadmin") && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="relative p-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                  <Bell className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Notificações do Sistema</h2>
                  <p className="text-sm text-muted-foreground">
                    Envie avisos personalizados para todos os usuários
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Funcionalidade em desenvolvimento</p>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="glass-card rounded-2xl overflow-hidden border border-destructive/30">
          <div className="relative p-5 border-b border-destructive/30">
            <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-destructive">Zona de Perigo</h2>
                <p className="text-sm text-muted-foreground">
                  Ações irreversíveis que afetam permanentemente os dados do sistema
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Deletar Todos os Fardos */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-5 border border-destructive/30 rounded-xl bg-destructive/5">
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-base flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
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
                className="shrink-0 h-11 rounded-xl px-6 font-semibold"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            </div>

          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent
            data-testid="dialog-confirm-delete"
            className="rounded-2xl glass-card border-destructive/50"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2.5 rounded-xl bg-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-destructive">Confirmar Exclusão</span>
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-2">
                  <p className="font-semibold text-foreground">
                    Você está prestes a deletar TODOS os fardos do banco de dados de produção.
                  </p>
                  <p className="text-muted-foreground">
                    Esta ação é <strong className="text-destructive">PERMANENTE</strong> e{" "}
                    <strong className="text-destructive">IRREVERSÍVEL</strong>.
                  </p>
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                    <p className="text-destructive font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Tem certeza que deseja continuar?
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel
                disabled={isDeleting}
                data-testid="button-cancel-delete"
                className="h-11 rounded-xl border-border/50"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllBales}
                disabled={isDeleting}
                data-testid="button-confirm-delete"
                className="h-11 rounded-xl bg-destructive hover:bg-destructive/90"
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

      </PageContent>
    </Page>
  );
}
