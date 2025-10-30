import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import L from 'leaflet';
import { cottonTalhoes, otherTalhoes } from '@/data/talhoes-geojson';
import { useTalhaoStats } from '@/hooks/use-talhao-stats';
import { useSettings } from '@/hooks/use-settings';
import { Search, Layers, TrendingUp, AlertTriangle, Download, Eye, EyeOff, Play, Pause, Calendar as CalendarIcon, Info, X, MapPin, Wheat, Package, BarChart3, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type ViewMode = 'normal' | 'heatmap' | 'status';
type FilterStatus = 'all' | 'em_colheita' | 'concluido' | 'nao_iniciado';

interface InteractiveTalhaoMapProps {
  selectedTalhao?: string;
  onTalhaoClick?: (talhao: string) => void;
}

// Componente para fazer zoom em um talhão específico
function ZoomToTalhao({ talhao }: { talhao: string | null }) {
  const map = useMap();
  
  if (talhao) {
    // Aqui você poderia calcular o centro do polígono do talhão
    // Por enquanto, apenas zoom out para mostrar todos
    map.setView([-7.49, -44.20], 12);
  }
  
  return null;
}

export function InteractiveTalhaoMap({ selectedTalhao, onTalhaoClick }: InteractiveTalhaoMapProps) {
  const { data: settings } = useSettings();
  const safra = settings?.defaultSafra || '2526';
  const { data: statsMap } = useTalhaoStats(safra);
  
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOtherCultures, setShowOtherCultures] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [productivityThreshold, setProductivityThreshold] = useState([0]);
  const [zoomToTalhao, setZoomToTalhao] = useState<string | null>(null);
  const [compareSafras, setCompareSafras] = useState(false);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [showSummary, setShowSummary] = useState(true);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  
  // Calcular estatísticas gerais
  const overallStats = useMemo(() => {
    if (!statsMap) return null;
    
    const stats = Object.values(statsMap);
    const totalFardos = stats.reduce((sum, s: any) => sum + s.totalFardos, 0);
    const totalArea = stats.reduce((sum, s: any) => sum + s.area, 0);
    const produtividadeFardos = totalArea > 0 ? totalFardos / totalArea : 0;
    const produtividadeArrobas = produtividadeFardos * 66.67; // 1 fardo = 2000kg = 66.67@
    
    return {
      totalFardos,
      totalArea,
      produtividadeMedia: Math.round(produtividadeFardos * 100) / 100,
      produtividadeArrobas: Math.round(produtividadeArrobas * 100) / 100,
      talhoes: stats.length
    };
  }, [statsMap]);
  
  // Função para determinar cor baseada em produtividade (heatmap)
  const getHeatmapColor = (produtividade: number, maxProd: number) => {
    if (maxProd === 0) return '#9ca3af';
    
    const ratio = produtividade / maxProd;
    
    if (ratio > 0.75) return '#059669'; // Verde escuro - alta
    if (ratio > 0.5) return '#10b981';  // Verde médio
    if (ratio > 0.25) return '#fbbf24'; // Amarelo - média
    return '#ef4444'; // Vermelho - baixa
  };
  
  // Função para determinar cor baseada em status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_colheita': return '#3b82f6'; // Azul
      case 'concluido': return '#10b981';   // Verde
      case 'nao_iniciado': return '#9ca3af'; // Cinza
      default: return '#9ca3af';
    }
  };
  
  // Calcular produtividade máxima para heatmap
  const maxProdutividade = useMemo(() => {
    if (!statsMap) return 0;
    return Math.max(...Object.values(statsMap).map((s: any) => s.produtividade || 0));
  }, [statsMap]);
  
  // Identificar talhões com alertas
  const talhoesComAlerta = useMemo(() => {
    if (!statsMap) return [];
    
    const alertas: any[] = [];
    const produtividadeMediaGeral = overallStats?.produtividadeMedia || 0;
    
    Object.values(statsMap).forEach((stats: any) => {
      const problemas: string[] = [];
      
      // Baixa produtividade (< 50% da média)
      if (stats.produtividade < produtividadeMediaGeral * 0.5 && stats.totalFardos > 0) {
        problemas.push('Produtividade abaixo da média');
      }
      
      // Sem atividade há 7+ dias
      if (stats.ultimoFardo) {
        const diasDesdeUltimo = (Date.now() - new Date(stats.ultimoFardo.data).getTime()) / (1000 * 60 * 60 * 24);
        if (diasDesdeUltimo > 7 && stats.status === 'em_colheita') {
          problemas.push('Sem atividade há mais de 7 dias');
        }
      }
      
      // Não iniciado (sem fardos)
      if (stats.totalFardos === 0) {
        problemas.push('Colheita não iniciada');
      }
      
      if (problemas.length > 0) {
        alertas.push({
          talhao: stats.talhao,
          problemas
        });
      }
    });
    
    return alertas;
  }, [statsMap, overallStats]);
  
  // Função para exportar relatório em PDF
  const handleExportPDF = async () => {
    try {
      const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapElement) return;
      
      const canvas = await html2canvas(mapElement);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Título
      pdf.setFontSize(18);
      pdf.text(`Relatório de Talhões - Safra ${safra}`, 15, 15);
      
      // Data
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 15, 22);
      
      // Estatísticas gerais
      if (overallStats) {
        pdf.setFontSize(12);
        pdf.text('Estatísticas Gerais:', 15, 32);
        pdf.setFontSize(10);
        pdf.text(`Total de Fardos: ${overallStats.totalFardos}`, 20, 38);
        pdf.text(`Área Total: ${overallStats.totalArea.toFixed(2)} ha`, 20, 43);
        pdf.text(`Produtividade Média: ${overallStats.produtividadeArrobas.toFixed(2)} @/ha (${overallStats.produtividadeMedia.toFixed(2)} fardos/ha)`, 20, 48);
        pdf.text(`Talhões: ${overallStats.talhoes}`, 20, 53);
      }
      
      // Mapa
      const imgWidth = pdfWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yPosition = 60;
      
      pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, Math.min(imgHeight, pdfHeight - yPosition - 10));
      
      // Alertas em nova página se houver
      if (talhoesComAlerta.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Alertas e Avisos', 15, 15);
        
        let y = 25;
        talhoesComAlerta.forEach((alerta: any, index: number) => {
          if (y > 280) {
            pdf.addPage();
            y = 15;
          }
          
          pdf.setFontSize(12);
          pdf.setTextColor(220, 38, 38); // Vermelho
          pdf.text(`⚠ Talhão ${alerta.talhao}:`, 20, y);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          
          alerta.problemas.forEach((problema: string, i: number) => {
            y += 5;
            pdf.text(`  • ${problema}`, 25, y);
          });
          
          y += 8;
        });
      }
      
      pdf.save(`relatorio-talhoes-safra-${safra}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };
  
  // Timeline: simular progresso ao longo do tempo
  const handleTimelinePlay = () => {
    if (isPlayingTimeline) {
      setIsPlayingTimeline(false);
      return;
    }
    
    setIsPlayingTimeline(true);
    // Aqui você pode implementar lógica para avançar o timelineDate
    // Por enquanto, apenas toggle do estado
  };
  
  // Calcular centroide de um polígono para posicionar marcadores
  const getPolygonCenter = (coordinates: any[]): [number, number] => {
    const points = coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    
    points.forEach((point: number[]) => {
      sumLng += point[0];
      sumLat += point[1];
    });
    
    return [sumLat / points.length, sumLng / points.length];
  };
  
  // Criar ícone personalizado para alertas
  const createAlertIcon = () => {
    return L.divIcon({
      className: 'custom-alert-icon',
      html: `
        <div style="
          background: #f97316;
          border: 2px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };
  
  // Criar ícone de label para o nome do talhão
  const createLabelIcon = (nome: string) => {
    return L.divIcon({
      className: 'custom-label-icon',
      html: `
        <div style="
          background: rgba(22, 163, 74, 0.95);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 13px;
          border: 2px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          white-space: nowrap;
          text-align: center;
          pointer-events: none;
          transform: translate(-50%, -50%);
        ">
          ${nome}
        </div>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });
  };
  
  // Estilo dinâmico para talhões de algodão
  const getCottonStyle = (feature: any) => {
    const talhao = feature.properties.nome;
    const stats = statsMap?.[talhao];
    
    if (!stats) {
      return {
        fillColor: '#9ca3af',
        weight: 2,
        opacity: 0.5,
        color: '#6b7280',
        fillOpacity: 0.3
      };
    }
    
    let fillColor = '#22c55e';
    
    if (viewMode === 'heatmap') {
      fillColor = getHeatmapColor(stats.produtividade, maxProdutividade);
    } else if (viewMode === 'status') {
      fillColor = getStatusColor(stats.status);
    }
    
    return {
      fillColor,
      weight: 2,
      opacity: 1,
      color: '#16a34a',
      dashArray: '',
      fillOpacity: 0.7
    };
  };
  
  // Estilo para outros talhões
  const otherStyle = () => ({
    fillColor: '#9ca3af',
    weight: 1,
    opacity: 0.3,
    color: '#6b7280',
    dashArray: '',
    fillOpacity: 0.15
  });
  
  // Handler para features de algodão
  const onEachCottonFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const { nome, area } = feature.properties;
      const stats = statsMap?.[nome];
      
      // Tooltip para hover (informações rápidas)
      let tooltipContent = `
        <div class="p-2">
          <h3 class="font-bold text-base text-green-700">Talhão ${nome}</h3>
          <p class="text-sm"><b>Área:</b> ${area?.toFixed(2)} ha</p>
      `;
      
      if (stats) {
        const prodArrobas = (stats.produtividade * 66.67).toFixed(2);
        tooltipContent += `
          <p class="text-sm"><b>Fardos:</b> ${stats.totalFardos}</p>
          <p class="text-sm"><b>Produtividade:</b> ${prodArrobas} @/ha (${stats.produtividade.toFixed(2)} f/ha)</p>
        `;
      }
      
      tooltipContent += `<p class="text-xs text-gray-500 mt-1">Clique para mais detalhes</p></div>`;
      
      // Bind tooltip para aparecer no hover
      layer.bindTooltip(tooltipContent, {
        permanent: false,
        sticky: true,
        className: 'custom-tooltip',
        direction: 'top'
      });
      
      layer.on({
        click: (e: L.LeafletMouseEvent) => {
          // Prevenir propagação
          L.DomEvent.stopPropagation(e);
          
          // Abrir o dialog com informações completas
          if (onTalhaoClick) {
            onTalhaoClick(nome);
          }
        },
        mouseover: (e: L.LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle({
            weight: 3,
            fillOpacity: 0.9
          });
        },
        mouseout: (e: L.LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle(getCottonStyle(feature));
        }
      });
    }
  };
  
  // Handler para outras culturas
  const onEachOtherFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const { nome, area, cultura } = feature.properties;
      
      layer.bindPopup(`
        <div class="p-2 opacity-70">
          <h3 class="font-bold text-sm mb-1">Talhão ${nome}</h3>
          <p class="text-xs"><b>Cultura:</b> ${cultura}</p>
          <p class="text-xs"><b>Área:</b> ${area?.toFixed(2)} ha</p>
        </div>
      `);
    }
  };
  
  // Filtrar talhões baseado na busca e filtros
  const filteredCottonFeatures = useMemo(() => {
    let features = cottonTalhoes.features;
    
    // Filtro de busca
    if (searchQuery) {
      features = features.filter((f: any) => 
        f.properties.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtro de status
    if (filterStatus !== 'all' && statsMap) {
      features = features.filter((f: any) => {
        const stats = statsMap[f.properties.nome];
        return stats?.status === filterStatus;
      });
    }
    
    // Filtro de produtividade
    if (productivityThreshold[0] > 0 && statsMap) {
      features = features.filter((f: any) => {
        const stats = statsMap[f.properties.nome];
        return (stats?.produtividade || 0) >= productivityThreshold[0];
      });
    }
    
    return { ...cottonTalhoes, features };
  }, [searchQuery, filterStatus, productivityThreshold, statsMap]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
              Mapa Interativo - Safra {safra}
              <Badge variant="outline" className="text-xs">{filteredCottonFeatures.features.length} talhões</Badge>
              {talhoesComAlerta.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {talhoesComAlerta.length}
                </Badge>
              )}
            </CardTitle>
            {overallStats && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {overallStats.totalFardos} fardos • {overallStats.produtividadeMedia.toFixed(2)} f/ha • {overallStats.totalArea.toFixed(0)} ha
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFullscreenMap(true)} 
              className="h-8 text-xs"
            >
              <Maximize2 className="h-3 w-3 sm:mr-2" />
              <span className="hidden sm:inline">Expandir</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 text-xs">
              <Download className="h-3 w-3 sm:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
            <Button 
              variant={compareSafras ? "default" : "outline"} 
              size="sm"
              onClick={() => setCompareSafras(!compareSafras)}
              className="h-8 text-xs hidden sm:flex"
            >
              <CalendarIcon className="h-3 w-3 mr-2" />
              Comparar Safras
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 sm:p-4 bg-muted rounded-lg">
          {/* Busca */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs font-semibold">Buscar Talhão</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: 1B, 2A..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          
          {/* Modo de visualização */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Visualização
            </Label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="heatmap">Heatmap</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro de status */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs font-semibold">Status</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="em_colheita">Em Colheita</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Camadas */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Camadas
            </Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="other-cultures"
                  checked={showOtherCultures}
                  onCheckedChange={setShowOtherCultures}
                />
                <Label htmlFor="other-cultures" className="text-xs cursor-pointer">
                  Outras culturas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-alerts"
                  checked={showAlerts}
                  onCheckedChange={setShowAlerts}
                />
                <Label htmlFor="show-alerts" className="text-xs cursor-pointer flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Alertas ({talhoesComAlerta.length})
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timeline Control */}
        {isPlayingTimeline && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Timeline: {format(timelineDate, "dd/MM/yyyy", { locale: ptBR })}
              </Label>
              <Button size="sm" variant="ghost" onClick={() => setIsPlayingTimeline(false)}>
                <Pause className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Visualizando dados históricos até esta data
            </p>
          </div>
        )}
        
        {/* Alertas Summary */}
        {showAlerts && talhoesComAlerta.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-sm">Alertas Detectados ({talhoesComAlerta.length})</h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {talhoesComAlerta.map((alerta: any, idx: number) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border border-orange-100">
                  <span className="font-semibold text-orange-700">Talhão {alerta.talhao}:</span>
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {alerta.problemas.map((problema: string, i: number) => (
                      <li key={i} className="text-gray-600">• {problema}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Slider de produtividade */}
        {viewMode === 'heatmap' && (
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-xs font-semibold mb-2 block">
              Produtividade Mínima: {productivityThreshold[0].toFixed(1)} fardos/ha
            </Label>
            <Slider
              value={productivityThreshold}
              onValueChange={setProductivityThreshold}
              max={maxProdutividade}
              step={0.1}
              className="w-full"
            />
          </div>
        )}
        
        {/* Mapa */}
        <div className="relative">
          {/* Botão para mostrar/ocultar resumo */}
          {!showSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSummary(true)}
              className="absolute top-2 left-2 sm:top-4 sm:left-4 z-[1000] bg-white/95 backdrop-blur shadow-lg"
            >
              <Info className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Mostrar Resumo</span>
            </Button>
          )}
          
          {/* Estatísticas flutuantes sobre o mapa */}
          {showSummary && (
            <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-auto z-[1000] flex flex-col gap-3 max-w-full sm:max-w-xs">
              {/* Card de resumo geral */}
              <Card className="bg-white/98 dark:bg-gray-900/98 backdrop-blur-md shadow-xl border-2 rounded-2xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between border-b-2 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm">Resumo da Safra {safra}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSummary(false)}
                        className="h-7 w-7 p-0 hover:bg-destructive/10 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  
                  {overallStats && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs">
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-green-600 dark:text-green-500" />
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold">Talhões</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-500">{filteredCottonFeatures.features.length}</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Wheat className="w-3 h-3 text-yellow-600 dark:text-yellow-500" />
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold">Área Total</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-500">{overallStats.totalArea.toFixed(0)} <span className="text-xs">ha</span></p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold">Fardos</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-500">{overallStats.totalFardos}</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-3 h-3 text-green-700 dark:text-green-400" />
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-semibold">Média</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-400">{overallStats.produtividadeMedia.toFixed(1)} <span className="text-xs">f/ha</span></p>
                      </div>
                    </div>
                  )}
                  
                  {statsMap && (
                    <div className="pt-2 border-t-2 space-y-1.5">
                      <div className="flex justify-between text-[10px] sm:text-xs items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
                          <span className="text-muted-foreground font-medium">Em Colheita</span>
                        </div>
                        <span className="font-bold text-foreground">{Object.values(statsMap).filter((s: any) => s.status === 'em_colheita').length}</span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                          <span className="text-muted-foreground font-medium">Concluído</span>
                        </div>
                        <span className="font-bold text-foreground">{Object.values(statsMap).filter((s: any) => s.status === 'concluido').length}</span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-xs items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                          <span className="text-muted-foreground font-medium">Não Iniciado</span>
                        </div>
                        <span className="font-bold text-foreground">{Object.values(statsMap).filter((s: any) => s.status === 'nao_iniciado').length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Ranking de produtividade - Escondido no mobile */}
            {statsMap && Object.keys(statsMap).length > 0 && (
              <Card className="hidden sm:block bg-white/98 dark:bg-gray-900/98 backdrop-blur-md shadow-xl border-2 rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b-2 pb-2">
                      <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                        <TrendingUp className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                      </div>
                      <h3 className="font-bold text-sm">Top Produtividade</h3>
                    </div>
                    {Object.values(statsMap)
                      .sort((a: any, b: any) => b.produtividade - a.produtividade)
                      .slice(0, 3)
                      .map((stat: any, index: number) => (
                        <div key={stat.talhao} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                            <span className="font-bold">T{stat.talhao}</span>
                          </div>
                          <span className="font-bold text-yellow-600 dark:text-yellow-500">{stat.produtividade.toFixed(2)} <span className="text-[10px]">f/ha</span></span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          )}
          
          <div className="h-[400px] sm:h-[600px] w-full rounded-lg overflow-hidden border-2 border-muted shadow-xl">
            <MapContainer
              center={[-7.49, -44.20]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Outros talhões */}
              {showOtherCultures && (
                <GeoJSON 
                  data={otherTalhoes} 
                  style={otherStyle}
                  onEachFeature={onEachOtherFeature}
                />
              )}
              
              {/* Talhões de algodão filtrados */}
              <GeoJSON 
                key={`cotton-${viewMode}-${filterStatus}-${searchQuery}-${productivityThreshold[0]}`}
                data={filteredCottonFeatures} 
                style={getCottonStyle}
                onEachFeature={onEachCottonFeature}
              />
              
              {/* Marcadores de Alerta */}
              {showAlerts && talhoesComAlerta.map((alerta: any) => {
                const feature = cottonTalhoes.features.find((f: any) => f.properties.nome === alerta.talhao);
                if (!feature) return null;
                
                const center = getPolygonCenter(feature.geometry.coordinates);
                
                return (
                  <Marker
                    key={`alert-${alerta.talhao}`}
                    position={center}
                    icon={createAlertIcon()}
                  >
                    {/* Popup será mostrado ao clicar no marcador */}
                  </Marker>
                );
              })}
              
              {/* Labels com numeração dos talhões */}
              {showLabels && filteredCottonFeatures.features.map((feature: any) => {
                const center = getPolygonCenter(feature.geometry.coordinates);
                const nome = feature.properties.nome;
                
                return (
                  <Marker
                    key={`label-${nome}`}
                    position={center}
                    icon={createLabelIcon(nome)}
                  />
                );
              })}
              
              <ZoomToTalhao talhao={zoomToTalhao} />
            </MapContainer>
          </div>
        </div>
        
        {/* Legenda melhorada */}
        <Card className="bg-gradient-to-r from-primary/5 to-blue-50 border-2 border-primary/10">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="font-bold">Legenda - Modo: {viewMode === 'normal' ? 'Normal' : viewMode === 'heatmap' ? 'Heatmap Produtividade' : 'Por Status'}</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {viewMode === 'normal' && (
                  <>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded bg-green-500 border border-green-600"></div>
                      <span className="font-medium">Algodão ({filteredCottonFeatures.features.length})</span>
                    </div>
                    {showOtherCultures && (
                      <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                        <div className="w-4 h-4 rounded bg-gray-400 opacity-30 border"></div>
                        <span className="font-medium">Outras culturas ({otherTalhoes.features.length})</span>
                      </div>
                    )}
                    {showAlerts && (
                      <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Alertas ({talhoesComAlerta.length})</span>
                      </div>
                    )}
                  </>
                )}
                
                {viewMode === 'heatmap' && (
                  <>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#059669'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">Muito Alta</span>
                        <span className="text-xs text-muted-foreground">&gt;75% da média</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#10b981'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">Alta</span>
                        <span className="text-xs text-muted-foreground">50-75%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#fbbf24'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">Média</span>
                        <span className="text-xs text-muted-foreground">25-50%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#ef4444'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">Baixa</span>
                        <span className="text-xs text-muted-foreground">&lt;25%</span>
                      </div>
                    </div>
                  </>
                )}
                
                {viewMode === 'status' && (
                  <>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#3b82f6'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">🟦 Em Colheita</span>
                        <span className="text-xs text-muted-foreground">Ativo &lt;7 dias</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#10b981'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">🟩 Concluído</span>
                        <span className="text-xs text-muted-foreground">Inativo &gt;7 dias</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
                      <div className="w-4 h-4 rounded border" style={{backgroundColor: '#9ca3af'}}></div>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">⬜ Não Iniciado</span>
                        <span className="text-xs text-muted-foreground">Sem fardos</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="pt-2 border-t text-xs text-muted-foreground">
                💡 Dica: Passe o mouse sobre um talhão para ver informações rápidas, clique para detalhes completos
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
      
      {/* Estilos customizados para tooltip */}
      <style>{`
        .custom-tooltip {
          background: white !important;
          border: 2px solid #16a34a !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          padding: 0 !important;
        }
        .custom-tooltip::before {
          border-top-color: #16a34a !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: #16a34a !important;
        }
        .leaflet-tooltip-bottom:before {
          border-bottom-color: #16a34a !important;
        }
        .leaflet-tooltip-left:before {
          border-left-color: #16a34a !important;
        }
        .leaflet-tooltip-right:before {
          border-right-color: #16a34a !important;
        }
        .custom-label-icon {
          pointer-events: none !important;
        }
        .custom-label-icon > div {
          transform: translate(-50%, -50%);
        }
      `}</style>

      {/* Fullscreen Map Dialog */}
      <Dialog open={fullscreenMap} onOpenChange={setFullscreenMap}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] h-[98vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold">Mapa Interativo - Safra {safra}</span>
                <Badge variant="outline" className="text-xs">{filteredCottonFeatures.features.length} talhões</Badge>
                {overallStats && (
                  <span className="text-xs text-muted-foreground">
                    {overallStats.totalFardos} fardos • {overallStats.produtividadeMedia.toFixed(2)} f/ha • {overallStats.totalArea.toFixed(0)} ha
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-4">
            <MapContainer
              center={[-7.49, -44.20]}
              zoom={13}
              style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* Other Cultures */}
              {showOtherCultures && (
                <GeoJSON
                  data={otherTalhoes}
                  style={otherStyle}
                  onEachFeature={onEachOtherFeature}
                />
              )}

              {/* Cotton Talhões */}
              <GeoJSON
                key={`fullscreen-cotton-${viewMode}-${filterStatus}`}
                data={filteredCottonFeatures}
                style={getCottonStyle}
                onEachFeature={onEachCottonFeature}
              />

              {/* Marcadores de Alerta */}
              {showAlerts && talhoesComAlerta.map((alerta: any) => {
                const feature = cottonTalhoes.features.find((f: any) => f.properties.nome === alerta.talhao);
                if (!feature) return null;

                const center = getPolygonCenter(feature.geometry.coordinates);

                return (
                  <Marker
                    key={`fullscreen-alert-${alerta.talhao}`}
                    position={center}
                    icon={createAlertIcon()}
                  />
                );
              })}

              {/* Labels */}
              {showLabels && filteredCottonFeatures.features.map((feature: any) => {
                const talhao = feature.properties.nome;
                const centroid = getPolygonCenter(feature.geometry.coordinates);
                const stats = statsMap?.[talhao];

                return (
                  <Marker
                    key={`fullscreen-label-${talhao}`}
                    position={centroid}
                    icon={createLabelIcon(talhao)}
                  />
                );
              })}
            </MapContainer>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
