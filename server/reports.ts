import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import type { Bale, TalhaoInfo } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Cache para a logo em base64
let logoBase64Cache: string | null = null;

async function getLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;

  try {
    // Tenta encontrar o SVG da logo
    const possiblePaths = [
      path.join(process.cwd(), 'client', 'public', 'logo-progresso.svg'),
      path.join(process.cwd(), 'dist', 'logo-progresso.svg'),
      path.join(process.cwd(), 'public', 'logo-progresso.svg'),
    ];

    let svgPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        svgPath = p;
        break;
      }
    }

    if (!svgPath) {
      console.log('Logo SVG not found, using text fallback');
      return null;
    }

    // Converte SVG para PNG com fundo transparente
    const svgBuffer = fs.readFileSync(svgPath);
    const pngBuffer = await sharp(svgBuffer)
      .resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    logoBase64Cache = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    console.log('Logo loaded successfully');
    return logoBase64Cache;
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

// Report types
type ReportType = "safra-summary" | "productivity" | "shipments" | "processing" | "inventory" | "custom";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string[];
  talhao?: string[];
  safra?: string;
  reportType?: ReportType;
  columns?: string[];
}

interface ReportData {
  bales: Bale[];
  carregamentos: any[];
  lotes: any[];
  fardinhos: any[];
  pesoBrutoTotais: any[];
  talhoesInfo: TalhaoInfo[];
}

interface BaleStats {
  total: number;
  campo: number;
  patio: number;
  beneficiado: number;
}

interface TalhaoStat {
  talhao: string;
  hectares: number;
  total: number;
  campo: number;
  patio: number;
  beneficiado: number;
  pesoBruto: number;
  produtividadePrevista: number;
  produtividadeReal: number;
}

// ==================== CORES DO TEMA CLARO PROFISSIONAL ====================
const white = [255, 255, 255];
const lightGray = [248, 250, 252];
const mediumGray = [226, 232, 240];
const darkGray = [71, 85, 105];
const black = [15, 23, 42];

// Cores de destaque
const primaryGreen = [34, 197, 94];
const primaryBlue = [59, 130, 246];
const primaryOrange = [249, 115, 22];
const primaryPurple = [139, 92, 246];
const primaryCyan = [6, 182, 212];

// Cores de status
const statusCampo = [34, 197, 94];      // Verde
const statusPatio = [249, 115, 22];     // Laranja
const statusBeneficiado = [59, 130, 246]; // Azul

// Default productivity target
const PRODUTIVIDADE_PREVISTA = 330.5; // @/ha

// ==================== HELPER FUNCTIONS ====================

function buildTalhoesMap(talhoesInfo: TalhaoInfo[]): Record<string, { hectares: number; produtividade: number }> {
  const map: Record<string, { hectares: number; produtividade: number }> = {};
  for (const t of talhoesInfo) {
    map[t.id] = {
      hectares: parseFloat(t.hectares) || 0,
      produtividade: PRODUTIVIDADE_PREVISTA,
    };
  }
  return map;
}

function filterBales(bales: Bale[], filters: ReportFilters): Bale[] {
  return bales.filter(bale => {
    if (filters.safra && bale.safra !== filters.safra) return false;
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(bale.status)) return false;
    }
    if (filters.talhao && filters.talhao.length > 0) {
      if (!bale.talhao || !filters.talhao.includes(bale.talhao)) return false;
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (bale.createdAt < start) return false;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (bale.createdAt > end) return false;
    }
    return true;
  });
}

function calculateStats(bales: Bale[]): BaleStats {
  return {
    total: bales.length,
    campo: bales.filter(b => b.status === "campo").length,
    patio: bales.filter(b => b.status === "patio").length,
    beneficiado: bales.filter(b => b.status === "beneficiado").length,
  };
}

