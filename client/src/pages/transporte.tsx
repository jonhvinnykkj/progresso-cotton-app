import { useState } from "react";
import { useLocation } from "wouter";
import type { Bale } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useOfflineBales } from "@/lib/use-offline-bales";
import { Footer } from "@/components/footer";
import { getAuthHeaders } from "@/lib/api-client";
import {
  ScanLine,
  Truck,
  LogOut,
  Loader2,
  Package,
  AlertCircle,
  Wheat,
  Hash,
  CheckCircle2,
  Keyboard,
  WifiOff,
  Wifi,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoProgresso from "/favicon.png";

export default function Transporte() {
  const [, setLocation] = useLocation();
  const { logout, user, selectedRole } = useAuth();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBaleId, setManualBaleId] = useState("");
  const [scannedBale, setScannedBale] = useState<Bale | null>(null);

  const {
    bales,
    isLoading,
    isOnline,
    syncInProgress,
    updateStatus,
    isUpdating,
    syncPendingUpdates,
  } = useOfflineBales();

  const processBaleId = async (baleId: string) => {
    // Remove espaços em branco e normaliza o ID
    const normalizedId = baleId.trim().toUpperCase();
    
    console.log('🔍 DEBUG TRANSPORTE - ID do QR Code:', {
      original: baleId,
      normalizado: normalizedId,
      length: normalizedId.length,
      chars: normalizedId.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
    });
    console.log('📦 Total de fardos disponíveis:', bales.length);
    console.log('📋 Primeiros 10 IDs no sistema:', bales.map(b => b.id).slice(0, 10));
    console.log('📋 Status dos fardos:', bales.map(b => ({ id: b.id, status: b.status })).slice(0, 5));
    
    // Busca pelo ID (que é o próprio QR Code) - case insensitive
    const bale = bales.find((b) => b.id.toUpperCase() === normalizedId);

    if (!bale) {
      console.error('❌ FARDO NÃO ENCONTRADO!');
      console.error('ID buscado:', normalizedId);
      console.error('Todos os IDs no sistema:', bales.map(b => b.id));
      
      // Tenta buscar direto na API como fallback
      try {
        const encodedId = encodeURIComponent(normalizedId);
        const response = await fetch(`/api/bales/${encodedId}`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const apiBale = await response.json();
          console.log('✅ Fardo encontrado direto na API:', apiBale);
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
        console.error('Erro ao buscar fardo na API:', error);
      }
      
      toast({
        variant: "destructive",
        title: "Fardo não encontrado",
        description: `ID "${normalizedId}" não está cadastrado no sistema.`,
      });
      return;
    }

    console.log('✅ Fardo encontrado:', bale);

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
    if (!scannedBale) return;

    updateStatus(
      {
        id: scannedBale.id,
        data: {
          status: "patio",
          userId: user?.id ? String(user.id) : undefined,
        },
      },
      {
        onSuccess: () => {
          // Close modal after successful update
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
    <div className="mobile-page pb-20 lg:pb-0">
      {/* Header moderno com gradiente */}
      <header className="mobile-header bg-background/95 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg shrink-0">
                <img
                  src={logoProgresso}
                  alt="Grupo Progresso"
                  className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold truncate bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                  Transporte
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.username}
                  </p>
                  {!isOnline && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 animate-pulse">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                  {syncInProgress && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Sync
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(selectedRole === "admin" || selectedRole === "superadmin") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="shrink-0 transition-all hover:scale-105 duration-300 border-2 border-green-300 hover:border-yellow-400 hover:bg-yellow-50 rounded-xl font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="h-9 shrink-0 hover:scale-105 transition-transform duration-300"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal mobile-first */}
      <main className="mobile-content bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
          
          {/* Alerta de modo offline modernizado */}
          {!isOnline && (
            <Alert className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl animate-fade-in-up">
              <WifiOff className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong className="font-bold">Modo Offline:</strong> Trabalhando com dados salvos localmente. 
                As atualizações serão sincronizadas quando você voltar online.
              </AlertDescription>
            </Alert>
          )}

          {!scannedBale ? (
            <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-green-500 to-yellow-500 p-6 pb-8 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
                
                <div className="relative">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white font-bold">
                    Escanear Fardo
                  </CardTitle>
                  <p className="text-white/90 text-sm mt-1">
                    Registre o transporte do campo para o pátio
                  </p>
                </div>
              </div>
              
              <CardContent className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => setShowScanner(true)}
                    className="w-full h-13 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-base font-bold"
                    data-testid="button-scan-qr"
                  >
                    <ScanLine className="w-5 h-5 mr-2" />
                    Escanear QR Code
                  </Button>

                  <Button
                    onClick={() => setShowManualInput(true)}
                    variant="outline"
                    className="w-full h-13 rounded-xl border-2 hover:border-primary/50 transition-all hover:scale-[1.02] duration-300 text-base font-semibold"
                    data-testid="button-manual-input"
                  >
                    <Keyboard className="w-5 h-5 mr-2" />
                    Digitar Manualmente
                  </Button>
                </div>

                <Alert className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                  <Package className="h-5 w-5 text-primary shrink-0" />
                  <AlertDescription className="text-sm leading-snug">
                    <strong className="font-semibold">Campo → Pátio:</strong> Escaneie o QR Code ou digite manualmente o ID do fardo que será transportado do campo para o
                    pátio. Apenas fardos com status "Campo" podem ser movimentados.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-green-500 to-yellow-500 p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                </div>
                
                <CardTitle className="text-lg text-white font-bold flex items-center gap-2 relative">
                  <Truck className="w-5 h-5 shrink-0" />
                  Confirmar Transporte
                  <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30">
                    Campo → Pátio
                  </Badge>
                </CardTitle>
              </div>
              
              <CardContent className="space-y-5 p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b-2">
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Status Atual:
                    </span>
                    <StatusBadge status={scannedBale.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 hover:scale-[1.02] transition-transform duration-300">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                        <Hash className="w-3.5 h-3.5" />
                        Número
                      </p>
                      <p className="font-bold text-lg truncate" data-testid="text-bale-numero">
                        {scannedBale.numero}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 hover:scale-[1.02] transition-transform duration-300">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                        <Wheat className="w-3.5 h-3.5" />
                        Talhão
                      </p>
                      <p className="font-bold text-lg truncate" data-testid="text-bale-talhao">
                        {scannedBale.talhao}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-green-600">QR Code / ID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all leading-snug">
                        {scannedBale.id}
                      </p>
                    </div>
                  </div>

                  <Alert variant="destructive" className="border-2 rounded-xl">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <AlertDescription className="text-sm leading-snug">
                      <strong className="font-bold">Atenção:</strong> Ao confirmar, o fardo será marcado como
                      "Pátio" e não poderá ser revertido para "Campo".
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setScannedBale(null)}
                    className="flex-1 h-12 rounded-xl border-2 hover:scale-[1.02] transition-all duration-300 font-semibold"
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmTransport}
                    disabled={isUpdating}
                    className="flex-1 h-12 rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 hover:scale-[1.02] transition-all duration-300 font-bold"
                    data-testid="button-confirm-transport"
                  >
                    {isUpdating ? (
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
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-5 pb-5">
              <h3 className="font-semibold text-sm mb-3">Instruções</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-snug">
                <li>Escaneie o QR Code do fardo a ser transportado</li>
                <li>Verifique os dados do fardo exibidos</li>
                <li>Clique em "Confirmar" para atualizar o status</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>

      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Manual Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent data-testid="dialog-manual-input">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Digitar ID do Fardo
            </DialogTitle>
            <DialogDescription>
              Digite o ID do fardo que você deseja processar. Você pode usar o ID completo ou o código QR.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="bale-id" className="text-sm font-medium">
                ID do Fardo
              </label>
              <Input
                id="bale-id"
                placeholder="Ex: fZZWULwYD1NY"
                value={manualBaleId}
                onChange={(e) => setManualBaleId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
                data-testid="input-manual-bale-id"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowManualInput(false);
                setManualBaleId("");
              }}
              data-testid="button-cancel-manual"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={!manualBaleId.trim()}
              data-testid="button-submit-manual"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Buscar Fardo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />
    </div>
  );
}