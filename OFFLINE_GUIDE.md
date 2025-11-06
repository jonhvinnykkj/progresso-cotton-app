# Sistema de Funcionalidade Offline

## Visão Geral

O aplicativo agora suporta operações offline completas para Campo, Transporte e Algodoeira. Quando não há conexão com internet, as operações são salvas localmente no IndexedDB e sincronizadas automaticamente quando a conexão é restaurada.

## Componentes Criados

### 1. **offline-storage.ts**

Gerenciamento do IndexedDB com duas stores:

- `bales`: Cache local de fardos
- `pending_operations`: Fila de operações para sincronizar

**Principais métodos:**

- `savePendingOperation()` - Salva operação para sincronizar depois
- `getAllPendingOperations()` - Lista operações pendentes
- `removePendingOperation()` - Remove operação após sync bem-sucedida
- `addBaleLocally()` - Adiciona fardo ao cache local
- `updateBaleStatus()` - Atualiza status localmente

### 2. **use-offline-sync.ts**

Hook que gerencia a sincronização automática:

- Detecta quando o dispositivo volta online (`window.addEventListener('online')`)
- Sincroniza todas as operações pendentes automaticamente
- Exibe toast de feedback ao usuário
- Invalida queries do TanStack Query para atualizar UI

### 3. **use-offline-bale-creation.ts**

Hook para criação de fardos (usado em Campo):

- `createBale()` - Cria fardo individual
- `createBatch()` - Cria lote de fardos

**Comportamento:**

- Tenta criar online primeiro
- Se offline ou falhar, salva localmente
- Adiciona ao cache local para aparecer na UI imediatamente
- Exibe toast diferente para operações offline vs online

### 4. **use-offline-status-update.ts**

Hook para atualização de status (usado em Transporte e Algodoeira):

- `updateStatus()` - Atualiza status do fardo

**Comportamento:**

- Tenta atualizar online primeiro
- Se offline ou falhar, salva localmente
- Atualiza cache local para refletir mudança na UI
- Exibe toast apropriado

## Como Usar

### Em Campo (criar fardos)

```typescript
import { useOfflineBaleCreation } from "@/hooks/use-offline-bale-creation";

function Campo() {
  const { createBale, createBatch } = useOfflineBaleCreation();

  // Criar fardo individual
  const handleCreate = () => {
    createBale.mutate({
      id: "S25/26-T1A-00001",
      safra: "S25/26",
      talhao: "T1A",
      numero: 1,
    });
  };

  // Criar lote
  const handleBatch = () => {
    createBatch.mutate({
      safra: "S25/26",
      talhao: "T1A",
      quantidade: 50,
    });
  };
}
```

### Em Transporte/Algodoeira (atualizar status)

```typescript
import { useOfflineStatusUpdate } from "@/hooks/use-offline-status-update";

function Transporte() {
  const { updateStatus } = useOfflineStatusUpdate();

  const handleScan = (baleId: string) => {
    updateStatus.mutate({
      id: baleId,
      status: "patio",
      userId: user.id,
    });
  };
}
```

## Fluxo de Sincronização

1. **Operação Offline:**

   - Usuário tenta criar/atualizar fardo
   - Sistema detecta que está offline
   - Salva em `pending_operations` no IndexedDB
   - Adiciona/atualiza no cache local de `bales`
   - Exibe toast: "Salvo localmente, será sincronizado..."

2. **Volta Online:**

   - Event listener detecta `window.addEventListener('online')`
   - Hook `useOfflineSync` dispara automaticamente
   - Processa cada operação em `pending_operations`:
     - `type: 'create'` → POST `/api/bales`
     - `type: 'update_status'` → PATCH `/api/bales/:id/status`
   - Se sucesso, remove da fila
   - Se erro, mantém na fila para próxima tentativa

3. **Feedback ao Usuário:**
   - Toast de sucesso: "X operações sincronizadas"
   - Toast de erro: "X operações falharam"
   - UI atualizada automaticamente via `queryClient.invalidateQueries()`

## Estrutura do IndexedDB

### Store: `bales`

```typescript
{
  id: string,              // QR Code do fardo
  safra: string,
  talhao: string,
  numero: number,
  status: 'campo' | 'patio' | 'beneficiado',
  createdAt: Date,
  _cachedAt: string,       // Quando foi cacheado
  _createdOffline?: boolean, // Se foi criado offline
  _updatedOfflineAt?: string // Se foi atualizado offline
}
```

### Store: `pending_operations`

```typescript
{
  id: string,                          // Identificador único da operação
  type: 'create' | 'update_status',    // Tipo de operação
  data: any,                           // Dados da operação
  createdAt: string                    // Timestamp ISO
}
```

## Integração no App

O hook `useOfflineSync` é chamado no `RealtimeProvider` do `App.tsx`:

```typescript
function RealtimeProvider() {
  useRealtime(isAuthenticated);
  useVersionCheck();
  useOfflineSync(); // <- Sincronização automática
  useProductivityMonitor();
  useNotifications();
  return null;
}
```

## Benefícios

✅ **Trabalho Ininterrupto:** Usuários podem trabalhar sem conexão  
✅ **Sincronização Automática:** Não precisa ação manual  
✅ **Feedback Claro:** Toasts indicam operações offline vs online  
✅ **UI Responsiva:** Mudanças aparecem imediatamente no cache local  
✅ **Recuperação de Erros:** Operações falhadas ficam na fila para retry

## Próximos Passos

Para integrar nas páginas:

1. **Campo** (`campo.tsx`): Substituir mutations atuais por `useOfflineBaleCreation`
2. **Transporte** (`transporte.tsx`): Substituir mutation por `useOfflineStatusUpdate`
3. **Algodoeira** (`algodoeira.tsx`): Substituir mutation por `useOfflineStatusUpdate`

Isso permitirá que os três módulos funcionem completamente offline!
