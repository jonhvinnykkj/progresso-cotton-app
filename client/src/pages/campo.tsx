import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Package, LogOut, QrCode, Loader2, CheckCircle, Plus, Wheat, Hash, Calendar, Zap, Lightbulb, Tag, MapPin, Printer, Search, Filter, ArrowLeft } from "lucide-react";
import logoProgresso from "/favicon.png";
import { z } from "zod";
import type { Bale } from "@shared/schema";
import { TALHOES_INFO } from "@shared/talhoes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/footer";
import { getAuthHeaders } from "@/lib/api-client";

// Componente para buscar etiquetas
function EtiquetasTab({ defaultSafra }: { defaultSafra: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [talhaoFilter, setTalhaoFilter] = useState("");
  const [numeroInicio, setNumeroInicio] = useState("");
  const [numeroFim, setNumeroFim] = useState("");
  const [baleIdBusca, setBaleIdBusca] = useState("");
  
  // Buscar todos os fardos
  const { data: bales = [], isLoading } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  // Filtrar fardos da safra atual e status campo (qualquer usuário pode ver)
  const myBales = bales.filter(b => 
    b.safra === defaultSafra && 
    b.status === "campo"
  );

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
    
    // Verificar se o fardo existe - buscar com e sem prefixo
    let bale = myBales.find(b => b.id.toUpperCase() === searchId);
    
    // Se não encontrou, tentar normalizar o ID (adicionar T no talhão se não tiver)
    if (!bale) {
      // Tentar adicionar T no talhão: S25/26-1B-00001 -> S25/26-T1B-00001
      const searchIdComT = searchId.replace(/(S\d+\/\d+-)(T?)(\w+)(-\d+)/, '$1T$3$4');
      bale = myBales.find(b => b.id.toUpperCase() === searchIdComT);
    }
    
    if (!bale) {
      // Tentar buscar em todos os fardos para dar feedback melhor
      const baleOutraSafra = bales.find(b => b.id.toUpperCase() === searchId);
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
          description: "Este ID não existe no sistema. Formato esperado: S25/26-T1B-00001",
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

    // Filtrar fardos do talhão e intervalo
    const balesFiltrados = myBales.filter(b => {
      // Normalizar talhões: remover o "T" se houver
      const talhaoNormalizado = b.talhao.replace(/^T/, '');
      const filtroNormalizado = talhaoFilter.replace(/^T/, '');
      
      if (talhaoNormalizado !== filtroNormalizado) return false;
      
      // Converter numero para inteiro, removendo zeros à esquerda
      const numeroStr = String(b.numero).replace(/^0+/, '') || '0';
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

    const baleIds = balesFiltrados.map(b => b.id).join(',');
    setLocation(`/etiqueta?baleIds=${baleIds}`);
  };

  // Agrupar fardos por talhão
  const fardosPorTalhao = myBales.reduce((acc, bale) => {
    if (!acc[bale.talhao]) {
      acc[bale.talhao] = [];
    }
    acc[bale.talhao].push(bale);
    return acc;
  }, {} as Record<string, Bale[]>);

  return (
    <div className="space-y-6">
      {/* Busca por ID único */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl border border-blue-200/30">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">Buscar por ID</h3>
            <p className="text-xs text-muted-foreground">Digite o código completo do fardo</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/10 dark:to-blue-900/5 p-6 rounded-2xl border border-blue-200/30 shadow-sm space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ex: S25/26-T1B-00001"
              value={baleIdBusca}
              onChange={(e) => setBaleIdBusca(e.target.value.toUpperCase())}
              className="flex-1 font-mono h-12 rounded-xl border-blue-200/50 bg-white/80 dark:bg-background/50 backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all shadow-sm"
            />
            <Button 
              onClick={handleBuscarPorId} 
              className="shrink-0 h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
          <div className="flex items-start gap-2 text-xs text-blue-700/80 dark:text-blue-300/80 bg-blue-100/50 dark:bg-blue-900/20 px-3 py-2.5 rounded-xl">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Cole ou digite o ID completo do fardo que deseja reimprimir a etiqueta</p>
          </div>
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-dashed border-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 py-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider rounded-full border border-border/30">
            ou busque múltiplos
          </span>
        </div>
      </div>

      {/* Busca por intervalo */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-2xl border border-green-200/30">
            <Filter className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">Buscar por Intervalo</h3>
            <p className="text-xs text-muted-foreground">Selecione talhão e intervalo de números</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50/80 to-emerald-100/40 dark:from-green-950/10 dark:to-emerald-900/5 p-6 rounded-2xl border border-green-200/30 shadow-sm space-y-5">
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
              <Wheat className="w-4 h-4 text-green-600" />
              Talhão de Produção
            </label>
            <Select value={talhaoFilter} onValueChange={setTalhaoFilter}>
              <SelectTrigger className="h-12 rounded-xl border-green-200/50 bg-white/80 dark:bg-background/50 backdrop-blur-sm hover:border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all shadow-sm">
                <SelectValue placeholder="Selecione o talhão" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-green-200/30 shadow-xl">
                {Object.keys(fardosPorTalhao).sort().map((talhao) => (
                  <SelectItem 
                    key={talhao} 
                    value={talhao} 
                    className="rounded-xl my-1 mx-1 focus:bg-green-50 dark:focus:bg-green-900/20"
                  >
                    <div className="flex items-center justify-between gap-4 w-full py-1">
                      <span className="font-bold font-mono text-green-700 dark:text-green-400">{talhao}</span>
                      <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-semibold shadow-sm">
                        {fardosPorTalhao[talhao].length} fardos
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
                <Hash className="w-4 h-4 text-green-600" />
                Número Inicial
              </label>
              <Input
                type="number"
                placeholder="1"
                value={numeroInicio}
                onChange={(e) => setNumeroInicio(e.target.value)}
                min="1"
                max="99999"
                className="h-12 rounded-xl border-green-200/50 bg-white/80 dark:bg-background/50 backdrop-blur-sm hover:border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all font-mono text-base shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
                <Hash className="w-4 h-4 text-green-600" />
                Número Final
              </label>
              <Input
                type="number"
                placeholder="10"
                value={numeroFim}
                onChange={(e) => setNumeroFim(e.target.value)}
                min="1"
                max="99999"
                className="h-12 rounded-xl border-green-200/50 bg-white/80 dark:bg-background/50 backdrop-blur-sm hover:border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all font-mono text-base shadow-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleBuscarPorIntervalo} 
              className="w-full h-13 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-xl transition-all duration-300 text-base font-bold hover:scale-[1.02]"
            >
              <Printer className="w-5 h-5 mr-2" />
              Gerar Etiquetas do Intervalo
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-green-700/80 dark:text-green-300/80 bg-green-100/50 dark:bg-green-900/20 px-3 py-2.5 rounded-xl">
            <Zap className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Gere até 100 etiquetas por vez • A numeração é contínua dentro do talhão</p>
          </div>
        </div>
      </div>

      {/* Resumo dos fardos */}
      {!isLoading && myBales.length > 0 && (
        <div className="mt-8 bg-gradient-to-br from-muted/40 to-muted/20 p-6 rounded-2xl border border-border/30 shadow-sm space-y-5 animate-fade-in-up backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base">Seus Fardos Disponíveis</h3>
              <p className="text-xs text-muted-foreground">Fardos criados e prontos para reimprimir</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-white to-green-50/30 dark:from-background dark:to-green-950/10 rounded-2xl p-5 border border-green-200/20 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                {myBales.length}
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Total em Campo
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-background dark:to-blue-950/10 rounded-2xl p-5 border border-blue-200/20 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mb-2">
                {Object.keys(fardosPorTalhao).length}
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Talhões Ativos
              </div>
            </div>
          </div>

          {/* Lista de talhões com contagem */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>
              <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Distribuição por Talhão</p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(fardosPorTalhao).sort(([a], [b]) => a.localeCompare(b)).map(([talhao, bales]) => (
                <div 
                  key={talhao} 
                  className="flex items-center justify-between bg-white/60 dark:bg-background/40 backdrop-blur-sm rounded-xl p-3.5 border border-border/20 text-xs transition-all duration-300 hover:border-primary/40 hover:scale-105 hover:shadow-sm"
                >
                  <span className="font-mono font-bold text-primary text-sm">{talhao}</span>
                  <span className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 px-3 py-1.5 rounded-full text-green-700 dark:text-green-300 font-bold shadow-sm">
                    {bales.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && myBales.length === 0 && (
        <div className="text-center p-12 bg-gradient-to-br from-muted/20 to-muted/5 rounded-3xl border-2 border-dashed border-border/30 animate-fade-in-up backdrop-blur-sm">
          <div className="inline-flex p-5 bg-gradient-to-br from-muted/40 to-muted/20 rounded-3xl mb-5 shadow-inner">
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

const batchCreateSchema = z.object({
  talhao: z.string().min(1, "Talhão é obrigatório"),
  quantidade: z.preprocess(
    (val) => (val === undefined || val === null || val === "") ? 1 : val,
    z.number().min(1, "Quantidade deve ser maior que 0").max(1000, "Máximo 1000 fardos por vez")
  ),
});

const singleCreateSchema = z.object({
  talhao: z.string().min(1, "Talhão é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório").regex(/^\d{5}$/, "Número deve ter 5 dígitos"),
});

type BatchCreateForm = {
  talhao: string;
  quantidade: number | "";
};
type SingleCreateForm = z.infer<typeof singleCreateSchema>;

export default function Campo() {
  const [, setLocation] = useLocation();
  const { logout, user, selectedRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [createdBales, setCreatedBales] = useState<Bale[]>([]);

  // Buscar safra padrão das configurações
  const { data: defaultSafraData } = useQuery<{ value: string }>({
    queryKey: ["/api/settings/default-safra"],
  });

  const defaultSafra = defaultSafraData?.value || "";

  const form = useForm<BatchCreateForm>({
    resolver: zodResolver(batchCreateSchema),
    defaultValues: {
      talhao: "",
      quantidade: "", // Inicia vazio, será convertido para 1 no preprocess
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
    setIsCreating(true);
    setCreatedBales([]);
    
    if (!defaultSafra) {
      toast({
        variant: "destructive",
        title: "Safra não configurada",
        description: "O administrador precisa configurar a safra padrão nas configurações.",
      });
      setIsCreating(false);
      return;
    }
    
    try {
      const baleId = `S${defaultSafra}-T${data.talhao}-${data.numero}`;
      
      const payload = {
        id: baleId,
        qrCode: baleId,
        safra: defaultSafra,
        talhao: data.talhao,
        numero: data.numero,
        userId: user?.id ? String(user.id) : undefined,
      };

      const response = await fetch("/api/bales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Erro ao criar fardo");
      }

      const bale = await response.json();
      setCreatedBales([bale]);

      await queryClient.invalidateQueries({ queryKey: ["/api/bales"] });

      toast({
        variant: "success",
        title: "Fardo criado com sucesso",
        description: `Fardo ${baleId} criado no talhão ${data.talhao}`,
      });

      // Resetar form
      singleForm.reset();

    } catch (error) {
      console.error("Erro ao criar fardo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar fardo",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBatch = async (data: BatchCreateForm) => {
    setIsCreating(true);
    setCreatedBales([]);
    
    // Validar se há safra configurada
    if (!defaultSafra) {
      toast({
        variant: "destructive",
        title: "Safra não configurada",
        description: "O administrador precisa configurar a safra padrão nas configurações.",
      });
      setIsCreating(false);
      return;
    }
    
    try {
      // Incluir safra automaticamente do settings
      const payload = {
        ...data,
        safra: defaultSafra,
        userId: user?.id ? String(user.id) : undefined,
      };

      const response = await fetch("/api/bales/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Erro ao criar fardos");
      }

      const result = await response.json();
      
      // A resposta agora contém: { created, requested, skipped, bales }
      const bales = result.bales || result; // Compatibilidade com resposta antiga
      const created = result.created || bales.length;
      const skipped = result.skipped || 0;
      
      setCreatedBales(bales);

      // Invalidar cache para garantir que a página de etiquetas veja os novos fardos
      await queryClient.invalidateQueries({ queryKey: ["/api/bales"] });

      // Mensagem diferenciada se houver fardos pulados
      if (skipped > 0) {
        toast({
          variant: "warning",
          title: "Fardos criados com avisos",
          description: `${created} fardo(s) criado(s), ${skipped} pulado(s) (já existiam) no talhão ${data.talhao}`,
        });
      } else {
        toast({
          variant: "success",
          title: "Fardos criados com sucesso",
          description: `${created} fardo(s) criado(s) no talhão ${data.talhao}`,
        });
      }

      // Resetar apenas quantidade (deixar vazio)
      form.setValue("quantidade", "");

    } catch (error) {
      console.error("Erro ao criar fardos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar fardos",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrintLabels = () => {
    if (createdBales.length === 0) return;
    
    // Redirecionar para página de impressão em lote
    const baleIds = createdBales.map(b => b.id).join(',');
    setLocation(`/etiqueta?baleIds=${baleIds}`);
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="mobile-page pb-20 lg:pb-0">
      {/* Header */}
      <header className="mobile-header backdrop-blur-md bg-background/95 border-b">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0 animate-fade-in-up">
              <div className="p-2 bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl shadow-lg shrink-0">
                <img
                  src={logoProgresso}
                  alt="Grupo Progresso"
                  className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:scale-110 duration-300"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-semibold truncate">Cadastro de Fardos</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Operador: {user?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(selectedRole === "admin" || selectedRole === "superadmin") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="shrink-0 transition-all hover:scale-105 duration-300 border-2 border-green-300 hover:border-yellow-400 hover:bg-yellow-50 rounded-xl font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="shrink-0 transition-all hover:scale-110 duration-300"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mobile-content bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
          
          {/* Formulário de Cadastro */}
          <Card className="shadow-xl border-2 animate-fade-in-up overflow-hidden" style={{ animationDelay: '0.1s' }}>
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 pb-8 relative overflow-hidden">
              {/* Padrão decorativo de fundo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white font-bold">Criar Fardos</CardTitle>
                    <CardDescription className="text-white/90 text-sm mt-0.5">
                      Sistema inteligente de cadastro
                    </CardDescription>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="pt-6 -mt-4 relative">
              {/* Exibir safra atual - Card flutuante */}
              {defaultSafra && (
                <div className="mb-6 p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Safra Ativa</p>
                        <p className="text-lg font-bold text-primary">{defaultSafra}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-primary/20 rounded-full">
                      <span className="text-xs font-semibold text-primary">ATIVA</span>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="lote" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-muted/50 rounded-xl h-12">
                  <TabsTrigger 
                    value="lote" 
                    className="rounded-lg transition-all hover:scale-105 duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-xs sm:text-sm">Em Lote</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="individual" 
                    className="rounded-lg transition-all hover:scale-105 duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-xs sm:text-sm">Individual</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="etiquetas" 
                    className="rounded-lg transition-all hover:scale-105 duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-xs sm:text-sm">Etiquetas</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Criar em Lote */}
                <TabsContent value="lote">
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateBatch)} className="space-y-5">
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
                            <SelectTrigger className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all" data-testid="select-talhao">
                              <SelectValue placeholder="Selecione o talhão de algodão" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-green-200/30 shadow-xl">
                            {TALHOES_INFO.map((talhao) => (
                              <SelectItem 
                                key={talhao.id} 
                                value={talhao.nome}
                                className="rounded-xl my-1 mx-1 focus:bg-green-50 dark:focus:bg-green-900/20"
                              >
                                <div className="flex items-center justify-between gap-3 w-full py-1">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                                    <span className="font-semibold">{talhao.nome}</span>
                                  </div>
                                  <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-semibold shadow-sm">
                                    {talhao.hectares} ha
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="flex items-center gap-1.5 text-xs">
                          <Lightbulb className="w-3.5 h-3.5" />
                          A numeração continuará de onde parou neste talhão
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
                            value={field.value === "" ? "" : (field.value || "")}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                            disabled={isCreating}
                            data-testid="input-quantidade"
                            className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all focus:scale-[1.01] duration-300 text-base"
                          />
                        </FormControl>
                        <FormDescription className="flex items-center gap-1.5 text-xs">
                          <Zap className="w-3.5 h-3.5" />
                          Crie até 1000 fardos de uma só vez
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-13 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-base font-bold"
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
                  <form onSubmit={singleForm.handleSubmit(handleCreateSingle)} className="space-y-5">
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
                              <SelectTrigger className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all">
                                <SelectValue placeholder="Selecione o talhão de algodão" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-green-200/30 shadow-xl">
                              {TALHOES_INFO.map((talhao) => (
                                <SelectItem 
                                  key={talhao.id} 
                                  value={talhao.nome}
                                  className="rounded-xl my-1 mx-1 focus:bg-green-50 dark:focus:bg-green-900/20"
                                >
                                  <div className="flex items-center justify-between gap-3 w-full py-1">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-green-600" />
                                      <span className="font-semibold">{talhao.nome}</span>
                                    </div>
                                    <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 px-3 py-1 rounded-full font-semibold shadow-sm">
                                      {talhao.hectares} ha
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Lightbulb className="w-3.5 h-3.5" />
                            A numeração continuará de onde parou neste talhão
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
                              className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all focus:scale-[1.01] duration-300 text-base"
                            />
                          </FormControl>
                          <FormDescription className="flex items-center gap-1.5 text-xs">
                            <Tag className="w-3.5 h-3.5" />
                            Digite o número de 5 dígitos (Ex: 00001, 00042)
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-13 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-base font-bold"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Criando fardo...
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5 mr-2" />
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
            </Tabs>
            </CardContent>
          </Card>

          {/* Resultado da criação */}
          {createdBales.length > 0 && (
            <Card className="shadow-xl border-2 border-green-200 animate-fade-in-up overflow-hidden" style={{ animationDelay: '0.2s' }}>
              {/* Header com gradiente de sucesso */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl animate-bounce-gentle">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Sucesso!
                    </CardTitle>
                    <p className="text-white/90 text-sm">Fardos criados e prontos para impressão</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="space-y-5 pt-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl p-5 border-2 border-green-200/50">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="transition-transform hover:scale-110 duration-300">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {createdBales.length}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        Fardos Criados
                      </p>
                    </div>
                    <div className="transition-transform hover:scale-110 duration-300">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {createdBales[0].talhao}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-green-600" />
                        Talhão
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-2xl p-5 space-y-3 border-2 border-muted">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Numeração Gerada:</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {createdBales.slice(0, 10).map((bale, index) => (
                      <span 
                        key={bale.id} 
                        className="px-3 py-2 bg-white dark:bg-background rounded-xl text-sm font-mono font-bold animate-fade-in-up transition-all hover:scale-110 hover:shadow-lg duration-300 border-2 border-green-200"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {bale.numero}
                      </span>
                    ))}
                    {createdBales.length > 10 && (
                      <span className="px-3 py-2 bg-muted rounded-xl text-sm font-mono text-muted-foreground font-semibold animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        +{createdBales.length - 10} mais
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handlePrintLabels}
                  className="w-full h-13 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl duration-300 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-base font-bold"
                  data-testid="button-print-labels"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Imprimir Todas as Etiquetas
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card de Instruções */}
          <Card className="bg-muted/50 border-muted animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Como funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Digite o código do talhão (ex: T-01)</li>
                <li>Informe quantos fardos deseja criar</li>
                <li>Os números serão gerados automaticamente: 00001, 00002, 00003...</li>
                <li>A numeração continua de onde parou em cada talhão</li>
                <li>Imprima todas as etiquetas de uma vez</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}