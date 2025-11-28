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
  type Notification,
  type CreateNotification,
  type ProducaoTalhao,
  type UpsertProducaoTalhao,
  type Carregamento,
  type CreateCarregamento,
  type RendimentoTalhao,
  type UpsertRendimentoTalhao,
  type Lote,
  type CreateLote,
  type UpdateLote,
  type Fardinho,
  type CreateFardinho,
  type UpdateFardinho,
  type TalhaoInfo,
  type Safra,
  type CreateSafra,
  type UpdateSafra,
  type TalhaoSafra,
  type CreateTalhaoSafra,
  type BatchCreateTalhoesSafra,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { users as usersTable, bales as balesTable, settings as settingsTable, talhaoCounters as talhaoCountersTable, notifications as notificationsTable, producaoTalhao as producaoTalhaoTable, carregamentos as carregamentosTable, rendimentoTalhao as rendimentoTalhaoTable, lotes as lotesTable, fardinhos as fardinhosTable, talhoesInfo as talhoesInfoTable, safras as safrasTable, talhoesSafra as talhoesSafraTable } from "@shared/schema";
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
  deleteAllData(): Promise<{ deletedCounts: Record<string, number> }>;

  // Talhao counter methods (contador único por safra)
  getOrCreateTalhaoCounter(safra: string): Promise<TalhaoCounter>;
  getNextBaleNumbers(safra: string, talhao: string, quantidade: number): Promise<string[]>;

  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;

  // Notification methods
  getActiveNotifications(): Promise<Notification[]>;
  createNotification(data: CreateNotification & { createdBy: string }): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // Produção por talhão methods (DEPRECATED)
  getProducaoByTalhao(safra: string, talhao: string): Promise<ProducaoTalhao | undefined>;
  getAllProducaoBySafra(safra: string): Promise<ProducaoTalhao[]>;
  upsertProducaoTalhao(data: UpsertProducaoTalhao, userId: string): Promise<ProducaoTalhao>;

  // Carregamentos methods
  getAllCarregamentosBySafra(safra: string): Promise<Carregamento[]>;
  getCarregamentosByTalhao(safra: string, talhao: string): Promise<Carregamento[]>;
  createCarregamento(data: CreateCarregamento, userId: string): Promise<Carregamento>;
  deleteCarregamento(id: string): Promise<void>;
  getPesoBrutoByTalhao(safra: string): Promise<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]>;

  // Rendimento Talhão methods
  getRendimentoByTalhao(safra: string, talhao: string): Promise<RendimentoTalhao | undefined>;
  getAllRendimentoBySafra(safra: string): Promise<RendimentoTalhao[]>;
  upsertRendimentoTalhao(data: UpsertRendimentoTalhao, userId: string): Promise<RendimentoTalhao>;

  // Lotes methods (beneficiamento)
  getAllLotesBySafra(safra: string): Promise<Lote[]>;
  getLoteById(id: string): Promise<Lote | undefined>;
  createLote(data: CreateLote, userId: string): Promise<Lote>;
  updateLote(id: string, data: UpdateLote, userId: string): Promise<Lote>;
  deleteLote(id: string): Promise<void>;
  getNextLoteNumber(safra: string): Promise<number>;
  getTotalPesoBrutoSafra(safra: string): Promise<number>;

  // Fardinhos methods (separado dos lotes)
  getAllFardinhosBySafra(safra: string): Promise<Fardinho[]>;
  createFardinho(data: CreateFardinho, userId: string): Promise<Fardinho>;
  updateFardinho(id: string, data: UpdateFardinho): Promise<Fardinho>;
  deleteFardinho(id: string): Promise<void>;
  getTotalFardinhosSafra(safra: string): Promise<number>;

  // Talhões Info methods
  getAllTalhoesInfo(): Promise<TalhaoInfo[]>;

  // Safras methods
  getAllSafras(): Promise<Safra[]>;
  getSafraById(id: string): Promise<Safra | undefined>;
  getSafraByNome(nome: string): Promise<Safra | undefined>;
  getSafraAtiva(): Promise<Safra | undefined>;
  createSafra(data: CreateSafra, userId: string): Promise<Safra>;
  updateSafra(id: string, data: UpdateSafra): Promise<Safra>;
  setActiveSafra(id: string): Promise<Safra>;
  deleteSafra(id: string): Promise<void>;

  // Talhões Safra methods
  getTalhoesBySafra(safraId: string): Promise<TalhaoSafra[]>;
  getTalhoesBySafraNome(safraNome: string): Promise<TalhaoSafra[]>;
  createTalhaoSafra(data: CreateTalhaoSafra, userId: string): Promise<TalhaoSafra>;
  batchCreateTalhoesSafra(data: BatchCreateTalhoesSafra, userId: string): Promise<TalhaoSafra[]>;
  deleteTalhoesBySafra(safraId: string): Promise<void>;
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

  async deleteAllData(): Promise<{ deletedCounts: Record<string, number> }> {
    const deletedCounts: Record<string, number> = {};

    // Delete all data from all tables
    const balesResult = await db.delete(balesTable).returning({ id: balesTable.id });
    deletedCounts.bales = balesResult.length;

    await db.delete(talhaoCountersTable);
    await db.delete(carregamentosTable);
    await db.delete(rendimentoTalhaoTable);
    await db.delete(lotesTable);
    await db.delete(fardinhosTable);
    await db.delete(producaoTalhaoTable);

    return { deletedCounts };
  }

  // Talhao counters methods
  async getAllTalhaoCounters(): Promise<TalhaoCounter[]> {
    return await db.select().from(talhaoCountersTable);
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

  // Notification methods
  async getActiveNotifications(): Promise<Notification[]> {
    try {
      const now = new Date();
      const result = await db
        .select()
        .from(notificationsTable)
        .where(
          sql`${notificationsTable.isActive} = 1 AND (${notificationsTable.expiresAt} IS NULL OR ${notificationsTable.expiresAt} > ${now})`
        )
        .orderBy(sql`${notificationsTable.createdAt} DESC`);
      return result;
    } catch (error) {
      // Tabela pode não existir ainda, retorna array vazio
      console.warn('⚠️ Notifications table may not exist:', error);
      return [];
    }
  }

  async createNotification(data: CreateNotification & { createdBy: string }): Promise<Notification> {
    try {
      const result = await db.insert(notificationsTable).values({
        title: data.title,
        message: data.message,
        type: data.type || "info",
        createdBy: data.createdBy,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: 1,
      }).returning();

      return result[0];
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw new Error('Tabela de notificações não existe. Execute as migrações primeiro.');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw new Error('Erro ao deletar notificação');
    }
  }

  // Produção por talhão methods
  async getProducaoByTalhao(safra: string, talhao: string): Promise<ProducaoTalhao | undefined> {
    try {
      const result = await db
        .select()
        .from(producaoTalhaoTable)
        .where(sql`${producaoTalhaoTable.safra} = ${safra} AND ${producaoTalhaoTable.talhao} = ${talhao}`)
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ producao_talhao table may not exist:', error);
      return undefined;
    }
  }

  async getAllProducaoBySafra(safra: string): Promise<ProducaoTalhao[]> {
    try {
      const result = await db
        .select()
        .from(producaoTalhaoTable)
        .where(eq(producaoTalhaoTable.safra, safra));
      return result;
    } catch (error) {
      console.warn('⚠️ producao_talhao table may not exist:', error);
      return [];
    }
  }

  async upsertProducaoTalhao(data: UpsertProducaoTalhao, userId: string): Promise<ProducaoTalhao> {
    const now = new Date();

    // Check if exists
    const existing = await this.getProducaoByTalhao(data.safra, data.talhao);

    if (existing) {
      // Update
      const result = await db
        .update(producaoTalhaoTable)
        .set({
          pesoBrutoTotal: data.pesoBrutoTotal,
          pesoPlumaTotal: data.pesoPlumaTotal,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(sql`${producaoTalhaoTable.safra} = ${data.safra} AND ${producaoTalhaoTable.talhao} = ${data.talhao}`)
        .returning();
      return result[0];
    }

    // Insert new
    const result = await db
      .insert(producaoTalhaoTable)
      .values({
        safra: data.safra,
        talhao: data.talhao,
        pesoBrutoTotal: data.pesoBrutoTotal,
        pesoPlumaTotal: data.pesoPlumaTotal,
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
      })
      .returning();

    return result[0];
  }

  // Carregamentos methods
  async getAllCarregamentosBySafra(safra: string): Promise<Carregamento[]> {
    try {
      const result = await db
        .select()
        .from(carregamentosTable)
        .where(eq(carregamentosTable.safra, safra))
        .orderBy(sql`${carregamentosTable.dataCarregamento} DESC`);
      return result;
    } catch (error) {
      console.warn('⚠️ carregamentos table may not exist:', error);
      return [];
    }
  }

  async getCarregamentosByTalhao(safra: string, talhao: string): Promise<Carregamento[]> {
    try {
      const result = await db
        .select()
        .from(carregamentosTable)
        .where(sql`${carregamentosTable.safra} = ${safra} AND ${carregamentosTable.talhao} = ${talhao}`)
        .orderBy(sql`${carregamentosTable.dataCarregamento} DESC`);
      return result;
    } catch (error) {
      console.warn('⚠️ carregamentos table may not exist:', error);
      return [];
    }
  }

  async createCarregamento(data: CreateCarregamento, userId: string): Promise<Carregamento> {
    try {
      const now = new Date();
      const dataCarregamento = data.dataCarregamento ? new Date(data.dataCarregamento) : now;

      console.log('Creating carregamento:', { data, userId });

      const result = await db
        .insert(carregamentosTable)
        .values({
          safra: data.safra,
          talhao: data.talhao,
          pesoKg: data.pesoKg,
          dataCarregamento,
          observacao: data.observacao || null,
          createdAt: now,
          createdBy: userId,
        })
        .returning();

      console.log('Carregamento created:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ Error creating carregamento:', error);
      throw error;
    }
  }

  async deleteCarregamento(id: string): Promise<void> {
    try {
      await db.delete(carregamentosTable).where(eq(carregamentosTable.id, id));
    } catch (error) {
      console.error('❌ Error deleting carregamento:', error);
      throw new Error('Erro ao deletar carregamento');
    }
  }

  async getPesoBrutoByTalhao(safra: string): Promise<{ talhao: string; pesoBrutoTotal: number; quantidadeCarregamentos: number }[]> {
    try {
      const result = await db
        .select({
          talhao: carregamentosTable.talhao,
          pesoBrutoTotal: sql<number>`COALESCE(SUM(CAST(${carregamentosTable.pesoKg} AS DECIMAL)), 0)`,
          quantidadeCarregamentos: sql<number>`COUNT(*)`,
        })
        .from(carregamentosTable)
        .where(eq(carregamentosTable.safra, safra))
        .groupBy(carregamentosTable.talhao);

      return result.map(r => ({
        talhao: r.talhao,
        pesoBrutoTotal: Number(r.pesoBrutoTotal) || 0,
        quantidadeCarregamentos: Number(r.quantidadeCarregamentos) || 0,
      }));
    } catch (error) {
      console.warn('⚠️ Error fetching peso bruto by talhao:', error);
      return [];
    }
  }

  // Rendimento Talhão methods
  async getRendimentoByTalhao(safra: string, talhao: string): Promise<RendimentoTalhao | undefined> {
    try {
      const result = await db
        .select()
        .from(rendimentoTalhaoTable)
        .where(sql`${rendimentoTalhaoTable.safra} = ${safra} AND ${rendimentoTalhaoTable.talhao} = ${talhao}`)
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ rendimento_talhao table may not exist:', error);
      return undefined;
    }
  }

  async getAllRendimentoBySafra(safra: string): Promise<RendimentoTalhao[]> {
    try {
      const result = await db
        .select()
        .from(rendimentoTalhaoTable)
        .where(eq(rendimentoTalhaoTable.safra, safra));
      return result;
    } catch (error) {
      console.warn('⚠️ rendimento_talhao table may not exist:', error);
      return [];
    }
  }

  async upsertRendimentoTalhao(data: UpsertRendimentoTalhao, userId: string): Promise<RendimentoTalhao> {
    const now = new Date();

    // Check if exists
    const existing = await this.getRendimentoByTalhao(data.safra, data.talhao);

    if (existing) {
      // Update
      const result = await db
        .update(rendimentoTalhaoTable)
        .set({
          rendimentoPluma: data.rendimentoPluma,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(sql`${rendimentoTalhaoTable.safra} = ${data.safra} AND ${rendimentoTalhaoTable.talhao} = ${data.talhao}`)
        .returning();
      return result[0];
    }

    // Insert new
    const result = await db
      .insert(rendimentoTalhaoTable)
      .values({
        safra: data.safra,
        talhao: data.talhao,
        rendimentoPluma: data.rendimentoPluma,
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
      })
      .returning();

    return result[0];
  }

  // Lotes methods (beneficiamento)
  async getAllLotesBySafra(safra: string): Promise<Lote[]> {
    try {
      const result = await db
        .select()
        .from(lotesTable)
        .where(eq(lotesTable.safra, safra))
        .orderBy(sql`${lotesTable.numeroLote} DESC`);
      return result;
    } catch (error) {
      console.warn('⚠️ lotes table may not exist:', error);
      return [];
    }
  }

  async getLoteById(id: string): Promise<Lote | undefined> {
    try {
      const result = await db
        .select()
        .from(lotesTable)
        .where(eq(lotesTable.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ lotes table may not exist:', error);
      return undefined;
    }
  }

  async getNextLoteNumber(safra: string): Promise<number> {
    try {
      const result = await db
        .select({
          maxNumero: sql<number>`COALESCE(MAX(${lotesTable.numeroLote}), 0)`,
        })
        .from(lotesTable)
        .where(eq(lotesTable.safra, safra));
      return (Number(result[0]?.maxNumero) || 0) + 1;
    } catch (error) {
      console.warn('⚠️ lotes table may not exist:', error);
      return 1;
    }
  }

  async getTotalPesoBrutoSafra(safra: string): Promise<number> {
    try {
      const result = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${carregamentosTable.pesoKg} AS DECIMAL)), 0)`,
        })
        .from(carregamentosTable)
        .where(eq(carregamentosTable.safra, safra));

      return Number(result[0]?.total) || 0;
    } catch (error) {
      console.warn('⚠️ Error fetching total peso bruto:', error);
      return 0;
    }
  }

  async createLote(data: CreateLote, userId: string): Promise<Lote> {
    try {
      const now = new Date();
      const dataProcessamento = data.dataProcessamento ? new Date(data.dataProcessamento) : now;
      const numeroLote = await this.getNextLoteNumber(data.safra);

      console.log('Creating lote:', { data, userId, numeroLote });

      const result = await db
        .insert(lotesTable)
        .values({
          safra: data.safra,
          numeroLote,
          pesoPluma: data.pesoPluma,
          qtdFardinhos: data.qtdFardinhos,
          dataProcessamento,
          observacao: data.observacao || null,
          createdAt: now,
          createdBy: userId,
          updatedAt: now,
        })
        .returning();

      console.log('Lote created:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ Error creating lote:', error);
      throw error;
    }
  }

  async updateLote(id: string, data: UpdateLote, userId: string): Promise<Lote> {
    try {
      const now = new Date();
      const updates: any = {
        updatedAt: now,
        updatedBy: userId,
      };

      if (data.pesoPluma !== undefined) {
        updates.pesoPluma = data.pesoPluma;
      }
      if (data.qtdFardinhos !== undefined) {
        updates.qtdFardinhos = data.qtdFardinhos;
      }
      if (data.dataProcessamento !== undefined) {
        updates.dataProcessamento = new Date(data.dataProcessamento);
      }
      if (data.observacao !== undefined) {
        updates.observacao = data.observacao;
      }

      const result = await db
        .update(lotesTable)
        .set(updates)
        .where(eq(lotesTable.id, id))
        .returning();

      if (!result[0]) {
        throw new Error('Lote não encontrado');
      }

      return result[0];
    } catch (error) {
      console.error('❌ Error updating lote:', error);
      throw error;
    }
  }

  async deleteLote(id: string): Promise<void> {
    try {
      await db.delete(lotesTable).where(eq(lotesTable.id, id));
    } catch (error) {
      console.error('❌ Error deleting lote:', error);
      throw new Error('Erro ao deletar lote');
    }
  }

  // Fardinhos methods (separado dos lotes)
  async getAllFardinhosBySafra(safra: string): Promise<Fardinho[]> {
    try {
      const result = await db
        .select()
        .from(fardinhosTable)
        .where(eq(fardinhosTable.safra, safra))
        .orderBy(sql`${fardinhosTable.dataRegistro} DESC`);
      return result;
    } catch (error) {
      console.warn('⚠️ fardinhos table may not exist:', error);
      return [];
    }
  }

  async createFardinho(data: CreateFardinho, userId: string): Promise<Fardinho> {
    try {
      const now = new Date();
      const dataRegistro = data.dataRegistro ? new Date(data.dataRegistro) : now;

      console.log('Creating fardinho:', { data, userId });

      const result = await db
        .insert(fardinhosTable)
        .values({
          safra: data.safra,
          quantidade: data.quantidade,
          dataRegistro,
          observacao: data.observacao || null,
          createdAt: now,
          createdBy: userId,
        })
        .returning();

      console.log('Fardinho created:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ Error creating fardinho:', error);
      throw error;
    }
  }

  async updateFardinho(id: string, data: UpdateFardinho): Promise<Fardinho> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.quantidade !== undefined) updateData.quantidade = data.quantidade;
      if (data.observacao !== undefined) updateData.observacao = data.observacao;

      const result = await db
        .update(fardinhosTable)
        .set(updateData)
        .where(eq(fardinhosTable.id, id))
        .returning();

      if (!result[0]) throw new Error('Fardinho não encontrado');
      return result[0];
    } catch (error) {
      console.error('❌ Error updating fardinho:', error);
      throw error;
    }
  }

  async deleteFardinho(id: string): Promise<void> {
    try {
      await db.delete(fardinhosTable).where(eq(fardinhosTable.id, id));
    } catch (error) {
      console.error('❌ Error deleting fardinho:', error);
      throw new Error('Erro ao deletar fardinho');
    }
  }

  async getTotalFardinhosSafra(safra: string): Promise<number> {
    try {
      const result = await db
        .select({
          total: sql<number>`COALESCE(SUM(${fardinhosTable.quantidade}), 0)`,
        })
        .from(fardinhosTable)
        .where(eq(fardinhosTable.safra, safra));
      return Number(result[0]?.total) || 0;
    } catch (error) {
      console.warn('⚠️ fardinhos table may not exist:', error);
      return 0;
    }
  }

  // Talhões Info methods
  async getAllTalhoesInfo(): Promise<TalhaoInfo[]> {
    try {
      const result = await db.select().from(talhoesInfoTable);
      return result;
    } catch (error) {
      console.warn('⚠️ talhoes_info table may not exist:', error);
      return [];
    }
  }

  // ==================== SAFRAS METHODS ====================

  async getAllSafras(): Promise<Safra[]> {
    try {
      const result = await db
        .select()
        .from(safrasTable)
        .orderBy(sql`${safrasTable.nome} DESC`);
      return result;
    } catch (error) {
      console.warn('⚠️ safras table may not exist:', error);
      return [];
    }
  }

  async getSafraById(id: string): Promise<Safra | undefined> {
    try {
      const result = await db
        .select()
        .from(safrasTable)
        .where(eq(safrasTable.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ safras table may not exist:', error);
      return undefined;
    }
  }

  async getSafraByNome(nome: string): Promise<Safra | undefined> {
    try {
      const result = await db
        .select()
        .from(safrasTable)
        .where(eq(safrasTable.nome, nome))
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ safras table may not exist:', error);
      return undefined;
    }
  }

  async getSafraAtiva(): Promise<Safra | undefined> {
    try {
      const result = await db
        .select()
        .from(safrasTable)
        .where(eq(safrasTable.isAtiva, 1))
        .limit(1);
      return result[0];
    } catch (error) {
      console.warn('⚠️ safras table may not exist:', error);
      return undefined;
    }
  }

  async createSafra(data: CreateSafra, userId: string): Promise<Safra> {
    try {
      const now = new Date();

      // Desativar outras safras se esta for a primeira
      const existingSafras = await this.getAllSafras();
      const isAtiva = existingSafras.length === 0 ? 1 : 0;

      const result = await db
        .insert(safrasTable)
        .values({
          nome: data.nome,
          descricao: data.descricao || null,
          isAtiva,
          createdAt: now,
          createdBy: userId,
          updatedAt: now,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('❌ Error creating safra:', error);
      throw error;
    }
  }

  async updateSafra(id: string, data: UpdateSafra): Promise<Safra> {
    try {
      const now = new Date();
      const updates: any = { updatedAt: now };

      if (data.descricao !== undefined) {
        updates.descricao = data.descricao;
      }
      if (data.isAtiva !== undefined) {
        updates.isAtiva = data.isAtiva;
      }

      const result = await db
        .update(safrasTable)
        .set(updates)
        .where(eq(safrasTable.id, id))
        .returning();

      if (!result[0]) {
        throw new Error('Safra não encontrada');
      }

      return result[0];
    } catch (error) {
      console.error('❌ Error updating safra:', error);
      throw error;
    }
  }

  async setActiveSafra(id: string): Promise<Safra> {
    try {
      const now = new Date();

      // Desativar todas as outras safras
      await db
        .update(safrasTable)
        .set({ isAtiva: 0, updatedAt: now });

      // Ativar a safra selecionada
      const result = await db
        .update(safrasTable)
        .set({ isAtiva: 1, updatedAt: now })
        .where(eq(safrasTable.id, id))
        .returning();

      if (!result[0]) {
        throw new Error('Safra não encontrada');
      }

      return result[0];
    } catch (error) {
      console.error('❌ Error setting active safra:', error);
      throw error;
    }
  }

  async deleteSafra(id: string): Promise<void> {
    try {
      // Talhões serão deletados automaticamente (cascade)
      await db.delete(safrasTable).where(eq(safrasTable.id, id));
    } catch (error) {
      console.error('❌ Error deleting safra:', error);
      throw new Error('Erro ao deletar safra');
    }
  }

  // ==================== TALHÕES SAFRA METHODS ====================

  async getTalhoesBySafra(safraId: string): Promise<TalhaoSafra[]> {
    try {
      const result = await db
        .select()
        .from(talhoesSafraTable)
        .where(eq(talhoesSafraTable.safraId, safraId))
        .orderBy(sql`${talhoesSafraTable.nome} ASC`);
      return result;
    } catch (error) {
      console.warn('⚠️ talhoes_safra table may not exist:', error);
      return [];
    }
  }

  async getTalhoesBySafraNome(safraNome: string): Promise<TalhaoSafra[]> {
    try {
      const safra = await this.getSafraByNome(safraNome);
      if (!safra) {
        return [];
      }
      return this.getTalhoesBySafra(safra.id);
    } catch (error) {
      console.warn('⚠️ Error getting talhoes by safra nome:', error);
      return [];
    }
  }

  async createTalhaoSafra(data: CreateTalhaoSafra, userId: string): Promise<TalhaoSafra> {
    try {
      const now = new Date();

      const result = await db
        .insert(talhoesSafraTable)
        .values({
          safraId: data.safraId,
          nome: data.nome,
          hectares: data.hectares,
          geometry: data.geometry,
          centroid: data.centroid || null,
          cultura: data.cultura || 'algodao',
          createdAt: now,
          createdBy: userId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('❌ Error creating talhao safra:', error);
      throw error;
    }
  }

  async batchCreateTalhoesSafra(data: BatchCreateTalhoesSafra, userId: string): Promise<TalhaoSafra[]> {
    try {
      const now = new Date();

      const values = data.talhoes.map(talhao => ({
        safraId: data.safraId,
        nome: talhao.nome,
        hectares: talhao.hectares,
        geometry: talhao.geometry,
        centroid: talhao.centroid || null,
        cultura: 'algodao',
        createdAt: now,
        createdBy: userId,
      }));

      const result = await db
        .insert(talhoesSafraTable)
        .values(values)
        .returning();

      return result;
    } catch (error) {
      console.error('❌ Error batch creating talhoes safra:', error);
      throw error;
    }
  }

  async deleteTalhoesBySafra(safraId: string): Promise<void> {
    try {
      await db.delete(talhoesSafraTable).where(eq(talhoesSafraTable.safraId, safraId));
    } catch (error) {
      console.error('❌ Error deleting talhoes safra:', error);
      throw new Error('Erro ao deletar talhões da safra');
    }
  }

  // Método para atualizar a configuração de safra padrão (migrar para novo sistema)
  async syncSafraWithSettings(): Promise<void> {
    try {
      // Verificar se existe configuração de safra no settings antigo
      const defaultSafraSetting = await this.getSetting('defaultSafra');
      if (defaultSafraSetting) {
        // Verificar se essa safra já existe no novo sistema
        const existingSafra = await this.getSafraByNome(defaultSafraSetting.value);
        if (!existingSafra) {
          // Criar a safra no novo sistema
          console.log(`📦 Migrando safra ${defaultSafraSetting.value} para novo sistema...`);
          await this.createSafra({ nome: defaultSafraSetting.value }, 'system');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error syncing safra with settings:', error);
    }
  }
}

export const storage = new PostgresStorage();