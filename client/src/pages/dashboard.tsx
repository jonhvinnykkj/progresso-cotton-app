import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { BaleCard } from "@/components/bale-card";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth-context";
import { useRealtime } from "@/hooks/use-realtime";
import type { Bale, BaleStatus } from "@shared/schema";
import {
  Package,
  Truck,
  CheckCircle,
  Search,
  TrendingUp,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  useRealtime(isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BaleStatus | "all">("all");

  const { data: bales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
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

  const filteredBales = useMemo(() => bales.filter((bale) => {
    const matchesSearch =
      bale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bale.numero && bale.numero.toString().includes(searchQuery)) ||
      (bale.talhao && bale.talhao.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || bale.status === statusFilter;

    return matchesSearch && matchesStatus;
  }), [bales, searchQuery, statusFilter]);

  const uniqueTalhoesCount = useMemo(() => new Set(bales.map((b) => b.talhao)).size, [bales]);

  const balesToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bales.filter((b) => {
      const baleDate = new Date(b.createdAt);
      baleDate.setHours(0, 0, 0, 0);
      return baleDate.getTime() === today.getTime();
    }).length;
  }, [bales]);

  const { fardosPorHectare, arrobasPorHectare, progressPercent } = useMemo(() => {
    const areaTotalHectares = 4938;
    const totalFardos = stats?.total || 0;
    const fph = areaTotalHectares > 0 ? totalFardos / areaTotalHectares : 0;
    const aph = fph * 66.67;
    const pp = stats?.total ? ((stats.beneficiado / stats.total) * 100).toFixed(1) : "0";
    return { fardosPorHectare: fph, arrobasPorHectare: aph, progressPercent: pp };
  }, [stats]);

  const statusCards = useMemo(() => [
    {
      status: "campo" as BaleStatus,
      label: "No Campo",
      icon: Package,
      count: stats?.campo || 0,
      color: "primary" as const,
      glowClass: "shadow-glow-sm hover:shadow-glow",
    },
    {
      status: "patio" as BaleStatus,
      label: "No Pátio",
      icon: Truck,
      count: stats?.patio || 0,
      color: "orange" as const,
      glowClass: "shadow-glow-orange",
    },
    {
      status: "beneficiado" as BaleStatus,
      label: "Beneficiado",
      icon: CheckCircle,
      count: stats?.beneficiado || 0,
      color: "cyan" as const,
      glowClass: "shadow-glow-cyan",
    },
  ], [stats]);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  return (
    <Page>
      <PageContent>
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl glass-card p-6 sm:p-8">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />

            {/* Content */}
            <div className="relative">
              {/* Greeting */}
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">{greeting}, {user?.username || "Usuário"}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-display font-bold mb-6">
                <span className="gradient-text">Dashboard</span>
              </h1>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Fardos - Featured */}
                <div className="col-span-2 glass-card p-6 rounded-xl relative overflow-hidden group hover:shadow-glow transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground uppercase tracking-wider">Total de Fardos</span>
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Tempo real
                      </div>
                    </div>
                    <p className="text-5xl sm:text-6xl font-display font-bold text-glow mb-4">
                      <AnimatedCounter value={stats?.total || 0} />
                    </p>
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Beneficiamento</span>
                        <span className="text-primary font-semibold">{progressPercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700 shadow-glow-sm"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="glass-card p-5 rounded-xl hover:shadow-glow-sm transition-all duration-300">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Hoje</span>
                  </div>
                  <p className="text-3xl font-display font-bold">
                    <AnimatedCounter value={balesToday} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">fardos criados</p>
                </div>

                <div className="glass-card p-5 rounded-xl hover:shadow-glow-sm transition-all duration-300">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider">Produtividade</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-primary">
                    <AnimatedCounter value={arrobasPorHectare} decimals={1} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">@/hectare</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Status dos Fardos</h2>
              <span className="text-xs text-muted-foreground">{uniqueTalhoesCount} talhões ativos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statusCards.map((card) => {
                const Icon = card.icon;
                const isSelected = statusFilter === card.status;

                const colorClasses = {
                  primary: {
                    bg: isSelected ? "bg-primary/20" : "bg-primary/5",
                    border: isSelected ? "border-primary/50" : "border-primary/20",
                    icon: "text-primary",
                    glow: "shadow-glow",
                  },
                  orange: {
                    bg: isSelected ? "bg-neon-orange/20" : "bg-neon-orange/5",
                    border: isSelected ? "border-neon-orange/50" : "border-neon-orange/20",
                    icon: "text-neon-orange",
                    glow: "shadow-glow-orange",
                  },
                  cyan: {
                    bg: isSelected ? "bg-neon-cyan/20" : "bg-neon-cyan/5",
                    border: isSelected ? "border-neon-cyan/50" : "border-neon-cyan/20",
                    icon: "text-neon-cyan",
                    glow: "shadow-glow-cyan",
                  },
                };

                const colors = colorClasses[card.color];

                return (
                  <button
                    key={card.status}
                    onClick={() => setStatusFilter(statusFilter === card.status ? "all" : card.status)}
                    className="text-left group"
                    data-testid={`card-stats-${card.status}`}
                  >
                    <div
                      className={cn(
                        "glass-card p-5 rounded-xl border transition-all duration-300",
                        colors.bg,
                        colors.border,
                        isSelected && colors.glow
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-2.5 rounded-xl", colors.bg)}>
                          <Icon className={cn("h-5 w-5", colors.icon)} />
                        </div>
                        {isSelected && (
                          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", colors.bg, colors.icon)}>
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {card.label}
                      </p>
                      <p className="text-3xl font-display font-bold">
                        <AnimatedCounter value={card.count} />
                      </p>
                      <div className="mt-4 h-1.5 rounded-full bg-surface overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            card.color === "primary" && "bg-primary",
                            card.color === "orange" && "bg-neon-orange",
                            card.color === "cyan" && "bg-neon-cyan"
                          )}
                          style={{
                            width: stats?.total
                              ? `${Math.min(100, (card.count / (stats.total || 1)) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="glass-card p-5 rounded-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, número ou talhão..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-surface border-border/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                  data-testid="input-search"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setStatusFilter("all")}
                  data-testid="filter-all"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                    statusFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  )}
                >
                  Todos
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    statusFilter === "all" ? "bg-background/20" : "bg-surface-hover"
                  )}>
                    {bales.length}
                  </span>
                </button>

                {statusCards.map((card) => {
                  const Icon = card.icon;
                  const isActive = statusFilter === card.status;

                  const getActiveClass = () => {
                    if (!isActive) return "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover";
                    if (card.color === "primary") return "bg-primary/20 text-primary shadow-glow-sm";
                    if (card.color === "orange") return "bg-neon-orange/20 text-neon-orange shadow-glow-orange";
                    if (card.color === "cyan") return "bg-neon-cyan/20 text-neon-cyan shadow-glow-cyan";
                    return "";
                  };

                  return (
                    <button
                      key={card.status}
                      onClick={() => setStatusFilter(card.status)}
                      data-testid={`filter-${card.status}`}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                        getActiveClass()
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {card.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bales List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {statusFilter === "all" ? "Todos os Fardos" : `Fardos - ${statusCards.find(s => s.status === statusFilter)?.label}`}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredBales.length} {filteredBales.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass-card p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
                      <div className="skeleton-shimmer h-6 w-20 rounded-full" />
                    </div>
                    <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-8 w-1/2 rounded" />
                    <div className="skeleton-shimmer h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredBales.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum fardo encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tente ajustar sua busca ou limpar os filtros."
                    : "Comece cadastrando um novo fardo."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBales.map((bale, index) => (
                  <div
                    key={bale.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
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
