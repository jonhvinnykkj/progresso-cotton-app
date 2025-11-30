import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/api-client";
import { API_URL } from "@/lib/api-config";
import {
  Plus,
  Loader2,
  Check,
  Trash2,
  Map,
  FileUp,
  Calendar,
  Wheat,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Upload,
  Sparkles,
  LandPlot,
  MoreVertical,
  Target,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Safra {
  id: string;
  nome: string;
  descricao: string | null;
  isAtiva: number;
  metaProdutividade?: string | null;
  createdAt: string;
}

interface ParsedTalhao {
  nome: string;
  hectares: string;
  geometry: string;
  centroid: string;
}

interface TalhaoSafra {
  id: string;
  safraId: string;
  nome: string;
  hectares: string;
  geometry: string;
  centroid: string | null;
  cultura: string;
}

export function SafraConfig() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSafra, setSelectedSafra] = useState<Safra | null>(null);
  const [expandedSafras, setExpandedSafras] = useState<Set<string>>(new Set());
  const [editingSafraId, setEditingSafraId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingMeta, setEditingMeta] = useState("");
  const [newSafraNome, setNewSafraNome] = useState("");
  const [newSafraMeta, setNewSafraMeta] = useState("350");
  const [parsedTalhoes, setParsedTalhoes] = useState<ParsedTalhao[]>([]);
  const [selectedTalhoes, setSelectedTalhoes] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all safras
  const { data: safras = [], isLoading: isLoadingSafras } = useQuery<Safra[]>({
    queryKey: ["/api/safras"],
  });

  // Fetch talhões for all safras (for display)
  const { data: allTalhoes = {} } = useQuery<Record<string, TalhaoSafra[]>>({
    queryKey: ["/api/safras/all-talhoes"],
    queryFn: async () => {
      const result: Record<string, TalhaoSafra[]> = {};
      for (const safra of safras) {
        const url = API_URL
          ? `${API_URL}/api/safras/${safra.id}/talhoes`
          : `/api/safras/${safra.id}/talhoes`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (response.ok) {
          result[safra.id] = await response.json();
        }
      }
      return result;
    },
    enabled: safras.length > 0,
  });

  // Create safra mutation
  const createSafraMutation = useMutation({
    mutationFn: async ({ nome, meta }: { nome: string; meta: string }) => {
      const response = await apiRequest("POST", "/api/safras", { nome, metaProdutividade: meta });
      return response.json();
    },
    onSuccess: (data: Safra) => {
      queryClient.invalidateQueries({ queryKey: ["/api/safras"] });
      setShowCreateDialog(false);
      setNewSafraNome("");
      setNewSafraMeta("350");
      // Auto-expand the new safra and open upload dialog
      setExpandedSafras(prev => new Set([...prev, data.id]));
      setSelectedSafra(data);
      toast({
        variant: "success",
        title: "Safra criada!",
        description: "Agora configure os talhões de algodão",
      });
      // Open upload dialog after a short delay
      setTimeout(() => setShowUploadDialog(true), 300);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar safra",
        description: error.message,
      });
    },
  });

  // Update safra name mutation
  const updateSafraMutation = useMutation({
    mutationFn: async ({ id, nome, meta }: { id: string; nome: string; meta?: string }) => {
      const payload: any = { nome };
      if (meta !== undefined) payload.metaProdutividade = meta;
      const response = await apiRequest("PATCH", `/api/safras/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safras"] });
      setEditingSafraId(null);
      toast({
        variant: "success",
        title: "Nome atualizado",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  // Activate safra mutation
  const activateSafraMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/safras/${id}/ativar`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safras"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        variant: "success",
        title: "Safra ativada!",
        description: "Esta safra agora é a padrão do sistema",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao ativar safra",
        description: error.message,
      });
    },
  });

  // Delete safra mutation
  const deleteSafraMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/safras/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safras"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setShowDeleteDialog(false);
      setSelectedSafra(null);
      toast({
        variant: "success",
        title: "Safra deletada",
        description: "Safra e seus talhões foram removidos",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar safra",
        description: error.message,
      });
    },
  });

  // Save talhões mutation
  const saveTalhoesMutation = useMutation({
    mutationFn: async ({ safraId, talhoes }: { safraId: string; talhoes: ParsedTalhao[] }) => {
      const response = await apiRequest("POST", `/api/safras/${safraId}/talhoes/batch`, {
        talhoes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safras/all-talhoes"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setShowUploadDialog(false);
      setParsedTalhoes([]);
      setSelectedTalhoes(new Set());
      toast({
        variant: "success",
        title: "Talhões salvos!",
        description: "Os talhões foram configurados para esta safra",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar talhões",
        description: error.message,
      });
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();

      for (const file of Array.from(files)) {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext === 'shp') {
          formData.append('shp', file);
        } else if (ext === 'dbf') {
          formData.append('dbf', file);
        } else if (ext === 'geojson' || ext === 'json') {
          formData.append('geojson', file);
        }
      }

      const url = API_URL ? `${API_URL}/api/shapefile/parse` : "/api/shapefile/parse";
      const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao processar arquivo");
      }

      const result = await response.json();

      if (result.success && result.talhoes) {
        setParsedTalhoes(result.talhoes);
        setSelectedTalhoes(new Set(result.talhoes.map((t: ParsedTalhao) => t.nome)));
        toast({
          variant: "success",
          title: "Arquivo processado!",
          description: `${result.totalFeatures} talhões encontrados`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  // Toggle safra expansion
  const toggleExpanded = (safraId: string) => {
    setExpandedSafras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(safraId)) {
        newSet.delete(safraId);
      } else {
        newSet.add(safraId);
      }
      return newSet;
    });
  };

  // Start editing safra name
  const startEditing = (safra: Safra) => {
    setEditingSafraId(safra.id);
    setEditingName(safra.nome);
    setEditingMeta(safra.metaProdutividade || "350");
  };

  // Save edited name
  const saveEditedName = () => {
    if (editingSafraId && editingName.trim()) {
      updateSafraMutation.mutate({
        id: editingSafraId,
        nome: editingName.trim(),
        meta: editingMeta.trim() || undefined,
      });
    }
  };

  // Toggle talhão selection
  const toggleTalhao = (nome: string) => {
    const newSelected = new Set(selectedTalhoes);
    if (newSelected.has(nome)) {
      newSelected.delete(nome);
    } else {
      newSelected.add(nome);
    }
    setSelectedTalhoes(newSelected);
  };

  // Select all / deselect all
  const toggleAll = () => {
    if (selectedTalhoes.size === parsedTalhoes.length) {
      setSelectedTalhoes(new Set());
    } else {
      setSelectedTalhoes(new Set(parsedTalhoes.map(t => t.nome)));
    }
  };

  // Save selected talhões
  const handleSaveTalhoes = () => {
    if (!selectedSafra || selectedTalhoes.size === 0) return;

    const talhoesToSave = parsedTalhoes.filter(t => selectedTalhoes.has(t.nome));
    saveTalhoesMutation.mutate({ safraId: selectedSafra.id, talhoes: talhoesToSave });
  };

  // Calculate total hectares for selected
  const totalHectares = parsedTalhoes
    .filter(t => selectedTalhoes.has(t.nome))
    .reduce((acc, t) => acc + parseFloat(t.hectares || '0'), 0);

  // Get stats for a safra
  const getSafraStats = (safraId: string) => {
    const talhoes = allTalhoes[safraId] || [];
    const totalHa = talhoes.reduce((acc, t) => acc + parseFloat(t.hectares || '0'), 0);
    return { count: talhoes.length, hectares: totalHa };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wheat className="w-5 h-5 text-primary" />
            Gerenciar Safras
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure as safras e seus talhões de algodão
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Safra
        </Button>
      </div>

      {/* Empty State */}
      {!isLoadingSafras && safras.length === 0 && (
        <div className="text-center py-16 px-4 border-2 border-dashed border-border/50 rounded-2xl bg-surface/50">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Comece configurando sua primeira safra</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Crie uma safra para começar a registrar os fardos de algodão.
            Você poderá importar os talhões de um arquivo shapefile.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="rounded-xl bg-primary hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Primeira Safra
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingSafras && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Safras List */}
      {!isLoadingSafras && safras.length > 0 && (
        <div className="space-y-3">
          {safras.map((safra) => {
            const isExpanded = expandedSafras.has(safra.id);
            const isEditing = editingSafraId === safra.id;
            const stats = getSafraStats(safra.id);
            const talhoes = allTalhoes[safra.id] || [];

            return (
              <Collapsible
                key={safra.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(safra.id)}
              >
                <div
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    safra.isAtiva === 1
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-surface"
                  )}
                >
                  {/* Safra Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Expand Button */}
                      <CollapsibleTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>

                      {/* Icon */}
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        safra.isAtiva === 1 ? "bg-primary/20" : "bg-muted"
                      )}>
                        <Calendar className={cn(
                          "w-5 h-5",
                          safra.isAtiva === 1 ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>

                      {/* Name & Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8 w-32 rounded-lg"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditedName();
                                  if (e.key === 'Escape') setEditingSafraId(null);
                                }}
                              />
                              <Input
                                value={editingMeta}
                                onChange={(e) => setEditingMeta(e.target.value)}
                                className="h-8 w-28 rounded-lg"
                                placeholder="Meta @/ha"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditedName();
                                  if (e.key === 'Escape') setEditingSafraId(null);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={saveEditedName}
                                disabled={updateSafraMutation.isPending}
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingSafraId(null)}
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-lg">Safra {safra.nome}</span>
                              <button
                                onClick={() => startEditing(safra)}
                                className="p-1 rounded hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </>
                          )}
                          {safra.isAtiva === 1 && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                              ATIVA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <LandPlot className="w-3.5 h-3.5" />
                            {stats.count} talhões
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {stats.hectares.toFixed(1)} ha
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            Meta {safra.metaProdutividade || "350"} @/ha
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {safra.isAtiva !== 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg hidden sm:flex"
                            onClick={() => activateSafraMutation.mutate(safra.id)}
                            disabled={activateSafraMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Ativar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => {
                            setSelectedSafra(safra);
                            setShowUploadDialog(true);
                          }}
                        >
                          <Map className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Talhões</span>
                        </Button>

                        {/* More Options Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => startEditing(safra)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar nome
                            </DropdownMenuItem>
                            {safra.isAtiva !== 1 && (
                              <DropdownMenuItem onClick={() => activateSafraMutation.mutate(safra.id)}>
                                <Check className="w-4 h-4 mr-2" />
                                Ativar safra
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setSelectedSafra(safra);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Talhões */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-1">
                      <div className="p-4 rounded-xl bg-background/50 border border-border/30">
                        {talhoes.length === 0 ? (
                          <div className="text-center py-6">
                            <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-muted-foreground mb-3">Nenhum talhão configurado</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => {
                                setSelectedSafra(safra);
                                setShowUploadDialog(true);
                              }}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Importar Talhões
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                Talhões de Algodão
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 text-xs"
                                onClick={() => {
                                  setSelectedSafra(safra);
                                  setShowUploadDialog(true);
                                }}
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" />
                                Reimportar
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {talhoes.map((talhao) => (
                                <div
                                  key={talhao.id}
                                  className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                                >
                                  <span className="font-medium">{talhao.nome}</span>
                                  <span className="text-muted-foreground ml-2">{parseFloat(talhao.hectares).toFixed(1)} ha</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create Safra Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              Nova Safra
            </DialogTitle>
            <DialogDescription>
              Crie uma nova safra para começar a registrar os fardos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="safra-nome">Nome da Safra</Label>
              <Input
                id="safra-nome"
                placeholder="Ex: 25/26"
                value={newSafraNome}
                onChange={(e) => setNewSafraNome(e.target.value)}
                className="rounded-xl h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSafraNome) {
                    createSafraMutation.mutate({ nome: newSafraNome, meta: newSafraMeta });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use o formato XX/XX (ex: 24/25, 25/26)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safra-meta">Meta de Produtividade (@/ha)</Label>
              <Input
                id="safra-meta"
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 350"
                value={newSafraMeta}
                onChange={(e) => setNewSafraMeta(e.target.value)}
                className="rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">
                Usada para o score e projeções de produtividade (pode ser ajustada depois).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createSafraMutation.mutate({ nome: newSafraNome, meta: newSafraMeta })}
              disabled={!newSafraNome || createSafraMutation.isPending}
              className="rounded-xl bg-primary"
            >
              {createSafraMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Safra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Talhões Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) {
          setParsedTalhoes([]);
          setSelectedTalhoes(new Set());
        }
      }}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Map className="w-5 h-5 text-primary" />
              </div>
              Configurar Talhões - Safra {selectedSafra?.nome}
            </DialogTitle>
            <DialogDescription>
              Importe os talhões do plano de plantio e selecione os de algodão
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Upload Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                isUploading ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-surface"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".shp,.dbf,.prj,.shx,.geojson,.json"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                  <p className="text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileUp className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Clique para fazer upload</p>
                    <p className="text-sm text-muted-foreground">
                      Selecione os arquivos .shp e .dbf ou um arquivo .geojson
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Talhões Selection */}
            {parsedTalhoes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Selecione os talhões de Algodão</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTalhoes.size} de {parsedTalhoes.length} selecionados • {totalHectares.toFixed(1)} ha
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                    className="rounded-lg"
                  >
                    {selectedTalhoes.size === parsedTalhoes.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {parsedTalhoes.map((talhao) => (
                    <div
                      key={talhao.nome}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedTalhoes.has(talhao.nome)
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      )}
                      onClick={() => toggleTalhao(talhao.nome)}
                    >
                      <Checkbox
                        checked={selectedTalhoes.has(talhao.nome)}
                        onCheckedChange={() => toggleTalhao(talhao.nome)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{talhao.nome}</p>
                        <p className="text-xs text-muted-foreground">{parseFloat(talhao.hectares).toFixed(1)} ha</p>
                      </div>
                      {selectedTalhoes.has(talhao.nome) && (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/30 pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTalhoes}
              disabled={selectedTalhoes.size === 0 || saveTalhoesMutation.isPending}
              className="rounded-xl bg-primary"
            >
              {saveTalhoesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Salvar {selectedTalhoes.size} Talhões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              Deletar Safra {selectedSafra?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-2">
                <p>
                  Esta ação não pode ser desfeita. Todos os talhões configurados
                  para esta safra também serão removidos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-11 rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSafra && deleteSafraMutation.mutate(selectedSafra.id)}
              disabled={deleteSafraMutation.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {deleteSafraMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Sim, Deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
