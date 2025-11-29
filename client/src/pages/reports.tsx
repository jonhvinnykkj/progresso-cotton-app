import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  TrendingUp,
  Package,
  Truck,
  Wheat,
  Factory,
  Filter,
  Download,
  FileText,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  Zap,
  BarChart3,
  Eye,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  History,
  Sparkles,
  Target,
  Scale,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Bale } from "@shared/schema";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

// Tipos de relatório
type ReportType = "safra-summary" | "productivity" | "shipments" | "processing" | "inventory";

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: "safra-summary",
    title: "Resumo da Safra",
    description: "KPIs gerais e métricas principais",
    icon: Wheat,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "productivity",
    title: "Produtividade",
    description: "Análise por talhão: prevista vs real",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "shipments",
    title: "Carregamentos",
    description: "Lista completa de carregamentos",
    icon: Truck,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "processing",
    title: "Beneficiamento",
    description: "Lotes, pluma e fardinhos",
    icon: Factory,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "inventory",
    title: "Inventário",
    description: "Status atual dos fardos",
    icon: Package,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

// Templates pré-configurados
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  reportType: ReportType;
  dateRange: "today" | "week" | "month" | "all";
}

const TEMPLATES: ReportTemplate[] = [
  {
    id: "daily",
    name: "Relatório Diário",
    description: "Resumo do dia atual",
    icon: CalendarDays,
    reportType: "safra-summary",
    dateRange: "today",
  },
  {
    id: "weekly",
    name: "Relatório Semanal",
    description: "Resumo da semana",
    icon: CalendarRange,
    reportType: "productivity",
    dateRange: "week",
  },
  {
    id: "monthly",
    name: "Relatório Mensal",
    description: "Análise completa do mês",
    icon: Calendar,
    reportType: "safra-summary",
    dateRange: "month",
  },
];

