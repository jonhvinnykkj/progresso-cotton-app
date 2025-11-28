import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  UserPlus,
  Users,
  Edit,
  ArrowLeft,
  Sparkles,
  Shield,
  Loader2,
  User,
  Lock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthHeaders } from "@/lib/api-client";
import { API_URL } from "@/lib/api-config";
import { Page, PageContent } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import logoFavicon from "/favicon.png";

type UserRole = "admin" | "campo" | "transporte" | "algodoeira";

interface User {
  id: string;
  username: string;
  displayName: string;
  roles: string;
  createdAt: string;
  createdBy?: string;
}

export default function UserManagement() {
  const { user, selectedRole } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["campo"]);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);

  const toggleRole = (roleToToggle: UserRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleToToggle)) {
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== roleToToggle);
      } else {
        return [...prev, roleToToggle];
      }
    });
  };

  const toggleEditRole = (roleToToggle: UserRole) => {
    setEditRoles((prev) => {
      if (prev.includes(roleToToggle)) {
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== roleToToggle);
      } else {
        return [...prev, roleToToggle];
      }
    });
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    try {
      const roles = JSON.parse(user.roles) as UserRole[];
      setEditRoles(roles);
    } catch {
      setEditRoles(["campo"]);
    }
  };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const url = API_URL ? `${API_URL}/api/users` : "/api/users";
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar usuários");
      }
      return response.json();
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      displayName: string;
      password: string;
      role: UserRole;
      roles: UserRole[];
    }) => {
      const url = API_URL ? `${API_URL}/api/users` : "/api/users";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao criar usuário");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        variant: "success",
        title: "Usuário criado!",
        description: `Usuário ${displayName} foi criado com sucesso.`,
      });
      setUsername("");
      setDisplayName("");
      setPassword("");
      setSelectedRoles(["campo"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: UserRole[] }) => {
      const url = API_URL
        ? `${API_URL}/api/users/${userId}/roles`
        : `/api/users/${userId}/roles`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ roles }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao atualizar papéis");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        variant: "success",
        title: "Papéis atualizados!",
        description: "Os papéis do usuário foram atualizados com sucesso.",
      });
      setUserToEdit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar papéis",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const url = API_URL ? `${API_URL}/api/users/${userId}` : `/api/users/${userId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao deletar usuário");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        variant: "success",
        title: "Usuário removido!",
        description: "O usuário foi removido do sistema.",
      });
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName || !password || selectedRoles.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione pelo menos um papel.",
        variant: "destructive",
      });
      return;
    }
    const mainRole = selectedRoles[0];
    createUserMutation.mutate({
      username,
      displayName,
      password,
      role: mainRole,
      roles: selectedRoles,
    });
  };

  const getRoleBadge = (role: UserRole | "superadmin") => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      superadmin: {
        label: "Super Admin",
        className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      },
      admin: {
        label: "Administrador",
        className: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
      },
      campo: {
        label: "Campo",
        className: "bg-primary/20 text-primary border-primary/30",
      },
      transporte: {
        label: "Transporte",
        className: "bg-neon-orange/20 text-neon-orange border-neon-orange/30",
      },
      algodoeira: {
        label: "Algodoeira",
        className: "bg-accent/20 text-accent border-accent/30",
      },
    };

    const config = roleConfig[role] || { label: role, className: "bg-surface" };

    return (
      <Badge className={cn("font-semibold border", config.className)}>{config.label}</Badge>
    );
  };

  const getRolesBadges = (rolesJson: string) => {
    try {
      const roles = JSON.parse(rolesJson) as UserRole[];
      return (
        <div className="flex gap-1 flex-wrap">
          {roles.map((role) => (
            <span key={role}>{getRoleBadge(role)}</span>
          ))}
        </div>
      );
    } catch {
      return <Badge className="bg-surface">Erro</Badge>;
    }
  };

  if (selectedRole !== "superadmin") {
    return (
      <Page>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-card p-8 rounded-2xl text-center max-w-md">
            <div className="p-4 rounded-2xl bg-destructive/20 mb-4 inline-block">
              <Shield className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Apenas Super Administradores podem acessar esta página.
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full h-12 rounded-xl btn-neon"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageContent className="max-w-6xl space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl glass-card p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-primary/5" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <img src={logoFavicon} alt="Cotton" className="h-10 w-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-neon-cyan flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">
                    <span className="gradient-text">Gerenciamento de Usuários</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Controle completo de acessos e permissões
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

        {/* Create User Form */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Criar Novo Usuário</h2>
                <p className="text-sm text-muted-foreground">
                  Adicione um novo usuário ao sistema com permissões específicas
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-primary" />
                  Nome de Usuário (Login)
                </Label>
                <Input
                  placeholder="Ex: joao.silva"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                  className="h-11 rounded-xl bg-surface border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-neon-orange" />
                  Nome de Exibição
                </Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  minLength={3}
                  required
                  className="h-11 rounded-xl bg-surface border-border/50 focus:border-neon-orange"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-neon-cyan" />
                  Senha
                </Label>
                <Input
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                  required
                  className="h-11 rounded-xl bg-surface border-border/50 focus:border-neon-cyan"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Papéis de Acesso (selecione um ou mais)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "admin" as UserRole, label: "Administrador", color: "neon-cyan" },
                  { value: "campo" as UserRole, label: "Campo", color: "primary" },
                  { value: "transporte" as UserRole, label: "Transporte", color: "neon-orange" },
                  { value: "algodoeira" as UserRole, label: "Algodoeira", color: "accent" },
                ].map((role) => (
                  <div
                    key={role.value}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      selectedRoles.includes(role.value)
                        ? `border-${role.color}/50 bg-${role.color}/10`
                        : "border-border/30 bg-surface hover:border-primary/30"
                    )}
                    onClick={() => toggleRole(role.value)}
                  >
                    <div className={cn(
                      "h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors",
                      selectedRoles.includes(role.value)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-primary"
                    )}>
                      {selectedRoles.includes(role.value) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-sm font-semibold">{role.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="h-12 rounded-xl btn-neon font-semibold px-8"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Users List */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative p-5 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-neon-cyan/5 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neon-cyan/20">
                  <Users className="w-5 h-5 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Usuários do Sistema</h2>
                  <p className="text-sm text-muted-foreground">
                    {users.length} usuário(s) cadastrado(s)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="glass-card rounded-xl p-4 border border-border/30 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{u.displayName}</h3>
                          <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-4">
                        {getRolesBadges(u.roles)}
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </div>

                      {u.id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(u)}
                            className="rounded-lg hover:bg-primary/10 text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUserToDelete(u)}
                            className="rounded-lg hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="sm:hidden mt-3 pt-3 border-t border-border/30">
                      {getRolesBadges(u.roles)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
          <DialogContent className="rounded-2xl glass-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2.5 rounded-xl bg-primary/20">
                  <Edit className="h-5 w-5 text-primary" />
                </div>
                Editar Papéis do Usuário
              </DialogTitle>
              <DialogDescription>
                Altere os papéis de acesso de <strong>{userToEdit?.displayName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Papéis de Acesso (selecione um ou mais)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "admin" as UserRole, label: "Administrador" },
                    { value: "campo" as UserRole, label: "Campo" },
                    { value: "transporte" as UserRole, label: "Transporte" },
                    { value: "algodoeira" as UserRole, label: "Algodoeira" },
                  ].map((role) => (
                    <div
                      key={role.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        editRoles.includes(role.value)
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-surface hover:border-primary/30"
                      )}
                      onClick={() => toggleEditRole(role.value)}
                    >
                      <div className={cn(
                        "h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors",
                        editRoles.includes(role.value)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-primary"
                      )}>
                        {editRoles.includes(role.value) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm font-semibold">{role.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setUserToEdit(null)}
                  className="h-11 rounded-xl border-border/50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    userToEdit && updateUserMutation.mutate({ userId: userToEdit.id, roles: editRoles })
                  }
                  disabled={updateUserMutation.isPending || editRoles.length === 0}
                  className="h-11 rounded-xl btn-neon font-semibold"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent className="rounded-2xl glass-card border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2.5 rounded-xl bg-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 pt-2">
                <p>
                  Tem certeza que deseja remover o usuário{" "}
                  <strong className="text-foreground">{userToDelete?.displayName}</strong>?
                </p>
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <p className="text-destructive font-semibold text-sm">
                    Esta ação não pode ser desfeita e todos os dados do usuário serão
                    permanentemente removidos.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="h-11 rounded-xl border-border/50">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                className="h-11 rounded-xl bg-destructive hover:bg-destructive/90"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  "Remover Usuário"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContent>
    </Page>
  );
}
