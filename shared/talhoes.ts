// Informações dos talhões (mock temporário - depois migrar para banco)
export const TALHOES_INFO = [
  { id: '1B', nome: '1B', hectares: '774.90' },
  { id: '2B', nome: '2B', hectares: '762.20' },
  { id: '3B', nome: '3B', hectares: '661.00' },
  { id: '4B', nome: '4B', hectares: '573.60' },
  { id: '5B', nome: '5B', hectares: '472.60' },
  { id: '2A', nome: '2A', hectares: '493.90' },
  { id: '3A', nome: '3A', hectares: '338.50' },
  { id: '4A', nome: '4A', hectares: '368.30' },
  { id: '5A', nome: '5A', hectares: '493.00' },
] as const;

export type TalhaoOption = typeof TALHOES_INFO[number];
