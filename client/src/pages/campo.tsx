import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// Componente para registrar perdas
function PerdasTab({ defaultSafra, talhoesSafra }: { defaultSafra: string; talhoesSafra: { id: string; nome: string; hectares: string }[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const perdaForm = useForm<PerdaForm>({
    resolver: zodResolver(perdaSchema),
    defaultValues: {
      talhao: "",
      arrobasHa: "",
      motivo: "",
      observacao: "",
    },
  });

  // Query para buscar perdas
  const { data: perdas = [], isLoading: perdasLoading } = useQuery({
    queryKey: ["/api/perdas", defaultSafra],
    queryFn: async () => {
      if (!defaultSafra) return [];
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/perdas/${encodeURIComponent(defaultSafra)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao buscar perdas");
      return res.json();
    },
    enabled: !!defaultSafra,
  });

  // Calcular total de perdas em @/ha
  const totalPerdas = perdas.reduce((acc: number, perda: any) => acc + parseFloat(perda.arrobasHa || "0"), 0);

  const handleCreatePerda = async (data: PerdaForm) => {
    if (!defaultSafra) {
      toast({
        variant: "destructive",
        title: "Safra não configurada",
        description: "Configure a safra nas configurações.",
      });
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/perdas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          safra: defaultSafra,
          talhao: data.talhao,
          arrobasHa: data.arrobasHa,
          motivo: data.motivo,
          observacao: data.observacao || undefined,
        }),
      });

      if (!res.ok) throw new Error("Erro ao registrar perda");

      toast({
        variant: "success",
        title: "Perda registrada",
        description: `${data.arrobasHa} @/ha de perda registrados com sucesso.`,
      });

      perdaForm.reset();
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
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/perdas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erro ao deletar perda");

      toast({
        variant: "success",
        title: "Perda removida",
        description: "Registro de perda excluído com sucesso.",
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

  const motivos = [
    "Causa Natural (clima)",
    "Praga/Doença",
    "Fogo",
    "Perda Mecânica",
    "Outro",
  ];

  return (
    <div className="space-y-6">
      {/* Formulário de registro de perdas */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base">Registrar Perda</h3>
            <p className="text-xs text-muted-foreground">
              Informe as perdas de algodão na produção
            </p>
          </div>
        </div>

        <Form {...perdaForm}>
          <form onSubmit={perdaForm.handleSubmit(handleCreatePerda)} className="glass-card p-5 rounded-xl space-y-4">
            <FormField
              control={perdaForm.control}
              name="talhao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-primary" />
                    Talhão
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isCreating}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                        <SelectValue placeholder="Selecione o talhão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border/50 bg-popover">
                      {talhoesSafra.map((talhao) => (
                        <SelectItem key={talhao.id} value={talhao.nome} className="rounded-lg my-0.5">
                          <div className="flex items-center justify-between gap-3 w-full py-1">
                            <span className="font-semibold">{talhao.nome}</span>
                            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full">{talhao.hectares} ha</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={perdaForm.control}
                name="arrobasHa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Perda (@/ha)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 15.5"
                        {...field}
                        disabled={isCreating}
                        className="h-12 rounded-xl bg-surface border-border/50"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={perdaForm.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Motivo
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isCreating}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/50 bg-popover">
                        {motivos.map((motivo) => (
                          <SelectItem key={motivo} value={motivo} className="rounded-lg my-0.5">
                            {motivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={perdaForm.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Observação (opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Detalhes adicionais..."
                      {...field}
                      disabled={isCreating}
                      className="h-12 rounded-xl bg-surface border-border/50"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold bg-destructive hover:bg-destructive/90"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Registrar Perda
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Resumo de perdas */}
      <div className="glass-card p-5 rounded-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Perdas Registradas</h3>
            <p className="text-xs text-muted-foreground">
              Total perdido nesta safra
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5 bg-destructive/10 border border-destructive/20">
            <div className="text-3xl font-display font-bold text-destructive mb-2">
              {totalPerdas.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Total @/ha Perdido
            </div>
          </div>
          <div className="rounded-xl p-5 bg-amber-500/10 border border-amber-500/20">
            <div className="text-3xl font-display font-bold text-amber-500 mb-2">
              {perdas.length}
            </div>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Ocorrências
            </div>
          </div>
        </div>

        {/* Lista de perdas */}
        {!perdasLoading && perdas.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/30"></div>
              <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                Histórico de Perdas
              </p>
              <div className="h-px flex-1 bg-border/30"></div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {perdas.map((perda: any) => (
                <div
                  key={perda.id}
                  className="flex items-center justify-between rounded-lg p-3 border border-border/30 bg-surface/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-sm">{perda.talhao}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold">
                        {parseFloat(perda.arrobasHa).toLocaleString()} @/ha
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{perda.motivo}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeletePerda(perda.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!perdasLoading && perdas.length === 0 && (
          <div className="text-center p-8 rounded-xl border-2 border-dashed border-border/30 bg-surface/30">
            <div className="inline-flex p-4 bg-surface rounded-xl mb-4">
              <CheckCircle className="w-8 h-8 text-neon-cyan/40" />
            </div>
            <p className="text-sm font-bold text-foreground/80 mb-1">
              Nenhuma perda registrada
            </p>
            <p className="text-xs text-muted-foreground/70">
              Ótimo! Sem perdas até o momento.
            </p>
          </div>
        )}
      </div>
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
