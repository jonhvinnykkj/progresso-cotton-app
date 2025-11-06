import type { Bale } from "@shared/schema";

const DB_NAME = "BaleTrackerOfflineDB";
const DB_VERSION = 2; // Incrementado para adicionar nova store
const STORE_NAME = "bales";
const PENDING_OPERATIONS_STORE = "pending_operations";

interface PendingOperation {
  id: string;
  type: 'create' | 'update_status';
  data: any;
  createdAt: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
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

    const id = `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingOp: PendingOperation = {
      ...operation,
      id,
      createdAt: new Date().toISOString(),
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

  async addBaleLocally(bale: Bale): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({
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
}

export const offlineStorage = new OfflineStorage();
