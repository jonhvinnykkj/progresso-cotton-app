// @ts-ignore - shapefile doesn't have types
import * as shapefile from 'shapefile';
import * as turf from '@turf/turf';
import * as fs from 'fs';

export interface ParsedTalhao {
  nome: string;
  hectares: string;
  geometry: string; // GeoJSON string
  centroid: string; // GeoJSON point string
}

export interface ShapefileParseResult {
  success: boolean;
  talhoes: ParsedTalhao[];
  error?: string;
  totalFeatures: number;
}

/**
 * Converte coordenadas de graus decimais para metros (projeção aproximada)
 * Utiliza projeção UTM simplificada para cálculo de área
 */
function calculateAreaHectares(geometry: any): number {
  try {
    // Turf.js calcula área em metros quadrados
    const areaM2 = turf.area(geometry);
    // Converter para hectares (1 hectare = 10000 m²)
    const hectares = areaM2 / 10000;
    return Math.round(hectares * 100) / 100; // 2 casas decimais
  } catch (error) {
    console.error('Erro ao calcular área:', error);
    return 0;
  }
}

/**
 * Calcula o centróide de um polígono para posicionamento de labels
 */
function calculateCentroid(geometry: any): number[] | null {
  try {
    const centroid = turf.centroid(geometry as turf.AllGeoJSON);
    return centroid.geometry.coordinates;
  } catch (error) {
    console.error('Erro ao calcular centróide:', error);
    return null;
  }
}

/**
 * Extrai o nome do talhão das propriedades do feature
 * Busca em múltiplos campos possíveis
 */
function extractTalhaoName(properties: Record<string, any>): string {
  // Lista de possíveis campos de nome (case-insensitive)
  const nameFields = ['name', 'nome', 'Name', 'NAME', 'NOME', 'id', 'ID', 'Id', 'label', 'LABEL'];

  for (const field of nameFields) {
    if (properties[field] && typeof properties[field] === 'string' && properties[field].trim()) {
      return properties[field].trim();
    }
  }

  // Se não encontrar, usa o primeiro campo string disponível
  for (const key of Object.keys(properties)) {
    if (typeof properties[key] === 'string' && properties[key].trim()) {
      return properties[key].trim();
    }
  }

  return 'Sem nome';
}

/**
 * Parseia um shapefile e retorna todos os talhões com área calculada
 *
 * @param shpPath Caminho para o arquivo .shp
 * @param dbfPath Caminho para o arquivo .dbf (opcional, inferido do .shp se não fornecido)
 */
export async function parseShapefile(shpPath: string, dbfPath?: string): Promise<ShapefileParseResult> {
  try {
    // Verificar se o arquivo .shp existe
    if (!fs.existsSync(shpPath)) {
      return {
        success: false,
        talhoes: [],
        error: `Arquivo .shp não encontrado: ${shpPath}`,
        totalFeatures: 0,
      };
    }

    // Inferir caminho do .dbf se não fornecido
    const dbf = dbfPath || shpPath.replace(/\.shp$/i, '.dbf');

    // Verificar se .dbf existe
    if (!fs.existsSync(dbf)) {
      console.warn(`Arquivo .dbf não encontrado: ${dbf}. Continuando sem atributos.`);
    }

    const talhoes: ParsedTalhao[] = [];
    let featureIndex = 0;

    // Abrir o shapefile
    const source = await shapefile.open(shpPath, dbf);

    // Ler todos os features
    let result = await source.read();
    while (!result.done) {
      const feature = result.value;

      if (feature && feature.geometry) {
        const properties = feature.properties || {};
        const geometry = feature.geometry;

        // Extrair nome
        let nome = extractTalhaoName(properties);

        // Se não tiver nome, usar índice
        if (nome === 'Sem nome') {
          nome = `Talhão ${featureIndex + 1}`;
        }

        // Calcular área em hectares
        const hectares = calculateAreaHectares(geometry);

        // Calcular centróide
        const centroidCoords = calculateCentroid(geometry);
        const centroid = centroidCoords
          ? JSON.stringify({ type: 'Point', coordinates: centroidCoords })
          : '';

        talhoes.push({
          nome,
          hectares: hectares.toFixed(2),
          geometry: JSON.stringify(geometry),
          centroid,
        });

        featureIndex++;
      }

      result = await source.read();
    }

    return {
      success: true,
      talhoes,
      totalFeatures: featureIndex,
    };
  } catch (error) {
    console.error('Erro ao parsear shapefile:', error);
    return {
      success: false,
      talhoes: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido ao parsear shapefile',
      totalFeatures: 0,
    };
  }
}

