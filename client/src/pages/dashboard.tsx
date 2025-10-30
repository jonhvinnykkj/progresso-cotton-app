import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BaleCard } from "@/components/bale-card";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { Footer } from "@/components/footer";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { useRealtime } from "@/hooks/use-realtime";
import type { Bale, BaleStatus } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logoProgresso from "/favicon.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const { collapsed } = useSidebar();

  // Habilita atualizações em tempo real via SSE
  useRealtime(isAuthenticated);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BaleStatus | "all">("all");

  const { data: bales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000, // Dados considerados frescos por 30s
  });

  const { data: stats } = useQuery<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }>({
    queryKey: ["/api/bales/stats"],
    staleTime: 30000,
  });

  const filteredBales = bales.filter((bale) => {
    const matchesSearch =
      bale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bale.numero && bale.numero.toString().includes(searchQuery)) ||
      (bale.talhao && bale.talhao.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || bale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calcular estatísticas adicionais
  const uniqueTalhoesCount = new Set(bales.map(b => b.talhao)).size;
  const uniqueSafrasCount = new Set(bales.map(b => b.safra)).size;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const balesToday = bales.filter(b => {
    const baleDate = new Date(b.createdAt);
    baleDate.setHours(0, 0, 0, 0);
    return baleDate.getTime() === today.getTime();
  }).length;

  // Calcular produtividade total em @/ha
  // Área total dos 9 talhões de algodão: 4938 ha
  const areaTotalHectares = 4938;
  const totalFardos = stats?.total || 0;
  const fardosPorHectare = areaTotalHectares > 0 ? totalFardos / areaTotalHectares : 0;
  const arrobasPorHectare = fardosPorHectare * 66.67; // 1 fardo = 2000kg = 66.67@

  const progressPercent = stats?.total ? ((stats.beneficiado / stats.total) * 100).toFixed(1) : "0";


  const statusCards = [
    {
      status: "campo" as BaleStatus,
      label: "No Campo",
      icon: Package,
      color: "text-bale-campo",
      bgColor: "bg-bale-campo/10",
      count: stats?.campo || 0,
    },
    {
      status: "patio" as BaleStatus,
      label: "No Pátio",
      icon: Truck,
      color: "text-bale-patio",
      bgColor: "bg-bale-patio/10",
      count: stats?.patio || 0,
    },
    {
      status: "beneficiado" as BaleStatus,
      label: "Beneficiado",
      icon: CheckCircle,
      color: "text-bale-beneficiado",
      bgColor: "bg-bale-beneficiado/10",
      count: stats?.beneficiado || 0,
    },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50/30 via-yellow-50/20 to-green-50/40 dark:from-gray-900 dark:to-gray-800">
      <NavSidebar />

      <div className={cn("flex-1 flex flex-col transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        {/* Conteúdo principal */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl pb-20 lg:pb-8">
          {/* Header com título e estatísticas rápidas - Design moderno */}
          <div className="mb-6 sm:mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg">
                  <img
                    src={logoProgresso}
                    alt="Grupo Progresso"
                    className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 via-green-500 to-yellow-600 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Visão geral da produção de algodão
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="shrink-0 transition-all hover:scale-105 duration-300 rounded-xl border-2 border-green-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-bold text-green-700 hover:text-red-600"
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Resumo Geral da Safra - Card hero com design moderno */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-yellow-500 text-white shadow-2xl animate-fade-in-up border-0 rounded-3xl" style={{ animationDelay: '0.1s' }}>
              {/* Decoração de fundo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              </div>

              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4 relative">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  Resumo Geral da Safra
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="group transition-all hover:scale-105 duration-300 text-center p-4 sm:p-6 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-sm border border-white/20">
                    <div className="p-3 bg-white/20 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 mb-2 font-medium">Total de Fardos</p>
                    <p className="text-3xl sm:text-4xl font-bold">
                      <AnimatedCounter value={stats?.total || 0} />
                    </p>
                  </div>
                  <div className="group transition-all hover:scale-105 duration-300 text-center p-4 sm:p-6 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-sm border border-white/20">
                    <div className="p-3 bg-white/20 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 mb-2 font-medium">Talhões Ativos</p>
                    <p className="text-3xl sm:text-4xl font-bold">
                      <AnimatedCounter value={uniqueTalhoesCount} />
                    </p>
                  </div>
                  <div className="group transition-all hover:scale-105 duration-300 text-center p-4 sm:p-6 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-sm border border-white/20">
                    <div className="p-3 bg-white/20 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 mb-2 font-medium">Criados Hoje</p>
                    <p className="text-3xl sm:text-4xl font-bold">
                      <AnimatedCounter value={balesToday} />
                    </p>
                  </div>
                  <div className="group transition-all hover:scale-105 duration-300 text-center p-4 sm:p-6 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-sm border border-white/20">
                    <div className="p-3 bg-white/20 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 mb-2 font-medium">% Beneficiados</p>
                    <p className="text-3xl sm:text-4xl font-bold">
                      <AnimatedCounter value={parseFloat(progressPercent)} decimals={1} />%
                    </p>
                  </div>
                </div>

                {/* Barra de progresso moderna */}
                <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="flex justify-between text-sm mb-3 font-medium">
                    <span>Progresso de Beneficiamento</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">{stats?.beneficiado || 0} de {stats?.total || 0}</span>
                  </div>
                  <div className="relative w-full bg-white/20 rounded-full h-4 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-white via-yellow-200 to-white h-full rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards - Grid responsivo com design moderno verde/amarelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{statusCards.map((card, index) => {
                const Icon = card.icon;
                const isSelected = statusFilter === card.status;
                return (
                  <Card
                    key={card.status}
                    className={`group relative overflow-hidden cursor-pointer shadow-lg smooth-transition animate-fade-in-up rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? "ring-4 ring-yellow-400 border-2 border-green-500 scale-[1.02]"
                        : "border-2 border-green-100 hover:border-yellow-300 hover:scale-[1.02] hover:shadow-xl"
                    }`}
                    style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                    onClick={() =>
                      setStatusFilter(statusFilter === card.status ? "all" : card.status)
                    }
                    data-testid={`card-stats-${card.status}`}
                  >
                    {/* Gradient decorativo no fundo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-yellow-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 relative">
                      <CardTitle className="text-sm sm:text-base font-bold text-green-800 dark:text-green-300">
                        {card.label}
                      </CardTitle>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                        isSelected
                          ? 'from-yellow-400 to-yellow-500 shadow-yellow-300/50'
                          : 'from-green-500 to-green-600 group-hover:from-yellow-400 group-hover:to-yellow-500'
                      } flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:shadow-xl border-2 border-white`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 relative">
                      <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
                        <AnimatedCounter value={card.count} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-1 w-12 rounded-full ${isSelected ? 'bg-yellow-400' : 'bg-green-300 group-hover:bg-yellow-400'} transition-colors duration-300`}></div>
                        <p className="text-xs sm:text-sm text-green-700 font-semibold">
                          {card.count === 1 ? "fardo" : "fardos"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Filtros e busca com design verde/amarelo moderno */}
            <div className="space-y-3 sm:space-y-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl pointer-events-none">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <Input
                  placeholder="Buscar por ID, número, talhão..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 sm:pl-16 h-12 sm:h-14 text-sm sm:text-base shadow-lg transition-all focus:scale-[1.01] focus:shadow-xl duration-300 border-2 border-green-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 rounded-2xl bg-white font-medium"
                  data-testid="input-search"
                />
              </div>

              <Card className="p-4 bg-gradient-to-r from-green-50/80 to-yellow-50/60 border-2 border-green-200 rounded-2xl shadow-md">
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border-2 border-green-300 shadow-sm">
                    <Filter className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-800">Filtrar:</span>
                  </div>
                  <Badge
                    variant={statusFilter === "all" ? "default" : "outline"}
                    className={`cursor-pointer px-4 py-2 text-xs sm:text-sm transition-all hover:scale-105 duration-300 rounded-xl font-bold border-2 ${
                      statusFilter === "all"
                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-yellow-400 shadow-lg hover:shadow-xl"
                        : "border-green-300 bg-white hover:border-yellow-400 hover:bg-gradient-to-r hover:from-green-50 hover:to-yellow-50 text-green-700"
                    }`}
                    onClick={() => setStatusFilter("all")}
                    data-testid="filter-all"
                  >
                    Todos ({bales.length})
                  </Badge>
                  {statusCards.map((card) => (
                    <Badge
                      key={card.status}
                      variant={statusFilter === card.status ? "default" : "outline"}
                      className={`cursor-pointer px-4 py-2 text-xs sm:text-sm transition-all hover:scale-105 duration-300 rounded-xl font-bold border-2 ${
                        statusFilter === card.status
                          ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-yellow-400 shadow-lg hover:shadow-xl"
                          : "border-green-300 bg-white hover:border-yellow-400 hover:bg-gradient-to-r hover:from-green-50 hover:to-yellow-50 text-green-700"
                      }`}
                      onClick={() => setStatusFilter(card.status)}
                      data-testid={`filter-${card.status}`}
                    >
                      {card.label} ({card.count})
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>

            {/* Lista de Fardos com melhor espaçamento */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2 pb-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-6 bg-muted rounded w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBales.length === 0 ? (
              <Card className="p-8 sm:p-12 animate-fade-in-up shadow-2xl border-2 border-green-200 rounded-3xl bg-gradient-to-br from-white via-green-50/30 to-yellow-50/20">
                <div className="text-center space-y-6">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-pulse opacity-20"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-full flex items-center justify-center shadow-xl">
                      <Package className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
                      Nenhum fardo encontrado
                    </h3>
                    <p className="text-sm sm:text-base text-green-700 mt-3 font-medium">
                      {searchQuery || statusFilter !== "all"
                        ? "Tente ajustar os filtros de busca"
                        : "Cadastre o primeiro fardo no sistema"}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredBales.map((bale, index) => (
                  <div
                    key={bale.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${(index % 9) * 0.05}s` }}
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
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
