import type { Bale } from "@shared/schema";

const DB_NAME = "BaleTrackerOfflineDB";
const DB_VERSION = 3; // Incrementado para adicionar store de contadores
const STORE_NAME = "bales";
const PENDING_OPERATIONS_STORE = "pending_operations";
const COUNTERS_STORE = "talhao_counters";

interface PendingOperation {
  id: string;
  type: 'create' | 'update_status';
  data: any;
  createdAt: string;
  attemptCount?: number; // number of sync attempts
  lastAttempt?: string; // ISO timestamp of last attempt
  status?: 'pending' | 'failed' | 'done';
  // optional field to track server-assigned id when resolving conflicts
  resolvedServerId?: string;
}

interface TalhaoCounter {
  id: string; // safra-talhao (ex: "25/26-T1A")
  safra: string;
  talhao: string;
  lastNumber: number;
  updatedAt: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        // perform background cleanup of old pending operations
        this.cleanupOldPendingOperations().catch((e) => console.warn('Erro ao limpar operações antigas:', e));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create bales object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          objectStore.createIndex("status", "status", { unique: false });
          objectStore.createIndex("talhao", "talhao", { unique: false });
        }

        // Create pending operations store if it doesn't exist
        if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_OPERATIONS_STORE, { keyPath: "id" });
          pendingStore.createIndex("type", "type", { unique: false });
          pendingStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Create counters store if it doesn't exist
        if (!db.objectStoreNames.contains(COUNTERS_STORE)) {
          const countersStore = db.createObjectStore(COUNTERS_STORE, { keyPath: "id" });
          countersStore.createIndex("safra", "safra", { unique: false });
          countersStore.createIndex("talhao", "talhao", { unique: false });
        }
      };
    });
  }

  async saveBales(bales: Bale[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    console.log(`💾 Iniciando salvamento de ${bales.length} fardos no IndexedDB...`);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        console.log(`🗑️ Cache anterior limpo`);
        
        // Add all bales one by one to catch errors
        let addedCount = 0;
        let errorCount = 0;
        
        bales.forEach((bale, index) => {
          try {
            const addRequest = store.add({
              ...bale,
              _cachedAt: new Date().toISOString(),
            });
            
            addRequest.onsuccess = () => {
              addedCount++;
              if (index === 0 || index === bales.length - 1 || index % 50 === 0) {
                console.log(`✅ Fardo ${index + 1}/${bales.length} salvo: ${bale.id}`);
              }
            };
            
            addRequest.onerror = (event) => {
              errorCount++;
              console.error(`❌ Erro ao salvar fardo ${bale.id}:`, (event.target as any)?.error);
            };
          } catch (error) {
            errorCount++;
            console.error(`❌ Exceção ao adicionar fardo ${bale.id}:`, error);
          }
        });
      };
      
      clearRequest.onerror = () => {
        console.error(`❌ Erro ao limpar cache:`, clearRequest.error);
        reject(clearRequest.error);
      };

      transaction.oncomplete = () => {
        console.log(`💾 ✅ ${bales.length} fardos salvos no cache offline com sucesso`);
        resolve();
      };
      
      transaction.onerror = () => {
        console.error(`❌ Erro na transação:`, transaction.error);
        reject(transaction.error);
      };
      
      transaction.onabort = () => {
        console.error(`❌ Transação abortada:`, transaction.error);
        reject(new Error("Transaction aborted"));
      };
    });
  }

  async getAllBales(): Promise<Bale[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    console.log(`📦 Buscando fardos do cache IndexedDB...`);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const bales = request.result as Bale[];
        console.log(`📦 ✅ ${bales.length} fardos carregados do cache offline`);
        if (bales.length > 0) {
          console.log(`   Primeiro fardo: ${bales[0].id}`);
          console.log(`   Último fardo: ${bales[bales.length - 1].id}`);
        }
        resolve(bales);
      };
      request.onerror = () => {
        console.error(`❌ Erro ao buscar fardos do cache:`, request.error);
        reject(request.error);
      };
    });
  }

  async getBaleById(id: string): Promise<Bale | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateBaleStatus(id: string, status: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const bale = getRequest.result;
        if (bale) {
          bale.status = status;
          bale._updatedOfflineAt = new Date().toISOString();
          const updateRequest = store.put(bale);
          
          updateRequest.onsuccess = () => {
            console.log(`✅ Status do fardo ${id} atualizado no cache offline para: ${status}`);
            resolve();
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error(`Bale ${id} not found in offline storage`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getPendingUpdates(): Promise<Array<{ id: string; status: string; updatedAt: string }>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const bales = request.result as any[];
        const pending = bales
          .filter((bale) => bale._updatedOfflineAt)
          .map((bale) => ({
            id: bale.id,
            status: bale.status,
            updatedAt: bale._updatedOfflineAt,
          }));
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingUpdate(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const bale = getRequest.result;
        if (bale && bale._updatedOfflineAt) {
          delete bale._updatedOfflineAt;
          const updateRequest = store.put(bale);
          
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("🗑️ Cache offline limpo");
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Novos métodos para operações offline

  async savePendingOperation(operation: Omit<PendingOperation, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    // Simple quota check: avoid unbounded growth
    const pendingCount = await this.getPendingCount();
    const MAX_PENDING = 1000;
    if (pendingCount >= MAX_PENDING) {
      console.warn('❗ Pending operations quota exceeded');
      throw new Error('Capacidade offline cheia. Sincronize antes de adicionar mais operações.');
    }

    const id = `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], "readwrite");
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const request = store.add(pendingOp);

      request.onsuccess = () => {
        console.log(`✅ Operação pendente salva: ${operation.type}`, pendingOp.data);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Count pending operations
  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], "readonly");
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Remove pending operations older than `days` (default 7)
  async cleanupOldPendingOperations(days = 7): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let removed = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const request = store.openCursor();

      request.onsuccess = (evt) => {
        const cursor = (evt.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          const value = cursor.value as PendingOperation;
          const created = new Date(value.createdAt).getTime();
          if (created < cutoff) {
            cursor.delete();
            removed++;
          }
          cursor.continue();
        } else {
          resolve(removed);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], "readwrite");
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`✅ Operação pendente removida: ${id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingOperation(id: string, patch: Partial<PendingOperation>): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_OPERATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_OPERATIONS_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result as PendingOperation | undefined;
        if (!existing) return resolve();
        const updated: PendingOperation = { ...existing, ...patch };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async addBaleLocally(bale: Bale): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      // use put to allow upsert (replace temporary IDs when resolving conflicts)
      const request = store.put({
        ...bale,
        _createdOffline: true,
        _cachedAt: new Date().toISOString(),
      });

      request.onsuccess = () => {
        console.log(`✅ Fardo adicionado localmente: ${bale.id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Métodos para gerenciar contadores de talhão

  async syncCountersFromServer(counters: any[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COUNTERS_STORE], "readwrite");
      const store = transaction.objectStore(COUNTERS_STORE);

      // Limpar contadores antigos
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Adicionar novos contadores
        counters.forEach((counter) => {
          const talhaoCounter: TalhaoCounter = {
            id: `${counter.safra}-${counter.talhao}`,
            safra: counter.safra,
            talhao: counter.talhao,
            lastNumber: counter.lastNumber,
            updatedAt: new Date().toISOString(),
          };
          store.add(talhaoCounter);
        });

        console.log(`📊 ${counters.length} contadores sincronizados do servidor`);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCounter(safra: string, talhao: string): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COUNTERS_STORE], "readonly");
      const store = transaction.objectStore(COUNTERS_STORE);
      const id = `${safra}-${talhao}`;
      const request = store.get(id);

      request.onsuccess = () => {
        const counter = request.result as TalhaoCounter | undefined;
        const lastNumber = counter?.lastNumber || 0;
        console.log(`📊 Contador para ${id}: ${lastNumber}`);
        resolve(lastNumber);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async incrementCounter(safra: string, talhao: string): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COUNTERS_STORE], "readwrite");
      const store = transaction.objectStore(COUNTERS_STORE);
      const id = `${safra}-${talhao}`;
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const counter = getRequest.result as TalhaoCounter | undefined;
        const newNumber = (counter?.lastNumber || 0) + 1;

        const updatedCounter: TalhaoCounter = {
          id,
          safra,
          talhao,
          lastNumber: newNumber,
          updatedAt: new Date().toISOString(),
        };

        const putRequest = store.put(updatedCounter);

        putRequest.onsuccess = () => {
          console.log(`📊 Contador incrementado para ${id}: ${newNumber}`);
          resolve(newNumber);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getAllCounters(): Promise<TalhaoCounter[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([COUNTERS_STORE], "readonly");
      const store = transaction.objectStore(COUNTERS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
export type { TalhaoCounter };
