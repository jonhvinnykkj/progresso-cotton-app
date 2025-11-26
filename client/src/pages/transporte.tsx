import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Bale } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/qr-scanner";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStatusUpdate } from "@/hooks/use-offline-status-update";
import { getAuthHeaders } from "@/lib/api-client";
import { API_URL } from "@/lib/api-config";
import { Page, PageContent } from "@/components/layout/page";
import {
  ScanLine,
  Truck,
  Loader2,
  Package,
  AlertCircle,
  Wheat,
  Hash,
  CheckCircle2,
  Keyboard,
  WifiOff,
  LogOut,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoFavicon from "/favicon.png";
export default function Transporte() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBaleId, setManualBaleId] = useState("");
  const [scannedBale, setScannedBale] = useState<Bale | null>(null);

  const { updateStatus } = useOfflineStatusUpdate();
  const isOnline = navigator.onLine;

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  const processBaleId = async (baleId: string) => {
    const normalizedId = baleId.trim().toUpperCase();

    const bale = bales.find((b) => b.id.toUpperCase() === normalizedId);

    if (!bale) {
      try {
        const encodedId = encodeURIComponent(normalizedId);
        const url = API_URL
          ? `${API_URL}/api/bales/${encodedId}`
          : `/api/bales/${encodedId}`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (response.ok) {
          const apiBale = await response.json();
          if (apiBale.status !== "campo") {
            toast({
              variant: "destructive",
              title: "Fardo não disponível",
              description: `Este fardo já está com status "${apiBale.status}". Apenas fardos no campo podem ser transportados.`,
            });
            return;
          }
          setScannedBale(apiBale);
          return;
        }
      } catch (error) {
        console.error("Erro ao buscar fardo na API:", error);
      }

      toast({
        variant: "destructive",
        title: "Fardo não encontrado",
        description: `ID "${normalizedId}" não está cadastrado no sistema.`,
      });
      return;
    }

    if (bale.status !== "campo") {
      toast({
        variant: "destructive",
        title: "Fardo não disponível",
        description: `Este fardo já está com status "${bale.status}". Apenas fardos no campo podem ser transportados.`,
      });
      return;
    }

    setScannedBale(bale);
  };

  const handleScan = async (qrCode: string) => {
    setShowScanner(false);
    await processBaleId(qrCode);
  };

  const handleManualSubmit = async () => {
    if (!manualBaleId.trim()) {
      toast({
        variant: "destructive",
        title: "ID inválido",
        description: "Por favor, digite um ID válido.",
      });
      return;
    }

    setShowManualInput(false);
    await processBaleId(manualBaleId.trim());
    setManualBaleId("");
  };

  const handleConfirmTransport = () => {
    if (!scannedBale || !user?.id) return;

    updateStatus.mutate(
      {
        id: scannedBale.id,
        status: "patio",
        userId: String(user.id),
      },
      {
        onSuccess: () => {
          setScannedBale(null);
        },
      }
    );
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <Page>
      <PageContent className="max-w-2xl space-y-6">
        {/* Hero Header - Cotton Dark Premium */}
        <div className="relative overflow-hidden rounded-2xl glass-card">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/20 via-neon-orange/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-orange/15 via-transparent to-transparent" />

          {/* Animated dots pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 h-2 w-2 rounded-full bg-neon-orange animate-pulse" />
            <div className="absolute top-12 right-20 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-8 right-12 h-1 w-1 rounded-full bg-neon-orange animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Brand and title */}
              <div className="flex items-start gap-4">
                {/* Cotton Logo */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-neon-orange to-neon-orange/80 flex items-center justify-center shadow-glow-orange overflow-hidden">
                    <img src={logoFavicon} alt="Cotton" className="h-12 w-12 object-contain" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <Truck className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-neon-orange" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Cotton App
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
                    <span className="bg-gradient-to-r from-neon-orange to-primary bg-clip-text text-transparent">
                      Transporte
                    </span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-orange/20 text-neon-orange">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-orange mr-1.5 animate-pulse" />
                      {user?.username || "Operador"}
                    </span>
                    {!isOnline && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full"
                      >
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-xl border-border/50 hover:border-destructive/50 hover:text-destructive shrink-0"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>

          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
        </div>

        {/* Alerta de modo offline */}
        {!isOnline && (
          <Alert className="border border-amber-500/30 bg-amber-500/10 rounded-xl animate-fade-in-up">
            <WifiOff className="h-5 w-5 text-amber-500" />
            <AlertDescription className="text-sm text-amber-200">
              <strong className="font-bold">Modo Offline:</strong> Trabalhando
              com dados salvos localmente. As atualizações serão sincronizadas
              quando você voltar online.
            </AlertDescription>
          </Alert>
        )}

        {!scannedBale ? (
          /* Scanner Card */
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="relative p-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/20 via-neon-orange/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neon-orange/20">
                  <Truck className="w-5 h-5 text-neon-orange" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Escanear Fardo</h2>
                  <p className="text-sm text-muted-foreground">
                    Campo → Pátio via QR ou ID
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Status flow indicator */}
              <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-surface/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    Campo
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-neon-orange animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-neon-orange/20">
                    <Truck className="w-4 h-4 text-neon-orange" />
                  </div>
                  <span className="text-sm font-semibold text-neon-orange">
                    Pátio
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setShowScanner(true)}
                  className="w-full h-14 rounded-xl bg-neon-orange hover:bg-neon-orange/90 text-black font-semibold text-base shadow-glow-orange"
                  data-testid="button-scan-qr"
                >
                  <ScanLine className="w-5 h-5 mr-2" />
                  Escanear QR Code
                </Button>

                <Button
                  onClick={() => setShowManualInput(true)}
                  variant="outline"
                  className="w-full h-14 rounded-xl text-base font-semibold border-border/50 hover:border-neon-orange/50 hover:text-neon-orange"
                  data-testid="button-manual-input"
                >
                  <Keyboard className="w-5 h-5 mr-2" />
                  Digitar Manualmente
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-neon-orange/10 border border-neon-orange/20">
                <div className="flex gap-3 items-start">
                  <Package className="h-5 w-5 shrink-0 text-neon-orange mt-0.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    <strong className="text-neon-orange">Campo → Pátio:</strong>{" "}
                    escaneie o QR Code ou digite manualmente o ID. Apenas fardos
                    com status "Campo" podem ser movimentados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation Card */
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="relative p-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/20 via-neon-orange/10 to-transparent" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-neon-orange/20">
                    <Truck className="w-5 h-5 text-neon-orange" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Confirmar Transporte
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Revise e confirme para enviar ao pátio
                    </p>
                  </div>
                </div>
                <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30 rounded-full">
                  Campo → Pátio
                </Badge>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Status atual */}
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Status Atual:
                </span>
                <StatusBadge status={scannedBale.status} />
              </div>

              {/* Dados do fardo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-surface border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                    <Hash className="w-3.5 h-3.5" />
                    Número
                  </p>
                  <p
                    className="font-bold text-xl text-foreground"
                    data-testid="text-bale-numero"
                  >
                    {scannedBale.numero}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-surface border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                    <Wheat className="w-3.5 h-3.5" />
                    Talhão
                  </p>
                  <p
                    className="font-bold text-xl text-foreground"
                    data-testid="text-bale-talhao"
                  >
                    {scannedBale.talhao}
                  </p>
                </div>
              </div>

              {/* QR Code / ID */}
              <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-primary">
                    QR Code / ID
                  </p>
                  <p className="text-xs font-mono text-muted-foreground break-all leading-snug">
                    {scannedBale.id}
                  </p>
                </div>
              </div>

              {/* Alerta */}
              <Alert className="border border-destructive/30 bg-destructive/10 rounded-xl">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <AlertDescription className="text-sm text-foreground/80">
                  <strong className="font-bold text-destructive">
                    Atenção:
                  </strong>{" "}
                  Ao confirmar, o fardo será marcado como "Pátio" e não poderá
                  ser revertido para "Campo".
                </AlertDescription>
              </Alert>

              {/* Botões de ação */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setScannedBale(null)}
                  className="flex-1 h-12 rounded-xl border-border/50 font-semibold"
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmTransport}
                  disabled={updateStatus.isPending}
                  className="flex-1 h-12 rounded-xl bg-neon-orange hover:bg-neon-orange/90 text-black font-bold shadow-glow-orange"
                  data-testid="button-confirm-transport"
                >
                  {updateStatus.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {isOnline ? "Atualizando..." : "Salvando..."}
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="glass-card p-5 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-orange" />
            Instruções
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
            <li>Escaneie o QR Code do fardo a ser transportado</li>
            <li>Verifique os dados do fardo exibidos</li>
            <li>Clique em "Confirmar" para atualizar o status</li>
          </ol>
        </div>
      </PageContent>

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Manual Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neon-orange/20">
                <Keyboard className="w-5 h-5 text-neon-orange" />
              </div>
              Digitar ID do Fardo
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Digite o ID do fardo que você deseja processar. Você pode usar o
              ID completo ou o código QR.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="bale-id"
                className="text-sm font-medium text-foreground/80"
              >
                ID do Fardo
              </label>
              <Input
                id="bale-id"
                placeholder="Ex: S25/26-T1B-00001"
                value={manualBaleId}
                onChange={(e) => setManualBaleId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
                data-testid="input-manual-bale-id"
                autoFocus
                className="h-12 rounded-xl bg-surface border-border/50 font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowManualInput(false);
                setManualBaleId("");
              }}
              className="flex-1 h-11 rounded-xl border-border/50"
              data-testid="button-cancel-manual"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={!manualBaleId.trim()}
              className="flex-1 h-11 rounded-xl bg-neon-orange hover:bg-neon-orange/90 text-black font-semibold"
              data-testid="button-submit-manual"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Buscar Fardo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
