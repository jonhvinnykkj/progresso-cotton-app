import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AnimatedCounter } from "@/components/animated-counter";
import { BaleCard } from "@/components/bale-card";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/hooks/use-settings";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import type { Bale, BaleStatus } from "@shared/schema";
import {
  Package,
  Truck,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  MapPin,
  Target,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Wheat,
  AlertTriangle,
  DollarSign,
  Eye,
  Clock,
  BarChart3,
  Download,
  Plus,
  X,
  ChevronRight,
  Calendar,
  Activity,
  PieChart,
  FileText,
  Filter,
  SortAsc,
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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

type DetailTab = "overview" | "history" | "analytics" | "bales";

export default function TalhaoDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/talhoes/:id");
  const talhaoId = params?.id ? decodeURIComponent(params.id) : null;

  useAuth();

  // State
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BaleStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "numero">("date");
  const [addLossModalOpen, setAddLossModalOpen] = useState(false);

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

  // Buscar info do talhão
  const talhaoInfo = talhoesSafra.find((t) => t.nome === talhaoId);
  const hectares = talhaoInfo
    ? parseFloat(talhaoInfo.hectares.replace(",", "."))
    : 0;

  // Query de todos os fardos
  const { data: allBales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
  });

  // Filtrar fardos do talhão
  const balesTalhao = useMemo(() => {
    return allBales.filter((b) => b.talhao === talhaoId);
  }, [allBales, talhaoId]);

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

  // Query de perdas do talhão
  const { data: perdasTalhao = [] } = useQuery<any[]>({
    queryKey: ["/api/perdas", selectedSafra, talhaoId],
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
      const allPerdas = await response.json();
      return allPerdas.filter((p: any) => p.talhao === talhaoId);
    },
    enabled: !!selectedSafra && !!talhaoId,
    staleTime: 60000,
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
        : `/api/cotacao-algodao`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { pluma: 140, caroco: 38 };
      return response.json();
    },
    staleTime: 300000,
  });

  const cotacaoPluma = cotacaoData?.pluma || 140;
  const cotacaoCaroco = cotacaoData?.caroco || 38;
  const valorMedioPorArroba = (cotacaoPluma * 0.4 + cotacaoCaroco * 0.57) / 0.97;

  // Calcular total de perdas do talhão
  const perdasStats = useMemo(() => {
    const totalArrobasHa = perdasTalhao.reduce(
      (acc: number, p: any) => acc + parseFloat(p.arrobasHa || "0"),
      0
    );
    const valorTotalPerdas = totalArrobasHa * hectares * valorMedioPorArroba;

    // Agrupar por motivo para o gráfico de pizza
    const byMotivo: Record<string, number> = {};
    perdasTalhao.forEach((p: any) => {
      const motivo = p.motivo || "Não especificado";
      const valor = parseFloat(p.arrobasHa || "0") * hectares * valorMedioPorArroba;
      byMotivo[motivo] = (byMotivo[motivo] || 0) + valor;
    });

    const pieData = Object.entries(byMotivo).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      totalArrobasHa,
      valorTotalPerdas,
      quantidade: perdasTalhao.length,
      pieData,
    };
  }, [perdasTalhao, hectares, valorMedioPorArroba]);

  // Stats do talhão
  const stats = useMemo(() => {
    const total = balesTalhao.length;
    const campo = balesTalhao.filter((b) => b.status === "campo").length;
    const patio = balesTalhao.filter((b) => b.status === "patio").length;
    const beneficiado = balesTalhao.filter(
      (b) => b.status === "beneficiado"
    ).length;

    // Produtividade prevista
    const pesoEstimado = total * 2000;
    const produtividadePrevista =
      hectares > 0 ? pesoEstimado / hectares / 15 : 0;

    // Produtividade real
    const pesoBruto = pesoBrutoTotais.find((p) => p.talhao === talhaoId);
    const pesoBrutoTotal = pesoBruto?.pesoBrutoTotal || 0;
    const qtdCarregamentos = pesoBruto?.quantidadeCarregamentos || 0;
    const pesoMedioFardo = total > 0 ? pesoBrutoTotal / total : 0;
    const produtividadeReal =
      hectares > 0 && pesoBrutoTotal > 0
        ? pesoBrutoTotal / hectares / 15
        : 0;

    const temDadosReais = pesoBrutoTotal > 0 && total > 0;
    const diferencaPercent =
      produtividadePrevista > 0 && produtividadeReal > 0
        ? ((produtividadeReal - produtividadePrevista) / produtividadePrevista) *
          100
        : 0;

    // Fardos de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fardosHoje = balesTalhao.filter((b) => {
      const d = new Date(b.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    // Valor estimado
    const arrobasPluma = (pesoBrutoTotal / 15) * 0.4;
    const arrobasCaroco = (pesoBrutoTotal / 15) * 0.57;
    const valorEstimado = arrobasPluma * cotacaoPluma + arrobasCaroco * cotacaoCaroco;

    // Performance score
    const maxProd = 350;
    const prodAtual = temDadosReais ? produtividadeReal : produtividadePrevista;
    const performanceScore = Math.min((prodAtual / maxProd) * 100, 100);

    return {
      total,
      campo,
      patio,
      beneficiado,
      produtividadePrevista,
      produtividadeReal,
      temDadosReais,
      diferencaPercent,
      pesoMedioFardo,
      qtdCarregamentos,
      pesoBrutoTotal,
      fardosHoje,
      valorEstimado,
      performanceScore,
    };
  }, [balesTalhao, hectares, pesoBrutoTotais, talhaoId, cotacaoPluma, cotacaoCaroco]);

  // Daily evolution (últimos 14 dias)
  const dailyEvolution = useMemo(() => {
    const days: { date: string; fardos: number; acumulado: number }[] = [];
    let acumulado = 0;

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayBales = balesTalhao.filter((b) => {
        const bd = new Date(b.createdAt);
        bd.setHours(0, 0, 0, 0);
        return bd.getTime() === d.getTime();
      });

      acumulado += dayBales.length;

      days.push({
        date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        fardos: dayBales.length,
        acumulado,
      });
    }

    return days;
  }, [balesTalhao]);

  // Timeline de eventos
  const timeline = useMemo(() => {
    const events: {
      id: string;
      type: "bale" | "transport" | "loss";
      title: string;
      description: string;
      date: Date;
      icon: "package" | "truck" | "alert";
    }[] = [];

    // Adicionar criação de fardos (últimos 10)
    balesTalhao
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .forEach((b) => {
        events.push({
          id: `bale-${b.id}`,
          type: "bale",
          title: `Fardo ${b.numero || b.id.slice(-6)} criado`,
          description: `Status: ${b.status}`,
          date: new Date(b.createdAt),
          icon: "package",
        });
      });

    // Adicionar perdas
    perdasTalhao.forEach((p: any) => {
      events.push({
        id: `loss-${p.id}`,
        type: "loss",
        title: `Perda: ${p.motivo || "Não especificado"}`,
        description: `${parseFloat(p.arrobasHa || "0").toFixed(1)} @/ha`,
        date: new Date(p.createdAt),
        icon: "alert",
      });
    });

    // Ordenar por data
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [balesTalhao, perdasTalhao]);

  // Comparação com média geral
  const comparisonData = useMemo(() => {
    // Calcular média geral de todos os talhões
    let totalProdAll = 0;
    let countWithData = 0;

    talhoesSafra.forEach((t) => {
      const tBales = allBales.filter((b) => b.talhao === t.nome);
      const tPeso = pesoBrutoTotais.find((p) => p.talhao === t.nome);
      const tHectares = parseFloat(t.hectares.replace(",", ".")) || 0;

      if (tPeso && tPeso.pesoBrutoTotal > 0 && tHectares > 0) {
        const prod = tPeso.pesoBrutoTotal / tHectares / 15;
        totalProdAll += prod;
        countWithData++;
      }
    });

    const mediaGeral = countWithData > 0 ? totalProdAll / countWithData : 0;
    const talhaoValue = stats.temDadosReais
      ? stats.produtividadeReal
      : stats.produtividadePrevista;
    const diffFromMedia = mediaGeral > 0 ? ((talhaoValue - mediaGeral) / mediaGeral) * 100 : 0;

    return {
      mediaGeral,
      talhaoValue,
      diffFromMedia,
      meta: 350,
    };
  }, [talhoesSafra, allBales, pesoBrutoTotais, stats]);

  // Filtrar fardos
  const filteredBales = useMemo(() => {
    let filtered = balesTalhao.filter((bale) => {
      const matchesSearch =
        bale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bale.numero && bale.numero.toString().includes(searchQuery));

      const matchesStatus =
        statusFilter === "all" || bale.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    if (sortBy === "date") {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      filtered.sort((a, b) => (b.numero || 0) - (a.numero || 0));
    }

    return filtered;
  }, [balesTalhao, searchQuery, statusFilter, sortBy]);

  // Tabs
  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: Eye },
    { id: "history" as const, label: "Histórico", icon: Clock },
    { id: "analytics" as const, label: "Análises", icon: BarChart3 },
    { id: "bales" as const, label: "Fardos", icon: Package },
  ];

  // Pie chart colors
  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  // Gauge component
  const GaugeChart = ({
    value,
    max,
    label,
    color,
  }: {
    value: number;
    max: number;
    label: string;
    color: string;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const rotation = (percentage / 100) * 180 - 90;

    return (
      <div className="relative w-40 h-24 mx-auto">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 1.26} 126`}
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="20"
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 50, 50)`}
          />
          <circle cx="50" cy="50" r="4" fill="hsl(var(--foreground))" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <p className="text-2xl font-bold">{value.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  };

  if (!talhaoInfo) {
    return (
      <Page>
        <PageContent>
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h2 className="text-xl font-semibold mb-2">Talhão não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O talhão "{talhaoId}" não existe.
            </p>
            <Button onClick={() => setLocation("/talhoes")}>
              Voltar para Talhões
            </Button>
          </div>
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageContent className="max-w-7xl">
        <div className="space-y-6">
          {/* Hero Header */}
          <section className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              {/* Back button and title */}
              <div className="flex items-start gap-4 mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLocation("/talhoes")}
                  className="rounded-xl bg-background/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/30 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {talhaoId}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">Talhão {talhaoInfo.nome}</h1>
                      <p className="text-muted-foreground">
                        {hectares.toFixed(1)} hectares • Safra {safraAtiva?.nome}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddLossModalOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Perda
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Hero KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-background/50 backdrop-blur">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Package className="w-4 h-4" />
                    <span className="text-xs uppercase">Fardos</span>
                  </div>
                  <p className="text-3xl font-bold">
                    <AnimatedCounter value={stats.total} />
                  </p>
                  {stats.fardosHoje > 0 && (
                    <p className="text-xs text-green-500">+{stats.fardosHoje} hoje</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-background/50 backdrop-blur">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs uppercase">Produtividade</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {stats.temDadosReais
                        ? stats.produtividadeReal.toFixed(1)
                        : stats.produtividadePrevista > 0
                        ? stats.produtividadePrevista.toFixed(1)
                        : "-"}
                    </p>
                    {stats.temDadosReais && (
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center",
                          stats.diferencaPercent >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {stats.diferencaPercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(stats.diferencaPercent).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@/ha</p>
                </div>

                <div className="p-4 rounded-xl bg-background/50 backdrop-blur">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs uppercase">Peso Bruto</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {stats.pesoBrutoTotal > 0
                      ? `${(stats.pesoBrutoTotal / 1000).toFixed(1)}t`
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.qtdCarregamentos} carregamentos
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background/50 backdrop-blur">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs uppercase">Valor Est.</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {stats.valorEstimado > 0
                      ? `R$ ${(stats.valorEstimado / 1000).toFixed(0)}k`
                      : "-"}
                  </p>
                  {perdasStats.valorTotalPerdas > 0 && (
                    <p className="text-xs text-red-500">
                      -{(perdasStats.valorTotalPerdas / 1000).toFixed(0)}k perdas
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

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

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Pipeline */}
              <section className="p-5 rounded-xl bg-card border border-border/50">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  Pipeline de Produção
                </h2>

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setActiveTab("bales");
                      setStatusFilter("campo");
                    }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-center"
                  >
                    <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{stats.campo}</p>
                    <p className="text-xs text-muted-foreground">Campo</p>
                    <p className="text-xs text-primary mt-1">
                      {stats.total > 0
                        ? ((stats.campo / stats.total) * 100).toFixed(0)
                        : 0}
                      %
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("bales");
                      setStatusFilter("patio");
                    }}
                    className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-all text-center"
                  >
                    <Truck className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-3xl font-bold">{stats.patio}</p>
                    <p className="text-xs text-muted-foreground">Pátio</p>
                    <p className="text-xs text-orange-500 mt-1">
                      {stats.total > 0
                        ? ((stats.patio / stats.total) * 100).toFixed(0)
                        : 0}
                      %
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("bales");
                      setStatusFilter("beneficiado");
                    }}
                    className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-center"
                  >
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
                    <p className="text-3xl font-bold">{stats.beneficiado}</p>
                    <p className="text-xs text-muted-foreground">Beneficiado</p>
                    <p className="text-xs text-cyan-500 mt-1">
                      {stats.total > 0
                        ? ((stats.beneficiado / stats.total) * 100).toFixed(0)
                        : 0}
                      %
                    </p>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">
                      Progresso de beneficiamento
                    </span>
                    <span className="font-semibold">
                      {stats.total > 0
                        ? ((stats.beneficiado / stats.total) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted/30 overflow-hidden flex">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${
                          stats.total > 0 ? (stats.campo / stats.total) * 100 : 0
                        }%`,
                      }}
                    />
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{
                        width: `${
                          stats.total > 0 ? (stats.patio / stats.total) * 100 : 0
                        }%`,
                      }}
                    />
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{
                        width: `${
                          stats.total > 0
                            ? (stats.beneficiado / stats.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Losses */}
              {perdasStats.quantidade > 0 && (
                <section className="p-5 rounded-xl bg-card border border-red-500/20">
                  <h2 className="font-semibold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Perdas Registradas
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {perdasStats.quantidade} registros
                    </span>
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-red-500/10">
                      <p className="text-sm text-muted-foreground mb-1">
                        Total em @/ha
                      </p>
                      <p className="text-2xl font-bold text-red-500">
                        {perdasStats.totalArrobasHa.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10">
                      <p className="text-sm text-muted-foreground mb-1">
                        Valor Perdido
                      </p>
                      <p className="text-2xl font-bold text-red-500">
                        R${" "}
                        {perdasStats.valorTotalPerdas.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Losses list */}
                  <div className="space-y-2">
                    {perdasTalhao.slice(0, 3).map((perda: any, index: number) => (
                      <div
                        key={perda.id || index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div>
                          <p className="font-medium">
                            {perda.motivo || "Não especificado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(perda.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-500">
                            {parseFloat(perda.arrobasHa || "0").toFixed(2)} @/ha
                          </p>
                        </div>
                      </div>
                    ))}
                    {perdasTalhao.length > 3 && (
                      <button
                        onClick={() => setActiveTab("analytics")}
                        className="w-full p-2 text-sm text-primary hover:underline"
                      >
                        Ver todas ({perdasTalhao.length})
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Quick Stats */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Peso Médio/Fardo</p>
                  <p className="text-xl font-bold">
                    {stats.pesoMedioFardo > 0
                      ? `${(stats.pesoMedioFardo / 1000).toFixed(2)}t`
                      : "-"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Performance</p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      stats.performanceScore >= 66
                        ? "text-green-500"
                        : stats.performanceScore >= 33
                        ? "text-yellow-500"
                        : "text-red-500"
                    )}
                  >
                    {stats.performanceScore.toFixed(0)}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Carregamentos</p>
                  <p className="text-xl font-bold">{stats.qtdCarregamentos}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Fardos/ha</p>
                  <p className="text-xl font-bold">
                    {hectares > 0 ? (stats.total / hectares).toFixed(1) : "-"}
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <section className="p-5 rounded-xl bg-card border border-border/50">
                <h2 className="font-semibold flex items-center gap-2 mb-6">
                  <Clock className="w-4 h-4 text-primary" />
                  Timeline de Eventos
                </h2>

                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhum evento registrado</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    <div className="space-y-4">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative flex gap-4 pl-10">
                          {/* Icon */}
                          <div
                            className={cn(
                              "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
                              event.type === "bale"
                                ? "bg-primary/20"
                                : event.type === "loss"
                                ? "bg-red-500/20"
                                : "bg-orange-500/20"
                            )}
                          >
                            {event.icon === "package" && (
                              <Package className="w-4 h-4 text-primary" />
                            )}
                            {event.icon === "truck" && (
                              <Truck className="w-4 h-4 text-orange-500" />
                            )}
                            {event.icon === "alert" && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {event.date.toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Evolution Chart */}
              <section className="p-5 rounded-xl bg-card border border-border/50">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolução de Fardos (14 dias)
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
                      />
                      <Area
                        type="monotone"
                        dataKey="fardos"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorFardos)"
                        name="Fardos/dia"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Comparison with average */}
              <section className="p-5 rounded-xl bg-card border border-border/50">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-primary" />
                  Comparação de Produtividade
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <GaugeChart
                      value={comparisonData.talhaoValue}
                      max={comparisonData.meta}
                      label="Este Talhão"
                      color="hsl(var(--primary))"
                    />
                  </div>
                  <div>
                    <GaugeChart
                      value={comparisonData.mediaGeral}
                      max={comparisonData.meta}
                      label="Média Geral"
                      color="#6b7280"
                    />
                  </div>
                  <div>
                    <GaugeChart
                      value={comparisonData.meta}
                      max={comparisonData.meta}
                      label="Meta"
                      color="#22c55e"
                    />
                  </div>
                </div>

                {comparisonData.diffFromMedia !== 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">
                      Este talhão está{" "}
                      <span
                        className={cn(
                          "font-bold",
                          comparisonData.diffFromMedia >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        )}
                      >
                        {comparisonData.diffFromMedia >= 0 ? "+" : ""}
                        {comparisonData.diffFromMedia.toFixed(1)}%
                      </span>{" "}
                      em relação à média geral
                    </p>
                  </div>
                )}
              </section>

              {/* Losses Pie Chart */}
              {perdasStats.pieData.length > 0 && (
                <section className="p-5 rounded-xl bg-card border border-border/50">
                  <h2 className="font-semibold flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-red-500" />
                    Distribuição de Perdas por Motivo
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={perdasStats.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {perdasStats.pieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [
                              `R$ ${value.toLocaleString("pt-BR", {
                                maximumFractionDigits: 0,
                              })}`,
                              "Valor",
                            ]}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {perdasStats.pieData.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="font-medium">
                            R${" "}
                            {item.value.toLocaleString("pt-BR", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "bales" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por ID ou número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as BaleStatus | "all")
                    }
                    className="px-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm"
                  >
                    <option value="all">Todos os status</option>
                    <option value="campo">Campo</option>
                    <option value="patio">Pátio</option>
                    <option value="beneficiado">Beneficiado</option>
                  </select>

                  <button
                    onClick={() => setSortBy(sortBy === "date" ? "numero" : "date")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm"
                  >
                    <SortAsc className="w-4 h-4" />
                    {sortBy === "date" ? "Data" : "Número"}
                  </button>
                </div>
              </div>

              {/* Active filters */}
              {(statusFilter !== "all" || searchQuery) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filtros:</span>
                  {statusFilter !== "all" && (
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {statusFilter}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      "{searchQuery}"
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Count */}
              <p className="text-sm text-muted-foreground">
                {filteredBales.length} de {balesTalhao.length} fardos
              </p>

              {/* Bales grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-xl bg-card border border-border/50 animate-pulse"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted mb-4" />
                      <div className="h-4 w-3/4 rounded bg-muted mb-2" />
                      <div className="h-8 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : filteredBales.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-card border border-border/50">
                  <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "Nenhum fardo encontrado com os filtros aplicados"
                      : "Nenhum fardo cadastrado neste talhão"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBales.map((bale, index) => (
                    <div
                      key={bale.id}
                      className="animate-fade-in-up"
                      style={{
                        animationDelay: `${Math.min(index * 0.03, 0.3)}s`,
                      }}
                    >
                      <BaleCard
                        bale={bale}
                        onClick={() =>
                          setLocation(`/bale/${encodeURIComponent(bale.id)}`)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PageContent>

      {/* Add Loss Modal Placeholder */}
      <Dialog open={addLossModalOpen} onOpenChange={setAddLossModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Registrar Perda - Talhão {talhaoId}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>Use a aba "Campo" para registrar perdas</p>
            <Button
              className="mt-4"
              onClick={() => {
                setAddLossModalOpen(false);
                setLocation("/campo");
              }}
            >
              Ir para Campo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
