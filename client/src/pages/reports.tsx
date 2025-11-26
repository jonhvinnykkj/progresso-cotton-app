import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  Calendar,
  Filter,
  Download,
  Eye,
  TrendingUp,
  BarChart3,
  Clock,
  Settings,
  FileText,
  Package,
  Truck,
  CheckCircle,
  MapPin,
  AlertCircle,
  Wheat,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Bale } from "@shared/schema";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import logoFavicon from "/favicon.png";

interface ReportFilters {
  startDate: string;
  endDate: string;
  status: string[];
  talhao: string[];
  safra: string;
}

interface ReportPreview {
  totalFardos: number;
  pesoBrutoTotal: number;
  pesoLiquidoTotal: number;
  porStatus: Record<string, number>;
  porTalhao: Record<string, number>;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "",
    endDate: "",
    status: [],
    talhao: [],
    safra: "",
  });

  const [reportOptions, setReportOptions] = useState({
    includeCharts: true,
    includeTimeline: true,
    groupByTalhao: true,
    groupBySafra: false,
    detailedView: true,
  });

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  const uniqueTalhoes = Array.from(new Set(bales.map(b => b.talhao).filter(Boolean))).sort();
  const uniqueSafras = Array.from(new Set(bales.map(b => b.safra).filter(Boolean))).sort();

  const filteredBales = bales.filter(bale => {
    if (filters.startDate && new Date(bale.createdAt) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(bale.createdAt) > new Date(filters.endDate)) return false;
    if (filters.status.length > 0 && !filters.status.includes(bale.status)) return false;
    if (filters.talhao.length > 0 && bale.talhao && !filters.talhao.includes(bale.talhao)) return false;
    if (filters.safra && bale.safra !== filters.safra) return false;
    return true;
  });

  const preview: ReportPreview = {
    totalFardos: filteredBales.length,
    pesoBrutoTotal: 0,
    pesoLiquidoTotal: 0,
    porStatus: filteredBales.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    porTalhao: filteredBales.reduce((acc, b) => {
      if (b.talhao) acc[b.talhao] = (acc[b.talhao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const toggleTalhao = (talhao: string) => {
    setFilters(prev => ({
      ...prev,
      talhao: prev.talhao.includes(talhao)
        ? prev.talhao.filter(t => t !== talhao)
        : [...prev.talhao, talhao]
    }));
  };

  const toggleAllTalhoes = () => {
    setFilters(prev => ({
      ...prev,
      talhao: prev.talhao.length === uniqueTalhoes.length ? [] : [...uniqueTalhoes]
    }));
  };

  async function downloadReport(type: "pdf" | "excel") {
    setIsGenerating(true);

    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.status.length > 0) params.append("status", filters.status.join(","));
      if (filters.talhao.length > 0) params.append("talhao", filters.talhao.join(","));
      if (filters.safra) params.append("safra", filters.safra);

      params.append("includeCharts", reportOptions.includeCharts.toString());
      params.append("includeTimeline", reportOptions.includeTimeline.toString());
      params.append("groupByTalhao", reportOptions.groupByTalhao.toString());
      params.append("groupBySafra", reportOptions.groupBySafra.toString());
      params.append("detailedView", reportOptions.detailedView.toString());

      const token = localStorage.getItem("cotton_access_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const endpoint = type === "pdf" ? "/api/reports/pdf" : "/api/reports/excel";
      const fullUrl = API_URL ? `${API_URL}${endpoint}?${params.toString()}` : `${endpoint}?${params.toString()}`;
      const response = await fetch(fullUrl, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar relatório");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
      const filename = `relatorio-cotton-${timestamp}.${type === "pdf" ? "pdf" : "xlsx"}`;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        variant: "success",
        title: "Relatório gerado com sucesso!",
        description: `${preview.totalFardos} fardos incluídos no relatório ${type.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Page>
      <PageContent className="max-w-7xl space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-neon-orange/5" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <img src={logoFavicon} alt="Cotton" className="h-10 w-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">
                    <span className="gradient-text">Relatórios</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Configure e gere relatórios personalizados em PDF ou Excel
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl border-border/50 hover:border-primary/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Data Filters */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20">
                    <Filter className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Filtros de Dados</h2>
                    <p className="text-sm text-muted-foreground">Selecione os critérios para filtrar os dados</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Calendar className="h-4 w-4 text-primary" />
                      Data Inicial
                    </Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="h-11 rounded-xl bg-surface border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Calendar className="h-4 w-4 text-primary" />
                      Data Final
                    </Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="h-11 rounded-xl bg-surface border-border/50 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Safra */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Wheat className="h-4 w-4 text-neon-orange" />
                    Safra
                  </Label>
                  <Select
                    value={filters.safra || "todas"}
                    onValueChange={(value) => setFilters({ ...filters, safra: value === "todas" ? "" : value })}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-surface border-border/50 focus:border-neon-orange">
                      <SelectValue placeholder="Todas as safras" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl glass-card border-border/50">
                      <SelectItem value="todas" className="rounded-lg">Todas as safras</SelectItem>
                      {uniqueSafras.map(safra => (
                        <SelectItem key={safra} value={safra} className="rounded-lg">{safra}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Status dos Fardos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        filters.status.includes("campo")
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-surface hover:border-primary/30"
                      )}
                      onClick={() => toggleStatus("campo")}
                    >
                      <Checkbox
                        checked={filters.status.includes("campo")}
                        onCheckedChange={() => toggleStatus("campo")}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold">Campo</span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        filters.status.includes("patio")
                          ? "border-neon-orange/50 bg-neon-orange/10"
                          : "border-border/30 bg-surface hover:border-neon-orange/30"
                      )}
                      onClick={() => toggleStatus("patio")}
                    >
                      <Checkbox
                        checked={filters.status.includes("patio")}
                        onCheckedChange={() => toggleStatus("patio")}
                        className="data-[state=checked]:bg-neon-orange data-[state=checked]:border-neon-orange"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 rounded-lg bg-neon-orange/20">
                          <Truck className="h-4 w-4 text-neon-orange" />
                        </div>
                        <span className="text-sm font-semibold">Pátio</span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                        filters.status.includes("beneficiado")
                          ? "border-neon-cyan/50 bg-neon-cyan/10"
                          : "border-border/30 bg-surface hover:border-neon-cyan/30"
                      )}
                      onClick={() => toggleStatus("beneficiado")}
                    >
                      <Checkbox
                        checked={filters.status.includes("beneficiado")}
                        onCheckedChange={() => toggleStatus("beneficiado")}
                        className="data-[state=checked]:bg-neon-cyan data-[state=checked]:border-neon-cyan"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 rounded-lg bg-neon-cyan/20">
                          <CheckCircle className="h-4 w-4 text-neon-cyan" />
                        </div>
                        <span className="text-sm font-semibold">Beneficiado</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Talhões */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="h-4 w-4 text-accent" />
                      Talhões
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleAllTalhoes}
                      className="text-xs h-8 px-3 hover:bg-primary/10 text-primary rounded-lg"
                    >
                      {filters.talhao.length === uniqueTalhoes.length ? "Desmarcar" : "Marcar"} Todos
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-surface p-3 rounded-xl border border-border/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {uniqueTalhoes.map(talhao => (
                        <div
                          key={talhao}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all border",
                            filters.talhao.includes(talhao)
                              ? "bg-accent/10 border-accent/50"
                              : "bg-background border-border/30 hover:border-accent/30"
                          )}
                          onClick={() => toggleTalhao(talhao)}
                        >
                          <Checkbox
                            checked={filters.talhao.includes(talhao)}
                            onCheckedChange={() => toggleTalhao(talhao)}
                            className="data-[state=checked]:bg-accent data-[state=checked]:border-accent w-4 h-4"
                          />
                          <span className="text-sm font-medium truncate">{talhao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Options */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/10 via-neon-orange/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-neon-orange/20">
                    <Settings className="w-5 h-5 text-neon-orange" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Opções do Relatório</h2>
                    <p className="text-sm text-muted-foreground">Personalize o conteúdo e formato</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 glass-card p-1 h-11 rounded-xl">
                    <TabsTrigger
                      value="content"
                      className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-black gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Conteúdo
                    </TabsTrigger>
                    <TabsTrigger
                      value="format"
                      className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-black gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Formatação
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-3 mt-4">
                    {[
                      { id: "include-charts", label: "Incluir gráficos e estatísticas", icon: BarChart3, color: "primary", key: "includeCharts" as const },
                      { id: "include-timeline", label: "Incluir linha do tempo", icon: Clock, color: "neon-orange", key: "includeTimeline" as const },
                      { id: "detailed-view", label: "Visão detalhada (todos os campos)", icon: FileText, color: "neon-cyan", key: "detailedView" as const },
                    ].map(option => (
                      <div
                        key={option.id}
                        className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => setReportOptions({ ...reportOptions, [option.key]: !reportOptions[option.key] })}
                      >
                        <Checkbox
                          id={option.id}
                          checked={reportOptions[option.key]}
                          onCheckedChange={(checked) => setReportOptions({ ...reportOptions, [option.key]: checked as boolean })}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5"
                        />
                        <div className={cn("p-2 rounded-lg", `bg-${option.color}/20`)}>
                          <option.icon className={cn("h-4 w-4", `text-${option.color}`)} />
                        </div>
                        <label className="text-sm font-semibold cursor-pointer flex-1">{option.label}</label>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="format" className="space-y-3 mt-4">
                    <div
                      className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setReportOptions({ ...reportOptions, groupByTalhao: !reportOptions.groupByTalhao })}
                    >
                      <Checkbox
                        checked={reportOptions.groupByTalhao}
                        onCheckedChange={(checked) => setReportOptions({ ...reportOptions, groupByTalhao: checked as boolean })}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-5 h-5"
                      />
                      <div className="p-2 rounded-lg bg-primary/20">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <label className="text-sm font-semibold cursor-pointer flex-1">Agrupar por talhão</label>
                    </div>

                    <div
                      className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border/30 hover:border-neon-orange/30 transition-colors cursor-pointer"
                      onClick={() => setReportOptions({ ...reportOptions, groupBySafra: !reportOptions.groupBySafra })}
                    >
                      <Checkbox
                        checked={reportOptions.groupBySafra}
                        onCheckedChange={(checked) => setReportOptions({ ...reportOptions, groupBySafra: checked as boolean })}
                        className="data-[state=checked]:bg-neon-orange data-[state=checked]:border-neon-orange w-5 h-5"
                      />
                      <div className="p-2 rounded-lg bg-neon-orange/20">
                        <Wheat className="h-4 w-4 text-neon-orange" />
                      </div>
                      <label className="text-sm font-semibold cursor-pointer flex-1">Agrupar por safra</label>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Preview & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                    <Eye className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Preview</h2>
                    <p className="text-sm text-muted-foreground">Resumo dos dados filtrados</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-center p-6 glass-card rounded-xl border border-primary/20">
                  <div className="p-3 bg-primary/20 rounded-xl w-fit mx-auto mb-3">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-5xl font-display font-bold text-glow mb-1">
                    {preview.totalFardos}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Fardos no relatório
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Por Status</Label>
                  {Object.entries(preview.porStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-surface border border-border/30">
                      <span className="capitalize flex items-center gap-2 text-sm">
                        {status === "campo" && <Package className="h-3.5 w-3.5 text-primary" />}
                        {status === "patio" && <Truck className="h-3.5 w-3.5 text-neon-orange" />}
                        {status === "beneficiado" && <CheckCircle className="h-3.5 w-3.5 text-neon-cyan" />}
                        {status}
                      </span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>

                {Object.keys(preview.porTalhao).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Top 5 Talhões</Label>
                    {Object.entries(preview.porTalhao)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([talhao, count]) => (
                        <div key={talhao} className="flex justify-between items-center p-2 rounded-lg bg-surface/50 text-sm">
                          <span>{talhao}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent/20">
                    <Download className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold">Gerar Relatório</h2>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <Button
                  onClick={() => downloadReport("pdf")}
                  disabled={isGenerating || preview.totalFardos === 0}
                  className="w-full h-14 text-base font-semibold btn-neon rounded-xl disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-5 h-5 mr-2" />
                      Baixar PDF
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => downloadReport("excel")}
                  disabled={isGenerating || preview.totalFardos === 0}
                  className="w-full h-14 text-base font-semibold bg-neon-orange hover:bg-neon-orange/90 text-black rounded-xl shadow-glow-orange disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Gerando Excel...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Baixar Excel
                    </>
                  )}
                </Button>

                {preview.totalFardos === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-neon-orange/10 border border-neon-orange/30 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-neon-orange flex-shrink-0" />
                    <p className="text-sm font-medium text-neon-orange">
                      Ajuste os filtros para incluir dados no relatório.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Estatísticas</h2>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-primary/20">
                  <span className="text-sm font-medium flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    Talhões únicos
                  </span>
                  <span className="font-bold text-2xl text-primary">
                    {Object.keys(preview.porTalhao).length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-neon-orange/20">
                  <span className="text-sm font-medium flex items-center gap-3">
                    <div className="p-2 bg-neon-orange/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-neon-orange" />
                    </div>
                    Média por talhão
                  </span>
                  <span className="font-bold text-2xl text-neon-orange">
                    {Object.keys(preview.porTalhao).length > 0
                      ? Math.round(preview.totalFardos / Object.keys(preview.porTalhao).length)
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </Page>
  );
}
