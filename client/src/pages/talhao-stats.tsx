import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import type { Bale, RendimentoTalhao, Lote, Fardinho } from "@shared/schema";
import { TALHOES_INFO } from "@shared/talhoes";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import {
  Package,
  Truck,
  CheckCircle,
  ArrowLeft,
  Wheat,
  BarChart3,
  TrendingUp,
  Search,
  Calendar,
  Layers,
  Activity,
  MapPin,
  Info,
  Clock,
  Filter,
  Sparkles,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  RefreshCw,
  Zap,
  Timer,
  Factory,
  PieChart,
  CalendarDays,
  Award,
  Boxes,
  Percent,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InteractiveTalhaoMap } from "@/components/interactive-talhao-map";
import { cn } from "@/lib/utils";

interface TalhaoStats {
  talhao: string;
  campo: number;
  patio: number;
  beneficiado: number;
  total: number;
}

interface SafraStats {
  safra: string;
  campo: number;
  patio: number;
  beneficiado: number;
  total: number;
}

export default function TalhaoStats() {
  const [, setLocation] = useLocation();
  useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTalhao, setSelectedTalhao] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<"all" | "campo" | "patio" | "beneficiado">("all");
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("30d");
  const [selectedSafra, setSelectedSafra] = useState("24/25");

  const { data: talhaoStatsData, isLoading } = useQuery<Record<string, TalhaoStats>>({
    queryKey: ["/api/bales/stats-by-talhao"],
    staleTime: 60000,
  });

  const talhaoStats = talhaoStatsData ? Object.values(talhaoStatsData) : [];

  const { data: safraStats = [] } = useQuery<SafraStats[]>({
    queryKey: ["/api/bales/stats-by-safra"],
    staleTime: 60000,
  });

  const { data: allBales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
  });

  const { data: globalStats } = useQuery<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }>({
    queryKey: ["/api/bales/stats"],
    staleTime: 30000,
  });

  // Query para buscar totais de peso bruto por talhão (soma dos carregamentos)
  const { data: pesoBrutoTotais = [], refetch: refetchCarregamentos, isRefetching: isRefetchingCarregamentos } = useQuery<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]>({
    queryKey: ["/api/carregamentos-totais", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/carregamentos-totais/${encodedSafra}`
        : `/api/carregamentos-totais/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 0, // Sempre refetch quando o componente montar
    refetchOnWindowFocus: true, // Refetch quando a janela ganhar foco
  });

  // Query para buscar rendimento de pluma por talhão
  const { data: rendimentos = [] } = useQuery<RendimentoTalhao[]>({
    queryKey: ["/api/rendimento", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/rendimento/${encodedSafra}`
        : `/api/rendimento/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Query para buscar lotes (peso da pluma)
  const { data: lotes = [] } = useQuery<Lote[]>({
    queryKey: ["/api/lotes", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/lotes/${encodedSafra}`
        : `/api/lotes/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Query para buscar fardinhos
  const { data: fardinhos = [] } = useQuery<Fardinho[]>({
    queryKey: ["/api/fardinhos", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/fardinhos/${encodedSafra}`
        : `/api/fardinhos/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const filteredTalhaoStats = talhaoStats.filter((stat) =>
    stat.talhao.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTalhaoInfo = (nome: string) => {
    return TALHOES_INFO.find(t => t.nome === nome);
  };

  const selectedTalhaoData = selectedTalhao
    ? talhaoStats.find(t => t.talhao === selectedTalhao)
    : null;
  const selectedTalhaoInfo = selectedTalhao ? getTalhaoInfo(selectedTalhao) : null;

  const fardosPorHectare = (() => {
    if (!selectedTalhaoData || selectedTalhaoData.total === 0) return '0.00';
    if (!selectedTalhaoInfo || !selectedTalhaoInfo.hectares) return '0.00';
    const hectares = parseFloat(selectedTalhaoInfo.hectares);
    if (isNaN(hectares) || hectares === 0) return '0.00';
    return (selectedTalhaoData.total / hectares).toFixed(2);
  })();

  const produtividadeArrobas = (() => {
    if (!selectedTalhaoData || selectedTalhaoData.total === 0) return '0.00';
    if (!selectedTalhaoInfo || !selectedTalhaoInfo.hectares) return '0.00';
    const hectares = parseFloat(selectedTalhaoInfo.hectares);
    if (isNaN(hectares) || hectares === 0) return '0.00';
    const fardosPorHa = selectedTalhaoData.total / hectares;
    const arrobasPorHa = fardosPorHa * 66.67;
    return arrobasPorHa.toFixed(2);
  })();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const balesToday = allBales.filter(b => {
    const baleDate = new Date(b.createdAt);
    baleDate.setHours(0, 0, 0, 0);
    return baleDate.getTime() === today.getTime();
  }).length;

  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);
  const balesThisWeek = allBales.filter(b => new Date(b.createdAt) >= thisWeek).length;

  const totalHectares = TALHOES_INFO.reduce((acc, t) => acc + parseFloat(t.hectares), 0);

  const avgFardosPorHectare = (() => {
    if (!globalStats?.total || totalHectares === 0) return '0.00';
    return (globalStats.total / totalHectares).toFixed(2);
  })();

  const avgArrobasPorHectare = (() => {
    if (!globalStats?.total || totalHectares === 0) return '0.00';
    const fardosPorHa = globalStats.total / totalHectares;
    const arrobasPorHa = fardosPorHa * 66.67;
    return arrobasPorHa.toFixed(2);
  })();

  // Calcular dados de produtividade prevista vs real
  const produtividadeComparativa = useMemo(() => {
    const pesoBrutoList = pesoBrutoTotais ?? [];
    const rendimentoList = rendimentos ?? [];
    return TALHOES_INFO.map((talhaoInfo) => {
      const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
      const stats = talhaoStats.find((s) => s.talhao === talhaoInfo.id);

      // Buscar dados dos carregamentos e rendimento
      const pesoBrutoData = pesoBrutoList.find((p) => p.talhao === talhaoInfo.id);
      const rendimentoData = rendimentoList.find((r) => r.talhao === talhaoInfo.id);

      const totalFardos = stats?.total || 0;

      // Produtividade PREVISTA: 2000kg * quantidade de fardos / hectares
      // Convertendo para @/ha: (2000 * fardos / hectares) / 30 (1 arroba = ~30kg de pluma)
      const pesoFardo = 2000; // kg
      const produtividadePrevistoKg = hectares > 0 ? (pesoFardo * totalFardos) / hectares : 0;
      const produtividadePrevistoArrobas = produtividadePrevistoKg / 30; // Convertendo para arrobas

      // Produtividade REAL: peso pluma total / hectares
      // Peso pluma = peso bruto * rendimento%
      let produtividadeRealKg = 0;
      let produtividadeRealArrobas = 0;
      let rendimentoPluma = 0;

      const pesoBruto = pesoBrutoData?.pesoBrutoTotal || 0;
      const temRendimento = rendimentoData && parseFloat(rendimentoData.rendimentoPluma) > 0;

      if (pesoBruto > 0 && temRendimento && hectares > 0) {
        rendimentoPluma = parseFloat(rendimentoData.rendimentoPluma) || 0;
        const pesoPluma = pesoBruto * rendimentoPluma / 100;
        produtividadeRealKg = pesoPluma / hectares;
        produtividadeRealArrobas = produtividadeRealKg / 15; // 1 arroba = ~15kg
      }

      // Diferença
      const diferencaArrobas = produtividadeRealArrobas - produtividadePrevistoArrobas;
      const diferencaPercentual =
        produtividadePrevistoArrobas > 0
          ? ((produtividadeRealArrobas - produtividadePrevistoArrobas) / produtividadePrevistoArrobas) * 100
          : 0;

      // Tem dados reais se tiver peso bruto e rendimento
      const temDadosReais = pesoBruto > 0 && temRendimento;

      return {
        talhao: talhaoInfo.id,
        hectares,
        totalFardos,
        produtividadePrevistoKg,
        produtividadePrevistoArrobas,
        produtividadeRealKg,
        produtividadeRealArrobas,
        rendimentoPluma,
        diferencaArrobas,
        diferencaPercentual,
        temDadosReais,
      };
    }).filter((t) => t.totalFardos > 0 || t.temDadosReais);
  }, [talhaoStats, pesoBrutoTotais, rendimentos]);

  // Totalizadores de produtividade
  const totaisProdutividade = useMemo(() => {
    const talhoesComDados = produtividadeComparativa.filter((t) => t.temDadosReais);
    const totalHectaresComDados = talhoesComDados.reduce((acc, t) => acc + t.hectares, 0);
    const totalPlumaReal = talhoesComDados.reduce(
      (acc, t) => acc + t.produtividadeRealKg * t.hectares,
      0
    );
    const totalPrevisto = talhoesComDados.reduce(
      (acc, t) => acc + t.produtividadePrevistoKg * t.hectares,
      0
    );

    return {
      mediaPrevistoArrobas:
        totalHectaresComDados > 0 ? totalPrevisto / totalHectaresComDados / 30 : 0,
      mediaRealArrobas:
        totalHectaresComDados > 0 ? totalPlumaReal / totalHectaresComDados / 15 : 0,
      talhoesComDados: talhoesComDados.length,
      totalTalhoes: produtividadeComparativa.length,
    };
  }, [produtividadeComparativa]);

  // Totalizadores de carregamentos
  const totaisCarregamentos = useMemo(() => {
    const lista = pesoBrutoTotais ?? [];
    const totalPesoKg = lista.reduce((acc, item) => acc + (Number(item.pesoBrutoTotal) || 0), 0);
    const totalCarregamentos = lista.reduce((acc, item) => acc + (Number(item.quantidadeCarregamentos) || 0), 0);
    const talhoesComCarregamentos = lista.length;

    return {
      totalPesoKg,
      totalCarregamentos,
      talhoesComCarregamentos,
      mediaPesoPorCarregamento: totalCarregamentos > 0 ? totalPesoKg / totalCarregamentos : 0,
    };
  }, [pesoBrutoTotais]);

  // ========== NOVOS KPIs ==========

  // Taxa de Beneficiamento (%)
  const taxaBeneficiamento = useMemo(() => {
    if (!globalStats?.total || globalStats.total === 0) return 0;
    return (globalStats.beneficiado / globalStats.total) * 100;
  }, [globalStats]);

  // Fardos criados por dia (média dos últimos 30 dias)
  const fardosPorDia = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const balesLast30Days = allBales.filter(b => new Date(b.createdAt) >= thirtyDaysAgo);
    if (balesLast30Days.length === 0) return 0;

    // Calcular dias únicos com fardos criados
    const uniqueDays = new Set(balesLast30Days.map(b => {
      const d = new Date(b.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }));
    const diasAtivos = uniqueDays.size || 1;
    return balesLast30Days.length / diasAtivos;
  }, [allBales]);

  // Rendimento médio de pluma (%)
  const rendimentoMedioPluma = useMemo(() => {
    const rendimentosValidos = rendimentos.filter(r => parseFloat(r.rendimentoPluma) > 0);
    if (rendimentosValidos.length === 0) return 0;
    const soma = rendimentosValidos.reduce((acc, r) => acc + parseFloat(r.rendimentoPluma), 0);
    return soma / rendimentosValidos.length;
  }, [rendimentos]);

  // Tempo médio de processamento (horas)
  const tempoMedioProcessamento = useMemo(() => {
    let totalHoras = 0;
    let count = 0;

    allBales
      .filter(b => b.status === "beneficiado" && b.statusHistory)
      .forEach(bale => {
        try {
          const history = JSON.parse(bale.statusHistory!);
          const patioEvent = history.find((h: { status: string }) => h.status === "patio");
          const beneficiadoEvent = history.find((h: { status: string }) => h.status === "beneficiado");

          if (patioEvent && beneficiadoEvent) {
            const patioTime = new Date(patioEvent.timestamp).getTime();
            const beneficiadoTime = new Date(beneficiadoEvent.timestamp).getTime();
            const hours = (beneficiadoTime - patioTime) / (1000 * 60 * 60);
            totalHoras += hours;
            count++;
          }
        } catch {
          // Ignorar erros de parse
        }
      });

    return count > 0 ? totalHoras / count : 0;
  }, [allBales]);

  // Talhões em colheita ativa (com fardos no campo ou pátio)
  const talhoesAtivos = useMemo(() => {
    return talhaoStats.filter(t => t.campo > 0 || t.patio > 0).length;
  }, [talhaoStats]);

  // ========== TOTAIS DE BENEFICIAMENTO (LOTES E FARDINHOS) ==========

  // Totais de lotes (peso da pluma)
  const totaisLotes = useMemo(() => {
    const totalPesoPluma = lotes.reduce((acc, lote) => acc + (parseFloat(lote.pesoPluma) || 0), 0);
    const totalLotes = lotes.length;
    return {
      totalPesoPluma,
      totalLotes,
      mediaPesoPorLote: totalLotes > 0 ? totalPesoPluma / totalLotes : 0,
    };
  }, [lotes]);

  // Totais de fardinhos
  const totaisFardinhos = useMemo(() => {
    const totalFardinhos = fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);
    const totalRegistros = fardinhos.length;
    return {
      totalFardinhos,
      totalRegistros,
      mediaFardinhosPorRegistro: totalRegistros > 0 ? totalFardinhos / totalRegistros : 0,
    };
  }, [fardinhos]);

  // Rendimento calculado (peso pluma / peso bruto)
  const rendimentoCalculado = useMemo(() => {
    if (totaisCarregamentos.totalPesoKg === 0 || totaisLotes.totalPesoPluma === 0) return 0;
    return (totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100;
  }, [totaisCarregamentos.totalPesoKg, totaisLotes.totalPesoPluma]);

  // Dados para gráfico de pizza (distribuição de status)
  const pieChartData = useMemo(() => [
    { name: "Campo", value: globalStats?.campo || 0, color: "#00FF88" },
    { name: "Pátio", value: globalStats?.patio || 0, color: "#FF9500" },
    { name: "Beneficiado", value: globalStats?.beneficiado || 0, color: "#00D4FF" },
  ], [globalStats]);

  // Dados para evolução temporal (fardos por dia - últimos 14 dias)
  const evolutionData = useMemo(() => {
    const days: Record<string, { date: string; campo: number; patio: number; beneficiado: number; total: number }> = {};
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Inicializar últimos 14 dias
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      days[key] = { date: label, campo: 0, patio: 0, beneficiado: 0, total: 0 };
    }

    // Contar fardos por dia de criação
    allBales
      .filter(b => new Date(b.createdAt) >= fourteenDaysAgo)
      .forEach(bale => {
        const key = new Date(bale.createdAt).toISOString().split('T')[0];
        if (days[key]) {
          days[key].total++;
          if (bale.status === 'campo') days[key].campo++;
          else if (bale.status === 'patio') days[key].patio++;
          else if (bale.status === 'beneficiado') days[key].beneficiado++;
        }
      });

    return Object.values(days);
  }, [allBales]);

  // Top 5 talhões por produtividade
  const topTalhoes = useMemo(() => {
    return talhaoStats
      .map(stat => {
        const talhaoInfo = TALHOES_INFO.find(t => t.id === stat.talhao);
        const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
        const arrobasPorHa = hectares > 0 ? (stat.total / hectares) * 66.67 : 0;
        return { ...stat, arrobasPorHa, hectares };
      })
      .sort((a, b) => b.arrobasPorHa - a.arrobasPorHa)
      .slice(0, 5);
  }, [talhaoStats]);

  return (
    <Page>
      <PageContent className="max-w-7xl space-y-6">
        {/* ========== HERO HEADER REFORMULADO ========== */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-neon-cyan/5" />

          <div className="relative">
            {/* Header com título e botão voltar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center shadow-glow">
                    <BarChart3 className="h-6 w-6 text-black" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">
                    <span className="gradient-text">Central de Estatísticas</span>
                  </h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Dados em tempo real • Safra {selectedSafra}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedSafra} onValueChange={setSelectedSafra}>
                  <SelectTrigger className="w-28 h-9 rounded-lg bg-surface border-border/50 text-sm">
                    <SelectValue placeholder="Safra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24/25">24/25</SelectItem>
                    <SelectItem value="25/26">25/26</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="rounded-xl border-border/50 hover:border-primary/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>

            {/* Grid de Cards Principais - 3 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total de Fardos */}
              <div
                className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow hover:scale-[1.02] transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: '0ms' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-primary font-semibold uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-4xl font-display font-bold text-glow mb-1">
                    <AnimatedCounter value={globalStats?.total || 0} />
                  </p>
                  <p className="text-xs text-muted-foreground">fardos cadastrados</p>
                  <div className="mt-3 h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-neon-cyan rounded-full transition-all duration-700 animate-pulse-glow"
                      style={{ width: `${taxaBeneficiamento}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{taxaBeneficiamento.toFixed(1)}% beneficiado</p>
                </div>
              </div>

              {/* Card 2: Produtividade */}
              <div
                className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-cyan hover:scale-[1.02] transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: '100ms' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-neon-cyan/20 group-hover:bg-neon-cyan/30 transition-colors">
                      <TrendingUp className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <span className="text-xs text-neon-cyan font-semibold uppercase tracking-wider">Produtividade</span>
                  </div>
                  <p className="text-4xl font-display font-bold mb-1">
                    {avgArrobasPorHectare}
                    <span className="text-lg text-neon-cyan ml-1">@/ha</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{avgFardosPorHectare} fardos/ha</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      {totalHectares.toFixed(0)} ha
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wheat className="w-3 h-3" />
                      {talhaoStats.length} talhões
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Volume Processado */}
              <div
                className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-orange hover:scale-[1.02] transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-neon-orange/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-neon-orange/20 group-hover:bg-neon-orange/30 transition-colors">
                      <Scale className="w-4 h-4 text-neon-orange" />
                    </div>
                    <span className="text-xs text-neon-orange font-semibold uppercase tracking-wider">Volume</span>
                  </div>
                  <p className="text-4xl font-display font-bold mb-1">
                    {(totaisCarregamentos.totalPesoKg / 1000).toFixed(1)}
                    <span className="text-lg text-neon-orange ml-1">ton</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{totaisCarregamentos.totalCarregamentos} carregamentos</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      {(totaisCarregamentos.mediaPesoPorCarregamento / 1000).toFixed(1)} ton/carreg.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== DASHBOARD DE KPIs ========== */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-4 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Zap className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Dashboard de KPIs</h2>
                  <p className="text-xs text-muted-foreground">Métricas chave de performance</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCarregamentos()}
                disabled={isRefetchingCarregamentos}
                className="rounded-lg border-border/50 hover:border-accent/50 h-8 text-xs"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", isRefetchingCarregamentos && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* KPI 1: Taxa de Beneficiamento */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-neon-cyan/40 hover:scale-105 hover:shadow-glow-cyan/20 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20 group-hover:bg-neon-cyan/30 transition-colors">
                    <Factory className="w-3 h-3 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-xl font-bold text-neon-cyan">{taxaBeneficiamento.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Taxa Benefic.</p>
              </div>

              {/* KPI 2: Fardos Hoje */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-primary/40 hover:scale-105 hover:shadow-glow/20 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <CalendarDays className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <p className="text-xl font-bold text-primary">{balesToday}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Fardos Hoje</p>
              </div>

              {/* KPI 3: Média/Dia */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-accent/40 hover:scale-105 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                    <TrendingUp className="w-3 h-3 text-accent" />
                  </div>
                </div>
                <p className="text-xl font-bold text-accent">{fardosPorDia.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Fardos/Dia</p>
              </div>

              {/* KPI 4: Tempo Médio */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-neon-orange/40 hover:scale-105 hover:shadow-glow-orange/20 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-orange/20 group-hover:bg-neon-orange/30 transition-colors">
                    <Timer className="w-3 h-3 text-neon-orange" />
                  </div>
                </div>
                <p className="text-xl font-bold text-neon-orange">
                  {tempoMedioProcessamento > 24
                    ? `${Math.floor(tempoMedioProcessamento / 24)}d`
                    : `${Math.floor(tempoMedioProcessamento)}h`}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">Tempo Proc.</p>
              </div>

              {/* KPI 5: Rendimento Pluma */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-primary/40 hover:scale-105 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Wheat className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {rendimentoMedioPluma > 0 ? `${rendimentoMedioPluma.toFixed(1)}%` : "-"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">Rend. Pluma</p>
              </div>

              {/* KPI 6: Talhões Ativos */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-neon-cyan/40 hover:scale-105 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20 group-hover:bg-neon-cyan/30 transition-colors">
                    <MapPin className="w-3 h-3 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-xl font-bold">{talhoesAtivos}/{talhaoStats.length}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Talhões Ativos</p>
              </div>

              {/* KPI 7: Semana */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-accent/40 hover:scale-105 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                    <Calendar className="w-3 h-3 text-accent" />
                  </div>
                </div>
                <p className="text-xl font-bold text-accent">{balesThisWeek}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Esta Semana</p>
              </div>

              {/* KPI 8: Real vs Previsto */}
              <div className="group p-3 rounded-xl bg-surface border border-border/30 hover:border-green-500/40 hover:scale-105 transition-all duration-200 cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    totaisProdutividade.mediaRealArrobas >= parseFloat(avgArrobasPorHectare)
                      ? "bg-green-500/20"
                      : totaisProdutividade.talhoesComDados === 0
                        ? "bg-muted/20"
                        : "bg-red-500/20"
                  )}>
                    {totaisProdutividade.talhoesComDados === 0 ? (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    ) : totaisProdutividade.mediaRealArrobas >= parseFloat(avgArrobasPorHectare) ? (
                      <ArrowUpRight className="w-3 h-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  totaisProdutividade.talhoesComDados === 0
                    ? "text-muted-foreground"
                    : totaisProdutividade.mediaRealArrobas >= parseFloat(avgArrobasPorHectare)
                      ? "text-green-500"
                      : "text-red-500"
                )}>
                  {totaisProdutividade.talhoesComDados === 0
                    ? "-"
                    : `${parseFloat(avgArrobasPorHectare) > 0
                        ? (((totaisProdutividade.mediaRealArrobas - parseFloat(avgArrobasPorHectare)) /
                            parseFloat(avgArrobasPorHectare)) * 100).toFixed(0)
                        : "0"}%`}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">Real vs Prev.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="talhao" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 rounded-xl glass-card p-1 h-auto sm:h-12">
            <TabsTrigger
              value="talhao"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              Talhões
            </TabsTrigger>
            <TabsTrigger
              value="carregamentos"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-neon-orange data-[state=active]:text-black"
            >
              Carreg.
            </TabsTrigger>
            <TabsTrigger
              value="beneficiamento"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-purple-500 data-[state=active]:text-black"
            >
              Benef.
            </TabsTrigger>
            <TabsTrigger
              value="safra"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              Safras
            </TabsTrigger>
            <TabsTrigger
              value="graficos"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-neon-cyan data-[state=active]:text-black"
            >
              Gráficos
            </TabsTrigger>
            <TabsTrigger
              value="mapa"
              className="rounded-lg px-2 py-2 text-xs font-semibold transition-colors data-[state=active]:bg-accent data-[state=active]:text-black"
            >
              Mapa
            </TabsTrigger>
          </TabsList>

          {/* Tab: Por Talhão */}
          <TabsContent value="talhao" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Buscar talhão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-surface border-border/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="input-search-talhao"
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
                      <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                    </div>
                    <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-8 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredTalhaoStats.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface mb-4">
                  <Wheat className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "Nenhum talhão encontrado" : "Nenhum talhão cadastrado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tente buscar por outro termo"
                    : "Cadastre o primeiro fardo para visualizar estatísticas"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTalhaoStats.map((stat) => {
                  const progressCampo = stat.total > 0 ? (stat.campo / stat.total) * 100 : 0;
                  const progressPatio = stat.total > 0 ? (stat.patio / stat.total) * 100 : 0;
                  const progressBeneficiado = stat.total > 0 ? (stat.beneficiado / stat.total) * 100 : 0;

                  const talhaoInfo = getTalhaoInfo(stat.talhao);
                  const produtividade = (() => {
                    if (!talhaoInfo || !talhaoInfo.hectares) return '0.00';
                    const hectares = parseFloat(talhaoInfo.hectares);
                    if (isNaN(hectares) || hectares === 0) return '0.00';
                    return (stat.total / hectares).toFixed(2);
                  })();

                  return (
                    <div
                      key={stat.talhao}
                      className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-glow-sm transition-all duration-300 border border-border/30 hover:border-primary/40"
                      data-testid={`card-talhao-${stat.talhao}`}
                      onClick={() => setSelectedTalhao(stat.talhao)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                            <Wheat className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{stat.talhao}</h3>
                              <Info className="w-4 h-4 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getTalhaoInfo(stat.talhao)?.hectares || '0'} ha - {produtividade} f/ha
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-primary">{stat.total}</span>
                          <p className="text-[10px] text-muted-foreground uppercase">fardos</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Campo */}
                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/20">
                                <Package className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-medium">Campo</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold">{stat.campo}</span>
                              <span className="text-xs text-muted-foreground">({progressCampo.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressCampo}%` }} />
                          </div>
                        </div>

                        {/* Pátio */}
                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-neon-orange/20">
                                <Truck className="w-3.5 h-3.5 text-neon-orange" />
                              </div>
                              <span className="text-sm font-medium">Pátio</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold">{stat.patio}</span>
                              <span className="text-xs text-muted-foreground">({progressPatio.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-orange rounded-full transition-all" style={{ width: `${progressPatio}%` }} />
                          </div>
                        </div>

                        {/* Beneficiado */}
                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                                <CheckCircle className="w-3.5 h-3.5 text-neon-cyan" />
                              </div>
                              <span className="text-sm font-medium">Beneficiado</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold">{stat.beneficiado}</span>
                              <span className="text-xs text-muted-foreground">({progressBeneficiado.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-cyan rounded-full transition-all" style={{ width: `${progressBeneficiado}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Carregamentos */}
          <TabsContent value="carregamentos" className="space-y-4 mt-4">
            {/* KPIs de Carregamentos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-orange/20">
                    <Truck className="w-4 h-4 text-neon-orange" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-neon-orange">{totaisCarregamentos.totalCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Total Carregamentos</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/20">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary">{(totaisCarregamentos.totalPesoKg / 1000).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Toneladas</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                    <MapPin className="w-4 h-4 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-neon-cyan">{totaisCarregamentos.talhoesComCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Talhões</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/20">
                    <TrendingUp className="w-4 h-4 text-accent" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-accent">{(totaisCarregamentos.mediaPesoPorCarregamento / 1000).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Ton/Carreg.</p>
              </div>
            </div>

            {/* Tabela de Carregamentos */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/10 via-neon-orange/5 to-transparent" />
                <div className="relative flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-neon-orange/20">
                    <Truck className="w-4 h-4 text-neon-orange" />
                  </div>
                  <h3 className="text-sm font-semibold">Carregamentos por Talhão</h3>
                  <span className="text-xs text-muted-foreground">• Safra {selectedSafra}</span>
                </div>
              </div>

              <div className="p-4">
                {(pesoBrutoTotais ?? []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum carregamento registrado</p>
                    <p className="text-xs mt-1">Adicione carregamentos na página da Algodoeira</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Talhão</th>
                          <th className="text-right py-3 px-2 font-semibold text-neon-orange">Carreg.</th>
                          <th className="text-right py-3 px-2 font-semibold text-primary">Peso (kg)</th>
                          <th className="text-right py-3 px-2 font-semibold text-neon-cyan">Peso (ton)</th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pesoBrutoTotais ?? [])
                          .sort((a, b) => b.pesoBrutoTotal - a.pesoBrutoTotal)
                          .map((item) => (
                            <tr key={item.talhao} className="border-b border-border/20 hover:bg-surface/50 transition-colors">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-neon-orange/20 flex items-center justify-center text-xs font-bold text-neon-orange">
                                    {item.talhao}
                                  </div>
                                  <span className="font-medium">{item.talhao}</span>
                                </div>
                              </td>
                              <td className="text-right py-3 px-2 font-bold text-neon-orange">{item.quantidadeCarregamentos}</td>
                              <td className="text-right py-3 px-2 font-bold text-primary">{item.pesoBrutoTotal.toLocaleString("pt-BR")}</td>
                              <td className="text-right py-3 px-2 font-bold text-neon-cyan">{(item.pesoBrutoTotal / 1000).toFixed(2)}</td>
                              <td className="text-right py-3 px-2 text-muted-foreground">
                                {item.quantidadeCarregamentos > 0 ? (item.pesoBrutoTotal / item.quantidadeCarregamentos / 1000).toFixed(2) : "0.00"} ton
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border/50 bg-surface/50">
                          <td className="py-3 px-2 font-bold">TOTAL</td>
                          <td className="text-right py-3 px-2 font-bold text-neon-orange">{totaisCarregamentos.totalCarregamentos}</td>
                          <td className="text-right py-3 px-2 font-bold text-primary">{totaisCarregamentos.totalPesoKg.toLocaleString("pt-BR")}</td>
                          <td className="text-right py-3 px-2 font-bold text-neon-cyan">{(totaisCarregamentos.totalPesoKg / 1000).toFixed(2)}</td>
                          <td className="text-right py-3 px-2 font-bold text-muted-foreground">{(totaisCarregamentos.mediaPesoPorCarregamento / 1000).toFixed(2)} ton</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela Comparativa */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">Comparativo por Talhão</h3>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {produtividadeComparativa.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wheat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum talhão com dados para comparar</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Talhão</th>
                        <th className="text-right py-3 px-2 font-semibold text-muted-foreground">ha</th>
                        <th className="text-right py-3 px-2 font-semibold text-primary">Prev. @/ha</th>
                        <th className="text-right py-3 px-2 font-semibold text-neon-cyan">Real @/ha</th>
                        <th className="text-right py-3 px-2 font-semibold text-muted-foreground">Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtividadeComparativa.map((item) => (
                        <tr key={item.talhao} className="border-b border-border/20 hover:bg-surface/50 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {item.talhao}
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 text-muted-foreground text-xs">{item.hectares.toFixed(1)}</td>
                          <td className="text-right py-3 px-2 font-bold text-primary">{item.produtividadePrevistoArrobas.toFixed(1)}</td>
                          <td className="text-right py-3 px-2">
                            {item.temDadosReais ? (
                              <span className="font-bold text-neon-cyan">{item.produtividadeRealArrobas.toFixed(1)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-2">
                            {item.temDadosReais ? (
                              <div className="flex items-center justify-end gap-1">
                                {item.diferencaPercentual > 0 ? (
                                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                                ) : item.diferencaPercentual < 0 ? (
                                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                                ) : null}
                                <span className={cn("font-bold text-xs", item.diferencaPercentual > 0 ? "text-green-500" : item.diferencaPercentual < 0 ? "text-red-500" : "text-muted-foreground")}>
                                  {item.diferencaPercentual > 0 ? "+" : ""}{item.diferencaPercentual.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Beneficiamento */}
          <TabsContent value="beneficiamento" className="space-y-4 mt-4">
            {/* KPIs de Beneficiamento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="glass-card p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <Wheat className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {(totaisLotes.totalPesoPluma / 1000).toFixed(1)}
                  <span className="text-sm ml-1">ton</span>
                </p>
                <p className="text-xs text-muted-foreground">Peso Pluma</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{totaisLotes.totalLotes}</p>
                <p className="text-xs text-muted-foreground">Lotes</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <Scale className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {(totaisLotes.mediaPesoPorLote / 1000).toFixed(2)}
                  <span className="text-sm ml-1">ton</span>
                </p>
                <p className="text-xs text-muted-foreground">Média/Lote</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-neon-cyan/20 hover:border-neon-cyan/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                    <Boxes className="w-4 h-4 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-neon-cyan">{totaisFardinhos.totalFardinhos}</p>
                <p className="text-xs text-muted-foreground">Fardinhos</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-neon-cyan/20 hover:border-neon-cyan/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                    <CalendarDays className="w-4 h-4 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{totaisFardinhos.totalRegistros}</p>
                <p className="text-xs text-muted-foreground">Registros</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg", rendimentoCalculado > 0 ? "bg-green-500/20" : "bg-muted/20")}>
                    <Percent className={cn("w-4 h-4", rendimentoCalculado > 0 ? "text-green-500" : "text-muted-foreground")} />
                  </div>
                </div>
                <p className={cn("text-2xl font-bold", rendimentoCalculado > 0 ? "text-green-500" : "text-muted-foreground")}>
                  {rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(2)}%` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Rendimento</p>
              </div>
            </div>

            {/* Barra de Progresso do Beneficiamento */}
            {totaisCarregamentos.totalPesoKg > 0 && (
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Progresso do Beneficiamento</span>
                  <span className="text-sm font-bold text-purple-400">
                    {((totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-neon-cyan rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Peso Bruto: {(totaisCarregamentos.totalPesoKg / 1000).toFixed(1)} ton</span>
                  <span>Pluma: {(totaisLotes.totalPesoPluma / 1000).toFixed(1)} ton</span>
                </div>
              </div>
            )}

            {/* Lista de Lotes */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20">
                      <Wheat className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Lotes de Pluma</h3>
                    <span className="text-xs text-muted-foreground">• {lotes.length} lotes</span>
                  </div>
                </div>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {lotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wheat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum lote registrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lotes.map((lote) => (
                      <div key={lote.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/30">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-purple-400">#{lote.numeroLote}</span>
                          <span className="text-sm font-mono">{parseFloat(lote.pesoPluma).toLocaleString("pt-BR")} KG</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(lote.dataProcessamento).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Fardinhos */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                      <Boxes className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <h3 className="text-sm font-semibold">Registros de Fardinhos</h3>
                    <span className="text-xs text-muted-foreground">• {fardinhos.length} registros</span>
                  </div>
                </div>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {fardinhos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum fardinho registrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fardinhos.map((fardinho) => (
                      <div key={fardinho.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/30">
                        <div className="flex items-center gap-3">
                          <Boxes className="w-5 h-5 text-neon-cyan" />
                          <span className="text-sm font-mono font-bold">{fardinho.quantidade} fardinhos</span>
                          {fardinho.observacao && (
                            <span className="text-xs text-muted-foreground truncate max-w-32">{fardinho.observacao}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fardinho.dataRegistro).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Por Safra */}
          <TabsContent value="safra" className="space-y-4 mt-4">
            {safraStats.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma safra registrada</h3>
                <p className="text-sm text-muted-foreground">
                  Crie fardos para visualizar estatísticas por safra
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {safraStats.map((stat) => {
                  const progressCampo = stat.total > 0 ? (stat.campo / stat.total) * 100 : 0;
                  const progressPatio = stat.total > 0 ? (stat.patio / stat.total) * 100 : 0;
                  const progressBeneficiado = stat.total > 0 ? (stat.beneficiado / stat.total) * 100 : 0;

                  return (
                    <div
                      key={stat.safra}
                      className="glass-card rounded-xl p-5 hover:shadow-glow-orange transition-all duration-300 border border-border/30 hover:border-neon-orange/40"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-neon-orange/20 text-neon-orange flex items-center justify-center">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <h3 className="text-lg font-semibold">Safra {stat.safra}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-neon-orange">{stat.total}</span>
                          <p className="text-[10px] text-muted-foreground uppercase">fardos</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/20">
                                <Package className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm font-medium">Campo</span>
                            </div>
                            <span className="font-bold">{stat.campo}</span>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progressCampo}%` }} />
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-neon-orange/20">
                                <Truck className="w-3.5 h-3.5 text-neon-orange" />
                              </div>
                              <span className="text-sm font-medium">Pátio</span>
                            </div>
                            <span className="font-bold">{stat.patio}</span>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-orange rounded-full" style={{ width: `${progressPatio}%` }} />
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                                <CheckCircle className="w-3.5 h-3.5 text-neon-cyan" />
                              </div>
                              <span className="text-sm font-medium">Beneficiado</span>
                            </div>
                            <span className="font-bold">{stat.beneficiado}</span>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${progressBeneficiado}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Gráficos - REFORMULADA */}
          <TabsContent value="graficos" className="space-y-6 mt-4">
            {/* Filtros Compactos */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Filtros:</span>
                </div>
                <div className="flex gap-2">
                  {(["7d", "30d", "all"] as const).map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      onClick={() => setTimeFilter(filter)}
                      className={cn(
                        "rounded-lg font-semibold text-xs h-8 px-3 transition-all",
                        timeFilter === filter
                          ? "btn-neon"
                          : "bg-surface border border-border/50 text-foreground hover:border-primary/50"
                      )}
                    >
                      {filter === "7d" ? "7d" : filter === "30d" ? "30d" : "Tudo"}
                    </Button>
                  ))}
                </div>
                <div className="h-6 w-px bg-border/50 hidden sm:block" />
                <div className="flex gap-2">
                  {(["all", "campo", "patio", "beneficiado"] as const).map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      onClick={() => setChartFilter(filter)}
                      className={cn(
                        "rounded-lg font-semibold text-xs h-8 px-3 transition-all",
                        chartFilter === filter
                          ? filter === "patio"
                            ? "bg-neon-orange text-black"
                            : filter === "beneficiado"
                              ? "bg-neon-cyan text-black"
                              : "btn-neon"
                          : "bg-surface border border-border/50 text-foreground hover:border-primary/50"
                      )}
                    >
                      {filter === "all" ? "Todos" : filter === "campo" ? "Campo" : filter === "patio" ? "Pátio" : "Benef."}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO 1: EVOLUÇÃO TEMPORAL (Full Width) ========== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Evolução Temporal</h2>
                      <p className="text-xs text-muted-foreground">Fardos criados nos últimos 14 dias</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF88" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        border: '1px solid rgba(0,255,136,0.3)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card p-3 rounded-lg border border-primary/30">
                              <p className="font-semibold text-sm mb-2">{label}</p>
                              <div className="space-y-1">
                                <p className="text-xs"><span className="text-primary">●</span> Total: <span className="font-bold">{data.total}</span></p>
                                <p className="text-xs"><span className="text-primary">●</span> Campo: {data.campo}</p>
                                <p className="text-xs"><span className="text-neon-orange">●</span> Pátio: {data.patio}</p>
                                <p className="text-xs"><span className="text-neon-cyan">●</span> Benef.: {data.beneficiado}</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#00FF88" fill="url(#colorEvolution)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ========== SEÇÃO 2: GRID DE ANÁLISES 2x2 ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribuição por Status (Donut) */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-4 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
                  <div className="relative flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-neon-cyan/20">
                      <PieChart className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <h2 className="text-sm font-semibold">Distribuição por Status</h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-center gap-8">
                    <ResponsiveContainer width={180} height={180}>
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          stroke="none"
                          label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            borderRadius: '8px'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {pieChartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                          <div>
                            <p className="text-sm font-bold">{item.value}</p>
                            <p className="text-xs text-muted-foreground">{item.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranking de Talhões (Horizontal Bar) */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-4 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                  <div className="relative flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent/20">
                      <Award className="w-4 h-4 text-accent" />
                    </div>
                    <h2 className="text-sm font-semibold">Ranking por Produtividade (@/ha)</h2>
                  </div>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      layout="vertical"
                      data={topTalhoes.slice(0, 5)}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis dataKey="talhao" type="category" tick={{ fontSize: 11, fill: '#888' }} width={40} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.9)',
                          border: '1px solid rgba(255,215,0,0.3)',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} @/ha`, 'Produtividade']}
                      />
                      <Bar dataKey="arrobasPorHa" fill="#FFD700" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO 3: PRODUÇÃO POR TALHÃO ========== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold">Produção por Talhão</h2>
                </div>
              </div>
              <div className="p-5 overflow-x-auto">
                <ResponsiveContainer width="100%" height={280} minWidth={400}>
                  <BarChart
                    data={talhaoStats.map(stat => ({
                      talhao: stat.talhao,
                      campo: chartFilter === "all" || chartFilter === "campo" ? stat.campo : 0,
                      patio: chartFilter === "all" || chartFilter === "patio" ? stat.patio : 0,
                      beneficiado: chartFilter === "all" || chartFilter === "beneficiado" ? stat.beneficiado : 0,
                      total: stat.total,
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="talhao" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(0,255,136,0.3)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {(chartFilter === "all" || chartFilter === "campo") && (
                      <Bar dataKey="campo" stackId="a" fill="#00FF88" name="Campo" radius={[0, 0, 0, 0]} />
                    )}
                    {(chartFilter === "all" || chartFilter === "patio") && (
                      <Bar dataKey="patio" stackId="a" fill="#FF9500" name="Pátio" radius={[0, 0, 0, 0]} />
                    )}
                    {(chartFilter === "all" || chartFilter === "beneficiado") && (
                      <Bar dataKey="beneficiado" stackId="a" fill="#00D4FF" name="Beneficiado" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ========== SEÇÃO 4: PRODUTIVIDADE GRID 2x2 ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Produtividade @/ha */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-4 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
                  <div className="relative flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-neon-cyan/20">
                      <TrendingUp className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <h2 className="text-sm font-semibold">Produtividade (@/ha)</h2>
                  </div>
                </div>
                <div className="p-4 overflow-x-auto">
                  <ResponsiveContainer width="100%" height={220} minWidth={300}>
                    <BarChart
                      data={talhaoStats
                        .map(stat => {
                          const talhaoInfo = TALHOES_INFO.find(t => t.id === stat.talhao);
                          const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
                          const fardosPorHectare = hectares > 0 ? stat.total / hectares : 0;
                          const arrobasPorHectare = fardosPorHectare * 66.67;
                          return { talhao: stat.talhao, arrobas: arrobasPorHectare, fardos: stat.total, hectares };
                        })
                        .sort((a, b) => b.arrobas - a.arrobas)
                      }
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="talhao" tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="glass-card p-2 rounded-lg border border-neon-cyan/30 text-xs">
                                <p className="font-semibold">{data.talhao}</p>
                                <p className="text-neon-cyan font-bold">{data.arrobas.toFixed(1)} @/ha</p>
                                <p className="text-muted-foreground">{data.fardos} fardos • {data.hectares} ha</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="arrobas" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Produtividade f/ha */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-4 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/10 via-neon-orange/5 to-transparent" />
                  <div className="relative flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-neon-orange/20">
                      <Package className="w-4 h-4 text-neon-orange" />
                    </div>
                    <h2 className="text-sm font-semibold">Produtividade (f/ha)</h2>
                  </div>
                </div>
                <div className="p-4 overflow-x-auto">
                  <ResponsiveContainer width="100%" height={220} minWidth={300}>
                    <BarChart
                      data={talhaoStats
                        .map(stat => {
                          const talhaoInfo = TALHOES_INFO.find(t => t.id === stat.talhao);
                          const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
                          const fardosPorHectare = hectares > 0 ? stat.total / hectares : 0;
                          return { talhao: stat.talhao, fardosPorHa: fardosPorHectare, fardos: stat.total, hectares };
                        })
                        .sort((a, b) => b.fardosPorHa - a.fardosPorHa)
                      }
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="talhao" tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="glass-card p-2 rounded-lg border border-neon-orange/30 text-xs">
                                <p className="font-semibold">{data.talhao}</p>
                                <p className="text-neon-orange font-bold">{data.fardosPorHa.toFixed(2)} f/ha</p>
                                <p className="text-muted-foreground">{data.fardos} fardos • {data.hectares} ha</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="fardosPorHa" fill="#FF9500" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ========== SEÇÃO 5: COMPARATIVO PREVISTO VS REAL ========== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Comparativo: Previsto vs Real</h2>
                    <p className="text-xs text-muted-foreground">Produtividade prevista (baseada em fardos) vs real (com dados de rendimento)</p>
                  </div>
                </div>
              </div>
              <div className="p-5 overflow-x-auto">
                <ResponsiveContainer width="100%" height={280} minWidth={400}>
                  <BarChart
                    data={produtividadeComparativa.filter(t => t.temDadosReais).map(t => ({
                      talhao: t.talhao,
                      previsto: t.produtividadePrevistoArrobas,
                      real: t.produtividadeRealArrobas,
                      diferenca: t.diferencaPercentual
                    }))}
                    margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="talhao" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        border: '1px solid rgba(255,215,0,0.3)',
                        borderRadius: '12px'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card p-3 rounded-lg border border-accent/30">
                              <p className="font-semibold text-sm mb-2">Talhão {data.talhao}</p>
                              <div className="space-y-1 text-xs">
                                <p><span className="text-primary">●</span> Previsto: <span className="font-bold">{data.previsto.toFixed(1)} @/ha</span></p>
                                <p><span className="text-accent">●</span> Real: <span className="font-bold">{data.real.toFixed(1)} @/ha</span></p>
                                <p className={cn(
                                  "font-semibold",
                                  data.diferenca >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {data.diferenca >= 0 ? "+" : ""}{data.diferenca.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="previsto" fill="#00FF88" name="Previsto (@/ha)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="real" fill="#FFD700" name="Real (@/ha)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {produtividadeComparativa.filter(t => t.temDadosReais).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum talhão com dados de rendimento real</p>
                    <p className="text-xs mt-1">Adicione dados de rendimento na página da Algodoeira</p>
                  </div>
                )}
              </div>
            </div>

            {/* ========== SEÇÃO 6: TEMPO DE PROCESSAMENTO ========== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/10 via-neon-orange/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-neon-orange/20">
                    <Clock className="w-5 h-5 text-neon-orange" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Tempo de Processamento</h2>
                    <p className="text-xs text-muted-foreground">Tempo médio do Pátio até Beneficiado por talhão</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {(() => {
                  const talhaoTempos: Record<string, { total: number; count: number }> = {};

                  allBales
                    .filter(b => b.status === "beneficiado" && b.statusHistory)
                    .forEach(bale => {
                      try {
                        const history = JSON.parse(bale.statusHistory!);
                        const patioEvent = history.find((h: { status: string }) => h.status === "patio");
                        const beneficiadoEvent = history.find((h: { status: string }) => h.status === "beneficiado");

                        if (patioEvent && beneficiadoEvent) {
                          const patioTime = new Date(patioEvent.timestamp).getTime();
                          const beneficiadoTime = new Date(beneficiadoEvent.timestamp).getTime();
                          const hoursToProcess = (beneficiadoTime - patioTime) / (1000 * 60 * 60);

                          if (!talhaoTempos[bale.talhao]) {
                            talhaoTempos[bale.talhao] = { total: 0, count: 0 };
                          }
                          talhaoTempos[bale.talhao].total += hoursToProcess;
                          talhaoTempos[bale.talhao].count += 1;
                        }
                      } catch {
                        // Ignorar erros de parse
                      }
                    });

                  const tempoData = Object.entries(talhaoTempos)
                    .map(([talhao, data]) => ({
                      talhao,
                      horas: data.total / data.count,
                      count: data.count
                    }))
                    .sort((a, b) => b.horas - a.horas);

                  if (tempoData.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum fardo beneficiado ainda</p>
                        <p className="text-xs mt-1">Os dados aparecerão quando fardos forem processados</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {tempoData.map((item) => {
                        const dias = Math.floor(item.horas / 24);
                        const horas = Math.floor(item.horas % 24);
                        return (
                          <div
                            key={item.talhao}
                            className="p-4 rounded-xl bg-surface border border-border/30 hover:border-neon-orange/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-neon-orange/20 text-neon-orange text-xs font-bold flex items-center justify-center">
                                {item.talhao}
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-neon-orange">
                              {dias > 0 ? `${dias}d ` : ''}{horas}h
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.count} fardo{item.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Mapa */}
          <TabsContent value="mapa" className="mt-4 space-y-4">
            {/* Hero do Mapa */}
            <div className="relative overflow-hidden rounded-2xl glass-card">
              {/* Background gradient animado */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-neon-cyan/10 opacity-50" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

              <div className="relative p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Título e descrição */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-glow">
                        <MapPin className="w-8 h-8 text-black" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                        <span className="text-[10px] font-bold text-black">{talhaoStats.length}</span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-bold">
                        <span className="gradient-text">Mapa Interativo</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visualize a distribuição geográfica dos talhões em tempo real
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
                          Tempo real
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-surface text-muted-foreground border border-border/50">
                          {totalHectares.toFixed(0)} ha total
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card p-4 rounded-xl text-center border border-primary/20 hover:border-primary/40 transition-all">
                      <div className="p-2 bg-primary/20 rounded-lg w-fit mx-auto mb-2">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold text-primary">{globalStats?.campo || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Campo</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center border border-neon-orange/20 hover:border-neon-orange/40 transition-all">
                      <div className="p-2 bg-neon-orange/20 rounded-lg w-fit mx-auto mb-2">
                        <Truck className="w-4 h-4 text-neon-orange" />
                      </div>
                      <p className="text-2xl font-bold text-neon-orange">{globalStats?.patio || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Pátio</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center border border-neon-cyan/20 hover:border-neon-cyan/40 transition-all">
                      <div className="p-2 bg-neon-cyan/20 rounded-lg w-fit mx-auto mb-2">
                        <CheckCircle className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <p className="text-2xl font-bold text-neon-cyan">{globalStats?.beneficiado || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Beneficiados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout principal do mapa */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sidebar - Lista de Talhões */}
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="glass-card rounded-2xl overflow-hidden h-full">
                  <div className="relative p-4 border-b border-border/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                    <div className="relative flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Talhões</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{talhaoStats.length}</span>
                    </div>
                  </div>

                  {/* Search dentro da sidebar */}
                  <div className="p-3 border-b border-border/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-surface border-border/50 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Lista de talhões scrollável */}
                  <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto p-2 space-y-1.5">
                    {filteredTalhaoStats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum talhão encontrado</p>
                      </div>
                    ) : (
                      filteredTalhaoStats.map((stat) => {
                        const isSelected = selectedTalhao === stat.talhao;
                        const talhaoInfo = getTalhaoInfo(stat.talhao);
                        const hectares = talhaoInfo?.hectares || '0';
                        const progressPercent = stat.total > 0
                          ? ((stat.beneficiado / stat.total) * 100).toFixed(0)
                          : '0';

                        return (
                          <button
                            key={stat.talhao}
                            onClick={() => setSelectedTalhao(stat.talhao)}
                            className={cn(
                              "w-full p-3 rounded-xl text-left transition-all duration-200",
                              isSelected
                                ? "bg-primary/20 border border-primary/50 shadow-glow-sm"
                                : "bg-surface hover:bg-surface-hover border border-transparent hover:border-border/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                  isSelected
                                    ? "bg-primary text-black"
                                    : "bg-surface-elevated text-foreground"
                                )}>
                                  {stat.talhao}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{stat.talhao}</p>
                                  <p className="text-[10px] text-muted-foreground">{hectares} ha</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn(
                                  "text-sm font-bold",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>{stat.total}</p>
                                <p className="text-[10px] text-muted-foreground">fardos</p>
                              </div>
                            </div>

                            {/* Mini progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-neon-cyan rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-8">{progressPercent}%</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Mapa Principal */}
              <div className="lg:col-span-3 order-1 lg:order-2">
                <div className="glass-card rounded-2xl overflow-hidden">
                  <InteractiveTalhaoMap
                    selectedTalhao={selectedTalhao || undefined}
                    onTalhaoClick={(talhao) => setSelectedTalhao(talhao)}
                  />
                </div>
              </div>
            </div>

            {/* Legenda Visual */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
                <div className="relative flex items-center gap-2">
                  <Info className="w-4 h-4 text-neon-cyan" />
                  <h3 className="text-sm font-semibold">Legenda e Dicas</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/30">
                    <div className="w-4 h-4 rounded bg-primary border-2 border-primary/50" />
                    <div>
                      <p className="text-sm font-medium">Algodão</p>
                      <p className="text-[10px] text-muted-foreground">Talhões produtivos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/30">
                    <div className="w-4 h-4 rounded bg-gray-400/50 border-2 border-gray-500/30" />
                    <div>
                      <p className="text-sm font-medium">Outras Culturas</p>
                      <p className="text-[10px] text-muted-foreground">Áreas não-algodão</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/30">
                    <div className="w-4 h-4 rounded-full bg-neon-orange flex items-center justify-center">
                      <span className="text-[8px] text-black font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Alertas</p>
                      <p className="text-[10px] text-muted-foreground">Atenção necessária</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border/30">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Heatmap</p>
                      <p className="text-[10px] text-muted-foreground">Produtividade</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Dica:</strong> Passe o mouse sobre um talhão para ver informações rápidas.
                      Clique para abrir detalhes completos. Use os filtros no painel do mapa para alternar entre modos de visualização.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail Modal */}
        <Dialog open={!!selectedTalhao} onOpenChange={() => setSelectedTalhao(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto z-[9999] rounded-2xl glass-card border-border/50">
            <DialogHeader className="pb-4 mb-2 border-b border-border/30">
              <DialogTitle className="flex items-center gap-3 text-lg sm:text-2xl font-bold">
                <div className="p-3 rounded-xl bg-primary/20">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                Talhão {selectedTalhao}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground ml-14 mt-1">
                Informações detalhadas e métricas de produtividade
              </DialogDescription>
            </DialogHeader>

            {selectedTalhaoData && selectedTalhaoInfo && (
              <div className="space-y-6">
                {/* Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-xl text-center">
                    <div className="p-2 bg-primary/20 text-primary rounded-lg w-fit mx-auto mb-2">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Área</p>
                    <p className="text-xl font-bold">{selectedTalhaoInfo.hectares}</p>
                    <p className="text-[10px] text-muted-foreground">hectares</p>
                  </div>

                  <div className="glass-card p-4 rounded-xl text-center">
                    <div className="p-2 bg-neon-orange/20 text-neon-orange rounded-lg w-fit mx-auto mb-2">
                      <Package className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Fardos</p>
                    <p className="text-xl font-bold">{selectedTalhaoData.total}</p>
                    <p className="text-[10px] text-muted-foreground">fardos</p>
                  </div>

                  <div className="glass-card p-4 rounded-xl text-center">
                    <div className="p-2 bg-accent/20 text-accent rounded-lg w-fit mx-auto mb-2">
                      <Activity className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Produtividade</p>
                    <p className="text-lg font-bold">{produtividadeArrobas} @/ha</p>
                    <p className="text-[10px] text-muted-foreground">{fardosPorHectare} f/ha</p>
                  </div>

                  <div className="glass-card p-4 rounded-xl text-center">
                    <div className="p-2 bg-neon-cyan/20 text-neon-cyan rounded-lg w-fit mx-auto mb-2">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Concluídos</p>
                    <p className="text-xl font-bold">{selectedTalhaoData.beneficiado}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedTalhaoData.total > 0
                        ? ((selectedTalhaoData.beneficiado / selectedTalhaoData.total) * 100).toFixed(0)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Status Distribution */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-primary">
                    <BarChart3 className="w-4 h-4" />
                    Distribuição por Status
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-surface border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/20 rounded-lg">
                            <Package className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium">Campo</span>
                        </div>
                        <span className="font-bold">{selectedTalhaoData.campo}</span>
                      </div>
                      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(selectedTalhaoData.campo / selectedTalhaoData.total) * 100}%` }} />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-neon-orange/20 rounded-lg">
                            <Truck className="w-3.5 h-3.5 text-neon-orange" />
                          </div>
                          <span className="text-sm font-medium">Pátio</span>
                        </div>
                        <span className="font-bold">{selectedTalhaoData.patio}</span>
                      </div>
                      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-neon-orange rounded-full" style={{ width: `${(selectedTalhaoData.patio / selectedTalhaoData.total) * 100}%` }} />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-neon-cyan/20 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-neon-cyan" />
                          </div>
                          <span className="text-sm font-medium">Beneficiado</span>
                        </div>
                        <span className="font-bold">{selectedTalhaoData.beneficiado}</span>
                      </div>
                      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${(selectedTalhaoData.beneficiado / selectedTalhaoData.total) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative Metrics */}
                <div className="glass-card rounded-xl p-4 border border-primary/20">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-primary">
                    <TrendingUp className="w-4 h-4" />
                    Comparativo com Média Geral
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface rounded-lg border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Este talhão</p>
                      <p className="text-xl font-bold text-primary">{produtividadeArrobas} @/ha</p>
                      <p className="text-xs text-muted-foreground">{fardosPorHectare} f/ha</p>
                    </div>
                    <div className="p-3 bg-surface rounded-lg border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Média geral</p>
                      <p className="text-xl font-bold text-neon-cyan">{avgArrobasPorHectare} @/ha</p>
                      <p className="text-xs text-muted-foreground">{avgFardosPorHectare} f/ha</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <style>{`
          [data-radix-dialog-overlay] {
            z-index: 9998 !important;
          }
          [data-radix-dialog-content] {
            z-index: 9999 !important;
          }
        `}</style>
      </PageContent>
    </Page>
  );
}
