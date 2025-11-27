import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import type { Bale } from "@shared/schema";
import { TALHOES_INFO } from "@shared/talhoes";
import {
  Package,
  Truck,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  MapPin,
  ChevronRight,
  Target,
  Wheat,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TalhaoStats {
  talhao: string;
  campo: number;
  patio: number;
  beneficiado: number;
  total: number;
}

export default function Talhoes() {
  const [, setLocation] = useLocation();
  useAuth();

  const { data: talhaoStatsData } = useQuery<Record<string, TalhaoStats>>({
    queryKey: ["/api/bales/stats-by-talhao"],
    staleTime: 60000,
  });

  const talhaoStats = talhaoStatsData ? Object.values(talhaoStatsData) : [];

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
  });

  const { data: pesoBrutoTotais = [] } = useQuery<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]>({
    queryKey: ["/api/carregamentos-totais", "24/25"],
    queryFn: async () => {
      const url = API_URL
        ? `${API_URL}/api/carregamentos-totais/24%2F25`
        : `/api/carregamentos-totais/24%2F25`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });

  // Calcular dados de cada talhão
  const talhoesData = useMemo(() => {
    return TALHOES_INFO.map(talhaoInfo => {
      const hectares = parseFloat(talhaoInfo.hectares.replace(",", ".")) || 0;
      const stats = talhaoStats.find(s => s.talhao === talhaoInfo.id);
      const pesoBruto = pesoBrutoTotais.find(p => p.talhao === talhaoInfo.id);

      const totalFardos = stats?.total || 0;
      const campo = stats?.campo || 0;
      const patio = stats?.patio || 0;
      const beneficiado = stats?.beneficiado || 0;

      // Produtividade prevista
      const pesoEstimado = totalFardos * 2000;
      const produtividadePrevista = hectares > 0 ? (pesoEstimado / hectares) / 15 : 0;

      // Produtividade real
      const pesoBrutoTotal = pesoBruto?.pesoBrutoTotal || 0;
      const qtdCarregamentos = pesoBruto?.quantidadeCarregamentos || 0;
      const pesoMedioFardo = qtdCarregamentos > 0 ? pesoBrutoTotal / qtdCarregamentos : 0;
      const pesoRealCalculado = pesoMedioFardo * totalFardos;
      const produtividadeReal = hectares > 0 && pesoMedioFardo > 0 ? (pesoRealCalculado / hectares) / 15 : 0;

      const temDadosReais = qtdCarregamentos > 0 && totalFardos > 0;
      const diferencaPercent = produtividadePrevista > 0 && produtividadeReal > 0
        ? ((produtividadeReal - produtividadePrevista) / produtividadePrevista) * 100
        : 0;

      return {
        id: talhaoInfo.id,
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
        progressBeneficiado: totalFardos > 0 ? (beneficiado / totalFardos) * 100 : 0,
      };
    }).sort((a, b) => b.totalFardos - a.totalFardos);
  }, [talhaoStats, pesoBrutoTotais]);

  // Totais
  const totais = useMemo(() => {
    const totalFardos = talhoesData.reduce((acc, t) => acc + t.totalFardos, 0);
    const totalHectares = talhoesData.reduce((acc, t) => acc + t.hectares, 0);
    const talhoesAtivos = talhoesData.filter(t => t.totalFardos > 0).length;
    return { totalFardos, totalHectares, talhoesAtivos };
  }, [talhoesData]);

  return (
    <Page>
      <PageContent className="max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  Talhões
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visão geral de todos os talhões da safra
                </p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="glass-card p-3 sm:p-4 rounded-xl text-center">
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                <AnimatedCounter value={totais.totalFardos} />
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Fardos</p>
            </div>
            <div className="glass-card p-3 sm:p-4 rounded-xl text-center">
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">{totais.talhoesAtivos}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="glass-card p-3 sm:p-4 rounded-xl text-center">
              <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {totais.totalHectares.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Hectares</p>
            </div>
          </div>

          {/* Lista de Talhões */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {talhoesData.map(talhao => (
              <button
                key={talhao.id}
                onClick={() => setLocation(`/talhoes/${talhao.id}`)}
                className={cn(
                  "glass-card p-5 rounded-xl text-left transition-all hover:shadow-glow-sm hover:scale-[1.02]",
                  talhao.totalFardos > 0
                    ? "border border-primary/20"
                    : "border border-border/30 opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                      talhao.totalFardos > 0
                        ? "bg-primary/20 text-primary"
                        : "bg-surface text-muted-foreground"
                    )}>
                      {talhao.id}
                    </div>
                    <div>
                      <p className="font-semibold">Talhão {talhao.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {talhao.hectares.toFixed(1)} ha
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Stats */}
                {talhao.totalFardos > 0 ? (
                  <>
                    {/* Fardos e Produtividade */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-surface">
                        <p className="text-2xl font-display font-bold text-foreground">{talhao.totalFardos}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Fardos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface">
                        <p className="text-2xl font-display font-bold text-foreground">
                          {talhao.produtividadePrevista > 0
                            ? talhao.produtividadePrevista.toFixed(1)
                            : '-'}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">@/ha</p>
                      </div>
                    </div>

                    {/* Status bars mini */}
                    <div className="flex gap-1 mb-3">
                      <div
                        className="h-2 bg-primary rounded-full transition-all"
                        style={{ width: `${talhao.totalFardos > 0 ? (talhao.campo / talhao.totalFardos) * 100 : 0}%` }}
                        title={`Campo: ${talhao.campo}`}
                      />
                      <div
                        className="h-2 bg-neon-orange rounded-full transition-all"
                        style={{ width: `${talhao.totalFardos > 0 ? (talhao.patio / talhao.totalFardos) * 100 : 0}%` }}
                        title={`Pátio: ${talhao.patio}`}
                      />
                      <div
                        className="h-2 bg-neon-cyan rounded-full transition-all"
                        style={{ width: `${talhao.totalFardos > 0 ? (talhao.beneficiado / talhao.totalFardos) * 100 : 0}%` }}
                        title={`Beneficiado: ${talhao.beneficiado}`}
                      />
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-primary" />
                          {talhao.campo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-neon-orange" />
                          {talhao.patio}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-neon-cyan" />
                          {talhao.beneficiado}
                        </span>
                      </div>
                      {talhao.temDadosReais && (
                        <span className={cn(
                          "flex items-center gap-0.5 font-medium",
                          talhao.diferencaPercent >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {talhao.diferencaPercent >= 0
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(talhao.diferencaPercent).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum fardo cadastrado</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </PageContent>
    </Page>
  );
}
