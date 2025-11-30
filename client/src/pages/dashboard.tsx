import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { useRealtime } from "@/hooks/use-realtime";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import { useSettings } from "@/hooks/use-settings";
import type { Bale } from "@shared/schema";
import {
  Package,
  Truck,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Wheat,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Activity,
  BarChart3,
  DollarSign,
  Loader2,
  AlertTriangle,
  Leaf,
  Calendar,
  MapPin,
  Eye,
  LineChart,
  Zap,
  ArrowRight,
  Info,
  Sparkles,
  Factory,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
  Line,
  LineChart as RechartsLineChart,
} from "recharts";

type DashboardTab = "overview" | "market" | "projections";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  useRealtime(isAuthenticated);

  // State
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [perdasModalOpen, setPerdasModalOpen] = useState(false);
  const [kpiModal, setKpiModal] = useState<{
    open: boolean;
    tipo: "fardos" | "peso" | "produtividade" | "area" | null;
  }>({ open: false, tipo: null });
  const [historicoModal, setHistoricoModal] = useState<{
    open: boolean;
    tipo: "dolar" | "algodao" | "pluma" | "caroco" | null;
    titulo: string;
    periodo: number;
  }>({ open: false, tipo: null, titulo: "", periodo: 30 });

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

  // Query de fardos
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

  // Query de stats
  const { data: stats } = useQuery<{
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
    enabled: !!selectedSafra,
    staleTime: 30000,
  });

  // Query de carregamentos
  const { data: pesoBrutoTotais = [] } = useQuery<
    { talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]
  >({
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
    enabled: !!selectedSafra,
    staleTime: 60000,
  });

  // Query de perdas totais
  const { data: perdasData } = useQuery<{ totalPerdas: number }>({
    queryKey: ["/api/perdas-total", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/perdas-total/${encodedSafra}`
        : `/api/perdas-total/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { totalPerdas: 0 };
      return response.json();
    },
    enabled: !!selectedSafra,
    staleTime: 60000,
  });

  const totalPerdasArrobasHa = perdasData?.totalPerdas || 0;

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

  // Query para perdas detalhadas
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

  // Cálculos principais
  const totalHectares = useMemo(
    () =>
      talhoesSafra.reduce(
        (acc, t) => acc + parseFloat(t.hectares.replace(",", ".")),
        0
      ),
    [talhoesSafra]
  );

  const totaisCarregamentos = useMemo(() => {
    const totalPesoKg = pesoBrutoTotais.reduce(
      (acc, item) => acc + (Number(item.pesoBrutoTotal) || 0),
      0
    );
    const totalCarregamentos = pesoBrutoTotais.reduce(
      (acc, item) => acc + (Number(item.quantidadeCarregamentos) || 0),
      0
    );
    return {
      totalPesoKg,
      totalPesoToneladas: totalPesoKg / 1000,
      totalCarregamentos,
    };
  }, [pesoBrutoTotais]);

  // Produtividade
  const produtividade = useMemo(() => {
    const totalFardos = stats?.total || 0;
    const pesoEstimado = totalFardos * 2000;
    const prevista =
      totalHectares > 0 ? pesoEstimado / totalHectares / 15 : 0;
    const pesoMedioFardo =
      totalFardos > 0 ? totaisCarregamentos.totalPesoKg / totalFardos : 0;
    const real =
      totalHectares > 0 && totaisCarregamentos.totalPesoKg > 0
        ? totaisCarregamentos.totalPesoKg / totalHectares / 15
        : 0;
    const diferencaPercent =
      prevista > 0 ? ((real - prevista) / prevista) * 100 : 0;
    return {
      prevista,
      real,
      diferencaPercent,
      pesoMedioFardo,
      temDadosReais: totaisCarregamentos.totalPesoKg > 0,
    };
  }, [stats, totalHectares, totaisCarregamentos]);

  // Fardos por período
  const balesByPeriod = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayCount = bales.filter((b) => {
      const d = new Date(b.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    const yesterdayCount = bales.filter((b) => {
      const d = new Date(b.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    }).length;

    const weekCount = bales.filter((b) => {
      const d = new Date(b.createdAt);
      return d >= weekAgo;
    }).length;

    return { today: todayCount, yesterday: yesterdayCount, week: weekCount };
  }, [bales]);

  // Evolução diária (últimos 14 dias)
  const dailyEvolution = useMemo(() => {
    const days: { date: string; fardos: number; peso: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayBales = bales.filter((b) => {
        const bd = new Date(b.createdAt);
        bd.setHours(0, 0, 0, 0);
        return bd.getTime() === d.getTime();
      });
      days.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        fardos: dayBales.length,
        peso: dayBales.length * 2, // estimativa em toneladas
      });
    }
    return days;
  }, [bales]);

  const progressPercent = stats?.total
    ? (stats.beneficiado / stats.total) * 100
    : 0;

  // Saudação e data
  const { greeting, currentDate } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Boa noite";
    if (hour < 12) greeting = "Bom dia";
    else if (hour < 18) greeting = "Boa tarde";

    return {
      greeting,
      currentDate: now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };
  }, []);

  // Cotação
  interface CotacaoData {
    pluma: number;
    caroco: number;
    cottonUSD?: number;
    usdBrl?: number;
    dataAtualizacao: string;
    fonte: string;
    variacaoDolar?: number;
    variacaoAlgodao?: number;
    variacaoPluma?: number;
    variacaoCaroco?: number;
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
      if (!response.ok)
        return {
          pluma: 140,
          caroco: 38,
          dataAtualizacao: new Date().toISOString(),
          fonte: "fallback",
        };
      return response.json();
    },
    staleTime: 60000,
  });

  const cotacaoPluma = cotacaoData?.pluma || 140;
  const cotacaoCaroco = cotacaoData?.caroco || 38;
  const usdBrl = cotacaoData?.usdBrl || 0;

  // Valor estimado
  const valorEstimado = useMemo(() => {
    const pesoArrobasBruto = totaisCarregamentos.totalPesoKg / 15;
    const pesoArrobasPluma = pesoArrobasBruto * 0.4;
    const pesoArrobasCaroco = pesoArrobasBruto * 0.57;

    const valorPlumaBRL = pesoArrobasPluma * cotacaoPluma;
    const valorCarocoBRL = pesoArrobasCaroco * cotacaoCaroco;
    const valorTotalBRL = valorPlumaBRL + valorCarocoBRL;

    const valorMedioPorArroba =
      (cotacaoPluma * 0.4 + cotacaoCaroco * 0.57) / 0.97;

    let perdasCampoArrobasTotais = 0;
    perdasPorTalhao.forEach((p) => {
      const talhaoInfo = talhoesSafra.find((t) => t.nome === p.talhao);
      const hectaresTalhao = talhaoInfo
        ? parseFloat(talhaoInfo.hectares.replace(",", "."))
        : 0;
      perdasCampoArrobasTotais += p.totalPerdas * hectaresTalhao;
    });
    const perdasCampoValorBRL = perdasCampoArrobasTotais * valorMedioPorArroba;

    // Variação estimada do dia (simulada com base na variação do dólar)
    const variacaoDia = cotacaoData?.variacaoDolar
      ? valorTotalBRL * (cotacaoData.variacaoDolar / 100)
      : 0;

    return {
      arrobasBruto: pesoArrobasBruto,
      arrobasPluma: pesoArrobasPluma,
      arrobasCaroco: pesoArrobasCaroco,
      valorPlumaBRL,
      valorCarocoBRL,
      valorTotalBRL,
      valorLiquidoBRL: valorTotalBRL - perdasCampoValorBRL,
      perdasCampoArrobasHa: totalPerdasArrobasHa,
      perdasCampoArrobasTotais,
      perdasCampoValorBRL,
      variacaoDia,
    };
  }, [
    totaisCarregamentos.totalPesoKg,
    cotacaoPluma,
    cotacaoCaroco,
    perdasPorTalhao,
    talhoesSafra,
    totalPerdasArrobasHa,
    cotacaoData,
  ]);

  // Perdas por talhão com valor
  const perdasPorTalhaoComValor = useMemo(() => {
    const valorMedio = (cotacaoPluma * 0.4 + cotacaoCaroco * 0.57) / 0.97;
    return perdasPorTalhao
      .map((p) => {
        const talhaoInfo = talhoesSafra.find((t) => t.nome === p.talhao);
        const hectares = talhaoInfo
          ? parseFloat(talhaoInfo.hectares.replace(",", "."))
          : 0;
        const arrobasTotais = p.totalPerdas * hectares;
        const valorBRL = arrobasTotais * valorMedio;
        const detalhes = perdasDetalhadas.filter((pd) => pd.talhao === p.talhao);
        return {
          talhao: p.talhao,
          arrobasHa: p.totalPerdas,
          hectares,
          arrobasTotais,
          valorBRL,
          detalhes,
        };
      })
      .sort((a, b) => b.valorBRL - a.valorBRL);
  }, [perdasPorTalhao, talhoesSafra, cotacaoPluma, cotacaoCaroco, perdasDetalhadas]);

  // Top talhões com dados para gráfico
  const topTalhoes = useMemo(() => {
    const data = talhoesSafra
      .map((t) => {
        const fardos = bales.filter((b) => b.talhao === t.nome).length;
        const hectares = parseFloat(t.hectares.replace(",", ".")) || 0;
        const peso =
          pesoBrutoTotais.find((p) => p.talhao === t.nome)?.pesoBrutoTotal || 0;
        const produtividade =
          hectares > 0 && peso > 0 ? peso / hectares / 15 : 0;
        return { nome: t.nome, fardos, hectares, peso, produtividade };
      })
      .filter((t) => t.fardos > 0)
      .sort((a, b) => b.produtividade - a.produtividade)
      .slice(0, 5);

    // Calcular max para escala do gráfico
    const maxProd = Math.max(...data.map((d) => d.produtividade), 1);
    return data.map((d) => ({ ...d, percentOfMax: (d.produtividade / maxProd) * 100 }));
  }, [talhoesSafra, bales, pesoBrutoTotais]);

  // Heat map data - calcular intensidade por talhão
  const heatMapData = useMemo(() => {
    return talhoesSafra.map((t) => {
      const fardos = bales.filter((b) => b.talhao === t.nome).length;
      const hectares = parseFloat(t.hectares.replace(",", ".")) || 0;
      const peso =
        pesoBrutoTotais.find((p) => p.talhao === t.nome)?.pesoBrutoTotal || 0;
      const produtividade = hectares > 0 && peso > 0 ? peso / hectares / 15 : 0;
      const perdas =
        perdasPorTalhao.find((p) => p.talhao === t.nome)?.totalPerdas || 0;

      // Calcular intensidade (0-100) baseada em produtividade
      const maxProd = 350; // meta de produtividade @/ha
      const intensity = Math.min((produtividade / maxProd) * 100, 100);

      return {
        nome: t.nome,
        fardos,
        hectares,
        produtividade,
        perdas,
        intensity,
        hasData: fardos > 0,
      };
    });
  }, [talhoesSafra, bales, pesoBrutoTotais, perdasPorTalhao]);

  // Sparkline data para cotações
  const generateSparkline = (baseValue: number, variation: number = 0.05) => {
    const points = [];
    let value = baseValue * (1 - variation);
    for (let i = 0; i < 7; i++) {
      value += (Math.random() - 0.5) * baseValue * variation * 0.5;
      value = Math.max(value, baseValue * 0.9);
      value = Math.min(value, baseValue * 1.1);
      points.push({ v: value });
    }
    points[6] = { v: baseValue }; // último valor é o atual
    return points;
  };

  const sparklineData = useMemo(
    () => ({
      dolar: generateSparkline(usdBrl || 5.5),
      pluma: generateSparkline(cotacaoPluma),
      caroco: generateSparkline(cotacaoCaroco),
    }),
    [usdBrl, cotacaoPluma, cotacaoCaroco]
  );

  // Histórico functions
  const periodos = [
    { label: "7D", dias: 7 },
    { label: "30D", dias: 30 },
    { label: "6M", dias: 180 },
    { label: "1A", dias: 365 },
  ];

  const gerarHistoricoLocal = (tipo: string, dias: number) => {
    const historico = [];
    const pontos = Math.min(dias, 30);
    const valorBase =
      tipo === "dolar"
        ? cotacaoData?.usdBrl || 5.5
        : tipo === "algodao"
        ? cotacaoData?.cottonUSD || 70
        : tipo === "caroco"
        ? cotacaoCaroco
        : cotacaoPluma;

    for (let i = pontos - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variacao = (Math.random() - 0.5) * 0.1 * valorBase;
      historico.push({ data: date.toISOString(), valor: valorBase + variacao });
    }
    return { tipo, historico, fonte: "local" };
  };

  const { data: historicoData, isLoading: historicoLoading } = useQuery({
    queryKey: [
      "/api/cotacao-algodao/historico",
      historicoModal.tipo,
      historicoModal.periodo,
    ],
    queryFn: async () => {
      const tipo = historicoModal.tipo;
      const dias = historicoModal.periodo;
      if (!tipo) return null;

      const url = API_URL
        ? `${API_URL}/api/cotacao-algodao/historico?tipo=${tipo}&dias=${dias}`
        : `/api/cotacao-algodao/historico?tipo=${tipo}&dias=${dias}`;

      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (!response.ok) return gerarHistoricoLocal(tipo, dias);
        const data = await response.json();
        if (!data.historico || data.historico.length === 0)
          return gerarHistoricoLocal(tipo, dias);
        return data;
      } catch {
        return gerarHistoricoLocal(tipo, dias);
      }
    },
    enabled: historicoModal.open && !!historicoModal.tipo,
    staleTime: 5 * 60 * 1000,
  });

  // Projeções
  const projections = useMemo(() => {
    const currentProd = produtividade.temDadosReais
      ? produtividade.real
      : produtividade.prevista;
    const remainingHa = totalHectares * 0.1; // 10% restante estimado
    const projectedTotal =
      valorEstimado.valorLiquidoBRL +
      remainingHa * currentProd * 15 * cotacaoPluma * 0.4;

    return {
      currentValue: valorEstimado.valorLiquidoBRL,
      projectedValue: projectedTotal,
      remainingHa,
      completionPercent: progressPercent,
    };
  }, [
    valorEstimado,
    produtividade,
    totalHectares,
    cotacaoPluma,
    progressPercent,
  ]);

  // Tabs config
  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: Eye },
    { id: "market" as const, label: "Mercado", icon: LineChart },
    { id: "projections" as const, label: "Projeções", icon: Sparkles },
  ];

  return (
    <Page>
      <PageContent className="max-w-6xl">
        <div className="space-y-6">
          {/* Header with Tabs */}
          <header className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground capitalize">
                  {currentDate}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mt-1">
                  {greeting}, {user?.displayName?.split(" ")[0] || user?.username}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Leaf className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Safra {safraAtiva?.nome || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </header>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Hero Value Card - Enhanced */}
              {totaisCarregamentos.totalPesoKg > 0 && (
                <section className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-primary/70 text-sm font-medium">
                        Valor Líquido Estimado
                      </p>
                      {valorEstimado.variacaoDia !== 0 && (
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            valorEstimado.variacaoDia >= 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {valorEstimado.variacaoDia >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          R${" "}
                          {Math.abs(valorEstimado.variacaoDia / 1000).toFixed(1)}k
                          hoje
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3 mb-4">
                      <span className="text-4xl sm:text-5xl font-bold text-foreground">
                        R${" "}
                        {valorEstimado.valorLiquidoBRL.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      {usdBrl > 0 && (
                        <span className="text-lg text-muted-foreground">
                          US${" "}
                          {(valorEstimado.valorLiquidoBRL / usdBrl).toLocaleString(
                            "en-US",
                            { maximumFractionDigits: 0 }
                          )}
                        </span>
                      )}
                    </div>

                    {/* Breakdown inline */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-muted-foreground">Pluma</span>
                        <span className="text-foreground font-medium">
                          R$ {(valorEstimado.valorPlumaBRL / 1000).toFixed(0)}k
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-muted-foreground">Caroço</span>
                        <span className="text-foreground font-medium">
                          R$ {(valorEstimado.valorCarocoBRL / 1000).toFixed(0)}k
                        </span>
                      </div>
                      {valorEstimado.perdasCampoValorBRL > 0 && (
                        <button
                          onClick={() => setPerdasModalOpen(true)}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-muted-foreground">Perdas</span>
                          <span className="text-red-500 font-medium">
                            -R${" "}
                            {(valorEstimado.perdasCampoValorBRL / 1000).toFixed(0)}k
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* KPIs Grid - Clickable */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Fardos */}
                <button
                  onClick={() => setKpiModal({ open: true, tipo: "fardos" })}
                  className="p-4 sm:p-5 rounded-xl glass-card hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Fardos
                      </span>
                    </div>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    <AnimatedCounter value={stats?.total || 0} />
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      +{balesByPeriod.today} hoje
                    </span>
                    {balesByPeriod.today > balesByPeriod.yesterday && (
                      <ArrowUpRight className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                </button>

                {/* Peso */}
                <button
                  onClick={() => setKpiModal({ open: true, tipo: "peso" })}
                  className="p-4 sm:p-5 rounded-xl glass-card hover:border-orange-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Scale className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Peso Total
                      </span>
                    </div>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {totaisCarregamentos.totalPesoToneladas > 0
                      ? `${totaisCarregamentos.totalPesoToneladas.toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 0 }
                        )}t`
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totaisCarregamentos.totalCarregamentos} carregamentos
                  </p>
                </button>

                {/* Produtividade */}
                <button
                  onClick={() =>
                    setKpiModal({ open: true, tipo: "produtividade" })
                  }
                  className="p-4 sm:p-5 rounded-xl glass-card hover:border-cyan-500/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Produtividade
                      </span>
                    </div>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-cyan-500 transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {produtividade.temDadosReais
                      ? produtividade.real.toFixed(1)
                      : produtividade.prevista.toFixed(1)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">@/ha</span>
                    {produtividade.temDadosReais && produtividade.prevista > 0 && (
                      <span
                        className={cn(
                          "text-xs font-medium flex items-center",
                          produtividade.diferencaPercent >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {produtividade.diferencaPercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(produtividade.diferencaPercent).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </button>

                {/* Área */}
                <button
                  onClick={() => setKpiModal({ open: true, tipo: "area" })}
                  className="p-4 sm:p-5 rounded-xl glass-card hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Área Total
                      </span>
                    </div>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-green-500 transition-colors" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {totalHectares.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    hectares em {talhoesSafra.length} talhões
                  </p>
                </button>
              </section>

              {/* Pipeline - Animated Flow */}
              <section className="p-5 rounded-xl glass-card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Pipeline de Produção
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {progressPercent.toFixed(0)}% concluído
                  </span>
                </div>

                {/* Flow Visualization */}
                <div className="relative">
                  {/* Connection Lines */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-cyan-500 opacity-20 -translate-y-1/2 hidden sm:block" />

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-4 relative">
                    {/* Campo */}
                    <div className="relative group">
                      <div
                        className={cn(
                          "text-center p-2.5 sm:p-5 rounded-xl transition-all",
                          "bg-primary/5 border-2 border-primary/20",
                          "hover:border-primary/40 hover:shadow-lg"
                        )}
                      >
                        <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
                          <Package className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-foreground">
                          {stats?.campo || 0}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          Campo
                        </p>
                        <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{
                              width: `${
                                stats?.total
                                  ? (stats.campo / stats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 hidden sm:block z-10">
                        <ArrowRight className="w-6 h-6 text-primary/50" />
                      </div>
                    </div>

                    {/* Pátio */}
                    <div className="relative group">
                      <div
                        className={cn(
                          "text-center p-2.5 sm:p-5 rounded-xl transition-all",
                          "bg-orange-500/5 border-2 border-orange-500/20",
                          "hover:border-orange-500/40 hover:shadow-lg"
                        )}
                      >
                        <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-orange-500/20 flex items-center justify-center">
                          <Truck className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-foreground">
                          {stats?.patio || 0}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          Pátio
                        </p>
                        <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full bg-orange-500 transition-all duration-1000"
                            style={{
                              width: `${
                                stats?.total
                                  ? (stats.patio / stats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 hidden sm:block z-10">
                        <ArrowRight className="w-6 h-6 text-orange-500/50" />
                      </div>
                    </div>

                    {/* Beneficiado */}
                    <div className="relative group">
                      <div
                        className={cn(
                          "text-center p-2.5 sm:p-5 rounded-xl transition-all",
                          "bg-cyan-500/5 border-2 border-cyan-500/20",
                          "hover:border-cyan-500/40 hover:shadow-lg"
                        )}
                      >
                        <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-cyan-500/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-500" />
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-foreground">
                          {stats?.beneficiado || 0}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          Beneficiado
                        </p>
                        <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all duration-1000"
                            style={{
                              width: `${
                                stats?.total
                                  ? (stats.beneficiado / stats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Top Talhões with Bar Chart + Quick Actions */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Talhões with horizontal bars */}
                <div className="p-5 rounded-xl glass-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Top Produtividade
                    </h2>
                    <button
                      onClick={() => setLocation("/talhoes")}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Ver todos <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {topTalhoes.length > 0 ? (
                    <div className="space-y-3">
                      {topTalhoes.map((t, i) => (
                        <button
                          key={t.nome}
                          onClick={() => setLocation(`/talhoes/${t.nome}`)}
                          className="w-full group"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                i === 0
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : i === 1
                                  ? "bg-gray-400/20 text-gray-400"
                                  : i === 2
                                  ? "bg-orange-600/20 text-orange-600"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {i + 1}
                            </span>
                            <span className="font-medium text-sm flex-1 text-left group-hover:text-primary transition-colors">
                              {t.nome}
                            </span>
                            <span className="font-bold text-foreground">
                              {t.produtividade.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              @/ha
                            </span>
                          </div>
                          {/* Bar */}
                          <div className="ml-9 h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                i === 0
                                  ? "bg-yellow-500"
                                  : i === 1
                                  ? "bg-gray-400"
                                  : i === 2
                                  ? "bg-orange-500"
                                  : "bg-primary"
                              )}
                              style={{ width: `${t.percentOfMax}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wheat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum dado disponível</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-5 rounded-xl glass-card">
                  <h2 className="font-semibold mb-4">Acesso Rápido</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLocation("/talhao-stats")}
                      className="p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-colors text-left group"
                    >
                      <BarChart3 className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                      <p className="font-medium text-sm">Estatísticas</p>
                      <p className="text-xs text-muted-foreground">
                        Análise detalhada
                      </p>
                    </button>

                    <button
                      onClick={() => setLocation("/reports")}
                      className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-colors text-left group"
                    >
                      <Calendar className="w-6 h-6 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
                      <p className="font-medium text-sm">Relatórios</p>
                      <p className="text-xs text-muted-foreground">
                        PDF e Excel
                      </p>
                    </button>

                    <button
                      onClick={() => setLocation("/talhoes")}
                      className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 hover:border-green-500/20 transition-colors text-left group"
                    >
                      <MapPin className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                      <p className="font-medium text-sm">Talhões</p>
                      <p className="text-xs text-muted-foreground">Visão geral</p>
                    </button>

                    <button
                      onClick={() => setPerdasModalOpen(true)}
                      className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 transition-colors text-left group"
                    >
                      <AlertTriangle className="w-6 h-6 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                      <p className="font-medium text-sm">Perdas</p>
                      <p className="text-xs text-muted-foreground">
                        {valorEstimado.perdasCampoValorBRL > 0
                          ? `R$ ${(
                              valorEstimado.perdasCampoValorBRL / 1000
                            ).toFixed(0)}k`
                          : "Sem perdas"}
                      </p>
                    </button>
                  </div>
                </div>
              </section>

              {/* Heat Map - Talhões */}
              <section className="p-3 sm:p-5 rounded-xl glass-card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Zap className="w-4 h-4 text-primary" />
                    Mapa de Produtividade
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-red-500/50" />
                      <span>Baixa</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-yellow-500/50" />
                      <span>Média</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-green-500/50" />
                      <span>Alta</span>
                    </div>
                  </div>
                </div>

                {talhoesSafra.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-1.5 sm:gap-2">
                    {heatMapData.map((t) => {
                      // Determinar cor baseada na intensidade
                      const getColor = () => {
                        if (!t.hasData) return "bg-muted/20";
                        if (t.intensity < 33) return "bg-red-500 dark:bg-red-500/40 hover:bg-red-600 dark:hover:bg-red-500/60";
                        if (t.intensity < 66)
                          return "bg-yellow-500 dark:bg-yellow-500/40 hover:bg-yellow-600 dark:hover:bg-yellow-500/60";
                        return "bg-green-500 dark:bg-green-500/40 hover:bg-green-600 dark:hover:bg-green-500/60";
                      };

                      return (
                        <button
                          key={t.nome}
                          onClick={() => setLocation(`/talhoes/${t.nome}`)}
                          className={cn(
                            "aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 relative group",
                            getColor(),
                            t.hasData
                              ? "border border-white/20"
                              : "border border-transparent"
                          )}
                          title={`${t.nome}: ${t.produtividade.toFixed(1)} @/ha`}
                        >
                          <span
                            className={cn(
                              "text-[10px] sm:text-sm font-bold",
                              t.hasData ? "text-white" : "text-muted-foreground"
                            )}
                          >
                            {t.nome}
                          </span>
                          {t.hasData && (
                            <span className="text-[8px] sm:text-[9px] text-white/90">
                              {t.produtividade.toFixed(0)}
                            </span>
                          )}
                          {t.perdas > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-background" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum talhão configurado</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "market" && (
            <div className="space-y-6">
              {/* Cotações com Sparklines */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dólar */}
                <button
                  onClick={() =>
                    setHistoricoModal({
                      open: true,
                      tipo: "dolar",
                      titulo: "Dólar (USD/BRL)",
                      periodo: 30,
                    })
                  }
                  className="p-5 rounded-xl glass-card hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">USD/BRL</p>
                        <p className="text-xs text-muted-foreground">Dólar</p>
                      </div>
                    </div>
                    {cotacaoData?.variacaoDolar !== undefined && (
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center",
                          cotacaoData.variacaoDolar >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {cotacaoData.variacaoDolar >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(cotacaoData.variacaoDolar).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold mb-3">
                    R$ {usdBrl?.toFixed(2) || "-"}
                  </p>
                  {/* Sparkline */}
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={sparklineData.dolar}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </button>

                {/* Pluma */}
                <button
                  onClick={() =>
                    setHistoricoModal({
                      open: true,
                      tipo: "pluma",
                      titulo: "Pluma",
                      periodo: 30,
                    })
                  }
                  className="p-5 rounded-xl glass-card hover:border-purple-500/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Wheat className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pluma</p>
                        <p className="text-xs text-muted-foreground">
                          Preço por @
                        </p>
                      </div>
                    </div>
                    {cotacaoData?.variacaoPluma !== undefined && (
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center",
                          cotacaoData.variacaoPluma >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {cotacaoData.variacaoPluma >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(cotacaoData.variacaoPluma).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold mb-3">
                    R$ {cotacaoPluma.toFixed(2)}
                  </p>
                  {/* Sparkline */}
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={sparklineData.pluma}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#a855f7"
                          strokeWidth={2}
                          dot={false}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </button>

                {/* Caroço */}
                <button
                  onClick={() =>
                    setHistoricoModal({
                      open: true,
                      tipo: "caroco",
                      titulo: "Caroço",
                      periodo: 30,
                    })
                  }
                  className="p-5 rounded-xl glass-card hover:border-orange-500/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Caroço</p>
                        <p className="text-xs text-muted-foreground">
                          Preço por @
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-3">
                    R$ {cotacaoCaroco.toFixed(2)}
                  </p>
                  {/* Sparkline */}
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={sparklineData.caroco}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </button>
              </section>

              {/* Valor por Componente */}
              <section className="p-5 rounded-xl glass-card">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Composição do Valor
                </h2>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Pluma",
                          valor: valorEstimado.valorPlumaBRL / 1000,
                          fill: "#a855f7",
                        },
                        {
                          name: "Caroço",
                          valor: valorEstimado.valorCarocoBRL / 1000,
                          fill: "#f97316",
                        },
                        {
                          name: "Perdas",
                          valor: -valorEstimado.perdasCampoValorBRL / 1000,
                          fill: "#ef4444",
                        },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(v) => `R$ ${v.toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [
                          `R$ ${value.toFixed(0)}k`,
                          "Valor",
                        ]}
                      />
                      <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                        {[
                          { fill: "#a855f7" },
                          { fill: "#f97316" },
                          { fill: "#ef4444" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Alertas de Mercado */}
              {(cotacaoData?.variacaoDolar &&
                Math.abs(cotacaoData.variacaoDolar) > 1) ||
              (cotacaoData?.variacaoPluma &&
                Math.abs(cotacaoData.variacaoPluma) > 2) ? (
                <section className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-500">
                        Alerta de Mercado
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cotacaoData?.variacaoDolar &&
                        Math.abs(cotacaoData.variacaoDolar) > 1
                          ? `O dólar variou ${cotacaoData.variacaoDolar.toFixed(2)}% hoje. `
                          : ""}
                        {cotacaoData?.variacaoPluma &&
                        Math.abs(cotacaoData.variacaoPluma) > 2
                          ? `A pluma variou ${cotacaoData.variacaoPluma.toFixed(2)}% hoje.`
                          : ""}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          )}

          {activeTab === "projections" && (
            <div className="space-y-6">
              {/* Projeção de Valor */}
              <section className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-primary/5 to-transparent border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-semibold">
                    Projeção de Valor Final
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Atual</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      R${" "}
                      {projections.currentValue.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      Projeção Final
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-cyan-400">
                      R${" "}
                      {projections.projectedValue.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Progresso da Colheita
                    </span>
                    <span className="text-foreground font-medium">
                      {projections.completionPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-1000"
                      style={{ width: `${projections.completionPercent}%` }}
                    />
                  </div>
                </div>
              </section>

              {/* Evolução Diária */}
              <section className="p-5 rounded-xl glass-card">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <LineChart className="w-4 h-4 text-primary" />
                  Evolução dos Últimos 14 Dias
                </h2>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyEvolution}>
                      <defs>
                        <linearGradient id="colorFardos" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name === "fardos" ? "Fardos" : "Peso (t)",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="fardos"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorFardos)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Métricas de Projeção */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl glass-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Factory className="w-4 h-4" />
                    <span className="text-xs uppercase">Rendimento</span>
                  </div>
                  <p className="text-2xl font-bold">40%</p>
                  <p className="text-xs text-muted-foreground">
                    Pluma extraída
                  </p>
                </div>

                <div className="p-4 rounded-xl glass-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs uppercase">Peso Médio</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {produtividade.pesoMedioFardo > 0
                      ? (produtividade.pesoMedioFardo / 1000).toFixed(2)
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">ton/fardo</p>
                </div>

                <div className="p-4 rounded-xl glass-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs uppercase">Meta</span>
                  </div>
                  <p className="text-2xl font-bold">350</p>
                  <p className="text-xs text-muted-foreground">@/ha objetivo</p>
                </div>

                <div className="p-4 rounded-xl glass-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs uppercase">Tendência</span>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      produtividade.diferencaPercent >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {produtividade.diferencaPercent >= 0 ? "+" : ""}
                    {produtividade.diferencaPercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">vs previsto</p>
                </div>
              </section>
            </div>
          )}
        </div>
      </PageContent>

      {/* Modal de Perdas */}
      <Dialog open={perdasModalOpen} onOpenChange={setPerdasModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Perdas por Talhão
            </DialogTitle>
            <DialogDescription>
              Total: R${" "}
              {valorEstimado.perdasCampoValorBRL.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {perdasPorTalhaoComValor.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma perda registrada</p>
              </div>
            ) : (
              perdasPorTalhaoComValor.map((perda) => (
                <div
                  key={perda.talhao}
                  className="p-4 rounded-lg border border-border/50 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{perda.talhao}</span>
                      <span className="text-xs text-muted-foreground">
                        ({perda.hectares.toFixed(0)} ha)
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">
                        R${" "}
                        {perda.valorBRL.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {perda.arrobasHa.toFixed(1)} @/ha
                      </p>
                    </div>
                  </div>
                  {perda.detalhes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {perda.detalhes.map((d: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">{d.motivo}</span>
                          <span>{parseFloat(d.arrobasHa).toFixed(1)} @/ha</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de KPI Details */}
      <Dialog
        open={kpiModal.open}
        onOpenChange={(open) => setKpiModal({ open, tipo: null })}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {kpiModal.tipo === "fardos" && (
                <>
                  <Package className="w-5 h-5 text-primary" />
                  Detalhes de Fardos
                </>
              )}
              {kpiModal.tipo === "peso" && (
                <>
                  <Scale className="w-5 h-5 text-orange-500" />
                  Detalhes de Peso
                </>
              )}
              {kpiModal.tipo === "produtividade" && (
                <>
                  <Target className="w-5 h-5 text-cyan-500" />
                  Detalhes de Produtividade
                </>
              )}
              {kpiModal.tipo === "area" && (
                <>
                  <MapPin className="w-5 h-5 text-green-500" />
                  Detalhes de Área
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {kpiModal.tipo === "fardos" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold">{balesByPeriod.today}</p>
                    <p className="text-xs text-muted-foreground">Hoje</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold">{balesByPeriod.yesterday}</p>
                    <p className="text-xs text-muted-foreground">Ontem</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 text-center">
                    <p className="text-2xl font-bold">{balesByPeriod.week}</p>
                    <p className="text-xs text-muted-foreground">Esta semana</p>
                  </div>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyEvolution.slice(-7)}>
                      <Area
                        type="monotone"
                        dataKey="fardos"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {kpiModal.tipo === "peso" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Peso Total</p>
                    <p className="text-2xl font-bold">
                      {totaisCarregamentos.totalPesoToneladas.toFixed(0)}t
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Carregamentos</p>
                    <p className="text-2xl font-bold">
                      {totaisCarregamentos.totalCarregamentos}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Peso Médio/Fardo</p>
                    <p className="text-2xl font-bold">
                      {produtividade.pesoMedioFardo > 0
                        ? (produtividade.pesoMedioFardo / 1000).toFixed(2)
                        : "-"}
                      t
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Em Arrobas</p>
                    <p className="text-2xl font-bold">
                      {valorEstimado.arrobasBruto.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              </>
            )}

            {kpiModal.tipo === "produtividade" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Prevista</p>
                    <p className="text-2xl font-bold">
                      {produtividade.prevista.toFixed(1)} @/ha
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Real</p>
                    <p className="text-2xl font-bold">
                      {produtividade.temDadosReais
                        ? `${produtividade.real.toFixed(1)} @/ha`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">
                    Variação Real vs Prevista
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          produtividade.diferencaPercent >= 0
                            ? "bg-green-500"
                            : "bg-red-500"
                        )}
                        style={{
                          width: `${Math.min(
                            Math.abs(produtividade.diferencaPercent),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-bold",
                        produtividade.diferencaPercent >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      {produtividade.diferencaPercent >= 0 ? "+" : ""}
                      {produtividade.diferencaPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            )}

            {kpiModal.tipo === "area" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{totalHectares.toFixed(0)} ha</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Talhões</p>
                    <p className="text-2xl font-bold">{talhoesSafra.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Talhões Ativos</p>
                    <p className="text-2xl font-bold">
                      {new Set(bales.map((b) => b.talhao)).size}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Média/Talhão</p>
                    <p className="text-2xl font-bold">
                      {talhoesSafra.length > 0
                        ? (totalHectares / talhoesSafra.length).toFixed(1)
                        : "-"}{" "}
                      ha
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico */}
      <Dialog
        open={historicoModal.open}
        onOpenChange={(open) => setHistoricoModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {historicoModal.titulo}
            </DialogTitle>
          </DialogHeader>

          {/* Filtros */}
          <div className="flex items-center justify-center gap-2">
            {periodos.map((p) => (
              <button
                key={p.dias}
                onClick={() =>
                  setHistoricoModal((prev) => ({ ...prev, periodo: p.dias }))
                }
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-all",
                  historicoModal.periodo === p.dias
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Gráfico */}
          <div className="mt-4">
            {historicoLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : historicoData?.historico?.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoData.historico}>
                    <defs>
                      <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="data"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        historicoModal.tipo === "dolar"
                          ? `R$ ${value.toFixed(4)}`
                          : `R$ ${value.toFixed(2)}/@`,
                        "Valor",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Dados não disponíveis</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
