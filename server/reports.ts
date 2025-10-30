import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Bale } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string[];
  talhao?: string[];
}

interface BaleStats {
  total: number;
  campo: number;
  patio: number;
  beneficiado: number;
}

function filterBales(bales: Bale[], filters: ReportFilters): Bale[] {
  return bales.filter(bale => {
    // Filtro de status - aceita array
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(bale.status)) return false;
    }
    
    // Filtro de talhao - aceita array
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

export function generatePDF(bales: Bale[], filters: ReportFilters): Buffer {
  const filteredBales = filterBales(bales, filters);
  const stats = calculateStats(filteredBales);
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Cores da empresa
  const verdeEscuro = [16, 106, 68];
  const verde = [34, 197, 94];
  const amarelo = [234, 179, 8];
  const amareloClaro = [253, 224, 71];
  const cinza = [75, 85, 99];
  const cinzaClaro = [249, 250, 251];
  const branco = [255, 255, 255];
  const azul = [59, 130, 246];
  
  // Calcular estatisticas avancadas
  const talhaoStats = new Map<string, { total: number; campo: number; patio: number; beneficiado: number }>();
  const safraStats = new Map<string, number>();
  const dailyStats = new Map<string, number>();
  
  filteredBales.forEach(bale => {
    // Por talhao
    const talhao = bale.talhao || "Sem Talhao";
    if (!talhaoStats.has(talhao)) {
      talhaoStats.set(talhao, { total: 0, campo: 0, patio: 0, beneficiado: 0 });
    }
    const tStat = talhaoStats.get(talhao)!;
    tStat.total++;
    if (bale.status === 'campo') tStat.campo++;
    else if (bale.status === 'patio') tStat.patio++;
    else if (bale.status === 'beneficiado') tStat.beneficiado++;
    
    // Por safra
    if (bale.safra) {
      safraStats.set(bale.safra, (safraStats.get(bale.safra) || 0) + 1);
    }
    
    // Por dia
    const day = format(bale.createdAt, "dd/MM", { locale: ptBR });
    dailyStats.set(day, (dailyStats.get(day) || 0) + 1);
  });
  
  // ==================== CABECALHO ====================
  doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.rect(0, 0, pageWidth, 4, 'F');
  
  doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.rect(0, 4, pageWidth, 20, 'F');
  
  doc.setTextColor(branco[0], branco[1], branco[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("GRUPO PROGRESSO", margin, 14);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Relatorio de Rastreabilidade de Algodao", margin, 20);
  
  doc.setFontSize(8);
  const dataGeracao = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  doc.text(`Gerado em: ${dataGeracao}`, pageWidth - margin, 20, { align: 'right' });
  
  let currentY = 30;
  
  // ==================== RESUMO EXECUTIVO ====================
  doc.setFillColor(cinzaClaro[0], cinzaClaro[1], cinzaClaro[2]);
  doc.roundedRect(margin, currentY, contentWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  let resumoText = "RESUMO: ";
  if (filters.startDate || filters.endDate) {
    const inicio = filters.startDate ? format(new Date(filters.startDate), "dd/MM/yy", { locale: ptBR }) : "Inicio";
    const fim = filters.endDate ? format(new Date(filters.endDate), "dd/MM/yy", { locale: ptBR }) : "Hoje";
    resumoText += `Periodo: ${inicio} - ${fim} | `;
  }
  resumoText += `Total: ${stats.total} fardos`;
  
  if (filters.status && filters.status.length > 0) {
    resumoText += ` | Status: ${filters.status.join(", ")}`;
  }
  if (filters.talhao && filters.talhao.length > 0) {
    const talhoesText = filters.talhao.slice(0, 5).join(", ");
    resumoText += ` | Talhoes: ${talhoesText}${filters.talhao.length > 5 ? '...' : ''}`;
  }
  
  doc.text(resumoText, margin + 3, currentY + 6.5);
  currentY += 15;
  
  // ==================== INDICADORES PRINCIPAIS ====================
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;
  const cardSpacing = 3;
  
  // Card 1 - Total
  doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'S');
  
  doc.setTextColor(amareloClaro[0], amareloClaro[1], amareloClaro[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("TOTAL FARDOS", margin + 2, currentY + 6);
  doc.setTextColor(branco[0], branco[1], branco[2]);
  doc.setFontSize(20);
  doc.text(stats.total.toString(), margin + 2, currentY + 16);
  
  // Card 2 - Campo (Amarelo)
  const card2X = margin + cardWidth + cardSpacing;
  doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("CAMPO", card2X + cardWidth/2, currentY + 6, { align: 'center' });
  doc.setFontSize(20);
  doc.text(stats.campo.toString(), card2X + cardWidth/2, currentY + 15, { align: 'center' });
  const campoPercent = stats.total > 0 ? ((stats.campo / stats.total) * 100).toFixed(1) : "0.0";
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${campoPercent}%`, card2X + cardWidth/2, currentY + 20, { align: 'center' });
  
  // Card 3 - Patio (Verde)
  const card3X = card2X + cardWidth + cardSpacing;
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setTextColor(branco[0], branco[1], branco[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("PATIO", card3X + cardWidth/2, currentY + 6, { align: 'center' });
  doc.setFontSize(20);
  doc.text(stats.patio.toString(), card3X + cardWidth/2, currentY + 15, { align: 'center' });
  const patioPercent = stats.total > 0 ? ((stats.patio / stats.total) * 100).toFixed(1) : "0.0";
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patioPercent}%`, card3X + cardWidth/2, currentY + 20, { align: 'center' });
  
  // Card 4 - Beneficiado (Verde Escuro com tarja amarela)
  const card4X = card3X + cardWidth + cardSpacing;
  doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.roundedRect(card4X, currentY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.roundedRect(card4X, currentY, cardWidth, 5, 3, 3, 'F');
  
  doc.setTextColor(branco[0], branco[1], branco[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("BENEFICIADO", card4X + cardWidth/2, currentY + 11, { align: 'center' });
  doc.setFontSize(20);
  doc.text(stats.beneficiado.toString(), card4X + cardWidth/2, currentY + 18, { align: 'center' });
  const beneficiadoPercent = stats.total > 0 ? ((stats.beneficiado / stats.total) * 100).toFixed(1) : "0.0";
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${beneficiadoPercent}%`, card4X + cardWidth/2, currentY + 20, { align: 'center' });
  
  currentY += cardHeight + 8;
  
  // ==================== SECAO DE ANALISES (3 COLUNAS) ====================
  const col1Width = contentWidth * 0.32;
  const col2Width = contentWidth * 0.32;
  const col3Width = contentWidth * 0.32;
  const colGap = 6;
  
  // COLUNA 1 - Ranking de Talhoes (Verde)
  doc.setFillColor(branco[0], branco[1], branco[2]);
  doc.roundedRect(margin, currentY, col1Width, 50, 2, 2, 'F');
  doc.setDrawColor(verde[0], verde[1], verde[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, col1Width, 50, 2, 2, 'S');
  
  // Titulo com fundo verde
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.roundedRect(margin, currentY, col1Width, 8, 2, 2, 'F');
  doc.setTextColor(branco[0], branco[1], branco[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Top 8 Talhoes por Volume", margin + col1Width/2, currentY + 5.5, { align: 'center' });
  
  const topTalhoes = Array.from(talhaoStats.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);
  
  let talhaoY = currentY + 12;
  topTalhoes.forEach(([talhao, stat], index) => {
    const barWidth = col1Width - 12;
    const completionRate = stat.total > 0 ? (stat.beneficiado / stat.total) : 0;
    
    // Nome e quantidade
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.text(`${index + 1}. ${talhao}`, margin + 3, talhaoY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(cinza[0], cinza[1], cinza[2]);
    doc.text(`${stat.total} fardos`, margin + 32, talhaoY);
    
    // Barra de progresso
    const miniBarX = margin + 3;
    const miniBarY = talhaoY + 1;
    
    doc.setFillColor(230, 230, 230);
    doc.rect(miniBarX, miniBarY, barWidth, 2, 'F');
    
    if (completionRate > 0) {
      doc.setFillColor(verde[0], verde[1], verde[2]);
      doc.rect(miniBarX, miniBarY, barWidth * completionRate, 2, 'F');
    }
    
    // Percentual
    doc.setFontSize(6);
    doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.text(`${(completionRate * 100).toFixed(0)}%`, margin + col1Width - 10, talhaoY);
    
    talhaoY += 4.5;
  });
  
  if (talhaoStats.size === 0) {
    doc.setFontSize(7);
    doc.setTextColor(cinza[0], cinza[1], cinza[2]);
    doc.text("Nenhum talhao encontrado", margin + 3, currentY + 25);
  }
  
  // COLUNA 2 - Distribuicao por Safra (Amarelo)
  const col2X = margin + col1Width + colGap;
  doc.setFillColor(branco[0], branco[1], branco[2]);
  doc.roundedRect(col2X, currentY, col2Width, 50, 2, 2, 'F');
  doc.setDrawColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(col2X, currentY, col2Width, 50, 2, 2, 'S');
  
  // Titulo com fundo amarelo
  doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
  doc.roundedRect(col2X, currentY, col2Width, 8, 2, 2, 'F');
  doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Distribuicao por Safra", col2X + col2Width/2, currentY + 5.5, { align: 'center' });
  
  const safraArray = Array.from(safraStats.entries())
    .sort((a, b) => b[1] - a[1]);
  
  if (safraArray.length > 0) {
    let safraY = currentY + 13;
    const maxSafraCount = Math.max(...safraArray.map(s => s[1]));
    const chartHeight = 35;
    const barWidth = (col2Width - 10) / safraArray.length - 2;
    
    safraArray.forEach(([safra, count], index) => {
      const barHeight = (count / maxSafraCount) * chartHeight;
      const barX = col2X + 5 + (index * (barWidth + 2));
      const barY = currentY + 45 - barHeight;
      
      // Barra (Amarelo)
      doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
      doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
      
      // Valor no topo
      doc.setFontSize(6);
      doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(count.toString(), barX + barWidth/2, barY - 1, { align: 'center' });
      
      // Label
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(safra, barX + barWidth/2, currentY + 48, { align: 'center' });
    });
  } else {
    doc.setFontSize(7);
    doc.setTextColor(cinza[0], cinza[1], cinza[2]);
    doc.text("Nenhuma safra registrada", col2X + 3, currentY + 25);
  }
  
  // COLUNA 3 - Evolucao Diaria (Verde Escuro)
  const col3X = col2X + col2Width + colGap;
  doc.setFillColor(branco[0], branco[1], branco[2]);
  doc.roundedRect(col3X, currentY, col3Width, 50, 2, 2, 'F');
  doc.setDrawColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(col3X, currentY, col3Width, 50, 2, 2, 'S');
  
  // Titulo com fundo verde escuro
  doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.roundedRect(col3X, currentY, col3Width, 8, 2, 2, 'F');
  doc.setTextColor(amareloClaro[0], amareloClaro[1], amareloClaro[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Cadastros Recentes", col3X + col3Width/2, currentY + 5.5, { align: 'center' });
  
  const dailyArray = Array.from(dailyStats.entries())
    .sort((a, b) => {
      const dateA = a[0].split('/').reverse().join('');
      const dateB = b[0].split('/').reverse().join('');
      return dateB.localeCompare(dateA);
    })
    .slice(0, 7);
  
  if (dailyArray.length > 0) {
    let dailyY = currentY + 13;
    const maxDaily = Math.max(...dailyArray.map(d => d[1]));
    
    dailyArray.forEach(([day, count]) => {
      const barWidth = (count / maxDaily) * (col3Width - 40);
      
      // Data
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
      doc.text(day, col3X + 3, dailyY);
      
      // Barra (Verde)
      doc.setFillColor(verde[0], verde[1], verde[2]);
      doc.roundedRect(col3X + 18, dailyY - 3, barWidth > 2 ? barWidth : 2, 4, 1, 1, 'F');
      
      // Quantidade
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(cinza[0], cinza[1], cinza[2]);
      doc.text(count.toString(), col3X + 20 + barWidth, dailyY);
      
      dailyY += 5;
    });
  } else {
    doc.setFontSize(7);
    doc.setTextColor(cinza[0], cinza[1], cinza[2]);
    doc.text("Sem dados recentes", col3X + 3, currentY + 25);
  }
  
  currentY += 58;
  
  // ==================== TABELA DETALHADA ====================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
  doc.text("Detalhamento dos Fardos", margin, currentY);
  currentY += 2;
  
  const tableData = filteredBales.slice(0, 150).map(bale => [
    bale.numero?.toString() || "-",
    bale.talhao || "-",
    bale.safra || "-",
    bale.status,
    format(bale.createdAt, "dd/MM/yy", { locale: ptBR }),
  ]);
  
  autoTable(doc, {
    startY: currentY,
    head: [["Nº", "Talhão", "Safra", "Status", "Data"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]],
      textColor: [amareloClaro[0], amareloClaro[1], amareloClaro[2]],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 3,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 9 },
      1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 50, halign: 'center', fontStyle: 'bold', fontSize: 9 },
      4: { cellWidth: 30, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [cinzaClaro[0], cinzaClaro[1], cinzaClaro[2]],
    },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.cell.section === 'body') {
        const status = data.cell.raw as string;
        if (status === 'campo') {
          data.cell.styles.fillColor = [amarelo[0], amarelo[1], amarelo[2]];
          data.cell.styles.textColor = [verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]];
        } else if (status === 'patio') {
          data.cell.styles.fillColor = [verde[0], verde[1], verde[2]];
          data.cell.styles.textColor = [branco[0], branco[1], branco[2]];
        } else if (status === 'beneficiado') {
          data.cell.styles.fillColor = [verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]];
          data.cell.styles.textColor = [branco[0], branco[1], branco[2]];
        }
      }
    }
  });
  
  // Aviso se houver mais fardos
  if (filteredBales.length > 150) {
    const finalY = (doc as any).lastAutoTable.finalY + 3;
    doc.setFontSize(8);
    doc.setTextColor(cinza[0], cinza[1], cinza[2]);
    doc.setFont('helvetica', 'italic');
    doc.text(`Mostrando 150 de ${filteredBales.length} fardos. Para consultar todos os dados, gere um relatorio Excel.`, margin, finalY);
  }
  
  // ==================== RODAPE ====================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setFillColor(verdeEscuro[0], verdeEscuro[1], verdeEscuro[2]);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
    
    doc.setFillColor(amarelo[0], amarelo[1], amarelo[2]);
    doc.rect(0, pageHeight - 6, pageWidth, 1.5, 'F');
    
    doc.setTextColor(branco[0], branco[1], branco[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text("Grupo Progresso", margin, pageHeight - 2);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("Sistema de Rastreabilidade de Algodao", 45, pageHeight - 2);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Pag. ${i}/${pageCount}`, pageWidth - margin, pageHeight - 2, { align: 'right' });
  }
  
  return Buffer.from(doc.output("arraybuffer"));
}

export function generateExcel(bales: Bale[], filters: ReportFilters): Buffer {
  const filteredBales = filterBales(bales, filters);
  const stats = calculateStats(filteredBales);
  
  // Summary sheet
  const summaryData = [
    ["Relatório de Rastreabilidade de Fardos"],
    [""],
    ["Gerado em:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    [""],
    ["Estatísticas"],
    ["Total de fardos:", stats.total],
    ["Campo:", stats.campo],
    ["Pátio:", stats.patio],
    ["Beneficiado:", stats.beneficiado],
  ];
  
  if (filters.startDate || filters.endDate) {
    summaryData.splice(3, 0, [
      "Período:",
      `${filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy", { locale: ptBR }) : "Início"} - ${filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy", { locale: ptBR }) : "Hoje"}`
    ]);
  }
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Bales sheet
  const balesData = filteredBales.map(bale => ({
    "Número": bale.numero,
    "Talhão": bale.talhao,
    "Safra": bale.safra,
    "ID/QR Code": bale.id,
    "Status": bale.status,
    "Data Cadastro": format(bale.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
    "Última Atualização": format(bale.updatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR }),
  }));
  
  const balesSheet = XLSX.utils.json_to_sheet(balesData);
  
  // Status breakdown sheet
  const statusBreakdown = [
    ["Status", "Quantidade"],
    ["Campo", stats.campo],
    ["Pátio", stats.patio],
    ["Beneficiado", stats.beneficiado],
  ];
  
  const statusSheet = XLSX.utils.aoa_to_sheet(statusBreakdown);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
  XLSX.utils.book_append_sheet(workbook, balesSheet, "Fardos");
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Por Status");
  
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
