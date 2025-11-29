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
  Filter,
  BarChart3,
  Wheat,
  Calendar,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function TalhaoDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/talhoes/:id");
  const talhaoId = params?.id ? decodeURIComponent(params.id) : null;

  useAuth();

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BaleStatus | "all">("all");

  // Buscar info do talhão
  const talhaoInfo = talhoesSafra.find(t => t.nome === talhaoId);
  const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;

  // Query de todos os fardos
  const { data: allBales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
  });

  // Filtrar fardos do talhão
  const balesTalhao = useMemo(() => {
    return allBales.filter(b => b.talhao === talhaoId);
  }, [allBales, talhaoId]);

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
      // Filtrar apenas as perdas deste talhão
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
      if (!response.ok) return { pluma: 140, caroco: 1.2 };
      return response.json();
    },
    staleTime: 300000,
  });

  // Calcular total de perdas do talhão
  const perdasStats = useMemo(() => {
    const totalArrobasHa = perdasTalhao.reduce((acc: number, p: any) => acc + parseFloat(p.arrobasHa || "0"), 0);
    const cotacaoPluma = cotacaoData?.pluma || 140;
    // Valor em R$ = arrobas/ha * hectares * cotação por arroba
    const valorTotalPerdas = totalArrobasHa * hectares * cotacaoPluma;

    return {
      totalArrobasHa,
      valorTotalPerdas,
      quantidade: perdasTalhao.length,
    };
  }, [perdasTalhao, hectares, cotacaoData]);

  // Stats do talhão
  const stats = useMemo(() => {
    const total = balesTalhao.length;
    const campo = balesTalhao.filter(b => b.status === "campo").length;
    const patio = balesTalhao.filter(b => b.status === "patio").length;
    const beneficiado = balesTalhao.filter(b => b.status === "beneficiado").length;

    // Produtividade prevista
    const pesoEstimado = total * 2000;
    const produtividadePrevista = hectares > 0 ? (pesoEstimado / hectares) / 15 : 0;

    // Produtividade real
    const pesoBruto = pesoBrutoTotais.find(p => p.talhao === talhaoId);
    const pesoBrutoTotal = pesoBruto?.pesoBrutoTotal || 0;
    const qtdCarregamentos = pesoBruto?.quantidadeCarregamentos || 0;
    // Peso médio real do fardo = peso total / quantidade de fardos
    const pesoMedioFardo = total > 0 ? pesoBrutoTotal / total : 0;
    const produtividadeReal = hectares > 0 && pesoBrutoTotal > 0 ? (pesoBrutoTotal / hectares) / 15 : 0;

    const temDadosReais = pesoBrutoTotal > 0 && total > 0;
    const diferencaPercent = produtividadePrevista > 0 && produtividadeReal > 0
      ? ((produtividadeReal - produtividadePrevista) / produtividadePrevista) * 100
      : 0;

    // Fardos de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fardosHoje = balesTalhao.filter(b => {
      const d = new Date(b.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

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
    };
  }, [balesTalhao, hectares, pesoBrutoTotais, talhaoId]);

  // Filtrar fardos
  const filteredBales = useMemo(() => {
    return balesTalhao.filter(bale => {
      const matchesSearch =
        bale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bale.numero && bale.numero.toString().includes(searchQuery));

      const matchesStatus = statusFilter === "all" || bale.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [balesTalhao, searchQuery, statusFilter]);

  if (!talhaoInfo) {
    return (
      <Page>
        <PageContent>
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h2 className="text-xl font-semibold mb-2">Talhão não encontrado</h2>
            <p className="text-muted-foreground mb-4">O talhão "{talhaoId}" não existe.</p>
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
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/talhoes")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{talhaoId}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold">
                    Talhão {talhaoInfo.nome}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {hectares.toFixed(1)} hectares • Safra 24/25
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Fardos */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground uppercase">Fardos</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                <AnimatedCounter value={stats.total} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.fardosHoje > 0 && `+${stats.fardosHoje} hoje`}
              </p>
            </div>

            {/* Peso Bruto */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-neon-orange/20">
                  <Scale className="w-4 h-4 text-neon-orange" />
                </div>
                <span className="text-xs text-muted-foreground uppercase">Peso Bruto</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {stats.pesoBrutoTotal > 0
                  ? (stats.pesoBrutoTotal / 1000).toFixed(1)
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.qtdCarregamentos > 0
                  ? `${stats.qtdCarregamentos} carregamentos`
                  : 'toneladas'}
              </p>
            </div>

            {/* Produtividade Prevista */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Target className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs text-muted-foreground uppercase">Prod. Prevista</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">
                {stats.produtividadePrevista > 0
                  ? stats.produtividadePrevista.toFixed(1)
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">@/ha</p>
            </div>

            {/* Produtividade Real */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-neon-cyan/20">
                  <TrendingUp className="w-4 h-4 text-neon-cyan" />
                </div>
                <span className="text-xs text-muted-foreground uppercase">Prod. Real</span>
                {stats.temDadosReais && (
                  <span className={cn(
                    "ml-auto text-xs font-medium flex items-center gap-0.5",
                    stats.diferencaPercent >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {stats.diferencaPercent >= 0
                      ? <ArrowUpRight className="w-3 h-3" />
                      : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(stats.diferencaPercent).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className={cn(
                "text-3xl font-bold",
                stats.temDadosReais ? "text-foreground" : "text-muted-foreground"
              )}>
                {stats.temDadosReais
                  ? stats.produtividadeReal.toFixed(1)
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.temDadosReais
                  ? `Peso médio: ${(stats.pesoMedioFardo / 1000).toFixed(2)}t`
                  : 'Aguardando pesagem'}
              </p>
            </div>
          </div>

          {/* Perdas do Talhão */}
          {perdasStats.quantidade > 0 && (
            <div className="glass-card p-5 rounded-xl border-l-4 border-red-500/50">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Perdas Registradas
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {perdasStats.quantidade} {perdasStats.quantidade === 1 ? 'registro' : 'registros'}
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Total em @/ha */}
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Perda Total</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-red-400">
                    {perdasStats.totalArrobasHa.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">@/ha</p>
                </div>

                {/* Valor em R$ */}
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Valor Estimado</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-red-400">
                    {perdasStats.valorTotalPerdas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @ R$ {(cotacaoData?.pluma || 140).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Lista detalhada de perdas */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Detalhamento</p>
                {perdasTalhao.map((perda: any, index: number) => {
                  const arrobas = parseFloat(perda.arrobasHa || "0");
                  const valorPerda = arrobas * hectares * (cotacaoData?.pluma || 140);
                  return (
                    <div
                      key={perda.id || index}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border/30"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {perda.motivo || 'Perda não especificada'}
                        </p>
                        {perda.observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5">{perda.observacao}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(perda.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{arrobas.toFixed(2)} @/ha</p>
                        <p className="text-xs text-muted-foreground">
                          {valorPerda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status dos Fardos */}
          <div className="glass-card p-5 rounded-xl">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Status dos Fardos
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setStatusFilter(statusFilter === "campo" ? "all" : "campo")}
                className={cn(
                  "p-4 rounded-xl transition-all",
                  statusFilter === "campo"
                    ? "bg-primary/20 border-2 border-primary shadow-glow-sm"
                    : "bg-surface hover:bg-surface-hover border border-border/30"
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="font-medium">Campo</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{stats.campo}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.campo / stats.total) * 100).toFixed(0) : 0}%
                </p>
              </button>

              <button
                onClick={() => setStatusFilter(statusFilter === "patio" ? "all" : "patio")}
                className={cn(
                  "p-4 rounded-xl transition-all",
                  statusFilter === "patio"
                    ? "bg-neon-orange/20 border-2 border-neon-orange shadow-glow-orange"
                    : "bg-surface hover:bg-surface-hover border border-border/30"
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-neon-orange" />
                  <span className="font-medium">Pátio</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{stats.patio}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.patio / stats.total) * 100).toFixed(0) : 0}%
                </p>
              </button>

              <button
                onClick={() => setStatusFilter(statusFilter === "beneficiado" ? "all" : "beneficiado")}
                className={cn(
                  "p-4 rounded-xl transition-all",
                  statusFilter === "beneficiado"
                    ? "bg-neon-cyan/20 border-2 border-neon-cyan shadow-glow-cyan"
                    : "bg-surface hover:bg-surface-hover border border-border/30"
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-neon-cyan" />
                  <span className="font-medium">Beneficiado</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{stats.beneficiado}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.beneficiado / stats.total) * 100).toFixed(0) : 0}%
                </p>
              </button>
            </div>

            {/* Barra de progresso */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Progresso de beneficiamento</span>
                <span className="text-foreground font-semibold">
                  {stats.total > 0 ? ((stats.beneficiado / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.campo / stats.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-neon-orange transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.patio / stats.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-neon-cyan transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.beneficiado / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lista de Fardos */}
          <div className="glass-card p-5 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Wheat className="w-4 h-4 text-primary" />
                Fardos do Talhão
                <span className="text-muted-foreground font-normal">
                  ({filteredBales.length} {filteredBales.length === 1 ? 'fardo' : 'fardos'})
                </span>
              </h3>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-surface border-border/50 rounded-xl"
                />
              </div>
            </div>

            {/* Filter pills */}
            {statusFilter !== "all" && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-muted-foreground">Filtro:</span>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                    statusFilter === "campo" && "bg-primary/20 text-primary",
                    statusFilter === "patio" && "bg-neon-orange/20 text-neon-orange",
                    statusFilter === "beneficiado" && "bg-neon-cyan/20 text-neon-cyan"
                  )}
                >
                  {statusFilter === "campo" && <Package className="w-3 h-3" />}
                  {statusFilter === "patio" && <Truck className="w-3 h-3" />}
                  {statusFilter === "beneficiado" && <CheckCircle className="w-3 h-3" />}
                  {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <span className="ml-1">×</span>
                </button>
              </div>
            )}

            {/* Bales list */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-xl space-y-4">
                    <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
                    <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-8 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredBales.length === 0 ? (
              <div className="text-center py-12">
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
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                  >
                    <BaleCard
                      bale={bale}
                      onClick={() => setLocation(`/bale/${encodeURIComponent(bale.id)}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </Page>
  );
}
