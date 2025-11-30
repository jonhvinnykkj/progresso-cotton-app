import { useState, useMemo, useRef, useEffect } from "react";
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

// Componente para criar fardos em lote - Wizard
function LoteTab({
  defaultSafra,
  talhoesSafra,
  onBalesCreated
}: {
  defaultSafra: string;
  talhoesSafra: { id: string; nome: string; hectares: string }[];
  onBalesCreated: (bales: Bale[]) => void;
}) {
  const { toast } = useToast();
  const { createBatch } = useOfflineBaleCreation();
  const [isCreating, setIsCreating] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTalhao, setSelectedTalhao] = useState<{ nome: string; hectares: string } | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [tipo, setTipo] = useState<"normal" | "bordadura" | "bituca">("normal");

  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wizardOpen && wizardRef.current) {
      setTimeout(() => {
        wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [wizardOpen]);

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedTalhao(null);
    setQuantidade("");
    setTipo("normal");
  };

  const tipos = [
    { id: "normal", label: "Normal", desc: "Fardo padrão de algodão", icon: "📦" },
    { id: "bordadura", label: "Bordadura", desc: "Bordas do talhão", icon: "🔲" },
    { id: "bituca", label: "Bituca", desc: "Algodão restante", icon: "🧹" },
  ];

  const handleCreateBatch = async () => {
    if (!defaultSafra || !selectedTalhao || !quantidade) return;

    setIsCreating(true);
    try {
      const result = await createBatch.mutateAsync({
        safra: defaultSafra,
        talhao: selectedTalhao.nome,
        quantidade: parseInt(quantidade),
        tipo: tipo,
      });

      if (result?.bales && Array.isArray(result.bales)) {
        onBalesCreated(result.bales);
        toast({
          variant: "success",
          title: "Fardos criados!",
          description: `${result.bales.length} fardo(s) criados no talhão ${selectedTalhao.nome}`,
        });
      }

      resetWizard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar os fardos.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return !!selectedTalhao;
      case 2: return !!quantidade && parseInt(quantidade) > 0 && parseInt(quantidade) <= 1000;
      case 3: return !!tipo;
      default: return true;
    }
  };

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
              <p className="text-sm text-muted-foreground">Onde os fardos foram produzidos?</p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
              {talhoesSafra.map((talhao) => {
                const isSelected = selectedTalhao?.nome === talhao.nome;
                return (
                  <button
                    key={talhao.id}
                    onClick={() => setSelectedTalhao(talhao)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "bg-primary/10 border-primary scale-105"
                        : "bg-card border-border/50 hover:border-primary/50"
                    )}
                  >
                    <p className="font-bold text-foreground">{talhao.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{talhao.hectares} ha</p>
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
              <div className="inline-flex p-3 rounded-full bg-neon-cyan/10 mb-3">
                <Package className="w-6 h-6 text-neon-cyan" />
              </div>
              <h3 className="text-lg font-bold">Quantidade de Fardos</h3>
              <p className="text-sm text-muted-foreground">
                Quantos fardos do <span className="font-bold text-primary">{selectedTalhao?.nome}</span>?
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-[200px]">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="h-16 text-3xl font-bold text-center rounded-2xl"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">Máximo: 1000 fardos por vez</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-neon-orange/10 mb-3">
                <Layers className="w-6 h-6 text-neon-orange" />
              </div>
              <h3 className="text-lg font-bold">Tipo de Fardo</h3>
              <p className="text-sm text-muted-foreground">Qual a classificação?</p>
            </div>
            <div className="space-y-2">
              {tipos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id as typeof tipo)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                    tipo === t.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border/50 hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="font-bold">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  {tipo === t.id && (
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
              <h3 className="text-lg font-bold">Confirmar Criação</h3>
              <p className="text-sm text-muted-foreground">Revise os dados</p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Talhão</span>
                <span className="font-bold text-primary">{selectedTalhao?.nome}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Quantidade</span>
                <span className="font-bold text-neon-cyan">{quantidade} fardo(s)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <span className="font-medium capitalize">{tipo}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header e botão de iniciar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Criar em Lote</h3>
            <p className="text-xs text-muted-foreground">
              Crie múltiplos fardos de uma vez
            </p>
          </div>
        </div>
        {!wizardOpen && (
          <Button
            onClick={() => setWizardOpen(true)}
            className="h-10 px-4 rounded-xl btn-neon"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lote
          </Button>
        )}
      </div>

      {/* Wizard Inline */}
      {wizardOpen && (
        <div ref={wizardRef} className="bg-card border-2 border-primary/30 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-1.5 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            />
          </div>

          <div className="flex justify-center gap-3 p-4 border-b border-border/30 bg-muted/20">
            {[
              { num: 1, label: "Talhão" },
              { num: 2, label: "Quantidade" },
              { num: 3, label: "Tipo" },
              { num: 4, label: "Confirmar" },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    wizardStep === step.num
                      ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                      : wizardStep > step.num
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step.num ? <CheckCircle className="w-4 h-4" /> : step.num}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  wizardStep === step.num ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 min-h-[320px]">
            {renderStepContent()}
          </div>

          <div className="flex gap-3 p-4 border-t border-border/30 bg-muted/10">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-base"
              onClick={() => {
                if (wizardStep === 1) resetWizard();
                else setWizardStep(wizardStep - 1);
              }}
              disabled={isCreating}
            >
              {wizardStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            <Button
              className={cn(
                "flex-1 h-12 rounded-xl text-base",
                wizardStep === 4 ? "bg-green-500 hover:bg-green-600" : ""
              )}
              onClick={() => {
                if (wizardStep === 4) handleCreateBatch();
                else setWizardStep(wizardStep + 1);
              }}
              disabled={!canProceed() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : wizardStep === 4 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Fardos
                </>
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Info card */}
      {!wizardOpen && (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-4">
            <Package className="w-10 h-10 text-primary/50" />
          </div>
          <p className="text-lg font-bold text-foreground/80 mb-2">
            Criação em Lote
          </p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Crie até 1000 fardos de uma só vez com numeração automática
          </p>
          <Button
            onClick={() => setWizardOpen(true)}
            variant="outline"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Começar
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente para criar fardo individual - Wizard
function IndividualTab({
  defaultSafra,
  talhoesSafra,
  onBaleCreated
}: {
  defaultSafra: string;
  talhoesSafra: { id: string; nome: string; hectares: string }[];
  onBaleCreated: (bale: Bale) => void;
}) {
  const { toast } = useToast();
  const { createBale } = useOfflineBaleCreation();
  const [isCreating, setIsCreating] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTalhao, setSelectedTalhao] = useState<{ nome: string; hectares: string } | null>(null);
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState<"normal" | "bordadura" | "bituca">("normal");

  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wizardOpen && wizardRef.current) {
      setTimeout(() => {
        wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [wizardOpen]);

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedTalhao(null);
    setNumero("");
    setTipo("normal");
  };

  const handleCreateSingle = async () => {
    if (!defaultSafra || !selectedTalhao || !numero) return;

    setIsCreating(true);
    try {
      const baleId = `${defaultSafra}-${selectedTalhao.nome}-${numero.padStart(5, '0')}`;

      await createBale.mutateAsync({
        id: baleId,
        safra: defaultSafra,
        talhao: selectedTalhao.nome,
        numero: parseInt(numero, 10),
        tipo: tipo,
      });

      const tipoLabel = tipo === "normal" ? "" : ` (${tipo})`;
      toast({
        variant: "success",
        title: "Fardo criado!",
        description: `Fardo ${numero}${tipoLabel} criado no talhão ${selectedTalhao.nome}`,
      });

      resetWizard();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o fardo.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return !!selectedTalhao;
      case 2: return !!numero && /^\d{1,5}$/.test(numero);
      case 3: return !!tipo; // Tipo selection
      default: return true;
    }
  };

  const tipoOptions = [
    { value: "normal", label: "Normal", description: "Fardo padrão", icon: "📦", color: "bg-primary" },
    { value: "bordadura", label: "Bordadura", description: "Fardo de borda do talhão", icon: "🔲", color: "bg-amber-500" },
    { value: "bituca", label: "Bituca", description: "Restos/sobras", icon: "♻️", color: "bg-orange-500" },
  ] as const;

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
              <p className="text-sm text-muted-foreground">Onde o fardo foi produzido?</p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
              {talhoesSafra.map((talhao) => {
                const isSelected = selectedTalhao?.nome === talhao.nome;
                return (
                  <button
                    key={talhao.id}
                    onClick={() => setSelectedTalhao(talhao)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "bg-primary/10 border-primary scale-105"
                        : "bg-card border-border/50 hover:border-primary/50"
                    )}
                  >
                    <p className="font-bold text-foreground">{talhao.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{talhao.hectares} ha</p>
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
              <div className="inline-flex p-3 rounded-full bg-neon-cyan/10 mb-3">
                <Hash className="w-6 h-6 text-neon-cyan" />
              </div>
              <h3 className="text-lg font-bold">Número do Fardo</h3>
              <p className="text-sm text-muted-foreground">
                Digite o número para o <span className="font-bold text-primary">{selectedTalhao?.nome}</span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-[200px]">
                <Input
                  type="text"
                  maxLength={5}
                  placeholder="00001"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                  className="h-16 text-3xl font-bold text-center rounded-2xl font-mono"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">Até 5 dígitos (Ex: 00001, 00042)</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 mb-3">
                <Package className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold">Tipo do Fardo</h3>
              <p className="text-sm text-muted-foreground">Selecione a classificação</p>
            </div>

            <div className="space-y-2">
              {tipoOptions.map((option) => {
                const isSelected = tipo === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTipo(option.value)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border/50 hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                      isSelected ? option.color : "bg-muted"
                    )}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
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
              <h3 className="text-lg font-bold">Confirmar Criação</h3>
              <p className="text-sm text-muted-foreground">Revise os dados do fardo</p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Talhão</span>
                <span className="font-bold text-primary">{selectedTalhao?.nome}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Número</span>
                <span className="font-bold font-mono text-neon-cyan">{numero.padStart(5, '0')}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <span className={cn(
                  "font-semibold capitalize",
                  tipo === "normal" ? "text-primary" : tipo === "bordadura" ? "text-amber-500" : "text-orange-500"
                )}>
                  {tipo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ID Final</span>
                <span className="font-mono text-xs">{defaultSafra}-{selectedTalhao?.nome}-{numero.padStart(5, '0')}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header e botão de iniciar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Fardo Individual</h3>
            <p className="text-xs text-muted-foreground">
              Crie um fardo com número específico
            </p>
          </div>
        </div>
        {!wizardOpen && (
          <Button
            onClick={() => setWizardOpen(true)}
            className="h-10 px-4 rounded-xl btn-neon"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Fardo
          </Button>
        )}
      </div>

      {/* Wizard Inline */}
      {wizardOpen && (
        <div ref={wizardRef} className="bg-card border-2 border-neon-cyan/30 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-1.5 bg-muted">
            <div
              className="h-full bg-neon-cyan transition-all duration-300"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            />
          </div>

          <div className="flex justify-center gap-2 sm:gap-3 p-4 border-b border-border/30 bg-muted/20">
            {[
              { num: 1, label: "Talhão" },
              { num: 2, label: "Número" },
              { num: 3, label: "Tipo" },
              { num: 4, label: "Confirmar" },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    wizardStep === step.num
                      ? "bg-neon-cyan text-black scale-110 shadow-lg"
                      : wizardStep > step.num
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step.num ? <CheckCircle className="w-4 h-4" /> : step.num}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  wizardStep === step.num ? "text-neon-cyan" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 min-h-[320px]">
            {renderStepContent()}
          </div>

          <div className="flex gap-3 p-4 border-t border-border/30 bg-muted/10">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-base"
              onClick={() => {
                if (wizardStep === 1) resetWizard();
                else setWizardStep(wizardStep - 1);
              }}
              disabled={isCreating}
            >
              {wizardStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            <Button
              className={cn(
                "flex-1 h-12 rounded-xl text-base",
                wizardStep === 4 ? "bg-green-500 hover:bg-green-600" : "bg-neon-cyan hover:bg-neon-cyan/90 text-black"
              )}
              onClick={() => {
                if (wizardStep === 4) handleCreateSingle();
                else setWizardStep(wizardStep + 1);
              }}
              disabled={!canProceed() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : wizardStep === 4 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Fardo
                </>
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Info card */}
      {!wizardOpen && (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-4 bg-neon-cyan/10 rounded-2xl mb-4">
            <Tag className="w-10 h-10 text-neon-cyan/50" />
          </div>
          <p className="text-lg font-bold text-foreground/80 mb-2">
            Fardo Individual
          </p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Crie um fardo específico com número personalizado
          </p>
          <Button
            onClick={() => setWizardOpen(true)}
            variant="outline"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Começar
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente para buscar etiquetas - Wizard
function EtiquetasTab({ defaultSafra }: { defaultSafra: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchMode, setSearchMode] = useState<"id" | "intervalo" | null>(null);
  const [baleIdBusca, setBaleIdBusca] = useState("");
  const [talhaoFilter, setTalhaoFilter] = useState("");
  const [numeroInicio, setNumeroInicio] = useState("");
  const [numeroFim, setNumeroFim] = useState("");

  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wizardOpen && wizardRef.current) {
      setTimeout(() => {
        wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [wizardOpen]);

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

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSearchMode(null);
    setBaleIdBusca("");
    setTalhaoFilter("");
    setNumeroInicio("");
    setNumeroFim("");
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1: return !!searchMode;
      case 2:
        if (searchMode === "id") return !!baleIdBusca.trim();
        if (searchMode === "intervalo") return !!talhaoFilter;
        return false;
      case 3:
        if (searchMode === "intervalo") {
          const inicio = parseInt(numeroInicio);
          const fim = parseInt(numeroFim);
          return !!numeroInicio && !!numeroFim && inicio <= fim && (fim - inicio) <= 100;
        }
        return true;
      default: return true;
    }
  };

  const handleFinalizar = () => {
    if (searchMode === "id") {
      handleBuscarPorId();
    } else {
      handleBuscarPorIntervalo();
    }
  };

  const totalSteps = searchMode === "id" ? 2 : 3;

  const renderStepContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-neon-orange/10 mb-3">
                <Printer className="w-6 h-6 text-neon-orange" />
              </div>
              <h3 className="text-lg font-bold">Tipo de Busca</h3>
              <p className="text-sm text-muted-foreground">Como deseja buscar as etiquetas?</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setSearchMode("id")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                  searchMode === "id"
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border/50 hover:border-primary/50"
                )}
              >
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-bold">Por ID Único</p>
                  <p className="text-xs text-muted-foreground">Digite o código completo do fardo</p>
                </div>
                {searchMode === "id" && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => setSearchMode("intervalo")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
                  searchMode === "intervalo"
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border/50 hover:border-primary/50"
                )}
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-bold">Por Intervalo</p>
                  <p className="text-xs text-muted-foreground">Selecione talhão e range de números</p>
                </div>
                {searchMode === "intervalo" && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
              </button>
            </div>
          </div>
        );

      case 2:
        if (searchMode === "id") {
          return (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">ID do Fardo</h3>
                <p className="text-sm text-muted-foreground">Digite ou cole o código completo</p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <Input
                  placeholder="S25/26-T1B-00001"
                  value={baleIdBusca}
                  onChange={(e) => setBaleIdBusca(e.target.value.toUpperCase())}
                  className="h-14 text-lg font-mono text-center rounded-2xl"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Formato: S25/26-T1B-00001</p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Selecione o Talhão</h3>
                <p className="text-sm text-muted-foreground">Qual talhão deseja imprimir?</p>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                {Object.entries(fardosPorTalhao)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([talhao, balesList]) => {
                    const isSelected = talhaoFilter === talhao;
                    return (
                      <button
                        key={talhao}
                        onClick={() => setTalhaoFilter(talhao)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "bg-primary/10 border-primary scale-105"
                            : "bg-card border-border/50 hover:border-primary/50"
                        )}
                      >
                        <p className="font-bold text-foreground">{talhao}</p>
                        <p className="text-[10px] text-muted-foreground">{balesList.length} fardos</p>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        }

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-neon-cyan/10 mb-3">
                <Hash className="w-6 h-6 text-neon-cyan" />
              </div>
              <h3 className="text-lg font-bold">Intervalo de Números</h3>
              <p className="text-sm text-muted-foreground">
                Números do talhão <span className="font-bold text-primary">{talhaoFilter}</span>
              </p>
            </div>
            <div className="flex items-center gap-4 justify-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">De</p>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={numeroInicio}
                  onChange={(e) => setNumeroInicio(e.target.value)}
                  className="h-14 w-24 text-xl font-bold text-center rounded-xl font-mono"
                  autoFocus
                />
              </div>
              <span className="text-2xl text-muted-foreground mt-6">→</span>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Até</p>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={numeroFim}
                  onChange={(e) => setNumeroFim(e.target.value)}
                  className="h-14 w-24 text-xl font-bold text-center rounded-xl font-mono"
                />
              </div>
            </div>
            {numeroInicio && numeroFim && (
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-sm font-medium">
                  {Math.min(parseInt(numeroFim) - parseInt(numeroInicio) + 1, 100)} etiqueta(s)
                </p>
                <p className="text-xs text-muted-foreground">Máximo: 100 por vez</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header e botão de iniciar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-orange/20 text-neon-orange">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Reimprimir Etiquetas</h3>
            <p className="text-xs text-muted-foreground">
              {myBales.length} fardos disponíveis
            </p>
          </div>
        </div>
        {!wizardOpen && (
          <Button
            onClick={() => setWizardOpen(true)}
            className="h-10 px-4 rounded-xl bg-neon-orange hover:bg-neon-orange/90 text-black"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        )}
      </div>

      {/* Wizard Inline */}
      {wizardOpen && (
        <div ref={wizardRef} className="bg-card border-2 border-neon-orange/30 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-1.5 bg-muted">
            <div
              className="h-full bg-neon-orange transition-all duration-300"
              style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
            />
          </div>

          <div className="flex justify-center gap-3 p-4 border-b border-border/30 bg-muted/20">
            {(searchMode === "id" ? [
              { num: 1, label: "Tipo" },
              { num: 2, label: "ID" },
            ] : [
              { num: 1, label: "Tipo" },
              { num: 2, label: "Talhão" },
              { num: 3, label: "Intervalo" },
            ]).map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    wizardStep === step.num
                      ? "bg-neon-orange text-black scale-110 shadow-lg"
                      : wizardStep > step.num
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step.num ? <CheckCircle className="w-4 h-4" /> : step.num}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  wizardStep === step.num ? "text-neon-orange" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 min-h-[320px]">
            {renderStepContent()}
          </div>

          <div className="flex gap-3 p-4 border-t border-border/30 bg-muted/10">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-base"
              onClick={() => {
                if (wizardStep === 1) resetWizard();
                else setWizardStep(wizardStep - 1);
              }}
            >
              {wizardStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            <Button
              className={cn(
                "flex-1 h-12 rounded-xl text-base",
                wizardStep === totalSteps ? "bg-green-500 hover:bg-green-600" : "bg-neon-orange hover:bg-neon-orange/90 text-black"
              )}
              onClick={() => {
                if (wizardStep === totalSteps) {
                  handleFinalizar();
                } else {
                  setWizardStep(wizardStep + 1);
                }
              }}
              disabled={!canProceed()}
            >
              {wizardStep === totalSteps ? (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </>
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Resumo dos fardos */}
      {!wizardOpen && !isLoading && myBales.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(fardosPorTalhao)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([talhao, balesList]) => (
              <div
                key={talhao}
                className="p-4 rounded-xl bg-neon-orange/5 border border-neon-orange/20"
              >
                <p className="font-bold text-primary">{talhao}</p>
                <p className="text-xl font-bold text-neon-orange">{balesList.length}</p>
                <p className="text-xs text-muted-foreground">fardos</p>
              </div>
            ))}
          <div className="p-4 rounded-xl bg-neon-orange/10 border-2 border-neon-orange/30">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold text-neon-orange">{myBales.length}</p>
            <p className="text-xs text-muted-foreground">em campo</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!wizardOpen && !isLoading && myBales.length === 0 && (
        <div className="text-center p-12 rounded-2xl border-2 border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-4 bg-neon-orange/10 rounded-2xl mb-4">
            <Package className="w-10 h-10 text-neon-orange/50" />
          </div>
          <p className="text-lg font-bold text-foreground/80 mb-2">
            Nenhum fardo disponível
          </p>
          <p className="text-sm text-muted-foreground/70">
            Crie fardos nas abas "Em Lote" ou "Individual" primeiro
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

  // Toggle para mostrar histórico
  const [showHistory, setShowHistory] = useState(false);

  // Ref para scroll automático ao wizard
  const wizardRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Scroll para o wizard quando abrir
  useEffect(() => {
    if (wizardOpen && wizardRef.current) {
      setTimeout(() => {
        wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [wizardOpen]);

  // Scroll para o histórico quando abrir
  useEffect(() => {
    if (showHistory && historyRef.current) {
      setTimeout(() => {
        historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showHistory]);

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
      {/* Hero Card - Design limpo e focado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-red-500/20">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Registro de Perdas</h3>
                <p className="text-sm text-muted-foreground">Safra {defaultSafra}</p>
              </div>
            </div>
          </div>

          {/* Resumo compacto */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Total de Perdas</p>
              <p className="text-2xl font-bold text-red-500">
                {totalPerdas > 0 ? `${totalPerdas.toFixed(1)} @/ha` : "0"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Ocorrências</p>
              <p className="text-2xl font-bold text-foreground">{perdas.length}</p>
            </div>
          </div>

          {/* Botão principal grande */}
          <Button
            onClick={() => setWizardOpen(true)}
            className="w-full h-14 rounded-xl text-base font-semibold bg-red-500 hover:bg-red-600"
            disabled={wizardOpen}
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Nova Perda
          </Button>

          {/* Link para ver histórico */}
          {perdas.length > 0 && !wizardOpen && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full mt-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              {showHistory ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Ocultar Histórico
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Ver Histórico ({perdas.length} registro{perdas.length > 1 ? "s" : ""})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Wizard Inline */}
      {wizardOpen && (
        <div ref={wizardRef} className="bg-card border-2 border-red-500/30 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Progress bar */}
          <div className="h-1.5 bg-muted">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${(wizardStep / 4) * 100}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-3 p-4 border-b border-border/30 bg-muted/20">
            {[
              { num: 1, label: "Talhão" },
              { num: 2, label: "Quantidade" },
              { num: 3, label: "Motivo" },
              { num: 4, label: "Confirmar" },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    wizardStep === step.num
                      ? "bg-red-500 text-white scale-110 shadow-lg"
                      : wizardStep > step.num
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step.num ? <CheckCircle className="w-4 h-4" /> : step.num}
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  wizardStep === step.num ? "text-red-500" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 min-h-[320px]">
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-border/30 bg-muted/10">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-base"
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
                "flex-1 h-12 rounded-xl text-base",
                wizardStep === 4 ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
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
      )}

      {/* Histórico expandível */}
      {showHistory && perdas.length > 0 && (
        <div ref={historyRef} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Resumo por Talhão */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Perdas por Talhão</p>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(perdasPorTalhao).map(([talhao, data]) => (
                <div
                  key={talhao}
                  className="p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-primary">{talhao}</span>
                    <span className="text-[10px] text-muted-foreground">{data.count}x</span>
                  </div>
                  <p className="text-lg font-bold text-red-500">{data.total.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">@/ha</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lista detalhada */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <p className="text-sm font-semibold">Histórico Detalhado</p>
              <span className="text-xs text-muted-foreground">{perdas.length} registro(s)</span>
            </div>
            <div className="divide-y divide-border/20 max-h-[400px] overflow-y-auto">
              {perdas.map((perda: any) => (
                <div
                  key={perda.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <span className="font-bold text-red-500 text-sm">{perda.talhao}</span>
                    </div>
                    <div>
                      <p className="font-bold text-red-500">{parseFloat(perda.arrobasHa).toFixed(1)} @/ha</p>
                      <p className="text-xs text-muted-foreground">{perda.motivo}</p>
                      {perda.observacao && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{perda.observacao}</p>
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
        </div>
      )}

      {/* Empty state - apenas quando não está no wizard */}
      {!perdasLoading && perdas.length === 0 && !wizardOpen && (
        <div className="text-center p-8 rounded-xl border border-dashed border-border/30 bg-surface/30">
          <div className="inline-flex p-3 bg-green-500/10 rounded-xl mb-3">
            <CheckCircle className="w-8 h-8 text-green-500/50" />
          </div>
          <p className="text-sm font-medium text-foreground/70 mb-1">
            Nenhuma perda registrada
          </p>
          <p className="text-xs text-muted-foreground">
            Use o botão acima para registrar
          </p>
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
  const [createdBales, setCreatedBales] = useState<Bale[]>([]);

  // Usar nova API de safras
  const { data: settingsData } = useSettings();
  const defaultSafra = settingsData?.defaultSafra || "";
  const talhoesSafra = settingsData?.talhoesSafra || [];

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
                <LoteTab
                  defaultSafra={defaultSafra}
                  talhoesSafra={talhoesSafra}
                  onBalesCreated={setCreatedBales}
                />
              </TabsContent>

              {/* Tab: Criar Individual */}
              <TabsContent value="individual">
                <IndividualTab
                  defaultSafra={defaultSafra}
                  talhoesSafra={talhoesSafra}
                  onBaleCreated={(bale) => setCreatedBales([bale])}
                />
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
