import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  showHome?: boolean;
  className?: string;
}

export function BackButton({ showHome = true, className }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    // Volta para a página anterior ou dashboard
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/dashboard");
    }
  };

  const handleHome = () => {
    setLocation("/dashboard");
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="hover:scale-110 transition-transform"
        title="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      {showHome && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHome}
          className="hover:scale-110 transition-transform"
          title="Ir para Dashboard"
        >
          <Home className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
