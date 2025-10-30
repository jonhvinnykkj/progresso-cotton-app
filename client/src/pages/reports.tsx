import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Image,
  Settings,
  FileText,
  Package,
  Truck,
  CheckCircle,
  MapPin,
  AlertCircle,
  Wheat,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Bale } from "@shared/schema";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";

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
  const { collapsed } = useSidebar();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
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

  // Extrair valores únicos para filtros
  const uniqueTalhoes = Array.from(new Set(bales.map(b => b.talhao).filter(Boolean))).sort();
  const uniqueSafras = Array.from(new Set(bales.map(b => b.safra).filter(Boolean))).sort();

  // Filtrar dados para preview
  const filteredBales = bales.filter(bale => {
    if (filters.startDate && new Date(bale.createdAt) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(bale.createdAt) > new Date(filters.endDate)) return false;
    if (filters.status.length > 0 && !filters.status.includes(bale.status)) return false;
    if (filters.talhao.length > 0 && bale.talhao && !filters.talhao.includes(bale.talhao)) return false;
    if (filters.safra && bale.safra !== filters.safra) return false;
    return true;
  });

  // Calcular preview
  const preview: ReportPreview = {
    totalFardos: filteredBales.length,
    pesoBrutoTotal: 0, // Campo peso_bruto não existe no schema atual
    pesoLiquidoTotal: 0, // Campo peso_liquido não existe no schema atual
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

      // Opções do relatório
      params.append("includeCharts", reportOptions.includeCharts.toString());
      params.append("includeTimeline", reportOptions.includeTimeline.toString());
      params.append("groupByTalhao", reportOptions.groupByTalhao.toString());
      params.append("groupBySafra", reportOptions.groupBySafra.toString());
      params.append("detailedView", reportOptions.detailedView.toString());

      // Get auth token from localStorage
      const token = localStorage.getItem("cotton_access_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const endpoint = type === "pdf" ? "/api/reports/pdf" : "/api/reports/excel";
      const response = await fetch(`${endpoint}?${params.toString()}`, { headers });
      
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
    <div className="flex min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <NavSidebar />

      <div className={cn("flex-1 transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl pb-20 lg:pb-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-gradient-to-r from-green-700 via-green-600 to-yellow-600 bg-clip-text flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg">
                    <img 
                      src={logoProgresso} 
                      alt="Grupo Progresso" 
                      className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
                    />
                  </div>
                  Relatórios
                </h1>
                <p className="text-sm sm:text-base text-green-700 dark:text-green-400 font-medium mt-2">
                  Configure e gere relatórios personalizados em PDF ou Excel
                </p>
              </div>
              <BackButton className="hidden sm:flex" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Painel de Filtros */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              <Card className="shadow-2xl border-0 animate-fade-in-up hover-elevate transition-all duration-300 overflow-hidden rounded-3xl" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="bg-gradient-to-br from-green-600 via-green-500 to-yellow-500 text-white pb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                      <Filter className="h-6 w-6" />
                    </div>
                    Filtros de Dados
                  </CardTitle>
                  <CardDescription className="text-green-50 text-sm font-medium relative z-10">
                    Selecione os critérios para filtrar os dados do relatório
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8 pb-8 bg-white dark:bg-gray-900">
                  {/* Período */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date" className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 text-sm">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        Data Inicial
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="transition-all focus:scale-[1.02] border-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 h-12 shadow-lg hover:shadow-xl rounded-xl font-semibold"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end-date" className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 text-sm">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        Data Final
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="transition-all focus:scale-[1.02] border-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 h-12 shadow-lg hover:shadow-xl rounded-xl font-semibold"
                      />
                    </div>
                  </div>

                  {/* Safra */}
                  <div className="space-y-2">
                    <Label htmlFor="safra" className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                      <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <Wheat className="h-4 w-4 text-yellow-600" />
                      </div>
                      Safra
                    </Label>
                    <Select 
                      value={filters.safra || "todas"} 
                      onValueChange={(value) => setFilters({ ...filters, safra: value === "todas" ? "" : value })}
                    >
                      <SelectTrigger className="transition-all focus:scale-[1.02] h-12 border-2 shadow-lg hover:shadow-xl rounded-xl font-semibold focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200">
                        <SelectValue placeholder="Todas as safras" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="todas" className="font-semibold rounded-lg">Todas as safras</SelectItem>
                        {uniqueSafras.map(safra => (
                          <SelectItem key={safra} value={safra} className="font-semibold rounded-lg">{safra}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <Label className="font-bold text-gray-900 dark:text-gray-100 text-base">Status dos Fardos</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div 
                        className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl ${
                          filters.status.includes("campo") 
                            ? "border-green-500 bg-gradient-to-br from-green-50 to-yellow-50 dark:bg-green-900/20 shadow-green-500/30 scale-105 ring-2 ring-green-400/50" 
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600 hover:scale-105"
                        }`}
                        onClick={() => toggleStatus("campo")}
                      >
                        <Checkbox
                          id="status-campo"
                          checked={filters.status.includes("campo")}
                          onCheckedChange={() => toggleStatus("campo")}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-5 h-5 rounded-lg"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <Package className="h-5 w-5 text-green-600" />
                          </div>
                          <label
                            htmlFor="status-campo"
                            className="text-sm font-bold cursor-pointer flex-1"
                          >
                            Campo
                          </label>
                        </div>
                      </div>

                      <div 
                        className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl ${
                          filters.status.includes("patio") 
                            ? "border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:bg-yellow-900/20 shadow-yellow-500/30 scale-105 ring-2 ring-yellow-400/50" 
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300 dark:hover:border-yellow-600 hover:scale-105"
                        }`}
                        onClick={() => toggleStatus("patio")}
                      >
                        <Checkbox
                          id="status-patio"
                          checked={filters.status.includes("patio")}
                          onCheckedChange={() => toggleStatus("patio")}
                          className="data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 w-5 h-5 rounded-lg"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Truck className="h-5 w-5 text-yellow-600" />
                          </div>
                          <label
                            htmlFor="status-patio"
                            className="text-sm font-bold cursor-pointer flex-1"
                          >
                            Pátio
                          </label>
                        </div>
                      </div>

                      <div 
                        className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl ${
                          filters.status.includes("beneficiado") 
                            ? "border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:bg-green-900/20 shadow-green-600/30 scale-105 ring-2 ring-green-500/50" 
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-600 hover:scale-105"
                        }`}
                        onClick={() => toggleStatus("beneficiado")}
                      >
                        <Checkbox
                          id="status-beneficiado"
                          checked={filters.status.includes("beneficiado")}
                          onCheckedChange={() => toggleStatus("beneficiado")}
                          className="data-[state=checked]:bg-green-700 data-[state=checked]:border-green-700 w-5 h-5 rounded-lg"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <CheckCircle className="h-5 w-5 text-green-700" />
                          </div>
                          <label
                            htmlFor="status-beneficiado"
                            className="text-sm font-bold cursor-pointer flex-1"
                          >
                            Beneficiado
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Talhões */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        Talhões
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllTalhoes}
                        className="text-xs h-9 px-4 hover:bg-green-100 dark:hover:bg-green-900/20 font-black text-green-700 hover:text-green-800 rounded-xl border-2 border-transparent hover:border-green-300 transition-all hover:scale-105"
                      >
                        {filters.talhao.length === uniqueTalhoes.length ? "Desmarcar" : "Marcar"} Todos
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto bg-gradient-to-br from-gray-50 to-green-50/30 dark:bg-gray-900/50 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-inner">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {uniqueTalhoes.map(talhao => (
                          <div 
                            key={talhao} 
                            className={`flex items-center space-x-2 p-4 rounded-xl transition-all duration-200 cursor-pointer border-2 shadow-md hover:shadow-lg ${
                              filters.talhao.includes(talhao)
                                ? "bg-gradient-to-br from-green-100 to-yellow-50 dark:bg-green-900/30 border-green-500 scale-105 ring-2 ring-green-400/30"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300 hover:scale-105"
                            }`}
                            onClick={() => toggleTalhao(talhao)}
                          >
                            <Checkbox
                              id={`talhao-${talhao}`}
                              checked={filters.talhao.includes(talhao)}
                              onCheckedChange={() => toggleTalhao(talhao)}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-5 h-5 rounded-lg"
                            />
                            <label
                              htmlFor={`talhao-${talhao}`}
                              className="text-sm font-bold leading-none cursor-pointer capitalize flex-1"
                            >
                              {talhao}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Opções do Relatório */}
              <Card className="shadow-2xl border-0 animate-fade-in-up hover-elevate transition-all duration-300 overflow-hidden rounded-3xl" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="bg-gradient-to-br from-yellow-600 via-yellow-500 to-green-500 text-white pb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                      <Settings className="h-6 w-6" />
                    </div>
                    Opções do Relatório
                  </CardTitle>
                  <CardDescription className="text-yellow-50 text-sm font-medium relative z-10">
                    Personalize o conteúdo e formato do relatório
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 pb-8 bg-white dark:bg-gray-900">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-yellow-100 to-green-100 dark:bg-gray-800 p-1.5 h-14 rounded-2xl">
                      <TabsTrigger value="content" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-xl gap-2 font-bold rounded-xl data-[state=active]:text-green-700">
                        <FileText className="h-5 w-5" />
                        Conteúdo
                      </TabsTrigger>
                      <TabsTrigger value="format" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-xl gap-2 font-bold rounded-xl data-[state=active]:text-green-700">
                        <Settings className="h-5 w-5" />
                        Formatação
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="content" className="space-y-3 mt-6">
                      <div className="flex items-center space-x-3 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl">
                        <Checkbox
                          id="include-charts"
                          checked={reportOptions.includeCharts}
                          onCheckedChange={(checked) => 
                            setReportOptions({ ...reportOptions, includeCharts: checked as boolean })
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-6 h-6 rounded-lg"
                        />
                        <label htmlFor="include-charts" className="text-sm font-bold cursor-pointer flex items-center gap-3 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <BarChart3 className="h-5 w-5 text-green-600" />
                          </div>
                          Incluir gráficos e estatísticas
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl">
                        <Checkbox
                          id="include-timeline"
                          checked={reportOptions.includeTimeline}
                          onCheckedChange={(checked) => 
                            setReportOptions({ ...reportOptions, includeTimeline: checked as boolean })
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-6 h-6 rounded-lg"
                        />
                        <label htmlFor="include-timeline" className="text-sm font-bold cursor-pointer flex items-center gap-3 flex-1">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                          Incluir linha do tempo
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl">
                        <Checkbox
                          id="detailed-view"
                          checked={reportOptions.detailedView}
                          onCheckedChange={(checked) => 
                            setReportOptions({ ...reportOptions, detailedView: checked as boolean })
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-6 h-6 rounded-lg"
                        />
                        <label htmlFor="detailed-view" className="text-sm font-bold cursor-pointer flex items-center gap-3 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          Visão detalhada (todos os campos)
                        </label>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="format" className="space-y-3 mt-6">
                      <div className="flex items-center space-x-3 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-all hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl">
                        <Checkbox
                          id="group-talhao"
                          checked={reportOptions.groupByTalhao}
                          onCheckedChange={(checked) => 
                            setReportOptions({ ...reportOptions, groupByTalhao: checked as boolean })
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 w-6 h-6 rounded-lg"
                        />
                        <label htmlFor="group-talhao" className="text-sm font-bold cursor-pointer flex items-center gap-3 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <MapPin className="h-5 w-5 text-green-600" />
                          </div>
                          Agrupar por talhão
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500 transition-all hover:scale-[1.02] cursor-pointer bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl">
                        <Checkbox
                          id="group-safra"
                          checked={reportOptions.groupBySafra}
                          onCheckedChange={(checked) => 
                            setReportOptions({ ...reportOptions, groupBySafra: checked as boolean })
                          }
                          className="data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 w-6 h-6 rounded-lg"
                        />
                        <label htmlFor="group-safra" className="text-sm font-bold cursor-pointer flex items-center gap-3 flex-1">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Wheat className="h-5 w-5 text-yellow-600" />
                          </div>
                          Agrupar por safra
                        </label>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Preview e Ações */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Preview Card */}
              <Card className="shadow-2xl border-0 animate-fade-in-up hover-elevate transition-all duration-300 overflow-hidden rounded-3xl" style={{ animationDelay: '0.3s' }}>
                <CardHeader className="bg-gradient-to-br from-green-600 via-green-500 to-yellow-500 text-white pb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                      <Eye className="h-6 w-6" />
                    </div>
                    Preview
                  </CardTitle>
                  <CardDescription className="text-green-50 text-sm font-medium relative z-10">
                    Resumo dos dados filtrados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-8 pb-8 bg-white dark:bg-gray-900">
                  <div className="text-center p-10 bg-gradient-to-br from-green-100 via-yellow-50 to-green-50 dark:from-green-900/20 dark:via-yellow-900/20 dark:to-green-900/20 rounded-3xl border-2 border-green-400 dark:border-green-700 shadow-2xl transition-all duration-300 hover:shadow-green-500/50 hover:scale-[1.02]">
                    <div className="p-4 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl w-fit mx-auto mb-4 shadow-xl">
                      <Package className="h-12 w-12 text-white" />
                    </div>
                    <div className="text-7xl font-black bg-gradient-to-r from-green-700 via-green-600 to-yellow-600 bg-clip-text text-transparent mb-3">
                      {preview.totalFardos}
                    </div>
                    <div className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-widest">
                      Fardos no relatório
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-semibold">Por Status</Label>
                    {Object.entries(preview.porStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
                        <span className="capitalize flex items-center gap-2">
                          {status === "campo" && <Package className="h-3 w-3 text-green-600" />}
                          {status === "patio" && <Truck className="h-3 w-3 text-yellow-600" />}
                          {status === "beneficiado" && <CheckCircle className="h-3 w-3 text-blue-600" />}
                          {status}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>

                  {Object.keys(preview.porTalhao).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Top 5 Talhões</Label>
                      {Object.entries(preview.porTalhao)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([talhao, count]) => (
                          <div key={talhao} className="flex justify-between items-center text-sm">
                            <span>{talhao}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ações */}
              <Card className="shadow-2xl animate-fade-in-up hover-elevate transition-all duration-300 border-0 overflow-hidden rounded-3xl" style={{ animationDelay: '0.4s' }}>
                <CardHeader className="bg-gradient-to-br from-yellow-600 via-yellow-500 to-green-500 text-white pb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                      <Download className="h-6 w-6" />
                    </div>
                    Gerar Relatório
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-8 pb-8 bg-white dark:bg-gray-900">
                  <Button
                    onClick={() => downloadReport("pdf")}
                    disabled={isGenerating || preview.totalFardos === 0}
                    className="w-full h-16 text-base font-black bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-2xl border-2 border-green-500"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-6 h-6 mr-2" />
                        Baixar PDF
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => downloadReport("excel")}
                    disabled={isGenerating || preview.totalFardos === 0}
                    className="w-full h-16 text-base font-black bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-2xl border-2 border-yellow-500"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        Gerando Excel...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-6 h-6 mr-2" />
                        Baixar Excel
                      </>
                    )}
                  </Button>

                  {preview.totalFardos === 0 && (
                    <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-yellow-50 to-amber-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-700 rounded-2xl mt-4 shadow-lg">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                        <AlertCircle className="h-6 w-6 text-yellow-700 dark:text-yellow-500" />
                      </div>
                      <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400">
                        Ajuste os filtros para incluir dados no relatório
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Estatísticas Rápidas */}
              <Card className="shadow-2xl animate-fade-in-up hover-elevate transition-all duration-300 border-0 overflow-hidden rounded-3xl" style={{ animationDelay: '0.5s' }}>
                <CardHeader className="bg-gradient-to-br from-green-600 via-green-500 to-yellow-500 text-white pb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
                  <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    Estatísticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-8 pb-8 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between p-5 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl border-2 border-green-400 dark:border-green-800 hover:scale-[1.03] transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer">
                    <span className="text-sm font-black text-green-900 dark:text-green-100 flex items-center gap-3">
                      <div className="p-2 bg-green-200 dark:bg-green-900/50 rounded-xl">
                        <MapPin className="h-6 w-6 text-green-700" />
                      </div>
                      Talhões únicos
                    </span>
                    <span className="font-black text-3xl text-green-700">
                      {Object.keys(preview.porTalhao).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-2xl border-2 border-yellow-400 dark:border-yellow-800 hover:scale-[1.03] transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer">
                    <span className="text-sm font-black text-yellow-900 dark:text-yellow-100 flex items-center gap-3">
                      <div className="p-2 bg-yellow-200 dark:bg-yellow-900/50 rounded-xl">
                        <BarChart3 className="h-6 w-6 text-yellow-700" />
                      </div>
                      Média por talhão
                    </span>
                    <span className="font-black text-3xl text-yellow-700">
                      {Object.keys(preview.porTalhao).length > 0
                        ? Math.round(preview.totalFardos / Object.keys(preview.porTalhao).length)
                        : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
