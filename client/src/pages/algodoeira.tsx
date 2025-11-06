import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { useOfflineStatusUpdate } from "@/hooks/use-offline-status-update";
import { Footer } from "@/components/footer";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { cn } from "@/lib/utils";
import {
  ScanLine,
  Building,
  LogOut,
  Loader2,
  CheckCircle,
  Wheat,
  Hash,
  CheckCircle2,
  Keyboard,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoProgresso from "/favicon.png";

export default function Algodoeira() {
  const [, setLocation] = useLocation();
  const { logout, user, selectedRole } = useAuth();
  const { toast } = useToast();
  const { collapsed, shouldShowNavbar } = useSidebar();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBaleId, setManualBaleId] = useState("");
  const [scannedBale, setScannedBale] = useState<Bale | null>(null);
  
  const { updateStatus } = useOfflineStatusUpdate();

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  const processBaleId = async (baleId: string) => {
    // Remove espaços em branco e normaliza o ID
    const normalizedId = baleId.trim();
    
    console.log('🔍 Procurando fardo:', normalizedId);
    console.log('📦 Total de fardos disponíveis:', bales.length);
    console.log('📋 IDs disponíveis:', bales.map(b => b.id).slice(0, 5)); // Mostra primeiros 5
    
    // Busca pelo ID (que é o próprio QR Code)
    const bale = bales.find((b) => b.id === normalizedId);

    if (!bale) {
      console.error('❌ Fardo não encontrado! ID buscado:', normalizedId);
      toast({
        variant: "destructive",
        title: "Fardo não encontrado",
        description: `ID "${normalizedId}" não está cadastrado no sistema.`,
      });
      return;
    }

    console.log('✅ Fardo encontrado:', bale);

    if (bale.status !== "patio") {
      toast({
        variant: "destructive",
        title: "Fardo não disponível",
        description: `Este fardo está com status "${bale.status}". Apenas fardos no pátio podem ser beneficiados.`,
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
        variant: "warning",
        title: "ID inválido",
        description: "Por favor, digite um ID válido.",
      });
      return;
    }

    setShowManualInput(false);
    await processBaleId(manualBaleId.trim());
    setManualBaleId("");
  };

  const handleConfirmBeneficiamento = () => {
    if (!scannedBale || !user?.id) return;

    updateStatus.mutate(
      {
        id: scannedBale.id,
        status: "beneficiado",
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
    <div className="flex min-h-screen bg-gradient-to-br from-green-50/30 via-yellow-50/20 to-green-50/40 dark:from-gray-900 dark:to-gray-800">
      <NavSidebar />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        shouldShowNavbar && (collapsed ? "lg:ml-20" : "lg:ml-64")
      )}>
        {/* Header Mobile apenas */}
        <header className="lg:hidden mobile-header bg-background/95 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
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
                    Beneficiamento
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.username}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 bg-gradient-to-br from-background via-muted/10 to-background pb-20 lg:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
          {!scannedBale ? (
            <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 pb-8 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
                
                <div className="relative">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit mb-3">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white font-bold">
                    Escanear Fardo
                  </CardTitle>
                  <p className="text-white/90 text-sm mt-1">
                    Registre o beneficiamento na algodoeira
                  </p>
                </div>
              </div>
              
              <CardContent className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => setShowScanner(true)}
                    className="w-full h-13 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-base font-bold"
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
                  <Building className="h-5 w-5 text-primary shrink-0" />
                  <AlertDescription className="text-sm leading-snug">
                    <strong className="font-semibold">Pátio → Beneficiado:</strong> Escaneie o QR Code ou digite manualmente o ID do fardo que será beneficiado na algodoeira.
                    Apenas fardos com status "Pátio" podem ser processados.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                </div>
                
                <CardTitle className="text-lg text-white font-bold flex items-center gap-2 relative">
                  <Building className="w-5 h-5 shrink-0" />
                  Confirmar Beneficiamento
                  <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30">
                    Pátio → Beneficiado
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

                  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-green-600">QR Code / ID</p>
                      <p className="text-xs font-mono text-muted-foreground break-all leading-snug">
                        {scannedBale.id}
                      </p>
                    </div>
                  </div>

                  <Alert className="border-2 border-primary/30 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <AlertDescription className="text-sm leading-snug">
                      <strong className="font-bold">Processamento Final:</strong> Ao confirmar, o fardo será
                      marcado como "Beneficiado" e sua rastreabilidade estará completa.
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
                    onClick={handleConfirmBeneficiamento}
                    disabled={updateStatus.isPending}
                    className="flex-1 h-12 rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:scale-[1.02] transition-all duration-300 font-bold"
                    data-testid="button-confirm-beneficiamento"
                  >
                    {updateStatus.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
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
                <li>Escaneie o QR Code do fardo a ser beneficiado</li>
                <li>Verifique os dados do fardo exibidos</li>
                <li>Clique em "Confirmar" para finalizar</li>
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
    </div>
  );
}