// Histórico de relatórios (simulado - em produção seria do backend)
interface ReportHistory {
  id: string;
  name: string;
  type: ReportType;
  format: "pdf" | "excel";
  date: Date;
  size: string;
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);
  const [selectedSafra, setSelectedSafra] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<ReportType>("safra-summary");
  const [activeTab, setActiveTab] = useState<"new" | "templates" | "history">("new");

  // Filtros
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>(["campo", "patio", "beneficiado"]);
  const [selectedTalhoes, setSelectedTalhoes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Talhões dinâmicos da safra ativa
  const { data: settingsData } = useSettings();
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const safraAtiva = settingsData?.safraAtiva;

  // Query de todas as safras
  const { data: allSafras = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["/api/safras"],
  });

  // Query de fardos
  const { data: bales = [], isLoading: balesLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  // Query de carregamentos
  const { data: pesoBrutoTotais = [] } = useQuery<
    { talhao: string; pesoBrutoTotal: number }[]
  >({
    queryKey: ["/api/carregamentos-totais", safraAtiva?.nome],
    queryFn: async () => {
      if (!safraAtiva?.nome) return [];
      const encodedSafra = encodeURIComponent(safraAtiva.nome);
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
    enabled: !!safraAtiva?.nome,
  });

  // Safras disponíveis
  const uniqueSafras = useMemo(() => {
    const fromBales = Array.from(new Set(bales.map((b) => b.safra).filter(Boolean)));
    const fromSafras = allSafras.map((s) => s.nome);
    const combined = Array.from(new Set([...fromBales, ...fromSafras]));
    return combined.sort().reverse();
  }, [bales, allSafras]);

  const currentSafra = selectedSafra || safraAtiva?.nome || uniqueSafras[0] || "";

  // Stats rápidas
  const quickStats = useMemo(() => {
    const safraBales = bales.filter((b) => b.safra === currentSafra);
    const totalFardos = safraBales.length;
    const campo = safraBales.filter((b) => b.status === "campo").length;
    const patio = safraBales.filter((b) => b.status === "patio").length;
    const beneficiado = safraBales.filter((b) => b.status === "beneficiado").length;

    const totalPesoKg = pesoBrutoTotais.reduce(
      (acc, p) => acc + (Number(p.pesoBrutoTotal) || 0),
      0
    );
    const totalHectares = talhoesSafra.reduce(
      (acc, t) => acc + parseFloat(t.hectares.replace(",", ".") || "0"),
      0
    );
    const produtividade =
      totalHectares > 0 && totalPesoKg > 0 ? totalPesoKg / totalHectares / 15 : 0;

    return {
      totalFardos,
      campo,
      patio,
      beneficiado,
      totalPesoToneladas: totalPesoKg / 1000,
      produtividade,
      totalHectares,
      talhoes: talhoesSafra.length,
    };
  }, [bales, currentSafra, pesoBrutoTotais, talhoesSafra]);

  // Contagem de fardos filtrados
  const filteredBalesCount = useMemo(() => {
    return bales.filter((b) => {
      if (b.safra !== currentSafra) return false;
      if (selectedStatus.length > 0 && !selectedStatus.includes(b.status)) return false;
      if (selectedTalhoes.length > 0 && b.talhao && !selectedTalhoes.includes(b.talhao))
        return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(b.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(b.createdAt) > to) return false;
      }
      return true;
    }).length;
  }, [bales, currentSafra, selectedStatus, selectedTalhoes, dateFrom, dateTo]);

  // Histórico simulado
  const reportHistory: ReportHistory[] = useMemo(() => {
    const history: ReportHistory[] = [];
    const types: ReportType[] = ["safra-summary", "productivity", "inventory"];
    const formats: ("pdf" | "excel")[] = ["pdf", "excel"];

    for (let i = 0; i < 5; i++) {
      const type = types[i % types.length];
      const reportInfo = REPORT_OPTIONS.find((r) => r.id === type);
      history.push({
        id: `history-${i}`,
        name: reportInfo?.title || "Relatório",
        type,
        format: formats[i % 2],
        date: subDays(new Date(), i * 2 + 1),
        size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      });
    }
    return history;
  }, []);

  // Toggle filters
  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleTalhao = (talhao: string) => {
    setSelectedTalhoes((prev) =>
      prev.includes(talhao) ? prev.filter((t) => t !== talhao) : [...prev, talhao]
    );
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedStatus(["campo", "patio", "beneficiado"]);
    setSelectedTalhoes([]);
  };

  const hasActiveFilters =
    dateFrom || dateTo || selectedStatus.length < 3 || selectedTalhoes.length > 0;

  // Aplicar template
  const applyTemplate = (template: ReportTemplate) => {
    setSelectedReport(template.reportType);
    const today = new Date();

    switch (template.dateRange) {
      case "today":
        setDateFrom(format(today, "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      case "week":
        setDateFrom(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        setDateTo(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        break;
      case "month":
        setDateFrom(format(startOfMonth(today), "yyyy-MM-dd"));
        setDateTo(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      default:
        setDateFrom("");
        setDateTo("");
    }

    setActiveTab("new");
    toast({
      title: "Template aplicado",
      description: `${template.name} configurado`,
    });
  };

  // Download do relatório
  async function downloadReport(format: "pdf" | "excel") {
    setIsGenerating(true);
    setGeneratingFormat(format);

    try {
      const params = new URLSearchParams();
      params.append("safra", currentSafra);
      params.append("reportType", selectedReport);
      if (dateFrom) params.append("startDate", dateFrom);
      if (dateTo) params.append("endDate", dateTo);
      if (selectedStatus.length < 3) params.append("status", selectedStatus.join(","));
      if (selectedTalhoes.length > 0) params.append("talhoes", selectedTalhoes.join(","));

      const token = localStorage.getItem("cotton_access_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const endpoint = format === "pdf" ? "/api/reports/pdf" : "/api/reports/excel";
      const fullUrl = API_URL
        ? `${API_URL}${endpoint}?${params.toString()}`
        : `${endpoint}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erro ao gerar relatório");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const ext = format === "pdf" ? "pdf" : "xlsx";
      const reportName =
        REPORT_OPTIONS.find((r) => r.id === selectedReport)?.title || "relatorio";
      const filename = `${reportName.toLowerCase().replace(/\s+/g, "-")}-safra-${currentSafra.replace("/", "-")}.${ext}`;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        variant: "success",
        title: "Relatório gerado!",
        description: `${reportName} exportado em ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingFormat(null);
    }
  }

  const selectedReportInfo = REPORT_OPTIONS.find((r) => r.id === selectedReport);

  // Tabs
  const tabs = [
    { id: "new" as const, label: "Novo Relatório", icon: FileText },
    { id: "templates" as const, label: "Templates", icon: Zap },
    { id: "history" as const, label: "Histórico", icon: History },
  ];

  return (
    <Page>
      <PageContent className="max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
              <p className="text-sm text-muted-foreground">
                Exporte relatórios profissionais em PDF ou Excel
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Package className="w-4 h-4" />
                <span className="text-xs uppercase">Fardos</span>
              </div>
              <p className="text-2xl font-bold">{quickStats.totalFardos.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Scale className="w-4 h-4" />
                <span className="text-xs uppercase">Peso</span>
              </div>
              <p className="text-2xl font-bold">
                {quickStats.totalPesoToneladas > 0
                  ? `${quickStats.totalPesoToneladas.toFixed(0)}t`
                  : "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs uppercase">Produtividade</span>
              </div>
              <p className="text-2xl font-bold">
                {quickStats.produtividade > 0
                  ? `${quickStats.produtividade.toFixed(1)} @/ha`
                  : "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs uppercase">Talhões</span>
              </div>
              <p className="text-2xl font-bold">{quickStats.talhoes}</p>
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

          {/* New Report Tab */}
          {activeTab === "new" && (
            <div className="space-y-6">
              {/* Safra Selector */}
              <section className="p-5 rounded-xl bg-card border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Safra
                    </Label>
                    <Select value={currentSafra} onValueChange={setSelectedSafra}>
                      <SelectTrigger className="mt-1 rounded-xl">
                        <Wheat className="w-4 h-4 mr-2 text-primary" />
                        <SelectValue placeholder="Selecione a safra" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueSafras.map((safra) => (
                          <SelectItem key={safra} value={safra}>
                            Safra {safra}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "rounded-xl self-end",
                      hasActiveFilters && "border-primary text-primary"
                    )}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                        {(dateFrom ? 1 : 0) +
                          (dateTo ? 1 : 0) +
                          (selectedStatus.length < 3 ? 1 : 0) +
                          (selectedTalhoes.length > 0 ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Filtros Avançados</span>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs h-7"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Limpar
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Data inicial</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Data final</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Status dos fardos</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { id: "campo", label: "Campo", color: "bg-primary" },
                          { id: "patio", label: "Pátio", color: "bg-orange-500" },
                          { id: "beneficiado", label: "Beneficiado", color: "bg-cyan-500" },
                        ].map((status) => (
                          <button
                            key={status.id}
                            onClick={() => toggleStatus(status.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
                              selectedStatus.includes(status.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-border/80"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full", status.color)} />
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {talhoesSafra.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Talhões específicos
                        </Label>
                        <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                          {talhoesSafra.map((t) => (
                            <button
                              key={t.nome}
                              onClick={() => toggleTalhao(t.nome)}
                              className={cn(
                                "px-2 py-1 rounded text-xs transition-all",
                                selectedTalhoes.includes(t.nome)
                                  ? "bg-primary text-white"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {t.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Report Type Selection */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tipo de Relatório
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {REPORT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedReport === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedReport(option.id)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border/50 hover:border-primary/50 hover:bg-card"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2.5 rounded-xl flex-shrink-0",
                            isSelected ? "bg-primary/20" : option.bgColor
                          )}
                        >
                          <Icon
                            className={cn("w-5 h-5", isSelected ? "text-primary" : option.color)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium", isSelected && "text-primary")}>
                            {option.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Preview & Download */}
              <section className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Preview do Relatório</h3>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-background/50">
                    Safra {currentSafra}
                  </span>
                </div>

                {/* Preview Card */}
                <div className="bg-background/50 backdrop-blur rounded-xl p-5 border border-border/30 mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    {selectedReportInfo && (
                      <>
                        <div className="p-3 rounded-xl bg-primary/20">
                          <selectedReportInfo.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{selectedReportInfo.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedReportInfo.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mini Preview */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-2xl font-bold">{filteredBalesCount}</p>
                      <p className="text-xs text-muted-foreground">Fardos</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-2xl font-bold">
                        {selectedTalhoes.length > 0 ? selectedTalhoes.length : quickStats.talhoes}
                      </p>
                      <p className="text-xs text-muted-foreground">Talhões</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-2xl font-bold">{selectedStatus.length}</p>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/20">
                      <Filter className="w-3 h-3" />
                      <span>Filtros aplicados</span>
                      {dateFrom && <span>• De: {format(new Date(dateFrom), "dd/MM")}</span>}
                      {dateTo && <span>• Até: {format(new Date(dateTo), "dd/MM")}</span>}
                    </div>
                  )}
                </div>

                {/* Download Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => downloadReport("pdf")}
                    disabled={isGenerating || balesLoading}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 rounded-xl h-16"
                  >
                    {isGenerating && generatingFormat === "pdf" ? (
                      <Loader2 className="w-6 h-6 animate-spin mr-3" />
                    ) : (
                      <FileDown className="w-6 h-6 mr-3" />
                    )}
                    <div className="text-left">
                      <p className="font-bold text-base">Baixar PDF</p>
                      <p className="text-xs opacity-80">Documento formatado</p>
                    </div>
                  </Button>
                  <Button
                    onClick={() => downloadReport("excel")}
                    disabled={isGenerating || balesLoading}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 rounded-xl h-16"
                  >
                    {isGenerating && generatingFormat === "excel" ? (
                      <Loader2 className="w-6 h-6 animate-spin mr-3" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6 mr-3" />
                    )}
                    <div className="text-left">
                      <p className="font-bold text-base">Baixar Excel</p>
                      <p className="text-xs opacity-80">Planilha editável</p>
                    </div>
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use templates pré-configurados para gerar relatórios rapidamente
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="p-5 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <span className="text-xs text-primary font-medium">
                          {template.dateRange === "today" && "Período: Hoje"}
                          {template.dateRange === "week" && "Período: Esta semana"}
                          {template.dateRange === "month" && "Período: Este mês"}
                          {template.dateRange === "all" && "Período: Todo"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Template suggestion */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Dica</p>
                    <p className="text-sm text-muted-foreground">
                      Os templates aplicam automaticamente o tipo de relatório e o período. Você
                      pode ajustar os filtros depois de aplicar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Relatórios gerados recentemente
              </p>

              {reportHistory.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-card border border-border/50">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Nenhum relatório gerado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reportHistory.map((report) => {
                    const reportInfo = REPORT_OPTIONS.find((r) => r.id === report.type);
                    const Icon = reportInfo?.icon || FileText;
                    return (
                      <div
                        key={report.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all"
                      >
                        <div
                          className={cn(
                            "p-2.5 rounded-xl",
                            report.format === "pdf" ? "bg-red-500/10" : "bg-green-500/10"
                          )}
                        >
                          {report.format === "pdf" ? (
                            <FileDown
                              className={cn(
                                "w-5 h-5",
                                report.format === "pdf" ? "text-red-500" : "text-green-500"
                              )}
                            />
                          ) : (
                            <FileSpreadsheet className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{report.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(report.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} •{" "}
                            {report.size}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium uppercase",
                              report.format === "pdf"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-green-500/10 text-green-500"
                            )}
                          >
                            {report.format}
                          </span>
                          <Button variant="ghost" size="sm" className="rounded-lg">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center">
            Dados atualizados em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </PageContent>
    </Page>
  );
}
