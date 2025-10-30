import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Package, Truck, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Bale } from "@shared/schema";

interface BaleTimelineProps {
  bale: Bale;
  getUserDisplayName?: (userId: string | null | undefined) => string;
}

export function BaleTimeline({ bale, getUserDisplayName }: BaleTimelineProps) {
  const timelineSteps = [
    {
      status: "campo",
      label: "Registrado no Campo",
      icon: Package,
      timestamp: bale.createdAt,
      userId: bale.createdBy,
      completed: true,
      color: "text-bale-campo",
      bgColor: "bg-bale-campo",
    },
    {
      status: "patio",
      label: "Transportado para Pátio",
      icon: Truck,
      timestamp: bale.transportedAt || (bale.status === "patio" || bale.status === "beneficiado" ? bale.updatedAt : undefined),
      userId: bale.transportedBy,
      completed: bale.status === "patio" || bale.status === "beneficiado",
      color: "text-bale-patio",
      bgColor: "bg-bale-patio",
    },
    {
      status: "beneficiado",
      label: "Beneficiado",
      icon: CheckCircle,
      timestamp: bale.processedAt || (bale.status === "beneficiado" ? bale.updatedAt : undefined),
      userId: bale.processedBy,
      completed: bale.status === "beneficiado",
      color: "text-bale-beneficiado",
      bgColor: "bg-bale-beneficiado",
    },
  ];

  return (
    <div className="space-y-4">
      {timelineSteps.map((step, index) => (
        <div key={step.status} className="relative">
          {/* Connecting line */}
          {index < timelineSteps.length - 1 && (
            <div
              className={`absolute left-5 top-12 w-0.5 h-full ${
                step.completed ? step.bgColor : "bg-muted"
              }`}
            />
          )}

          <Card
            className={`${
              step.completed ? "border-l-4" : "border-l-4 border-l-muted opacity-50"
            }`}
            style={{
              borderLeftColor: step.completed
                ? `hsl(var(--chart-${index + 1}))`
                : undefined,
            }}
            data-testid={`timeline-step-${step.status}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed ? step.bgColor : "bg-muted"
                  }`}
                >
                  <step.icon className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{step.label}</h3>

                  {step.timestamp ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(step.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {getUserDisplayName && step.userId && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="font-medium text-foreground">
                            {getUserDisplayName(step.userId)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aguardando processamento
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
