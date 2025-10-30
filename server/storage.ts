import {
  type User,
  type InsertUser,
  type Bale,
  type InsertBale,
  type BaleStatus,
  type UserRole,
  type BatchCreateBales,
  type Setting,
  type TalhaoCounter,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { users as usersTable, bales as balesTable, settings as settingsTable, talhaoCounters as talhaoCountersTable } from "@shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { hashPassword } from "./auth";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Omit<InsertUser, 'roles'> & { createdBy?: string; roles: string[] | UserRole[] }): Promise<User>;
  updateUserRoles(id: string, roles: string[] | UserRole[]): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // Bale methods
  getAllBales(): Promise<Bale[]>;
  getBale(id: string): Promise<Bale | undefined>;
  getBaleByQRCode(qrCode: string): Promise<Bale | undefined>;
  createSingleBale(id: string, safra: string, talhao: string, numero: string, userId: string): Promise<Bale>;
  batchCreateBales(data: BatchCreateBales, userId: string): Promise<Bale[]>;
  updateBaleStatus(id: string, status: BaleStatus, userId: string): Promise<Bale>;
  getBaleStats(): Promise<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }>;
  getBaleStatsByTalhao(): Promise<{
    talhao: string;
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }[]>;
  getStatsBySafra(): Promise<{
    safra: string;
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }[]>;
  deleteBale(id: string): Promise<void>;
  deleteAllBales(): Promise<{ deletedCount: number }>;

  // Talhao counter methods (contador único por safra)
  getOrCreateTalhaoCounter(safra: string): Promise<TalhaoCounter>;
  getNextBaleNumbers(safra: string, talhao: string, quantidade: number): Promise<string[]>;

  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: Omit<InsertUser, 'roles'> & { createdBy?: string; roles: string[] | UserRole[] }): Promise<User> {
    // Hash password before storing
    const hashedPassword = await hashPassword(insertUser.password);

    const result = await db.insert(usersTable).values({
      username: insertUser.username,
      displayName: insertUser.displayName,
      password: hashedPassword,
      roles: JSON.stringify(insertUser.roles),
      createdBy: insertUser.createdBy,
    }).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(usersTable);
    return result;
  }

  async updateUserRoles(id: string, roles: string[] | UserRole[]): Promise<void> {
    await db.update(usersTable)
      .set({ roles: JSON.stringify(roles) })
      .where(eq(usersTable.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }

  // Talhao counter methods (contador único por safra)
  async getOrCreateTalhaoCounter(safra: string): Promise<TalhaoCounter> {
    const existing = await db.select()
      .from(talhaoCountersTable)
      .where(
        sql`${talhaoCountersTable.safra} = ${safra}`
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Criar novo contador para a safra (talhao vazio significa que é contador global da safra)
    const result = await db.insert(talhaoCountersTable).values({
      safra,
      talhao: '', // String vazia indica contador global da safra
      lastNumber: 0,
      updatedAt: new Date(),
    }).returning();

    return result[0];
  }

  async getNextBaleNumbers(safra: string, talhao: string, quantidade: number): Promise<string[]> {
    // Buscar contador APENAS pela safra (não por talhão)
    const counter = await this.getOrCreateTalhaoCounter(safra);
    
    // Gerar números sequenciais
    const numbers: string[] = [];
    let currentNumber = counter.lastNumber;
    
    for (let i = 0; i < quantidade; i++) {
      currentNumber++;
      // Formatar com 5 dígitos: 00001, 00002, etc
      numbers.push(currentNumber.toString().padStart(5, '0'));
    }

    // Atualizar contador no banco (apenas por safra)
    await db.update(talhaoCountersTable)
      .set({ 
        lastNumber: currentNumber,
        updatedAt: new Date()
      })
      .where(
        sql`${talhaoCountersTable.safra} = ${safra}`
      );

    return numbers;
  }

  // Bale methods
  async getAllBales(): Promise<Bale[]> {
    try {
      const result = await db.select().from(balesTable).orderBy(sql`${balesTable.updatedAt} DESC`);
      return result;
    } catch (error: any) {
      // Se colunas novas não existirem, retorna com valores null
      if (error.code === '42703') {
        const result = await db.select({
          id: balesTable.id,
          safra: balesTable.safra,
          talhao: balesTable.talhao,
          numero: balesTable.numero,
          status: balesTable.status,
          createdAt: balesTable.createdAt,
          updatedAt: balesTable.updatedAt,
        }).from(balesTable).orderBy(sql`${balesTable.updatedAt} DESC`);
        return result.map(b => ({ 
          ...b, 
          statusHistory: null,
          createdBy: 'unknown',
          updatedBy: null,
          transportedAt: null,
          transportedBy: null,
          processedAt: null,
          processedBy: null,
        }));
      }
      throw error;
    }
  }

  async getBale(id: string): Promise<Bale | undefined> {
    try {
      const result = await db.select().from(balesTable).where(eq(balesTable.id, id)).limit(1);
      return result[0];
    } catch (error: any) {
      // Se colunas novas não existirem, retorna com valores null
      if (error.code === '42703') {
        const result = await db.select({
          id: balesTable.id,
          safra: balesTable.safra,
          talhao: balesTable.talhao,
          numero: balesTable.numero,
          status: balesTable.status,
          createdAt: balesTable.createdAt,
          updatedAt: balesTable.updatedAt,
        }).from(balesTable).where(eq(balesTable.id, id)).limit(1);
        return result[0] ? { 
          ...result[0], 
          statusHistory: null,
          createdBy: 'unknown',
          updatedBy: null,
          transportedAt: null,
          transportedBy: null,
          processedAt: null,
          processedBy: null,
        } : undefined;
      }
      throw error;
    }
  }

  async getBaleByQRCode(qrCode: string): Promise<Bale | undefined> {
    // QR Code é o ID do fardo
    const result = await db.select().from(balesTable).where(eq(balesTable.id, qrCode)).limit(1);
    return result[0];
  }

  async batchCreateBales(data: BatchCreateBales, userId: string): Promise<Bale[]> {
    const { safra, talhao, quantidade } = data;
    const now = new Date();

    // Gerar números sequenciais (zera a cada nova safra)
    const numbers = await this.getNextBaleNumbers(safra, talhao, quantidade);

    // Gerar todos os IDs que seriam criados
    const allIds = numbers.map(numero => `S${safra}-T${talhao}-${numero}`);

    // Buscar quais IDs já existem no banco (em uma única query)
    const existingBales = await db
      .select({ id: balesTable.id })
      .from(balesTable)
      .where(inArray(balesTable.id, allIds));
    
    const existingIds = new Set(existingBales.map(b => b.id));
    const skippedIds: string[] = [];

    // Filtrar apenas os números que NÃO existem
    const balesData = numbers
      .map(numero => {
        const id = `S${safra}-T${talhao}-${numero}`;
        
        if (existingIds.has(id)) {
          skippedIds.push(id);
          return null;
        }

        return {
          id: id,
          safra: safra,
          talhao,
          numero: parseInt(numero),
          status: "campo" as BaleStatus,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter((bale): bale is NonNullable<typeof bale> => bale !== null);

    if (skippedIds.length > 0) {
      console.log(`⚠️ Pulando ${skippedIds.length} fardo(s) que já existem:`, skippedIds);
    }

    // Se não há nada para criar, retornar array vazio
    if (balesData.length === 0) {
      console.log('✅ Nenhum fardo novo para criar (todos já existem)');
      return [];
    }

    // Inserir todos de uma vez (batch insert)
    try {
      const result = await db.insert(balesTable).values(balesData).returning();
      console.log(`✅ ${result.length} fardo(s) criado(s) com sucesso`);
      return result;
    } catch (error: any) {
      // Se colunas novas não existirem, tenta inserir sem elas
      if (error.code === '42703') {
        const result = await db.insert(balesTable).values(balesData).returning({
          id: balesTable.id,
          safra: balesTable.safra,
          talhao: balesTable.talhao,
          numero: balesTable.numero,
          status: balesTable.status,
          createdAt: balesTable.createdAt,
          updatedAt: balesTable.updatedAt,
        });
        console.log(`✅ ${result.length} fardo(s) criado(s) com sucesso (sem colunas de rastreamento)`);
        return result.map(b => ({ 
          ...b, 
          statusHistory: null,
          createdBy: 'unknown',
          updatedBy: null,
          transportedAt: null,
          transportedBy: null,
          processedAt: null,
          processedBy: null,
        }));
      }
      throw error;
    }
  }

  async createSingleBale(id: string, safra: string, talhao: string, numero: string, userId: string): Promise<Bale> {
    const now = new Date();
    const numeroInt = parseInt(numero);

    const baleData = {
      id: id, // Ex: S25/26-T2B-00001
      safra: safra,
      talhao,
      numero: numeroInt,
      status: "campo" as BaleStatus,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await db.insert(balesTable).values(baleData).returning();
      return result[0];
    } catch (error: any) {
      // Se colunas novas não existirem, tenta inserir sem elas
      if (error.code === '42703') {
        const result = await db.insert(balesTable).values(baleData).returning({
          id: balesTable.id,
          safra: balesTable.safra,
          talhao: balesTable.talhao,
          numero: balesTable.numero,
          status: balesTable.status,
          createdAt: balesTable.createdAt,
          updatedAt: balesTable.updatedAt,
        });
        return { 
          ...result[0], 
          statusHistory: null,
          createdBy: 'unknown',
          updatedBy: null,
          transportedAt: null,
          transportedBy: null,
          processedAt: null,
          processedBy: null,
        };
      }
      throw error;
    }
  }

  async updateBaleStatus(id: string, status: BaleStatus, userId: string): Promise<Bale> {
    const bale = await this.getBale(id);
    if (!bale) {
      throw new Error("Fardo não encontrado");
    }

    // Validate status transition
    if (status === "patio" && bale.status !== "campo") {
      throw new Error("Apenas fardos no campo podem ser movidos para o pátio");
    }

    if (status === "beneficiado" && bale.status !== "patio") {
      throw new Error("Apenas fardos no pátio podem ser beneficiados");
    }

    // Update status history
    let history: Array<{ status: BaleStatus; timestamp: string; userId: string }> = [];
    if (bale.statusHistory) {
      try {
        history = JSON.parse(bale.statusHistory);
      } catch (e) {
        history = [];
      }
    }
    
    history.push({
      status: status,
      timestamp: new Date().toISOString(),
      userId,
    });

    const now = new Date();
    const updates: any = {
      status: status,
      statusHistory: JSON.stringify(history),
      updatedAt: now,
      updatedBy: userId,
    };

    // Se está sendo transportado para o pátio, registrar
    if (status === "patio") {
      updates.transportedAt = now;
      updates.transportedBy = userId;
    }

    // Se está sendo beneficiado, registrar
    if (status === "beneficiado") {
      updates.processedAt = now;
      updates.processedBy = userId;
    }

    try {
      const result = await db.update(balesTable).set(updates).where(eq(balesTable.id, id)).returning();
      return result[0];
    } catch (error: any) {
      // Se colunas novas não existirem, atualiza sem elas
      if (error.code === '42703') {
        const simpleUpdates = {
          status: status,
          updatedAt: now,
        };
        const result = await db.update(balesTable).set(simpleUpdates).where(eq(balesTable.id, id)).returning({
          id: balesTable.id,
          safra: balesTable.safra,
          talhao: balesTable.talhao,
          numero: balesTable.numero,
          status: balesTable.status,
          createdAt: balesTable.createdAt,
          updatedAt: balesTable.updatedAt,
        });
        return { 
          ...result[0], 
          statusHistory: null,
          createdBy: 'unknown',
          updatedBy: null,
          transportedAt: null,
          transportedBy: null,
          processedAt: null,
          processedBy: null,
        };
      }
      throw error;
    }
  }

  async getBaleStats(): Promise<{
    campo: number;
    patio: number;
    beneficiado: number;
    total: number;
  }> {
    const allBales = await this.getAllBales();

    return {
      campo: allBales.filter((b) => b.status === "campo").length,
      patio: allBales.filter((b) => b.status === "patio").length,
      beneficiado: allBales.filter((b) => b.status === "beneficiado").length,
      total: allBales.length,
    };
  }

  async getBaleStatsByTalhao(): Promise<any> {
    const allBales = await this.getAllBales();
    
    // Mapeamento de talhões para área em hectares (de shared/talhoes.ts)
    const talhaoAreas: Record<string, number> = {
      '1B': 774.90, '2B': 762.20, '3B': 661.00, '4B': 573.60, '5B': 472.60,
      '2A': 493.90, '3A': 338.50, '4A': 368.30, '5A': 493.00
    };
    
    const talhaoMap = new Map<string, Bale[]>();
    
    for (const bale of allBales) {
      const existing = talhaoMap.get(bale.talhao) || [];
      talhaoMap.set(bale.talhao, [...existing, bale]);
    }
    
    const statsMap: Record<string, any> = {};
    
    for (const [talhao, bales] of talhaoMap.entries()) {
      const sortedBales = [...bales].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const totalFardos = bales.length;
      const area = talhaoAreas[talhao] || 0;
      const produtividade = area > 0 ? totalFardos / area : 0;
      
      // Determinar status
      let status: 'em_colheita' | 'concluido' | 'nao_iniciado' = 'nao_iniciado';
      if (totalFardos > 0) {
        const ultimoFardo = sortedBales[0];
        const diasDesdeUltimo = (Date.now() - new Date(ultimoFardo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        status = diasDesdeUltimo > 7 ? 'concluido' : 'em_colheita';
      }
      
      statsMap[talhao] = {
        talhao,
        totalFardos,
        total: totalFardos, // Adicionar para compatibilidade com frontend
        produtividade: Math.round(produtividade * 100) / 100,
        area,
        ultimoFardo: sortedBales[0] ? {
          data: sortedBales[0].createdAt,
          numero: sortedBales[0].numero
        } : undefined,
        status,
        campo: bales.filter(b => b.status === "campo").length,
        patio: bales.filter(b => b.status === "patio").length,
        beneficiado: bales.filter(b => b.status === "beneficiado").length,
      };
    }
    
    return statsMap;
  }

  async getStatsBySafra() {
    const allBales = await this.getAllBales();
    
    const safraMap = new Map<string, Bale[]>();
    
    for (const bale of allBales) {
      const safra = bale.safra || "Sem Safra";
      const existing = safraMap.get(safra) || [];
      safraMap.set(safra, [...existing, bale]);
    }
    
    const stats = Array.from(safraMap.entries()).map(([safra, bales]) => ({
      safra,
      campo: bales.filter(b => b.status === "campo").length,
      patio: bales.filter(b => b.status === "patio").length,
      beneficiado: bales.filter(b => b.status === "beneficiado").length,
      total: bales.length,
    }));
    
    return stats.sort((a, b) => {
      if (a.safra === "Sem Safra") return 1;
      if (b.safra === "Sem Safra") return -1;
      return b.safra.localeCompare(a.safra); // Mais recente primeiro
    });
  }

  async deleteBale(id: string): Promise<void> {
    await db.delete(balesTable).where(eq(balesTable.id, id));
  }

  async deleteAllBales(): Promise<{ deletedCount: number }> {
    const result = await db.delete(balesTable).returning({ id: balesTable.id });
    // Também resetar contadores
    await db.delete(talhaoCountersTable);
    return { deletedCount: result.length };
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    return result[0];
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const now = new Date();
    const existing = await this.getSetting(key);

    if (existing) {
      const result = await db.update(settingsTable)
        .set({ value, updatedAt: now })
        .where(eq(settingsTable.key, key))
        .returning();
      return result[0];
    }

    const result = await db.insert(settingsTable).values({
      key,
      value,
      updatedAt: now,
    }).returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();