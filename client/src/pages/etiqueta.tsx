import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { QrCode, ArrowLeft, Loader2, Download, Lightbulb } from "lucide-react";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import logoProgresso from "/favicon.png";
import type { Bale } from "@shared/schema";
import { Page, PageContent, PageHeader, Section } from "@/components/layout/page";

export default function Etiqueta() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const baleIdsParam = searchParams.get("baleIds");
  const baleIds = baleIdsParam ? baleIdsParam.split(',') : [];
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrDataUrls, setQrDataUrls] = useState<Map<string, string>>(new Map());
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Buscar dados dos fardos
  const { data: allBales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000, // 30 segundos de cache
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

    // Gerar PDF tanto para mobile quanto para web
    toast({
      title: "Gerando PDF...",
      description: `Processando ${bales.length} etiqueta(s)...`,
    });

    try {
      console.log('[PDF] Iniciando geração de PDF...');

      // Criar PDF - formato 4x6 polegadas (etiqueta padrão)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [101.6, 152.4], // 4x6 inches em mm
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Renderizar cada fardo em uma página separada
      for (let i = 0; i < bales.length; i++) {
        const bale = bales[i];
        console.log(`[PDF] Processando etiqueta ${i + 1}/${bales.length} - Fardo #${bale.numero}`);

        // Adicionar página (exceto na primeira iteração)
        if (i > 0) {
          pdf.addPage();
        }

        // Gerar QR Code se não existir
        let qrUrl = qrDataUrls.get(bale.id);
        if (!qrUrl) {
          qrUrl = await QRCode.toDataURL(bale.id, {
            width: 400,
            margin: 1,
            errorCorrectionLevel: "H",
            color: { dark: '#000000', light: '#FFFFFF' }
          });
        }

        // Desenhar diretamente no PDF (mais rápido que html2canvas)
        const centerX = pageWidth / 2;

        // Título "ID DO FARDO"
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('ID DO FARDO', centerX, 15, { align: 'center' });

        // ID do fardo
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('courier', 'bold');
        pdf.text(bale.id, centerX, 23, { align: 'center' });

        // QR Code - centralizado
        const qrSize = 60; // mm
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = 30;

        try {
          pdf.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        } catch (imgError) {
          console.error('[PDF] Erro ao adicionar QR:', imgError);
          // Desenhar placeholder
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(qrX, qrY, qrSize, qrSize);
          pdf.setFontSize(8);
          pdf.text('QR Code', centerX, qrY + qrSize/2, { align: 'center' });
        }

        // Informações abaixo do QR
        const infoY = qrY + qrSize + 12;

        // Linha de Talhão e Número
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);

        const talhaoText = `Talhão: `;
        const talhaoValue = bale.talhao;
        const numeroText = `Número: `;
        const numeroValue = String(bale.numero);

        // Calcular posições para centralizar
        const spacing = 8;
        const talhaoWidth = pdf.getTextWidth(talhaoText + talhaoValue);
        const numeroWidth = pdf.getTextWidth(numeroText + numeroValue);
        const totalWidth = talhaoWidth + spacing + 5 + spacing + numeroWidth;
        const startX = (pageWidth - totalWidth) / 2;

        // Talhão
        pdf.text(talhaoText, startX, infoY);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(talhaoValue, startX + pdf.getTextWidth(talhaoText), infoY);

        // Separador
        pdf.setTextColor(200, 200, 200);
        pdf.setFont('helvetica', 'normal');
        const sepX = startX + talhaoWidth + spacing;
        pdf.text('|', sepX, infoY);

        // Número
        pdf.setTextColor(100, 100, 100);
        const numX = sepX + spacing;
        pdf.text(numeroText, numX, infoY);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(numeroValue, numX + pdf.getTextWidth(numeroText), infoY);

        // Safra (se existir)
        if (bale.safra) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          pdf.setTextColor(100, 100, 100);
          const safraText = `Safra: `;
          pdf.text(safraText, centerX - pdf.getTextWidth(safraText + bale.safra) / 2, infoY + 8);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.text(bale.safra, centerX - pdf.getTextWidth(safraText + bale.safra) / 2 + pdf.getTextWidth(safraText), infoY + 8);
        }

        // Tipo do fardo (se existir e não for "normal")
        if (bale.tipo && bale.tipo !== 'normal') {
          const tipoY = bale.safra ? infoY + 16 : infoY + 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);

          // Cor baseada no tipo
          if (bale.tipo === 'bordadura') {
            pdf.setTextColor(180, 130, 0); // Amarelo escuro
          } else if (bale.tipo === 'bituca') {
            pdf.setTextColor(200, 100, 0); // Laranja
          }

          const tipoLabel = bale.tipo.charAt(0).toUpperCase() + bale.tipo.slice(1);
          pdf.text(`[${tipoLabel}]`, centerX, tipoY, { align: 'center' });
        }
      }

      console.log('[PDF] Todas as páginas adicionadas, gerando arquivo...');

      // Se está no mobile/nativo, salvar e compartilhar
      if (Capacitor.isNativePlatform()) {
        const pdfBlob = pdf.output('blob');
        console.log(`[PDF] PDF gerado: ${(pdfBlob.size / 1024).toFixed(2)} KB`);

        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const fileName = `etiquetas_${new Date().getTime()}.pdf`;

          try {
            console.log('[PDF] Salvando arquivo no dispositivo...');

            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents
            });

            console.log('[PDF] Arquivo salvo:', result.uri);

            await Share.share({
              title: 'Etiquetas de Fardos',
              text: `${bales.length} etiqueta(s) gerada(s)`,
              url: result.uri,
              dialogTitle: 'Compartilhar ou Imprimir PDF'
            });

            toast({
              variant: "success",
              title: "PDF gerado!",
              description: `${bales.length} etiqueta(s) pronta(s) para impressão`,
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

        reader.readAsDataURL(pdfBlob);
      } else {
        // Na web, abrir PDF em nova aba ou fazer download
        const pdfUrl = pdf.output('bloburl');
        window.open(pdfUrl as string, '_blank');

        toast({
          variant: "success",
          title: "PDF gerado!",
          description: `${bales.length} etiqueta(s) aberta(s) em nova aba`,
        });
      }
    } catch (error) {
      console.error("[PDF] Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  const handleBack = () => {
    setLocation("/campo");
  };

  if (baleIds.length === 0) {
    return (
      <Page>
        <PageContent className="max-w-md flex items-center justify-center min-h-[60vh]">
          <Section className="w-full animate-fade-in-up">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-destructive/10 rounded-2xl mb-2">
                <QrCode className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold">Erro</h2>
              <p className="text-sm text-muted-foreground">
                Nenhum fardo selecionado. Volte e tente novamente.
              </p>
              <Button
                onClick={handleBack}
                className="w-full h-12 rounded-xl btn-neon font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </Section>
        </PageContent>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-base text-muted-foreground font-semibold">Carregando etiquetas...</p>
          </div>
        </PageContent>
      </Page>
    );
  }

  if (bales.length === 0) {
    return (
      <Page>
        <PageContent className="max-w-md flex items-center justify-center min-h-[60vh]">
          <Section className="w-full animate-fade-in-up">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-neon-orange/10 rounded-2xl mb-2">
                <QrCode className="w-10 h-10 text-neon-orange" />
              </div>
              <h2 className="text-xl font-bold">Fardos não encontrados</h2>
              <p className="text-sm text-muted-foreground">
                Os fardos selecionados não foram encontrados no sistema.
              </p>
              <Button
                onClick={handleBack}
                className="w-full h-12 rounded-xl btn-neon font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </Section>
        </PageContent>
      </Page>
    );
  }

  return (
    <>
      <Page>
        <PageContent className="max-w-4xl space-y-6 print:hidden">
          {/* Header */}
          <PageHeader
            title="Etiquetas dos Fardos"
            subtitle={`${bales.length} ${bales.length === 1 ? 'etiqueta' : 'etiquetas'} • ${user?.username}`}
            icon={<QrCode className="w-6 h-6" />}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                data-testid="button-back"
                className="rounded-xl border-border/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            }
          />

          {/* Preview das etiquetas */}
          <Section
            title="Preview das Etiquetas"
            description="Visualize as etiquetas antes de imprimir"
            action={
              <Button
                onClick={handlePrint}
                size="lg"
                data-testid="button-print-labels"
                disabled={qrDataUrls.size === 0}
                className="h-12 rounded-xl btn-neon font-semibold"
              >
                <Download className="w-5 h-5 mr-2" />
                Gerar PDF
              </Button>
            }
            className="animate-fade-in-up"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bales.map((bale, index) => {
                const qrUrl = qrDataUrls.get(bale.id);

                return (
                  <div
                    key={bale.id}
                    className="glass-card-hover p-4 space-y-3 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt={`QR Code ${bale.numero}`}
                        className="w-full aspect-square rounded-xl bg-white"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-surface animate-pulse rounded-xl" />
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
          </Section>

          {/* Instruções */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Section>
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Instruções de Impressão
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Conecte a impressora térmica móvel</li>
                <li>Clique em "Imprimir Todas" acima</li>
                <li>Verifique se todas as etiquetas foram impressas corretamente</li>
                <li>Cole cada etiqueta no fardo físico correspondente</li>
              </ol>
            </Section>
          </div>
        </PageContent>
      </Page>

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

    </>
  );
}
