import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Bale, Carregamento, Lote, Fardinho } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/qr-scanner";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStatusUpdate } from "@/hooks/use-offline-status-update";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Page, PageContent } from "@/components/layout/page";
import { API_URL } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/api-client";
import logoFavicon from "/favicon.png";
import { useSettings } from "@/hooks/use-settings";
import {
  ScanLine,
  Factory,
  Loader2,
  Truck,
  Wheat,
  Hash,
  CheckCircle2,
  Keyboard,
  LogOut,
  Sparkles,
  ArrowRight,
  AlertCircle,
  BarChart3,
  Save,
  Scale,
  Percent,
  Plus,
  Trash2,
  Package,
  Pencil,
  X,
} from "lucide-react";

export default function Algodoeira() {
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBaleId, setManualBaleId] = useState("");
  const [scannedBale, setScannedBale] = useState<Bale | null>(null);
  const [activeTab, setActiveTab] = useState("beneficiamento");

  // Safra e talhões dinâmicos
  const { data: settingsData } = useSettings();
  const safraAtiva = settingsData?.safraAtiva;
  const talhoesSafra = settingsData?.talhoesSafra || [];
  const selectedSafra = safraAtiva?.nome || "";

  // Carregamentos state
  const [carregamentoTalhao, setCarregamentoTalhao] = useState("");
  const [carregamentoPeso, setCarregamentoPeso] = useState("");
  const [carregamentoObs, setCarregamentoObs] = useState("");

  // Lotes state (apenas peso da pluma)
  const [lotePesoPluma, setLotePesoPluma] = useState("");
  const [loteObs, setLoteObs] = useState("");

  // Fardinhos state (separado dos lotes)
  const [fardinhoQtd, setFardinhoQtd] = useState("");
  const [fardinhoObs, setFardinhoObs] = useState("");

  // Edit state for lotes (pluma)
  const [editingLoteId, setEditingLoteId] = useState<string | null>(null);
  const [editingLotePesoPluma, setEditingLotePesoPluma] = useState("");
  const [editingLoteObs, setEditingLoteObs] = useState("");

  // Edit state for fardinhos
  const [editingFardinhoId, setEditingFardinhoId] = useState<string | null>(null);
  const [editingFardinhoQtd, setEditingFardinhoQtd] = useState("");
  const [editingFardinhoObs, setEditingFardinhoObs] = useState("");

  const { updateStatus } = useOfflineStatusUpdate();

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
  });

  // Query para buscar carregamentos
  const { data: carregamentos = [] } = useQuery<Carregamento[]>({
    queryKey: ["/api/carregamentos", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/carregamentos/${encodedSafra}`
        : `/api/carregamentos/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: activeTab === "carregamentos" || activeTab === "pluma",
  });

  // Query para buscar totais de peso bruto por talhão
  const { data: pesoBrutoTotais = [] } = useQuery<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]>({
    queryKey: ["/api/carregamentos-totais", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/carregamentos-totais/${encodedSafra}`
        : `/api/carregamentos-totais/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: activeTab === "carregamentos" || activeTab === "pluma",
  });

  // Query para buscar lotes (peso da pluma)
  const { data: lotes = [] } = useQuery<Lote[]>({
    queryKey: ["/api/lotes", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/lotes/${encodedSafra}`
        : `/api/lotes/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: activeTab === "pluma" || activeTab === "fardinhos",
  });

  // Query para buscar fardinhos
  const { data: fardinhos = [] } = useQuery<Fardinho[]>({
    queryKey: ["/api/fardinhos", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/fardinhos/${encodedSafra}`
        : `/api/fardinhos/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: activeTab === "fardinhos",
  });

  // Query para buscar peso bruto total da safra
  const { data: pesoBrutoTotalSafra = 0 } = useQuery<number>({
    queryKey: ["/api/lotes-peso-bruto", selectedSafra],
    queryFn: async () => {
      const encodedSafra = encodeURIComponent(selectedSafra);
      const url = API_URL
        ? `${API_URL}/api/lotes-peso-bruto/${encodedSafra}`
        : `/api/lotes-peso-bruto/${encodedSafra}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) return 0;
      const data = await response.json();
      return data.pesoBrutoTotal || 0;
    },
    enabled: activeTab === "pluma" || activeTab === "fardinhos",
  });

  // Mutation para criar carregamento
  const createCarregamentoMutation = useMutation({
    mutationFn: async (data: {
      safra: string;
      talhao: string;
      pesoKg: string;
      observacao?: string;
    }) => {
      const url = API_URL ? `${API_URL}/api/carregamentos` : `/api/carregamentos`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Carregamento registrado",
        description: `Carregamento de ${carregamentoPeso} kg registrado para talhão ${carregamentoTalhao}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carregamentos", selectedSafra] });
      queryClient.invalidateQueries({ queryKey: ["/api/carregamentos-totais", selectedSafra] });
      setCarregamentoPeso("");
      setCarregamentoObs("");
    },
    onError: (error: Error) => {
      console.error("Erro ao criar carregamento:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar o carregamento.",
      });
    },
  });

  // Mutation para deletar carregamento
  const deleteCarregamentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = API_URL ? `${API_URL}/api/carregamentos/${id}` : `/api/carregamentos/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao deletar carregamento");
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Carregamento removido",
        description: "Carregamento removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carregamentos", selectedSafra] });
      queryClient.invalidateQueries({ queryKey: ["/api/carregamentos-totais", selectedSafra] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o carregamento.",
      });
    },
  });

  // Mutation para criar lote (apenas peso da pluma)
  const createLoteMutation = useMutation({
    mutationFn: async (data: {
      safra: string;
      pesoPluma: string;
      observacao?: string;
    }) => {
      const url = API_URL ? `${API_URL}/api/lotes` : `/api/lotes`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao criar lote");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        variant: "success",
        title: "Lote registrado",
        description: `Lote #${data.numeroLote} criado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lotes", selectedSafra] });
      setLotePesoPluma("");
      setLoteObs("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível criar o lote.",
      });
    },
  });

  // Mutation para criar fardinho
  const createFardinhoMutation = useMutation({
    mutationFn: async (data: {
      safra: string;
      quantidade: number;
      observacao?: string;
    }) => {
      const url = API_URL ? `${API_URL}/api/fardinhos` : `/api/fardinhos`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao registrar fardinhos");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Fardinhos registrados",
        description: `${fardinhoQtd} fardinhos registrados com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fardinhos", selectedSafra] });
      setFardinhoQtd("");
      setFardinhoObs("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar fardinhos.",
      });
    },
  });

  // Mutation para atualizar lote
  const updateLoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { pesoPluma?: string; observacao?: string } }) => {
      const url = API_URL ? `${API_URL}/api/lotes/${id}` : `/api/lotes/${id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar lote");
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Lote atualizado",
        description: "Lote atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lotes", selectedSafra] });
      setEditingLoteId(null);
      setEditingLotePesoPluma("");
      setEditingLoteObs("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o lote.",
      });
    },
  });

  // Mutation para deletar lote
  const deleteLoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = API_URL ? `${API_URL}/api/lotes/${id}` : `/api/lotes/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao deletar lote");
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Lote removido",
        description: "Lote removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lotes", selectedSafra] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o lote.",
      });
    },
  });

  // Mutation para atualizar fardinho
  const updateFardinhoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { quantidade?: number; observacao?: string } }) => {
      const url = API_URL ? `${API_URL}/api/fardinhos/${id}` : `/api/fardinhos/${id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar fardinho");
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Registro atualizado",
        description: "Registro de fardinhos atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fardinhos", selectedSafra] });
      setEditingFardinhoId(null);
      setEditingFardinhoQtd("");
      setEditingFardinhoObs("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o registro.",
      });
    },
  });

  // Mutation para deletar fardinho
  const deleteFardinhoMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = API_URL ? `${API_URL}/api/fardinhos/${id}` : `/api/fardinhos/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao deletar fardinho");
      return response.json();
    },
    onSuccess: () => {
      toast({
        variant: "success",
        title: "Registro removido",
        description: "Registro de fardinhos removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fardinhos", selectedSafra] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o registro.",
      });
    },
  });

  // Cálculos de rendimento baseados nos lotes e fardinhos (separados)
  const totaisLotes = useMemo(() => {
    const lotesList = lotes ?? [];
    const fardinhosList = fardinhos ?? [];

    // Total peso pluma vem dos lotes
    const totalPesoPluma = lotesList.reduce((acc, l) => acc + parseFloat(l.pesoPluma), 0);

    // Total fardinhos vem da tabela separada
    const totalFardinhos = fardinhosList.reduce((acc, f) => acc + f.quantidade, 0);

    // Rendimento % = Peso Pluma / Peso Bruto * 100
    const rendimentoGeral = pesoBrutoTotalSafra > 0
      ? (totalPesoPluma / pesoBrutoTotalSafra) * 100
      : 0;

    // Peso médio = Total Peso Pluma / Total Fardinhos
    const pesoMedioFardinho = totalFardinhos > 0
      ? totalPesoPluma / totalFardinhos
      : 0;

    return {
      totalPesoPluma,
      totalFardinhos,
      rendimentoGeral,
      pesoMedioFardinho,
      qtdLotes: lotesList.length,
    };
  }, [lotes, fardinhos, pesoBrutoTotalSafra]);

  // Handlers
  const handleCreateCarregamento = () => {
    console.log("handleCreateCarregamento called:", { carregamentoTalhao, carregamentoPeso, selectedSafra });
    if (!carregamentoTalhao || !carregamentoPeso) {
      toast({
        variant: "warning",
        title: "Dados incompletos",
        description: "Selecione o talhão e informe o peso.",
      });
      return;
    }
    console.log("Calling mutation with:", {
      safra: selectedSafra,
      talhao: carregamentoTalhao,
      pesoKg: carregamentoPeso.replace(",", "."),
      observacao: carregamentoObs || undefined,
    });
    createCarregamentoMutation.mutate({
      safra: selectedSafra,
      talhao: carregamentoTalhao,
      pesoKg: carregamentoPeso.replace(",", "."),
      observacao: carregamentoObs || undefined,
    });
  };

  // Handler para criar lote (apenas peso da pluma)
  const handleCreateLote = () => {
    if (!lotePesoPluma) {
      toast({
        variant: "warning",
        title: "Dados incompletos",
        description: "Informe o peso da pluma.",
      });
      return;
    }

    createLoteMutation.mutate({
      safra: selectedSafra,
      pesoPluma: lotePesoPluma.replace(",", "."),
      observacao: loteObs || undefined,
    });
  };

  // Handler para criar registro de fardinhos
  const handleCreateFardinho = () => {
    if (!fardinhoQtd) {
      toast({
        variant: "warning",
        title: "Dados incompletos",
        description: "Informe a quantidade de fardinhos.",
      });
      return;
    }

    const quantidade = parseInt(fardinhoQtd);
    if (isNaN(quantidade) || quantidade <= 0) {
      toast({
        variant: "warning",
        title: "Dados inválidos",
        description: "A quantidade deve ser um número maior que zero.",
      });
      return;
    }

    createFardinhoMutation.mutate({
      safra: selectedSafra,
      quantidade,
      observacao: fardinhoObs || undefined,
    });
  };

  // Handler para iniciar edição de lote
  const handleEditLote = (lote: Lote) => {
    setEditingLoteId(lote.id);
    setEditingLotePesoPluma(lote.pesoPluma);
    setEditingLoteObs(lote.observacao || "");
  };

  // Handler para salvar edição de lote
  const handleSaveLote = () => {
    if (!editingLoteId || !editingLotePesoPluma) return;

    updateLoteMutation.mutate({
      id: editingLoteId,
      data: {
        pesoPluma: editingLotePesoPluma.replace(",", "."),
        observacao: editingLoteObs || undefined,
      },
    });
  };

  // Handler para cancelar edição de lote
  const handleCancelEditLote = () => {
    setEditingLoteId(null);
    setEditingLotePesoPluma("");
    setEditingLoteObs("");
  };

  // Handler para iniciar edição de fardinho
  const handleEditFardinho = (fardinho: Fardinho) => {
    setEditingFardinhoId(fardinho.id);
    setEditingFardinhoQtd(fardinho.quantidade.toString());
    setEditingFardinhoObs(fardinho.observacao || "");
  };

  // Handler para salvar edição de fardinho
  const handleSaveFardinho = () => {
    if (!editingFardinhoId || !editingFardinhoQtd) return;

    const quantidade = parseInt(editingFardinhoQtd);
    if (isNaN(quantidade) || quantidade <= 0) {
      toast({
        variant: "warning",
        title: "Dados inválidos",
        description: "A quantidade deve ser um número maior que zero.",
      });
      return;
    }

    updateFardinhoMutation.mutate({
      id: editingFardinhoId,
      data: {
        quantidade,
        observacao: editingFardinhoObs || undefined,
      },
    });
  };

  // Handler para cancelar edição de fardinho
  const handleCancelEditFardinho = () => {
    setEditingFardinhoId(null);
    setEditingFardinhoQtd("");
    setEditingFardinhoObs("");
  };

  const processBaleId = async (baleId: string) => {
    const normalizedId = baleId.trim().toUpperCase();

    const bale = (bales ?? []).find((b) => b.id.toUpperCase() === normalizedId);

    if (!bale) {
      toast({
        variant: "destructive",
        title: "Fardo não encontrado",
        description: `ID "${normalizedId}" não está cadastrado no sistema.`,
      });
      return;
    }

    if (bale.status !== "patio") {
      toast({
        variant: "destructive",
        title: "Fardo não disponível",
        description: `Este fardo está com status "${bale.status}". Apenas fardos no pátio podem ser beneficiados.`,
      });
      return;
    }

    setScannedBale(bale);
  };

  const handleScan = async (qrCode: string) => {
    setShowScanner(false);
    await processBaleId(qrCode);
  };

  const handleManualSubmit = async () => {
    if (!manualBaleId.trim()) {
      toast({
        variant: "warning",
        title: "ID inválido",
        description: "Digite um ID válido.",
      });
      return;
    }

    setShowManualInput(false);
    await processBaleId(manualBaleId.trim());
    setManualBaleId("");
  };

  const handleConfirmBeneficiamento = () => {
    if (!scannedBale || !user?.id) return;

    updateStatus.mutate(
      {
        id: scannedBale.id,
        status: "beneficiado",
        userId: String(user.id),
      },
      {
        onSuccess: () => {
          setScannedBale(null);
        },
      }
    );
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
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-cyan/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-cyan/15 via-transparent to-transparent" />

          {/* Animated dots pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
            <div className="absolute top-12 right-20 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-8 right-12 h-1 w-1 rounded-full bg-neon-cyan animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Brand and title */}
              <div className="flex items-start gap-4">
                {/* Cotton Logo */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-cyan/80 flex items-center justify-center shadow-glow-cyan overflow-hidden">
                    <img src={logoFavicon} alt="Cotton" className="h-12 w-12 object-contain" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <Factory className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-neon-cyan" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Cotton App
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
                    <span className="bg-gradient-to-r from-neon-cyan to-primary bg-clip-text text-transparent">
                      Algodoeira
                    </span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-cyan/20 text-neon-cyan">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mr-1.5 animate-pulse" />
                      {user?.username || "Operador"}
                    </span>
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
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 rounded-xl bg-surface p-1">
            <TabsTrigger
              value="beneficiamento"
              className="rounded-lg data-[state=active]:bg-neon-cyan data-[state=active]:text-black font-semibold text-xs sm:text-sm"
            >
              <Factory className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Beneficiamento</span>
              <span className="sm:hidden">Benef.</span>
            </TabsTrigger>
            <TabsTrigger
              value="carregamentos"
              className="rounded-lg data-[state=active]:bg-neon-orange data-[state=active]:text-black font-semibold text-xs sm:text-sm"
            >
              <Truck className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Carregamentos</span>
              <span className="sm:hidden">Carreg.</span>
            </TabsTrigger>
            <TabsTrigger
              value="pluma"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-black font-semibold text-xs sm:text-sm"
            >
              <Wheat className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Pluma</span>
              <span className="sm:hidden">Pluma</span>
            </TabsTrigger>
            <TabsTrigger
              value="fardinhos"
              className="rounded-lg data-[state=active]:bg-neon-cyan data-[state=active]:text-black font-semibold text-xs sm:text-sm"
            >
              <Package className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Fardinhos</span>
              <span className="sm:hidden">Fard.</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Beneficiamento */}
          <TabsContent value="beneficiamento" className="mt-6 space-y-6">
            {!scannedBale ? (
              /* Scanner Card */
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-5 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 via-neon-cyan/10 to-transparent" />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                      <Factory className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Escanear Fardo</h2>
                      <p className="text-sm text-muted-foreground">
                        Pátio → Beneficiado via QR ou ID
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Status flow indicator */}
                  <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-surface/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-neon-orange/20">
                        <Truck className="w-4 h-4 text-neon-orange" />
                      </div>
                      <span className="text-sm font-semibold text-neon-orange">
                        Pátio
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neon-cyan animate-pulse" />
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-neon-cyan/20">
                        <CheckCircle2 className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <span className="text-sm font-semibold text-neon-cyan">
                        Beneficiado
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={() => setShowScanner(true)}
                      className="w-full h-14 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-black font-semibold text-base shadow-glow-cyan"
                      data-testid="button-scan-qr"
                    >
                      <ScanLine className="w-5 h-5 mr-2" />
                      Escanear QR Code
                    </Button>

                    <Button
                      onClick={() => setShowManualInput(true)}
                      variant="outline"
                      className="w-full h-14 rounded-xl text-base font-semibold border-border/50 hover:border-neon-cyan/50 hover:text-neon-cyan"
                      data-testid="button-manual-input"
                    >
                      <Keyboard className="w-5 h-5 mr-2" />
                      Digitar Manualmente
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
                    <div className="flex gap-3 items-start">
                      <Factory className="h-5 w-5 shrink-0 text-neon-cyan mt-0.5" />
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        <strong className="text-neon-cyan">
                          Pátio → Beneficiado:
                        </strong>{" "}
                        escaneie o QR Code ou digite manualmente o ID. Apenas fardos
                        com status "Pátio" podem ser processados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Confirmation Card */
              <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
                <div className="relative p-5 border-b border-border/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 via-neon-cyan/10 to-transparent" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                        <Factory className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          Confirmar Beneficiamento
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Revise e confirme para marcar como beneficiado
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 rounded-full">
                      Pátio → Beneficiado
                    </Badge>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Status atual */}
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Status Atual:
                    </span>
                    <StatusBadge status={scannedBale.status} />
                  </div>

                  {/* Dados do fardo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-surface border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                        <Hash className="w-3.5 h-3.5" />
                        Número
                      </p>
                      <p
                        className="font-bold text-xl text-foreground"
                        data-testid="text-bale-numero"
                      >
                        {scannedBale.numero}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface border border-border/30">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                        <Wheat className="w-3.5 h-3.5" />
                        Talhão
                      </p>
                      <p
                        className="font-bold text-xl text-foreground"
                        data-testid="text-bale-talhao"
                      >
                        {scannedBale.talhao}
                      </p>
                    </div>
                  </div>

                  {/* QR Code / ID */}
                  <div className="flex items-start gap-3 p-4 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-neon-cyan">
                        QR Code / ID
                      </p>
                      <p className="text-xs font-mono text-muted-foreground break-all leading-snug">
                        {scannedBale.id}
                      </p>
                    </div>
                  </div>

                  {/* Alerta */}
                  <Alert className="border border-amber-500/30 bg-amber-500/10 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <AlertDescription className="text-sm text-foreground/80">
                      <strong className="font-bold text-amber-400">
                        Confirmação final:
                      </strong>{" "}
                      Ao confirmar, o fardo será marcado como "Beneficiado". Esta é
                      a etapa final do processamento.
                    </AlertDescription>
                  </Alert>

                  {/* Botões de ação */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setScannedBale(null)}
                      className="flex-1 h-12 rounded-xl border-border/50 font-semibold"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmBeneficiamento}
                      disabled={updateStatus.isPending}
                      className="flex-1 h-12 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-black font-bold shadow-glow-cyan"
                      data-testid="button-confirm-beneficiamento"
                    >
                      {updateStatus.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-cyan" />
                Instruções
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                <li>Escaneie o QR Code do fardo a ser beneficiado</li>
                <li>Verifique os dados do fardo exibidos</li>
                <li>Clique em "Confirmar" para finalizar o processamento</li>
              </ol>
            </div>
          </TabsContent>

          {/* Tab: Carregamentos */}
          <TabsContent value="carregamentos" className="mt-6 space-y-6">
            {/* Formulário de novo carregamento */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-orange/20 via-neon-orange/10 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-neon-orange/20">
                    <Truck className="w-5 h-5 text-neon-orange" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Novo Carregamento</h2>
                    <p className="text-sm text-muted-foreground">
                      Registre o peso de cada carregamento do caminhão
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Seleção de Safra e Talhão */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">
                      Safra
                    </label>
                    <div className="h-12 rounded-xl bg-surface border border-border/50 flex items-center px-3">
                      <span className="text-sm font-medium">
                        {safraAtiva ? `Safra ${safraAtiva.nome}` : "Nenhuma safra configurada"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">
                      Talhão
                    </label>
                    <Select value={carregamentoTalhao} onValueChange={setCarregamentoTalhao}>
                      <SelectTrigger className="h-12 rounded-xl bg-surface border-border/50">
                        <SelectValue placeholder={talhoesSafra.length > 0 ? "Selecione o talhão" : "Nenhum talhão configurado"} />
                      </SelectTrigger>
                      <SelectContent>
                        {talhoesSafra.map((t) => (
                          <SelectItem key={t.nome} value={t.nome}>
                            {t.nome} - {t.hectares} ha
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Peso do carregamento */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Peso do Carregamento (KG)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 25000"
                    value={carregamentoPeso}
                    onChange={(e) => setCarregamentoPeso(e.target.value)}
                    className="h-12 rounded-xl bg-surface border-border/50 text-lg font-mono"
                  />
                </div>

                {/* Observação opcional */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Observação (opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Caminhão placa ABC-1234"
                    value={carregamentoObs}
                    onChange={(e) => setCarregamentoObs(e.target.value)}
                    className="h-12 rounded-xl bg-surface border-border/50"
                  />
                </div>

                {/* Botão adicionar */}
                <Button
                  onClick={handleCreateCarregamento}
                  disabled={createCarregamentoMutation.isPending || !carregamentoTalhao || !carregamentoPeso}
                  className="w-full h-14 rounded-xl bg-neon-orange hover:bg-neon-orange/90 text-black font-bold text-base"
                >
                  {createCarregamentoMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Registrar Carregamento
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Lista de carregamentos recentes */}
            {(carregamentos ?? []).length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-5 border-b border-border/30">
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-neon-orange/20">
                        <Package className="w-5 h-5 text-neon-orange" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Carregamentos Recentes</h2>
                        <p className="text-sm text-muted-foreground">
                          Safra {selectedSafra} - {(carregamentos ?? []).length} carregamentos
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30">
                      {(carregamentos ?? []).reduce((acc, c) => acc + parseFloat(c.pesoKg), 0).toLocaleString("pt-BR")} KG
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(carregamentos ?? []).slice().reverse().map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-neon-orange">{c.talhao}</span>
                          <span className="text-sm font-mono">
                            {parseFloat(c.pesoKg).toLocaleString("pt-BR")} KG
                          </span>
                          {c.observacao && (
                            <span className="text-xs text-muted-foreground truncate max-w-32">
                              {c.observacao}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.dataCarregamento).toLocaleDateString("pt-BR")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCarregamentoMutation.mutate(c.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-orange" />
                Instruções
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                <li>Selecione a safra e o talhão de origem</li>
                <li>Informe o peso do carregamento em KG</li>
                <li>Opcionalmente adicione uma observação</li>
                <li>Clique em "Registrar" para salvar</li>
                <li>O peso total será somado automaticamente na aba Rendimento</li>
              </ol>
            </div>
          </TabsContent>

          {/* Tab: Pluma (Lotes de peso da pluma) */}
          <TabsContent value="pluma" className="mt-6 space-y-6">
            {/* KPIs de pluma/rendimento */}
            {pesoBrutoTotalSafra > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Peso Bruto</span>
                  </div>
                  <p className="text-lg font-bold font-mono">
                    {pesoBrutoTotalSafra.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground">KG (carregamentos)</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Wheat className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Peso Pluma</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-primary">
                    {totaisLotes.totalPesoPluma.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">KG ({totaisLotes.qtdLotes} lotes)</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-neon-cyan" />
                    <span className="text-xs text-muted-foreground">Rendimento</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-neon-cyan">
                    {totaisLotes.rendimentoGeral.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                  </p>
                  <p className="text-xs text-muted-foreground">Pluma / Bruto</p>
                </div>
              </div>
            )}

            {/* Formulário de novo lote (apenas peso da pluma) */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/20">
                    <Wheat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Registrar Peso da Pluma</h2>
                    <p className="text-sm text-muted-foreground">
                      Informe o peso da pluma processada (gera lote automático)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Seleção de Safra */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Safra
                  </label>
                  <div className="h-12 rounded-xl bg-surface border border-border/50 flex items-center px-3">
                    <span className="text-sm font-medium">
                      {safraAtiva ? `Safra ${safraAtiva.nome}` : "Nenhuma safra configurada"}
                    </span>
                  </div>
                </div>

                {/* Peso bruto da safra (somente leitura) */}
                <div className="p-4 rounded-xl bg-surface border border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">Peso Bruto Total da Safra</span>
                    </div>
                    <span className="text-xl font-bold font-mono">
                      {pesoBrutoTotalSafra.toLocaleString("pt-BR")} KG
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma de todos os carregamentos da safra {selectedSafra}
                  </p>
                </div>

                {pesoBrutoTotalSafra === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Nenhum carregamento registrado ainda.
                    </p>
                    <p className="text-xs mt-1">
                      Registre carregamentos na aba anterior para calcular o rendimento.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Input de peso da pluma */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Wheat className="w-4 h-4" />
                        Peso da Pluma (KG)
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: 10500"
                        value={lotePesoPluma}
                        onChange={(e) => setLotePesoPluma(e.target.value)}
                        className="h-12 rounded-xl bg-surface border-border/50 text-lg font-mono"
                      />
                    </div>

                    {/* Observação opcional */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">
                        Observação (opcional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: Processamento turno manhã"
                        value={loteObs}
                        onChange={(e) => setLoteObs(e.target.value)}
                        className="h-12 rounded-xl bg-surface border-border/50"
                      />
                    </div>

                    {/* Preview do rendimento */}
                    {lotePesoPluma && (
                      <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-neon-cyan" />
                            <span className="text-sm font-semibold text-neon-cyan">Rendimento deste lote</span>
                          </div>
                          <p className="text-xl font-bold font-mono text-neon-cyan">
                            {((parseFloat(lotePesoPluma.replace(",", ".")) / pesoBrutoTotalSafra) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botão registrar */}
                    <Button
                      onClick={handleCreateLote}
                      disabled={createLoteMutation.isPending || !lotePesoPluma}
                      className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-base shadow-glow-sm"
                    >
                      {createLoteMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 mr-2" />
                          Registrar Lote de Pluma
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Lista de lotes registrados */}
            {(lotes ?? []).length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-5 border-b border-border/30">
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/20">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Lotes Registrados</h2>
                        <p className="text-sm text-muted-foreground">
                          Safra {selectedSafra} - {(lotes ?? []).length} lotes
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {totaisLotes.totalPesoPluma.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KG
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(lotes ?? []).map((lote) => {
                      const pesoPluma = parseFloat(lote.pesoPluma);
                      const rendimento = pesoBrutoTotalSafra > 0 ? (pesoPluma / pesoBrutoTotalSafra) * 100 : 0;
                      const isEditing = editingLoteId === lote.id;

                      if (isEditing) {
                        return (
                          <div
                            key={lote.id}
                            className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">#{lote.numeroLote}</span>
                              <span className="text-xs text-muted-foreground">Editando</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="text"
                                placeholder="Peso (KG)"
                                value={editingLotePesoPluma}
                                onChange={(e) => setEditingLotePesoPluma(e.target.value)}
                                className="h-10 rounded-lg bg-surface border-border/50 font-mono"
                              />
                              <Input
                                type="text"
                                placeholder="Observação"
                                value={editingLoteObs}
                                onChange={(e) => setEditingLoteObs(e.target.value)}
                                className="h-10 rounded-lg bg-surface border-border/50"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveLote}
                                disabled={updateLoteMutation.isPending}
                                className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-black font-semibold"
                              >
                                {updateLoteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Salvar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditLote}
                                className="h-9 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={lote.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/30"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">#{lote.numeroLote}</span>
                            <span className="text-sm font-mono">
                              {pesoPluma.toLocaleString("pt-BR")} KG
                            </span>
                            {lote.observacao && (
                              <span className="text-xs text-muted-foreground truncate max-w-24">
                                {lote.observacao}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
                              {rendimento.toFixed(2)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(lote.dataProcessamento).toLocaleDateString("pt-BR")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLote(lote)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLoteMutation.mutate(lote.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Como funciona
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                <li>O Peso Bruto Total é a soma de todos os carregamentos da safra</li>
                <li>Informe o Peso da Pluma (kg) processada</li>
                <li>Um lote será criado automaticamente com número sequencial</li>
                <li>O Rendimento % é calculado: (Peso Pluma ÷ Peso Bruto) × 100</li>
              </ol>
            </div>
          </TabsContent>

          {/* Tab: Fardinhos (registro separado) */}
          <TabsContent value="fardinhos" className="mt-6 space-y-6">
            {/* KPIs de fardinhos */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-neon-cyan" />
                  <span className="text-xs text-muted-foreground">Total Fardinhos</span>
                </div>
                <p className="text-lg font-bold font-mono text-neon-cyan">
                  {totaisLotes.totalFardinhos.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">unidades</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Wheat className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Peso Pluma</span>
                </div>
                <p className="text-lg font-bold font-mono text-primary">
                  {totaisLotes.totalPesoPluma.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">KG total</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-neon-orange" />
                  <span className="text-xs text-muted-foreground">Peso Médio</span>
                </div>
                <p className="text-lg font-bold font-mono text-neon-orange">
                  {totaisLotes.pesoMedioFardinho.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </p>
                <p className="text-xs text-muted-foreground">KG/fardinho</p>
              </div>
            </div>

            {/* Formulário de registro de fardinhos */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative p-5 border-b border-border/30">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 via-neon-cyan/10 to-transparent" />
                <div className="relative flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                    <Package className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Registrar Fardinhos</h2>
                    <p className="text-sm text-muted-foreground">
                      Informe a quantidade de fardinhos produzidos
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Seleção de Safra */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Safra
                  </label>
                  <div className="h-12 rounded-xl bg-surface border border-border/50 flex items-center px-3">
                    <span className="text-sm font-medium">
                      {safraAtiva ? `Safra ${safraAtiva.nome}` : "Nenhuma safra configurada"}
                    </span>
                  </div>
                </div>

                {/* Input de quantidade de fardinhos */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Quantidade de Fardinhos
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex: 50"
                    value={fardinhoQtd}
                    onChange={(e) => setFardinhoQtd(e.target.value)}
                    className="h-12 rounded-xl bg-surface border-border/50 text-lg font-mono"
                  />
                </div>

                {/* Observação opcional */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Observação (opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Produção turno manhã"
                    value={fardinhoObs}
                    onChange={(e) => setFardinhoObs(e.target.value)}
                    className="h-12 rounded-xl bg-surface border-border/50"
                  />
                </div>

                {/* Preview do peso médio */}
                {fardinhoQtd && totaisLotes.totalPesoPluma > 0 && (
                  <div className="p-4 rounded-xl bg-neon-orange/10 border border-neon-orange/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-neon-orange" />
                        <span className="text-sm font-semibold text-neon-orange">Peso Médio após registro</span>
                      </div>
                      <p className="text-xl font-bold font-mono text-neon-orange">
                        {(totaisLotes.totalPesoPluma / (totaisLotes.totalFardinhos + parseInt(fardinhoQtd || "0"))).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KG
                      </p>
                    </div>
                  </div>
                )}

                {/* Botão registrar */}
                <Button
                  onClick={handleCreateFardinho}
                  disabled={createFardinhoMutation.isPending || !fardinhoQtd}
                  className="w-full h-14 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-black font-bold text-base shadow-glow-cyan"
                >
                  {createFardinhoMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Registrar Fardinhos
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Lista de registros de fardinhos */}
            {(fardinhos ?? []).length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative p-5 border-b border-border/30">
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                        <CheckCircle2 className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Registros de Fardinhos</h2>
                        <p className="text-sm text-muted-foreground">
                          Safra {selectedSafra} - {(fardinhos ?? []).length} registros
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30">
                      {totaisLotes.totalFardinhos} total
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(fardinhos ?? []).map((fardinho) => {
                      const isEditing = editingFardinhoId === fardinho.id;

                      if (isEditing) {
                        return (
                          <div
                            key={fardinho.id}
                            className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-5 h-5 text-neon-cyan" />
                              <span className="text-xs text-muted-foreground">Editando</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Quantidade"
                                value={editingFardinhoQtd}
                                onChange={(e) => setEditingFardinhoQtd(e.target.value)}
                                className="h-10 rounded-lg bg-surface border-border/50 font-mono"
                              />
                              <Input
                                type="text"
                                placeholder="Observação"
                                value={editingFardinhoObs}
                                onChange={(e) => setEditingFardinhoObs(e.target.value)}
                                className="h-10 rounded-lg bg-surface border-border/50"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveFardinho}
                                disabled={updateFardinhoMutation.isPending}
                                className="flex-1 h-9 rounded-lg bg-neon-cyan hover:bg-neon-cyan/90 text-black font-semibold"
                              >
                                {updateFardinhoMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Salvar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditFardinho}
                                className="h-9 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={fardinho.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/30"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-neon-cyan" />
                            <span className="text-sm font-mono font-bold">
                              {fardinho.quantidade} fardinhos
                            </span>
                            {fardinho.observacao && (
                              <span className="text-xs text-muted-foreground truncate max-w-32">
                                {fardinho.observacao}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(fardinho.dataRegistro).toLocaleDateString("pt-BR")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFardinho(fardinho)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFardinhoMutation.mutate(fardinho.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-cyan" />
                Como funciona
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                <li>Registre a quantidade de fardinhos produzidos</li>
                <li>O total é somado de todos os registros</li>
                <li>O Peso Médio é calculado: Total Peso Pluma ÷ Total Fardinhos</li>
                <li>Registre na aba "Pluma" para ter o peso médio calculado</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </PageContent>

      {/* QR Scanner */}
      {showScanner && (
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-border/50 bg-card">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neon-cyan/20">
                  <ScanLine className="w-5 h-5 text-neon-cyan" />
                </div>
                Escanear QR Code
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Aponte a câmera para o QR Code do fardo
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <QRScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/50 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neon-cyan/20">
                <Keyboard className="w-5 h-5 text-neon-cyan" />
              </div>
              Digitar ID do Fardo
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Digite o ID completo do fardo para beneficiamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Ex: S25/26-T1B-00001"
              value={manualBaleId}
              onChange={(e) => setManualBaleId(e.target.value)}
              className="h-12 rounded-xl bg-surface border-border/50 font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualSubmit();
                }
              }}
              autoFocus
              data-testid="input-manual-bale-id"
            />
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowManualInput(false);
                setManualBaleId("");
              }}
              className="flex-1 h-11 rounded-xl border-border/50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleManualSubmit}
              className="flex-1 h-11 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-black font-semibold"
              data-testid="button-submit-manual"
            >
              Buscar Fardo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
