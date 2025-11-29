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
  LineChart as RechartsLineChart,
  Line,
  ComposedChart,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
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
import { InteractiveTalhaoMap } from "@/components/interactive-talhao-map";

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

      // Produtividade em fardos/ha
      const fardosPorHa = hectares > 0 ? totalFardos / hectares : 0;

      return {
        talhao: talhaoInfo.nome,
        hectares,
        totalFardos,
        fardosPorHa,
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
    const totalFardosGeral = talhoesComFardos.reduce((acc, t) => acc + t.totalFardos, 0);

    const pesoMedioRealGlobal = totalFardosComDados > 0 ? totalPesoBruto / totalFardosComDados : 0;

    // Média de fardos por hectare
    const fardosPorHaMedia = totalHectaresComFardos > 0 ? totalFardosGeral / totalHectaresComFardos : 0;

    return {
      produtividadePrevistaMedia: totalHectaresComFardos > 0 ? (totalPesoEstimado / totalHectaresComFardos) / 15 : 0,
      produtividadeRealMedia: totalHectaresComDados > 0 ? (totalPesoBruto / totalHectaresComDados) / 15 : 0,
      fardosPorHaMedia,
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

  // ==================== DADOS PARA ANALYTICS ====================

  // 1. Distribuição de hectares por talhão (Treemap)
  const hectaresDistribution = useMemo(() => {
    return talhoesSafra.map(t => ({
      name: t.nome,
      size: parseFloat(t.hectares.replace(",", ".")) || 0,
      fill: `hsl(${Math.random() * 120 + 100}, 70%, 50%)`,
    })).sort((a, b) => b.size - a.size);
  }, [talhoesSafra]);

  // 2. Perdas por motivo (agregado)
  const perdasPorMotivo = useMemo(() => {
    const motivos: Record<string, number> = {};
    perdasDetalhadas.forEach(p => {
      const motivo = p.motivo || 'Não especificado';
      motivos[motivo] = (motivos[motivo] || 0) + (p.quantidade || 0);
    });
    return Object.entries(motivos)
      .map(([name, value]) => ({ name, value, fill: name === 'Colheita' ? '#FF6B6B' : name === 'Clima' ? '#4ECDC4' : name === 'Pragas' ? '#FFE66D' : '#95E1D3' }))
      .sort((a, b) => b.value - a.value);
  }, [perdasDetalhadas]);

  // 3. Evolução acumulada de fardos
  const evolucaoAcumulada = useMemo(() => {
    let acumulado = 0;
    return evolutionData.map(d => {
      acumulado += d.total;
      return { ...d, acumulado };
    });
  }, [evolutionData]);

  // 4. Comparativo Campo vs Pátio vs Beneficiado por talhão
  const statusPorTalhao = useMemo(() => {
    return talhaoStats
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(s => ({
        talhao: s.talhao,
        campo: s.campo,
        patio: s.patio,
        beneficiado: s.beneficiado,
        total: s.total,
      }));
  }, [talhaoStats]);

  // 5. Radar de performance dos top talhões
  const radarData = useMemo(() => {
    const top5 = produtividadeComparativa
      .filter(t => t.totalFardos > 0)
      .sort((a, b) => b.produtividadePrevistoArrobas - a.produtividadePrevistoArrobas)
      .slice(0, 5);

    const maxProdutividade = Math.max(...top5.map(t => t.produtividadePrevistoArrobas), 1);
    const maxFardos = Math.max(...top5.map(t => t.totalFardos), 1);
    const maxHectares = Math.max(...top5.map(t => t.hectares), 1);
    const maxPeso = Math.max(...top5.map(t => t.pesoBrutoTotal), 1);

    return top5.map(t => ({
      talhao: t.talhao,
      produtividade: (t.produtividadePrevistoArrobas / maxProdutividade) * 100,
      fardos: (t.totalFardos / maxFardos) * 100,
      area: (t.hectares / maxHectares) * 100,
      peso: (t.pesoBrutoTotal / maxPeso) * 100,
      eficiencia: t.temDadosReais ? Math.min(100, (t.produtividadeRealArrobas / t.produtividadePrevistoArrobas) * 100) : 0,
    }));
  }, [produtividadeComparativa]);

  // 6. Funnel de processamento
  const funnelData = useMemo(() => {
    const totalFardos = globalStats?.total || 0;
    const noCampo = globalStats?.campo || 0;
    const noPatio = globalStats?.patio || 0;
    const beneficiado = globalStats?.beneficiado || 0;

    return [
      { name: 'Total Produzido', value: totalFardos, fill: '#8884d8' },
      { name: 'No Campo', value: noCampo, fill: '#00FF88' },
      { name: 'No Pátio', value: noPatio, fill: '#FF9500' },
      { name: 'Beneficiado', value: beneficiado, fill: '#00D4FF' },
    ];
  }, [globalStats]);

  // 7. Scatter plot: Hectares vs Produtividade
  const scatterData = useMemo(() => {
    return produtividadeComparativa
      .filter(t => t.totalFardos > 0)
      .map(t => ({
        x: t.hectares,
        y: t.produtividadePrevistoArrobas,
        z: t.totalFardos,
        talhao: t.talhao,
      }));
  }, [produtividadeComparativa]);

  // 8. Peso médio por fardo ao longo do tempo
  const pesoMedioPorDia = useMemo(() => {
    const dias: Record<string, { date: string; pesoTotal: number; count: number }> = {};
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      dias[key] = { date: label, pesoTotal: 0, count: 0 };
    }

    allBales
      .filter(b => new Date(b.createdAt) >= fourteenDaysAgo)
      .forEach(bale => {
        const key = new Date(bale.createdAt).toISOString().split('T')[0];
        if (dias[key]) {
          dias[key].pesoTotal += 2000; // Peso estimado por fardo
          dias[key].count++;
        }
      });

    return Object.values(dias).map(d => ({
      date: d.date,
      pesoMedio: d.count > 0 ? Math.round(d.pesoTotal / d.count) : 0,
      quantidade: d.count,
    }));
  }, [allBales]);

  // 9. Rendimento por lote
  const rendimentoPorLote = useMemo(() => {
    return lotes
      .slice(-10)
      .map((lote, index) => ({
        lote: `L${index + 1}`,
        pesoPluma: parseFloat(lote.pesoPluma) || 0,
        fardinhos: lote.qtdFardinhos || 0,
      }));
  }, [lotes]);

  // 10. Distribuição de status (Radial)
  const radialStatusData = useMemo(() => {
    const total = globalStats?.total || 1;
    return [
      { name: 'Beneficiado', value: ((globalStats?.beneficiado || 0) / total) * 100, fill: '#00D4FF' },
      { name: 'Pátio', value: ((globalStats?.patio || 0) / total) * 100, fill: '#FF9500' },
      { name: 'Campo', value: ((globalStats?.campo || 0) / total) * 100, fill: '#00FF88' },
    ];
  }, [globalStats]);

  // 11. Carregamentos por período
  const carregamentosPorTalhao = useMemo(() => {
    return pesoBrutoTotais
      .sort((a, b) => b.pesoBrutoTotal - a.pesoBrutoTotal)
      .slice(0, 10)
      .map(p => ({
        talhao: p.talhao,
        peso: p.pesoBrutoTotal / 1000, // em toneladas
        carregamentos: p.quantidadeCarregamentos,
        mediaPorCarreg: p.quantidadeCarregamentos > 0 ? (p.pesoBrutoTotal / p.quantidadeCarregamentos) / 1000 : 0,
      }));
  }, [pesoBrutoTotais]);

  // 12. Comparativo previsto vs real
  const comparativoProdutividade = useMemo(() => {
    return produtividadeComparativa
      .filter(t => t.temDadosReais && t.produtividadePrevistoArrobas > 0)
      .map(t => ({
        talhao: t.talhao,
        previsto: t.produtividadePrevistoArrobas,
        real: t.produtividadeRealArrobas,
        diferenca: t.diferencaPercentual,
      }))
      .sort((a, b) => b.diferenca - a.diferenca)
      .slice(0, 8);
  }, [produtividadeComparativa]);

  // 13. Perdas acumuladas por talhão
  const perdasAcumuladas = useMemo(() => {
    let acumulado = 0;
    return perdasPorTalhaoComValor
      .slice(0, 10)
      .map(p => {
        acumulado += p.valorBRL;
        return {
          talhao: p.talhao,
          valor: p.valorBRL / 1000,
          acumulado: acumulado / 1000,
          arrobas: p.arrobasHa,
        };
      });
  }, [perdasPorTalhaoComValor]);

  // 14. Eficiência de beneficiamento por dia da semana
  const eficienciaPorDia = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const contagem: Record<number, { total: number; beneficiado: number }> = {};

    diasSemana.forEach((_, i) => {
      contagem[i] = { total: 0, beneficiado: 0 };
    });

    allBales.forEach(bale => {
      const dia = new Date(bale.createdAt).getDay();
      contagem[dia].total++;
      if (bale.status === 'beneficiado') {
        contagem[dia].beneficiado++;
      }
    });

    return diasSemana.map((dia, i) => ({
      dia,
      total: contagem[i].total,
      beneficiado: contagem[i].beneficiado,
      taxa: contagem[i].total > 0 ? (contagem[i].beneficiado / contagem[i].total) * 100 : 0,
    }));
  }, [allBales]);

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
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-1 rounded-xl glass-card p-1 h-auto">
            <TabsTrigger
              value="geral"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-black"
            >
              <LayoutDashboard className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="talhoes"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
            >
              <Wheat className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Talhões</span>
            </TabsTrigger>
            <TabsTrigger
              value="fluxo"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Truck className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Fluxo</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <LineChart className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger
              value="mapa"
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <MapPin className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB: GERAL ==================== */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            {/* Hero Stats - Números Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total de Fardos */}
              <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10">Total</span>
                </div>
                <p className="text-3xl font-bold">{globalStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">fardos produzidos</p>
              </div>

              {/* Total de Arrobas */}
              <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <Scale className="w-5 h-5 text-cyan-500" />
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-cyan-500/10">Peso</span>
                </div>
                <p className="text-3xl font-bold">{((globalStats?.total || 0) * 2000 / 15 / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">arrobas estimadas</p>
              </div>

              {/* Área Total */}
              <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-neon-orange/10 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-orange-500/10">Área</span>
                </div>
                <p className="text-3xl font-bold">{totalHectares.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">hectares</p>
              </div>

              {/* Talhões Ativos */}
              <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <Wheat className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-purple-500/10">Talhões</span>
                </div>
                <p className="text-3xl font-bold">{talhoesSafra.length}</p>
                <p className="text-xs text-muted-foreground">ativos na safra</p>
              </div>
            </div>

            {/* Pipeline de Processamento - Redesenhado */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="font-bold">Fluxo de Produção</span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  taxaBeneficiamento >= 75 ? "bg-green-500/20 text-green-500" :
                  taxaBeneficiamento >= 50 ? "bg-yellow-500/20 text-yellow-500" :
                  taxaBeneficiamento >= 25 ? "bg-orange-500/20 text-orange-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {taxaBeneficiamento.toFixed(0)}% processado
                </span>
              </div>

              {/* Pipeline Visual Melhorado */}
              <div className="relative">
                {/* Linha de conexão */}
                <div className="absolute top-8 left-[16.66%] right-[16.66%] h-0.5 bg-border/50" />

                <div className="grid grid-cols-3 gap-4 relative">
                  {/* Campo */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative z-10",
                      "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30"
                    )}>
                      <Package className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{globalStats?.campo || 0}</p>
                    <p className="text-xs text-muted-foreground">No Campo</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {globalStats?.total ? ((globalStats.campo / globalStats.total) * 100).toFixed(0) : 0}%
                    </p>
                  </div>

                  {/* Pátio */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative z-10",
                      "bg-gradient-to-br from-neon-orange/20 to-neon-orange/5 border-2 border-orange-500/30"
                    )}>
                      <Truck className="w-7 h-7 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-orange-500">{globalStats?.patio || 0}</p>
                    <p className="text-xs text-muted-foreground">No Pátio</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {globalStats?.total ? ((globalStats.patio / globalStats.total) * 100).toFixed(0) : 0}%
                    </p>
                  </div>

                  {/* Beneficiado */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-2 relative z-10",
                      "bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 border-2 border-cyan-500/30"
                    )}>
                      <CheckCircle className="w-7 h-7 text-cyan-500" />
                    </div>
                    <p className="text-2xl font-bold text-cyan-500">{globalStats?.beneficiado || 0}</p>
                    <p className="text-xs text-muted-foreground">Beneficiado</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {globalStats?.total ? ((globalStats.beneficiado / globalStats.total) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="mt-5 h-2.5 rounded-full bg-surface/80 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                  style={{ width: `${globalStats?.total ? (globalStats.campo / globalStats.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-neon-orange to-neon-orange/80 transition-all duration-500"
                  style={{ width: `${globalStats?.total ? (globalStats.patio / globalStats.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/80 transition-all duration-500"
                  style={{ width: `${globalStats?.total ? (globalStats.beneficiado / globalStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Métricas de Performance */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Produtividade Média em @/ha */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-medium text-muted-foreground">Produtividade</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">
                    {totaisProdutividade.produtividadeRealMedia > 0
                      ? totaisProdutividade.produtividadeRealMedia.toFixed(0)
                      : totaisProdutividade.produtividadePrevistaMedia.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">@/ha</p>
                </div>
                {totaisProdutividade.produtividadeRealMedia > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prevista: {totaisProdutividade.produtividadePrevistaMedia.toFixed(0)} @/ha
                  </p>
                )}
              </div>

              {/* Produtividade em Fardos/ha */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Fardos/ha</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">
                    {totaisProdutividade.fardosPorHaMedia.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">fardos</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  por hectare
                </p>
              </div>

              {/* Rendimento */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-muted-foreground">Rendimento</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">
                    {rendimentoCalculado > 0 ? rendimentoCalculado.toFixed(1) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">%</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">pluma/peso bruto</p>
              </div>

              {/* Carregamentos */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Carregamentos</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">{totaisCarregamentos.totalCarregamentos}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totaisCarregamentos.totalPesoToneladas.toFixed(0)} toneladas
                </p>
              </div>

              {/* Perdas */}
              <button
                onClick={() => setPerdasModalOpen(true)}
                className="glass-card p-4 rounded-xl text-left hover:border-red-500/30 transition-all border border-transparent group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-muted-foreground">Perdas</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-red-500">{totalPerdasArrobasHa.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">@/ha</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {(totalPerdasValorBRL / 1000).toFixed(0)}k estimado
                </p>
              </button>
            </div>

            {/* Grid: Ranking + Beneficiamento */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Top Talhões */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold text-sm">Ranking de Produtividade</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{topTalhoes.length} talhões</span>
                </div>
                <div className="p-3">
                  <div className="space-y-1.5">
                    {topTalhoes.slice(0, 5).map((t, i) => (
                      <button
                        key={t.talhao}
                        onClick={() => setSelectedTalhaoDetail(t.talhao)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface/30 hover:bg-surface/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                            i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                            i === 1 ? "bg-gray-400/20 text-gray-400" :
                            i === 2 ? "bg-amber-600/20 text-amber-600" :
                            "bg-surface text-muted-foreground"
                          )}>
                            {i + 1}
                          </span>
                          <div className="text-left">
                            <span className="font-medium">Talhão {t.talhao}</span>
                            <p className="text-xs text-muted-foreground">{t.hectares.toFixed(0)} ha</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-primary">{t.arrobasPorHa.toFixed(0)}</span>
                          <span className="text-xs text-muted-foreground ml-1">@/ha</span>
                        </div>
                      </button>
                    ))}
                    {topTalhoes.length === 0 && (
                      <div className="text-center py-8">
                        <Wheat className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Sem dados de produtividade</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Beneficiamento */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-sm">Beneficiamento</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{totaisLotes.totalLotes} lotes</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/20">
                      <p className="text-2xl font-bold text-purple-400">
                        {totaisLotes.totalPesoPluma > 0 ? (totaisLotes.totalPesoPluma / 1000).toFixed(1) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">toneladas pluma</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface/50">
                      <p className="text-2xl font-bold">{totaisFardinhos.totalFardinhos || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">fardinhos produzidos</p>
                    </div>
                  </div>

                  {/* Métricas adicionais */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/30">
                      <span className="text-xs text-muted-foreground">Peso médio/fardinho</span>
                      <span className="font-medium">{pesoMedioPorFardinho > 0 ? `${pesoMedioPorFardinho.toFixed(0)} kg` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/30">
                      <span className="text-xs text-muted-foreground">Média de pluma/lote</span>
                      <span className="font-medium">{totaisLotes.totalLotes > 0 ? `${(totaisLotes.totalPesoPluma / totaisLotes.totalLotes).toFixed(0)} kg` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/30">
                      <span className="text-xs text-muted-foreground">Talhões com dados reais</span>
                      <span className="font-medium">{totaisProdutividade.talhoesComDados} de {totaisProdutividade.totalTalhoes}</span>
                    </div>
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
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-surface/50">
                      <p className="text-xs text-muted-foreground">Prevista</p>
                      <p className="text-lg font-bold">{t.produtividadePrevistoArrobas.toFixed(0)} @/ha</p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      t.temDadosReais ? "bg-cyan-500/10" : "bg-surface/50"
                    )}>
                      <p className="text-xs text-muted-foreground">Real</p>
                      <p className={cn(
                        "text-lg font-bold",
                        t.temDadosReais ? "text-cyan-500" : "text-muted-foreground"
                      )}>
                        {t.temDadosReais ? `${t.produtividadeRealArrobas.toFixed(0)} @/ha` : '-'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <p className="text-xs text-muted-foreground">Fardos/ha</p>
                      <p className="text-lg font-bold text-green-500">{t.fardosPorHa.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Status bars */}
                  <div className="flex gap-1 h-2">
                    <div
                      className="rounded-full bg-primary"
                      style={{ width: `${t.totalFardos > 0 ? (t.campo / t.totalFardos) * 100 : 0}%` }}
                    />
                    <div
                      className="rounded-full bg-orange-500"
                      style={{ width: `${t.totalFardos > 0 ? (t.patio / t.totalFardos) * 100 : 0}%` }}
                    />
                    <div
                      className="rounded-full bg-cyan-500"
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
                <Truck className="w-5 h-5 text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{totaisCarregamentos.totalCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Carregamentos</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <Scale className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-bold">{totaisCarregamentos.totalPesoToneladas.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Toneladas</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <MapPin className="w-5 h-5 text-cyan-500 mb-2" />
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
            {/* Header Analytics */}
            <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-purple-500/20 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Central de Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    {talhaoStats.length} talhões analisados • {globalStats?.total || 0} fardos
                  </p>
                </div>
              </div>
            </div>

            {/* ROW 1: Distribuição + Radial Status */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Distribuição por Status - Pie */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Distribuição por Status</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
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

              {/* Radial Progress Status */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  <h3 className="font-semibold text-sm">Taxa de Processamento</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="90%"
                      data={radialStatusData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        background
                      />
                      <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROW 2: Evolução Diária + Acumulado */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Evolução de Fardos (14 dias)</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolucaoAcumulada}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" fill="#00FF88" name="Diário" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#00D4FF" strokeWidth={2} name="Acumulado" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 3: Status por Talhão - Stacked Bar */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Status por Talhão (Top 8)</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusPorTalhao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="talhao"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="campo" stackId="a" fill="#00FF88" name="Campo" />
                    <Bar dataKey="patio" stackId="a" fill="#FF9500" name="Pátio" />
                    <Bar dataKey="beneficiado" stackId="a" fill="#00D4FF" name="Beneficiado" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 4: Produtividade Comparativa */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Comparativo Previsto vs Real */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-cyan-500" />
                  <h3 className="font-semibold text-sm">Previsto vs Real (@/ha)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparativoProdutividade}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis
                        dataKey="talhao"
                        type="category"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        width={40}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="previsto" fill="#00FF88" name="Prevista" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="real" fill="#00D4FF" name="Real" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scatter: Hectares vs Produtividade */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-semibold text-sm">Área vs Produtividade</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="x"
                        name="Hectares"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        label={{ value: 'Hectares', position: 'bottom', fontSize: 10 }}
                      />
                      <YAxis
                        dataKey="y"
                        name="@/ha"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        label={{ value: '@/ha', angle: -90, position: 'left', fontSize: 10 }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [value.toFixed(1), name]}
                        labelFormatter={(_, payload) => payload[0]?.payload?.talhao || ''}
                      />
                      <Scatter data={scatterData} fill="#00FF88">
                        {scatterData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${120 + index * 20}, 70%, 50%)`} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROW 5: Carregamentos + Peso por Talhão */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Carregamentos por Talhão (toneladas)</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={carregamentosPorTalhao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="talhao"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="peso" fill="#FF9500" name="Peso (t)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="carregamentos" stroke="#00D4FF" strokeWidth={2} name="Carregamentos" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 6: Produtividade por Talhão (todos) */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Ranking de Produtividade (@/ha)</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={produtividadeComparativa.slice(0, 12)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis
                      dataKey="talhao"
                      type="category"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      width={40}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="produtividadePrevistoArrobas" fill="#00FF88" name="@/ha" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="produtividadePrevistoArrobas" position="right" formatter={(v: number) => `${v.toFixed(0)}`} fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 7: Perdas - Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Perdas por Motivo */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-sm">Perdas por Motivo</h3>
                </div>
                <div className="h-56">
                  {perdasPorMotivo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={perdasPorMotivo}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {perdasPorMotivo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
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
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                        <p className="text-sm">Sem perdas registradas</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Perdas Acumuladas por Talhão */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-sm">Perdas Acumuladas (R$ mil)</h3>
                </div>
                <div className="h-56">
                  {perdasAcumuladas.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={perdasAcumuladas}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="talhao"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="valor" fill="#FF6B6B" name="Valor (R$ mil)" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="acumulado" stroke="#FF9500" strokeWidth={2} name="Acumulado" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                        <p className="text-sm">Sem perdas registradas</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 8: Eficiência por Dia da Semana */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm">Produção por Dia da Semana</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eficienciaPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" fill="#00FF88" name="Total Fardos" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="beneficiado" fill="#00D4FF" name="Beneficiados" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="#FF9500" strokeWidth={2} name="Taxa %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROW 9: Beneficiamento - Rendimento por Lote */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Rendimento por Lote */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Factory className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-sm">Peso Pluma por Lote (kg)</h3>
                </div>
                <div className="h-56">
                  {rendimentoPorLote.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rendimentoPorLote}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="lote"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pesoPluma"
                          stroke="#9333EA"
                          fill="#9333EA"
                          fillOpacity={0.3}
                          name="Peso Pluma"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Box className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm">Sem lotes processados</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantidade de Fardos por Dia */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Fardos/Dia (14 dias)</h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={pesoMedioPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="quantidade"
                        stroke="#00FF88"
                        strokeWidth={2}
                        dot={{ fill: '#00FF88', r: 4 }}
                        name="Fardos"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROW 10: Resumo Numérico Final */}
            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-surface to-surface-hover">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Resumo Estatístico</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <p className="text-xl font-bold text-primary">{globalStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Fardos</p>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 text-center">
                  <p className="text-xl font-bold text-cyan-500">{taxaBeneficiamento.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Beneficiado</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                  <p className="text-xl font-bold text-orange-500">{totaisCarregamentos.totalCarregamentos}</p>
                  <p className="text-xs text-muted-foreground">Carregamentos</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                  <p className="text-xl font-bold text-purple-400">{totaisLotes.totalLotes}</p>
                  <p className="text-xs text-muted-foreground">Lotes</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <p className="text-xl font-bold text-yellow-500">
                    {totaisProdutividade.produtividadePrevistaMedia.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">@/ha Média</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-center">
                  <p className="text-xl font-bold text-red-500">{totalPerdasArrobasHa.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">@/ha Perdas</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB: MAPA ==================== */}
          <TabsContent value="mapa" className="space-y-4 mt-4">
            {/* Mapa Interativo Real */}
            <InteractiveTalhaoMap
              onTalhaoClick={(talhao) => setSelectedTalhaoDetail(talhao)}
            />

            {/* Resumo por Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{globalStats?.campo || 0}</p>
                <p className="text-xs text-muted-foreground">No Campo</p>
              </div>
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-orange-500">{globalStats?.patio || 0}</p>
                <p className="text-xs text-muted-foreground">No Pátio</p>
              </div>
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                </div>
                <p className="text-2xl font-bold text-cyan-500">{globalStats?.beneficiado || 0}</p>
                <p className="text-xs text-muted-foreground">Beneficiado</p>
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-surface/50">
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-lg font-bold">{selectedTalhaoData.hectares.toFixed(1)} ha</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50">
                    <p className="text-xs text-muted-foreground">Total Fardos</p>
                    <p className="text-lg font-bold">{selectedTalhaoData.totalFardos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <p className="text-xs text-muted-foreground">Fardos/ha</p>
                    <p className="text-lg font-bold text-green-500">{selectedTalhaoData.fardosPorHa.toFixed(1)}</p>
                  </div>
                </div>

                {/* Produtividade */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-cyan-500/10">
                  <p className="text-sm font-medium mb-3">Produtividade em @/ha</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Prevista</p>
                      <p className="text-2xl font-bold">{selectedTalhaoData.produtividadePrevistoArrobas.toFixed(0)} @/ha</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Real</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedTalhaoData.temDadosReais ? "text-cyan-500" : "text-muted-foreground"
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
                    <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                      <p className="text-lg font-bold text-orange-500">{selectedTalhaoData.patio}</p>
                      <p className="text-xs text-muted-foreground">Pátio</p>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-500/10 text-center">
                      <p className="text-lg font-bold text-cyan-500">{selectedTalhaoData.beneficiado}</p>
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
