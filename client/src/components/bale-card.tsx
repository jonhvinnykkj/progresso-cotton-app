import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { Bale } from "@shared/schema";
import { Hash, Wheat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BaleCardProps {
  bale: Bale;
  onClick?: () => void;
}

export function BaleCard({ bale, onClick }: BaleCardProps) {
  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 border-green-100 hover:border-yellow-300 rounded-2xl bg-white"
      onClick={onClick}
      data-testid={`card-bale-${bale.id}`}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-yellow-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 relative">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform">
            <Hash className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg truncate bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">{bale.numero}</span>
        </div>
        <StatusBadge status={bale.status} size="sm" />
      </CardHeader>
      <CardContent className="space-y-3 relative">
        <div className="flex items-center gap-2 text-sm bg-green-50/50 rounded-xl p-2.5">
          <div className="p-1.5 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg">
            <Wheat className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-green-700 font-semibold">Talhão:</span>
          <span className="font-bold truncate text-green-800">{bale.talhao}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-green-600 pt-1 border-t-2 border-green-100">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
          <span className="font-medium">Atualizado {format(new Date(bale.updatedAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
