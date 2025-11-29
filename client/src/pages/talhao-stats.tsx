import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/hooks/use-settings";
import type { Bale, RendimentoTalhao, Lote, Fardinho } from "@shared/schema";
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
  Layers,
  MapPin,
  Sparkles,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Factory,
  Award,
  Percent,
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  X,
  Info,
  Zap,
  Clock,
  Box,
  Activity,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [selectedTalhaoDetail, setSelectedTalhaoDetail] = useState<string | null>(null);
  const [perdasModalOpen, setPerdasModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "campo" | "patio" | "beneficiado">("all");

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

  // ==================== QUERIES ====================

  const { data: talhaoStatsData, isLoading } = useQuery<Record<string, TalhaoStats>>({
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
    staleTime: 60000,
    enabled: !!selectedSafra,
  });

  const talhaoStats = talhaoStatsData ? Object.values(talhaoStatsData) : [];

  const { data: allBales = [] } = useQuery<Bale[]>({
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
    staleTime: 30000,
    enabled: !!selectedSafra,
  });

  const { data: globalStats } = useQuery<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }>({
    queryKey: ["/api/bales/stats", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/bales/stats?safra=${encodedSafra}`
        : `/api/bales/stats?safra=${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { campo: 0, patio: 0, beneficiado: 0, total: 0 };
      return response.json();
    },
    staleTime: 30000,
    enabled: !!selectedSafra,
  });

  const { data: pesoBrutoTotais = [] } = useQuery<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]>({
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!selectedSafra,
  });

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
    enabled: !!selectedSafra,
  });

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
    enabled: !!selectedSafra,
  });

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
    enabled: !!selectedSafra,
  });

  const { data: perdasTotais = [] } = useQuery<{ talhao: string; totalPerdas: number; quantidadeRegistros: number }[]>({
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

  interface CotacaoData {
    pluma: number;
    caroco: number;
    fonte: string;
    dataAtualizacao: string;
  }
  const { data: cotacaoData } = useQuery<CotacaoData>({
    queryKey: ["/api/cotacao-algodao"],
    queryFn: async () => {
      const url = API_URL ? `${API_URL}/api/cotacao-algodao` : '/api/cotacao-algodao';
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { pluma: 140, caroco: 38, fonte: 'manual', dataAtualizacao: '' };
      return response.json();
    },
  });

  // ==================== CÁLCULOS ====================

  const cotacaoPluma = cotacaoData?.pluma || 140;
  const cotacaoCaroco = cotacaoData?.caroco || 38;
  const valorMedioPorArroba = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;

  const totalPerdasArrobasHa = perdasTotais.reduce((acc, p) => acc + (p.totalPerdas || 0), 0);
  const totalHectares = talhoesSafra.reduce((acc, t) => acc + parseFloat(t.hectares.replace(",", ".")), 0);

  const perdasPorTalhaoComValor = useMemo(() => {
    return perdasTotais.map(p => {
      const talhaoInfo = talhoesSafra.find(t => t.nome === p.talhao);
      const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
      const arrobasTotais = p.totalPerdas * hectares;
      const valorBRL = arrobasTotais * valorMedioPorArroba;
      const detalhes = perdasDetalhadas.filter(pd => pd.talhao === p.talhao);
      return {
        talhao: p.talhao,
        arrobasHa: p.totalPerdas,
        hectares,
        arrobasTotais,
        valorBRL,
        quantidadeRegistros: p.quantidadeRegistros,
        detalhes
      };
    }).sort((a, b) => b.valorBRL - a.valorBRL);
  }, [perdasTotais, talhoesSafra, valorMedioPorArroba, perdasDetalhadas]);

  const totalPerdasValorBRL = perdasPorTalhaoComValor.reduce((acc, p) => acc + p.valorBRL, 0);

  const produtividadeComparativa = useMemo(() => {
    return talhoesSafra.map((talhaoInfo) => {
      const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
      const stats = talhaoStats.find((s) => s.talhao === talhaoInfo.nome);
      const pesoBrutoData = pesoBrutoTotais.find((p) => p.talhao === talhaoInfo.nome);

      const totalFardos = stats?.total || 0;
      const pesoBrutoTotal = pesoBrutoData?.pesoBrutoTotal || 0;
      const qtdCarregamentos = pesoBrutoData?.quantidadeCarregamentos || 0;
      const pesoMedioRealFardo = totalFardos > 0 ? pesoBrutoTotal / totalFardos : 0;

      const pesoEstimado = totalFardos * 2000;
      const produtividadePrevistoKg = hectares > 0 && totalFardos > 0 ? pesoEstimado / hectares : 0;
      const produtividadePrevistoArrobas = produtividadePrevistoKg / 15;

      const produtividadeRealKg = hectares > 0 && pesoBrutoTotal > 0 ? pesoBrutoTotal / hectares : 0;
      const produtividadeRealArrobas = produtividadeRealKg / 15;

      const diferencaArrobas = produtividadeRealArrobas - produtividadePrevistoArrobas;
      const diferencaPercentual = produtividadePrevistoArrobas > 0
        ? ((produtividadeRealArrobas - produtividadePrevistoArrobas) / produtividadePrevistoArrobas) * 100
        : 0;

      const temDadosReais = pesoBrutoTotal > 0 && totalFardos > 0;

      return {
        talhao: talhaoInfo.nome,
        hectares,
        totalFardos,
        pesoEstimado,
        pesoBrutoTotal,
        qtdCarregamentos,
        pesoMedioRealFardo,
        produtividadePrevistoKg,
        produtividadePrevistoArrobas,
        produtividadeRealKg,
        produtividadeRealArrobas,
        diferencaArrobas,
        diferencaPercentual,
        temDadosReais,
        campo: stats?.campo || 0,
        patio: stats?.patio || 0,
        beneficiado: stats?.beneficiado || 0,
      };
    }).filter((t) => t.produtividadePrevistoArrobas > 0 || t.temDadosReais || t.totalFardos > 0);
  }, [talhaoStats, pesoBrutoTotais, talhoesSafra]);

  const totaisProdutividade = useMemo(() => {
    const talhoesComFardos = produtividadeComparativa.filter((t) => t.totalFardos > 0);
    const talhoesComDados = produtividadeComparativa.filter((t) => t.temDadosReais);

    const totalHectaresComFardos = talhoesComFardos.reduce((acc, t) => acc + t.hectares, 0);
    const totalHectaresComDados = talhoesComDados.reduce((acc, t) => acc + t.hectares, 0);

    const totalPesoEstimado = talhoesComFardos.reduce((acc, t) => acc + t.pesoEstimado, 0);
    const totalPesoBruto = talhoesComDados.reduce((acc, t) => acc + t.pesoBrutoTotal, 0);
    const totalFardosComDados = talhoesComDados.reduce((acc, t) => acc + t.totalFardos, 0);

    const pesoMedioRealGlobal = totalFardosComDados > 0 ? totalPesoBruto / totalFardosComDados : 0;

    return {
      produtividadePrevistaMedia: totalHectaresComFardos > 0 ? (totalPesoEstimado / totalHectaresComFardos) / 15 : 0,
      produtividadeRealMedia: totalHectaresComDados > 0 ? (totalPesoBruto / totalHectaresComDados) / 15 : 0,
      pesoMedioRealGlobal,
      talhoesComDados: talhoesComDados.length,
      talhoesComFardos: talhoesComFardos.length,
      totalTalhoes: produtividadeComparativa.length,
    };
  }, [produtividadeComparativa]);

  const totaisCarregamentos = useMemo(() => {
    const totalPesoKg = pesoBrutoTotais.reduce((acc, item) => acc + (Number(item.pesoBrutoTotal) || 0), 0);
    const totalCarregamentos = pesoBrutoTotais.reduce((acc, item) => acc + (Number(item.quantidadeCarregamentos) || 0), 0);
    return {
      totalPesoKg,
      totalPesoToneladas: totalPesoKg / 1000,
      totalCarregamentos,
      talhoesComCarregamentos: pesoBrutoTotais.length,
      mediaPesoPorCarregamento: totalCarregamentos > 0 ? totalPesoKg / totalCarregamentos : 0,
    };
  }, [pesoBrutoTotais]);

  const taxaBeneficiamento = useMemo(() => {
    if (!globalStats?.total || globalStats.total === 0) return 0;
    return (globalStats.beneficiado / globalStats.total) * 100;
  }, [globalStats]);

  const totaisLotes = useMemo(() => {
    const totalPesoPluma = lotes.reduce((acc, lote) => acc + (parseFloat(lote.pesoPluma) || 0), 0);
    return {
      totalPesoPluma,
      totalLotes: lotes.length,
      mediaPesoPorLote: lotes.length > 0 ? totalPesoPluma / lotes.length : 0,
    };
  }, [lotes]);

  const totaisFardinhos = useMemo(() => {
    const totalFardinhos = fardinhos.reduce((acc, f) => acc + (f.quantidade || 0), 0);
    return {
      totalFardinhos,
      totalRegistros: fardinhos.length,
    };
  }, [fardinhos]);

  const pesoMedioPorFardinho = useMemo(() => {
    if (totaisFardinhos.totalFardinhos === 0 || totaisLotes.totalPesoPluma === 0) return 0;
    return totaisLotes.totalPesoPluma / totaisFardinhos.totalFardinhos;
  }, [totaisFardinhos.totalFardinhos, totaisLotes.totalPesoPluma]);

  const rendimentoCalculado = useMemo(() => {
    if (totaisCarregamentos.totalPesoKg === 0 || totaisLotes.totalPesoPluma === 0) return 0;
    return (totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100;
  }, [totaisCarregamentos.totalPesoKg, totaisLotes.totalPesoPluma]);

  // Dados para gráficos
  const pieChartData = useMemo(() => [
    { name: "Campo", value: globalStats?.campo || 0, color: "#00FF88" },
    { name: "Pátio", value: globalStats?.patio || 0, color: "#FF9500" },
    { name: "Beneficiado", value: globalStats?.beneficiado || 0, color: "#00D4FF" },
  ], [globalStats]);

  const evolutionData = useMemo(() => {
    const days: Record<string, { date: string; total: number }> = {};
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      days[key] = { date: label, total: 0 };
    }

    allBales
      .filter(b => new Date(b.createdAt) >= fourteenDaysAgo)
      .forEach(bale => {
        const key = new Date(bale.createdAt).toISOString().split('T')[0];
        if (days[key]) {
          days[key].total++;
        }
      });

    return Object.values(days);
  }, [allBales]);

  const topTalhoes = useMemo(() => {
    return talhaoStats
      .map(stat => {
        const talhaoInfo = talhoesSafra.find(t => t.nome === stat.talhao);
        const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
        const pesoEstimado = stat.total * 2000;
        const arrobasPorHa = hectares > 0 ? (pesoEstimado / hectares) / 15 : 0;
        return { ...stat, arrobasPorHa, hectares };
      })
      .sort((a, b) => b.arrobasPorHa - a.arrobasPorHa)
      .slice(0, 5);
  }, [talhaoStats, talhoesSafra]);

  // Filtrar talhões
  const filteredTalhoes = useMemo(() => {
    return produtividadeComparativa.filter(t => {
      const matchesSearch = t.talhao.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "campo" && t.campo > 0) ||
        (statusFilter === "patio" && t.patio > 0) ||
        (statusFilter === "beneficiado" && t.beneficiado > 0);
      return matchesSearch && matchesStatus;
    });
  }, [produtividadeComparativa, searchQuery, statusFilter]);

  // Detalhes do talhão selecionado
  const selectedTalhaoData = selectedTalhaoDetail
    ? produtividadeComparativa.find(t => t.talhao === selectedTalhaoDetail)
    : null;

  return (
    <Page>
      <PageContent className="max-w-7xl space-y-4">
        {/* ==================== HEADER COMPACTO ==================== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="rounded-xl h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Estatísticas</h1>
              <p className="text-xs text-muted-foreground">{selectedSafra} • {totalHectares.toFixed(0)} ha</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
              <Activity className="w-4 h-4" />
              {globalStats?.total || 0} fardos
            </div>
          </div>
        </div>

        {/* ==================== TABS PRINCIPAIS ==================== */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 rounded-xl glass-card p-1 h-auto">
            <TabsTrigger
              value="dashboard"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <LayoutDashboard className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="talhoes"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-neon-cyan data-[state=active]:text-black"
            >
              <Wheat className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Talhões</span>
            </TabsTrigger>
            <TabsTrigger
              value="fluxo"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-neon-orange data-[state=active]:text-black"
            >
              <Truck className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Fluxo</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-purple-500 data-[state=active]:text-black"
            >
              <LineChart className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB: DASHBOARD ==================== */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Hero Card - Valor da Produção */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-neon-cyan/10 border border-primary/20 p-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Valor Estimado da Produção</span>
                </div>
                <p className="text-4xl sm:text-5xl font-bold mb-1">
                  R$ {((globalStats?.total || 0) * 2000 / 15 * valorMedioPorArroba / 1000000).toFixed(2)}
                  <span className="text-xl text-muted-foreground ml-1">mi</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {(globalStats?.total || 0) * 2000 / 15 | 0} arrobas • R$ {valorMedioPorArroba.toFixed(2)}/@
                </p>
              </div>
            </div>

            {/* Pipeline Visual */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Pipeline de Produção</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Campo */}
                <div className="flex-1 text-center">
                  <div className="h-2 rounded-full bg-primary mb-2" style={{ opacity: globalStats?.campo ? 1 : 0.3 }} />
                  <p className="text-lg font-bold text-primary">{globalStats?.campo || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Campo</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                {/* Pátio */}
                <div className="flex-1 text-center">
                  <div className="h-2 rounded-full bg-neon-orange mb-2" style={{ opacity: globalStats?.patio ? 1 : 0.3 }} />
                  <p className="text-lg font-bold text-neon-orange">{globalStats?.patio || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Pátio</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                {/* Beneficiado */}
                <div className="flex-1 text-center">
                  <div className="h-2 rounded-full bg-neon-cyan mb-2" style={{ opacity: globalStats?.beneficiado ? 1 : 0.3 }} />
                  <p className="text-lg font-bold text-neon-cyan">{globalStats?.beneficiado || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Beneficiado</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-3 rounded-full bg-surface overflow-hidden flex">
                <div className="h-full bg-primary" style={{ width: `${globalStats?.total ? (globalStats.campo / globalStats.total) * 100 : 0}%` }} />
                <div className="h-full bg-neon-orange" style={{ width: `${globalStats?.total ? (globalStats.patio / globalStats.total) * 100 : 0}%` }} />
                <div className="h-full bg-neon-cyan" style={{ width: `${globalStats?.total ? (globalStats.beneficiado / globalStats.total) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {taxaBeneficiamento.toFixed(0)}% processado
              </p>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Produtividade */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-neon-cyan" />
                  <span className="text-xs text-muted-foreground">Produtividade</span>
                </div>
                <p className="text-2xl font-bold">
                  {totaisProdutividade.produtividadeRealMedia > 0
                    ? totaisProdutividade.produtividadeRealMedia.toFixed(0)
                    : totaisProdutividade.produtividadePrevistaMedia.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">@/ha</p>
              </div>

              {/* Peso Total */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-neon-orange" />
                  <span className="text-xs text-muted-foreground">Peso Bruto</span>
                </div>
                <p className="text-2xl font-bold">
                  {totaisCarregamentos.totalPesoToneladas.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">toneladas</p>
              </div>

              {/* Rendimento */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Rendimento</span>
                </div>
                <p className="text-2xl font-bold">
                  {rendimentoCalculado > 0 ? rendimentoCalculado.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">% pluma</p>
              </div>

              {/* Perdas */}
              <button
                onClick={() => setPerdasModalOpen(true)}
                className="glass-card p-4 rounded-xl text-left hover:border-red-500/50 transition-colors border border-transparent"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Perdas</span>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {totalPerdasArrobasHa.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">@/ha</p>
              </button>
            </div>

            {/* Top Talhões + Beneficiamento */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Top 5 Talhões */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-sm">Top Produtividade</span>
                </div>
                <div className="space-y-2">
                  {topTalhoes.slice(0, 5).map((t, i) => (
                    <div key={t.talhao} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          i === 1 ? "bg-gray-400/20 text-gray-400" :
                          i === 2 ? "bg-amber-600/20 text-amber-600" :
                          "bg-surface text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                        <span className="font-medium">{t.talhao}</span>
                      </div>
                      <span className="font-bold text-primary">{t.arrobasPorHa.toFixed(0)} @/ha</span>
                    </div>
                  ))}
                  {topTalhoes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                  )}
                </div>
              </div>

              {/* Beneficiamento */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Factory className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-sm">Beneficiamento</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                    <p className="text-xl font-bold text-purple-400">
                      {totaisLotes.totalPesoPluma > 0 ? (totaisLotes.totalPesoPluma / 1000).toFixed(1) : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">ton pluma</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 text-center">
                    <p className="text-xl font-bold">{totaisFardinhos.totalFardinhos || '-'}</p>
                    <p className="text-xs text-muted-foreground">fardinhos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 text-center">
                    <p className="text-xl font-bold">{totaisLotes.totalLotes || '-'}</p>
                    <p className="text-xs text-muted-foreground">lotes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 text-center">
                    <p className="text-xl font-bold">{pesoMedioPorFardinho > 0 ? pesoMedioPorFardinho.toFixed(0) : '-'}</p>
                    <p className="text-xs text-muted-foreground">kg/fardinho</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB: TALHÕES ==================== */}
          <TabsContent value="talhoes" className="space-y-4 mt-4">
            {/* Filtros */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar talhão..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("h-11 w-11 rounded-xl", showFilters && "border-primary")}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="flex gap-2 flex-wrap">
                {(["all", "campo", "patio", "beneficiado"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      statusFilter === status
                        ? "bg-primary text-black"
                        : "bg-surface hover:bg-surface-hover"
                    )}
                  >
                    {status === "all" ? "Todos" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Grid de Talhões */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTalhoes.map((t) => (
                <button
                  key={t.talhao}
                  onClick={() => setSelectedTalhaoDetail(t.talhao)}
                  className="glass-card p-4 rounded-xl text-left hover:border-primary/50 transition-all border border-transparent"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="font-bold text-primary">{t.talhao}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{t.talhao}</p>
                        <p className="text-xs text-muted-foreground">{t.hectares.toFixed(1)} ha</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Produtividade */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-surface/50">
                      <p className="text-xs text-muted-foreground">Prevista</p>
                      <p className="text-lg font-bold">{t.produtividadePrevistoArrobas.toFixed(0)} @/ha</p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      t.temDadosReais ? "bg-neon-cyan/10" : "bg-surface/50"
                    )}>
                      <p className="text-xs text-muted-foreground">Real</p>
                      <p className={cn(
                        "text-lg font-bold",
                        t.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                      )}>
                        {t.temDadosReais ? `${t.produtividadeRealArrobas.toFixed(0)} @/ha` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Status bars */}
                  <div className="flex gap-1 h-2">
                    <div
                      className="rounded-full bg-primary"
                      style={{ width: `${t.totalFardos > 0 ? (t.campo / t.totalFardos) * 100 : 0}%` }}
                    />
                    <div
                      className="rounded-full bg-neon-orange"
                      style={{ width: `${t.totalFardos > 0 ? (t.patio / t.totalFardos) * 100 : 0}%` }}
                    />
                    <div
                      className="rounded-full bg-neon-cyan"
                      style={{ width: `${t.totalFardos > 0 ? (t.beneficiado / t.totalFardos) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.totalFardos} fardos</p>
                </button>
              ))}
            </div>

            {filteredTalhoes.length === 0 && (
              <div className="text-center py-12">
                <Wheat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum talhão encontrado</p>
              </div>
            )}
          </TabsContent>

          {/* ==================== TAB: FLUXO ==================== */}
          <TabsContent value="fluxo" className="space-y-4 mt-4">
            {/* KPIs de Carregamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-4 rounded-xl">
                <Truck className="w-5 h-5 text-neon-orange mb-2" />
                <p className="text-2xl font-bold">{totaisCarregamentos.totalCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Carregamentos</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <Scale className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-bold">{totaisCarregamentos.totalPesoToneladas.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Toneladas</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <MapPin className="w-5 h-5 text-neon-cyan mb-2" />
                <p className="text-2xl font-bold">{totaisCarregamentos.talhoesComCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Talhões</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <Box className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-2xl font-bold">{Math.round(totaisCarregamentos.mediaPesoPorCarregamento / 1000).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">t/carregamento</p>
              </div>
            </div>

            {/* Lista de Carregamentos por Talhão */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <h3 className="font-semibold">Carregamentos por Talhão</h3>
              </div>
              <div className="divide-y divide-border/20">
                {pesoBrutoTotais
                  .sort((a, b) => b.pesoBrutoTotal - a.pesoBrutoTotal)
                  .map((item, index) => (
                    <div key={item.talhao} className="flex items-center justify-between p-4 hover:bg-surface/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                          index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          index === 1 ? "bg-gray-400/20 text-gray-400" :
                          index === 2 ? "bg-amber-600/20 text-amber-600" :
                          "bg-surface text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Talhão {item.talhao}</p>
                          <p className="text-xs text-muted-foreground">{item.quantidadeCarregamentos} carregamento(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{(item.pesoBrutoTotal / 1000).toFixed(1)} t</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidadeCarregamentos > 0 ? Math.round(item.pesoBrutoTotal / item.quantidadeCarregamentos / 1000).toFixed(1) : 0} t/carreg
                        </p>
                      </div>
                    </div>
                  ))}
                {pesoBrutoTotais.length === 0 && (
                  <div className="p-8 text-center">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Nenhum carregamento registrado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Beneficiamento Detalhado */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/30 bg-purple-500/10">
                <div className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold">Beneficiamento</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{(totaisLotes.totalPesoPluma / 1000).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">ton pluma</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totaisFardinhos.totalFardinhos}</p>
                    <p className="text-xs text-muted-foreground">fardinhos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(1)}%` : '-'}</p>
                    <p className="text-xs text-muted-foreground">rendimento</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{pesoMedioPorFardinho > 0 ? pesoMedioPorFardinho.toFixed(0) : '-'}</p>
                    <p className="text-xs text-muted-foreground">kg/fardinho</p>
                  </div>
                </div>

                {totaisCarregamentos.totalPesoKg > 0 && totaisLotes.totalPesoPluma > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Conversão Bruto → Pluma</span>
                      <span className="font-medium">{((totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, (totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB: ANALYTICS ==================== */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            {/* Gráfico de Distribuição */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="font-semibold mb-4">Distribuição por Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução de Fardos */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="font-semibold mb-4">Fardos Criados (14 dias)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#00FF88"
                      fill="#00FF88"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparativo de Produtividade */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="font-semibold mb-4">Produtividade por Talhão (@/ha)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={produtividadeComparativa.slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis
                      dataKey="talhao"
                      type="category"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      width={50}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="produtividadePrevistoArrobas" fill="#00FF88" name="Prevista" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="produtividadeRealArrobas" fill="#00D4FF" name="Real" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== MODAL: DETALHE TALHÃO ==================== */}
        <Dialog open={!!selectedTalhaoDetail} onOpenChange={() => setSelectedTalhaoDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-primary" />
                Talhão {selectedTalhaoData?.talhao}
              </DialogTitle>
            </DialogHeader>
            {selectedTalhaoData && (
              <div className="space-y-4">
                {/* Info básica */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface/50">
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-lg font-bold">{selectedTalhaoData.hectares.toFixed(1)} ha</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50">
                    <p className="text-xs text-muted-foreground">Total Fardos</p>
                    <p className="text-lg font-bold">{selectedTalhaoData.totalFardos}</p>
                  </div>
                </div>

                {/* Produtividade */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-neon-cyan/10">
                  <p className="text-sm font-medium mb-3">Produtividade</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Prevista</p>
                      <p className="text-2xl font-bold">{selectedTalhaoData.produtividadePrevistoArrobas.toFixed(0)} @/ha</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Real</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedTalhaoData.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                      )}>
                        {selectedTalhaoData.temDadosReais
                          ? `${selectedTalhaoData.produtividadeRealArrobas.toFixed(0)} @/ha`
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {selectedTalhaoData.temDadosReais && (
                    <div className={cn(
                      "mt-3 flex items-center gap-1 text-sm font-medium",
                      selectedTalhaoData.diferencaPercentual >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {selectedTalhaoData.diferencaPercentual >= 0
                        ? <ArrowUpRight className="w-4 h-4" />
                        : <ArrowDownRight className="w-4 h-4" />}
                      {selectedTalhaoData.diferencaPercentual >= 0 ? '+' : ''}
                      {selectedTalhaoData.diferencaPercentual.toFixed(1)}% vs prevista
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm font-medium mb-2">Status dos Fardos</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg bg-primary/10 text-center">
                      <p className="text-lg font-bold text-primary">{selectedTalhaoData.campo}</p>
                      <p className="text-xs text-muted-foreground">Campo</p>
                    </div>
                    <div className="p-3 rounded-lg bg-neon-orange/10 text-center">
                      <p className="text-lg font-bold text-neon-orange">{selectedTalhaoData.patio}</p>
                      <p className="text-xs text-muted-foreground">Pátio</p>
                    </div>
                    <div className="p-3 rounded-lg bg-neon-cyan/10 text-center">
                      <p className="text-lg font-bold text-neon-cyan">{selectedTalhaoData.beneficiado}</p>
                      <p className="text-xs text-muted-foreground">Beneficiado</p>
                    </div>
                  </div>
                </div>

                {/* Carregamentos */}
                {selectedTalhaoData.qtdCarregamentos > 0 && (
                  <div className="p-3 rounded-lg bg-surface/50">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Carregamentos</span>
                      <span className="font-medium">{selectedTalhaoData.qtdCarregamentos}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Peso Bruto</span>
                      <span className="font-medium">{(selectedTalhaoData.pesoBrutoTotal / 1000).toFixed(1)} t</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Peso Médio/Fardo</span>
                      <span className="font-medium">{selectedTalhaoData.pesoMedioRealFardo.toFixed(0)} kg</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setSelectedTalhaoDetail(null);
                    setLocation(`/talhoes/${selectedTalhaoData.talhao}`);
                  }}
                  className="w-full"
                >
                  Ver Página do Talhão
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ==================== MODAL: PERDAS ==================== */}
        <Dialog open={perdasModalOpen} onOpenChange={setPerdasModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Perdas da Safra
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-red-500/10">
                  <p className="text-xs text-muted-foreground mb-1">Total Perdas</p>
                  <p className="text-2xl font-bold text-red-500">{totalPerdasArrobasHa.toFixed(1)} @/ha</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10">
                  <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                  <p className="text-2xl font-bold text-red-500">
                    R$ {(totalPerdasValorBRL / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>

              {/* Por talhão */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {perdasPorTalhaoComValor.map((p) => (
                  <div key={p.talhao} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                    <div>
                      <p className="font-medium">{p.talhao}</p>
                      <p className="text-xs text-muted-foreground">{p.quantidadeRegistros} ocorrência(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">{p.arrobasHa.toFixed(1)} @/ha</p>
                      <p className="text-xs text-muted-foreground">R$ {(p.valorBRL / 1000).toFixed(1)}k</p>
                    </div>
                  </div>
                ))}
                {perdasPorTalhaoComValor.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500/50" />
                    <p className="text-muted-foreground">Nenhuma perda registrada</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageContent>
    </Page>
  );
}
