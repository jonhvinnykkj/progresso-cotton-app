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
  Sun,
  Calendar,
  Clock,
  MapPin,
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
} from "recharts";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  useRealtime(isAuthenticated);

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
  const { data: perdasPorTalhao = [] } = useQuery<{ talhao: string; totalPerdas: number; quantidadeRegistros: number }[]>({
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

  // Estado para modais
  const [perdasModalOpen, setPerdasModalOpen] = useState(false);
  const [historicoModal, setHistoricoModal] = useState<{
    open: boolean;
    tipo: 'dolar' | 'algodao' | 'pluma' | 'caroco' | null;
    titulo: string;
    periodo: number;
  }>({ open: false, tipo: null, titulo: '', periodo: 30 });

  // Cálculos principais
  const totalHectares = useMemo(() =>
    talhoesSafra.reduce((acc, t) => acc + parseFloat(t.hectares.replace(",", ".")), 0)
  , [talhoesSafra]);

  const totaisCarregamentos = useMemo(() => {
    const totalPesoKg = pesoBrutoTotais.reduce((acc, item) => acc + (Number(item.pesoBrutoTotal) || 0), 0);
    const totalCarregamentos = pesoBrutoTotais.reduce((acc, item) => acc + (Number(item.quantidadeCarregamentos) || 0), 0);
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
    const prevista = totalHectares > 0 ? (pesoEstimado / totalHectares) / 15 : 0;
    const pesoMedioFardo = totalFardos > 0 ? totaisCarregamentos.totalPesoKg / totalFardos : 0;
    const real = totalHectares > 0 && totaisCarregamentos.totalPesoKg > 0
      ? (totaisCarregamentos.totalPesoKg / totalHectares) / 15 : 0;
    const diferencaPercent = prevista > 0 ? ((real - prevista) / prevista) * 100 : 0;
    return { prevista, real, diferencaPercent, pesoMedioFardo, temDadosReais: totaisCarregamentos.totalPesoKg > 0 };
  }, [stats, totalHectares, totaisCarregamentos]);

  // Fardos de hoje
  const balesToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bales.filter((b) => {
      const baleDate = new Date(b.createdAt);
      baleDate.setHours(0, 0, 0, 0);
      return baleDate.getTime() === today.getTime();
    }).length;
  }, [bales]);

  const progressPercent = stats?.total ? ((stats.beneficiado / stats.total) * 100) : 0;

  // Saudação e data
  const { greeting, currentDate, currentTime } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Boa noite";
    if (hour < 12) greeting = "Bom dia";
    else if (hour < 18) greeting = "Boa tarde";

    return {
      greeting,
      currentDate: now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      currentTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
      const url = API_URL ? `${API_URL}/api/cotacao-algodao` : '/api/cotacao-algodao';
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return { pluma: 140, caroco: 38, dataAtualizacao: new Date().toISOString(), fonte: 'fallback' };
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
    const pesoArrobasPluma = pesoArrobasBruto * 0.40;
    const pesoArrobasCaroco = pesoArrobasBruto * 0.57;

    const valorPlumaBRL = pesoArrobasPluma * cotacaoPluma;
    const valorCarocoBRL = pesoArrobasCaroco * cotacaoCaroco;
    const valorTotalBRL = valorPlumaBRL + valorCarocoBRL;

    const valorMedioPorArroba = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;

    let perdasCampoArrobasTotais = 0;
    perdasPorTalhao.forEach(p => {
      const talhaoInfo = talhoesSafra.find(t => t.nome === p.talhao);
      const hectaresTalhao = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
      perdasCampoArrobasTotais += p.totalPerdas * hectaresTalhao;
    });
    const perdasCampoValorBRL = perdasCampoArrobasTotais * valorMedioPorArroba;

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
    };
  }, [totaisCarregamentos.totalPesoKg, cotacaoPluma, cotacaoCaroco, perdasPorTalhao, talhoesSafra, totalPerdasArrobasHa]);

  // Perdas por talhão com valor
  const perdasPorTalhaoComValor = useMemo(() => {
    const valorMedio = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;
    return perdasPorTalhao.map(p => {
      const talhaoInfo = talhoesSafra.find(t => t.nome === p.talhao);
      const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
      const arrobasTotais = p.totalPerdas * hectares;
      const valorBRL = arrobasTotais * valorMedio;
      const detalhes = perdasDetalhadas.filter(pd => pd.talhao === p.talhao);
      return { talhao: p.talhao, arrobasHa: p.totalPerdas, hectares, arrobasTotais, valorBRL, detalhes };
    }).sort((a, b) => b.valorBRL - a.valorBRL);
  }, [perdasPorTalhao, talhoesSafra, cotacaoPluma, cotacaoCaroco, perdasDetalhadas]);

  // Top talhões
  const topTalhoes = useMemo(() => {
    return talhoesSafra.map(t => {
      const fardos = bales.filter(b => b.talhao === t.nome).length;
      const hectares = parseFloat(t.hectares.replace(",", ".")) || 0;
      const peso = pesoBrutoTotais.find(p => p.talhao === t.nome)?.pesoBrutoTotal || 0;
      const produtividade = hectares > 0 && peso > 0 ? (peso / hectares) / 15 : 0;
      return { nome: t.nome, fardos, hectares, peso, produtividade };
    })
    .filter(t => t.fardos > 0)
    .sort((a, b) => b.produtividade - a.produtividade)
    .slice(0, 5);
  }, [talhoesSafra, bales, pesoBrutoTotais]);

  // Histórico functions
  const periodos = [
    { label: '7D', dias: 7 },
    { label: '30D', dias: 30 },
    { label: '6M', dias: 180 },
    { label: '1A', dias: 365 },
  ];

  const gerarHistoricoLocal = (tipo: string, dias: number) => {
    const historico = [];
    const pontos = Math.min(dias, 30);
    const valorBase = tipo === 'dolar' ? (cotacaoData?.usdBrl || 5.5) :
                      tipo === 'algodao' ? (cotacaoData?.cottonUSD || 70) :
                      tipo === 'caroco' ? cotacaoCaroco : cotacaoPluma;

    for (let i = pontos - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variacao = (Math.random() - 0.5) * 0.1 * valorBase;
      historico.push({ data: date.toISOString(), valor: valorBase + variacao });
    }
    return { tipo, historico, fonte: 'local' };
  };

  const { data: historicoData, isLoading: historicoLoading } = useQuery({
    queryKey: ["/api/cotacao-algodao/historico", historicoModal.tipo, historicoModal.periodo],
    queryFn: async () => {
      const tipo = historicoModal.tipo;
      const dias = historicoModal.periodo;
      if (!tipo) return null;

      const url = API_URL
        ? `${API_URL}/api/cotacao-algodao/historico?tipo=${tipo}&dias=${dias}`
        : `/api/cotacao-algodao/historico?tipo=${tipo}&dias=${dias}`;

      try {
        const response = await fetch(url, { headers: getAuthHeaders(), credentials: "include" });
        if (!response.ok) return gerarHistoricoLocal(tipo, dias);
        const data = await response.json();
        if (!data.historico || data.historico.length === 0) return gerarHistoricoLocal(tipo, dias);
        return data;
      } catch {
        return gerarHistoricoLocal(tipo, dias);
      }
    },
    enabled: historicoModal.open && !!historicoModal.tipo,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Page>
      <PageContent className="max-w-6xl">
        <div className="space-y-8">

          {/* Header - Minimalista */}
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mt-1">
                {greeting}, {user?.displayName?.split(' ')[0] || user?.username}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Leaf className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Safra {safraAtiva?.nome || '-'}</span>
              </div>
            </div>
          </header>

          {/* Hero Value Card */}
          {totaisCarregamentos.totalPesoKg > 0 && (
            <section className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-green-950/50 border border-emerald-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                <p className="text-emerald-300/70 text-sm font-medium mb-2">Valor Líquido Estimado</p>
                <div className="flex flex-wrap items-baseline gap-3 mb-4">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    R$ {valorEstimado.valorLiquidoBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                  {usdBrl > 0 && (
                    <span className="text-lg text-emerald-300/60">
                      US$ {(valorEstimado.valorLiquidoBRL / usdBrl).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>

                {/* Breakdown inline */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-white/70">Pluma</span>
                    <span className="text-white font-medium">R$ {(valorEstimado.valorPlumaBRL / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-white/70">Caroço</span>
                    <span className="text-white font-medium">R$ {(valorEstimado.valorCarocoBRL / 1000).toFixed(0)}k</span>
                  </div>
                  {valorEstimado.perdasCampoValorBRL > 0 && (
                    <button
                      onClick={() => setPerdasModalOpen(true)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-white/70">Perdas</span>
                      <span className="text-red-300 font-medium">-R$ {(valorEstimado.perdasCampoValorBRL / 1000).toFixed(0)}k</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* KPIs Grid - Clean */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Fardos */}
            <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Package className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Fardos</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={stats?.total || 0} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                +{balesToday} hoje
              </p>
            </div>

            {/* Peso */}
            <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Scale className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Peso Total</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {totaisCarregamentos.totalPesoToneladas > 0
                  ? `${totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}t`
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totaisCarregamentos.totalCarregamentos} carregamentos
              </p>
            </div>

            {/* Produtividade */}
            <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Target className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Produtividade</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {produtividade.temDadosReais ? produtividade.real.toFixed(1) : produtividade.prevista.toFixed(1)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">@/ha</span>
                {produtividade.temDadosReais && produtividade.prevista > 0 && (
                  <span className={cn(
                    "text-xs font-medium flex items-center",
                    produtividade.diferencaPercent >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {produtividade.diferencaPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(produtividade.diferencaPercent).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Área */}
            <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-green-500/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Área Total</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {totalHectares.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                hectares em {talhoesSafra.length} talhões
              </p>
            </div>
          </section>

          {/* Status Pipeline + Cotações */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Pipeline - 3 cols */}
            <div className="lg:col-span-3 p-5 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Pipeline
                </h2>
                <span className="text-sm text-muted-foreground">{progressPercent.toFixed(0)}% concluído</span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 rounded-full bg-muted/30 overflow-hidden mb-6">
                <div className="h-full flex">
                  <div
                    className="bg-primary transition-all duration-500"
                    style={{ width: `${stats?.total ? (stats.campo / stats.total) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-orange-500 transition-all duration-500"
                    style={{ width: `${stats?.total ? (stats.patio / stats.total) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-cyan-500 transition-all duration-500"
                    style={{ width: `${stats?.total ? (stats.beneficiado / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Status Items */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Package className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.campo || 0}</p>
                  <p className="text-xs text-muted-foreground">Campo</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <Truck className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.patio || 0}</p>
                  <p className="text-xs text-muted-foreground">Pátio</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <CheckCircle className="w-5 h-5 text-cyan-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stats?.beneficiado || 0}</p>
                  <p className="text-xs text-muted-foreground">Beneficiado</p>
                </div>
              </div>
            </div>

            {/* Cotações - 2 cols */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Cotações
                </h2>
                <span className="text-[10px] text-muted-foreground uppercase">Tempo real</span>
              </div>

              <div className="space-y-3">
                {/* Dólar */}
                <button
                  onClick={() => setHistoricoModal({ open: true, tipo: 'dolar', titulo: 'Dólar', periodo: 30 })}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-sm font-medium">USD/BRL</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">R$ {usdBrl?.toFixed(2) || '-'}</p>
                    {cotacaoData?.variacaoDolar !== undefined && (
                      <p className={cn("text-xs", cotacaoData.variacaoDolar >= 0 ? "text-green-500" : "text-red-500")}>
                        {cotacaoData.variacaoDolar >= 0 ? '+' : ''}{cotacaoData.variacaoDolar.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </button>

                {/* Pluma */}
                <button
                  onClick={() => setHistoricoModal({ open: true, tipo: 'pluma', titulo: 'Pluma', periodo: 30 })}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Wheat className="w-4 h-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium">Pluma</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">R$ {cotacaoPluma.toFixed(2)}/@</p>
                    {cotacaoData?.variacaoPluma !== undefined && (
                      <p className={cn("text-xs", cotacaoData.variacaoPluma >= 0 ? "text-green-500" : "text-red-500")}>
                        {cotacaoData.variacaoPluma >= 0 ? '+' : ''}{cotacaoData.variacaoPluma.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </button>

                {/* Caroço */}
                <button
                  onClick={() => setHistoricoModal({ open: true, tipo: 'caroco', titulo: 'Caroço', periodo: 30 })}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium">Caroço</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">R$ {cotacaoCaroco.toFixed(2)}/@</p>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Top Talhões + Quick Actions */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Talhões */}
            <div className="p-5 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top Produtividade
                </h2>
                <button
                  onClick={() => setLocation('/talhoes')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {topTalhoes.length > 0 ? (
                <div className="space-y-2">
                  {topTalhoes.map((t, i) => (
                    <button
                      key={t.nome}
                      onClick={() => setLocation(`/talhoes/${t.nome}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        i === 1 ? "bg-gray-400/20 text-gray-400" :
                        i === 2 ? "bg-orange-600/20 text-orange-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">{t.fardos} fardos · {t.hectares.toFixed(0)} ha</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{t.produtividade.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">@/ha</p>
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
            <div className="p-5 rounded-xl bg-card border border-border/50">
              <h2 className="font-semibold mb-4">Acesso Rápido</h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLocation('/talhao-stats')}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-colors text-left group"
                >
                  <BarChart3 className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm">Estatísticas</p>
                  <p className="text-xs text-muted-foreground">Análise detalhada</p>
                </button>

                <button
                  onClick={() => setLocation('/reports')}
                  className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-colors text-left group"
                >
                  <Calendar className="w-6 h-6 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm">Relatórios</p>
                  <p className="text-xs text-muted-foreground">PDF e Excel</p>
                </button>

                <button
                  onClick={() => setLocation('/talhoes')}
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
                      ? `R$ ${(valorEstimado.perdasCampoValorBRL/1000).toFixed(0)}k`
                      : 'Sem perdas'}
                  </p>
                </button>
              </div>
            </div>
          </section>

          {/* Talhões Grid - Compacto */}
          <section className="p-5 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Todos os Talhões
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{new Set(bales.map(b => b.talhao)).size} ativos</span>
                <span>{talhoesSafra.length} total</span>
              </div>
            </div>

            {talhoesSafra.length > 0 ? (
              <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
                {talhoesSafra.map(t => {
                  const fardos = bales.filter(b => b.talhao === t.nome).length;
                  const hasData = fardos > 0;

                  return (
                    <button
                      key={t.nome}
                      onClick={() => setLocation(`/talhoes/${t.nome}`)}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105",
                        hasData
                          ? "bg-primary/10 border border-primary/30 hover:border-primary/50"
                          : "bg-muted/20 border border-transparent hover:border-muted/50"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-bold",
                        hasData ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {t.nome}
                      </span>
                      {hasData && (
                        <span className="text-[10px] text-primary">{fardos}</span>
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
              Total: R$ {valorEstimado.perdasCampoValorBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
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
                <div key={perda.talhao} className="p-4 rounded-lg border border-border/50 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{perda.talhao}</span>
                      <span className="text-xs text-muted-foreground">({perda.hectares.toFixed(0)} ha)</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">R$ {perda.valorBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground">{perda.arrobasHa.toFixed(1)} @/ha</p>
                    </div>
                  </div>
                  {perda.detalhes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {perda.detalhes.map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
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

      {/* Modal de Histórico */}
      <Dialog open={historicoModal.open} onOpenChange={(open) => setHistoricoModal(prev => ({ ...prev, open }))}>
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
                onClick={() => setHistoricoModal(prev => ({ ...prev, periodo: p.dias }))}
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
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="data"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [
                        historicoModal.tipo === 'dolar' ? `R$ ${value.toFixed(4)}` : `R$ ${value.toFixed(2)}/@`,
                        'Valor'
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
