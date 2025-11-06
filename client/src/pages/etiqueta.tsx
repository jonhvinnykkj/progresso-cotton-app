import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Printer, QrCode, ArrowLeft, Loader2, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

  const handlePrint = async () => {
    if (qrDataUrls.size === 0) {
      toast({
        variant: "destructive",
        title: "Etiquetas não disponíveis",
        description: "Aguarde o carregamento das etiquetas",
      });
      return;
    }

    // Detectar se está no Android
    if (Capacitor.isNativePlatform()) {
      toast({
        title: "Gerando PDF...",
        description: `Processando ${bales.length} etiqueta(s)...`,
      });

      try {
        console.log('[PDF] Iniciando geração de PDF com múltiplas páginas...');
        
        // Criar PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Renderizar cada fardo em uma página separada
        for (let i = 0; i < bales.length; i++) {
          const bale = bales[i];
          console.log(`[PDF] Processando etiqueta ${i + 1}/${bales.length} - Fardo #${bale.numero_fardo}`);

          // Criar elemento temporário para renderizar uma etiqueta
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.width = '210mm'; // A4 width
          tempDiv.style.padding = '20mm';
          tempDiv.style.backgroundColor = '#ffffff';
          
          // Gerar QR Code se não existir
          let qrUrl = qrDataUrls.get(bale.id);
          if (!qrUrl) {
            qrUrl = await QRCode.toDataURL(bale.id.toString(), {
              width: 256,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' }
            });
          }

          // HTML da etiqueta individual
          tempDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px 0; font-weight: 500;">ID DO FARDO</p>
                <p style="font-size: 28px; font-weight: 700; color: #000; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 0.02em;">${bale.id}</p>
              </div>
              
              <div style="margin: 32px 0;">
                <img src="${qrUrl}" alt="QR Code" style="width: 280px; height: 280px; display: block;" />
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-bottom: 16px;">
                  <div style="font-size: 18px; font-weight: 600;">
                    <span style="color: #666;">Talhão:</span>
                    <span style="color: #000; margin-left: 8px;">${bale.talhao}</span>
                  </div>
                  <span style="color: #ccc; font-size: 20px;">|</span>
                  <div style="font-size: 18px; font-weight: 600;">
                    <span style="color: #666;">Número:</span>
                    <span style="color: #000; margin-left: 8px;">${bale.numero}</span>
                  </div>
                </div>
                ${bale.safra ? `
                  <div style="font-size: 18px; font-weight: 600; margin-top: 16px;">
                    <span style="color: #666;">Safra:</span>
                    <span style="color: #000; margin-left: 8px;">${bale.safra}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;

          document.body.appendChild(tempDiv);

          // Capturar etiqueta como imagem
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: tempDiv.offsetWidth,
            height: tempDiv.offsetHeight
          });

          document.body.removeChild(tempDiv);

          // Adicionar página (exceto na primeira iteração)
          if (i > 0) {
            pdf.addPage();
          }

          // Converter canvas para imagem
          const imgData = canvas.toDataURL('image/png');
          
          // Calcular dimensões para caber na página
          const imgWidth = pageWidth;
          const imgHeight = (canvas.height * pageWidth) / canvas.width;
          
          // Centralizar verticalmente se necessário
          const yPosition = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0;
          
          pdf.addImage(imgData, 'PNG', 0, yPosition, imgWidth, imgHeight);
        }

        console.log('[PDF] Todas as páginas adicionadas, gerando blob...');
        
        // Gerar blob do PDF
        const pdfBlob = pdf.output('blob');
        console.log(`[PDF] PDF gerado: ${(pdfBlob.size / 1024 / 1024).toFixed(2)} MB`);
        
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const fileName = `etiquetas_${new Date().getTime()}.pdf`;

          try {
            console.log('[PDF] Salvando arquivo no dispositivo...');
            
            // Salvar arquivo
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents
            });

            console.log('[PDF] Arquivo salvo:', result.uri);

            // Compartilhar arquivo
            await Share.share({
              title: 'Etiquetas de Fardos',
              text: `${bales.length} etiqueta(s) gerada(s)`,
              url: result.uri,
              dialogTitle: 'Compartilhar ou Salvar PDF'
            });

            console.log('[PDF] Compartilhamento concluído!');

            toast({
              title: "PDF gerado com sucesso!",
              description: `${bales.length} etiqueta(s) salva(s) em Documentos`,
            });
          } catch (error) {
            console.error("[PDF] Erro ao salvar/compartilhar:", error);
            toast({
              variant: "destructive",
              title: "Erro ao salvar PDF",
              description: error instanceof Error ? error.message : "Tente novamente",
            });
          }
        };

        reader.onerror = (error) => {
          console.error("[PDF] Erro ao ler blob:", error);
          toast({
            variant: "destructive",
            title: "Erro ao processar PDF",
            description: "Falha ao converter arquivo",
          });
        };

        console.log('[PDF] Lendo blob como base64...');
        reader.readAsDataURL(pdfBlob);
      } catch (error) {
        console.error("[PDF] Erro ao gerar PDF:", error);
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        toast({
          variant: "destructive",
          title: "Erro ao gerar PDF",
          description: errorMessage,
        });
      }
    } else {
      // Na web, usar window.print() normal
      window.print();
    }
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
              
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shrink-0">
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
                  className="w-full lg:w-auto h-12 rounded-xl shadow-lg bg-white text-green-600 hover:bg-white/90 hover:scale-105 transition-all duration-300 font-bold shrink-0"
                >
                  {Capacitor.isNativePlatform() ? (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Gerar PDF
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5 mr-2" />
                      Imprimir Todas
                    </>
                  )}
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
                className={`w-full h-full bg-white flex items-center justify-center p-8 ${
                  index < bales.length - 1 ? 'print-page-break' : ''
                }`}
              >
                <div className="flex flex-col items-center justify-center w-full max-w-md" style={{ gap: '24px' }}>
                  {/* ID do Fardo */}
                  <div className="text-center" style={{ marginBottom: '8px' }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: '500',
                      marginBottom: '12px'
                    }}>
                      ID DO FARDO
                    </p>
                    <p style={{ 
                      fontSize: '28px', 
                      fontFamily: '"Courier New", monospace',
                      fontWeight: '700',
                      color: '#000',
                      letterSpacing: '0.02em'
                    }}>
                      {bale.id}
                    </p>
                  </div>
                  
                  {/* QR Code */}
                  <div className="flex items-center justify-center" style={{ margin: '32px 0' }}>
                    <img 
                      src={qrUrl} 
                      alt={`QR Code ${bale.id}`}
                      style={{ 
                        width: '280px', 
                        height: '280px',
                        display: 'block'
                      }}
                    />
                  </div>
                  
                  {/* Informações */}
                  <div className="text-center w-full" style={{ marginTop: '24px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '24px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '18px' }}>
                        <span style={{ color: '#666' }}>Talhão: </span>
                        <span style={{ color: '#000' }}>{bale.talhao}</span>
                      </div>
                      <span style={{ color: '#ccc', fontSize: '20px' }}>|</span>
                      <div style={{ fontWeight: '600', fontSize: '18px' }}>
                        <span style={{ color: '#666' }}>Número: </span>
                        <span style={{ color: '#000' }}>{bale.numero}</span>
                      </div>
                    </div>
                    
                    {bale.safra && (
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '18px',
                        marginTop: '16px'
                      }}>
                        <span style={{ color: '#666' }}>Safra: </span>
                        <span style={{ color: '#000' }}>{bale.safra}</span>
                      </div>
                    )}
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