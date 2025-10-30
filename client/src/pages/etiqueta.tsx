import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Printer, QrCode, ArrowLeft, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import logoProgresso from "/favicon.png";
import type { Bale } from "@shared/schema";
import { Footer } from "@/components/footer";

export default function Etiqueta() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const baleIdsParam = searchParams.get("baleIds");
  const baleIds = baleIdsParam ? baleIdsParam.split(',') : [];
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrDataUrls, setQrDataUrls] = useState<Map<string, string>>(new Map());
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Buscar dados dos fardos (forçar refetch para garantir dados atualizados)
  const { data: allBales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    refetchOnMount: "always", // Sempre buscar dados frescos ao montar
    staleTime: 0, // Considerar dados sempre stale
  });

  const bales = allBales.filter(b => baleIds.includes(b.id));

  // Debug: log para verificar se os fardos foram encontrados
  useEffect(() => {
    console.log("Etiqueta - IDs procurados:", baleIds);
    console.log("Etiqueta - Total fardos no sistema:", allBales.length);
    console.log("Etiqueta - Fardos encontrados:", bales.length);
    console.log("Etiqueta - Fardos encontrados (detalhes):", bales.map(b => ({ id: b.id })));
  }, [baleIds, allBales, bales]);

  // Gerar QR Codes quando os fardos forem carregados
  useEffect(() => {
    if (bales.length > 0) {
      generateQRCodes();
    }
  }, [bales]);

  const generateQRCodes = async () => {
    const newQrDataUrls = new Map<string, string>();
    
    for (const bale of bales) {
      try {
        // Gerar QR Code base
        const qrDataURL = await QRCode.toDataURL(bale.id, {
          width: 800,
          margin: 1,
          errorCorrectionLevel: "H", // High error correction para suportar o logo no centro
          color: {
            dark: "#106A44", // Verde escuro do Grupo Progresso
            light: "#FFFFFF" // Fundo branco
          }
        });
        
        // Criar canvas para adicionar o logo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          newQrDataUrls.set(bale.id, qrDataURL);
          continue;
        }
        
        // Carregar QR Code no canvas
        const qrImage = new Image();
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve;
          qrImage.onerror = reject;
          qrImage.src = qrDataURL;
        });
        
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;
        ctx.drawImage(qrImage, 0, 0);
        
        // Carregar e desenhar logo no centro
        const logo = new Image();
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
          logo.src = logoProgresso;
        });
        
        // Tamanho do logo (20% do QR Code)
        const logoSize = canvas.width * 0.20;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;
        
        // Desenhar fundo branco com borda para o logo
        const padding = 8;
        const bgSize = logoSize + padding * 2;
        const bgX = (canvas.width - bgSize) / 2;
        const bgY = (canvas.height - bgSize) / 2;
        
        // Fundo branco com sombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgSize, bgSize, 12);
        ctx.fill();
        
        // Borda verde/amarela
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#EAB308'; // Amarelo
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Desenhar logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        
        // Converter canvas para data URL
        const finalQrCode = canvas.toDataURL('image/png');
        newQrDataUrls.set(bale.id, finalQrCode);
      } catch (error) {
        console.error(`Error generating QR for bale ${bale.id}:`, error);
        // Fallback para QR Code simples em caso de erro
        try {
          const fallbackQR = await QRCode.toDataURL(bale.id, {
            width: 800,
            margin: 1,
            errorCorrectionLevel: "H",
          });
          newQrDataUrls.set(bale.id, fallbackQR);
        } catch (fallbackError) {
          console.error(`Fallback QR generation failed for ${bale.id}:`, fallbackError);
        }
      }
    }
    
    setQrDataUrls(newQrDataUrls);
  };

  const handlePrint = () => {
    if (qrDataUrls.size === 0) {
      toast({
        variant: "destructive",
        title: "Etiquetas não disponíveis",
        description: "Aguarde o carregamento das etiquetas",
      });
      return;
    }

    window.print();
  };

  const handleBack = () => {
    setLocation("/campo");
  };

  if (baleIds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </div>
            <CardTitle className="text-xl text-white font-bold">Erro</CardTitle>
          </div>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum fardo selecionado. Volte e tente novamente.
            </p>
            <Button 
              onClick={handleBack} 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-base text-muted-foreground font-semibold">Carregando etiquetas...</p>
        </div>
      </div>
    );
  }

  if (bales.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </div>
            <CardTitle className="text-xl text-white font-bold">Fardos não encontrados</CardTitle>
          </div>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Os fardos selecionados não foram encontrados no sistema.
            </p>
            <Button 
              onClick={handleBack} 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background print:hidden pb-20 lg:pb-0">
        {/* Header modernizado */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  data-testid="button-back"
                  className="shrink-0 hover:scale-110 transition-transform duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg shrink-0">
                  <img
                    src={logoProgresso}
                    alt="Grupo Progresso"
                    className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold truncate bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                    Etiquetas dos Fardos
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {bales.length} {bales.length === 1 ? 'etiqueta' : 'etiquetas'} • {user?.username}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          
          {/* Preview das etiquetas */}
          <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
              </div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white font-bold">
                    Preview das Etiquetas
                  </CardTitle>
                </div>
                <Button
                  onClick={handlePrint}
                  size="lg"
                  data-testid="button-print-labels"
                  disabled={qrDataUrls.size === 0}
                  className="h-12 rounded-xl shadow-lg bg-white text-green-600 hover:bg-white/90 hover:scale-105 transition-all duration-300 font-bold"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Imprimir Todas
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {bales.map((bale, index) => {
                  const qrUrl = qrDataUrls.get(bale.id);
                  
                  return (
                    <div 
                      key={bale.id} 
                      className="border-2 border-primary/20 rounded-xl p-4 space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 hover:scale-[1.02] transition-all duration-300 shadow-md animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {qrUrl ? (
                        <img 
                          src={qrUrl} 
                          alt={`QR Code ${bale.numero}`}
                          className="w-full aspect-square rounded-lg"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />
                      )}
                      
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold">Talhão: {bale.talhao}</p>
                        <p className="text-xl font-bold font-mono text-primary">{bale.numero}</p>
                        {bale.safra && (
                          <p className="text-xs text-muted-foreground font-semibold">Safra: {bale.safra}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Informações */}
          <Card className="shadow-lg border-2 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <CardContent className="pt-6 pb-6 px-6">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Instruções de Impressão
              </h3>
              <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">1.</span>
                  <span className="flex-1">Conecte a impressora térmica móvel</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">2.</span>
                  <span className="flex-1">Clique em "Imprimir Todas" acima</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">3.</span>
                  <span className="flex-1">Verifique se todas as etiquetas foram impressas corretamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">4.</span>
                  <span className="flex-1">Cole cada etiqueta no fardo físico correspondente</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Print-only area */}
      {qrDataUrls.size > 0 && (
        <div className="hidden print:block" ref={printAreaRef}>
          <style>
            {`
              @media print {
                @page {
                  margin: 0.3in;
                  size: 4in 6in;
                }
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                * {
                  print-color-adjust: exact !important;
                  -webkit-print-color-adjust: exact !important;
                }
                .print-page-break {
                  page-break-after: always;
                }
              }
            `}
          </style>
          
          {bales.map((bale, index) => {
            const qrUrl = qrDataUrls.get(bale.id);
            if (!qrUrl) return null;
            
            return (
              <div 
                key={bale.id} 
                className={`w-full h-full bg-white flex items-start justify-center p-6 ${
                  index < bales.length - 1 ? 'print-page-break' : ''
                }`}
              >
                <div className="flex flex-col items-center w-full max-w-md" style={{ gap: '24px' }}>
                  {/* QR Code */}
                  <div className="flex items-center justify-center w-full">
                    <img 
                      src={qrUrl} 
                      alt={`QR Code ${bale.numero}`}
                      style={{ 
                        width: '280px', 
                        height: '280px',
                        display: 'block'
                      }}
                    />
                  </div>
                  
                  {/* Informações */}
                  <div className="text-center w-full" style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}>
                        ID do Fardo
                      </p>
                      <p style={{ 
                        fontSize: '20px', 
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        color: '#000',
                        wordBreak: 'break-all'
                      }}>
                        {bale.id}
                      </p>
                    </div>
                    
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '16px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          <span style={{ color: '#666' }}>Talhão: </span>
                          <span style={{ color: '#000' }}>{bale.talhao}</span>
                        </div>
                        <span style={{ color: '#ccc' }}>|</span>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          <span style={{ color: '#666' }}>Número: </span>
                          <span style={{ color: '#000' }}>{bale.numero}</span>
                        </div>
                      </div>
                      
                      {bale.safra && (
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '16px',
                          marginTop: '12px'
                        }}>
                          <span style={{ color: '#666' }}>Safra: </span>
                          <span style={{ color: '#000' }}>{bale.safra}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <Footer />
    </>
  );
}