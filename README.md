# Progresso Cotton - Sistema de Rastreabilidade

Sistema completo de rastreabilidade de fardos de algodão desenvolvido para o Grupo Progresso, com interface web moderna e funcionalidades offline.

## Visão Geral

O Progresso Cotton é uma solução completa para gerenciamento e rastreamento de fardos de algodão desde a colheita até o beneficiamento, proporcionando total visibilidade da cadeia produtiva através de QR Codes e atualizações em tempo real.

## Funcionalidades Principais

### Rastreabilidade Completa
- **Geração de etiquetas com QR Code** único por fardo (formato: S25/26-T2B-00001)
- **Timeline de status**: Campo → Pátio → Beneficiado
- **Histórico completo** de movimentações com data, hora e responsável
- **Leitura de QR Code** via câmera do dispositivo

### Dashboard e Relatórios
- **Dashboard em tempo real** com:
  - Estatísticas de produção por status
  - Gráficos de fardos por talhão
  - Indicadores de produtividade
  - Atualizações automáticas via Server-Sent Events (SSE)
- **Relatórios personalizáveis** em PDF e Excel
- **Estatísticas por talhão** com visualização em mapas interativos

### Gestão de Campo
- **Criação de fardos em lote** (até 1000 por operação)
- **Numeração automática** sequencial por safra/talhão
- **Mapa interativo** de talhões com dados GeoJSON
- **Informações de área** em hectares por talhão

### Controle de Acesso
- **Sistema de autenticação** JWT com refresh tokens
- **5 níveis de permissão**:
  - `superadmin`: acesso total ao sistema
  - `admin`: gerenciamento de usuários e relatórios
  - `campo`: criação de etiquetas e registro de fardos
  - `transporte`: movimentação de fardos para o pátio
  - `algodoeira`: registro de beneficiamento
- **Rate limiting** para proteção contra força bruta (5 tentativas/15min)

### Modo Offline
- **Service Worker** com cache de recursos estáticos
- **Armazenamento local** para operações offline
- **Sincronização automática** ao retornar online
- **PWA** instalável em dispositivos móveis

## Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Vite** para build e HMR
- **TanStack Query (React Query)** para cache e sincronização
- **Wouter** para roteamento
- **Tailwind CSS** para estilização
- **Radix UI** para componentes acessíveis
- **Framer Motion** para animações
- **Recharts** para gráficos
- **Leaflet** para mapas interativos
- **html5-qrcode** para leitura de QR Codes
- **jsPDF** e **xlsx** para geração de relatórios

### Backend
- **Express.js** com TypeScript
- **Drizzle ORM** para acesso ao banco
- **PostgreSQL** para persistência
- **bcrypt** para hash de senhas (10 salt rounds)
- **jsonwebtoken** para autenticação
- **Zod** para validação de dados
- **Helmet.js** para segurança HTTP
- **express-rate-limit** para proteção contra abuso
- **WebSocket/SSE** para atualizações em tempo real

## Instalação e Configuração

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn
- PostgreSQL 12+ (local ou serviço cloud como Neon)

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/jonhvinnykkj/progresso-cotton.git
cd progresso-cotton
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=sua-chave-secreta-segura-aqui
JWT_REFRESH_SECRET=sua-chave-refresh-secreta-aqui

# Node Environment
NODE_ENV=development

# Server Port (opcional)
PORT=5000
```

4. **Inicialize o banco de dados**
```bash
# Cria as tabelas no banco
npm run db:push

# (Opcional) Popula com dados iniciais
npm run db:init
```

### Executando o Projeto

**Desenvolvimento (recomendado):**
```bash
npm run dev
```

Isso iniciará:
- **Cliente**: http://localhost:3000 (Vite + HMR)
- **Servidor**: http://localhost:5000 (Express + tsx)

**Apenas o frontend:**
```bash
npm run dev:client
```

**Apenas o backend:**
```bash
npm run dev:server
```

**Build para produção:**
```bash
npm run build
npm start
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia cliente e servidor simultaneamente |
| `npm run dev:client` | Apenas frontend (Vite) |
| `npm run dev:server` | Apenas backend (Express) |
| `npm run build` | Build do frontend para produção |
| `npm run preview` | Preview do build de produção |
| `npm run start` | Inicia servidor em modo produção |
| `npm run check` | Verificação de tipos TypeScript |
| `npm run db:push` | Aplica schema ao banco de dados |
| `npm run db:init` | Inicializa dados iniciais |
| `npm run db:migrate-passwords` | Migra senhas para bcrypt (uma vez) |

## Estrutura do Projeto

```
progresso-cotton-id/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── ui/         # Componentes Radix UI
│   │   │   ├── nav-sidebar.tsx
│   │   │   ├── qr-scanner.tsx
│   │   │   ├── bale-card.tsx
│   │   │   └── ...
│   │   ├── pages/          # Páginas da aplicação
│   │   │   ├── dashboard.tsx
│   │   │   ├── campo.tsx
│   │   │   ├── transporte.tsx
│   │   │   ├── algodoeira.tsx
│   │   │   ├── etiqueta.tsx
│   │   │   ├── reports.tsx
│   │   │   ├── user-management.tsx
│   │   │   └── settings.tsx
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilitários e contextos
│   │   └── App.tsx         # Componente principal
│   ├── public/             # Assets estáticos
│   │   ├── sw.js           # Service Worker
│   │   └── manifest.json   # PWA manifest
│   └── index.html
├── server/                 # Backend Express
│   ├── index.ts            # Servidor principal
│   ├── routes.ts           # Definição de rotas
│   ├── auth.ts             # Autenticação JWT
│   ├── storage.ts          # Camada de acesso aos dados
│   ├── db.ts               # Configuração Drizzle
│   ├── events.ts           # Server-Sent Events
│   ├── reports.ts          # Geração de relatórios
│   └── env.ts              # Validação de variáveis
├── shared/                 # Código compartilhado
│   ├── schema.ts           # Schemas Zod e Drizzle
│   └── talhoes.ts          # Dados de talhões
├── .env                    # Variáveis de ambiente (não versionado)
└── package.json
```

