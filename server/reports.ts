import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Bale } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Talhões info for hectares and productivity calculations
const TALHOES_INFO: Record<string, { hectares: number }> = {
  '1B': { hectares: 774.90 },
  '2B': { hectares: 762.20 },
  '3B': { hectares: 661.00 },
  '4B': { hectares: 573.60 },
  '5B': { hectares: 472.60 },
  '2A': { hectares: 493.90 },
  '3A': { hectares: 338.50 },
  '4A': { hectares: 368.30 },
  '5A': { hectares: 493.00 },
};

const TOTAL_HECTARES = Object.values(TALHOES_INFO).reduce((sum, t) => sum + t.hectares, 0);
const ARROBAS_PER_FARDO = 66.67; // Peso médio em arrobas por fardo

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string[];
  talhao?: string[];
}

interface ReportOptions {
  includeCharts?: boolean;
  includeTimeline?: boolean;
  groupByTalhao?: boolean;
  groupBySafra?: boolean;
  detailedView?: boolean;
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
  fardosPorHectare: number;
  arrobasPorHectare: number;
  progressPercent: number;
}

function filterBales(bales: Bale[], filters: ReportFilters): Bale[] {
  return bales.filter(bale => {
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

function calculateTalhaoStats(bales: Bale[]): TalhaoStat[] {
  const talhaoMap = new Map<string, { total: number; campo: number; patio: number; beneficiado: number }>();

  bales.forEach(bale => {
    const talhao = bale.talhao || "Sem Talhao";
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
    const hectares = TALHOES_INFO[talhao]?.hectares || 0;
    const fardosPorHectare = hectares > 0 ? stat.total / hectares : 0;
    const arrobasPorHectare = fardosPorHectare * ARROBAS_PER_FARDO;
    const progressPercent = stat.total > 0 ? (stat.beneficiado / stat.total) * 100 : 0;

    return {
      talhao,
      hectares,
      ...stat,
      fardosPorHectare,
      arrobasPorHectare,
      progressPercent,
    };
  }).sort((a, b) => b.total - a.total);
}

function calculateDailyStats(bales: Bale[]): Map<string, { total: number; campo: number; patio: number; beneficiado: number }> {
  const dailyMap = new Map<string, { total: number; campo: number; patio: number; beneficiado: number }>();

  bales.forEach(bale => {
    const day = format(bale.createdAt, "yyyy-MM-dd");
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { total: 0, campo: 0, patio: 0, beneficiado: 0 });
    }
    const stat = dailyMap.get(day)!;
    stat.total++;
    if (bale.status === 'campo') stat.campo++;
    else if (bale.status === 'patio') stat.patio++;
    else if (bale.status === 'beneficiado') stat.beneficiado++;
  });

  return dailyMap;
}

export function generatePDF(bales: Bale[], filters: ReportFilters, options: ReportOptions = {}): Buffer {
  const filteredBales = filterBales(bales, filters);
  const stats = calculateStats(filteredBales);
  const talhaoStats = calculateTalhaoStats(filteredBales);
  const dailyStats = calculateDailyStats(filteredBales);

  // Calculate productivity metrics
  const fardosPorHectare = stats.total / TOTAL_HECTARES;
  const arrobasPorHectare = fardosPorHectare * ARROBAS_PER_FARDO;
  const progressPercent = stats.total > 0 ? (stats.beneficiado / stats.total) * 100 : 0;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // ==================== COTTON DARK THEME COLORS ====================
  const bgDark = [10, 10, 10];
  const bgCard = [20, 20, 20];
  const bgSurface = [30, 30, 30];
  const neonGreen = [0, 255, 136];
  const neonOrange = [255, 149, 0];
  const neonCyan = [0, 212, 255];
  const textWhite = [255, 255, 255];
  const textMuted = [156, 163, 175];
  const borderColor = [55, 65, 81];

  // ==================== PAGE 1: FULL PAGE DARK BACKGROUND ====================
  doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header accent line
  doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Header background
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.rect(0, 2, pageWidth, 20, 'F');

  // Logo
  doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
  doc.circle(margin + 7, 12, 5, 'F');
  doc.setTextColor(bgDark[0], bgDark[1], bgDark[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("C", margin + 5, 13.5);

  // Title
  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("Cotton App", margin + 15, 10);

  doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
  doc.setFontSize(10);
  doc.text("Relatorio Completo de Rastreabilidade", margin + 15, 16);

  // Date and filter summary badge
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.roundedRect(pageWidth - margin - 70, 6, 70, 12, 2, 2, 'F');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const dataGeracao = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  doc.text(`Gerado: ${dataGeracao}`, pageWidth - margin - 66, 10);

  let periodoText = "Todos os dados";
  if (filters.startDate || filters.endDate) {
    const inicio = filters.startDate ? format(new Date(filters.startDate), "dd/MM/yy") : "Inicio";
    const fim = filters.endDate ? format(new Date(filters.endDate), "dd/MM/yy") : "Hoje";
    periodoText = `Periodo: ${inicio} - ${fim}`;
  }
  doc.text(periodoText, pageWidth - margin - 66, 15);

  let currentY = 26;

  // ==================== KPI CARDS (6 CARDS) ====================
  const cardWidth = (contentWidth - 15) / 6;
  const cardHeight = 26;

  const drawKpiCard = (x: number, y: number, w: number, h: number, label: string, value: string, subValue: string, color: number[]) => {
    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x + 1, y, w - 2, 1.2, 0.5, 0.5, 'F');

    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + w/2, y + 6, { align: 'center' });

    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(16);
    doc.text(value, x + w/2, y + 16, { align: 'center' });

    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(subValue, x + w/2, y + 22, { align: 'center' });
  };

  // KPI Cards
  drawKpiCard(margin, currentY, cardWidth, cardHeight, "TOTAL FARDOS", stats.total.toLocaleString('pt-BR'), `${TOTAL_HECTARES.toFixed(0)} ha total`, neonGreen);
  drawKpiCard(margin + cardWidth + 3, currentY, cardWidth, cardHeight, "NO CAMPO", stats.campo.toLocaleString('pt-BR'), `${stats.total > 0 ? ((stats.campo/stats.total)*100).toFixed(1) : 0}%`, neonGreen);
  drawKpiCard(margin + (cardWidth + 3) * 2, currentY, cardWidth, cardHeight, "NO PATIO", stats.patio.toLocaleString('pt-BR'), `${stats.total > 0 ? ((stats.patio/stats.total)*100).toFixed(1) : 0}%`, neonOrange);
  drawKpiCard(margin + (cardWidth + 3) * 3, currentY, cardWidth, cardHeight, "BENEFICIADO", stats.beneficiado.toLocaleString('pt-BR'), `${progressPercent.toFixed(1)}% concluido`, neonCyan);
  drawKpiCard(margin + (cardWidth + 3) * 4, currentY, cardWidth, cardHeight, "FARDOS/HA", fardosPorHectare.toFixed(2), "media geral", neonOrange);
  drawKpiCard(margin + (cardWidth + 3) * 5, currentY, cardWidth, cardHeight, "ARROBAS/HA", arrobasPorHectare.toFixed(1), "@/hectare", neonCyan);

  currentY += cardHeight + 6;

  // ==================== PROGRESS BAR ====================
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'F');

  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("Progresso do Beneficiamento", margin + 4, currentY + 5);

  doc.setTextColor(neonCyan[0], neonCyan[1], neonCyan[2]);
  doc.text(`${progressPercent.toFixed(1)}%`, pageWidth - margin - 4, currentY + 5, { align: 'right' });

  // Progress bar background
  const barX = margin + 4;
  const barY = currentY + 7;
  const barWidth = contentWidth - 8;
  const barHeight = 3;

  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');

  // Progress segments
  const campoWidth = stats.total > 0 ? (stats.campo / stats.total) * barWidth : 0;
  const patioWidth = stats.total > 0 ? (stats.patio / stats.total) * barWidth : 0;
  const beneficiadoWidth = stats.total > 0 ? (stats.beneficiado / stats.total) * barWidth : 0;

  if (beneficiadoWidth > 0) {
    doc.setFillColor(neonCyan[0], neonCyan[1], neonCyan[2]);
    doc.roundedRect(barX, barY, beneficiadoWidth, barHeight, 1, 1, 'F');
  }
  if (patioWidth > 0) {
    doc.setFillColor(neonOrange[0], neonOrange[1], neonOrange[2]);
    doc.roundedRect(barX + beneficiadoWidth, barY, patioWidth, barHeight, 0, 0, 'F');
  }
  if (campoWidth > 0) {
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.roundedRect(barX + beneficiadoWidth + patioWidth, barY, campoWidth, barHeight, 1, 1, 'F');
  }

  currentY += 16;

  // ==================== TALHAO ANALYTICS TABLE ====================
  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Analise por Talhao", margin, currentY + 3);
  currentY += 6;

  const talhaoTableData = talhaoStats.map(t => [
    t.talhao,
    t.hectares > 0 ? t.hectares.toFixed(1) : '-',
    t.total.toLocaleString('pt-BR'),
    t.campo.toString(),
    t.patio.toString(),
    t.beneficiado.toString(),
    t.hectares > 0 ? t.fardosPorHectare.toFixed(2) : '-',
    t.hectares > 0 ? t.arrobasPorHectare.toFixed(1) : '-',
    `${t.progressPercent.toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Talhao", "Hectares", "Total", "Campo", "Patio", "Benef.", "F/ha", "@/ha", "Progresso"]],
    body: talhaoTableData,
    theme: "plain",
    headStyles: {
      fillColor: [bgCard[0], bgCard[1], bgCard[2]],
      textColor: [neonGreen[0], neonGreen[1], neonGreen[2]],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fillColor: [bgDark[0], bgDark[1], bgDark[2]],
      textColor: [textWhite[0], textWhite[1], textWhite[2]],
      fontSize: 7,
      cellPadding: 2,
      lineColor: [borderColor[0], borderColor[1], borderColor[2]],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [bgCard[0], bgCard[1], bgCard[2]],
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        data.cell.styles.textColor = [neonGreen[0], neonGreen[1], neonGreen[2]];
      }
      if (data.column.index === 4 && data.cell.section === 'body') {
        data.cell.styles.textColor = [neonOrange[0], neonOrange[1], neonOrange[2]];
      }
      if (data.column.index === 5 && data.cell.section === 'body') {
        data.cell.styles.textColor = [neonCyan[0], neonCyan[1], neonCyan[2]];
      }
      if (data.column.index === 8 && data.cell.section === 'body') {
        const percent = parseFloat(String(data.cell.raw).replace('%', ''));
        if (percent >= 80) {
          data.cell.styles.textColor = [neonCyan[0], neonCyan[1], neonCyan[2]];
        } else if (percent >= 50) {
          data.cell.styles.textColor = [neonOrange[0], neonOrange[1], neonOrange[2]];
        } else {
          data.cell.styles.textColor = [neonGreen[0], neonGreen[1], neonGreen[2]];
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ==================== DAILY ACTIVITY (if space allows) ====================
  if (currentY < pageHeight - 60 && dailyStats.size > 0) {
    doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("Atividade Diaria (Ultimos 10 dias)", margin, currentY + 3);
    currentY += 6;

    const dailyArray = Array.from(dailyStats.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10)
      .map(([date, stat]) => [
        format(new Date(date), "dd/MM/yyyy", { locale: ptBR }),
        stat.total.toString(),
        stat.campo.toString(),
        stat.patio.toString(),
        stat.beneficiado.toString(),
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Data", "Total Criados", "Campo", "Patio", "Beneficiado"]],
      body: dailyArray,
      theme: "plain",
      headStyles: {
        fillColor: [bgCard[0], bgCard[1], bgCard[2]],
        textColor: [neonOrange[0], neonOrange[1], neonOrange[2]],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        cellPadding: 2,
      },
      styles: {
        fillColor: [bgDark[0], bgDark[1], bgDark[2]],
        textColor: [textWhite[0], textWhite[1], textWhite[2]],
        fontSize: 7,
        cellPadding: 2,
        lineColor: [borderColor[0], borderColor[1], borderColor[2]],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [bgCard[0], bgCard[1], bgCard[2]],
      },
      margin: { left: margin, right: margin },
      didParseCell: function(data) {
        if (data.column.index === 2 && data.cell.section === 'body') {
          data.cell.styles.textColor = [neonGreen[0], neonGreen[1], neonGreen[2]];
        }
        if (data.column.index === 3 && data.cell.section === 'body') {
          data.cell.styles.textColor = [neonOrange[0], neonOrange[1], neonOrange[2]];
        }
        if (data.column.index === 4 && data.cell.section === 'body') {
          data.cell.styles.textColor = [neonCyan[0], neonCyan[1], neonCyan[2]];
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==================== PAGE 2: DETAILED BALES LIST ====================
  doc.addPage('a4', 'landscape');
  doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header
  doc.setFillColor(neonCyan[0], neonCyan[1], neonCyan[2]);
  doc.rect(0, 0, pageWidth, 2, 'F');
  doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
  doc.rect(0, 2, pageWidth, 14, 'F');

  doc.setFillColor(neonCyan[0], neonCyan[1], neonCyan[2]);
  doc.circle(margin + 6, 9, 4, 'F');
  doc.setTextColor(bgDark[0], bgDark[1], bgDark[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("C", margin + 4.5, 10.5);

  doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
  doc.setFontSize(11);
  doc.text("Detalhamento dos Fardos", margin + 13, 10);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(7);
  doc.text(`${filteredBales.length} fardos encontrados`, pageWidth - margin, 10, { align: 'right' });

  currentY = 20;

  // Detailed table
  const tableData = filteredBales.slice(0, 200).map(bale => [
    bale.numero?.toString().padStart(5, '0') || "-",
    bale.id,
    bale.talhao || "-",
    bale.safra || "-",
    bale.status.charAt(0).toUpperCase() + bale.status.slice(1),
    format(bale.createdAt, "dd/MM/yy HH:mm", { locale: ptBR }),
    format(bale.updatedAt, "dd/MM/yy HH:mm", { locale: ptBR }),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Numero", "ID/QR Code", "Talhao", "Safra", "Status", "Criado em", "Atualizado em"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [bgCard[0], bgCard[1], bgCard[2]],
      textColor: [neonCyan[0], neonCyan[1], neonCyan[2]],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: 2,
    },
    styles: {
      fillColor: [bgDark[0], bgDark[1], bgDark[2]],
      textColor: [textWhite[0], textWhite[1], textWhite[2]],
      fontSize: 6,
      cellPadding: 1.5,
      lineColor: [borderColor[0], borderColor[1], borderColor[2]],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'left', fontSize: 5 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 32, halign: 'center' },
      6: { cellWidth: 32, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [bgCard[0], bgCard[1], bgCard[2]],
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      if (data.column.index === 4 && data.cell.section === 'body') {
        const status = (data.cell.raw as string).toLowerCase();
        if (status === 'campo') {
          data.cell.styles.textColor = [neonGreen[0], neonGreen[1], neonGreen[2]];
        } else if (status === 'patio') {
          data.cell.styles.textColor = [neonOrange[0], neonOrange[1], neonOrange[2]];
        } else if (status === 'beneficiado') {
          data.cell.styles.textColor = [neonCyan[0], neonCyan[1], neonCyan[2]];
        }
      }
    }
  });

  // Note if more bales
  if (filteredBales.length > 200) {
    const finalY = (doc as any).lastAutoTable.finalY + 3;
    doc.setFontSize(7);
    doc.setTextColor(neonOrange[0], neonOrange[1], neonOrange[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mostrando 200 de ${filteredBales.length} fardos. Exporte para Excel para ver todos.`, margin, finalY);
  }

  // ==================== FOOTER ON ALL PAGES ====================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setFillColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.rect(0, pageHeight - 8, pageWidth, 0.8, 'F');

    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text("Cotton App - Sistema de Rastreabilidade de Fardos de Algodao", margin, pageHeight - 3);

    doc.setTextColor(neonGreen[0], neonGreen[1], neonGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 3, { align: 'right' });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function generateExcel(bales: Bale[], filters: ReportFilters, options: ReportOptions = {}): Buffer {
  const filteredBales = filterBales(bales, filters);
  const stats = calculateStats(filteredBales);
  const talhaoStats = calculateTalhaoStats(filteredBales);
  const dailyStats = calculateDailyStats(filteredBales);

  // Productivity metrics
  const fardosPorHectare = stats.total / TOTAL_HECTARES;
  const arrobasPorHectare = fardosPorHectare * ARROBAS_PER_FARDO;
  const progressPercent = stats.total > 0 ? (stats.beneficiado / stats.total) * 100 : 0;

  const workbook = XLSX.utils.book_new();

  // ==================== SHEET 1: RESUMO EXECUTIVO ====================
  const summaryData = [
    ["COTTON APP - RELATORIO DE RASTREABILIDADE"],
    [""],
    ["INFORMACOES DO RELATORIO"],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ["Periodo:", filters.startDate || filters.endDate ?
      `${filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "Inicio"} - ${filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "Hoje"}`
      : "Todos os dados"],
    ["Filtros de Status:", filters.status?.length ? filters.status.join(", ") : "Todos"],
    ["Filtros de Talhao:", filters.talhao?.length ? filters.talhao.join(", ") : "Todos"],
    [""],
    ["ESTATISTICAS GERAIS"],
    ["Total de Fardos:", stats.total],
    ["Area Total (ha):", TOTAL_HECTARES.toFixed(2)],
    ["Fardos/Hectare:", fardosPorHectare.toFixed(2)],
    ["Arrobas/Hectare:", arrobasPorHectare.toFixed(2)],
    [""],
    ["DISTRIBUICAO POR STATUS"],
    ["No Campo:", stats.campo, `${stats.total > 0 ? ((stats.campo/stats.total)*100).toFixed(1) : 0}%`],
    ["No Patio:", stats.patio, `${stats.total > 0 ? ((stats.patio/stats.total)*100).toFixed(1) : 0}%`],
    ["Beneficiado:", stats.beneficiado, `${progressPercent.toFixed(1)}%`],
    [""],
    ["PROGRESSO DO BENEFICIAMENTO"],
    ["Percentual Concluido:", `${progressPercent.toFixed(1)}%`],
    ["Fardos Pendentes:", stats.campo + stats.patio],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo Executivo");

  // ==================== SHEET 2: ANALISE POR TALHAO ====================
  const talhaoData = [
    ["ANALISE DETALHADA POR TALHAO"],
    [""],
    ["Talhao", "Hectares", "Total Fardos", "Campo", "Patio", "Beneficiado", "Fardos/ha", "Arrobas/ha", "Progresso (%)"],
    ...talhaoStats.map(t => [
      t.talhao,
      t.hectares > 0 ? t.hectares.toFixed(2) : 'N/A',
      t.total,
      t.campo,
      t.patio,
      t.beneficiado,
      t.hectares > 0 ? t.fardosPorHectare.toFixed(2) : 'N/A',
      t.hectares > 0 ? t.arrobasPorHectare.toFixed(2) : 'N/A',
      t.progressPercent.toFixed(1),
    ]),
    [""],
    ["TOTAIS", TOTAL_HECTARES.toFixed(2), stats.total, stats.campo, stats.patio, stats.beneficiado, fardosPorHectare.toFixed(2), arrobasPorHectare.toFixed(2), progressPercent.toFixed(1)],
  ];

  const talhaoSheet = XLSX.utils.aoa_to_sheet(talhaoData);
  talhaoSheet['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, talhaoSheet, "Por Talhao");

  // ==================== SHEET 3: ATIVIDADE DIARIA ====================
  const dailyArray = Array.from(dailyStats.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));

  const dailyData = [
    ["ATIVIDADE DIARIA"],
    [""],
    ["Data", "Total Criados", "Campo", "Patio", "Beneficiado"],
    ...dailyArray.map(([date, stat]) => [
      format(new Date(date), "dd/MM/yyyy", { locale: ptBR }),
      stat.total,
      stat.campo,
      stat.patio,
      stat.beneficiado,
    ]),
  ];

  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
  dailySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, dailySheet, "Atividade Diaria");

  // ==================== SHEET 4: LISTA COMPLETA DE FARDOS ====================
  const balesData = filteredBales.map(bale => ({
    "Numero": bale.numero?.toString().padStart(5, '0') || '-',
    "ID/QR Code": bale.id,
    "Talhao": bale.talhao || '-',
    "Safra": bale.safra || '-',
    "Status": bale.status.charAt(0).toUpperCase() + bale.status.slice(1),
    "Hectares Talhao": bale.talhao && TALHOES_INFO[bale.talhao] ? TALHOES_INFO[bale.talhao].hectares : '-',
    "Data Cadastro": format(bale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
    "Ultima Atualizacao": format(bale.updatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
  }));

  const balesSheet = XLSX.utils.json_to_sheet(balesData);
  balesSheet['!cols'] = [
    { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, balesSheet, "Todos os Fardos");

  // ==================== SHEET 5: FARDOS POR STATUS ====================
  const statusSheets = [
    { status: "campo", name: "Fardos Campo", color: "green" },
    { status: "patio", name: "Fardos Patio", color: "orange" },
    { status: "beneficiado", name: "Fardos Beneficiados", color: "cyan" },
  ];

  statusSheets.forEach(({ status, name }) => {
    const statusBales = filteredBales.filter(b => b.status === status);
    if (statusBales.length > 0) {
      const data = statusBales.map(bale => ({
        "Numero": bale.numero?.toString().padStart(5, '0') || '-',
        "ID/QR Code": bale.id,
        "Talhao": bale.talhao || '-',
        "Safra": bale.safra || '-',
        "Data Cadastro": format(bale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
        "Ultima Atualizacao": format(bale.updatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      sheet['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    }
  });

  // ==================== SHEET 6: SAFRAS ====================
  const safraMap = new Map<string, { total: number; campo: number; patio: number; beneficiado: number }>();
  filteredBales.forEach(bale => {
    const safra = bale.safra || "Sem Safra";
    if (!safraMap.has(safra)) {
      safraMap.set(safra, { total: 0, campo: 0, patio: 0, beneficiado: 0 });
    }
    const stat = safraMap.get(safra)!;
    stat.total++;
    if (bale.status === 'campo') stat.campo++;
    else if (bale.status === 'patio') stat.patio++;
    else if (bale.status === 'beneficiado') stat.beneficiado++;
  });

  const safraData = [
    ["DISTRIBUICAO POR SAFRA"],
    [""],
    ["Safra", "Total", "Campo", "Patio", "Beneficiado", "Progresso (%)"],
    ...Array.from(safraMap.entries()).map(([safra, stat]) => [
      safra,
      stat.total,
      stat.campo,
      stat.patio,
      stat.beneficiado,
      stat.total > 0 ? ((stat.beneficiado / stat.total) * 100).toFixed(1) : "0",
    ]),
  ];

  const safraSheet = XLSX.utils.aoa_to_sheet(safraData);
  safraSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, safraSheet, "Por Safra");

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
