import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  type LoginCredentials,
  type UserRole,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api-config";
import {
  ShieldCheck,
  User,
  Package,
  Truck,
  Factory,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";
import fazendaBg from "/fazenda.jpeg";

const roles: {
  value: UserRole;
  label: string;
  icon: typeof User;
  description: string;
  color: string;
}[] = [
  {
    value: "superadmin",
    label: "Super Admin",
    icon: ShieldCheck,
    description: "Acesso total ao sistema",
    color: "#8B5CF6",
  },
  {
    value: "admin",
    label: "Administrador",
    icon: ShieldCheck,
    description: "Gerenciamento completo",
    color: "#3B82F6",
  },
  {
    value: "campo",
    label: "Campo",
    icon: Package,
    description: "Cadastro e gestão de fardos",
    color: "#22C55E",
  },
  {
    value: "transporte",
    label: "Transporte",
    icon: Truck,
    description: "Movimentação de cargas",
    color: "#F97316",
  },
  {
    value: "algodoeira",
    label: "Algodoeira",
    icon: Factory,
    description: "Beneficiamento de algodão",
    color: "#06B6D4",
  },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, selectedRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const { theme, toggleTheme } = useTheme();

  // Check and clear cache if app version changed
  useEffect(() => {
    const APP_VERSION = "v4-superadmin";
    const storedVersion = localStorage.getItem("app_version");

    if (storedVersion && storedVersion !== APP_VERSION) {
      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => caches.delete(cacheName));
        });
      }
      localStorage.setItem("app_version", APP_VERSION);
    } else if (!storedVersion) {
      localStorage.setItem("app_version", APP_VERSION);
    }
  }, []);

  // Redirect authenticated users to their role-specific page
  useEffect(() => {
    if (isAuthenticated && selectedRole) {
      switch (selectedRole) {
        case "superadmin":
        case "admin":
          setLocation("/dashboard");
          break;
        case "campo":
          setLocation("/campo");
          break;
        case "transporte":
          setLocation("/transporte");
          break;
        case "algodoeira":
          setLocation("/algodoeira");
          break;
        default:
          setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, selectedRole, setLocation]);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    try {
      const url = API_URL ? `${API_URL}/api/auth/login` : "/api/auth/login";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas");
      }

      const userData = await response.json();

      if (userData.availableRoles && userData.availableRoles.length > 0) {
        setPendingUser(userData);
        setAvailableRoles(userData.availableRoles);
        setSelectedRoleIndex(0);
        setShowRoleSelector(true);
        setIsLoading(false);
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário sem papéis definidos. Contate o administrador.",
      });
      setIsLoading(false);
    } catch (error) {
      let errorMessage = "Verifique suas credenciais e tente novamente.";

      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (userData: any, role: UserRole) => {
    const { accessToken, refreshToken, ...user } = userData;

    login(user, accessToken, refreshToken, role);

    toast({
      variant: "default",
      title: "Login realizado com sucesso",
      description: `Bem-vindo, ${user.displayName || roles.find((r) => r.value === role)?.label}!`,
    });

    switch (role) {
      case "superadmin":
      case "admin":
        setLocation("/dashboard");
        break;
      case "campo":
        setLocation("/campo");
        break;
      case "transporte":
        setLocation("/transporte");
        break;
      case "algodoeira":
        setLocation("/algodoeira");
        break;
      default:
        setLocation("/dashboard");
    }
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    if (pendingUser) {
      completeLogin(pendingUser, selectedRole);
      setShowRoleSelector(false);
      setPendingUser(null);
    }
  };

  // Filtrar roles disponíveis
  const filteredRoles = roles.filter(r => availableRoles.includes(r.value));

  // Role Selector Screen (iOS Style)
  if (showRoleSelector) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        {/* iOS-style Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => {
                setShowRoleSelector(false);
                setPendingUser(null);
              }}
              className="text-primary text-[17px] font-normal"
            >
              Voltar
            </button>
            <span className="font-semibold text-[17px]">Selecionar Perfil</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 px-4 py-6">
          {/* User greeting */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <span className="text-3xl font-bold text-primary">
                {pendingUser?.username?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <h1 className="text-[22px] font-bold mb-1">
              Olá, {pendingUser?.username}!
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Escolha seu perfil de acesso
            </p>
          </div>

          {/* iOS-style Role List */}
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl bg-card overflow-hidden shadow-sm">
              {filteredRoles.map((role, index) => {
                const Icon = role.icon;
                const isSelected = index === selectedRoleIndex;
                const isLast = index === filteredRoles.length - 1;

                return (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRoleIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 text-left transition-colors",
                      "active:bg-surface-hover",
                      !isLast && "border-b border-border/50"
                    )}
                  >
                    {/* Icon with color */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${role.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: role.color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-medium text-foreground">
                        {role.label}
                      </p>
                      <p className="text-[14px] text-muted-foreground truncate">
                        {role.description}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: role.color }}
                        >
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-border" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm Button */}
            <Button
              onClick={() => handleRoleSelect(filteredRoles[selectedRoleIndex].value)}
              className="w-full mt-6 h-13 text-[17px] font-semibold rounded-xl"
              style={{
                backgroundColor: filteredRoles[selectedRoleIndex]?.color,
              }}
            >
              Continuar
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 text-center">
          <p className="text-[13px] text-muted-foreground/60">
            © {new Date().getFullYear()} Grupo Progresso · Safra 24/25
          </p>
        </footer>
      </div>
    );
  }

  // Login Screen (iOS Style)
  return (
    <div className="min-h-dvh bg-background relative overflow-hidden">
      {/* Background Image with subtle overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={fazendaBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-all duration-200 shadow-lg"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Content */}
      <div className="relative z-10 min-h-dvh flex flex-col items-center justify-center p-6">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-[28px] bg-primary mb-6 shadow-lg">
            <img
              src={logoProgresso}
              alt="Grupo Progresso"
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="text-[34px] font-bold tracking-tight mb-1">Cotton</h1>
          <p className="text-[15px] text-muted-foreground">
            Sistema de Gestão de Fardos
          </p>
        </div>

        {/* Login Card - iOS Style */}
        <div className="w-full max-w-sm">
          <div className="rounded-3xl bg-card p-6 shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-[20px] font-semibold mb-1">Bem-vindo</h2>
              <p className="text-[13px] text-muted-foreground">
                Entre com suas credenciais
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="Usuário"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-12 rounded-xl bg-surface border-0 text-[17px] placeholder:text-muted-foreground"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[13px] ml-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Senha"
                            {...field}
                            disabled={isLoading}
                            className="h-12 pl-12 pr-12 rounded-xl bg-surface border-0 text-[17px] placeholder:text-muted-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[13px] ml-1" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-[17px] font-semibold rounded-xl mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Security indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[13px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Conexão segura</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-[13px] text-muted-foreground/60">
            © {new Date().getFullYear()} Grupo Progresso
          </p>
          <p className="text-[11px] text-muted-foreground/40 mt-1">
            Safra 24/25
          </p>
        </div>
      </div>
    </div>
  );
}
