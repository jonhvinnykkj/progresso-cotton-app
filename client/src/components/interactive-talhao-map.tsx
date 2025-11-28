import { useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import { useTalhaoStats } from '@/hooks/use-talhao-stats';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/lib/theme-context';
import { Search, Maximize2, Minimize2, Map, Flame, BarChart3, X, Info, Wheat } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type ViewMode = 'normal' | 'heatmap' | 'status';

interface InteractiveTalhaoMapProps {
  selectedTalhao?: string;
  onTalhaoClick?: (talhao: string) => void;
}

// Component to fit bounds on initial load only
function InitialBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  if (!hasInitialized.current) {
    map.fitBounds(bounds, { padding: [20, 20] });
    hasInitialized.current = true;
  }

  return null;
}

export function InteractiveTalhaoMap({ selectedTalhao, onTalhaoClick }: InteractiveTalhaoMapProps) {
  const { data: settings } = useSettings();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const safra = settings?.defaultSafra || '';
  const talhoesSafra = settings?.talhoesSafra || [];
  const { data: statsMap } = useTalhaoStats(safra);

  // Simplified states
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Criar GeoJSON dinamicamente a partir dos talhões da safra
  const cottonTalhoes = useMemo(() => {
    if (!talhoesSafra || talhoesSafra.length === 0) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    const features = talhoesSafra.map(talhao => {
      try {
        const geometry = JSON.parse(talhao.geometry);
        const hectares = parseFloat(talhao.hectares.replace(',', '.')) || 0;
        return {
          type: 'Feature' as const,
          properties: {
            nome: talhao.nome,
            area: hectares,
          },
          geometry,
        };
      } catch (e) {
        console.error('Erro ao parsear geometry do talhão', talhao.nome, e);
        return null;
      }
    }).filter(Boolean);

    return { type: 'FeatureCollection' as const, features };
  }, [talhoesSafra]);

  // Tile URLs for dark and light modes
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Calculate max productivity for heatmap
  const maxProdutividade = useMemo(() => {
    if (!statsMap) return 0;
    return Math.max(...Object.values(statsMap).map((s: any) => s.produtividade || 0));
  }, [statsMap]);

  // Heatmap color function
  const getHeatmapColor = (produtividade: number, maxProd: number) => {
    if (maxProd === 0) return isDark ? '#4b5563' : '#9ca3af';
    const ratio = produtividade / maxProd;
    if (ratio > 0.75) return '#059669';
    if (ratio > 0.5) return '#10b981';
    if (ratio > 0.25) return '#fbbf24';
    return '#ef4444';
  };

  // Status color function
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_colheita': return '#3b82f6';
      case 'concluido': return '#10b981';
      case 'nao_iniciado': return isDark ? '#4b5563' : '#9ca3af';
      default: return isDark ? '#4b5563' : '#9ca3af';
    }
  };

  // Dynamic style for cotton talhões
  const getCottonStyle = (feature: any) => {
    const talhao = feature.properties.nome;
    const stats = statsMap?.[talhao];

    let fillColor = isDark ? '#22c55e' : '#16a34a';

    if (viewMode === 'heatmap' && stats) {
      fillColor = getHeatmapColor(stats.produtividade || 0, maxProdutividade);
    } else if (viewMode === 'status' && stats) {
      fillColor = getStatusColor(stats.status);
    }

    return {
      fillColor,
      weight: 2,
      opacity: 1,
      color: isDark ? 'rgba(74, 222, 128, 0.8)' : 'rgba(22, 163, 74, 0.8)',
      fillOpacity: isDark ? 0.5 : 0.45
    };
  };

  // Handler for cotton features
  const onEachCottonFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const { nome, area } = feature.properties;
      const stats = statsMap?.[nome];

      const prodArrobas = stats ? (stats.produtividade * 66.67).toFixed(1) : '0';

      const tooltipContent = `
        <div class="map-tooltip ${isDark ? 'dark' : 'light'}">
          <div class="map-tooltip-header">Talhão ${nome}</div>
          <div class="map-tooltip-body">
            <div class="map-tooltip-row">
              <span class="map-tooltip-label">Área</span>
              <span class="map-tooltip-value">${area?.toFixed(1)} ha</span>
            </div>
            ${stats ? `
              <div class="map-tooltip-row">
                <span class="map-tooltip-label">Fardos</span>
                <span class="map-tooltip-value">${stats.totalFardos}</span>
              </div>
              <div class="map-tooltip-row">
                <span class="map-tooltip-label">Produtividade</span>
                <span class="map-tooltip-value">${prodArrobas} @/ha</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, {
        permanent: false,
        sticky: true,
        className: 'map-tooltip-container',
        direction: 'top',
        offset: [0, -10]
      });

      layer.on({
        click: () => {
          if (onTalhaoClick) {
            onTalhaoClick(nome);
          }
        },
        mouseover: (e: L.LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle({
            weight: 3,
            fillOpacity: isDark ? 0.7 : 0.6,
            color: isDark ? '#4ade80' : '#16a34a'
          });
          target.bringToFront();
        },
        mouseout: (e: L.LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle(getCottonStyle(feature));
        }
      });
    }
  };

  // Filter cotton features
  const filteredCottonFeatures = useMemo(() => {
    let features = cottonTalhoes.features;

    if (searchQuery) {
      features = features.filter((f: any) =>
        f.properties?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { ...cottonTalhoes, features };
  }, [searchQuery, cottonTalhoes]);

  // Calculate bounds for initial view
  const bounds = useMemo(() => {
    const allCoords: [number, number][] = [];
    cottonTalhoes.features.forEach((f: any) => {
      if (!f?.geometry?.coordinates) return;

      // Handle different geometry types (Polygon, MultiPolygon)
      const coords = f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates.flat(2)
        : f.geometry.coordinates[0];

      if (Array.isArray(coords)) {
        coords.forEach((coord: number[]) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            allCoords.push([coord[1], coord[0]]);
          }
        });
      }
    });
    return allCoords.length > 0 ? L.latLngBounds(allCoords) : L.latLngBounds([[-7.5, -44.3], [-7.4, -44.1]]);
  }, [cottonTalhoes]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mapContainerRef.current) {
      mapContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Legend data based on view mode
  const legendItems = useMemo(() => {
    if (viewMode === 'heatmap') {
      return [
        { color: '#059669', label: 'Alta produtividade' },
        { color: '#10b981', label: 'Boa produtividade' },
        { color: '#fbbf24', label: 'Média produtividade' },
        { color: '#ef4444', label: 'Baixa produtividade' },
      ];
    }
    if (viewMode === 'status') {
      return [
        { color: '#3b82f6', label: 'Em colheita' },
        { color: '#10b981', label: 'Concluído' },
        { color: isDark ? '#4b5563' : '#9ca3af', label: 'Não iniciado' },
      ];
    }
    return [
      { color: isDark ? '#22c55e' : '#16a34a', label: 'Talhões de algodão' },
    ];
  }, [viewMode, isDark]);

  return (
    <div
      ref={mapContainerRef}
      className={`
        relative w-full h-[600px] rounded-2xl overflow-hidden
        ${isDark ? 'ring-1 ring-white/10' : 'ring-1 ring-black/10'}
        shadow-xl
      `}
    >
      {/* Map Container */}
      <MapContainer
        center={[-7.49, -44.20]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={tileUrl}
        />

        <InitialBounds bounds={bounds} />

        {/* Cotton talhões - dinâmico da safra ativa */}
        {cottonTalhoes.features.length > 0 && (
          <GeoJSON
            key={`cotton-${viewMode}-${searchQuery}-${isDark}-${talhoesSafra.length}`}
            data={filteredCottonFeatures}
            style={getCottonStyle}
            onEachFeature={onEachCottonFeature}
          />
        )}
      </MapContainer>

      {/* Mensagem quando não há talhões */}
      {cottonTalhoes.features.length === 0 && (
        <div className={`
          absolute inset-0 flex items-center justify-center pointer-events-none z-[500]
        `}>
          <div className={`
            p-6 rounded-xl text-center max-w-sm mx-4 pointer-events-auto
            ${isDark
              ? 'bg-slate-900/95 border border-slate-700/50'
              : 'bg-white/98 border border-slate-200 shadow-lg'
            }
          `}>
            <Wheat className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Nenhum talhão configurado
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Configure uma safra e importe os talhões via shapefile nas configurações.
            </p>
          </div>
        </div>
      )}

      {/* Floating Search - Top Left (offset to avoid zoom controls) */}
      <div className="absolute top-3 left-14 z-[1000]">
        <div className={`
          flex items-center gap-2 rounded-xl overflow-hidden transition-all duration-300
          ${isDark
            ? 'bg-slate-900/90 border border-slate-700/50'
            : 'bg-white/95 border border-slate-200 shadow-lg'
          }
          ${searchOpen ? 'w-56 pl-3 pr-1' : 'w-10'}
        `}>
          {searchOpen ? (
            <>
              <Search className={`h-4 w-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <Input
                placeholder="Buscar talhão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  h-9 border-0 bg-transparent focus-visible:ring-0 text-sm px-1
                  ${isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}
                `}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 hover:bg-transparent"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={`h-10 w-10 p-0 hover:bg-transparent ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mode Switcher - Bottom Left */}
      <div className="absolute bottom-3 left-3 z-[1000]">
        <div className={`
          flex rounded-xl overflow-hidden
          ${isDark
            ? 'bg-slate-900/90 border border-slate-700/50'
            : 'bg-white/95 border border-slate-200 shadow-lg'
          }
        `}>
          {[
            { mode: 'normal' as ViewMode, icon: Map, label: 'Normal', activeColor: 'text-green-500' },
            { mode: 'heatmap' as ViewMode, icon: Flame, label: 'Heat', activeColor: 'text-orange-500' },
            { mode: 'status' as ViewMode, icon: BarChart3, label: 'Status', activeColor: 'text-blue-500' },
          ].map(({ mode, icon: Icon, label, activeColor }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all
                ${viewMode === mode
                  ? `${activeColor} ${isDark ? 'bg-white/10' : 'bg-slate-100'}`
                  : `${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-3 right-3 z-[1000] flex gap-2">
        {/* Legend Toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`
            h-10 w-10 rounded-xl flex items-center justify-center transition-all
            ${isDark
              ? 'bg-slate-900/90 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800/90'
              : 'bg-white/95 border border-slate-200 shadow-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }
            ${showLegend ? (isDark ? 'ring-2 ring-green-500/50' : 'ring-2 ring-green-600/50') : ''}
          `}
          title="Legenda"
        >
          <Info className="h-4 w-4" />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className={`
            h-10 w-10 rounded-xl flex items-center justify-center transition-all
            ${isDark
              ? 'bg-slate-900/90 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800/90'
              : 'bg-white/95 border border-slate-200 shadow-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }
          `}
          title="Tela cheia"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Legend Panel - Top Right */}
      {showLegend && (
        <div className={`
          absolute top-3 right-3 z-[1000] rounded-xl p-3 min-w-[160px]
          ${isDark
            ? 'bg-slate-900/95 border border-slate-700/50'
            : 'bg-white/98 border border-slate-200 shadow-lg'
          }
        `}>
          <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Legenda
          </div>
          <div className="space-y-1.5">
            {legendItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tooltip Styles */}
      <style>{`
        .map-tooltip-container {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .map-tooltip-container::before {
          display: none !important;
        }

        .leaflet-tooltip-top::before,
        .leaflet-tooltip-bottom::before,
        .leaflet-tooltip-left::before,
        .leaflet-tooltip-right::before {
          display: none !important;
        }

        .map-tooltip {
          border-radius: 12px;
          padding: 12px 14px;
          min-width: 150px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }

        .map-tooltip.dark {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(74, 222, 128, 0.3);
        }

        .map-tooltip.light {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(22, 163, 74, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .map-tooltip.small {
          padding: 8px 12px;
          min-width: auto;
        }

        .map-tooltip-header {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 8px;
          padding-bottom: 8px;
        }

        .map-tooltip.dark .map-tooltip-header {
          color: #4ade80;
          border-bottom: 1px solid rgba(74, 222, 128, 0.2);
        }

        .map-tooltip.light .map-tooltip-header {
          color: #16a34a;
          border-bottom: 1px solid rgba(22, 163, 74, 0.2);
        }

        .map-tooltip-header.small {
          margin-bottom: 4px;
          padding-bottom: 0;
          border-bottom: none;
          font-size: 13px;
        }

        .map-tooltip-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .map-tooltip-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .map-tooltip.dark .map-tooltip-label {
          color: #94a3b8;
        }

        .map-tooltip.light .map-tooltip-label {
          color: #64748b;
        }

        .map-tooltip.dark .map-tooltip-value {
          color: #f1f5f9;
          font-weight: 600;
        }

        .map-tooltip.light .map-tooltip-value {
          color: #1e293b;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
