import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useOfflineBaleCreation } from "@/hooks/use-offline-bale-creation";
import {
  Package,
  QrCode,
  Loader2,
  CheckCircle,
  Plus,
  Wheat,
  Hash,
  Calendar,
  Zap,
  Lightbulb,
  Tag,
  MapPin,
  Printer,
  Search,
  Filter,
  LogOut,
  Sparkles,
  AlertTriangle,
  Trash2,
  TrendingDown,
  CircleDot,
  Layers,
} from "lucide-react";
import { z } from "zod";
import type { Bale } from "@shared/schema";
import logoFavicon from "/favicon.png";
import { useSettings } from "@/hooks/use-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";

// Componente para buscar etiquetas
function EtiquetasTab({ defaultSafra }: { defaultSafra: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [talhaoFilter, setTalhaoFilter] = useState("");
  const [numeroInicio, setNumeroInicio] = useState("");
  const [numeroFim, setNumeroFim] = useState("");
  const [baleIdBusca, setBaleIdBusca] = useState("");

  const { data: bales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  const myBales = useMemo(() => bales.filter(
    (b) => b.safra === defaultSafra && b.status === "campo"
  ), [bales]);

  const handleBuscarPorId = () => {
    if (!baleIdBusca.trim()) {
      toast({
        variant: "warning",
        title: "ID inválido",
        description: "Digite um ID de fardo válido.",
      });
      return;
    }

    const searchId = baleIdBusca.trim().toUpperCase();
    let bale = myBales.find((b) => b.id.toUpperCase() === searchId);

    if (!bale) {
      const searchIdComT = searchId.replace(
        /(S\d+\/\d+-)(T?)(\w+)(-\d+)/,
        "$1T$3$4"
      );
      bale = myBales.find((b) => b.id.toUpperCase() === searchIdComT);
    }

    if (!bale) {
      const baleOutraSafra = bales.find(
        (b) => b.id.toUpperCase() === searchId
      );
      if (baleOutraSafra) {
        toast({
          variant: "destructive",
          title: "Fardo não disponível",
          description: `Este fardo está com status "${baleOutraSafra.status}" ou de outra safra.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fardo não encontrado",
          description:
            "Este ID não existe no sistema. Formato esperado: S25/26-T1B-00001",
        });
      }
      return;
    }

    setLocation(`/etiqueta?baleIds=${bale.id}`);
  };

  const handleBuscarPorIntervalo = () => {
    if (!talhaoFilter) {
      toast({
        variant: "warning",
        title: "Talhão obrigatório",
        description: "Selecione um talhão para filtrar.",
      });
      return;
    }

    if (!numeroInicio || !numeroFim) {
      toast({
        variant: "warning",
        title: "Intervalo incompleto",
        description: "Preencha o número inicial e final.",
      });
      return;
    }

    const inicio = parseInt(numeroInicio);
    const fim = parseInt(numeroFim);

    if (inicio > fim) {
      toast({
        variant: "warning",
        title: "Intervalo inválido",
        description: "O número inicial deve ser menor que o final.",
      });
      return;
    }

    if (fim - inicio > 100) {
      toast({
        variant: "warning",
        title: "Intervalo muito grande",
        description: "Máximo de 100 etiquetas por vez.",
      });
      return;
    }

    const balesFiltrados = myBales.filter((b) => {
      const talhaoNormalizado = b.talhao.replace(/^T/, "");
      const filtroNormalizado = talhaoFilter.replace(/^T/, "");

      if (talhaoNormalizado !== filtroNormalizado) return false;

      const numeroStr = String(b.numero).replace(/^0+/, "") || "0";
      const numero = parseInt(numeroStr);

      return numero >= inicio && numero <= fim;
    });

    if (balesFiltrados.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum fardo encontrado",
        description: "Não há fardos neste intervalo.",
      });
      return;
    }

    const baleIds = balesFiltrados.map((b) => b.id).join(",");
    setLocation(`/etiqueta?baleIds=${baleIds}`);
  };

  const fardosPorTalhao = useMemo(() => myBales.reduce(
    (acc, bale) => {
      if (!acc[bale.talhao]) {
        acc[bale.talhao] = [];
      }
      acc[bale.talhao].push(bale);
      return acc;
    },
    {} as Record<string, Bale[]>
  ), [myBales]);

  return (
    <div className="space-y-6">
      {/* Busca por ID único */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base">Buscar por ID</h3>
            <p className="text-xs text-muted-foreground">
              Digite o código completo do fardo
            </p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ex: S25/26-T1B-00001"
              value={baleIdBusca}
              onChange={(e) => setBaleIdBusca(e.target.value.toUpperCase())}
              className="flex-1 font-mono h-12 rounded-xl bg-surface border-border/50 focus:border-primary"
            />
            <Button
              onClick={handleBuscarPorId}
              className="shrink-0 h-12 px-5 rounded-xl btn-neon"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-surface/50 px-3 py-2 rounded-lg">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>
              Cole ou digite o ID completo do fardo que deseja reimprimir a
              etiqueta.
            </p>
          </div>
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dashed border-border/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 py-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
            ou busque múltiplos
          </span>
        </div>
      </div>

      {/* Busca por intervalo */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-orange/20 text-neon-orange">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base">Buscar por Intervalo</h3>
            <p className="text-xs text-muted-foreground">
              Selecione talhão e intervalo
            </p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl space-y-5">
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
              <Wheat className="w-4 h-4 text-primary" />
              Talhão de Produção
            </label>
            <Select value={talhaoFilter} onValueChange={setTalhaoFilter}>
              <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                <SelectValue placeholder="Selecione o talhão" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-popover">
                {Object.keys(fardosPorTalhao)
                  .sort()
                  .map((talhao) => (
                    <SelectItem
                      key={talhao}
                      value={talhao}
                      className="rounded-lg my-0.5 data-[highlighted]:bg-primary/20 data-[state=checked]:bg-primary/30 focus:bg-primary/20"
                    >
                      <div className="flex items-center justify-between gap-4 w-full py-1">
                        <span className="font-bold font-mono">{talhao}</span>
                        <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
                          {fardosPorTalhao[talhao].length} fardos
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground/80">
                <Hash className="w-4 h-4 text-primary" />
                Número Inicial
              </label>
              <Input
                type="number"
                placeholder="1"
                value={numeroInicio}
                onChange={(e) => setNumeroInicio(e.target.value)}
                min="1"
                max="99999"
                className="h-12 rounded-xl font-mono text-base bg-surface border-border/50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground/80">
                <Hash className="w-4 h-4 text-primary" />
                Número Final
              </label>
              <Input
                type="number"
                placeholder="10"
                value={numeroFim}
                onChange={(e) => setNumeroFim(e.target.value)}
                min="1"
                max="99999"
                className="h-12 rounded-xl font-mono text-base bg-surface border-border/50"
              />
            </div>
          </div>

          <div className="pt-1">
            <Button
              onClick={handleBuscarPorIntervalo}
              className="w-full h-12 rounded-xl btn-neon"
            >
              <Printer className="w-5 h-5 mr-2" />
              Gerar Etiquetas do Intervalo
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-surface/50 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4 mt-0.5 shrink-0 text-neon-orange" />
            <p>
              Gere até 100 etiquetas por vez. Numeração contínua dentro do
              talhão.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo dos fardos */}
      {!isLoading && myBales.length > 0 && (
        <div className="mt-8 glass-card p-6 rounded-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Seus Fardos Disponíveis</h3>
              <p className="text-xs text-muted-foreground">
                Fardos criados e prontos para reimprimir
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-5 bg-primary/10 border border-primary/20">
              <div className="text-3xl font-display font-bold text-primary mb-2">
                {myBales.length}
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
                Total em Campo
              </div>
            </div>
            <div className="rounded-xl p-5 bg-neon-cyan/10 border border-neon-cyan/20">
              <div className="text-3xl font-display font-bold text-neon-cyan mb-2">
                {Object.keys(fardosPorTalhao).length}
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-neon-cyan" />
                Talhões Ativos
              </div>
            </div>
          </div>

          {/* Lista de talhões com contagem */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/30"></div>
              <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                Distribuição por Talhão
              </p>
              <div className="h-px flex-1 bg-border/30"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(fardosPorTalhao)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([talhao, bales]) => (
                  <div
                    key={talhao}
                    className="flex items-center justify-between rounded-lg p-3.5 border border-border/30 text-xs bg-surface/50"
                  >
                    <span className="font-mono font-bold text-primary text-sm">
                      {talhao}
                    </span>
                    <span className="px-3 py-1.5 rounded-full text-primary font-bold bg-primary/10">
                      {bales.length}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && myBales.length === 0 && (
        <div className="text-center p-12 rounded-2xl border-2 border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-5 bg-surface rounded-2xl mb-5">
            <Package className="w-12 h-12 text-muted-foreground/40" />
          </div>
          <p className="text-base font-bold text-foreground/80 mb-2">
            Nenhum fardo em campo encontrado
          </p>
          <p className="text-sm text-muted-foreground/70">
            Crie fardos nas abas "Em Lote" ou "Individual" para começar
          </p>
        </div>
      )}
    </div>
  );
}

// Componente para registrar perdas - Interface por Talhão
function PerdasTab({ defaultSafra, talhoesSafra }: { defaultSafra: string; talhoesSafra: { id: string; nome: string; hectares: string }[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTalhao, setSelectedTalhao] = useState<{ nome: string; hectares: string } | null>(null);
  const [formData, setFormData] = useState({ arrobasHa: "", motivo: "", observacao: "" });

  // Query para buscar perdas
  const { data: perdas = [], isLoading: perdasLoading } = useQuery({
    queryKey: ["/api/perdas", defaultSafra],
    queryFn: async () => {
      if (!defaultSafra) return [];
      const encodedSafra = encodeURIComponent(defaultSafra);
      const url = API_URL
        ? `${API_URL}/api/perdas/${encodedSafra}`
        : `/api/perdas/${encodedSafra}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar perdas");
      return res.json();
    },
    enabled: !!defaultSafra,
  });

  // Agrupar perdas por talhão
  const perdasPorTalhao = useMemo(() => {
    const grouped: Record<string, { total: number; count: number; perdas: any[] }> = {};
    perdas.forEach((p: any) => {
      if (!grouped[p.talhao]) {
        grouped[p.talhao] = { total: 0, count: 0, perdas: [] };
      }
      grouped[p.talhao].total += parseFloat(p.arrobasHa || "0");
      grouped[p.talhao].count += 1;
      grouped[p.talhao].perdas.push(p);
    });
    return grouped;
  }, [perdas]);

  // Total geral
  const totalPerdas = perdas.reduce((acc: number, perda: any) => acc + parseFloat(perda.arrobasHa || "0"), 0);

  const motivos = [
    { id: "clima", label: "Causa Natural", desc: "Chuva, granizo, seca, etc.", icon: "🌧️" },
    { id: "praga", label: "Praga/Doença", desc: "Infestação ou doença", icon: "🐛" },
    { id: "fogo", label: "Fogo", desc: "Incêndio ou queimada", icon: "🔥" },
    { id: "mecanica", label: "Perda Mecânica", desc: "Colheitadeira, transporte", icon: "🚜" },
    { id: "outro", label: "Outro", desc: "Outros motivos", icon: "📋" },
  ];

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedTalhao(null);
    setFormData({ arrobasHa: "", motivo: "", observacao: "" });
  };

  const handleCreatePerda = async () => {
    if (!defaultSafra || !selectedTalhao) return;

    setIsCreating(true);
    try {
      const url = API_URL ? `${API_URL}/api/perdas` : "/api/perdas";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          safra: defaultSafra,
          talhao: selectedTalhao.nome,
          arrobasHa: formData.arrobasHa,
          motivo: formData.motivo,
          observacao: formData.observacao || undefined,
        }),
      });

      if (!res.ok) throw new Error("Erro ao registrar perda");

      toast({
        variant: "success",
        title: "Perda registrada!",
        description: `${formData.arrobasHa} @/ha no talhão ${selectedTalhao.nome}`,
      });

      resetWizard();
      queryClient.invalidateQueries({ queryKey: ["/api/perdas"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a perda.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePerda = async (id: string) => {
    try {
      const url = API_URL ? `${API_URL}/api/perdas/${id}` : `/api/perdas/${id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao deletar perda");

      toast({
        variant: "success",
        title: "Perda removida",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/perdas"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a perda.",
      });
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return !!selectedTalhao;
      case 2: return !!formData.arrobasHa && parseFloat(formData.arrobasHa) > 0;
      case 3: return !!formData.motivo;
      default: return true;
    }
  };

  // Step content components
  const renderStepContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Selecione o Talhão</h3>
              <p className="text-sm text-muted-foreground">Qual talhão teve a perda?</p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
              {talhoesSafra.map((talhao) => {
                const perdasTalhao = perdasPorTalhao[talhao.nome];
                const isSelected = selectedTalhao?.nome === talhao.nome;
                return (
                  <button
                    key={talhao.id}
                    onClick={() => setSelectedTalhao(talhao)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "bg-primary/10 border-primary scale-105"
                        : "bg-card border-border/50 hover:border-primary/50 hover:scale-102"
                    )}
                  >
                    <p className="font-bold text-foreground">{talhao.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{talhao.hectares} ha</p>
                    {perdasTalhao && (
                      <p className="text-[10px] text-red-500 mt-1">{perdasTalhao.total.toFixed(1)} @/ha</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 mb-3">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold">Quantidade Perdida</h3>
              <p className="text-sm text-muted-foreground">
                Quantas arrobas por hectare foram perdidas no <span className="font-bold text-primary">{selectedTalhao?.nome}</span>?
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-[200px]">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={formData.arrobasHa}
                  onChange={(e) => setFormData({ ...formData, arrobasHa: e.target.value })}
                  className="h-16 text-3xl font-bold text-center rounded-2xl pr-16"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-medium">@/ha</span>
              </div>
              {formData.arrobasHa && selectedTalhao && (
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total estimado</p>
                  <p className="text-lg font-bold text-red-500">
                    {(parseFloat(formData.arrobasHa) * parseFloat(selectedTalhao.hectares.replace(",", "."))).toFixed(1)} @
                  </p>
                  <p className="text-xs text-muted-foreground">
                    em {selectedTalhao.hectares} hectares
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold">Motivo da Perda</h3>
              <p className="text-sm text-muted-foreground">O que causou essa perda?</p>
            </div>
            <div className="space-y-2">
              {motivos.map((motivo) => (
                <button
                  key={motivo.id}
                  onClick={() => setFormData({ ...formData, motivo: motivo.label })}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                    formData.motivo === motivo.label
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border/50 hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{motivo.icon}</span>
                  <div>
                    <p className="font-bold">{motivo.label}</p>
                    <p className="text-xs text-muted-foreground">{motivo.desc}</p>
                  </div>
                  {formData.motivo === motivo.label && (
                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-green-500/10 mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-bold">Confirmar Registro</h3>
              <p className="text-sm text-muted-foreground">Revise os dados da perda</p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Talhão</span>
                <span className="font-bold text-primary">{selectedTalhao?.nome}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Perda</span>
                <span className="font-bold text-red-500">{formData.arrobasHa} @/ha</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Total Estimado</span>
                <span className="font-bold">
                  {(parseFloat(formData.arrobasHa || "0") * parseFloat(selectedTalhao?.hectares.replace(",", ".") || "0")).toFixed(1)} @
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Motivo</span>
                <span className="font-medium">{formData.motivo}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Observação (opcional)</label>
              <Input
                placeholder="Detalhes adicionais..."
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com resumo e botão de adicionar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-500">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Perdas da Safra</h3>
            <p className="text-xs text-muted-foreground">
              {perdas.length > 0 ? `${perdas.length} ocorrência(s) registrada(s)` : "Nenhuma perda registrada"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setWizardOpen(true)}
          className="h-10 px-4 rounded-xl bg-red-500 hover:bg-red-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Perda
        </Button>
      </div>

      {/* Resumo por Talhão */}
      {perdas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(perdasPorTalhao).map(([talhao, data]) => (
            <div
              key={talhao}
              className="p-4 rounded-xl bg-red-500/5 border border-red-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-primary">{talhao}</span>
                <span className="text-xs text-muted-foreground">{data.count}x</span>
              </div>
              <p className="text-xl font-bold text-red-500">{data.total.toFixed(1)} @/ha</p>
            </div>
          ))}
          <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30">
            <p className="text-xs text-muted-foreground mb-2">Total Geral</p>
            <p className="text-2xl font-bold text-red-500">{totalPerdas.toFixed(1)} @/ha</p>
          </div>
        </div>
      )}

      {/* Lista de perdas */}
      {perdas.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/30">
            <p className="text-sm font-semibold">Histórico de Perdas</p>
          </div>
          <div className="divide-y divide-border/20">
            {perdas.map((perda: any) => (
              <div
                key={perda.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{perda.talhao}</span>
                  </div>
                  <div>
                    <p className="font-bold text-red-500">{parseFloat(perda.arrobasHa).toFixed(1)} @/ha</p>
                    <p className="text-xs text-muted-foreground">{perda.motivo}</p>
                    {perda.observacao && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{perda.observacao}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePerda(perda.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!perdasLoading && perdas.length === 0 && (
        <div className="text-center p-12 rounded-2xl border-2 border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-4 bg-green-500/10 rounded-2xl mb-4">
            <CheckCircle className="w-10 h-10 text-green-500/50" />
          </div>
          <p className="text-lg font-bold text-foreground/80 mb-2">
            Nenhuma perda registrada
          </p>
          <p className="text-sm text-muted-foreground/70 mb-6">
            Clique no botão acima para registrar uma perda
          </p>
          <Button
            onClick={() => setWizardOpen(true)}
            variant="outline"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Primeira Perda
          </Button>
        </div>
      )}

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(wizardStep / 4) * 100}%` }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-2 p-4 border-b border-border/30">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    wizardStep === step
                      ? "bg-primary text-primary-foreground scale-110"
                      : wizardStep > step
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 min-h-[350px]">
              {renderStepContent()}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border/30 bg-muted/20">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={() => {
                  if (wizardStep === 1) {
                    resetWizard();
                  } else {
                    setWizardStep(wizardStep - 1);
                  }
                }}
                disabled={isCreating}
              >
                {wizardStep === 1 ? "Cancelar" : "Voltar"}
              </Button>
              <Button
                className={cn(
                  "flex-1 h-11 rounded-xl",
                  wizardStep === 4 ? "bg-green-500 hover:bg-green-600" : ""
                )}
                onClick={() => {
                  if (wizardStep === 4) {
                    handleCreatePerda();
                  } else {
                    setWizardStep(wizardStep + 1);
                  }
                }}
                disabled={!canProceed() || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : wizardStep === 4 ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </>
                ) : (
                  "Próximo"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const perdaSchema = z.object({
  talhao: z.string().min(1, "Talhão é obrigatório"),
  arrobasHa: z.string().min(1, "Perda em @/ha é obrigatória"),
  motivo: z.string().min(1, "Motivo é obrigatório"),
  observacao: z.string().optional(),
});

type PerdaForm = z.infer<typeof perdaSchema>;

const batchCreateSchema = z.object({
  talhao: z.string().min(1, "Talhão é obrigatório"),
  quantidade: z.preprocess(
    (val) => (val === undefined || val === null || val === "" ? 1 : val),
    z
      .number()
      .min(1, "Quantidade deve ser maior que 0")
      .max(1000, "Máximo 1000 fardos por vez")
  ),
  tipo: z.enum(["normal", "bordadura", "bituca"]).default("normal"),
});

const singleCreateSchema = z.object({
  talhao: z.string().min(1, "Talhão é obrigatório"),
  numero: z
    .string()
    .min(1, "Número é obrigatório")
    .regex(/^\d{5}$/, "Número deve ter 5 dígitos"),
});

type BatchCreateForm = {
  talhao: string;
  quantidade: number | "";
  tipo: "normal" | "bordadura" | "bituca";
};
type SingleCreateForm = z.infer<typeof singleCreateSchema>;

export default function Campo() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [createdBales, setCreatedBales] = useState<Bale[]>([]);
  const { createBale, createBatch } = useOfflineBaleCreation();

  // Usar nova API de safras
  const { data: settingsData } = useSettings();
  const defaultSafra = settingsData?.defaultSafra || "";
  const talhoesSafra = settingsData?.talhoesSafra || [];

  const form = useForm<BatchCreateForm>({
    resolver: zodResolver(batchCreateSchema),
    defaultValues: {
      talhao: "",
      quantidade: "",
      tipo: "normal",
    },
  });

  const singleForm = useForm<SingleCreateForm>({
    resolver: zodResolver(singleCreateSchema),
    defaultValues: {
      talhao: "",
      numero: "",
    },
  });

  const handleCreateSingle = async (data: SingleCreateForm) => {
    if (!defaultSafra) {
      toast({
        variant: "destructive",
        title: "Safra não configurada",
        description:
          "O administrador precisa configurar a safra padrão nas configurações.",
      });
      return;
    }

    setIsCreating(true);
    setCreatedBales([]);

    try {
      const baleId = `${defaultSafra}-${data.talhao}-${data.numero}`;

      await createBale.mutateAsync({
        id: baleId,
        safra: defaultSafra,
        talhao: data.talhao,
        numero: parseInt(data.numero, 10),
      });

      singleForm.reset();
    } catch (error) {
      console.error("Erro ao criar fardo:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBatch = async (data: BatchCreateForm) => {
    if (!defaultSafra) {
      toast({
        variant: "destructive",
        title: "Safra não configurada",
        description:
          "O administrador precisa configurar a safra padrão nas configurações.",
      });
      return;
    }

    setIsCreating(true);
    setCreatedBales([]);

    try {
      const quantidade =
        data.quantidade === "" ||
        data.quantidade === undefined ||
        data.quantidade === null
          ? 1
          : Number(data.quantidade);

      const result = await createBatch.mutateAsync({
        safra: defaultSafra,
        talhao: data.talhao,
        quantidade: quantidade,
        tipo: data.tipo || "normal",
      });

      if (result?.bales && Array.isArray(result.bales)) {
        setCreatedBales(result.bales);
      }

      form.setValue("quantidade", "");
    } catch (error) {
      console.error("Erro ao criar fardos:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrintLabels = () => {
    if (createdBales.length === 0) return;
    const baleIds = createdBales.map((b) => b.id).join(",");
    setLocation(`/etiqueta?baleIds=${baleIds}`);
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <Page>
      <PageContent className="max-w-4xl mx-auto space-y-6">
        {/* Hero Header - Cotton Dark Premium */}
        <div className="relative overflow-hidden rounded-2xl glass-card">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />

          {/* Animated dots pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="absolute top-12 right-20 h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-8 right-12 h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Brand and title */}
              <div className="flex items-start gap-4">
                {/* Cotton Logo */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow overflow-hidden">
                    <img src={logoFavicon} alt="Cotton" className="h-12 w-12 object-contain" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-neon-cyan border-2 border-background flex items-center justify-center">
                    <Package className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Cotton App
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
                    <span className="gradient-text">Cadastro de Fardos</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
                      {user?.username || "Operador"}
                    </span>
                    {defaultSafra && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-cyan/20 text-neon-cyan">
                        <Calendar className="w-3 h-3 mr-1" />
                        {defaultSafra}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-xl border-border/50 hover:border-destructive/50 hover:text-destructive shrink-0"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>

          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Criar Fardos</h2>
                <p className="text-sm text-muted-foreground">
                  Cadastro rápido, lote ou individual
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Tabs */}
            <Tabs defaultValue="lote" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 p-1.5 bg-surface rounded-xl h-14">
                <TabsTrigger
                  value="lote"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm transition-all"
                >
                  <Package className="w-4 h-4 sm:mr-2" />
                  <span className="font-semibold text-xs sm:text-sm hidden sm:inline">
                    Em Lote
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="individual"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm transition-all"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="font-semibold text-xs sm:text-sm hidden sm:inline">
                    Individual
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="etiquetas"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm transition-all"
                >
                  <QrCode className="w-4 h-4 sm:mr-2" />
                  <span className="font-semibold text-xs sm:text-sm hidden sm:inline">
                    Etiquetas
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="perdas"
                  className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground data-[state=active]:shadow-glow-sm transition-all"
                >
                  <TrendingDown className="w-4 h-4 sm:mr-2" />
                  <span className="font-semibold text-xs sm:text-sm hidden sm:inline">
                    Perdas
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Tab: Criar em Lote */}
              <TabsContent value="lote">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreateBatch)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="talhao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Wheat className="w-4 h-4 text-primary" />
                            Talhão de Produção
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isCreating}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-12 rounded-xl bg-surface border-border/50"
                                data-testid="select-talhao"
                              >
                                <SelectValue placeholder="Selecione o talhão de algodão" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 bg-popover">
                              {talhoesSafra.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  Nenhum talhão configurado. Configure uma safra nas configurações.
                                </div>
                              ) : (
                                talhoesSafra.map((talhao) => (
                                  <SelectItem
                                    key={talhao.id}
                                    value={talhao.nome}
                                    className="rounded-lg my-0.5 data-[highlighted]:bg-primary/20 data-[state=checked]:bg-primary/30 focus:bg-primary/20"
                                  >
                                    <div className="flex items-center justify-between gap-3 w-full py-1">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                        <span className="font-semibold">
                                          {talhao.nome}
                                        </span>
                                      </div>
                                      <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
                                        {talhao.hectares} ha
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />A
                            numeração continuará de onde parou neste talhão
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            Quantidade de Fardos
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="1000"
                              placeholder="Digite a quantidade (Ex: 50)"
                              {...field}
                              value={
                                field.value === "" ? "" : field.value || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? "" : parseInt(value) || ""
                                );
                              }}
                              disabled={isCreating}
                              data-testid="input-quantidade"
                              className="h-12 rounded-xl text-base bg-surface border-border/50"
                            />
                          </FormControl>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Zap className="w-3.5 h-3.5 text-neon-orange" />
                            Crie até 1000 fardos de uma só vez
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Tipo de Fardo
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isCreating}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 bg-popover">
                              <SelectItem
                                value="normal"
                                className="rounded-lg my-0.5 data-[highlighted]:bg-primary/20"
                              >
                                <div className="flex items-center gap-2 py-1">
                                  <CircleDot className="w-3.5 h-3.5 text-primary" />
                                  <span className="font-semibold">Normal</span>
                                  <span className="text-xs text-muted-foreground">- Fardo padrão</span>
                                </div>
                              </SelectItem>
                              <SelectItem
                                value="bordadura"
                                className="rounded-lg my-0.5 data-[highlighted]:bg-neon-orange/20"
                              >
                                <div className="flex items-center gap-2 py-1">
                                  <CircleDot className="w-3.5 h-3.5 text-neon-orange" />
                                  <span className="font-semibold">Bordadura</span>
                                  <span className="text-xs text-muted-foreground">- Bordas do talhão</span>
                                </div>
                              </SelectItem>
                              <SelectItem
                                value="bituca"
                                className="rounded-lg my-0.5 data-[highlighted]:bg-amber-500/20"
                              >
                                <div className="flex items-center gap-2 py-1">
                                  <CircleDot className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="font-semibold">Bituca</span>
                                  <span className="text-xs text-muted-foreground">- Algodão restante</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />
                            Classifique o tipo de fardo para rastreamento
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold btn-neon"
                      disabled={isCreating}
                      data-testid="button-create-batch"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Criando {form.watch("quantidade")} fardo(s)...
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5 mr-2" />
                          Criar Lote de Fardos
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Tab: Criar Individual */}
              <TabsContent value="individual">
                <Form {...singleForm}>
                  <form
                    onSubmit={singleForm.handleSubmit(handleCreateSingle)}
                    className="space-y-5"
                  >
                    <FormField
                      control={singleForm.control}
                      name="talhao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Wheat className="w-4 h-4 text-primary" />
                            Talhão de Produção
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isCreating}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                                <SelectValue placeholder="Selecione o talhão de algodão" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 bg-popover">
                              {talhoesSafra.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  Nenhum talhão configurado. Configure uma safra nas configurações.
                                </div>
                              ) : (
                                talhoesSafra.map((talhao) => (
                                  <SelectItem
                                    key={talhao.id}
                                    value={talhao.nome}
                                    className="rounded-lg my-0.5 data-[highlighted]:bg-primary/20 data-[state=checked]:bg-primary/30 focus:bg-primary/20"
                                  >
                                    <div className="flex items-center justify-between gap-3 w-full py-1">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                        <span className="font-semibold">
                                          {talhao.nome}
                                        </span>
                                      </div>
                                      <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
                                        {talhao.hectares} ha
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />A
                            numeração continuará de onde parou neste talhão
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={singleForm.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Hash className="w-4 h-4 text-primary" />
                            Número do Fardo
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Ex: 00001"
                              maxLength={5}
                              {...field}
                              disabled={isCreating}
                              className="h-12 rounded-xl text-base bg-surface border-border/50"
                            />
                          </FormControl>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Tag className="w-3.5 h-3.5 text-neon-cyan" />
                            Digite o número de 5 dígitos (Ex: 00001, 00042)
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold btn-neon"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Criando fardo...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 mr-2" />
                          Criar Fardo Individual
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Tab: Buscar Etiquetas */}
              <TabsContent value="etiquetas">
                <EtiquetasTab defaultSafra={defaultSafra} />
              </TabsContent>

              {/* Tab: Perdas */}
              <TabsContent value="perdas">
                <PerdasTab defaultSafra={defaultSafra} talhoesSafra={talhoesSafra} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Resultado da criação */}
        {createdBales.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
            <div className="relative p-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 via-neon-cyan/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                  <CheckCircle className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Fardos criados</h2>
                  <p className="text-sm text-muted-foreground">
                    Prontos para impressão
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-5 bg-primary/10 border border-primary/20 text-center">
                  <div className="text-3xl font-display font-bold text-primary">
                    {createdBales.length}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Fardos Criados
                  </p>
                </div>
                <div className="rounded-xl p-5 bg-neon-cyan/10 border border-neon-cyan/20 text-center">
                  <div className="text-3xl font-display font-bold text-neon-cyan">
                    {createdBales[0].talhao}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neon-cyan" />
                    Talhão
                  </p>
                </div>
              </div>

              <div className="bg-surface/50 rounded-xl p-5 space-y-3 border border-border/30">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">
                    Numeração Gerada:
                  </span>
                  <div className="flex-1 h-px bg-border/30"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {createdBales.slice(0, 10).map((bale) => (
                    <span
                      key={bale.id}
                      className="px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-sm font-mono font-bold text-primary"
                    >
                      {bale.numero}
                    </span>
                  ))}
                  {createdBales.length > 10 && (
                    <span className="px-3 py-2 rounded-xl bg-surface text-sm font-mono text-muted-foreground font-semibold">
                      +{createdBales.length - 10} mais
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={handlePrintLabels}
                className="w-full h-12 rounded-xl text-base font-semibold btn-neon"
                data-testid="button-print-labels"
              >
                <Printer className="w-5 h-5 mr-2" />
                Imprimir Todas as Etiquetas
              </Button>
            </div>
          </div>
        )}

        {/* Card de Instruções */}
        <div className="glass-card p-5 rounded-xl">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Como funciona
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Digite o código do talhão (ex: T-01)</li>
            <li>Informe quantos fardos deseja criar</li>
            <li>Os números são gerados automaticamente</li>
            <li>A numeração continua de onde parou em cada talhão</li>
            <li>Imprima todas as etiquetas de uma vez</li>
          </ol>
        </div>
      </PageContent>
    </Page>
  );
}
