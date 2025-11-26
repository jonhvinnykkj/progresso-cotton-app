import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import type { Bale } from '@shared/schema';
import { TALHOES_INFO } from '@shared/talhoes';

interface TalhaoStats {
  talhao: string;
  total: number;
  fardosPorHectare: number;
}

export function useProductivityMonitor() {
  const { isAuthenticated } = useAuth();
  const notifyMilestone = () => {};
  const notifyLowProductivity = () => {};
  const lastTotalRef = useRef<number>(0);
  const notifiedTalhoesRef = useRef<Set<string>>(new Set());

  const { data: bales = [] } = useQuery<Bale[]>({
    queryKey: ["/api/bales"],
    staleTime: 30000,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  useEffect(() => {
    if (bales.length === 0) return;

    const currentTotal = bales.length;

    // Verificar marcos de 1000 fardos
    checkMilestones(currentTotal);

    // Verificar produtividade dos talhões
    checkProductivity();

    lastTotalRef.current = currentTotal;
  }, [bales]);

  const checkMilestones = (currentTotal: number) => {
    const lastTotal = lastTotalRef.current;

    // Encontrar todos os marcos entre lastTotal e currentTotal
    const lastMilestone = Math.floor(lastTotal / 1000) * 1000;
    const currentMilestone = Math.floor(currentTotal / 1000) * 1000;

    // Se cruzamos um marco
    if (currentMilestone > lastMilestone && currentMilestone > 0) {
      notifyMilestone(currentMilestone);
    }
  };

  const checkProductivity = () => {
    // Agrupar fardos por talhão
    const talhaoStats = new Map<string, TalhaoStats>();

    bales.forEach((bale) => {
      if (!bale.talhao) return;

      if (!talhaoStats.has(bale.talhao)) {
        talhaoStats.set(bale.talhao, {
          talhao: bale.talhao,
          total: 0,
          fardosPorHectare: 0,
        });
      }

      const stats = talhaoStats.get(bale.talhao)!;
      stats.total += 1;
    });

    // Calcular fardos por hectare e comparar com média
    const productivities: number[] = [];

    talhaoStats.forEach((stats) => {
      const talhaoInfo = TALHOES_INFO.find(t => t.nome === stats.talhao);
      if (talhaoInfo && talhaoInfo.hectares) {
        const hectares = parseFloat(talhaoInfo.hectares);
        if (!isNaN(hectares) && hectares > 0) {
          stats.fardosPorHectare = stats.total / hectares;
          productivities.push(stats.fardosPorHectare);
        }
      }
    });

    // Calcular média geral
    if (productivities.length === 0) return;

    const avgProductivity = productivities.reduce((a, b) => a + b, 0) / productivities.length;
    const lowThreshold = avgProductivity * 0.7; // 70% da média

    // Notificar talhões com baixa produtividade (apenas uma vez)
    talhaoStats.forEach((stats) => {
      if (stats.fardosPorHectare > 0 && 
          stats.fardosPorHectare < lowThreshold && 
          stats.total >= 10 && // Mínimo de 10 fardos para considerar
          !notifiedTalhoesRef.current.has(stats.talhao)) {
        
        notifyLowProductivity(stats.talhao, stats.fardosPorHectare, avgProductivity);
        notifiedTalhoesRef.current.add(stats.talhao);
      }
    });
  };

  return {
    totalBales: bales.length,
  };
}
