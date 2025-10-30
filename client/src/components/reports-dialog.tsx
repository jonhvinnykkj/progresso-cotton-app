import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useLocation } from "wouter";

export function ReportsDialog() {
  const [, setLocation] = useLocation();

  return (
    <Button 
      variant="outline" 
      data-testid="button-open-reports"
      onClick={() => setLocation("/reports")}
      className="transition-all hover:scale-105 duration-300"
    >
      <FileText className="w-4 h-4 mr-2" />
      Relatórios
    </Button>
  );
}