function calculateTalhaoStats(bales: Bale[], pesoBrutoTotais: any[], talhoesMap: Record<string, { hectares: number; produtividade: number }>): TalhaoStat[] {
  const talhaoMap = new Map<string, { total: number; campo: number; patio: number; beneficiado: number }>();

  bales.forEach(bale => {
    const talhao = bale.talhao || "Sem Talhão";
    if (!talhaoMap.has(talhao)) {
      talhaoMap.set(talhao, { total: 0, campo: 0, patio: 0, beneficiado: 0 });
    }
    const stat = talhaoMap.get(talhao)!;
    stat.total++;
    if (bale.status === 'campo') stat.campo++;
    else if (bale.status === 'patio') stat.patio++;
    else if (bale.status === 'beneficiado') stat.beneficiado++;
  });

  return Array.from(talhaoMap.entries()).map(([talhao, stat]) => {
    const info = talhoesMap[talhao];
    const hectares = info?.hectares || 0;
    const produtividadePrevista = info?.produtividade || PRODUTIVIDADE_PREVISTA;
    const pesoBrutoData = pesoBrutoTotais.find(p => p.talhao === talhao);
    const pesoBruto = pesoBrutoData?.pesoBrutoTotal || 0;
    const produtividadeReal = hectares > 0 ? (pesoBruto / hectares) / 15 : 0;

    return {
      talhao,
      hectares,
      ...stat,
      pesoBruto,
      produtividadePrevista,
      produtividadeReal,
    };
  }).sort((a, b) => a.talhao.localeCompare(b.talhao));
}

// ==================== INFORMAÇÕES DA EMPRESA ====================
const EMPRESA = {
  nome: "PROGRESSO",
  nomeCompleto: "Grupo Progresso Agronegócio",
  slogan: "Excelência em Algodão",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  website: "grupoprogresso.agr.br",
};

// ==================== PDF HEADER PROFISSIONAL ====================

