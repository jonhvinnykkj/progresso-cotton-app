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
  Calendar,
  Layers,
  Activity,
  MapPin,
  Info,
  Sparkles,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Timer,
  Factory,
  PieChart,
  CalendarDays,
  Award,
  Boxes,
  Percent,
  LayoutDashboard,
  Map,
  LineChart,
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

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

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
    return talhoesSafra.find(t => t.nome === nome);
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
    // Cálculo: (fardos × 2000kg) / hectares / 15kg = arrobas/ha
    const pesoEstimado = selectedTalhaoData.total * 2000;
    const arrobasPorHa = (pesoEstimado / hectares) / 15;
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

  const totalHectares = talhoesSafra.reduce((acc, t) => acc + parseFloat(t.hectares.replace(",", ".")), 0);

  const avgFardosPorHectare = (() => {
    if (!globalStats?.total || totalHectares === 0) return '0.00';
    return (globalStats.total / totalHectares).toFixed(2);
  })();

  const avgArrobasPorHectare = (() => {
    if (!globalStats?.total || totalHectares === 0) return '0.00';
    // Cálculo: (fardos × 2000kg) / hectares / 15kg = arrobas/ha
    const pesoEstimado = globalStats.total * 2000;
    const arrobasPorHa = (pesoEstimado / totalHectares) / 15;
    return arrobasPorHa.toFixed(2);
  })();

  // Calcular dados de produtividade prevista vs real
  const produtividadeComparativa = useMemo(() => {
    const pesoBrutoList = pesoBrutoTotais ?? [];
    return talhoesSafra.map((talhaoInfo) => {
      const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
      const stats = talhaoStats.find((s) => s.talhao === talhaoInfo.nome);

      // Buscar dados dos carregamentos (peso real da algodoeira)
      const pesoBrutoData = pesoBrutoList.find((p) => p.talhao === talhaoInfo.nome);

      const totalFardos = stats?.total || 0;

      // Dados da algodoeira (carregamentos)
      const pesoBrutoTotal = pesoBrutoData?.pesoBrutoTotal || 0;
      const qtdCarregamentos = pesoBrutoData?.quantidadeCarregamentos || 0;

      // Peso médio real do fardo = peso total / quantidade de fardos
      const pesoMedioRealFardo = totalFardos > 0 ? pesoBrutoTotal / totalFardos : 0;

      // Produtividade PREVISTA: estimativa baseada na contagem de fardos
      // Cada fardo tem média ESTIMADA de 2000kg
      const pesoEstimado = totalFardos * 2000; // kg
      const produtividadePrevistoKg = hectares > 0 && totalFardos > 0 ? pesoEstimado / hectares : 0;
      const produtividadePrevistoArrobas = produtividadePrevistoKg / 15; // 1 arroba = ~15kg

      // Produtividade REAL: pesoTotal / hectares / 15
      // pesoMédioFardo = pesoTotal / qtdFardos
      const pesoRealCalculado = pesoBrutoTotal;
      const produtividadeRealKg = hectares > 0 && pesoBrutoTotal > 0
        ? pesoBrutoTotal / hectares
        : 0;
      const produtividadeRealArrobas = produtividadeRealKg / 15; // 1 arroba = ~15kg

      // Diferença: Real vs Prevista (mostra se os fardos estão mais pesados ou leves que a média)
      const diferencaArrobas = produtividadeRealArrobas - produtividadePrevistoArrobas;
      const diferencaPercentual =
        produtividadePrevistoArrobas > 0
          ? ((produtividadeRealArrobas - produtividadePrevistoArrobas) / produtividadePrevistoArrobas) * 100
          : 0;

      // Tem dados reais se tiver peso bruto registrado e fardos
      const temDadosReais = pesoBrutoTotal > 0 && totalFardos > 0;

      return {
        talhao: talhaoInfo.nome,
        hectares,
        totalFardos,
        pesoEstimado,
        pesoBrutoTotal,
        qtdCarregamentos,
        pesoMedioRealFardo, // Peso médio real = pesoTotal / qtdFardos
        pesoRealCalculado, // peso bruto total
        produtividadePrevistoKg,
        produtividadePrevistoArrobas,
        produtividadeRealKg,
        produtividadeRealArrobas,
        diferencaArrobas,
        diferencaPercentual,
        temDadosReais,
      };
    }).filter((t) => t.produtividadePrevistoArrobas > 0 || t.temDadosReais);
  }, [talhaoStats, pesoBrutoTotais, talhoesSafra]);

  // Totalizadores de produtividade
  const totaisProdutividade = useMemo(() => {
    // Talhões com fardos (para calcular prevista)
    const talhoesComFardos = produtividadeComparativa.filter((t) => t.totalFardos > 0);
    // Talhões com peso real registrado (para calcular real)
    const talhoesComDados = produtividadeComparativa.filter((t) => t.temDadosReais);

    const totalHectaresComFardos = talhoesComFardos.reduce((acc, t) => acc + t.hectares, 0);
    const totalHectaresComDados = talhoesComDados.reduce((acc, t) => acc + t.hectares, 0);

    // Total previsto: soma de (fardos * 2000kg) de todos talhões
    const totalPesoEstimado = talhoesComFardos.reduce(
      (acc, t) => acc + t.pesoEstimado,
      0
    );

    // Total peso bruto real de todos os talhões com dados
    const totalPesoBruto = talhoesComDados.reduce((acc, t) => acc + t.pesoBrutoTotal, 0);

    // Total de fardos dos talhões com dados reais
    const totalFardosComDados = talhoesComDados.reduce((acc, t) => acc + t.totalFardos, 0);
    const totalCarregamentos = talhoesComDados.reduce((acc, t) => acc + t.qtdCarregamentos, 0);

    // Peso médio real por fardo (global) = soma peso bruto / soma fardos
    const pesoMedioRealGlobal = totalFardosComDados > 0 ? totalPesoBruto / totalFardosComDados : 0;

    return {
      // Média prevista: peso estimado total / hectares / 15 (@/ha)
      produtividadePrevistaMedia:
        totalHectaresComFardos > 0 ? (totalPesoEstimado / totalHectaresComFardos) / 15 : 0,
      // Média real: peso bruto total / hectares / 15 (@/ha)
      produtividadeRealMedia:
        totalHectaresComDados > 0 ? (totalPesoBruto / totalHectaresComDados) / 15 : 0,
      // Peso médio real por fardo (kg) = pesoBrutoTotal / qtdFardos
      pesoMedioRealGlobal,
      talhoesComDados: talhoesComDados.length,
      talhoesComFardos: talhoesComFardos.length,
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

  // Alias para uso no card de Insights
  const tempoMedioBeneficiamento = tempoMedioProcessamento;

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
  // Cálculo: (fardos × 2000kg) / hectares / 15kg = arrobas/ha
  const topTalhoes = useMemo(() => {
    return talhaoStats
      .map(stat => {
        const talhaoInfo = talhoesSafra.find(t => t.nome === stat.talhao);
        const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
        const pesoEstimado = stat.total * 2000; // 2 toneladas por fardo
        const arrobasPorHa = hectares > 0 ? (pesoEstimado / hectares) / 15 : 0;
        return { ...stat, arrobasPorHa, hectares };
      })
      .sort((a, b) => b.arrobasPorHa - a.arrobasPorHa)
      .slice(0, 5);
  }, [talhaoStats, talhoesSafra]);

  return (
    <Page>
      <PageContent className="max-w-7xl space-y-6">
        {/* ========== HERO HEADER REFORMULADO ========== */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-neon-cyan/5" />

          <div className="relative">
            {/* Header com título e botão voltar - Mobile First */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLocation("/dashboard")}
                  className="rounded-xl border-border/50 hover:border-primary/50 sm:hidden h-10 w-10 flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center shadow-glow">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold truncate">
                    <span className="gradient-text">Estatísticas</span>
                    <span className="gradient-text hidden sm:inline"> da Safra</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                    <span className="truncate">Tempo real • {selectedSafra}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface border border-border/50">
                  <Wheat className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {safraAtiva ? `${safraAtiva.nome}` : "Sem safra"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="rounded-xl border-border/50 hover:border-primary/50 hidden sm:flex"
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
                  <p className="text-3xl sm:text-4xl font-display font-bold text-glow mb-1">
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

              {/* Card 2: Produtividade Rolos */}
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
                    <span className="text-xs text-neon-cyan font-semibold uppercase tracking-wider">@/ha</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Prevista</p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {totaisProdutividade.produtividadePrevistaMedia > 0
                          ? totaisProdutividade.produtividadePrevistaMedia.toFixed(1)
                          : '-'}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase">Real</p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {totaisProdutividade.produtividadeRealMedia > 0
                          ? totaisProdutividade.produtividadeRealMedia.toFixed(1)
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {totaisProdutividade.produtividadePrevistaMedia > 0 && totaisProdutividade.produtividadeRealMedia > 0 && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-semibold",
                      totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                        ? "text-green-500"
                        : "text-red-500"
                    )}>
                      {totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                      {(((totaisProdutividade.produtividadeRealMedia - totaisProdutividade.produtividadePrevistaMedia) / totaisProdutividade.produtividadePrevistaMedia) * 100).toFixed(1)}%
                    </div>
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-border/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase truncate">Peso Est.</p>
                      <p className="text-xs sm:text-sm font-bold text-foreground">2.000 kg</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase truncate">Peso Real</p>
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        {totaisProdutividade.pesoMedioRealGlobal > 0
                          ? `${Math.round(totaisProdutividade.pesoMedioRealGlobal).toLocaleString('pt-BR')} kg`
                          : '-'}
                      </p>
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
                    <span className="text-xs text-neon-orange font-semibold uppercase tracking-wider">Peso Bruto</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-display font-bold mb-1">
                    {totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')}
                    <span className="text-sm sm:text-base text-neon-orange ml-1">kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{totaisCarregamentos.totalCarregamentos} carregamentos</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      <span className="truncate">Média: {Math.round(totaisCarregamentos.mediaPesoPorCarregamento).toLocaleString('pt-BR')} kg/carreg.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Navegação Principal */}
        <Tabs defaultValue="visao-geral" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-6 gap-1.5 rounded-2xl glass-card p-2 h-auto min-w-max sm:min-w-0">
              {/* 1. Visão Geral - Primeiro contato */}
              <TabsTrigger
                value="visao-geral"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-glow hover:bg-primary/10 whitespace-nowrap"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="sm:inline">Geral</span>
              </TabsTrigger>

              {/* 2. Produção - Talhões e produtividade */}
              <TabsTrigger
                value="producao"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-neon-cyan data-[state=active]:text-black data-[state=active]:shadow-glow-cyan hover:bg-neon-cyan/10 whitespace-nowrap"
              >
                <Wheat className="w-4 h-4" />
                <span>Produção</span>
              </TabsTrigger>

              {/* 3. Transporte - Carregamentos */}
              <TabsTrigger
                value="transporte"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-neon-orange data-[state=active]:text-black data-[state=active]:shadow-glow-orange hover:bg-neon-orange/10 whitespace-nowrap"
              >
                <Truck className="w-4 h-4" />
                <span>Transp.</span>
              </TabsTrigger>

              {/* 4. Beneficiamento - Pluma e fardinhos */}
              <TabsTrigger
                value="beneficiamento"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-purple-500 data-[state=active]:text-black data-[state=active]:shadow-lg hover:bg-purple-500/10 whitespace-nowrap"
              >
                <Factory className="w-4 h-4" />
                <span>Benef.</span>
              </TabsTrigger>

              {/* 5. Análises - Gráficos e comparativos */}
              <TabsTrigger
                value="analises"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-accent data-[state=active]:text-black data-[state=active]:shadow-lg hover:bg-accent/10 whitespace-nowrap"
              >
                <LineChart className="w-4 h-4" />
                <span>Análises</span>
              </TabsTrigger>

              {/* 6. Mapa - Visualização espacial */}
              <TabsTrigger
                value="mapa"
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 sm:px-3 py-2.5 text-xs font-semibold transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-lg hover:bg-emerald-500/10 whitespace-nowrap"
              >
                <Map className="w-4 h-4" />
                <span>Mapa</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB: VISÃO GERAL ==================== */}
          <TabsContent value="visao-geral" className="space-y-6 mt-4">
            {/* Resumo Rápido - Cards de Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Status: Campo */}
              <div className="glass-card p-4 rounded-xl border-l-4 border-l-primary">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Campo</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{globalStats?.campo || 0}</p>
              </div>

              {/* Status: Pátio */}
              <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-orange">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-neon-orange/20">
                    <Truck className="w-5 h-5 text-neon-orange" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Pátio</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{globalStats?.patio || 0}</p>
              </div>

              {/* Status: Beneficiado */}
              <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-cyan">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-neon-cyan/20">
                    <CheckCircle className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Beneficiado</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{globalStats?.beneficiado || 0}</p>
              </div>

              {/* Total */}
              <div className="glass-card p-4 rounded-xl border-l-4 border-l-accent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Layers className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                </div>
                <p className="text-3xl font-bold">{globalStats?.total || 0}</p>
              </div>
            </div>

            {/* Card Principal: Produtividade da Safra */}
            <div className="glass-card p-6 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-neon-cyan/20">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Produtividade da Safra {selectedSafra}</h3>
                  <p className="text-sm text-muted-foreground">
                    {totaisProdutividade.talhoesComFardos > 0
                      ? `${totaisProdutividade.talhoesComFardos} talhões com dados • ${totalHectares.toFixed(0)} ha total`
                      : 'Sem dados de carregamentos cadastrados'}
                  </p>
                </div>
              </div>

              {totaisProdutividade.talhoesComFardos > 0 ? (
                <>
                  {/* Produtividade em Rolos (algodão em caroço) */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Rolos (Algodão em Caroço)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">Prevista (Rolos × 2t)</p>
                        <p className="text-3xl font-display font-bold text-foreground">
                          {totaisProdutividade.produtividadePrevistaMedia > 0
                            ? `${totaisProdutividade.produtividadePrevistaMedia.toFixed(1)}`
                            : '-'}
                          <span className="text-base font-normal ml-1">@/ha</span>
                        </p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-xl border",
                        totaisProdutividade.produtividadeRealMedia > 0
                          ? "bg-neon-cyan/10 border-neon-cyan/20"
                          : "bg-surface-hover border-border/30"
                      )}>
                        <p className="text-sm text-muted-foreground mb-1">Real (Algodoeira)</p>
                        <p className={cn(
                          "text-3xl font-bold",
                          totaisProdutividade.produtividadeRealMedia > 0 ? "text-neon-cyan" : "text-muted-foreground"
                        )}>
                          {totaisProdutividade.produtividadeRealMedia > 0
                            ? `${totaisProdutividade.produtividadeRealMedia.toFixed(1)}`
                            : '-'}
                          <span className="text-base font-normal ml-1">@/ha</span>
                        </p>
                        {totaisProdutividade.produtividadeRealMedia === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Aguardando pesagem</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Produtividade em Pluma (fardinhos) - aplicando rendimento ~40% */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Pluma / Fardinhos (Rendimento {rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(1)}%` : '~40%'})</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm text-muted-foreground mb-1">Prevista (Pluma)</p>
                        <p className="text-3xl font-bold text-purple-500">
                          {totaisProdutividade.produtividadePrevistaMedia > 0
                            ? `${(totaisProdutividade.produtividadePrevistaMedia * (rendimentoCalculado > 0 ? rendimentoCalculado : 40) / 100).toFixed(1)}`
                            : '-'}
                          <span className="text-base font-normal ml-1">@/ha</span>
                        </p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-xl border",
                        totaisProdutividade.produtividadeRealMedia > 0 && rendimentoCalculado > 0
                          ? "bg-accent/10 border-accent/20"
                          : "bg-surface-hover border-border/30"
                      )}>
                        <p className="text-sm text-muted-foreground mb-1">Real (Pluma)</p>
                        <p className={cn(
                          "text-3xl font-bold",
                          totaisProdutividade.produtividadeRealMedia > 0 && rendimentoCalculado > 0 ? "text-accent" : "text-muted-foreground"
                        )}>
                          {totaisProdutividade.produtividadeRealMedia > 0 && rendimentoCalculado > 0
                            ? `${(totaisProdutividade.produtividadeRealMedia * rendimentoCalculado / 100).toFixed(1)}`
                            : '-'}
                          <span className="text-base font-normal ml-1">@/ha</span>
                        </p>
                        {(totaisProdutividade.produtividadeRealMedia === 0 || rendimentoCalculado === 0) && (
                          <p className="text-xs text-muted-foreground mt-1">Aguardando beneficiamento</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variação */}
                  {totaisProdutividade.produtividadePrevistaMedia > 0 && totaisProdutividade.produtividadeRealMedia > 0 && (
                    <div className="flex items-center justify-center p-3 rounded-lg bg-surface/50">
                      {(() => {
                        const diff = totaisProdutividade.produtividadeRealMedia - totaisProdutividade.produtividadePrevistaMedia;
                        const diffPercent = (diff / totaisProdutividade.produtividadePrevistaMedia) * 100;
                        return (
                          <div className={cn(
                            "flex items-center gap-2",
                            diff >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {diff >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            <span className="font-bold text-lg">{diff >= 0 ? '+' : ''}{diff.toFixed(1)} @/ha</span>
                            <span className="text-sm">({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum rolo registrado para a safra {selectedSafra}</p>
                  <p className="text-xs mt-1">Cadastre rolos no campo para ver a produtividade</p>
                </div>
              )}
            </div>

            {/* Grid de KPIs Secundários */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Progresso Beneficiamento */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="w-4 h-4 text-neon-cyan" />
                  <span className="text-xs text-muted-foreground">Beneficiamento</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{taxaBeneficiamento.toFixed(1)}%</p>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden mt-2">
                  <div
                    className="h-full bg-neon-cyan rounded-full"
                    style={{ width: `${taxaBeneficiamento}%` }}
                  />
                </div>
              </div>

              {/* Volume Total */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-neon-orange" />
                  <span className="text-xs text-muted-foreground">Peso Bruto</span>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">kg transportados</p>
              </div>

              {/* Rendimento Pluma */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Rendimento Pluma</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">
                  {rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rendimentoCalculado >= 40 ? 'Excelente' : rendimentoCalculado >= 35 ? 'Bom' : '-'}
                </p>
              </div>

              {/* Melhor Talhão */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Melhor Talhão</span>
                </div>
                <p className="text-2xl font-bold text-yellow-500">{topTalhoes[0]?.talhao || '-'}</p>
                <p className="text-xs text-muted-foreground">
                  {topTalhoes[0] ? `${topTalhoes[0].arrobasPorHa.toFixed(0)} @/ha` : '-'}
                </p>
              </div>
            </div>

            {/* Top 5 Talhões */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Top 5 Talhões</h3>
                    <p className="text-xs text-muted-foreground">Maior produtividade (@/ha)</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {topTalhoes.map((t, index) => (
                  <div key={t.talhao} className="flex items-center justify-between p-4 hover:bg-surface/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        index === 1 ? "bg-gray-400/20 text-gray-400" :
                        index === 2 ? "bg-amber-600/20 text-amber-600" :
                        "bg-surface text-muted-foreground"
                      )}>
                        {index + 1}º
                      </span>
                      <div>
                        <p className="font-semibold">{t.talhao}</p>
                        <p className="text-xs text-muted-foreground">{t.hectares.toFixed(1)} ha • {t.total} fardos</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-foreground">{t.arrobasPorHa.toFixed(0)} @/ha</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB: PRODUÇÃO (antigo talhao) ==================== */}
          <TabsContent value="producao" className="space-y-4 mt-4">
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
                  const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;

                  // Buscar dados de produtividade comparativa
                  const prodData = produtividadeComparativa.find(p => p.talhao === stat.talhao);

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
                              {hectares.toFixed(1)} ha • {stat.total} fardos
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-display font-bold text-foreground">{stat.total}</span>
                          <p className="text-[10px] text-muted-foreground uppercase">fardos</p>
                        </div>
                      </div>

                      {/* Produtividade Real vs Prevista */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Prevista</p>
                          <p className="text-lg font-bold text-foreground">
                            {prodData && prodData.produtividadePrevistoArrobas > 0
                              ? prodData.produtividadePrevistoArrobas.toFixed(1)
                              : '-'}
                            <span className="text-xs font-normal ml-0.5">@/ha</span>
                          </p>
                        </div>
                        <div className={cn(
                          "p-2.5 rounded-lg border",
                          prodData?.temDadosReais
                            ? "bg-neon-cyan/10 border-neon-cyan/20"
                            : "bg-surface-hover border-border/30"
                        )}>
                          <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Real</p>
                          <p className={cn(
                            "text-lg font-bold",
                            prodData?.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                          )}>
                            {prodData?.temDadosReais
                              ? prodData.produtividadeRealArrobas.toFixed(1)
                              : '-'}
                            <span className="text-xs font-normal ml-0.5">@/ha</span>
                          </p>
                        </div>
                      </div>

                      {/* Indicador de variação */}
                      {prodData?.temDadosReais && prodData.produtividadePrevistoArrobas > 0 && (
                        <div className={cn(
                          "flex items-center justify-center gap-1.5 p-1.5 rounded-lg mb-3 text-xs font-medium",
                          prodData.diferencaPercentual >= 0
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {prodData.diferencaPercentual >= 0
                            ? <ArrowUpRight className="w-3.5 h-3.5" />
                            : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {Math.abs(prodData.diferencaPercentual).toFixed(1)}% vs prevista
                        </div>
                      )}

                      <div className="space-y-2">
                        {/* Campo */}
                        <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-primary/20">
                                <Package className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-xs font-medium">Campo</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold">{stat.campo}</span>
                              <span className="text-[10px] text-muted-foreground">({progressCampo.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressCampo}%` }} />
                          </div>
                        </div>

                        {/* Pátio */}
                        <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-neon-orange/20">
                                <Truck className="w-3 h-3 text-neon-orange" />
                              </div>
                              <span className="text-xs font-medium">Pátio</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold">{stat.patio}</span>
                              <span className="text-[10px] text-muted-foreground">({progressPatio.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-orange rounded-full transition-all" style={{ width: `${progressPatio}%` }} />
                          </div>
                        </div>

                        {/* Beneficiado */}
                        <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-neon-cyan/20">
                                <CheckCircle className="w-3 h-3 text-neon-cyan" />
                              </div>
                              <span className="text-xs font-medium">Beneficiado</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold">{stat.beneficiado}</span>
                              <span className="text-[10px] text-muted-foreground">({progressBeneficiado.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
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

          {/* ==================== TAB: TRANSPORTE ==================== */}
          <TabsContent value="transporte" className="space-y-4 mt-4">
            {/* KPIs de Carregamentos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-orange/20">
                    <Truck className="w-4 h-4 text-neon-orange" />
                  </div>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{totaisCarregamentos.totalCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Total Carregamentos</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/20">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Peso Bruto (kg)</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                    <MapPin className="w-4 h-4 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{totaisCarregamentos.talhoesComCarregamentos}</p>
                <p className="text-xs text-muted-foreground">Talhões</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/20">
                    <TrendingUp className="w-4 h-4 text-accent" />
                  </div>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{Math.round(totaisCarregamentos.mediaPesoPorCarregamento).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">kg/Carreg.</p>
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
                  <div className="space-y-2">
                    {(() => {
                      const sortedItems = (pesoBrutoTotais ?? []).sort((a, b) => b.pesoBrutoTotal - a.pesoBrutoTotal);
                      const maxPeso = sortedItems.length > 0 ? sortedItems[0].pesoBrutoTotal : 1;
                      return sortedItems.map((item, index) => {
                        const progressWidth = (item.pesoBrutoTotal / maxPeso) * 100;
                        const medalColor = index === 0 ? "text-yellow-500 bg-yellow-500/20" :
                                          index === 1 ? "text-gray-400 bg-gray-400/20" :
                                          index === 2 ? "text-amber-600 bg-amber-600/20" : null;
                        return (
                          <div key={item.talhao} className="relative p-3 rounded-xl bg-surface border border-border/30 overflow-hidden hover:border-neon-orange/40 transition-colors">
                            {/* Barra de progresso de fundo */}
                            <div
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-orange/15 to-transparent rounded-xl transition-all duration-500"
                              style={{ width: `${progressWidth}%` }}
                            />
                            {/* Conteúdo */}
                            <div className="relative flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {/* Ranking Badge */}
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                  medalColor || "bg-surface-hover text-muted-foreground"
                                )}>
                                  {index + 1}º
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-neon-orange/20 flex items-center justify-center text-sm font-bold text-neon-orange">
                                  {item.talhao}
                                </div>
                                <div>
                                  <p className="font-semibold">Talhão {item.talhao}</p>
                                  <p className="text-xs text-muted-foreground">{item.quantidadeCarregamentos} carregamento{item.quantidadeCarregamentos !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-foreground">{item.pesoBrutoTotal.toLocaleString('pt-BR')} kg</p>
                                <p className="text-xs text-muted-foreground">
                                  Média: {item.quantidadeCarregamentos > 0 ? Math.round(item.pesoBrutoTotal / item.quantidadeCarregamentos).toLocaleString('pt-BR') : "0"} kg/carreg.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {/* Total Card */}
                    <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-neon-orange/20 to-neon-orange/5 border border-neon-orange/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-neon-orange/30">
                            <Scale className="w-5 h-5 text-neon-orange" />
                          </div>
                          <div>
                            <p className="font-semibold text-neon-orange">TOTAL</p>
                            <p className="text-xs text-muted-foreground">{totaisCarregamentos.totalCarregamentos} carregamentos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-display font-bold text-foreground">{totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')} kg</p>
                          <p className="text-xs text-muted-foreground">
                            Média: {Math.round(totaisCarregamentos.mediaPesoPorCarregamento).toLocaleString('pt-BR')} kg/carreg.
                          </p>
                        </div>
                      </div>
                    </div>
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

              <div className="p-4">
                {produtividadeComparativa.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wheat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum talhão com dados para comparar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {produtividadeComparativa.map((item) => {
                      const maxProdutividade = Math.max(item.produtividadePrevistoArrobas, item.produtividadeRealArrobas, 1);
                      const previstoWidth = (item.produtividadePrevistoArrobas / maxProdutividade) * 100;
                      const realWidth = item.temDadosReais ? (item.produtividadeRealArrobas / maxProdutividade) * 100 : 0;
                      return (
                        <div
                          key={item.talhao}
                          className={cn(
                            "p-4 rounded-xl bg-surface border transition-colors",
                            item.temDadosReais
                              ? item.diferencaPercentual >= 0
                                ? "border-green-500/30 hover:border-green-500/50"
                                : "border-red-500/30 hover:border-red-500/50"
                              : "border-border/30 hover:border-primary/40"
                          )}
                        >
                          {/* Header com valores lado a lado */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-foreground">
                                {item.talhao}
                              </div>
                              <div>
                                <p className="font-semibold">Talhão {item.talhao}</p>
                                <p className="text-xs text-muted-foreground">{item.hectares.toFixed(1)} hectares</p>
                              </div>
                            </div>
                            {/* Badge de diferença */}
                            {item.temDadosReais ? (
                              <div className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                                item.diferencaPercentual >= 0
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                              )}>
                                {item.diferencaPercentual >= 0 ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {item.diferencaPercentual >= 0 ? "+" : ""}{item.diferencaPercentual.toFixed(0)}%
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs bg-surface-hover text-muted-foreground">
                                Aguardando rendimento
                              </span>
                            )}
                          </div>

                          {/* Valores lado a lado em destaque */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <p className="text-xs text-muted-foreground mb-1">Prevista (Bruto)</p>
                              <p className="text-xl font-bold text-foreground">
                                {item.produtividadePrevistoArrobas > 0 ? `${item.produtividadePrevistoArrobas.toFixed(1)}` : '-'}
                                <span className="text-sm font-normal ml-1">@/ha</span>
                              </p>
                            </div>
                            <div className={cn(
                              "p-3 rounded-lg border",
                              item.temDadosReais ? "bg-neon-cyan/10 border-neon-cyan/20" : "bg-surface-hover border-border/30"
                            )}>
                              <p className="text-xs text-muted-foreground mb-1">Real (Pluma)</p>
                              <p className={cn(
                                "text-xl font-bold",
                                item.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                              )}>
                                {item.temDadosReais ? `${item.produtividadeRealArrobas.toFixed(1)}` : '-'}
                                <span className="text-sm font-normal ml-1">@/ha</span>
                              </p>
                            </div>
                          </div>

                          {/* Progress Bars comparativas */}
                          <div className="space-y-2">
                            {/* Prevista */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                  Prevista
                                </span>
                                <span className="font-medium text-primary">{item.produtividadePrevistoArrobas.toFixed(1)} @/ha</span>
                              </div>
                              <div className="h-2.5 bg-surface-hover rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${previstoWidth}%` }}
                                />
                              </div>
                            </div>
                            {/* Real */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <div className={cn("w-2 h-2 rounded-full", item.temDadosReais ? "bg-neon-cyan" : "bg-muted-foreground")} />
                                  Real
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  item.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                                )}>
                                  {item.temDadosReais ? `${item.produtividadeRealArrobas.toFixed(1)} @/ha` : "Aguardando..."}
                                </span>
                              </div>
                              <div className="h-2.5 bg-surface-hover rounded-full overflow-hidden">
                                {item.temDadosReais ? (
                                  <div
                                    className="h-full bg-neon-cyan rounded-full transition-all duration-500"
                                    style={{ width: `${realWidth}%` }}
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-r from-surface-hover via-muted-foreground/20 to-surface-hover rounded-full animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Peso médio real do fardo */}
                          {item.temDadosReais && item.pesoMedioRealFardo > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Peso médio/rolo:</span>
                              <span className="font-bold text-foreground">{Math.round(item.pesoMedioRealFardo).toLocaleString('pt-BR')} kg</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                <p className="text-lg font-bold text-purple-400">
                  {totaisLotes.totalPesoPluma.toLocaleString('pt-BR')}
                  <span className="text-xs ml-1">kg</span>
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
                <p className="text-lg font-bold">
                  {Math.round(totaisLotes.mediaPesoPorLote).toLocaleString('pt-BR')}
                  <span className="text-xs ml-1">kg</span>
                </p>
                <p className="text-xs text-muted-foreground">Média/Lote</p>
              </div>

              <div className="glass-card p-4 rounded-xl border border-neon-cyan/20 hover:border-neon-cyan/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neon-cyan/20">
                    <Boxes className="w-4 h-4 text-neon-cyan" />
                  </div>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{totaisFardinhos.totalFardinhos}</p>
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
                  <span>Bruto: {totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')} kg</span>
                  <span>Pluma: {totaisLotes.totalPesoPluma.toLocaleString('pt-BR')} kg</span>
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

          {/* ==================== TAB: ANÁLISES (reformulada) ==================== */}
          <TabsContent value="analises" className="space-y-6 mt-4">
            {/* ===== INSIGHTS PRINCIPAIS ===== */}
            <div className="glass-card rounded-2xl overflow-hidden border border-primary/20">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Insights da Safra</h2>
                    <p className="text-xs text-muted-foreground">Análise automática dos seus dados</p>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Insight 1: Melhor Talhão */}
                  {topTalhoes.length > 0 && (
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-yellow-500 uppercase">Destaque</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground mb-1">
                        <span className="font-bold">Talhão {topTalhoes[0].talhao}</span> mais produtivo
                      </p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {topTalhoes[0].arrobasPorHa.toFixed(0)} <span className="text-xs sm:text-sm font-normal">@/ha</span>
                      </p>
                      {topTalhoes.length > 1 && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                          {((topTalhoes[0].arrobasPorHa - topTalhoes[topTalhoes.length - 1].arrobasPorHa) / topTalhoes[topTalhoes.length - 1].arrobasPorHa * 100).toFixed(0)}% acima do menor
                        </p>
                      )}
                    </div>
                  )}

                  {/* Insight 2: Progresso Beneficiamento */}
                  <div className={cn(
                    "p-3 sm:p-4 rounded-xl border",
                    taxaBeneficiamento >= 70
                      ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                      : taxaBeneficiamento >= 40
                        ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"
                        : "bg-gradient-to-br from-neon-orange/10 to-neon-orange/5 border-neon-orange/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Factory className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5",
                        taxaBeneficiamento >= 70 ? "text-green-500" : taxaBeneficiamento >= 40 ? "text-yellow-500" : "text-neon-orange"
                      )} />
                      <span className={cn(
                        "text-[10px] sm:text-xs font-semibold uppercase",
                        taxaBeneficiamento >= 70 ? "text-green-500" : taxaBeneficiamento >= 40 ? "text-yellow-500" : "text-neon-orange"
                      )}>Beneficiamento</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground mb-1">
                      {taxaBeneficiamento >= 70
                        ? "Excelente progresso!"
                        : taxaBeneficiamento >= 40
                          ? "Progresso moderado"
                          : "Muitos rolos pendentes"}
                    </p>
                    <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                      {taxaBeneficiamento.toFixed(1)}%
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      {globalStats?.beneficiado || 0} de {globalStats?.total || 0} rolos
                    </p>
                  </div>

                  {/* Insight 3: Produtividade Real vs Prevista */}
                  {totaisProdutividade.produtividadeRealMedia > 0 && totaisProdutividade.produtividadePrevistaMedia > 0 && (
                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border",
                      totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                        ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                        : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        {totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                          ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                          : <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                        <span className={cn(
                          "text-[10px] sm:text-xs font-semibold uppercase",
                          totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                            ? "text-green-500"
                            : "text-red-500"
                        )}>Prod. Real</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground mb-1">
                        {totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                          ? "Acima da previsão!"
                          : "Abaixo do previsto"}
                      </p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {(((totaisProdutividade.produtividadeRealMedia - totaisProdutividade.produtividadePrevistaMedia) / totaisProdutividade.produtividadePrevistaMedia) * 100).toFixed(1)}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                        {totaisProdutividade.produtividadeRealMedia.toFixed(1)} vs {totaisProdutividade.produtividadePrevistaMedia.toFixed(1)} @/ha
                      </p>
                    </div>
                  )}

                  {/* Insight 4: Tempo médio de beneficiamento */}
                  {tempoMedioBeneficiamento > 0 && (
                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border",
                      tempoMedioBeneficiamento <= 48
                        ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                        : tempoMedioBeneficiamento <= 96
                          ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"
                          : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5",
                          tempoMedioBeneficiamento <= 48 ? "text-green-500" : tempoMedioBeneficiamento <= 96 ? "text-yellow-500" : "text-red-500"
                        )} />
                        <span className={cn(
                          "text-[10px] sm:text-xs font-semibold uppercase",
                          tempoMedioBeneficiamento <= 48 ? "text-green-500" : tempoMedioBeneficiamento <= 96 ? "text-yellow-500" : "text-red-500"
                        )}>Velocidade</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground mb-1">
                        Tempo pátio → benef.
                      </p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {Math.floor(tempoMedioBeneficiamento / 24)}d {Math.floor(tempoMedioBeneficiamento % 24)}h
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                        {tempoMedioBeneficiamento <= 48 ? "Ótimo!" : tempoMedioBeneficiamento <= 96 ? "Adequado" : "Otimizar"}
                      </p>
                    </div>
                  )}

                  {/* Insight 5: Rendimento Pluma */}
                  {rendimentoCalculado > 0 && (
                    <div className={cn(
                      "p-3 sm:p-4 rounded-xl border",
                      rendimentoCalculado >= 40
                        ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                        : rendimentoCalculado >= 35
                          ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"
                          : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5",
                          rendimentoCalculado >= 40 ? "text-green-500" : rendimentoCalculado >= 35 ? "text-yellow-500" : "text-red-500"
                        )} />
                        <span className={cn(
                          "text-[10px] sm:text-xs font-semibold uppercase",
                          rendimentoCalculado >= 40 ? "text-green-500" : rendimentoCalculado >= 35 ? "text-yellow-500" : "text-red-500"
                        )}>Rendimento</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground mb-1">
                        Rendimento pluma
                      </p>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                        {rendimentoCalculado.toFixed(1)}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                        {rendimentoCalculado >= 40 ? "Acima da média!" : rendimentoCalculado >= 35 ? "Na média" : "Abaixo"}
                      </p>
                    </div>
                  )}

                  {/* Insight 6: Volume Produtivo */}
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-neon-cyan" />
                      <span className="text-[10px] sm:text-xs font-semibold text-neon-cyan uppercase">Volume</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground mb-1">
                      Média diária (30d)
                    </p>
                    <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                      {fardosPorDia.toFixed(1)} <span className="text-xs sm:text-sm font-normal">r/dia</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      {talhoesAtivos} talhões ativos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== GRÁFICO PRINCIPAL: EVOLUÇÃO TEMPORAL ===== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Evolução da Colheita</h2>
                      <p className="text-xs text-muted-foreground">Rolos criados nos últimos 14 dias</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-5">
                <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF88" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: '#888' }} width={35} />
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

            {/* ===== GRID 2x2: DISTRIBUIÇÃO E RANKING ===== */}
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
                <div className="p-3 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                    <ResponsiveContainer width={140} height={140} className="sm:!w-[180px] sm:!h-[180px]">
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
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
                    <div className="flex sm:flex-col gap-4 sm:gap-3 flex-wrap justify-center">
                      {pieChartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 sm:gap-3">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: item.color }} />
                          <div>
                            <p className="text-xs sm:text-sm font-bold">{item.value}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{item.name}</p>
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
                <div className="p-3 sm:p-5">
                  <ResponsiveContainer width="100%" height={180} className="sm:!h-[200px]">
                    <BarChart
                      layout="vertical"
                      data={topTalhoes.slice(0, 5)}
                      margin={{ top: 0, right: 5, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#888' }} />
                      <YAxis dataKey="talhao" type="category" tick={{ fontSize: 10, fill: '#888' }} width={30} />
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

            {/* ===== COMPARATIVO PREVISTO VS REAL ===== */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-4 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Comparativo: Previsto vs Real</h2>
                    <p className="text-xs text-muted-foreground">Produtividade com base na estimativa vs pesagem real</p>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                {produtividadeComparativa.filter(t => t.temDadosReais).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220} minWidth={350} className="sm:!h-[280px]">
                    <BarChart
                      data={produtividadeComparativa.filter(t => t.temDadosReais).map(t => ({
                        talhao: t.talhao,
                        previsto: t.produtividadePrevistoArrobas,
                        real: t.produtividadeRealArrobas,
                        diferenca: t.diferencaPercentual
                      }))}
                      margin={{ top: 20, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="talhao" tick={{ fontSize: 9, fill: '#888' }} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#888' }} width={35} />
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
                      <Legend wrapperStyle={{ fontSize: '9px' }} />
                      <Bar dataKey="previsto" fill="#00FF88" name="Previsto" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="real" fill="#FFD700" name="Real" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum talhão com dados de pesagem real</p>
                    <p className="text-xs mt-1">Adicione carregamentos na página da Algodoeira para ver o comparativo</p>
                  </div>
                )}
              </div>
            </div>

            {/* ===== COMPARATIVO POR SAFRA ===== */}
            {safraStats.length > 1 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-4 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/10 via-neon-orange/5 to-transparent" />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-neon-orange/20">
                      <Calendar className="w-5 h-5 text-neon-orange" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Comparativo por Safra</h2>
                      <p className="text-xs text-muted-foreground">Análise comparativa entre safras</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safraStats.map((stat) => {
                      const progressBeneficiado = stat.total > 0 ? (stat.beneficiado / stat.total) * 100 : 0;
                      return (
                        <div
                          key={stat.safra}
                          className="p-4 rounded-xl bg-surface border border-border/30 hover:border-neon-orange/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-neon-orange" />
                              <span className="font-semibold">Safra {stat.safra}</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{stat.total}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <p className="font-bold text-foreground">{stat.campo}</p>
                              <p className="text-muted-foreground">Campo</p>
                            </div>
                            <div className="p-2 rounded-lg bg-neon-orange/10">
                              <p className="font-bold text-foreground">{stat.patio}</p>
                              <p className="text-muted-foreground">Pátio</p>
                            </div>
                            <div className="p-2 rounded-lg bg-neon-cyan/10">
                              <p className="font-bold text-foreground">{stat.beneficiado}</p>
                              <p className="text-muted-foreground">Benef.</p>
                            </div>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className="h-full bg-neon-cyan rounded-full transition-all" style={{ width: `${progressBeneficiado}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{progressBeneficiado.toFixed(0)}% beneficiado</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
                      <p className="text-2xl font-display font-bold text-foreground">{globalStats?.campo || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Campo</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center border border-neon-orange/20 hover:border-neon-orange/40 transition-all">
                      <div className="p-2 bg-neon-orange/20 rounded-lg w-fit mx-auto mb-2">
                        <Truck className="w-4 h-4 text-neon-orange" />
                      </div>
                      <p className="text-2xl font-display font-bold text-foreground">{globalStats?.patio || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Pátio</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl text-center border border-neon-cyan/20 hover:border-neon-cyan/40 transition-all">
                      <div className="p-2 bg-neon-cyan/20 rounded-lg w-fit mx-auto mb-2">
                        <CheckCircle className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <p className="text-2xl font-display font-bold text-foreground">{globalStats?.beneficiado || 0}</p>
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
            <DialogHeader className="pb-3 sm:pb-4 mb-2 border-b border-border/30">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-bold">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/20">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                Talhão {selectedTalhao}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground ml-9 sm:ml-14 mt-1">
                Informações detalhadas e métricas
              </DialogDescription>
            </DialogHeader>

            {selectedTalhaoData && selectedTalhaoInfo && (() => {
              const talhaoProducao = produtividadeComparativa.find(t => t.talhao === selectedTalhao);
              const hectares = parseFloat(selectedTalhaoInfo.hectares.replace(",", ".")) || 0;
              const fardosPorHa = hectares > 0 ? (selectedTalhaoData.total / hectares).toFixed(2) : '0.00';

              return (
                <div className="space-y-4 sm:space-y-5">
                  {/* Cards Resumo - 2x2 */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Área */}
                    <div className="glass-card p-3 sm:p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="p-1 sm:p-1.5 rounded-lg bg-primary/20">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Área</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold">{hectares.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-muted-foreground">ha</span></p>
                    </div>

                    {/* Total Fardos */}
                    <div className="glass-card p-3 sm:p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="p-1 sm:p-1.5 rounded-lg bg-neon-orange/20">
                          <Package className="w-3 h-3 sm:w-4 sm:h-4 text-neon-orange" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">Fardos</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{selectedTalhaoData.total}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{fardosPorHa} f/ha</p>
                    </div>
                  </div>

                  {/* Produtividade Principal */}
                  <div className="glass-card rounded-xl p-3 sm:p-4 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                    <h4 className="text-xs sm:text-sm font-bold mb-3 sm:mb-4 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      Produtividade (@/ha)
                    </h4>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      {/* Prevista */}
                      <div className="p-2.5 sm:p-4 bg-primary/10 rounded-xl border border-primary/20">
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase mb-1">Prevista</p>
                        <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                          {talhaoProducao && talhaoProducao.produtividadePrevistoArrobas > 0
                            ? talhaoProducao.produtividadePrevistoArrobas.toFixed(1)
                            : '-'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
                          {selectedTalhaoData.total} fardos × 2t / {hectares.toFixed(0)}ha / 15
                        </p>
                      </div>

                      {/* Real */}
                      <div className={cn(
                        "p-2.5 sm:p-4 rounded-xl border",
                        talhaoProducao?.temDadosReais
                          ? "bg-neon-cyan/10 border-neon-cyan/20"
                          : "bg-surface border-border/30"
                      )}>
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase mb-1">Real</p>
                        <p className={cn(
                          "text-2xl sm:text-3xl font-bold",
                          talhaoProducao?.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                        )}>
                          {talhaoProducao?.temDadosReais
                            ? talhaoProducao.produtividadeRealArrobas.toFixed(1)
                            : '-'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {talhaoProducao?.temDadosReais
                            ? `${talhaoProducao.qtdCarregamentos} carreg.`
                            : 'Aguardando'}
                        </p>
                      </div>
                    </div>

                    {/* Variação */}
                    {talhaoProducao?.temDadosReais && talhaoProducao.produtividadePrevistoArrobas > 0 && (
                      <div className={cn(
                        "flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl mt-3 sm:mt-4",
                        talhaoProducao.diferencaPercentual >= 0
                          ? "bg-green-500/10 text-green-500 border border-green-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {talhaoProducao.diferencaPercentual >= 0
                          ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          : <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                        <span className="text-sm sm:text-lg font-bold">
                          {talhaoProducao.diferencaPercentual >= 0 ? '+' : ''}
                          {talhaoProducao.diferencaPercentual.toFixed(1)}%
                        </span>
                        <span className="text-xs sm:text-sm">
                          ({talhaoProducao.diferencaPercentual >= 0 ? '+' : ''}
                          {talhaoProducao.diferencaArrobas.toFixed(1)} @/ha)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Peso Médio por Fardo */}
                  {talhaoProducao && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="glass-card p-2.5 sm:p-3 rounded-xl text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase mb-1">Peso Est./Fardo</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground">2.000 <span className="text-xs sm:text-sm font-normal">kg</span></p>
                      </div>
                      <div className="glass-card p-2.5 sm:p-3 rounded-xl text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase mb-1">Peso Real/Fardo</p>
                        <p className={cn(
                          "text-lg sm:text-xl font-bold",
                          talhaoProducao.temDadosReais ? "text-neon-cyan" : "text-muted-foreground"
                        )}>
                          {talhaoProducao.temDadosReais && talhaoProducao.pesoMedioRealFardo > 0
                            ? Math.round(talhaoProducao.pesoMedioRealFardo).toLocaleString('pt-BR')
                            : '-'}
                          {talhaoProducao.temDadosReais && <span className="text-xs sm:text-sm font-normal"> kg</span>}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status dos Fardos */}
                  <div className="glass-card rounded-xl p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      Status dos Fardos
                    </h4>
                    <div className="space-y-2">
                      {/* Campo */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1 sm:p-1.5 rounded bg-primary/20">
                          <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs sm:text-sm mb-1">
                            <span>Campo</span>
                            <span className="font-bold">{selectedTalhaoData.campo}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${selectedTalhaoData.total > 0 ? (selectedTalhaoData.campo / selectedTalhaoData.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">
                          {selectedTalhaoData.total > 0 ? ((selectedTalhaoData.campo / selectedTalhaoData.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>

                      {/* Pátio */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1 sm:p-1.5 rounded bg-neon-orange/20">
                          <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neon-orange" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs sm:text-sm mb-1">
                            <span>Pátio</span>
                            <span className="font-bold">{selectedTalhaoData.patio}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neon-orange rounded-full transition-all"
                              style={{ width: `${selectedTalhaoData.total > 0 ? (selectedTalhaoData.patio / selectedTalhaoData.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">
                          {selectedTalhaoData.total > 0 ? ((selectedTalhaoData.patio / selectedTalhaoData.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>

                      {/* Beneficiado */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1 sm:p-1.5 rounded bg-neon-cyan/20">
                          <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neon-cyan" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs sm:text-sm mb-1">
                            <span>Benef.</span>
                            <span className="font-bold">{selectedTalhaoData.beneficiado}</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neon-cyan rounded-full transition-all"
                              style={{ width: `${selectedTalhaoData.total > 0 ? (selectedTalhaoData.beneficiado / selectedTalhaoData.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">
                          {selectedTalhaoData.total > 0 ? ((selectedTalhaoData.beneficiado / selectedTalhaoData.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo com Média */}
                  {talhaoProducao && totaisProdutividade.produtividadePrevistaMedia > 0 && (
                    <div className="glass-card rounded-xl p-3 sm:p-4 border border-border/30">
                      <h4 className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-2 text-muted-foreground">
                        <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Comparativo com Média
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="p-2.5 sm:p-3 bg-surface rounded-lg">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Este Talhão</p>
                          <p className="text-lg sm:text-xl font-bold text-foreground">
                            {talhaoProducao.produtividadePrevistoArrobas.toFixed(1)} <span className="text-xs sm:text-sm font-normal">@/ha</span>
                          </p>
                        </div>
                        <div className="p-2.5 sm:p-3 bg-surface rounded-lg">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Média Geral</p>
                          <p className="text-lg sm:text-xl font-bold text-foreground">
                            {totaisProdutividade.produtividadePrevistaMedia.toFixed(1)} <span className="text-xs sm:text-sm font-normal">@/ha</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
