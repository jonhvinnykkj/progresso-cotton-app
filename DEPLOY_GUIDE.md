# 🚀 Guia de Deploy - Melhorias de Segurança

## ⚠️ IMPORTANTE: Leia Antes de Fazer Deploy!

Este guia ajuda você a fazer o deploy das melhorias de segurança sem quebrar a aplicação em produção.

---

## 📋 Checklist Pré-Deploy

### 1. Backend (Railway/Servidor)

- [ ] **Configurar `JWT_SECRET` no Railway**
  ```
  Railway → Seu Projeto → Variables
  Adicionar: JWT_SECRET=<seu-secret-gerado>
  ```

  Para gerar um secret seguro:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- [ ] **Configurar outras variáveis (opcional)**
  ```
  JWT_EXPIRES_IN=7d
  JWT_REFRESH_EXPIRES_IN=30d
  CORS_ORIGIN=https://seu-dominio.com  # ou deixe vazio
  ```

- [ ] **Fazer backup do banco de dados**
  ```bash
  # Conecte ao banco e faça backup
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

### 2. Migração de Senhas

**CRÍTICO:** Execute isto **APÓS** fazer deploy do backend:

```bash
# Opção 1: Via Railway CLI
railway run npm run db:migrate-passwords

# Opção 2: SSH no servidor e executar
ssh seu-servidor
npm run db:migrate-passwords
```

---

## 🔄 Estratégia de Deploy (Zero Downtime)

### Opção A: Deploy Completo (Recomendado)

**Passo a Passo:**

1. **Commit e Push do código**
   ```bash
   git add .
   git commit -m "feat: adiciona suporte a JWT no queryClient"
   git push origin main
   ```

2. **Configure variáveis no Railway**
   - Adicione `JWT_SECRET` nas variáveis de ambiente
   - NÃO reinicie ainda!

3. **Deploy do Backend**
   ```bash
   # Railway vai fazer deploy automaticamente do commit
   # Ou force um redeploy:
   railway up
   ```

4. **Aguarde deploy completar** (2-3 minutos)

5. **Execute migração de senhas**
   ```bash
   railway run npm run db:migrate-passwords
   ```

6. **Teste o backend**
   ```bash
   # Teste de login
   curl -X POST https://seu-app.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"sua-senha"}'

   # Deve retornar accessToken e refreshToken
   ```

7. **Deploy do Frontend** (se separado)
   ```bash
   npm run build
   # Upload dos arquivos de dist/ para seu hosting
   ```

8. **Teste completo**
   - Abra a aplicação
   - Faça login
   - Verifique se os tokens aparecem no localStorage
   - Teste criar/editar fardos

---

### Opção B: Deploy Gradual (Mais Seguro)

Se você quer garantir zero downtime:

1. **Mantenha backend compatível com ambos** (com e sem JWT)
2. Deploy backend primeiro
3. Execute migração de senhas
4. Deploy frontend depois
5. Monitore por 24h
6. Se tudo OK, remova código de compatibilidade

---

## 🔧 Configuração Railway

### Via Dashboard:

1. Acesse: https://railway.app/dashboard
2. Selecione seu projeto
3. Vá em **Variables**
4. Adicione:

```env
JWT_SECRET=y2gXVjWqd5tF2GOtfc7Y6hqxUC6lOYBYmg494HtzkB8=
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
NODE_ENV=production
```

5. Clique em **Deploy**

### Via Railway CLI:

```bash
railway variables set JWT_SECRET="y2gXVjWqd5tF2GOtfc7Y6hqxUC6lOYBYmg494HtzkB8="
railway variables set JWT_EXPIRES_IN="7d"
railway variables set JWT_REFRESH_EXPIRES_IN="30d"
```

---

## 🧪 Testes Pós-Deploy

### 1. Teste de Login

```bash
curl -X POST https://progresso-cottonv2-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha123"}'
```

**Resposta esperada:**
```json
{
  "id": "...",
  "username": "admin",
  "displayName": "Administrador",
  "availableRoles": ["superadmin"],
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### 2. Teste de Requisição Autenticada

```bash
# Substitua SEU_TOKEN pelo accessToken recebido acima
curl https://progresso-cottonv2-production.up.railway.app/api/bales \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta esperada:** Lista de fardos (não erro 401)

### 3. Teste de Rate Limiting

Tente fazer login com senha errada 6 vezes:

```bash
for i in {1..6}; do
  curl -X POST https://progresso-cottonv2-production.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"errado"}' \
    -w "\n"
  sleep 1
done
```

Na 6ª tentativa deve retornar erro de rate limit.

---

## 🐛 Resolução de Problemas

### ❌ Erro: "JWT_SECRET é obrigatória"

**Causa:** Variável não configurada no Railway

**Solução:**
```bash
railway variables set JWT_SECRET="seu-secret-aqui"
railway up
```

### ❌ Erro 401 após login

**Causa:** Senhas não foram migradas

**Solução:**
```bash
railway run npm run db:migrate-passwords
```

### ❌ Frontend não autentica

**Causa:** Frontend não está enviando tokens

**Solução:** Verifique se fez build da versão nova:
```bash
npm run build
# Deploy dos arquivos de dist/
```

### ❌ CORS error

**Causa:** CORS muito restritivo

**Solução:**
```bash
railway variables set CORS_ORIGIN=""  # Permite todas origens
# OU
railway variables set CORS_ORIGIN="https://seu-dominio.com"
```

### ❌ Usuários não conseguem logar

**Causa 1:** Senhas não migradas
```bash
railway run npm run db:migrate-passwords
```

**Causa 2:** JWT_SECRET errado ou mudou
```bash
# Todos usuários precisam fazer login novamente
# Verifique o JWT_SECRET no Railway
```

---

## 📊 Monitoramento Pós-Deploy

### Logs do Railway

```bash
railway logs
```

Procure por:
- ✅ `✅ Environment variables validated successfully`
- ✅ `🚀 Server running on...`
- ❌ Erros de JWT ou autenticação

### Métricas para Monitorar

- **Taxa de sucesso de login** (deve permanecer igual)
- **Tempo de resposta** (pode aumentar levemente devido a bcrypt)
- **Erros 401** (devem ser apenas de tokens expirados)
- **Erros 403** (devem ser apenas de falta de permissão)

---

## 🔄 Rollback (Se Necessário)

Se algo der errado:

### 1. Rollback Rápido (Railway)

```bash
# Via Dashboard:
Railway → Deployments → Selecione deploy anterior → Rollback

# Via CLI:
railway rollback
```

### 2. Rollback de Senhas

**NÃO É POSSÍVEL** fazer rollback de senhas hasheadas para texto plano!

**Alternativas:**
- Resetar senha de cada usuário manualmente
- Restaurar backup do banco de dados (perda de dados recentes)

---

## ✅ Deploy Bem-Sucedido!

Após deploy, você deve ter:

- [x] Backend rodando com JWT
- [x] Senhas hasheadas no banco
- [x] Frontend enviando tokens
- [x] Login funcionando normalmente
- [x] Rate limiting ativo
- [x] Headers de segurança (Helmet)
- [x] CORS configurado

---

## 📞 Suporte

Problemas durante o deploy?

1. Verifique os logs: `railway logs`
2. Teste endpoints individualmente
3. Consulte [SECURITY.md](SECURITY.md)
4. Verifique [CHANGELOG_SECURITY.md](CHANGELOG_SECURITY.md)

---

**Data:** 2025-01-27
**Versão:** 1.0.0 (Security Update)
