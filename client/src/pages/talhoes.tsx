import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import type { Bale } from "@shared/schema";
import { useSettings } from "@/hooks/use-settings";
import {
  Package,
  Truck,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  MapPin,
  ChevronRight,
  Wheat,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Search,
  LayoutGrid,
  List,
  Map,
  Filter,
  ArrowUpDown,
  X,
  Check,
  ChevronDown,
  BarChart3,
  Scale,
  Target,
  Zap,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TalhaoStats {
  talhao: string;
  campo: number;
  patio: number;
  beneficiado: number;
  total: number;
}

type ViewMode = "cards" | "table" | "map";
type SortOption = "fardos" | "produtividade" | "hectares" | "perdas" | "nome";
type StatusFilter = "all" | "active" | "inactive" | "with-losses";

export default function Talhoes() {
  const [, setLocation] = useLocation();
  useAuth();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("fardos");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTalhoes, setSelectedTalhoes] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Usar talhões dinâmicos da safra ativa
  const { data: settingsData } = useSettings();
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const safraAtiva = settingsData?.safraAtiva;
  const selectedSafra = safraAtiva?.nome || "";

  const { data: talhaoStatsData } = useQuery<Record<string, TalhaoStats>>({
    queryKey: ["/api/bales/stats-by-talhao", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/bales/stats-by-talhao?safra=${encodedSafra}`
        : `/api/bales/stats-by-talhao?safra=${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return {};
      return response.json();
    },
    enabled: !!selectedSafra,
    staleTime: 60000,
  });

  const talhaoStats = talhaoStatsData ? Object.values(talhaoStatsData) : [];

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/bales?safra=${encodedSafra}`
        : `/api/bales?safra=${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedSafra,
    staleTime: 30000,
  });

  const { data: pesoBrutoTotais = [] } = useQuery<
    { talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]
  >({
    queryKey: ["/api/carregamentos-totais", selectedSafra],
    queryFn: async () => {
      if (!selectedSafra) return [];
      const safraEncoded = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/carregamentos-totais/${safraEncoded}`
        : `/api/carregamentos-totais/${safraEncoded}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedSafra,
    staleTime: 60000,
  });

  // Query de perdas por talhão
  const { data: perdasPorTalhao = [] } = useQuery<
    { talhao: string; totalPerdas: number; quantidadeRegistros: number }[]
  >({
    queryKey: ["/api/perdas-totais", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/perdas-totais/${encodedSafra}`
        : `/api/perdas-totais/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedSafra,
  });

  // Query de perdas detalhadas (com motivos)
  const { data: perdasDetalhadas = [] } = useQuery<any[]>({
    queryKey: ["/api/perdas", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/perdas/${encodedSafra}`
        : `/api/perdas/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedSafra,
  });

  // Query de cotação do algodão
  interface CotacaoData {
    pluma: number;
    caroco: number;
  }
  const { data: cotacaoData } = useQuery<CotacaoData>({
    queryKey: ["/api/cotacao-algodao"],
    queryFn: async () => {
      const url = API_URL
        ? `${API_URL}/api/cotacao-algodao`
        : "/api/cotacao-algodao";
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { pluma: 140, caroco: 38 };
      return response.json();
    },
  });

  const cotacaoPluma = cotacaoData?.pluma || 140;
  const cotacaoCaroco = cotacaoData?.caroco || 38;
  const valorMedioPorArroba =
    (cotacaoPluma * 0.4 + cotacaoCaroco * 0.57) / 0.97;

  // Calcular dados de cada talhão
  const talhoesData = useMemo(() => {
    const maxProdutividade = 350; // meta

    return talhoesSafra.map((talhaoInfo) => {
      const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
      const stats = talhaoStats.find((s) => s.talhao === talhaoInfo.nome);
      const pesoBruto = pesoBrutoTotais.find(
        (p) => p.talhao === talhaoInfo.nome
      );
      const perdaTalhao = perdasPorTalhao.find(
        (p) => p.talhao === talhaoInfo.nome
      );
      const perdasDetalhe = perdasDetalhadas.filter(
        (p) => p.talhao === talhaoInfo.nome
      );

      const totalFardos = stats?.total || 0;
      const campo = stats?.campo || 0;
      const patio = stats?.patio || 0;
      const beneficiado = stats?.beneficiado || 0;

      // Produtividade prevista
      const pesoEstimado = totalFardos * 2000;
      const produtividadePrevista =
        hectares > 0 ? pesoEstimado / hectares / 15 : 0;

      // Produtividade real
      const pesoBrutoTotal = pesoBruto?.pesoBrutoTotal || 0;
      const pesoMedioFardo =
        totalFardos > 0 ? pesoBrutoTotal / totalFardos : 0;
      const produtividadeReal =
        hectares > 0 && pesoBrutoTotal > 0
          ? pesoBrutoTotal / hectares / 15
          : 0;

      const temDadosReais = pesoBrutoTotal > 0 && totalFardos > 0;
      const diferencaPercent =
        produtividadePrevista > 0 && produtividadeReal > 0
          ? ((produtividadeReal - produtividadePrevista) / produtividadePrevista) * 100
          : 0;

      // Perdas
      const perdasArrobasHa = perdaTalhao?.totalPerdas || 0;
      const perdasArrobasTotais = perdasArrobasHa * hectares;
      const perdasValorBRL = perdasArrobasTotais * valorMedioPorArroba;

      // Performance score (0-100)
      const prodAtual = temDadosReais ? produtividadeReal : produtividadePrevista;
      const performanceScore = Math.min((prodAtual / maxProdutividade) * 100, 100);

      // Status
      const status: "high" | "medium" | "low" | "inactive" =
        totalFardos === 0
          ? "inactive"
          : performanceScore >= 66
          ? "high"
          : performanceScore >= 33
          ? "medium"
          : "low";

      return {
        id: talhaoInfo.nome,
        nome: talhaoInfo.nome,
        hectares,
        totalFardos,
        campo,
        patio,
        beneficiado,
        produtividadePrevista,
        produtividadeReal,
        temDadosReais,
        diferencaPercent,
        progressBeneficiado:
          totalFardos > 0 ? (beneficiado / totalFardos) * 100 : 0,
        perdasArrobasHa,
        perdasArrobasTotais,
        perdasValorBRL,
        perdasDetalhes: perdasDetalhe,
        performanceScore,
        status,
        pesoBrutoTotal,
      };
    });
  }, [
    talhoesSafra,
    talhaoStats,
    pesoBrutoTotais,
    perdasPorTalhao,
    perdasDetalhadas,
    valorMedioPorArroba,
  ]);

  // Filter and sort
  const filteredAndSortedTalhoes = useMemo(() => {
    let filtered = [...talhoesData];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.nome.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => {
        if (statusFilter === "active") return t.totalFardos > 0;
        if (statusFilter === "inactive") return t.totalFardos === 0;
        if (statusFilter === "with-losses") return t.perdasArrobasHa > 0;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "fardos":
          comparison = b.totalFardos - a.totalFardos;
          break;
        case "produtividade":
          const prodA = a.temDadosReais ? a.produtividadeReal : a.produtividadePrevista;
          const prodB = b.temDadosReais ? b.produtividadeReal : b.produtividadePrevista;
          comparison = prodB - prodA;
          break;
        case "hectares":
          comparison = b.hectares - a.hectares;
          break;
        case "perdas":
          comparison = b.perdasValorBRL - a.perdasValorBRL;
          break;
        case "nome":
          comparison = a.nome.localeCompare(b.nome);
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

    return filtered;
  }, [talhoesData, searchQuery, statusFilter, sortBy, sortAsc]);

  // Totais
  const totais = useMemo(() => {
    const totalFardos = talhoesData.reduce((acc, t) => acc + t.totalFardos, 0);
    const totalHectares = talhoesData.reduce((acc, t) => acc + t.hectares, 0);
    const talhoesAtivos = talhoesData.filter((t) => t.totalFardos > 0).length;
    const totalPerdas = talhoesData.reduce((acc, t) => acc + t.perdasValorBRL, 0);
    return { totalFardos, totalHectares, talhoesAtivos, totalPerdas };
  }, [talhoesData]);

  // Comparison data
  const comparisonData = useMemo(() => {
    return talhoesData.filter((t) => selectedTalhoes.includes(t.id));
  }, [talhoesData, selectedTalhoes]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedTalhoes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "fardos", label: "Fardos" },
    { value: "produtividade", label: "Produtividade" },
    { value: "hectares", label: "Hectares" },
    { value: "perdas", label: "Perdas" },
    { value: "nome", label: "Nome" },
  ];

  // Status filter options
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativos" },
    { value: "inactive", label: "Inativos" },
    { value: "with-losses", label: "Com Perdas" },
  ];

  // Performance color
  const getPerformanceColor = (status: string) => {
    switch (status) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Circular progress component
  const CircularProgress = ({
    value,
    status,
    size = 48,
  }: {
    value: number;
    status: string;
    size?: number;
  }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              status === "high"
                ? "text-green-500"
                : status === "medium"
                ? "text-yellow-500"
                : status === "low"
                ? "text-red-500"
                : "text-gray-500"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{Math.round(value)}</span>
        </div>
      </div>
    );
  };

  return (
    <Page>
      <PageContent className="max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">
                  Talhões
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {safraAtiva
                    ? `Safra ${safraAtiva.nome}`
                    : "Nenhuma safra configurada"}
                </p>
              </div>
            </div>

            {/* Compare button */}
            {selectedTalhoes.length >= 2 && (
              <Button
                onClick={() => setCompareModalOpen(true)}
                className="w-full sm:w-auto justify-center sm:justify-normal gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 shrink-0"
                size="sm"
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Comparar</span> ({selectedTalhoes.length})
              </Button>
            )}
          </div>

          {/* Mensagem quando não há safra */}
          {!safraAtiva || talhoesSafra.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-card border border-border/50">
              <Wheat className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold text-foreground mb-2">
                Nenhum talhão configurado
              </p>
              <p className="text-sm text-muted-foreground">
                Configure uma safra e importe os talhões via shapefile nas
                configurações.
              </p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50 text-center">
                  <p className="text-lg sm:text-3xl font-bold text-foreground">
                    <AnimatedCounter value={totais.totalFardos} />
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Fardos</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50 text-center">
                  <p className="text-lg sm:text-3xl font-bold text-foreground">
                    {totais.talhoesAtivos}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50 text-center">
                  <p className="text-lg sm:text-3xl font-bold text-foreground">
                    {totais.totalHectares.toFixed(0)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Hectares</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50 text-center">
                  <p className="text-lg sm:text-3xl font-bold text-red-500">
                    {totais.totalPerdas > 0
                      ? `${(totais.totalPerdas / 1000).toFixed(0)}k`
                      : "-"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Perdas</p>
                </div>
              </div>

              {/* Search and Filters Bar */}
              <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
                {/* Row 1 on mobile: Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar talhão..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-xl bg-card border border-border/50 text-sm focus:outline-none focus:border-primary/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                {/* Row 2 on mobile: Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* View mode toggle */}
                  <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-card border border-border/50 flex-shrink-0">
                    <button
                      onClick={() => setViewMode("cards")}
                      className={cn(
                        "p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all",
                        viewMode === "cards"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all",
                        viewMode === "table"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("map")}
                      className={cn(
                        "p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all",
                        viewMode === "map"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Filters button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border transition-all flex-1 sm:flex-none",
                      showFilters || statusFilter !== "all"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm hidden xs:inline">Filtros</span>
                    {statusFilter !== "all" && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
                    )}
                  </button>

                  {/* Sort dropdown */}
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-card border border-border/50 text-xs sm:text-sm text-muted-foreground hover:text-foreground flex-1 sm:flex-none"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      {sortOptions.find((o) => o.value === sortBy)?.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform",
                        sortAsc && "rotate-180"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Status Filter */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Status
                      </p>
                      <div className="flex gap-2">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm transition-all",
                              statusFilter === opt.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Ordenar por
                      </p>
                      <div className="flex gap-2">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSortBy(opt.value)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm transition-all",
                              sortBy === opt.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Clear filters */}
                  {(statusFilter !== "all" || searchQuery) && (
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setSearchQuery("");
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              )}

              {/* Results count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {filteredAndSortedTalhoes.length} de {talhoesData.length}{" "}
                  talhões
                </span>
                {selectedTalhoes.length > 0 && (
                  <button
                    onClick={() => setSelectedTalhoes([])}
                    className="text-primary hover:underline"
                  >
                    Limpar seleção ({selectedTalhoes.length})
                  </button>
                )}
              </div>

              {/* Cards View */}
              {viewMode === "cards" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredAndSortedTalhoes.map((talhao) => (
                    <div
                      key={talhao.id}
                      className={cn(
                        "relative p-3 sm:p-5 rounded-xl bg-card border transition-all",
                        selectedTalhoes.includes(talhao.id)
                          ? "border-primary shadow-lg"
                          : talhao.totalFardos > 0
                          ? "border-border/50 hover:border-primary/30 hover:shadow-md"
                          : "border-border/30 opacity-60"
                      )}
                    >
                      {/* Selection checkbox */}
                      <button
                        onClick={() => toggleSelection(talhao.id)}
                        className={cn(
                          "absolute top-3 right-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                          selectedTalhoes.includes(talhao.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border/50 hover:border-primary/50"
                        )}
                      >
                        {selectedTalhoes.includes(talhao.id) && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>

                      {/* Clickable area */}
                      <button
                        onClick={() => setLocation(`/talhoes/${talhao.id}`)}
                        className="w-full text-left"
                      >
                        {/* Header with circular progress */}
                        <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <CircularProgress
                            value={talhao.performanceScore}
                            status={talhao.status}
                            size={40}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base sm:text-lg truncate">
                              Talhão {talhao.nome}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {talhao.hectares.toFixed(1)} ha
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                        </div>

                        {/* Stats */}
                        {talhao.totalFardos > 0 || talhao.perdasArrobasHa > 0 ? (
                          <>
                            {/* Grid stats */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <div className="p-2 sm:p-3 rounded-lg bg-muted/30">
                                <p className="text-xl sm:text-2xl font-bold">
                                  {talhao.totalFardos}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  Fardos
                                </p>
                              </div>
                              <div className="p-2 sm:p-3 rounded-lg bg-muted/30">
                                <div className="flex items-baseline gap-1">
                                  <p className="text-xl sm:text-2xl font-bold">
                                    {talhao.temDadosReais
                                      ? talhao.produtividadeReal.toFixed(1)
                                      : talhao.produtividadePrevista > 0
                                      ? talhao.produtividadePrevista.toFixed(1)
                                      : "-"}
                                  </p>
                                  {talhao.temDadosReais && (
                                    <span
                                      className={cn(
                                        "text-[10px] sm:text-xs font-medium flex items-center",
                                        talhao.diferencaPercent >= 0
                                          ? "text-green-500"
                                          : "text-red-500"
                                      )}
                                    >
                                      {talhao.diferencaPercent >= 0 ? (
                                        <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      ) : (
                                        <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      )}
                                      {Math.abs(talhao.diferencaPercent).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  @/ha
                                </p>
                              </div>
                            </div>

                            {/* Losses badge */}
                            {talhao.perdasArrobasHa > 0 && (
                              <div className="mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] sm:text-xs text-red-400 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    Perdas
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-red-400">
                                    -R${" "}
                                    {talhao.perdasValorBRL.toLocaleString(
                                      "pt-BR",
                                      {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      }
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Pipeline mini */}
                            {talhao.totalFardos > 0 && (
                              <div className="flex gap-1 mb-3">
                                <div
                                  className="h-2 bg-primary rounded-full transition-all"
                                  style={{
                                    width: `${
                                      (talhao.campo / talhao.totalFardos) * 100
                                    }%`,
                                  }}
                                  title={`Campo: ${talhao.campo}`}
                                />
                                <div
                                  className="h-2 bg-orange-500 rounded-full transition-all"
                                  style={{
                                    width: `${
                                      (talhao.patio / talhao.totalFardos) * 100
                                    }%`,
                                  }}
                                  title={`Pátio: ${talhao.patio}`}
                                />
                                <div
                                  className="h-2 bg-cyan-500 rounded-full transition-all"
                                  style={{
                                    width: `${
                                      (talhao.beneficiado / talhao.totalFardos) * 100
                                    }%`,
                                  }}
                                  title={`Beneficiado: ${talhao.beneficiado}`}
                                />
                              </div>
                            )}

                            {/* Footer stats */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3 text-primary" />
                                  {talhao.campo}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-orange-500" />
                                  {talhao.patio}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-cyan-500" />
                                  {talhao.beneficiado}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                  talhao.status === "high"
                                    ? "bg-green-500/20 text-green-500"
                                    : talhao.status === "medium"
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : talhao.status === "low"
                                    ? "bg-red-500/20 text-red-500"
                                    : "bg-gray-500/20 text-gray-500"
                                )}
                              >
                                {talhao.status === "high"
                                  ? "Alta"
                                  : talhao.status === "medium"
                                  ? "Média"
                                  : talhao.status === "low"
                                  ? "Baixa"
                                  : "Inativo"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhum fardo cadastrado</p>
                          </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === "table" && (
                <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="p-3 text-left text-xs font-medium text-muted-foreground w-10">
                            <span className="sr-only">Selecionar</span>
                          </th>
                          <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                            Talhão
                          </th>
                          <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                            Hectares
                          </th>
                          <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                            Fardos
                          </th>
                          <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                            @/ha
                          </th>
                          <th className="p-3 text-center text-xs font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                            Perdas
                          </th>
                          <th className="p-3 text-center text-xs font-medium text-muted-foreground">
                            Pipeline
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedTalhoes.map((talhao) => (
                          <tr
                            key={talhao.id}
                            className={cn(
                              "border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors",
                              selectedTalhoes.includes(talhao.id) &&
                                "bg-primary/5"
                            )}
                          >
                            <td className="p-3">
                              <button
                                onClick={() => toggleSelection(talhao.id)}
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                                  selectedTalhoes.includes(talhao.id)
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-border/50"
                                )}
                              >
                                {selectedTalhoes.includes(talhao.id) && (
                                  <Check className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                            <td
                              className="p-3"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              <span className="font-medium">{talhao.nome}</span>
                            </td>
                            <td
                              className="p-3 text-right"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              {talhao.hectares.toFixed(1)}
                            </td>
                            <td
                              className="p-3 text-right font-medium"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              {talhao.totalFardos}
                            </td>
                            <td
                              className="p-3 text-right"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>
                                  {talhao.temDadosReais
                                    ? talhao.produtividadeReal.toFixed(1)
                                    : talhao.produtividadePrevista > 0
                                    ? talhao.produtividadePrevista.toFixed(1)
                                    : "-"}
                                </span>
                                {talhao.temDadosReais && (
                                  <span
                                    className={cn(
                                      "text-xs",
                                      talhao.diferencaPercent >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                    )}
                                  >
                                    {talhao.diferencaPercent >= 0 ? "+" : ""}
                                    {talhao.diferencaPercent.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              className="p-3 text-center"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              <span
                                className={cn(
                                  "inline-block w-3 h-3 rounded-full",
                                  getPerformanceColor(talhao.status)
                                )}
                              />
                            </td>
                            <td
                              className="p-3 text-right"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              {talhao.perdasValorBRL > 0 ? (
                                <span className="text-red-500">
                                  -R${" "}
                                  {(talhao.perdasValorBRL / 1000).toFixed(1)}k
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td
                              className="p-3"
                              onClick={() =>
                                setLocation(`/talhoes/${talhao.id}`)
                              }
                            >
                              {talhao.totalFardos > 0 && (
                                <div className="flex gap-0.5 h-2 w-20 mx-auto">
                                  <div
                                    className="bg-primary rounded-sm"
                                    style={{
                                      width: `${
                                        (talhao.campo / talhao.totalFardos) * 100
                                      }%`,
                                    }}
                                  />
                                  <div
                                    className="bg-orange-500 rounded-sm"
                                    style={{
                                      width: `${
                                        (talhao.patio / talhao.totalFardos) * 100
                                      }%`,
                                    }}
                                  />
                                  <div
                                    className="bg-cyan-500 rounded-sm"
                                    style={{
                                      width: `${
                                        (talhao.beneficiado / talhao.totalFardos) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Map View */}
              {viewMode === "map" && (
                <div className="p-5 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Mapa de Produtividade
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500/50" />
                        <span>Baixa</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500/50" />
                        <span>Média</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500/50" />
                        <span>Alta</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                    {filteredAndSortedTalhoes.map((t) => {
                      const getColor = () => {
                        if (t.totalFardos === 0) return "bg-muted/20";
                        if (t.performanceScore < 33)
                          return "bg-red-500/40 hover:bg-red-500/60";
                        if (t.performanceScore < 66)
                          return "bg-yellow-500/40 hover:bg-yellow-500/60";
                        return "bg-green-500/40 hover:bg-green-500/60";
                      };

                      return (
                        <button
                          key={t.id}
                          onClick={() => setLocation(`/talhoes/${t.id}`)}
                          className={cn(
                            "aspect-square rounded-lg flex flex-col items-center justify-center text-center transition-all hover:scale-105 relative w-full min-w-[72px]",
                            getColor(),
                            t.totalFardos > 0
                              ? "border border-white/10"
                              : "border border-transparent",
                            selectedTalhoes.includes(t.id) &&
                              "ring-2 ring-primary"
                          )}
                          title={`${t.nome}: ${(t.temDadosReais
                            ? t.produtividadeReal
                            : t.produtividadePrevista
                          ).toFixed(1)} @/ha`}
                        >
                          <span
                            className={cn(
                              "text-xs font-semibold truncate w-full px-1",
                              t.totalFardos > 0
                                ? "text-white"
                                : "text-muted-foreground"
                            )}
                          >
                            {t.nome}
                          </span>
                          {t.totalFardos > 0 && (
                            <span className="text-[10px] text-white/80">
                              {(t.temDadosReais
                                ? t.produtividadeReal
                                : t.produtividadePrevista
                              ).toFixed(0)}
                            </span>
                          )}
                          {t.perdasArrobasHa > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-background" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PageContent>

      {/* Comparison Modal */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Comparar Talhões
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                    Métrica
                  </th>
                  {comparisonData.map((t) => (
                    <th
                      key={t.id}
                      className="p-3 text-center text-sm font-medium"
                    >
                      Talhão {t.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Hectares
                  </td>
                  {comparisonData.map((t) => (
                    <td key={t.id} className="p-3 text-center font-medium">
                      {t.hectares.toFixed(1)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Fardos
                  </td>
                  {comparisonData.map((t) => (
                    <td key={t.id} className="p-3 text-center font-medium">
                      {t.totalFardos}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Produtividade (@/ha)
                  </td>
                  {comparisonData.map((t) => {
                    const prod = t.temDadosReais
                      ? t.produtividadeReal
                      : t.produtividadePrevista;
                    const maxProd = Math.max(
                      ...comparisonData.map((c) =>
                        c.temDadosReais
                          ? c.produtividadeReal
                          : c.produtividadePrevista
                      )
                    );
                    const isMax = prod === maxProd && prod > 0;
                    return (
                      <td
                        key={t.id}
                        className={cn(
                          "p-3 text-center font-medium",
                          isMax && "text-green-500"
                        )}
                      >
                        {prod > 0 ? prod.toFixed(1) : "-"}
                        {isMax && prod > 0 && (
                          <TrendingUp className="w-4 h-4 inline ml-1" />
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Peso Bruto (t)
                  </td>
                  {comparisonData.map((t) => (
                    <td key={t.id} className="p-3 text-center font-medium">
                      {t.pesoBrutoTotal > 0
                        ? (t.pesoBrutoTotal / 1000).toFixed(1)
                        : "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/30">
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Beneficiado (%)
                  </td>
                  {comparisonData.map((t) => (
                    <td key={t.id} className="p-3 text-center font-medium">
                      {t.totalFardos > 0
                        ? `${((t.beneficiado / t.totalFardos) * 100).toFixed(0)}%`
                        : "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Perdas
                  </td>
                  {comparisonData.map((t) => {
                    const minPerdas = Math.min(
                      ...comparisonData
                        .filter((c) => c.perdasValorBRL > 0)
                        .map((c) => c.perdasValorBRL)
                    );
                    const isMin = t.perdasValorBRL === minPerdas && minPerdas > 0;
                    return (
                      <td
                        key={t.id}
                        className={cn(
                          "p-3 text-center font-medium",
                          t.perdasValorBRL > 0 ? "text-red-500" : "",
                          isMin && "text-green-500"
                        )}
                      >
                        {t.perdasValorBRL > 0
                          ? `R$ ${(t.perdasValorBRL / 1000).toFixed(1)}k`
                          : "-"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCompareModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
