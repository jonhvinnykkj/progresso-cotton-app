import { memo, useMemo } from "react";
import { StatusBadge } from "./status-badge";
import type { Bale, BaleStatus } from "@shared/schema";
import { Hash, Wheat, Clock, Package, Truck, CheckCircle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BaleCardProps {
  bale: Bale;
  onClick?: () => void;
}

const statusConfig: Record<BaleStatus, {
  color: string;
  bgColor: string;
  borderColor: string;
  glowClass: string;
  stepIndex: number;
}> = {
  campo: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20 hover:border-primary/40",
    glowClass: "hover:shadow-glow-sm",
    stepIndex: 0,
  },
  patio: {
    color: "text-neon-orange",
    bgColor: "bg-neon-orange/10",
    borderColor: "border-neon-orange/20 hover:border-neon-orange/40",
    glowClass: "hover:shadow-glow-orange",
    stepIndex: 1,
  },
  beneficiado: {
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
    borderColor: "border-neon-cyan/20 hover:border-neon-cyan/40",
    glowClass: "hover:shadow-glow-cyan",
    stepIndex: 2,
  },
};

const steps = [
  { icon: Package, label: "Campo", color: "primary" },
  { icon: Truck, label: "Pátio", color: "orange" },
  { icon: CheckCircle, label: "Beneficiado", color: "cyan" },
];

export const BaleCard = memo(function BaleCard({ bale, onClick }: BaleCardProps) {
  const config = useMemo(() => statusConfig[bale.status], [bale.status]);
  const timeAgo = useMemo(() => formatDistanceToNow(new Date(bale.updatedAt), {
    addSuffix: true,
    locale: ptBR,
  }), [bale.updatedAt]);

  return (
    <div
      className={cn(
        "glass-card-hover cursor-pointer rounded-xl border overflow-hidden group",
        config.borderColor,
        config.glowClass
      )}
      onClick={onClick}
      data-testid={`card-bale-${bale.id}`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Hash className={cn("w-4 h-4", config.color)} />
            </div>
            <span className="font-display font-bold text-lg truncate">
              {bale.numero}
            </span>
          </div>
          <StatusBadge status={bale.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-4">
        {/* Talhão */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Wheat className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm text-muted-foreground">Talhão:</span>
          <span className="font-semibold truncate">{bale.talhao}</span>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-1">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index <= config.stepIndex;
            const isCurrent = index === config.stepIndex;

            const getStepColor = () => {
              if (!isCompleted) return "bg-surface text-muted-foreground/50";
              if (step.color === "primary") return "bg-primary/20 text-primary";
              if (step.color === "orange") return "bg-neon-orange/20 text-neon-orange";
              if (step.color === "cyan") return "bg-neon-cyan/20 text-neon-cyan";
              return "";
            };

            const getLineColor = () => {
              if (index >= config.stepIndex) return "bg-surface";
              if (steps[index + 1]?.color === "primary") return "bg-primary/30";
              if (steps[index + 1]?.color === "orange") return "bg-neon-orange/30";
              if (steps[index + 1]?.color === "cyan") return "bg-neon-cyan/30";
              return "bg-surface";
            };

            return (
              <div key={step.label} className="flex items-center flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300",
                    getStepColor(),
                    isCurrent && "ring-2 ring-offset-2 ring-offset-background",
                    isCurrent && step.color === "primary" && "ring-primary/50",
                    isCurrent && step.color === "orange" && "ring-neon-orange/50",
                    isCurrent && step.color === "cyan" && "ring-neon-cyan/50"
                  )}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 rounded-full transition-all duration-300",
                      getLineColor()
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
});
