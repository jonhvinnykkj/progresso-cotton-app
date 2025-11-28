import { useMemo } from "react";
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
  Sparkles,
  Scale,
  Wheat,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Factory,
  MapPin,
  ChevronRight,
  Activity,
  BarChart3,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";

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
    queryKey: ["/api/bales"],
    staleTime: 30000,
  });

  // Query de stats
  const { data: stats } = useQuery<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }>({
    queryKey: ["/api/bales/stats"],
    staleTime: 30000,
  });

  // Query de carregamentos (peso bruto por talhão)
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

  // Cálculos principais - usando talhões dinâmicos da safra
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
      mediaPesoPorCarregamento: totalCarregamentos > 0 ? totalPesoKg / totalCarregamentos : 0,
    };
  }, [pesoBrutoTotais]);

  // Produtividade prevista e real
  const produtividade = useMemo(() => {
    const totalFardos = stats?.total || 0;

    // Prevista: fardos × 2000kg / hectares / 15
    const pesoEstimado = totalFardos * 2000;
    const prevista = totalHectares > 0 ? (pesoEstimado / totalHectares) / 15 : 0;

    // Real: peso total dos carregamentos / hectares / 15
    // Peso médio do fardo = peso total / quantidade de fardos
    const pesoMedioFardo = totalFardos > 0
      ? totaisCarregamentos.totalPesoKg / totalFardos
      : 0;
    const real = totalHectares > 0 && totaisCarregamentos.totalPesoKg > 0
      ? (totaisCarregamentos.totalPesoKg / totalHectares) / 15
      : 0;

    const diferenca = real - prevista;
    const diferencaPercent = prevista > 0 ? ((real - prevista) / prevista) * 100 : 0;

    return { prevista, real, diferenca, diferencaPercent, pesoMedioFardo, temDadosReais: totaisCarregamentos.totalPesoKg > 0 };
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

  // Progresso geral
  const progressPercent = stats?.total ? ((stats.beneficiado / stats.total) * 100) : 0;

  // Saudação
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  return (
    <Page>
      <PageContent className="max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">{greeting}, {user?.username || "Usuário"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Resumo da Safra
              </h1>
            </div>
            <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-surface border border-border/50">
              <Wheat className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {safraAtiva ? `Safra ${safraAtiva.nome}` : "Nenhuma safra"}
              </span>
            </div>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Fardos */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Fardos</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  <AnimatedCounter value={stats?.total || 0} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats?.total || 0) > 0 && totalHectares > 0
                    ? `${((stats?.total || 0) / totalHectares).toFixed(2)} f/ha`
                    : 'total cadastrados'}
                </p>
              </div>
            </div>

            {/* Peso Colhido */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-neon-orange/20">
                    <Scale className="w-4 h-4 text-neon-orange" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Peso Bruto</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {totaisCarregamentos.totalPesoKg > 0
                    ? `${totaisCarregamentos.totalPesoKg.toLocaleString('pt-BR')} kg`
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totaisCarregamentos.totalCarregamentos > 0
                    ? `${totaisCarregamentos.totalCarregamentos} carregamentos`
                    : 'kg pesados'}
                </p>
              </div>
            </div>

            {/* Produtividade Prevista */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Target className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Prod. Prevista</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {produtividade.prevista > 0
                    ? <AnimatedCounter value={produtividade.prevista} decimals={1} />
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">@/ha (bruto)</p>
              </div>
            </div>

            {/* Produtividade Real */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-neon-cyan/20">
                    <TrendingUp className="w-4 h-4 text-neon-cyan" />
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Prod. Real</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">
                  {produtividade.temDadosReais
                    ? <AnimatedCounter value={produtividade.real} decimals={1} />
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {produtividade.temDadosReais ? '@/ha (pesado)' : 'aguardando pesagem'}
                </p>
              </div>
            </div>
          </div>

          {/* Progresso da Colheita + Produtividade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline de Status */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Progresso da Colheita
                </h3>
                <span className="text-xs text-muted-foreground">
                  {progressPercent.toFixed(1)}% beneficiado
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Campo */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 w-20 sm:w-28">
                    <div className="p-1 sm:p-1.5 rounded bg-primary/20">
                      <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm">Campo</span>
                  </div>
                  <div className="flex-1 h-2.5 sm:h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${stats?.total ? (stats.campo / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold w-12 sm:w-16 text-right text-foreground">{stats?.campo || 0}</span>
                </div>

                {/* Pátio */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 w-20 sm:w-28">
                    <div className="p-1 sm:p-1.5 rounded bg-neon-orange/20">
                      <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-orange" />
                    </div>
                    <span className="text-xs sm:text-sm">Pátio</span>
                  </div>
                  <div className="flex-1 h-2.5 sm:h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon-orange rounded-full transition-all duration-500"
                      style={{ width: `${stats?.total ? (stats.patio / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold w-12 sm:w-16 text-right text-foreground">{stats?.patio || 0}</span>
                </div>

                {/* Beneficiado */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 w-20 sm:w-28">
                    <div className="p-1 sm:p-1.5 rounded bg-neon-cyan/20">
                      <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neon-cyan" />
                    </div>
                    <span className="text-xs sm:text-sm">Benef.</span>
                  </div>
                  <div className="flex-1 h-2.5 sm:h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon-cyan rounded-full transition-all duration-500"
                      style={{ width: `${stats?.total ? (stats.beneficiado / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold w-12 sm:w-16 text-right text-foreground">{stats?.beneficiado || 0}</span>
                </div>
              </div>

              {/* Barra de progresso geral */}
              <div className="mt-5 pt-4 border-t border-border/30">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Progresso geral</span>
                  <span className="text-foreground font-semibold">{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-neon-orange to-neon-cyan rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Produtividade Comparativa */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Produtividade (@/ha)
                </h3>
                {produtividade.temDadosReais && produtividade.prevista > 0 && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    produtividade.diferencaPercent >= 0
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  )}>
                    {produtividade.diferencaPercent >= 0
                      ? <ArrowUpRight className="w-3 h-3" />
                      : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(produtividade.diferencaPercent).toFixed(1)}%
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Prevista */}
                <div className="p-4 rounded-xl bg-surface border border-border/30">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Prevista</p>
                  <p className="text-3xl font-bold text-foreground">
                    {produtividade.prevista > 0 ? produtividade.prevista.toFixed(1) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.total || 0} fardos × 2t
                  </p>
                </div>

                {/* Real */}
                <div className="p-4 rounded-xl border bg-surface border-border/30">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Real</p>
                  <p className={cn(
                    "text-3xl font-bold",
                    produtividade.temDadosReais ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {produtividade.temDadosReais ? produtividade.real.toFixed(1) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {produtividade.temDadosReais
                      ? `${totaisCarregamentos.totalCarregamentos} pesagens`
                      : 'Aguardando pesagem'}
                  </p>
                </div>
              </div>

              {/* Peso médio por fardo */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <span className="text-sm text-muted-foreground">Peso médio/fardo</span>
                <span className="text-sm font-bold">
                  {produtividade.pesoMedioFardo > 0
                    ? `${Math.round(produtividade.pesoMedioFardo).toLocaleString('pt-BR')} kg`
                    : '2.000 kg (estimado)'}
                </span>
              </div>
            </div>
          </div>

          {/* Links Rápidos */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLocation("/estatisticas")}
              className="glass-card p-4 rounded-xl flex items-center gap-3 hover:shadow-glow-sm transition-all group text-left"
            >
              <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Estatísticas Detalhadas</p>
                <p className="text-xs text-muted-foreground">Análise completa por talhão</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              onClick={() => setLocation("/relatorios")}
              className="glass-card p-4 rounded-xl flex items-center gap-3 hover:shadow-glow-sm transition-all group text-left"
            >
              <div className="p-2 rounded-lg bg-neon-cyan/20 group-hover:bg-neon-cyan/30 transition-colors">
                <Factory className="w-5 h-5 text-neon-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Exportar Relatórios</p>
                <p className="text-xs text-muted-foreground">PDF e Excel</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" />
            </button>
          </div>

          {/* Visão Geral dos Talhões */}
          <div className="glass-card p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Visão Geral dos Talhões
              </h3>
              <button
                onClick={() => setLocation("/talhoes")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {talhoesSafra.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {talhoesSafra.map(talhaoInfo => {
                  const fardosTalhao = bales.filter(b => b.talhao === talhaoInfo.nome).length;
                  const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
                  const hasData = fardosTalhao > 0;

                  return (
                    <button
                      key={talhaoInfo.nome}
                      onClick={() => setLocation(`/talhoes/${talhaoInfo.nome}`)}
                      className={cn(
                        "p-3 rounded-xl text-center transition-all hover:scale-105",
                        hasData
                          ? "bg-primary/10 border border-primary/20 hover:shadow-glow-sm"
                          : "bg-surface border border-border/30 hover:border-border/50"
                      )}
                    >
                      <p className={cn(
                        "text-lg font-bold",
                        hasData ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {talhaoInfo.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fardosTalhao > 0 ? `${fardosTalhao}` : '-'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum talhão configurado</p>
                <p className="text-xs">Configure os talhões nas configurações.</p>
              </div>
            )}

            {/* Resumo rápido */}
            <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{balesToday}</p>
                <p className="text-xs text-muted-foreground">Fardos hoje</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{new Set(bales.map(b => b.talhao)).size}</p>
                <p className="text-xs text-muted-foreground">Talhões ativos</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{totalHectares.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Hectares totais</p>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </Page>
  );
}
