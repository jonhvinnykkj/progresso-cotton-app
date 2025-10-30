import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Users, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuthHeaders } from "@/lib/api-client";
import { NavSidebar, useSidebar } from "@/components/nav-sidebar";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";

type UserRole = "admin" | "campo" | "transporte" | "algodoeira";

interface User {
  id: string;
  username: string;
  displayName: string;
  roles: string; // JSON array de papéis
  createdAt: string;
  createdBy?: string;
}

export default function UserManagement() {
  const { user, selectedRole } = useAuth();
  const { collapsed } = useSidebar();
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
    setSelectedRoles(prev => {
      if (prev.includes(roleToToggle)) {
        // Não permitir desmarcar se for o último
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== roleToToggle);
      } else {
        return [...prev, roleToToggle];
      }
    });
  };

  const toggleEditRole = (roleToToggle: UserRole) => {
    setEditRoles(prev => {
      if (prev.includes(roleToToggle)) {
        // Não permitir desmarcar se for o último
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== roleToToggle);
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

  // Verificar se é superadmin
  if (selectedRole !== "superadmin") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas Super Administradores podem acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Buscar todos os usuários
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao buscar usuários");
      }
      return response.json();
    },
  });

  // Criar usuário
  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; displayName: string; password: string; role: UserRole; roles: UserRole[] }) => {
      const response = await fetch("/api/users", {
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
      // Limpar formulário
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

  // Atualizar papéis do usuário
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: UserRole[] }) => {
      const response = await fetch(`/api/users/${userId}/roles`, {
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

  // Deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
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
    // Usar o primeiro papel selecionado como papel principal
    const mainRole = selectedRoles[0];
    createUserMutation.mutate({ 
      username, 
      displayName, 
      password, 
      role: mainRole,
      roles: selectedRoles 
    });
  };

  const getRoleBadge = (role: UserRole | "superadmin") => {
    const roleColors: Record<string, string> = {
      superadmin: "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0",
      admin: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0",
      campo: "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0",
      transporte: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0",
      algodoeira: "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0",
    };
    
    const roleLabels: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Administrador",
      campo: "Campo",
      transporte: "Transporte",
      algodoeira: "Algodoeira",
    };
    
    return (
      <Badge className={`${roleColors[role] || "bg-gray-500"} font-semibold`}>
        {roleLabels[role] || role}
      </Badge>
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
      return <Badge className="bg-gray-500">Erro</Badge>;
    }
  };

  return (
    <>
      <NavSidebar />
      <div className={cn("min-h-screen bg-gradient-to-br from-background via-muted/10 to-background transition-all duration-300", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        <main className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <header className="mobile-header bg-background/95 backdrop-blur-md border-b shadow-sm lg:sticky top-0 z-50 -mx-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                Gerenciamento de Usuários
              </h1>
              <p className="text-sm text-muted-foreground">
                Controle completo de acessos e permissões
              </p>
            </div>
          </div>
        </header>

        {/* Formulário de Criação */}
        <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            <CardTitle className="flex items-center gap-2 relative">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <UserPlus className="h-5 w-5" />
              </div>
              Criar Novo Usuário
            </CardTitle>
            <CardDescription className="text-white/90 relative">
              Adicione um novo usuário ao sistema com permissões específicas
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-semibold">Nome de Usuário (Login)</Label>
                <Input
                  id="username"
                  placeholder="Ex: joao.silva"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                  className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-semibold">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  placeholder="Ex: João Silva"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  minLength={3}
                  required
                  className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                  required
                  className="h-12 rounded-xl border-2 hover:border-primary/50 transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="font-bold text-base">Papéis de Acesso (selecione um ou mais)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "admin" as UserRole, label: "Administrador", color: "from-blue-500 to-blue-600" },
                  { value: "campo" as UserRole, label: "Campo", color: "from-green-500 to-emerald-500" },
                  { value: "transporte" as UserRole, label: "Transporte", color: "from-yellow-500 to-yellow-600" },
                  { value: "algodoeira" as UserRole, label: "Algodoeira", color: "from-orange-500 to-orange-600" }
                ].map(role => (
                  <div 
                    key={role.value} 
                    className={`flex items-center space-x-2 border-2 rounded-xl p-3 transition-all cursor-pointer ${
                      selectedRoles.includes(role.value) 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-muted hover:border-primary/30 hover:bg-accent'
                    }`}
                  >
                    <Checkbox 
                      id={role.value}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <Label 
                      htmlFor={role.value} 
                      className="cursor-pointer flex-1 font-semibold"
                    >
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={createUserMutation.isPending}
              className="h-13 rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold text-base px-8"
            >
              {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card className="shadow-xl border-2 rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="bg-gradient-to-r from-green-600 to-yellow-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          </div>
          <CardTitle className="flex items-center gap-2 relative">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            Usuários do Sistema
          </CardTitle>
          <CardDescription className="text-white/90 relative font-medium">
            {users.length} usuário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12 font-semibold">Carregando usuários...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 font-semibold">Nenhum usuário encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="font-bold">Nome de Exibição</TableHead>
                    <TableHead className="font-bold">Login</TableHead>
                    <TableHead className="font-bold">Tipo</TableHead>
                    <TableHead className="font-bold">Criado em</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold">{u.displayName}</TableCell>
                      <TableCell className="text-muted-foreground font-medium">{u.username}</TableCell>
                      <TableCell>{getRolesBadges(u.roles)}</TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.id !== user?.id && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(u)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(u)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição de Papéis */}
      {/* Dialog de Edição */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent className="rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Edit className="h-5 w-5 text-green-600" />
              </div>
              Editar Papéis do Usuário
            </DialogTitle>
            <DialogDescription className="font-medium">
              Altere os papéis de acesso de <strong>{userToEdit?.displayName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="font-bold text-base">Papéis de Acesso (selecione um ou mais)</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "admin" as UserRole, label: "Administrador" },
                  { value: "campo" as UserRole, label: "Campo" },
                  { value: "transporte" as UserRole, label: "Transporte" },
                  { value: "algodoeira" as UserRole, label: "Algodoeira" }
                ].map(role => (
                  <div 
                    key={role.value} 
                    className={`flex items-center space-x-2 border-2 rounded-xl p-3 transition-all cursor-pointer ${
                      editRoles.includes(role.value) 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-muted hover:border-primary/30 hover:bg-accent'
                    }`}
                  >
                    <Checkbox 
                      id={`edit-${role.value}`}
                      checked={editRoles.includes(role.value)}
                      onCheckedChange={() => toggleEditRole(role.value)}
                    />
                    <Label 
                      htmlFor={`edit-${role.value}`} 
                      className="cursor-pointer flex-1 font-semibold"
                    >
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setUserToEdit(null)}
                className="h-11 rounded-xl border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => userToEdit && updateUserMutation.mutate({ userId: userToEdit.id, roles: editRoles })}
                disabled={updateUserMutation.isPending || editRoles.length === 0}
                className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold"
              >
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium">
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.displayName}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl border-2">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-bold"
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
      </div>
    </>
  );
}