function addHeader(doc: jsPDF, safra: string, titulo: string, logoBase64: string | null = null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = 38;

  // Fundo do header - gradiente simulado com duas cores
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Linha de destaque verde no topo
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Logo - Imagem ou texto fallback
  const logoX = 12;
  const logoY = 6;
  const logoSize = 22;
  let textStartX = 15;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
      textStartX = logoX + logoSize + 6;
    } catch (e) {
      // Fallback para texto se a imagem falhar
      console.error('Error adding logo image:', e);
    }
  }

  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PROGRESSO', textStartX, 16);

  // Slogan/subtítulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text('Sistema de Rastreabilidade de Algodão', textStartX, 23);

  // Título do relatório
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(titulo.toUpperCase(), textStartX, 32);

  // Lado direito - Safra badge
  const safraText = `SAFRA ${safra}`;
  const safraWidth = doc.getTextWidth(safraText) + 16;
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.roundedRect(pageWidth - safraWidth - 10, 10, safraWidth, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(safraText, pageWidth - safraWidth - 2, 18);

  // Data de geração
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const dataGeracao = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Gerado em ${dataGeracao}`, pageWidth - 15, 30, { align: 'right' });

  // Linha separadora verde embaixo do header
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, headerHeight, pageWidth, 1, 'F');
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Fundo do footer
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');

    // Linha verde no topo do footer
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, pageHeight - 18, pageWidth, 1, 'F');

    // Logo pequena no footer
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PROGRESSO', 15, pageHeight - 10);

    // Separador
    doc.setTextColor(161, 161, 170);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('|', 52, pageHeight - 10);

    // Texto do rodapé
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(7);
    doc.text('Sistema de Rastreabilidade de Algodão', 58, pageHeight - 10);

    // Número da página - centralizado
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    const pageText = `${i} / ${pageCount}`;
    doc.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Data no canto direito
    doc.setFontSize(7);
    const dataAtual = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    doc.text(dataAtual, pageWidth - 15, pageHeight - 10, { align: 'right' });

    // Website/contato
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFontSize(6);
    doc.text(EMPRESA.website || '', pageWidth - 15, pageHeight - 5, { align: 'right' });
  }
}

// ==================== KPI CARD ====================

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  titulo: string,
  valor: string,
  subtitulo: string,
  cor: number[]
) {
  // Background do card
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');

  // Barra de cor no topo
  doc.setFillColor(cor[0], cor[1], cor[2]);
  doc.roundedRect(x, y, width, 3, 1.5, 1.5, 'F');
  doc.rect(x, y + 1.5, width, 1.5, 'F');

  // Título
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo.toUpperCase(), x + 8, y + 12);

  // Valor principal
  doc.setTextColor(cor[0], cor[1], cor[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(valor, x + 8, y + 26);

  // Subtítulo
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitulo, x + 8, y + 33);
}

// ==================== BARRA DE PROGRESSO ====================

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  percentage: number,
  cor: number[],
  label: string,
  value: string
) {
  // Label
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(label, x, y - 2);

  // Valor
  doc.setTextColor(cor[0], cor[1], cor[2]);
  doc.text(value, x + width, y - 2, { align: 'right' });

  // Background da barra
  doc.setFillColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  // Barra preenchida
  const filledWidth = (percentage / 100) * width;
  if (filledWidth > 0) {
    doc.setFillColor(cor[0], cor[1], cor[2]);
    doc.roundedRect(x, y, Math.min(filledWidth, width), height, 2, 2, 'F');
  }
}

// ==================== PDF GENERATORS ====================

function generateSafraSummaryPDF(data: ReportData, filters: ReportFilters, logoBase64: string | null): Buffer {
  const talhoesMap = buildTalhoesMap(data.talhoesInfo);
  const filteredBales = filterBales(data.bales, filters);
  const stats = calculateStats(filteredBales);
  const talhaoStats = calculateTalhaoStats(filteredBales, data.pesoBrutoTotais, talhoesMap);

  const totalPesoBruto = data.pesoBrutoTotais.reduce((acc, p) => acc + (p.pesoBrutoTotal || 0), 0);
  const totalPesoPluma = data.lotes.reduce((acc, l) => acc + (parseFloat(l.pesoPluma) || 0), 0);
  const rendimento = totalPesoBruto > 0 ? (totalPesoPluma / totalPesoBruto) * 100 : 0;
  const totalFardinhos = data.fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);
  const totalHectares = data.talhoesInfo.reduce((acc, t) => acc + parseFloat(t.hectares || "0"), 0);
  const produtividadeMedia = totalHectares > 0 ? (totalPesoBruto / totalHectares) / 15 : 0;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const margin = 15;

  addHeader(doc, filters.safra || '24/25', 'Resumo Executivo da Safra', logoBase64);

  let currentY = 48;

  // KPI Cards
  const cardWidth = 52;
  const cardHeight = 38;
  const cardGap = 6;

  drawKpiCard(doc, margin, currentY, cardWidth, cardHeight, 'Total Fardos',
    stats.total.toLocaleString('pt-BR'), `${totalHectares.toFixed(0)} hectares`, primaryGreen);

  drawKpiCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Peso Bruto',
    (totalPesoBruto / 1000).toFixed(1) + 't', `${totalPesoBruto.toLocaleString('pt-BR')} kg`, primaryOrange);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Peso Pluma',
    (totalPesoPluma / 1000).toFixed(1) + 't', `${totalPesoPluma.toLocaleString('pt-BR')} kg`, primaryPurple);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 3, currentY, cardWidth, cardHeight, 'Rendimento',
    rendimento.toFixed(1) + '%', 'pluma / bruto', primaryCyan);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 4, currentY, cardWidth, cardHeight, 'Produtividade',
    produtividadeMedia.toFixed(0) + '@', `${produtividadeMedia.toFixed(1)} @/ha`, primaryBlue);

  currentY += cardHeight + 12;

  // Status dos Fardos
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Status dos Fardos', margin, currentY);
  currentY += 8;

  const barWidth = 80;
  const barHeight = 6;
  const barGap = 14;

  const pctCampo = stats.total > 0 ? (stats.campo / stats.total) * 100 : 0;
  const pctPatio = stats.total > 0 ? (stats.patio / stats.total) * 100 : 0;
  const pctBenef = stats.total > 0 ? (stats.beneficiado / stats.total) * 100 : 0;

  drawProgressBar(doc, margin, currentY, barWidth, barHeight, pctCampo, statusCampo,
    'Campo', `${stats.campo} (${pctCampo.toFixed(1)}%)`);

  drawProgressBar(doc, margin + barWidth + 20, currentY, barWidth, barHeight, pctPatio, statusPatio,
    'Pátio', `${stats.patio} (${pctPatio.toFixed(1)}%)`);

  drawProgressBar(doc, margin + (barWidth + 20) * 2, currentY, barWidth, barHeight, pctBenef, statusBeneficiado,
    'Beneficiado', `${stats.beneficiado} (${pctBenef.toFixed(1)}%)`);

  currentY += barHeight + 16;

  // Tabela de Talhões
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Produção por Talhão', margin, currentY);
  currentY += 4;

  const tableData = talhaoStats.map(t => [
    t.talhao,
    t.hectares.toFixed(1) + ' ha',
    t.total.toString(),
    t.pesoBruto.toLocaleString('pt-BR') + ' kg',
    t.produtividadeReal.toFixed(1) + ' @/ha',
    t.campo.toString(),
    t.patio.toString(),
    t.beneficiado.toString(),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Talhão', 'Área', 'Fardos', 'Peso Bruto', 'Produtividade', 'Campo', 'Pátio', 'Benef.']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryGreen[0], primaryGreen[1], primaryGreen[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [black[0], black[1], black[2]],
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  addFooter(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

function generateProductivityPDF(data: ReportData, filters: ReportFilters, logoBase64: string | null): Buffer {
  const talhoesMap = buildTalhoesMap(data.talhoesInfo);
  const filteredBales = filterBales(data.bales, filters);
  const talhaoStats = calculateTalhaoStats(filteredBales, data.pesoBrutoTotais, talhoesMap);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 15;

  addHeader(doc, filters.safra || '24/25', 'Relatório de Produtividade', logoBase64);

  let currentY = 48;

  // KPIs
  const avgProdReal = talhaoStats.length > 0
    ? talhaoStats.filter(t => t.produtividadeReal > 0).reduce((sum, t) => sum + t.produtividadeReal, 0) /
      talhaoStats.filter(t => t.produtividadeReal > 0).length
    : 0;
  const avgProdPrev = PRODUTIVIDADE_PREVISTA;
  const diffPercent = avgProdPrev > 0 ? ((avgProdReal - avgProdPrev) / avgProdPrev) * 100 : 0;
  const totalHectares = data.talhoesInfo.reduce((acc, t) => acc + parseFloat(t.hectares || "0"), 0);

  const cardWidth = 65;
  const cardHeight = 38;
  const cardGap = 8;

  drawKpiCard(doc, margin, currentY, cardWidth, cardHeight, 'Produtividade Real',
    avgProdReal.toFixed(1) + ' @/ha', 'média dos talhões', diffPercent >= 0 ? primaryGreen : primaryOrange);

  drawKpiCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Meta Prevista',
    avgProdPrev.toFixed(1) + ' @/ha', 'produtividade esperada', primaryBlue);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Variação',
    (diffPercent >= 0 ? '+' : '') + diffPercent.toFixed(1) + '%', 'vs meta prevista', diffPercent >= 0 ? primaryGreen : [239, 68, 68]);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 3, currentY, cardWidth, cardHeight, 'Área Total',
    totalHectares.toFixed(0) + ' ha', `${talhaoStats.length} talhões`, primaryCyan);

  currentY += cardHeight + 12;

  // Tabela detalhada
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Produtividade por Talhão', margin, currentY);
  currentY += 4;

  const tableData = talhaoStats.map(t => {
    const diferenca = t.produtividadePrevista > 0
      ? ((t.produtividadeReal - t.produtividadePrevista) / t.produtividadePrevista) * 100
      : 0;
    const status = diferenca >= 0 ? '✓ Acima' : '✗ Abaixo';
    return [
      t.talhao,
      t.hectares.toFixed(1) + ' ha',
      t.produtividadePrevista.toFixed(1) + ' @/ha',
      t.produtividadeReal.toFixed(1) + ' @/ha',
      (diferenca >= 0 ? '+' : '') + diferenca.toFixed(1) + '%',
      t.pesoBruto.toLocaleString('pt-BR') + ' kg',
      status,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Talhão', 'Área', 'Meta', 'Real', 'Variação', 'Peso Bruto', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryGreen[0], primaryGreen[1], primaryGreen[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [black[0], black[1], black[2]],
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      6: { fontStyle: 'bold' },
    },
    didParseCell: function(cellData) {
      if (cellData.column.index === 6 && cellData.cell.section === 'body') {
        const text = cellData.cell.raw as string;
        if (text.includes('Acima')) {
          cellData.cell.styles.textColor = [statusCampo[0], statusCampo[1], statusCampo[2]];
        } else {
          cellData.cell.styles.textColor = [239, 68, 68];
        }
      }
      if (cellData.column.index === 4 && cellData.cell.section === 'body') {
        const text = cellData.cell.raw as string;
        if (text.startsWith('+')) {
          cellData.cell.styles.textColor = [statusCampo[0], statusCampo[1], statusCampo[2]];
        } else {
          cellData.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  addFooter(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

function generateShipmentsPDF(data: ReportData, filters: ReportFilters, logoBase64: string | null): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 15;

  addHeader(doc, filters.safra || '24/25', 'Relatório de Carregamentos', logoBase64);

  let currentY = 48;

  const totalCarregamentos = data.carregamentos.length;
  const totalPeso = data.carregamentos.reduce((acc, c) => acc + (parseInt(c.pesoKg) || 0), 0);
  const pesoMedio = totalCarregamentos > 0 ? totalPeso / totalCarregamentos : 0;

  const cardWidth = 80;
  const cardHeight = 38;
  const cardGap = 10;

  drawKpiCard(doc, margin, currentY, cardWidth, cardHeight, 'Total de Carregamentos',
    totalCarregamentos.toString(), 'viagens realizadas', primaryGreen);

  drawKpiCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Peso Total',
    (totalPeso / 1000).toFixed(1) + 't', `${totalPeso.toLocaleString('pt-BR')} kg`, primaryOrange);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Peso Médio',
    (pesoMedio / 1000).toFixed(2) + 't', `${pesoMedio.toFixed(0)} kg por carreg.`, primaryBlue);

  currentY += cardHeight + 12;

  // Tabela de carregamentos
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Lista de Carregamentos', margin, currentY);
  currentY += 4;

  const tableData = data.carregamentos.map((c, idx) => [
    (idx + 1).toString(),
    format(new Date(c.dataCarregamento), "dd/MM/yyyy", { locale: ptBR }),
    c.talhao || '-',
    parseInt(c.pesoKg).toLocaleString('pt-BR') + ' kg',
    c.observacao || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Data', 'Talhão', 'Peso', 'Observação']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryGreen[0], primaryGreen[1], primaryGreen[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [black[0], black[1], black[2]],
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  addFooter(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

function generateProcessingPDF(data: ReportData, filters: ReportFilters, logoBase64: string | null): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 15;

  addHeader(doc, filters.safra || '24/25', 'Relatório de Beneficiamento', logoBase64);

  let currentY = 48;

  const totalPesoPluma = data.lotes.reduce((acc, l) => acc + (parseFloat(l.pesoPluma) || 0), 0);
  const totalFardinhos = data.fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);
  const totalPesoBruto = data.pesoBrutoTotais.reduce((acc, p) => acc + (p.pesoBrutoTotal || 0), 0);
  const rendimento = totalPesoBruto > 0 ? (totalPesoPluma / totalPesoBruto) * 100 : 0;

  const cardWidth = 60;
  const cardHeight = 38;
  const cardGap = 8;

  drawKpiCard(doc, margin, currentY, cardWidth, cardHeight, 'Lotes Processados',
    data.lotes.length.toString(), 'lotes de beneficiamento', primaryPurple);

  drawKpiCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Peso Pluma',
    (totalPesoPluma / 1000).toFixed(1) + 't', `${totalPesoPluma.toLocaleString('pt-BR')} kg`, primaryCyan);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Fardinhos',
    totalFardinhos.toLocaleString('pt-BR'), 'unidades produzidas', primaryGreen);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 3, currentY, cardWidth, cardHeight, 'Rendimento',
    rendimento.toFixed(1) + '%', 'pluma / bruto', primaryOrange);

  currentY += cardHeight + 12;

  // Tabela de lotes
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Lotes de Beneficiamento', margin, currentY);
  currentY += 4;

  const lotesData = data.lotes.map((l, idx) => [
    (idx + 1).toString(),
    `Lote ${l.numeroLote}`,
    format(new Date(l.dataProcessamento), "dd/MM/yyyy", { locale: ptBR }),
    parseFloat(l.pesoPluma).toLocaleString('pt-BR') + ' kg',
    (l.qtdFardinhos || '-').toString(),
    l.observacao || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Lote', 'Data', 'Peso Pluma', 'Fardinhos', 'Observação']],
    body: lotesData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryPurple[0], primaryPurple[1], primaryPurple[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [black[0], black[1], black[2]],
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  addFooter(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

function generateInventoryPDF(data: ReportData, filters: ReportFilters, logoBase64: string | null): Buffer {
  const filteredBales = filterBales(data.bales, filters);
  const stats = calculateStats(filteredBales);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 15;

  addHeader(doc, filters.safra || '24/25', 'Inventário de Fardos', logoBase64);

  let currentY = 48;

  const pctCampo = stats.total > 0 ? (stats.campo / stats.total) * 100 : 0;
  const pctPatio = stats.total > 0 ? (stats.patio / stats.total) * 100 : 0;
  const pctBenef = stats.total > 0 ? (stats.beneficiado / stats.total) * 100 : 0;

  const cardWidth = 60;
  const cardHeight = 38;
  const cardGap = 8;

  drawKpiCard(doc, margin, currentY, cardWidth, cardHeight, 'Total de Fardos',
    stats.total.toLocaleString('pt-BR'), '100% do inventário', primaryBlue);

  drawKpiCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Em Campo',
    stats.campo.toLocaleString('pt-BR'), `${pctCampo.toFixed(1)}% do total`, statusCampo);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'No Pátio',
    stats.patio.toLocaleString('pt-BR'), `${pctPatio.toFixed(1)}% do total`, statusPatio);

  drawKpiCard(doc, margin + (cardWidth + cardGap) * 3, currentY, cardWidth, cardHeight, 'Beneficiado',
    stats.beneficiado.toLocaleString('pt-BR'), `${pctBenef.toFixed(1)}% do total`, statusBeneficiado);

  currentY += cardHeight + 12;

  // Tabela de fardos (limitada a 100)
  doc.setTextColor(black[0], black[1], black[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Lista de Fardos (${Math.min(filteredBales.length, 100)} de ${filteredBales.length})`, margin, currentY);
  currentY += 4;

  const tableData = filteredBales.slice(0, 100).map((bale, idx) => {
    const statusLabel = bale.status === 'campo' ? 'Campo' : bale.status === 'patio' ? 'Pátio' : 'Beneficiado';
    return [
      (idx + 1).toString(),
      bale.id,
      bale.talhao || '-',
      statusLabel,
      format(bale.createdAt, "dd/MM/yy HH:mm", { locale: ptBR }),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'ID do Fardo', 'Talhão', 'Status', 'Data Registro']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryGreen[0], primaryGreen[1], primaryGreen[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [black[0], black[1], black[2]],
    },
    alternateRowStyles: {
      fillColor: [lightGray[0], lightGray[1], lightGray[2]],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    didParseCell: function(cellData) {
      if (cellData.column.index === 3 && cellData.cell.section === 'body') {
        const status = (cellData.cell.raw as string).toLowerCase();
        if (status === 'campo') cellData.cell.styles.textColor = [statusCampo[0], statusCampo[1], statusCampo[2]];
        else if (status === 'pátio') cellData.cell.styles.textColor = [statusPatio[0], statusPatio[1], statusPatio[2]];
        else cellData.cell.styles.textColor = [statusBeneficiado[0], statusBeneficiado[1], statusBeneficiado[2]];
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  if (filteredBales.length > 100) {
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`* Exibindo 100 de ${filteredBales.length} fardos. Exporte para Excel para ver a lista completa.`, margin, finalY);
  }

  addFooter(doc);

  return Buffer.from(doc.output("arraybuffer"));
}

// ==================== EXCEL GENERATORS ====================

function generateSafraSummaryExcel(data: ReportData, filters: ReportFilters): Buffer {
  const talhoesMap = buildTalhoesMap(data.talhoesInfo);
  const filteredBales = filterBales(data.bales, filters);
  const stats = calculateStats(filteredBales);
  const talhaoStats = calculateTalhaoStats(filteredBales, data.pesoBrutoTotais, talhoesMap);

  const totalPesoBruto = data.pesoBrutoTotais.reduce((acc, p) => acc + (p.pesoBrutoTotal || 0), 0);
  const totalPesoPluma = data.lotes.reduce((acc, l) => acc + (parseFloat(l.pesoPluma) || 0), 0);
  const rendimento = totalPesoBruto > 0 ? (totalPesoPluma / totalPesoBruto) * 100 : 0;
  const totalFardinhos = data.fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);

  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ["COTTON APP - RESUMO DA SAFRA " + (filters.safra || "")],
    [""],
    ["INFORMAÇÕES DO RELATÓRIO"],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ["Safra:", filters.safra || "Todas"],
    [""],
    ["ESTATÍSTICAS GERAIS"],
    ["Total de Fardos:", stats.total],
    ["Peso Bruto Total:", totalPesoBruto.toLocaleString('pt-BR') + " kg"],
    ["Peso Pluma Total:", totalPesoPluma.toLocaleString('pt-BR') + " kg"],
    ["Rendimento:", rendimento.toFixed(2) + "%"],
    ["Total Fardinhos:", totalFardinhos],
    [""],
    ["DISTRIBUIÇÃO POR STATUS"],
    ["Campo:", stats.campo],
    ["Pátio:", stats.patio],
    ["Beneficiado:", stats.beneficiado],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const talhaoData = [
    ["RESUMO POR TALHÃO"],
    [""],
    ["Talhão", "Hectares", "Fardos", "Peso Bruto (kg)", "Produtividade (@/ha)", "Campo", "Pátio", "Beneficiado"],
    ...talhaoStats.map(t => [
      t.talhao,
      t.hectares,
      t.total,
      t.pesoBruto,
      t.produtividadeReal.toFixed(2),
      t.campo,
      t.patio,
      t.beneficiado,
    ]),
  ];

  const talhaoSheet = XLSX.utils.aoa_to_sheet(talhaoData);
  talhaoSheet['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, talhaoSheet, "Por Talhão");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function generateProductivityExcel(data: ReportData, filters: ReportFilters): Buffer {
  const talhoesMap = buildTalhoesMap(data.talhoesInfo);
  const filteredBales = filterBales(data.bales, filters);
  const talhaoStats = calculateTalhaoStats(filteredBales, data.pesoBrutoTotais, talhoesMap);

  const workbook = XLSX.utils.book_new();

  const prodData = [
    ["RELATÓRIO DE PRODUTIVIDADE - SAFRA " + (filters.safra || "")],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    [""],
    ["Talhão", "Hectares", "Prod. Prevista (@/ha)", "Prod. Real (@/ha)", "Diferença (%)", "Peso Bruto (kg)", "Fardos"],
    ...talhaoStats.map(t => {
      const diferenca = t.produtividadePrevista > 0
        ? ((t.produtividadeReal - t.produtividadePrevista) / t.produtividadePrevista) * 100
        : 0;
      return [
        t.talhao,
        t.hectares,
        t.produtividadePrevista,
        t.produtividadeReal.toFixed(2),
        diferenca.toFixed(2),
        t.pesoBruto,
        t.total,
      ];
    }),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(prodData);
  sheet['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Produtividade");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function generateShipmentsExcel(data: ReportData, filters: ReportFilters): Buffer {
  const workbook = XLSX.utils.book_new();
  const totalPeso = data.carregamentos.reduce((acc, c) => acc + (parseInt(c.pesoKg) || 0), 0);

  const shipData = [
    ["RELATÓRIO DE CARREGAMENTOS - SAFRA " + (filters.safra || "")],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ["Total Carregamentos:", data.carregamentos.length],
    ["Peso Total:", totalPeso.toLocaleString('pt-BR') + " kg"],
    [""],
    ["#", "Data", "Talhão", "Peso (kg)", "Observação"],
    ...data.carregamentos.map((c, idx) => [
      idx + 1,
      format(new Date(c.dataCarregamento), "dd/MM/yyyy", { locale: ptBR }),
      c.talhao,
      parseInt(c.pesoKg),
      c.observacao || '',
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(shipData);
  sheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Carregamentos");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function generateProcessingExcel(data: ReportData, filters: ReportFilters): Buffer {
  const workbook = XLSX.utils.book_new();
  const totalPesoPluma = data.lotes.reduce((acc, l) => acc + (parseFloat(l.pesoPluma) || 0), 0);
  const totalFardinhos = data.fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);

  const lotesData = [
    ["RELATÓRIO DE BENEFICIAMENTO - SAFRA " + (filters.safra || "")],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ["Total Lotes:", data.lotes.length],
    ["Peso Pluma Total:", totalPesoPluma.toLocaleString('pt-BR') + " kg"],
    ["Total Fardinhos:", totalFardinhos],
    [""],
    ["#", "Lote", "Data", "Peso Pluma (kg)", "Fardinhos", "Observação"],
    ...data.lotes.map((l, idx) => [
      idx + 1,
      `Lote ${l.numeroLote}`,
      format(new Date(l.dataProcessamento), "dd/MM/yyyy", { locale: ptBR }),
      parseFloat(l.pesoPluma),
      l.qtdFardinhos || 0,
      l.observacao || '',
    ]),
  ];

  const lotesSheet = XLSX.utils.aoa_to_sheet(lotesData);
  lotesSheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, lotesSheet, "Lotes");

  const fardinhosData = [
    ["FARDINHOS"],
    [""],
    ["#", "Data", "Quantidade", "Observação"],
    ...data.fardinhos.map((f, idx) => [
      idx + 1,
      format(new Date(f.dataRegistro), "dd/MM/yyyy", { locale: ptBR }),
      f.quantidade,
      f.observacao || '',
    ]),
  ];

  const fardinhosSheet = XLSX.utils.aoa_to_sheet(fardinhosData);
  fardinhosSheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, fardinhosSheet, "Fardinhos");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function generateInventoryExcel(data: ReportData, filters: ReportFilters): Buffer {
  const filteredBales = filterBales(data.bales, filters);
  const stats = calculateStats(filteredBales);

  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ["INVENTÁRIO DE FARDOS - SAFRA " + (filters.safra || "")],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    [""],
    ["STATUS", "QUANTIDADE", "PERCENTUAL"],
    ["Total", stats.total, "100%"],
    ["Campo", stats.campo, `${stats.total > 0 ? ((stats.campo/stats.total)*100).toFixed(1) : 0}%`],
    ["Pátio", stats.patio, `${stats.total > 0 ? ((stats.patio/stats.total)*100).toFixed(1) : 0}%`],
    ["Beneficiado", stats.beneficiado, `${stats.total > 0 ? ((stats.beneficiado/stats.total)*100).toFixed(1) : 0}%`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const balesData = filteredBales.map((bale, idx) => ({
    "#": idx + 1,
    "ID": bale.id,
    "Talhão": bale.talhao || '-',
    "Safra": bale.safra || '-',
    "Status": bale.status === 'campo' ? 'Campo' : bale.status === 'patio' ? 'Pátio' : 'Beneficiado',
    "Data Criação": format(bale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
    "Última Atualização": format(bale.updatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
  }));

  const balesSheet = XLSX.utils.json_to_sheet(balesData);
  balesSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, balesSheet, "Fardos");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

// ==================== MAIN EXPORT FUNCTIONS ====================

export async function generatePDF(
  bales: Bale[],
  filters: ReportFilters,
  additionalData?: { carregamentos?: any[], lotes?: any[], fardinhos?: any[], pesoBrutoTotais?: any[], talhoesInfo?: TalhaoInfo[] }
): Promise<Buffer> {
  const reportType = filters.reportType || 'custom';

  // Carrega a logo
  const logoBase64 = await getLogoBase64();

  const data: ReportData = {
    bales,
    carregamentos: additionalData?.carregamentos || [],
    lotes: additionalData?.lotes || [],
    fardinhos: additionalData?.fardinhos || [],
    pesoBrutoTotais: additionalData?.pesoBrutoTotais || [],
    talhoesInfo: additionalData?.talhoesInfo || [],
  };

  switch (reportType) {
    case 'safra-summary':
      return generateSafraSummaryPDF(data, filters, logoBase64);
    case 'productivity':
      return generateProductivityPDF(data, filters, logoBase64);
    case 'shipments':
      return generateShipmentsPDF(data, filters, logoBase64);
    case 'processing':
      return generateProcessingPDF(data, filters, logoBase64);
    case 'inventory':
      return generateInventoryPDF(data, filters, logoBase64);
    default:
      return generateInventoryPDF(data, filters, logoBase64);
  }
}

export function generateExcel(
  bales: Bale[],
  filters: ReportFilters,
  additionalData?: { carregamentos?: any[], lotes?: any[], fardinhos?: any[], pesoBrutoTotais?: any[], talhoesInfo?: TalhaoInfo[] }
): Buffer {
  const reportType = filters.reportType || 'custom';

  const data: ReportData = {
    bales,
    carregamentos: additionalData?.carregamentos || [],
    lotes: additionalData?.lotes || [],
    fardinhos: additionalData?.fardinhos || [],
    pesoBrutoTotais: additionalData?.pesoBrutoTotais || [],
    talhoesInfo: additionalData?.talhoesInfo || [],
  };

  switch (reportType) {
    case 'safra-summary':
      return generateSafraSummaryExcel(data, filters);
    case 'productivity':
      return generateProductivityExcel(data, filters);
    case 'shipments':
      return generateShipmentsExcel(data, filters);
    case 'processing':
      return generateProcessingExcel(data, filters);
    case 'inventory':
      return generateInventoryExcel(data, filters);
    default:
      return generateInventoryExcel(data, filters);
  }
}
