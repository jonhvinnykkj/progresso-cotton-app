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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";
import fazendaBg from "/fazenda.jpeg";

const roles: {
  value: UserRole;
  label: string;
  icon: typeof User;
  description: string;
  gradient: string;
  glowColor: string;
}[] = [
  {
    value: "superadmin",
    label: "Super Admin",
    icon: ShieldCheck,
    description: "Acesso total",
    gradient: "from-purple-500 to-pink-500",
    glowColor: "rgba(168, 85, 247, 0.4)",
  },
  {
    value: "admin",
    label: "Admin",
    icon: ShieldCheck,
    description: "Acesso completo",
    gradient: "from-blue-500 to-cyan-500",
    glowColor: "rgba(59, 130, 246, 0.4)",
  },
  {
    value: "campo",
    label: "Campo",
    icon: Package,
    description: "Cadastro de fardos",
    gradient: "from-emerald-500 to-green-500",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  {
    value: "transporte",
    label: "Transporte",
    icon: Truck,
    description: "Movimentação",
    gradient: "from-orange-500 to-amber-500",
    glowColor: "rgba(249, 115, 22, 0.4)",
  },
  {
    value: "algodoeira",
    label: "Algodoeira",
    icon: Factory,
    description: "Beneficiamento",
    gradient: "from-cyan-500 to-teal-500",
    glowColor: "rgba(6, 182, 212, 0.4)",
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

  // Role Selector Screen (Gamer Style)
  if (showRoleSelector) {
    const currentRole = filteredRoles[selectedRoleIndex];

    return (
      <div className="min-h-dvh bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <img src={logoProgresso} alt="Cotton" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-semibold text-[17px]">Cotton</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Selecione seu perfil
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-bold mb-2">
              Olá, {pendingUser?.username}!
            </h1>
            <p className="text-muted-foreground text-[15px]">
              Escolha como deseja acessar o sistema
            </p>
          </div>

          {/* Gamer-style Horizontal Role Selector */}
          <div className="w-full max-w-4xl">
            {/* Role Cards - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-none">
              {filteredRoles.map((role, index) => {
                const Icon = role.icon;
                const isSelected = index === selectedRoleIndex;

                return (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRoleIndex(index)}
                    className={cn(
                      "flex-shrink-0 snap-center w-[160px] sm:w-[200px] p-5 rounded-2xl transition-all duration-300 relative overflow-hidden group",
                      isSelected
                        ? "scale-105 ring-2 ring-white/20"
                        : "scale-95 opacity-60 hover:opacity-80"
                    )}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${role.gradient.includes('purple') ? '#a855f7' : role.gradient.includes('blue') ? '#3b82f6' : role.gradient.includes('emerald') ? '#10b981' : role.gradient.includes('orange') ? '#f97316' : '#06b6d4'}, ${role.gradient.includes('pink') ? '#ec4899' : role.gradient.includes('cyan') ? '#06b6d4' : role.gradient.includes('green') ? '#22c55e' : role.gradient.includes('amber') ? '#f59e0b' : '#14b8a6'})`
                        : 'hsl(var(--surface))',
                      boxShadow: isSelected ? `0 20px 40px ${role.glowColor}` : 'none',
                    }}
                  >
                    {/* Shine effect */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    )}

                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto transition-all",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-surface-elevated text-muted-foreground"
                    )}>
                      <Icon className="w-7 h-7" />
                    </div>

                    {/* Text */}
                    <div className="text-center">
                      <p className={cn(
                        "font-bold text-[17px] mb-1 transition-colors",
                        isSelected ? "text-white" : "text-foreground"
                      )}>
                        {role.label}
                      </p>
                      <p className={cn(
                        "text-[13px] transition-colors",
                        isSelected ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {role.description}
                      </p>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination dots */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {filteredRoles.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedRoleIndex(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === selectedRoleIndex
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={() => handleRoleSelect(filteredRoles[selectedRoleIndex].value)}
            className="mt-8 h-14 px-12 text-[17px] font-semibold rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${currentRole?.gradient.includes('purple') ? '#a855f7' : currentRole?.gradient.includes('blue') ? '#3b82f6' : currentRole?.gradient.includes('emerald') ? '#10b981' : currentRole?.gradient.includes('orange') ? '#f97316' : '#06b6d4'}, ${currentRole?.gradient.includes('pink') ? '#ec4899' : currentRole?.gradient.includes('cyan') ? '#06b6d4' : currentRole?.gradient.includes('green') ? '#22c55e' : currentRole?.gradient.includes('amber') ? '#f59e0b' : '#14b8a6'})`,
              boxShadow: `0 10px 30px ${currentRole?.glowColor}`,
            }}
          >
            Entrar como {currentRole?.label}
          </Button>

          {/* Back button */}
          <button
            onClick={() => {
              setShowRoleSelector(false);
              setPendingUser(null);
            }}
            className="mt-4 text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao login
          </button>
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
