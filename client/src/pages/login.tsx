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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoProgresso from "/favicon.png";
import fazendaBg from "/fazenda.jpeg";

const roles: {
  value: UserRole;
  label: string;
  icon: typeof User;
  description: string;
  color: "purple" | "blue" | "primary" | "orange" | "cyan";
}[] = [
  {
    value: "superadmin",
    label: "Super Admin",
    icon: ShieldCheck,
    description: "Acesso total + gestão de usuários",
    color: "purple",
  },
  {
    value: "admin",
    label: "Administrador",
    icon: ShieldCheck,
    description: "Acesso completo ao sistema",
    color: "blue",
  },
  {
    value: "campo",
    label: "Operador de Campo",
    icon: Package,
    description: "Cadastro de novos fardos",
    color: "primary",
  },
  {
    value: "transporte",
    label: "Transportador",
    icon: Truck,
    description: "Movimentação para pátio",
    color: "orange",
  },
  {
    value: "algodoeira",
    label: "Algodoeira",
    icon: Factory,
    description: "Beneficiamento de fardos",
    color: "cyan",
  },
];

const colorClasses = {
  purple: {
    bg: "bg-neon-purple/20",
    text: "text-neon-purple",
    border: "border-neon-purple/30",
    glow: "shadow-[0_0_20px_rgba(167,139,250,0.3)]",
  },
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  primary: {
    bg: "bg-primary/20",
    text: "text-primary",
    border: "border-primary/30",
    glow: "shadow-glow-sm",
  },
  orange: {
    bg: "bg-neon-orange/20",
    text: "text-neon-orange",
    border: "border-neon-orange/30",
    glow: "shadow-glow-orange",
  },
  cyan: {
    bg: "bg-neon-cyan/20",
    text: "text-neon-cyan",
    border: "border-neon-cyan/30",
    glow: "shadow-glow-cyan",
  },
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, selectedRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  return (
    <div className="min-h-dvh bg-black relative overflow-hidden">
      {/* Background - Static image on mobile, Video on desktop */}
      <div className="absolute inset-0 z-0">
        {isMobile ? (
          /* Static image background for mobile */
          <img
            src={fazendaBg}
            alt="Fazenda Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Video background for desktop */
          <iframe
            className="absolute w-[300%] h-[300%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            src="https://www.youtube.com/embed/V9JW3vPIdyE?rel=0&controls=0&loop=1&mute=1&autoplay=1&playlist=V9JW3vPIdyE&playsinline=1&enablejsapi=1"
            title="Background Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ border: 'none' }}
          />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
      </div>

      {/* Animated particles/dust effect */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Cinematic light streaks */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-neon-cyan/10 to-transparent animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      {/* Theme Toggle Button - Top Right */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300 shadow-lg"
        title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Animated Logo Section */}
        <div className="text-center mb-8 animate-fade-in-down">
          {/* Main Logo with elaborate animation */}
          <div className="relative inline-block mb-6 group">
            {/* Outer glow ring - pulsing */}
            <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-r from-primary/20 via-neon-cyan/20 to-primary/20 blur-2xl animate-pulse opacity-60" />

            {/* Rotating ring */}
            <div
              className="absolute inset-0 -m-4 rounded-full border border-primary/30"
              style={{
                animation: 'spin 20s linear infinite',
              }}
            />

            {/* Second rotating ring (opposite direction) */}
            <div
              className="absolute inset-0 -m-6 rounded-full border border-neon-cyan/20"
              style={{
                animation: 'spin 30s linear infinite reverse',
              }}
            />

            {/* Logo container with hover effects */}
            <div className="relative p-4 rounded-2xl bg-black/50 backdrop-blur-sm border border-white/10 group-hover:border-primary/50 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(0,255,136,0.3)]">
              {/* Inner glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Logo image with animations */}
              <img
                src={logoProgresso}
                alt="Grupo Progresso"
                className="h-20 sm:h-28 w-auto relative z-10 drop-shadow-[0_0_20px_rgba(0,255,136,0.5)] group-hover:drop-shadow-[0_0_40px_rgba(0,255,136,0.8)] transition-all duration-500 group-hover:scale-105"
                style={{
                  filter: 'brightness(1.1) contrast(1.1)',
                }}
              />
            </div>

            {/* Scanning line effect */}
            <div
              className="absolute inset-0 -m-4 overflow-hidden rounded-full pointer-events-none"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, black, transparent)',
              }}
            >
              <div
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{
                  animation: 'scan 3s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Brand text with cinematic reveal */}
          <div className="overflow-hidden">
            <h1
              className="text-4xl sm:text-5xl font-display font-bold mb-2"
              style={{
                animation: 'slideUp 0.8s ease-out forwards',
                animationDelay: '0.3s',
                opacity: 0,
                transform: 'translateY(20px)',
              }}
            >
              <span className="bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                Cotton
              </span>
            </h1>
          </div>
          <p
            className="text-muted-foreground tracking-wider uppercase text-sm"
            style={{
              animation: 'fadeIn 1s ease-out forwards',
              animationDelay: '0.6s',
              opacity: 0,
            }}
          >
            Sistema de Gestão de Fardos
          </p>
        </div>

        {/* Login Card with cinematic glass effect */}
        <div
          className="w-full max-w-md"
          style={{
            animation: 'slideUp 0.8s ease-out forwards',
            animationDelay: '0.5s',
            opacity: 0,
            transform: 'translateY(30px)',
          }}
        >
          <div className="relative p-8 rounded-2xl overflow-hidden backdrop-blur-xl bg-black/40 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {/* Animated border gradient */}
            <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-br from-primary/50 via-transparent to-neon-cyan/50 opacity-50" />

            {/* Inner gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-neon-cyan/5" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-primary/30 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-neon-cyan/30 rounded-br-2xl" />

            <div className="relative">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-1 text-white">Bem-vindo de volta</h2>
                <p className="text-sm text-white/60">Entre com suas credenciais</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white/80">
                          Usuário
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
                            <Input
                              placeholder="Digite seu usuário"
                              {...field}
                              disabled={isLoading}
                              data-testid="input-username"
                              className="h-12 pl-11 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-white/30 text-white"
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-white/80">
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              {...field}
                              disabled={isLoading}
                              data-testid="input-password"
                              className="h-12 pl-11 pr-11 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-white/30 text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-black shadow-[0_0_30px_rgba(0,255,136,0.4)] hover:shadow-[0_0_50px_rgba(0,255,136,0.6)] transition-all duration-300"
                    disabled={isLoading}
                    data-testid="submit-login"
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
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-white/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Conexão segura</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Dados protegidos</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-8 text-center text-xs text-white/30"
          style={{
            animation: 'fadeIn 1s ease-out forwards',
            animationDelay: '1s',
            opacity: 0,
          }}
        >
          <p>© {new Date().getFullYear()} Grupo Progresso</p>
          <p className="mt-1">Safra 24/25</p>
        </div>
      </div>

      {/* Dialog de Seleção de Papel - Redesign Premium */}
      <Dialog open={showRoleSelector} onOpenChange={setShowRoleSelector}>
        <DialogContent
          className="sm:max-w-lg bg-background/95 backdrop-blur-2xl border-primary/20 p-0 overflow-hidden rounded-3xl shadow-[0_0_60px_rgba(0,255,136,0.1)]"
          aria-describedby={undefined}
        >
          {/* Header Hero */}
          <div className="relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative pt-8 pb-6 px-6 text-center">
              {/* Logo */}
              <div className="mx-auto mb-4 relative">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-glow overflow-hidden">
                  <img src={logoProgresso} alt="Cotton" className="h-10 w-10 object-contain" />
                </div>
                <div className="absolute -bottom-1 -right-1 left-1/2 ml-4 h-6 w-6 rounded-full bg-neon-cyan border-2 border-background flex items-center justify-center">
                  <User className="h-3 w-3 text-black" />
                </div>
              </div>

              {/* Title */}
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold text-center">
                  <span className="gradient-text">Bem-vindo de volta!</span>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2 text-center text-sm">
                  Selecione seu perfil de acesso para continuar
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* Roles Grid */}
          <div className="p-5">
            <div className="space-y-2">
              {availableRoles.map((roleValue, index) => {
                const roleInfo = roles.find((r) => r.value === roleValue);
                if (!roleInfo) return null;

                const Icon = roleInfo.icon;
                const colors = colorClasses[roleInfo.color];

                return (
                  <button
                    key={roleValue}
                    className={cn(
                      "w-full p-4 flex items-center gap-4 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden",
                      "bg-surface/30 border-transparent",
                      "hover:border-primary/40 hover:bg-surface/60",
                      colors.glow.replace("shadow-", "hover:shadow-")
                    )}
                    onClick={() => handleRoleSelect(roleValue)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Hover gradient */}
                    <div className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      "bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"
                    )} />

                    {/* Icon */}
                    <div className={cn(
                      "relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                      colors.bg,
                      "group-hover:" + colors.glow
                    )}>
                      <Icon className={cn("w-7 h-7 transition-transform group-hover:scale-110", colors.text)} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-base text-foreground group-hover:text-white transition-colors truncate">
                        {roleInfo.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {roleInfo.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      "bg-surface/50 group-hover:bg-primary/20",
                      "group-hover:translate-x-1"
                    )}>
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-colors",
                        "text-muted-foreground group-hover:text-primary"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <Lock className="w-3 h-3" />
              <span>Acesso seguro e criptografado</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
