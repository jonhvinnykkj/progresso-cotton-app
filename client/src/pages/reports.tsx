import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { API_URL } from "@/lib/api-config";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Bale } from "@shared/schema";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos de relatório
type ReportType = "safra-summary" | "productivity" | "shipments" | "processing" | "inventory";

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: "safra-summary",
    title: "Resumo da Safra",
    description: "KPIs gerais e métricas principais",
    icon: Wheat,
    color: "text-green-500",
  },
  {
    id: "productivity",
    title: "Produtividade",
    description: "Análise por talhão: prevista vs real",
    icon: TrendingUp,
    color: "text-blue-500",
  },
  {
    id: "shipments",
    title: "Carregamentos",
    description: "Lista completa de carregamentos",
    icon: Truck,
    color: "text-orange-500",
  },
  {
    id: "processing",
    title: "Beneficiamento",
    description: "Lotes, pluma e fardinhos",
    icon: Factory,
    color: "text-purple-500",
  },
  {
    id: "inventory",
    title: "Inventário",
    description: "Status atual dos fardos",
    icon: Package,
    color: "text-cyan-500",
  },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);
  const [selectedSafra, setSelectedSafra] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<ReportType>("safra-summary");

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

  // Query de fardos (para contar)
  const { data: bales = [], isLoading: balesLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  // Safras disponíveis
  const uniqueSafras = useMemo(() => {
    const fromBales = Array.from(new Set(bales.map(b => b.safra).filter(Boolean)));
    const fromSafras = allSafras.map(s => s.nome);
    const combined = Array.from(new Set([...fromBales, ...fromSafras]));
    return combined.sort().reverse();
  }, [bales, allSafras]);

  const currentSafra = selectedSafra || safraAtiva?.nome || uniqueSafras[0] || "";

  // Contagem de fardos filtrados (para preview)
  const filteredBalesCount = useMemo(() => {
    return bales.filter(b => {
      if (b.safra !== currentSafra) return false;
      if (selectedStatus.length > 0 && !selectedStatus.includes(b.status)) return false;
      if (selectedTalhoes.length > 0 && b.talhao && !selectedTalhoes.includes(b.talhao)) return false;
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

  // Toggle status filter
  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle talhão filter
  const toggleTalhao = (talhao: string) => {
    setSelectedTalhoes(prev =>
      prev.includes(talhao)
        ? prev.filter(t => t !== talhao)
        : [...prev, talhao]
    );
  };

  // Clear filters
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedStatus(["campo", "patio", "beneficiado"]);
    setSelectedTalhoes([]);
  };

  const hasActiveFilters = dateFrom || dateTo || selectedStatus.length < 3 || selectedTalhoes.length > 0;

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
      const fullUrl = API_URL ? `${API_URL}${endpoint}?${params.toString()}` : `${endpoint}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        headers,
        credentials: 'include',
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
      const reportName = REPORT_OPTIONS.find(r => r.id === selectedReport)?.title || "relatorio";
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

  const selectedReportInfo = REPORT_OPTIONS.find(r => r.id === selectedReport);

  return (
    <Page>
      <PageContent className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/20 mb-4">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Exportar Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Gere relatórios profissionais em PDF ou Excel
          </p>
        </div>

        {/* Seletor de Safra */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Safra</Label>
              <Select value={currentSafra} onValueChange={setSelectedSafra}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <Wheat className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Selecione a safra" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSafras.map(safra => (
                    <SelectItem key={safra} value={safra}>Safra {safra}</SelectItem>
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
                  {(dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (selectedStatus.length < 3 ? 1 : 0) + (selectedTalhoes.length > 0 ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtros Avançados</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Período */}
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

              {/* Status */}
              <div>
                <Label className="text-xs text-muted-foreground">Status dos fardos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { id: "campo", label: "Campo", color: "bg-green-500" },
                    { id: "patio", label: "Pátio", color: "bg-orange-500" },
                    { id: "beneficiado", label: "Beneficiado", color: "bg-blue-500" },
                  ].map(status => (
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

              {/* Talhões */}
              {talhoesSafra.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Talhões específicos</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                    {talhoesSafra.map(t => (
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
        </div>

        {/* Tipo de Relatório */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Tipo de Relatório
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORT_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = selectedReport === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedReport(option.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-glow-sm"
                      : "border-border/50 hover:border-primary/50 hover:bg-surface"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    isSelected ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : option.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium", isSelected && "text-primary")}>{option.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview e Download */}
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pronto para exportar</h3>
            <span className="text-xs text-muted-foreground">
              Safra {currentSafra}
            </span>
          </div>

          {/* Info do relatório */}
          <div className="bg-surface/50 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-3 mb-3">
              {selectedReportInfo && (
                <>
                  <div className="p-2 rounded-lg bg-primary/20">
                    <selectedReportInfo.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedReportInfo.title}</p>
                    <p className="text-xs text-muted-foreground">{selectedReportInfo.description}</p>
                  </div>
                </>
              )}
            </div>

            <div className="text-sm text-muted-foreground border-t border-border/30 pt-3">
              <p><strong>{filteredBalesCount.toLocaleString('pt-BR')}</strong> fardos serão incluídos no relatório</p>
              {hasActiveFilters && (
                <p className="text-xs mt-1">
                  (Com filtros aplicados)
                </p>
              )}
            </div>
          </div>

          {/* Botões de Download */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => downloadReport("pdf")}
              disabled={isGenerating || balesLoading}
              size="lg"
              className="bg-red-600 hover:bg-red-700 rounded-xl h-14"
            >
              {isGenerating && generatingFormat === "pdf" ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <FileDown className="w-5 h-5 mr-2" />
              )}
              <div className="text-left">
                <p className="font-semibold">PDF</p>
                <p className="text-xs opacity-80">Documento</p>
              </div>
            </Button>
            <Button
              onClick={() => downloadReport("excel")}
              disabled={isGenerating || balesLoading}
              size="lg"
              className="bg-green-600 hover:bg-green-700 rounded-xl h-14"
            >
              {isGenerating && generatingFormat === "excel" ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 mr-2" />
              )}
              <div className="text-left">
                <p className="font-semibold">Excel</p>
                <p className="text-xs opacity-80">Planilha</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Dados atualizados em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </PageContent>
    </Page>
  );
}