/**
 * Parseia um shapefile a partir de buffers (para upload via API)
 *
 * @param shpBuffer Buffer do arquivo .shp
 * @param dbfBuffer Buffer do arquivo .dbf
 */
export async function parseShapefileFromBuffers(
  shpBuffer: Buffer,
  dbfBuffer?: Buffer
): Promise<ShapefileParseResult> {
  try {
    const talhoes: ParsedTalhao[] = [];
    let featureIndex = 0;

    // Criar readable sources a partir dos buffers
    // @ts-ignore - shapefile aceita ArrayBuffer
    const source = await shapefile.open(
      shpBuffer.buffer.slice(shpBuffer.byteOffset, shpBuffer.byteOffset + shpBuffer.byteLength),
      dbfBuffer ? dbfBuffer.buffer.slice(dbfBuffer.byteOffset, dbfBuffer.byteOffset + dbfBuffer.byteLength) : undefined
    );

    // Ler todos os features
    let result = await source.read();
    while (!result.done) {
      const feature = result.value;

      if (feature && feature.geometry) {
        const properties = feature.properties || {};
        const geometry = feature.geometry;

        // Extrair nome
        let nome = extractTalhaoName(properties);

        // Se não tiver nome, usar índice
        if (nome === 'Sem nome') {
          nome = `Talhão ${featureIndex + 1}`;
        }

        // Calcular área em hectares
        const hectares = calculateAreaHectares(geometry);

        // Calcular centróide
        const centroidCoords = calculateCentroid(geometry);
        const centroid = centroidCoords
          ? JSON.stringify({ type: 'Point', coordinates: centroidCoords })
          : '';

        talhoes.push({
          nome,
          hectares: hectares.toFixed(2),
          geometry: JSON.stringify(geometry),
          centroid,
        });

        featureIndex++;
      }

      result = await source.read();
    }

    return {
      success: true,
      talhoes,
      totalFeatures: featureIndex,
    };
  } catch (error) {
    console.error('Erro ao parsear shapefile de buffers:', error);
    return {
      success: false,
      talhoes: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido ao parsear shapefile',
      totalFeatures: 0,
    };
  }
}

/**
 * Parseia um GeoJSON diretamente
 */
export function parseGeoJSON(geojson: any): ShapefileParseResult {
  try {
    const talhoes: ParsedTalhao[] = [];

    if (!geojson.features || !Array.isArray(geojson.features)) {
      return {
        success: false,
        talhoes: [],
        error: 'GeoJSON inválido: não contém features',
        totalFeatures: 0,
      };
    }

    geojson.features.forEach((feature: any, index: number) => {
      if (feature && feature.geometry) {
        const properties = feature.properties || {};
        const geometry = feature.geometry;

        // Extrair nome
        let nome = extractTalhaoName(properties);
        if (nome === 'Sem nome') {
          nome = `Talhão ${index + 1}`;
        }

        // Calcular área em hectares
        const hectares = calculateAreaHectares(geometry);

        // Calcular centróide
        const centroidCoords = calculateCentroid(geometry);
        const centroid = centroidCoords
          ? JSON.stringify({ type: 'Point', coordinates: centroidCoords })
          : '';

        talhoes.push({
          nome,
          hectares: hectares.toFixed(2),
          geometry: JSON.stringify(geometry),
          centroid,
        });
      }
    });

    return {
      success: true,
      talhoes,
      totalFeatures: talhoes.length,
    };
  } catch (error) {
    console.error('Erro ao parsear GeoJSON:', error);
    return {
      success: false,
      talhoes: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido ao parsear GeoJSON',
      totalFeatures: 0,
    };
  }
}
