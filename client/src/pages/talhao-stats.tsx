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
  AlertTriangle,
  Clock,
  Download,
  Share2,
  Zap,
  TrendingDown,
  CircleAlert,
  CheckCircle2,
  CalendarClock,
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
import { useState, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [periodoFiltro, setPeriodoFiltro] = useState<"7d" | "14d" | "30d" | "all">("14d");
  const [perdasModalOpen, setPerdasModalOpen] = useState(false);
  const beneficiamentoCardRef = useRef<HTMLDivElement>(null);

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

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

  const { data: safraStats = [] } = useQuery<SafraStats[]>({
    queryKey: ["/api/bales/stats-by-safra"],
    staleTime: 60000,
  });

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
    enabled: !!selectedSafra,
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
    enabled: !!selectedSafra,
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
    enabled: !!selectedSafra,
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
    enabled: !!selectedSafra,
  });

  // Query para buscar perdas por talhão
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

  // Query para buscar todas as perdas (com detalhes)
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

  // Query para buscar cotação do algodão
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

  const cotacaoPluma = cotacaoData?.pluma || 140;
  const cotacaoCaroco = cotacaoData?.caroco || 38;

  // Valor médio por arroba (média ponderada entre pluma e caroço)
  const valorMedioPorArroba = (cotacaoPluma * 0.40 + cotacaoCaroco * 0.57) / 0.97;

  // Calcular total de perdas em @/ha
  const totalPerdasArrobasHa = perdasTotais.reduce((acc, p) => acc + (p.totalPerdas || 0), 0);

  // Calcular perdas por talhão com valor em R$
  const perdasPorTalhaoComValor = useMemo(() => {
    return perdasTotais.map(p => {
      const talhaoInfo = talhoesSafra.find(t => t.nome === p.talhao);
      const hectares = talhaoInfo ? parseFloat(talhaoInfo.hectares.replace(",", ".")) : 0;
      const arrobasTotais = p.totalPerdas * hectares;
      const valorBRL = arrobasTotais * valorMedioPorArroba;

      // Buscar os detalhes (motivos) das perdas deste talhão
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

  // Total geral das perdas em R$
  const totalPerdasValorBRL = perdasPorTalhaoComValor.reduce((acc, p) => acc + p.valorBRL, 0);

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
      totalPesoToneladas: totalPesoKg / 1000,
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

  // Peso médio por fardinho (peso pluma total / total de fardinhos)
  const pesoMedioPorFardinho = useMemo(() => {
    if (totaisFardinhos.totalFardinhos === 0 || totaisLotes.totalPesoPluma === 0) return 0;
    return totaisLotes.totalPesoPluma / totaisFardinhos.totalFardinhos;
  }, [totaisFardinhos.totalFardinhos, totaisLotes.totalPesoPluma]);

  // Rendimento calculado (peso pluma / peso bruto) - movido para cima para uso nos alertas
  const rendimentoCalculado = useMemo(() => {
    if (totaisCarregamentos.totalPesoKg === 0 || totaisLotes.totalPesoPluma === 0) return 0;
    return (totaisLotes.totalPesoPluma / totaisCarregamentos.totalPesoKg) * 100;
  }, [totaisCarregamentos.totalPesoKg, totaisLotes.totalPesoPluma]);

  // ========== NOVOS RECURSOS ==========

  // Dados de fardinhos por dia (sparkline) - baseado no período selecionado
  const fardinhosEvolucao = useMemo(() => {
    const diasPeriodo = periodoFiltro === "7d" ? 7 : periodoFiltro === "14d" ? 14 : periodoFiltro === "30d" ? 30 : 60;
    const days: Record<string, { date: string; fardinhos: number; pluma: number }> = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - diasPeriodo);

    // Inicializar dias
    for (let i = diasPeriodo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      days[key] = { date: label, fardinhos: 0, pluma: 0 };
    }

    // Somar fardinhos por dia
    fardinhos
      .filter(f => new Date(f.dataRegistro) >= startDate)
      .forEach(f => {
        const key = new Date(f.dataRegistro).toISOString().split('T')[0];
        if (days[key]) {
          days[key].fardinhos += f.quantidade || 0;
        }
      });

    // Somar peso pluma por dia
    lotes
      .filter(l => new Date(l.dataProcessamento) >= startDate)
      .forEach(l => {
        const key = new Date(l.dataProcessamento).toISOString().split('T')[0];
        if (days[key]) {
          days[key].pluma += parseFloat(l.pesoPluma) || 0;
        }
      });

    return Object.values(days);
  }, [fardinhos, lotes, periodoFiltro]);

  // Projeção de conclusão do beneficiamento
  const projecaoConclusao = useMemo(() => {
    const totalFardosParaBeneficiar = (globalStats?.campo || 0) + (globalStats?.patio || 0);
    const fardosBeneficiados = globalStats?.beneficiado || 0;

    if (totalFardosParaBeneficiar === 0 || fardosBeneficiados === 0) {
      return { diasRestantes: null, dataEstimada: null, velocidadeMedia: 0 };
    }

    // Calcular velocidade média de beneficiamento (fardos/dia) dos últimos 14 dias
    const quatorzeDiasAtras = new Date();
    quatorzeDiasAtras.setDate(quatorzeDiasAtras.getDate() - 14);

    const fardosBeneficiadosRecentes = allBales.filter(b =>
      b.status === "beneficiado" &&
      b.processedAt &&
      new Date(b.processedAt) >= quatorzeDiasAtras
    ).length;

    const velocidadeMedia = fardosBeneficiadosRecentes / 14; // fardos por dia

    if (velocidadeMedia === 0) {
      return { diasRestantes: null, dataEstimada: null, velocidadeMedia: 0 };
    }

    const diasRestantes = Math.ceil(totalFardosParaBeneficiar / velocidadeMedia);
    const dataEstimada = new Date();
    dataEstimada.setDate(dataEstimada.getDate() + diasRestantes);

    return {
      diasRestantes,
      dataEstimada,
      velocidadeMedia: Math.round(velocidadeMedia * 10) / 10,
    };
  }, [globalStats, allBales]);

  // Alertas inteligentes
  const alertasInteligentes = useMemo(() => {
    const alertas: Array<{
      tipo: "warning" | "danger" | "success" | "info";
      titulo: string;
      mensagem: string;
      valor?: string;
    }> = [];

    // Alerta: Rendimento abaixo da média (< 38%)
    if (rendimentoCalculado > 0 && rendimentoCalculado < 38) {
      alertas.push({
        tipo: "warning",
        titulo: "Rendimento Baixo",
        mensagem: "O rendimento de pluma está abaixo da média esperada (38-42%)",
        valor: `${rendimentoCalculado.toFixed(1)}%`,
      });
    }

    // Alerta: Rendimento excelente (> 42%)
    if (rendimentoCalculado > 42) {
      alertas.push({
        tipo: "success",
        titulo: "Rendimento Excelente",
        mensagem: "O rendimento de pluma está acima da média!",
        valor: `${rendimentoCalculado.toFixed(1)}%`,
      });
    }

    // Alerta: Muitos fardos no campo
    const percentualCampo = globalStats?.total ? ((globalStats.campo || 0) / globalStats.total) * 100 : 0;
    if (percentualCampo > 50 && (globalStats?.campo || 0) > 100) {
      alertas.push({
        tipo: "warning",
        titulo: "Fardos Acumulados no Campo",
        mensagem: `${percentualCampo.toFixed(0)}% dos fardos ainda estão no campo`,
        valor: `${globalStats?.campo || 0} fardos`,
      });
    }

    // Alerta: Beneficiamento lento
    if (projecaoConclusao.diasRestantes && projecaoConclusao.diasRestantes > 60) {
      alertas.push({
        tipo: "danger",
        titulo: "Beneficiamento Lento",
        mensagem: "No ritmo atual, levará mais de 60 dias para concluir",
        valor: `${projecaoConclusao.diasRestantes} dias`,
      });
    }

    // Alerta: Produtividade real vs prevista
    if (totaisProdutividade.produtividadeRealMedia > 0 && totaisProdutividade.produtividadePrevistaMedia > 0) {
      const diff = ((totaisProdutividade.produtividadeRealMedia - totaisProdutividade.produtividadePrevistaMedia) / totaisProdutividade.produtividadePrevistaMedia) * 100;
      if (diff < -10) {
        alertas.push({
          tipo: "warning",
          titulo: "Produtividade Abaixo do Previsto",
          mensagem: "A produtividade real está abaixo da estimativa inicial",
          valor: `${diff.toFixed(1)}%`,
        });
      } else if (diff > 10) {
        alertas.push({
          tipo: "success",
          titulo: "Produtividade Acima do Previsto",
          mensagem: "Excelente! A produtividade real superou a estimativa",
          valor: `+${diff.toFixed(1)}%`,
        });
      }
    }

    // Alerta: Sem registros de fardinhos
    if (totaisLotes.totalPesoPluma > 0 && totaisFardinhos.totalFardinhos === 0) {
      alertas.push({
        tipo: "info",
        titulo: "Fardinhos Não Registrados",
        mensagem: "Há peso de pluma registrado mas sem fardinhos cadastrados",
      });
    }

    return alertas;
  }, [rendimentoCalculado, globalStats, projecaoConclusao, totaisProdutividade, totaisLotes.totalPesoPluma, totaisFardinhos.totalFardinhos]);

  // Média de fardinhos por dia (para tendência)
  const mediaFardinhosPorDia = useMemo(() => {
    const diasComDados = fardinhosEvolucao.filter(d => d.fardinhos > 0);
    if (diasComDados.length === 0) return 0;
    const total = diasComDados.reduce((acc, d) => acc + d.fardinhos, 0);
    return total / diasComDados.length;
  }, [fardinhosEvolucao]);

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
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Card 1: Total de Fardos */}
              <div
                className="glass-card p-2.5 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <span className="text-[9px] sm:text-xs text-primary font-semibold uppercase">Total</span>
                  </div>
                  <p className="text-xl sm:text-4xl font-display font-bold text-glow mb-0.5 sm:mb-1">
                    <AnimatedCounter value={globalStats?.total || 0} />
                  </p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">fardos</p>
                  <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-neon-cyan rounded-full"
                      style={{ width: `${taxaBeneficiamento}%` }}
                    />
                  </div>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1">{taxaBeneficiamento.toFixed(0)}% benef.</p>
                </div>
              </div>

              {/* Card 2: Produtividade */}
              <div
                className="glass-card p-2.5 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-cyan transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-neon-cyan/20">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-cyan" />
                    </div>
                    <span className="text-[9px] sm:text-xs text-neon-cyan font-semibold uppercase">@/ha</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-0.5 sm:mb-1">
                    <div className="flex items-center gap-2 sm:block">
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase">Prev</p>
                      <p className="text-base sm:text-2xl font-display font-bold text-foreground">
                        {totaisProdutividade.produtividadePrevistaMedia > 0
                          ? totaisProdutividade.produtividadePrevistaMedia.toFixed(0)
                          : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:block">
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase">Real</p>
                      <p className="text-base sm:text-2xl font-display font-bold text-foreground">
                        {totaisProdutividade.produtividadeRealMedia > 0
                          ? totaisProdutividade.produtividadeRealMedia.toFixed(0)
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {totaisProdutividade.produtividadePrevistaMedia > 0 && totaisProdutividade.produtividadeRealMedia > 0 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold",
                      totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                        ? "text-green-500"
                        : "text-red-500"
                    )}>
                      {totaisProdutividade.produtividadeRealMedia >= totaisProdutividade.produtividadePrevistaMedia
                        ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                      {(((totaisProdutividade.produtividadeRealMedia - totaisProdutividade.produtividadePrevistaMedia) / totaisProdutividade.produtividadePrevistaMedia) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Volume Processado */}
              <div
                className="glass-card p-2.5 sm:p-5 rounded-xl relative overflow-hidden group hover:shadow-glow-orange transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/20 to-transparent opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-neon-orange/20">
                      <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-orange" />
                    </div>
                    <span className="text-[9px] sm:text-xs text-neon-orange font-semibold uppercase">Peso</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-display font-bold mb-0.5 sm:mb-1">
                    {totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    <span className="text-xs sm:text-base text-neon-orange ml-0.5">t</span>
                  </p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">{totaisCarregamentos.totalCarregamentos} carreg.</p>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              {/* Status: Campo */}
              <div className="glass-card p-3 sm:p-4 rounded-xl border-l-4 border-l-primary">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Campo</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">{globalStats?.campo || 0}</p>
              </div>

              {/* Status: Pátio */}
              <div className="glass-card p-3 sm:p-4 rounded-xl border-l-4 border-l-neon-orange">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-neon-orange/20">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-neon-orange" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Pátio</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">{globalStats?.patio || 0}</p>
              </div>

              {/* Status: Beneficiado */}
              <div className="glass-card p-3 sm:p-4 rounded-xl border-l-4 border-l-neon-cyan">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-neon-cyan/20">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-cyan" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Benef.</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-foreground">{globalStats?.beneficiado || 0}</p>
              </div>

              {/* Total */}
              <div className="glass-card p-3 sm:p-4 rounded-xl border-l-4 border-l-accent">
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-accent/20">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total</span>
                </div>
                <p className="text-xl sm:text-3xl font-bold">{globalStats?.total || 0}</p>
              </div>

              {/* Perdas */}
              <button
                onClick={() => setPerdasModalOpen(true)}
                className="glass-card p-3 sm:p-4 rounded-xl border-l-4 border-l-destructive hover:bg-destructive/5 transition-colors text-left group"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/20">
                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Perdas</span>
                </div>
                <p className="text-xl sm:text-3xl font-display font-bold text-destructive">{totalPerdasArrobasHa.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">@/ha</p>
                {totalPerdasValorBRL > 0 && (
                  <p className="text-xs text-destructive/70 mt-1">
                    R$ {(totalPerdasValorBRL / 1000).toFixed(0)}k
                  </p>
                )}
                <p className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1">Clique para detalhes</p>
              </button>
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

            {/* Métricas Chave */}
            <div className="grid grid-cols-2 gap-3">
              {/* Peso Bruto */}
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Peso Bruto</p>
                <p className="text-2xl font-bold">{totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-muted-foreground">t</span></p>
              </div>
              {/* Rendimento */}
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Rendimento Pluma</p>
                <p className="text-2xl font-bold">{rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(1)}%` : '-'}</p>
              </div>
            </div>

            {/* Seção de Beneficiamento */}
            <div className="glass-card p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Factory className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold">Beneficiamento</h3>
              </div>

              {/* Grid simplificado */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-surface/50">
                  <p className="text-2xl font-bold">{totaisLotes.totalPesoPluma > 0 ? totaisLotes.totalPesoPluma.toLocaleString('pt-BR') : '-'}</p>
                  <p className="text-xs text-muted-foreground">Peso Pluma (kg)</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-surface/50">
                  <p className="text-2xl font-bold">{totaisFardinhos.totalFardinhos > 0 ? totaisFardinhos.totalFardinhos.toLocaleString('pt-BR') : '-'}</p>
                  <p className="text-xs text-muted-foreground">Fardinhos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-surface/50">
                  <p className="text-2xl font-bold">{pesoMedioPorFardinho > 0 ? pesoMedioPorFardinho.toFixed(1) : '-'}</p>
                  <p className="text-xs text-muted-foreground">Peso/Fardinho (kg)</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-surface/50">
                  <p className="text-2xl font-bold">{totaisLotes.totalLotes > 0 ? totaisLotes.totalLotes : '-'}</p>
                  <p className="text-xs text-muted-foreground">Lotes</p>
                </div>
              </div>

              {/* Barra de progresso simples */}
              {totaisCarregamentos.totalPesoKg > 0 && totaisLotes.totalPesoPluma > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Conversão Bruto → Pluma</span>
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

              {/* Estado vazio */}
              {totaisLotes.totalPesoPluma === 0 && totaisFardinhos.totalFardinhos === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados de beneficiamento</p>
              )}
            </div>

            {/* Top 5 Talhões - Com cores de ranking */}
            {topTalhoes.length > 0 && (
              <div className="glass-card p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold">Top 5 Talhões por Produtividade</h3>
                </div>
                <div className="space-y-2">
                  {topTalhoes.map((t, index) => {
                    const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-muted-foreground', 'text-muted-foreground'];
                    const bgColors = ['bg-yellow-500/10', 'bg-gray-400/10', 'bg-amber-600/10', 'bg-surface/50', 'bg-surface/50'];
                    return (
                      <div key={t.talhao} className={cn("flex items-center justify-between p-3 rounded-lg", bgColors[index])}>
                        <div className="flex items-center gap-3">
                          <span className={cn("font-bold w-6 text-center", rankColors[index])}>{index + 1}º</span>
                          <span className="font-medium">{t.talhao}</span>
                          <span className="text-xs text-muted-foreground">{t.hectares.toFixed(0)} ha</span>
                        </div>
                        <span className="font-bold text-primary">{t.arrobasPorHa.toFixed(0)} @/ha</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                <p className="text-lg font-display font-bold text-foreground">{totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
                <p className="text-xs text-muted-foreground">Peso Bruto (t)</p>
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
                          <p className="text-lg font-display font-bold text-foreground">{totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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

              <div className="glass-card p-4 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg", pesoMedioPorFardinho > 0 ? "bg-amber-500/20" : "bg-muted/20")}>
                    <Scale className={cn("w-4 h-4", pesoMedioPorFardinho > 0 ? "text-amber-400" : "text-muted-foreground")} />
                  </div>
                </div>
                <p className={cn("text-lg font-bold", pesoMedioPorFardinho > 0 ? "text-amber-400" : "text-muted-foreground")}>
                  {pesoMedioPorFardinho > 0 ? `${pesoMedioPorFardinho.toFixed(1)}` : "-"}
                  {pesoMedioPorFardinho > 0 && <span className="text-xs ml-1">kg</span>}
                </p>
                <p className="text-xs text-muted-foreground">Peso/Fardinho</p>
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
                  <span>Bruto: {totaisCarregamentos.totalPesoToneladas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t</span>
                  <span>Pluma: {totaisLotes.totalPesoPluma.toLocaleString('pt-BR')} kg</span>
                </div>
              </div>
            )}

            {/* Grid de Gráficos de Evolução */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evolução dos Lotes */}
              {lotes.length > 0 && (
                <div className="glass-card p-4 rounded-xl">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-purple-400" />
                    Evolução dos Lotes
                  </h3>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={(() => {
                          const lotesAgrupados = lotes.reduce((acc, lote) => {
                            const data = new Date(lote.dataProcessamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            if (!acc[data]) acc[data] = { peso: 0, qtd: 0 };
                            acc[data].peso += parseFloat(lote.pesoPluma);
                            acc[data].qtd += 1;
                            return acc;
                          }, {} as Record<string, { peso: number; qtd: number }>);
                          return Object.entries(lotesAgrupados)
                            .map(([data, vals]) => ({ data, peso: vals.peso, qtd: vals.qtd }))
                            .slice(-14);
                        })()}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorLotes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#666' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#666' }} width={40} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                          formatter={(value: number) => [`${value.toLocaleString('pt-BR')} kg`]}
                        />
                        <Area type="monotone" dataKey="peso" stroke="#a855f7" fill="url(#colorLotes)" strokeWidth={2} name="Peso Pluma" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Evolução dos Fardinhos */}
              {fardinhos.length > 0 && (
                <div className="glass-card p-4 rounded-xl">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-neon-cyan" />
                    Evolução dos Fardinhos
                  </h3>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={(() => {
                          const fardinhosAgrupados = fardinhos.reduce((acc, f) => {
                            const data = new Date(f.dataRegistro).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            if (!acc[data]) acc[data] = 0;
                            acc[data] += f.quantidade;
                            return acc;
                          }, {} as Record<string, number>);
                          return Object.entries(fardinhosAgrupados)
                            .map(([data, qtd]) => ({ data, qtd }))
                            .slice(-14);
                        })()}
                        margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorFardinhos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#666' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#666' }} width={30} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                          formatter={(value: number) => [`${value} fardinhos`]}
                        />
                        <Area type="monotone" dataKey="qtd" stroke="#00D4FF" fill="url(#colorFardinhos)" strokeWidth={2} name="Fardinhos" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

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
          <TabsContent value="analises" className="space-y-4 mt-4">
            {/* Resumo Numérico */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30 text-center">
                <p className="text-2xl font-bold">{globalStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Fardos</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30 text-center">
                <p className="text-2xl font-bold">{taxaBeneficiamento.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Beneficiado</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30 text-center">
                <p className="text-2xl font-bold">{rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(1)}%` : '-'}</p>
                <p className="text-xs text-muted-foreground">Rendimento</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border/30 text-center">
                <p className="text-2xl font-bold">{fardosPorDia.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Fardos/dia</p>
              </div>
            </div>

            {/* Gráfico: Evolução Temporal */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="font-semibold mb-4">Evolução da Colheita (14 dias)</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} width={30} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#00FF88" fill="url(#colorEvolution)" strokeWidth={2} name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grid 2 colunas: Pizza e Barras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribuição por Status */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4">Distribuição por Status</h3>
                <div className="flex items-center justify-center gap-6">
                  <div className="h-[150px] w-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {pieChartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}: <strong>{item.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ranking de Talhões */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4">Ranking por Produtividade</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topTalhoes.slice(0, 5)}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis dataKey="talhao" type="category" tick={{ fontSize: 11, fill: '#888' }} width={35} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(0)} @/ha`]}
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

            {/* ===== PRODUÇÃO POR TALHÃO ===== */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Produção por Talhão
              </h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={talhaoStats.slice(0, 10).map(t => ({
                      talhao: t.talhao,
                      total: t.total,
                      campo: t.campo,
                      patio: t.patio,
                      beneficiado: t.beneficiado
                    }))}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="talhao" tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} width={35} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="campo" stackId="a" fill="#00FF88" name="Campo" />
                    <Bar dataKey="patio" stackId="a" fill="#FF9500" name="Pátio" />
                    <Bar dataKey="beneficiado" stackId="a" fill="#00D4FF" name="Beneficiado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===== GRID: RENDIMENTO E BENEFICIAMENTO ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Rendimento por Talhão */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-500" />
                  Taxa de Beneficiamento por Talhão
                </h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={talhaoStats
                        .filter(t => t.total > 0)
                        .map(t => ({
                          talhao: t.talhao,
                          taxa: ((t.beneficiado / t.total) * 100)
                        }))
                        .sort((a, b) => b.taxa - a.taxa)
                        .slice(0, 6)}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#666' }} unit="%" />
                      <YAxis dataKey="talhao" type="category" tick={{ fontSize: 11, fill: '#888' }} width={35} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa']}
                      />
                      <Bar dataKey="taxa" fill="#00D4FF" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Peso Médio por Fardinho */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-400" />
                  Métricas de Beneficiamento
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface/50 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Peso Médio/Fardinho</span>
                      <span className="text-2xl font-bold text-purple-400">
                        {pesoMedioPorFardinho > 0 ? `${pesoMedioPorFardinho.toFixed(1)} kg` : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface/50 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rendimento Pluma</span>
                      <span className="text-2xl font-bold text-green-500">
                        {rendimentoCalculado > 0 ? `${rendimentoCalculado.toFixed(2)}%` : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface/50 border border-neon-cyan/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Fardinhos</span>
                      <span className="text-2xl font-bold text-neon-cyan">{totaisFardinhos.totalFardinhos}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== COMPARATIVO POR SAFRA (somente se houver mais de uma) ===== */}
            {safraStats.length > 1 && (
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neon-orange" />
                  Comparativo entre Safras
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={safraStats.map(s => ({
                        safra: `Safra ${s.safra}`,
                        total: s.total,
                        beneficiado: s.beneficiado
                      }))}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="safra" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#666' }} width={35} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="total" fill="#FF9500" name="Total Fardos" />
                      <Bar dataKey="beneficiado" fill="#00D4FF" name="Beneficiados" />
                    </BarChart>
                  </ResponsiveContainer>
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
        {/* Modal de Perdas Detalhadas */}
        <Dialog open={perdasModalOpen} onOpenChange={setPerdasModalOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto z-[9999] rounded-2xl glass-card border-border/50">
            <DialogHeader className="pb-3 sm:pb-4 mb-2 border-b border-border/30">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-bold">
                <div className="p-2 rounded-xl bg-destructive/20">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                Perdas por Talhão
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Detalhamento das perdas registradas na safra {selectedSafra}
              </DialogDescription>
            </DialogHeader>

            {/* Resumo Total */}
            <div className="glass-card p-4 rounded-xl border border-destructive/30 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Perdas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {totalPerdasValorBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Média</p>
                  <p className="text-lg font-bold text-destructive">{totalPerdasArrobasHa.toFixed(1)} @/ha</p>
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
                    className="glass-card p-4 rounded-xl border border-border/30 hover:border-destructive/30 transition-colors"
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
