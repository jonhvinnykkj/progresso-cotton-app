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
  DollarSign,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
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

  // Query de fardos - filtrado por safra
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

  // Query de stats - filtrado por safra
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

  // Query de perdas por talhão (para o modal detalhado)
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

  // Query para perdas detalhadas (com motivos)
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

  // Estado para modal de perdas
  const [perdasModalOpen, setPerdasModalOpen] = useState(false);

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

  // Cotação do algodão (via API Alpha Vantage)
  interface CotacaoData {
    pluma: number;
    caroco: number;
    cottonUSD?: number; // cents/lb original
    usdBrl?: number; // taxa de câmbio
    dataAtualizacao: string;
    fonte: string;
    variacaoDolar?: number; // % variação último mês
    variacaoAlgodao?: number; // % variação último mês
    variacaoPluma?: number; // % variação último mês
    variacaoCaroco?: number; // % variação último mês
  }

  const { data: cotacaoData, refetch: refetchCotacao } = useQuery<CotacaoData>({
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
    staleTime: 60000, // 1 minuto
  });

  // Cotação da pluma em R$/@ (valor típico entre 130-160)
  // Se a cotação vier muito alta (> 500), usar valor padrão
  const cotacaoRawPluma = cotacaoData?.pluma || 140;
  const cotacaoRawCaroco = cotacaoData?.caroco || 38;
  const cotacaoPluma = cotacaoRawPluma > 500 ? 140 : cotacaoRawPluma;
  const cotacaoCaroco = cotacaoRawCaroco > 200 ? 38 : cotacaoRawCaroco;
  const cotacaoFonte = cotacaoData?.fonte || 'manual';
  const cotacaoDataAtualizacao = cotacaoData?.dataAtualizacao;

  // Taxa de câmbio USD/BRL
  const usdBrl = cotacaoData?.usdBrl || 0;

  // Estado para o modal de histórico
  const [historicoModal, setHistoricoModal] = useState<{
    open: boolean;
    tipo: 'dolar' | 'algodao' | 'pluma' | 'caroco' | null;
    titulo: string;
    periodo: number;
  }>({ open: false, tipo: null, titulo: '', periodo: 30 });

  // Períodos disponíveis
  const periodos = [
    { label: '24H', dias: 1 },
    { label: '7D', dias: 7 },
    { label: '14D', dias: 14 },
    { label: '30D', dias: 30 },
    { label: '4M', dias: 120 },
    { label: '6M', dias: 180 },
    { label: '1A', dias: 365 },
    { label: '10A', dias: 3650 },
  ];

  // Função para gerar histórico local quando API falha
  const gerarHistoricoLocal = (tipo: string, dias: number) => {
    const historico = [];

    // Determinar intervalo e número de pontos baseado no período
    let pontos: number;
    let intervalo: 'hora' | 'dia' | 'semana' | 'mes';

    if (dias === 1) {
      pontos = 24; // 24 horas
      intervalo = 'hora';
    } else if (dias <= 30) {
      pontos = Math.max(dias, 2); // mínimo 2 pontos para o gráfico
      intervalo = 'dia';
    } else if (dias <= 365) {
      pontos = Math.ceil(dias / 7); // semanal
      intervalo = 'semana';
    } else {
      pontos = Math.ceil(dias / 30); // mensal
      intervalo = 'mes';
    }

    const valorBase = tipo === 'dolar' ? (cotacaoData?.usdBrl || 5.5) :
                      tipo === 'algodao' ? (cotacaoData?.cottonUSD || 70) :
                      tipo === 'caroco' ? cotacaoCaroco : cotacaoPluma;

    for (let i = pontos - 1; i >= 0; i--) {
      const date = new Date();
      if (intervalo === 'hora') {
        date.setHours(date.getHours() - i);
      } else if (intervalo === 'dia') {
        date.setDate(date.getDate() - i);
      } else if (intervalo === 'semana') {
        date.setDate(date.getDate() - (i * 7));
      } else {
        date.setMonth(date.getMonth() - i);
      }

      // Variação aleatória de +/- 5%
      const variacao = (Math.random() - 0.5) * 0.1 * valorBase;
      const valor = valorBase + variacao;

      historico.push({
        data: date.toISOString(),
        valor: Math.round(valor * 100) / 100,
      });
    }

    return {
      tipo,
      historico,
      fonte: 'local',
      message: 'Dados estimados (API indisponível)'
    };
  };

  // Query para buscar histórico (dados pré-carregados no servidor às 8h, 12h, 18h)
  const { data: historicoData, isLoading: historicoLoading, error: historicoError } = useQuery({
    queryKey: ["/api/cotacao-algodao/historico", historicoModal.tipo, historicoModal.periodo],
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

        if (!response.ok) {
          return gerarHistoricoLocal(tipo, dias);
        }

        const data = await response.json();

        if (!data.historico || data.historico.length === 0) {
          return gerarHistoricoLocal(tipo, dias);
        }

        return data;
      } catch (error) {
        console.error('Historico fetch error:', error);
        return gerarHistoricoLocal(tipo, dias);
      }
    },
    enabled: historicoModal.open && !!historicoModal.tipo,
    staleTime: 5 * 60 * 1000, // 5 minutos - dados são atualizados às 8h, 12h, 18h
  });

  const abrirHistorico = (tipo: 'dolar' | 'algodao' | 'pluma' | 'caroco', titulo: string) => {
    setHistoricoModal({ open: true, tipo, titulo, periodo: 30 });
  };

  const mudarPeriodo = (dias: number) => {
    setHistoricoModal(prev => ({ ...prev, periodo: dias }));
  };

  // Cálculo do valor estimado da produção
  const valorEstimado = useMemo(() => {
    // Peso bruto em arrobas (kg / 15)
    const pesoArrobasBruto = totaisCarregamentos.totalPesoKg / 15;

    // Rendimentos típicos do beneficiamento do algodão em caroço:
    // - Pluma (fibra): ~40%
    // - Caroço: ~57%
    // - Perdas/impurezas: ~3%
    const rendimentoPluma = 0.40;
    const rendimentoCaroco = 0.57;
    const perdaImpurezas = 0.03;

    const pesoArrobasPluma = pesoArrobasBruto * rendimentoPluma;
    const pesoArrobasCaroco = pesoArrobasBruto * rendimentoCaroco;
    const pesoArrobasPerdas = pesoArrobasBruto * perdaImpurezas;

    // Valores em R$
    const valorPlumaBRL = pesoArrobasPluma * cotacaoPluma;
    const valorCarocoBRL = pesoArrobasCaroco * cotacaoCaroco;
    const valorTotalBRL = valorPlumaBRL + valorCarocoBRL;

    // Valor estimado das perdas (usando média ponderada entre pluma e caroço)
    // Perdas são principalmente impurezas, estimamos pelo valor médio
    const valorMedioPorArroba = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;
    const valorPerdasBRL = pesoArrobasPerdas * valorMedioPorArroba;

    // Valores em USD (convertido pela taxa de câmbio)
    const valorPlumaUSD = usdBrl > 0 ? valorPlumaBRL / usdBrl : 0;
    const valorCarocoUSD = usdBrl > 0 ? valorCarocoBRL / usdBrl : 0;
    const valorTotalUSD = usdBrl > 0 ? valorTotalBRL / usdBrl : 0;

    // Perdas registradas no campo em @/ha (de causa natural, pragas, etc.)
    // Convertendo @/ha para arrobas totais: @/ha * hectares totais
    const perdasCampoArrobasTotais = totalPerdasArrobasHa * totalHectares;
    const perdasCampoValorBRL = perdasCampoArrobasTotais * valorMedioPorArroba;

    // Percentual de perdas em relação à produção real
    const percentualPerdasCampo = pesoArrobasBruto > 0
      ? (perdasCampoArrobasTotais / pesoArrobasBruto) * 100
      : 0;

    return {
      arrobasBruto: pesoArrobasBruto,
      arrobasPluma: pesoArrobasPluma,
      arrobasCaroco: pesoArrobasCaroco,
      arrobasPerdas: pesoArrobasPerdas,
      percentualPerdas: perdaImpurezas * 100,
      valorPlumaBRL,
      valorCarocoBRL,
      valorTotalBRL,
      valorPerdasBRL,
      valorPlumaUSD,
      valorCarocoUSD,
      valorTotalUSD,
      // Perdas de campo
      perdasCampoArrobasHa: totalPerdasArrobasHa,
      perdasCampoArrobasTotais,
      perdasCampoValorBRL,
      percentualPerdasCampo
    };
  }, [totaisCarregamentos.totalPesoKg, cotacaoPluma, cotacaoCaroco, usdBrl, totalPerdasArrobasHa, totalHectares]);

  // Perdas por talhão com valor em R$ (para modal)
  const perdasPorTalhaoComValor = useMemo(() => {
    const valorMedio = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;
    return perdasPorTalhao.map(p => {
      const talhaoInfo = talhoesSafra.find(t => t.nome === p.talhao);
      const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
      const arrobasTotais = p.totalPerdas * hectares;
      const valorBRL = arrobasTotais * valorMedio;
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
  }, [perdasPorTalhao, talhoesSafra, cotacaoPluma, cotacaoCaroco, perdasDetalhadas]);

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* Total Fardos */}
            <div className="glass-card p-3 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Fardos</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">
                  <AnimatedCounter value={stats?.total || 0} />
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  {(stats?.total || 0) > 0 && totalHectares > 0
                    ? `${((stats?.total || 0) / totalHectares).toFixed(2)} f/ha`
                    : 'total cadastrados'}
                </p>
              </div>
            </div>

            {/* Peso Colhido */}
            <div className="glass-card p-3 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-neon-orange/20">
                    <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-orange" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Peso Bruto</span>
                </div>
                <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                  {totaisCarregamentos.totalPesoToneladas > 0
                    ? `${totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`
                    : '-'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  {totaisCarregamentos.totalCarregamentos > 0
                    ? `${totaisCarregamentos.totalCarregamentos} carreg.`
                    : 'toneladas pesadas'}
                </p>
              </div>
            </div>

            {/* Produtividade Prevista */}
            <div className="glass-card p-3 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-accent/20">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Prevista</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">
                  {produtividade.prevista > 0
                    ? <AnimatedCounter value={produtividade.prevista} decimals={1} />
                    : '-'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">@/ha (bruto)</p>
              </div>
            </div>

            {/* Produtividade Real */}
            <div className="glass-card p-3 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-sm transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-neon-cyan/20">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-cyan" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Real</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">
                  {produtividade.temDadosReais
                    ? <AnimatedCounter value={produtividade.real} decimals={1} />
                    : '-'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  {produtividade.temDadosReais ? '@/ha' : 'aguardando'}
                </p>
              </div>
            </div>
          </div>

          {/* Hero - Valor Total Estimado */}
          {totaisCarregamentos.totalPesoKg > 0 && (
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 border border-emerald-500/20">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-green-500/20 rounded-full blur-3xl" />
              </div>

              <div className="relative p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Valor Principal - Líquido (descontando perdas) */}
                  <div>
                    <p className="text-xs sm:text-sm text-emerald-300/80 mb-1 flex items-center gap-1.5 sm:gap-2">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Valor Estimado da Produção
                    </p>
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <span className="text-2xl sm:text-4xl md:text-5xl font-display font-bold text-white">
                        R$ {(valorEstimado.valorTotalBRL - valorEstimado.perdasCampoValorBRL).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {valorEstimado.perdasCampoValorBRL > 0 && (
                        <span className="text-sm sm:text-lg text-emerald-300/60 line-through">
                          R$ {valorEstimado.valorTotalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                    {usdBrl > 0 && (
                      <p className="text-base sm:text-xl text-emerald-300 mt-0.5 sm:mt-1">
                        $ {((valorEstimado.valorTotalBRL - valorEstimado.perdasCampoValorBRL) / usdBrl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-emerald-300/60 mt-1 sm:mt-2">
                      {valorEstimado.arrobasBruto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} @ bruto pesado
                    </p>
                  </div>

                  {/* Breakdown Pluma/Caroço/Impurezas/Perdas Campo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Pluma */}
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 backdrop-blur border border-white/10">
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="text-[10px] sm:text-xs text-purple-300 font-medium">Pluma</span>
                        <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">40%</span>
                      </div>
                      <p className="text-sm sm:text-lg font-bold text-white tracking-tight">
                        +{(valorEstimado.valorPlumaBRL / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/50">{valorEstimado.arrobasPluma.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} @</p>
                    </div>

                    {/* Caroço */}
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 backdrop-blur border border-white/10">
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="text-[10px] sm:text-xs text-orange-300 font-medium">Caroço</span>
                        <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-300">57%</span>
                      </div>
                      <p className="text-sm sm:text-lg font-bold text-white tracking-tight">
                        +{(valorEstimado.valorCarocoBRL / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/50">{valorEstimado.arrobasCaroco.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} @</p>
                    </div>

                    {/* Impurezas */}
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 backdrop-blur border border-yellow-500/20">
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="text-[10px] sm:text-xs text-yellow-300 font-medium">Impurezas</span>
                        <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-yellow-500/30 text-yellow-300">3%</span>
                      </div>
                      <p className="text-sm sm:text-lg font-bold text-yellow-200 tracking-tight">
                        -{(valorEstimado.valorPerdasBRL / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/50">{valorEstimado.arrobasPerdas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} @</p>
                    </div>

                    {/* Perdas de Campo - Sempre visível, clicável */}
                    <button
                      onClick={() => setPerdasModalOpen(true)}
                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-red-950/50 backdrop-blur border border-red-500/30 hover:bg-red-950/70 hover:border-red-500/50 transition-colors text-left group w-full"
                    >
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="text-[10px] sm:text-xs text-red-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          Perdas
                        </span>
                        {valorEstimado.percentualPerdasCampo > 0 && (
                          <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-red-500/40 text-red-300">
                            {valorEstimado.percentualPerdasCampo.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-lg font-bold text-red-300 tracking-tight">
                        {valorEstimado.perdasCampoValorBRL > 0 ? `-${(valorEstimado.perdasCampoValorBRL / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k` : 'R$ 0'}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-red-400/60">
                        {valorEstimado.perdasCampoArrobasHa > 0 ? `${valorEstimado.perdasCampoArrobasHa.toFixed(1)} @/ha` : 'Sem perdas'}
                      </p>
                      <p className="text-[8px] text-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">Ver detalhes</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cotações - Cards modernos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Dólar */}
            <button
              onClick={() => abrirHistorico('dolar', 'Dólar (USD/BRL)')}
              className="group relative overflow-hidden p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-green-500/20">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-green-400/80">USD/BRL</span>
                </div>
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500/30 group-hover:text-green-400 transition-colors" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">
                R$ {cotacaoData?.usdBrl ? cotacaoData.usdBrl.toFixed(2) : '-'}
              </p>
              {cotacaoData?.variacaoDolar !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                  cotacaoData.variacaoDolar >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  <TrendingUp className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", cotacaoData.variacaoDolar < 0 && "rotate-180")} />
                  <span>{cotacaoData.variacaoDolar >= 0 ? '+' : ''}{cotacaoData.variacaoDolar.toFixed(2)}%</span>
                  <span className="text-muted-foreground/60 font-normal hidden sm:inline">30d</span>
                </div>
              )}
            </button>

            {/* Algodão ICE */}
            <button
              onClick={() => abrirHistorico('algodao', 'Algodão (ICE Futures)')}
              className="group relative overflow-hidden p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/20">
                    <Wheat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-amber-400/80">ICE</span>
                </div>
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/30 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">
                {cotacaoData?.cottonUSD ? cotacaoData.cottonUSD.toFixed(2) : '-'} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">¢/lb</span>
              </p>
              {cotacaoData?.variacaoAlgodao !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                  cotacaoData.variacaoAlgodao >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  <TrendingUp className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", cotacaoData.variacaoAlgodao < 0 && "rotate-180")} />
                  <span>{cotacaoData.variacaoAlgodao >= 0 ? '+' : ''}{cotacaoData.variacaoAlgodao.toFixed(2)}%</span>
                </div>
              )}
            </button>

            {/* Pluma */}
            <button
              onClick={() => abrirHistorico('pluma', 'Pluma (R$/@)')}
              className="group relative overflow-hidden p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500/20">
                    <Wheat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-purple-400/80">Pluma</span>
                </div>
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/30 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">
                {cotacaoPluma.toFixed(2)} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">/@</span>
              </p>
              {cotacaoData?.variacaoPluma !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                  cotacaoData.variacaoPluma >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  <TrendingUp className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", cotacaoData.variacaoPluma < 0 && "rotate-180")} />
                  <span>{cotacaoData.variacaoPluma >= 0 ? '+' : ''}{cotacaoData.variacaoPluma.toFixed(2)}%</span>
                </div>
              )}
            </button>

            {/* Caroço */}
            <button
              onClick={() => abrirHistorico('caroco', 'Caroço (R$/@)')}
              className="group relative overflow-hidden p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-orange-500/20">
                    <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-orange-400/80">Caroço</span>
                </div>
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500/30 group-hover:text-orange-400 transition-colors" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">
                {cotacaoCaroco.toFixed(2)} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">/@</span>
              </p>
              {cotacaoData?.variacaoCaroco !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                  cotacaoData.variacaoCaroco >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  <TrendingUp className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", cotacaoData.variacaoCaroco < 0 && "rotate-180")} />
                  <span>{cotacaoData.variacaoCaroco >= 0 ? '+' : ''}{cotacaoData.variacaoCaroco.toFixed(2)}%</span>
                </div>
              )}
            </button>
          </div>

          {/* Info de atualização - Minimalista */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
            <span className={cn(
              "flex items-center gap-1.5",
              cotacaoFonte?.includes('ICE') ? "text-green-500/70" : "text-yellow-500/70"
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {cotacaoFonte?.includes('ICE') ? 'ICE Futures (NY)' : 'Aguardando API'}
            </span>
            <span>•</span>
            <span>
              {cotacaoDataAtualizacao
                ? new Date(cotacaoDataAtualizacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-'}
            </span>
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
              onClick={() => setLocation("/talhao-stats")}
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
              onClick={() => setLocation("/reports")}
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

      {/* Modal de Perdas Detalhadas */}
      <Dialog open={perdasModalOpen} onOpenChange={setPerdasModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="pb-3 sm:pb-4 mb-2 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-bold">
              <div className="p-2 rounded-xl bg-destructive/20">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              Perdas por Talhão
            </DialogTitle>
          </DialogHeader>

          {/* Resumo Total */}
          <div className="glass-card p-4 rounded-xl border border-destructive/30 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Perdas</p>
                <p className="text-2xl font-bold text-destructive">
                  R$ {valorEstimado.perdasCampoValorBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-lg font-bold text-destructive">{valorEstimado.perdasCampoArrobasHa.toFixed(1)} @/ha</p>
              </div>
            </div>
          </div>

          {/* Lista de Talhões */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {perdasPorTalhaoComValor.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma perda registrada</p>
              </div>
            ) : (
              perdasPorTalhaoComValor.map((perda) => (
                <div
                  key={perda.talhao}
                  className="p-4 rounded-xl border border-border/30 hover:border-destructive/30 transition-colors bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-bold">{perda.talhao}</span>
                      <span className="text-xs text-muted-foreground">({perda.hectares.toFixed(1)} ha)</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">
                        R$ {perda.valorBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{perda.arrobasHa.toFixed(1)} @/ha</p>
                    </div>
                  </div>

                  {/* Detalhes dos Motivos */}
                  {perda.detalhes.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-border/30">
                      {perda.detalhes.map((detalhe: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-foreground">{detalhe.motivo}</span>
                            <span className="text-muted-foreground"> - {parseFloat(detalhe.arrobasHa).toFixed(1)} @/ha</span>
                            {detalhe.observacao && (
                              <p className="text-xs text-muted-foreground mt-0.5">{detalhe.observacao}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(detalhe.dataPerda).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Histórico - {historicoModal.titulo}
            </DialogTitle>
          </DialogHeader>

          {/* Filtros de Período */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-surface/50 rounded-xl border border-border/30">
            {periodos.map((p) => (
              <button
                key={p.dias}
                onClick={() => mudarPeriodo(p.dias)}
                disabled={historicoLoading}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50",
                  historicoModal.periodo === p.dias
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent hover:border-border/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Indicador do período selecionado */}
          <p className="text-center text-xs text-muted-foreground">
            {historicoModal.periodo === 1 && "Mostrando últimas 24 horas"}
            {historicoModal.periodo === 7 && "Mostrando últimos 7 dias"}
            {historicoModal.periodo === 14 && "Mostrando últimos 14 dias"}
            {historicoModal.periodo === 30 && "Mostrando últimos 30 dias"}
            {historicoModal.periodo === 120 && "Mostrando últimos 4 meses"}
            {historicoModal.periodo === 180 && "Mostrando últimos 6 meses"}
            {historicoModal.periodo === 365 && "Mostrando último ano"}
            {historicoModal.periodo === 3650 && "Mostrando últimos 10 anos"}
          </p>

          <div className="mt-2">
            {historicoLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : historicoData?.historico && historicoData.historico.length > 0 ? (
              <div className="space-y-4">
                {/* Valor Atual */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface">
                  <span className="text-sm text-muted-foreground">Valor atual</span>
                  <span className={cn(
                    "text-xl font-bold",
                    historicoModal.tipo === 'dolar' ? "text-green-500" :
                    historicoModal.tipo === 'algodao' ? "text-amber-500" :
                    historicoModal.tipo === 'pluma' ? "text-purple-500" : "text-orange-500"
                  )}>
                    {historicoModal.tipo === 'dolar' && `R$ ${cotacaoData?.usdBrl?.toFixed(4) || '-'}`}
                    {historicoModal.tipo === 'algodao' && `${cotacaoData?.cottonUSD?.toFixed(2) || '-'} ¢/lb`}
                    {historicoModal.tipo === 'pluma' && `R$ ${cotacaoPluma.toFixed(2)}/@`}
                    {historicoModal.tipo === 'caroco' && `R$ ${cotacaoCaroco.toFixed(2)}/@`}
                  </span>
                </div>

                {/* Gráfico */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicoData.historico}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={
                            historicoModal.tipo === 'dolar' ? '#22c55e' :
                            historicoModal.tipo === 'algodao' ? '#f59e0b' :
                            historicoModal.tipo === 'pluma' ? '#a855f7' : '#f97316'
                          } stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={
                            historicoModal.tipo === 'dolar' ? '#22c55e' :
                            historicoModal.tipo === 'algodao' ? '#f59e0b' :
                            historicoModal.tipo === 'pluma' ? '#a855f7' : '#f97316'
                          } stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="data"
                        tick={{ fill: '#888', fontSize: 10 }}
                        tickFormatter={(value, index) => {
                          const date = new Date(value);
                          // 24H - mostrar horas
                          if (historicoModal.periodo === 1) {
                            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                          }
                          // Até 30 dias - mostrar dia/mês
                          if (historicoModal.periodo <= 30) {
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }
                          // Acima de 30 dias - mostrar mês/ano
                          return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: '#888', fontSize: 10 }}
                        tickFormatter={(value) => {
                          if (historicoModal.tipo === 'dolar') return value.toFixed(2);
                          if (historicoModal.tipo === 'algodao') return `${value.toFixed(0)}`;
                          return value.toFixed(0);
                        }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value: number) => {
                          if (historicoModal.tipo === 'dolar') return [`R$ ${value.toFixed(4)}`, 'Valor'];
                          if (historicoModal.tipo === 'algodao') return [`${value.toFixed(2)} ¢/lb`, 'Valor'];
                          return [`R$ ${value.toFixed(2)}/@`, 'Valor'];
                        }}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          if (historicoModal.periodo === 1) {
                            return date.toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                          return date.toLocaleDateString('pt-BR');
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke={
                          historicoModal.tipo === 'dolar' ? '#22c55e' :
                          historicoModal.tipo === 'algodao' ? '#f59e0b' :
                          historicoModal.tipo === 'pluma' ? '#a855f7' : '#f97316'
                        }
                        strokeWidth={2}
                        fill="url(#colorValor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-surface">
                    <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                    <p className="text-lg font-bold text-red-400">
                      {historicoModal.tipo === 'dolar' && 'R$ '}
                      {Math.min(...historicoData.historico.map((h: any) => h.valor)).toFixed(2)}
                      {historicoModal.tipo === 'algodao' && ' ¢'}
                      {(historicoModal.tipo === 'pluma' || historicoModal.tipo === 'caroco') && '/@'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface">
                    <p className="text-xs text-muted-foreground mb-1">Média</p>
                    <p className="text-lg font-bold text-foreground">
                      {historicoModal.tipo === 'dolar' && 'R$ '}
                      {(historicoData.historico.reduce((acc: number, h: any) => acc + h.valor, 0) / historicoData.historico.length).toFixed(2)}
                      {historicoModal.tipo === 'algodao' && ' ¢'}
                      {(historicoModal.tipo === 'pluma' || historicoModal.tipo === 'caroco') && '/@'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface">
                    <p className="text-xs text-muted-foreground mb-1">Máximo</p>
                    <p className="text-lg font-bold text-green-400">
                      {historicoModal.tipo === 'dolar' && 'R$ '}
                      {Math.max(...historicoData.historico.map((h: any) => h.valor)).toFixed(2)}
                      {historicoModal.tipo === 'algodao' && ' ¢'}
                      {(historicoModal.tipo === 'pluma' || historicoModal.tipo === 'caroco') && '/@'}
                    </p>
                  </div>
                </div>

                {/* Info adicional */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                  <span>
                    {historicoData.historico.length} registros
                    {historicoData.fonte === 'cache' && ' (estimado)'}
                  </span>
                  <span>
                    {historicoModal.tipo === 'dolar' && 'Fonte: AwesomeAPI'}
                    {historicoModal.tipo === 'algodao' && 'Fonte: Alpha Vantage'}
                    {historicoModal.tipo === 'pluma' && `Dólar médio: R$ ${historicoData.dolarMedio?.toFixed(2) || '-'}`}
                    {historicoModal.tipo === 'caroco' && 'Calculado: 27% da pluma'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Dados de histórico não disponíveis</p>
                <p className="text-xs mt-2">
                  {historicoData?.message || 'A API pode estar temporariamente indisponível'}
                </p>
                <button
                  onClick={() => refetchHistorico()}
                  className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
