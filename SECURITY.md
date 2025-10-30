# Guia de Segurança - Progresso Cotton ID

## 🔒 Melhorias de Segurança Implementadas

### Autenticação e Autorização

#### 1. Hash de Senhas com Bcrypt
- ✅ Senhas não são mais armazenadas em texto plano
- ✅ Utiliza bcrypt com 10 salt rounds
- ✅ Comparação segura de senhas durante login

#### 2. JWT (JSON Web Tokens)
- ✅ Access tokens com duração configurável (padrão: 7 dias)
- ✅ Refresh tokens com duração estendida (padrão: 30 dias)
- ✅ Tokens assinados com secret key
- ✅ Validação automática de expiração

#### 3. Middlewares de Segurança

**Autenticação (`authenticateToken`)**
- Valida token JWT em todas as rotas protegidas
- Retorna erro 401 se token ausente ou inválido
- Retorna erro 403 se token expirado

**Autorização (`authorizeRoles`)**
- Verifica se usuário possui papel (role) necessário
- Superadmin tem acesso automático a todas as rotas
- Validação granular por endpoint

#### 4. Rate Limiting
- Limite de 5 tentativas de login a cada 15 minutos
- Previne ataques de força bruta
- Mensagens claras sobre tempo de espera

#### 5. Helmet.js
- Headers de segurança HTTP configurados
- Content Security Policy (CSP)
- Proteção contra clickjacking
- Desabilita informações desnecessárias

#### 6. CORS
- Configuração de origens permitidas
- Suporte a credenciais
- Configurável via variável de ambiente

---

## 🚀 Migração de Senhas Existentes

Se você já possui usuários no banco de dados com senhas em texto plano, execute:

```bash
npm run db:migrate-passwords
```

Este script:
- Busca todos os usuários
- Identifica senhas em texto plano
- Converte para bcrypt hash
- Mantém as senhas originais (funcionam igual após hash)

**IMPORTANTE:** Execute este script **apenas uma vez** após implantar as melhorias de segurança.

---

## 🔐 Configuração de Produção

### 1. Gerar JWT Secret Seguro

```bash
# Gerar um secret de 32 bytes (recomendado)
openssl rand -base64 32
```

Adicione o secret gerado no arquivo `.env`:

```env
JWT_SECRET=seu-secret-gerado-aqui-com-no-minimo-32-caracteres
```

### 2. Configurar Variáveis de Ambiente

```env
# Obrigatório
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-min-32-chars

# Opcional (com defaults)
NODE_ENV=production
PORT=5000
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://seu-dominio.com
```

### 3. Validação de Ambiente

O servidor valida automaticamente as variáveis de ambiente no startup:
- ❌ Falha se `DATABASE_URL` não estiver configurada
- ⚠️  Avisa se `JWT_SECRET` não estiver configurada em produção
- ✅ Usa defaults seguros quando aplicável

---

## 🛡️ Matriz de Permissões por Papel (Role)

| Endpoint | Superadmin | Admin | Campo | Transporte | Algodoeira |
|----------|-----------|-------|-------|------------|-----------|
| GET /api/users | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /api/users | ✅ | ❌ | ❌ | ❌ | ❌ |
| PATCH /api/users/:id/roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| DELETE /api/users/:id | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /api/bales | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /api/bales | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST /api/bales/batch | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /api/bales/:id/status (patio) | ✅ | ✅ | ❌ | ✅ | ❌ |
| PATCH /api/bales/:id/status (beneficiado) | ✅ | ✅ | ❌ | ❌ | ✅ |
| DELETE /api/bales/:id | ✅ | ✅ | ❌ | ❌ | ❌ |
| DELETE /api/bales/all | ✅ | ❌ | ❌ | ❌ | ❌ |
| PUT /api/settings/default-safra | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /api/reports/* | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 Como Funciona a Autenticação

### 1. Login
```
Cliente → POST /api/auth/login { username, password }
Servidor → Verifica senha com bcrypt
Servidor → Gera accessToken e refreshToken
Servidor → Retorna { user, accessToken, refreshToken }
Cliente → Armazena tokens em localStorage
```

### 2. Requisições Autenticadas
```
Cliente → Adiciona header: Authorization: Bearer <accessToken>
Servidor → Valida token JWT
Servidor → Verifica papéis/roles se necessário
Servidor → Processa requisição
```

### 3. Token Expirado
```
Cliente → Requisição com token expirado
Servidor → Retorna 401 { code: "TOKEN_EXPIRED" }
Cliente → Redireciona para login
Cliente → Limpa tokens do localStorage
```

---

## 📋 Checklist de Segurança para Produção

- [ ] Gerar e configurar `JWT_SECRET` forte (mínimo 32 caracteres)
- [ ] Executar `npm run db:migrate-passwords` para converter senhas existentes
- [ ] Configurar `CORS_ORIGIN` com domínio específico
- [ ] Habilitar HTTPS no servidor
- [ ] Configurar firewall para proteger porta do banco de dados
- [ ] Revisar e ajustar políticas CSP no Helmet conforme necessário
- [ ] Implementar monitoramento de tentativas de login falhadas
- [ ] Configurar rotação de logs
- [ ] Implementar backup automático do banco de dados
- [ ] Testar todos os endpoints com diferentes papéis

---

## 🚨 Resposta a Incidentes

### Token Comprometido
1. Revogue todos os tokens do usuário (atualmente requer mudança de `JWT_SECRET`)
2. Force logout de todos os usuários
3. Investigue logs de acesso
4. Notifique usuários afetados

### Senha Comprometida
1. Usuário deve alterar senha imediatamente
2. Revogue tokens ativos
3. Verifique atividades suspeitas nos logs

### Banco de Dados Comprometido
1. As senhas estão protegidas por bcrypt (não são reversíveis)
2. Mude `JWT_SECRET` para invalidar todos os tokens
3. Notifique todos os usuários para trocar senhas
4. Restaure backup do banco se necessário

---

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Helmet.js](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