## Fluxo de Uso

### 1. Criação de Fardos (Campo)
- Usuário com papel `campo` acessa a página "Campo"
- Seleciona safra e talhão
- Define quantidade de fardos a criar
- Sistema gera etiquetas com QR Code único
- Fardos iniciam no status "campo"

### 2. Transporte (Pátio)
- Usuário com papel `transporte` acessa "Transporte"
- Escaneia QR Code do fardo
- Sistema move fardo para status "patio"
- Registra data, hora e responsável

### 3. Beneficiamento (Algodoeira)
- Usuário com papel `algodoeira` acessa "Algodoeira"
- Escaneia QR Code do fardo
- Sistema move fardo para status "beneficiado"
- Registra processamento completo

### 4. Acompanhamento
- Dashboard mostra estatísticas em tempo real
- Relatórios podem ser gerados por período, status ou talhão
- Mapas mostram distribuição geográfica da produção

## Segurança

O sistema implementa múltiplas camadas de segurança:

- **Autenticação JWT** com access (15min) e refresh tokens (7 dias)
- **Hash de senhas** com bcrypt e 10 salt rounds
- **Rate limiting** em rotas críticas (5 req/15min para login)
- **Helmet.js** para headers de segurança HTTP
- **CORS** configurável por ambiente
- **Validação de entrada** com Zod em todas as rotas
- **SQL Injection Protection** via Drizzle ORM
- **RBAC** (Role-Based Access Control) granular

### Migração de Segurança

Se você está atualizando de uma versão anterior com senhas em texto plano:

```bash
npm run db:migrate-passwords
```

Este comando deve ser executado **apenas uma vez** e converte todas as senhas existentes para bcrypt. Para mais detalhes, consulte [SECURITY.md](SECURITY.md).

## Atualizações em Tempo Real

O sistema usa **Server-Sent Events (SSE)** para atualizações automáticas:

- Novos fardos aparecem no dashboard automaticamente
- Mudanças de status refletem em todas as sessões ativas
- Notificações de versão para atualização do cliente
- Keepalive automático a cada 30 segundos

## PWA e Modo Offline

O sistema é uma Progressive Web App (PWA) completa:

- Instalável em dispositivos móveis e desktop
- Cache de assets estáticos via Service Worker
- Operação offline com sincronização posterior
- Ícones e splash screens personalizados

## Deploy

### Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://...
JWT_SECRET=chave-super-secreta-minimo-32-caracteres
JWT_REFRESH_SECRET=outra-chave-secreta-minimo-32-caracteres
NODE_ENV=production
```

### Deploy em Railway/Render

1. Configure as variáveis de ambiente
2. O build será executado automaticamente
3. O `Procfile` define o comando de start

### Deploy Manual

```bash
# Build do frontend
npm run build

# Inicia servidor em produção
npm start
```

O servidor serve os arquivos estáticos da pasta `dist/` e as rotas da API em `/api/*`.

## Desenvolvimento

### Hot Reload

O projeto está configurado com hot reload automático:
- **Frontend**: Vite HMR para mudanças instantâneas
- **Backend**: tsx watch para reload do servidor
- **Proxy**: Vite proxy redireciona `/api` para `http://localhost:5000`

### Type Checking

```bash
npm run check
```

Verifica tipos TypeScript em todo o projeto sem fazer build.

### Estrutura de Dados

**Formato do ID de Fardo:** `S{safra}-{talhao}-{numero}`

Exemplo: `S25/26-T2B-00042`
- `S25/26`: Safra 2025/2026
- `T2B`: Talhão 2B
- `00042`: Fardo número 42

**Status de Fardo:**
1. `campo`: Fardo criado no campo
2. `patio`: Transportado para o pátio
3. `beneficiado`: Processado na algodoeira

## 📚 Documentação

Toda a documentação técnica foi organizada na pasta [`docs/`](./docs/):

- **[Build e APK](./docs/BUILD_APK_GUIDE.md)** - Como gerar APK para Android
- **[Deploy](./docs/DEPLOY_GUIDE.md)** - Guia de deployment em produção
- **[Play Store](./docs/PLAY_STORE_GUIDE.md)** - Publicação na Google Play Store
- **[Modo Offline](./docs/OFFLINE_GUIDE.md)** - Sistema offline completo
- **[Segurança](./docs/SECURITY.md)** - Políticas e práticas de segurança
- **[Setup de Segurança](./docs/SETUP_SECURITY.md)** - Configuração inicial
- **[Changelog de Segurança](./docs/CHANGELOG_SECURITY.md)** - Histórico de alterações

📖 **[Ver índice completo da documentação →](./docs/README.md)**

## Suporte e Contribuição

Para reportar problemas ou sugerir melhorias, abra uma issue no repositório.

## Licença

MIT License - veja o arquivo LICENSE para detalhes.

## Autores

Desenvolvido para o Grupo Progresso - Sistema de Rastreabilidade de Algodão
