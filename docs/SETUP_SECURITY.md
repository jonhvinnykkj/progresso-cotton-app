# 🔒 Guia de Configuração de Segurança

## ✅ Seu .env está configurado!

Eu já configurei o arquivo `.env` com todas as variáveis necessárias. Aqui está o que foi adicionado:

### 📋 Variáveis Configuradas

```env
# 🔒 Security - JWT Authentication
JWT_SECRET=y2gXVjWqd5tF2GOtfc7Y6hqxUC6lOYBYmg494HtzkB8=  # ✅ Gerado automaticamente
JWT_EXPIRES_IN=7d                                      # ✅ Tokens expiram em 7 dias
JWT_REFRESH_EXPIRES_IN=30d                             # ✅ Refresh tokens em 30 dias
CORS_ORIGIN=                                           # ✅ Vazio = permite todas as origens em dev
```

---

## 🚀 Próximos Passos

### 1️⃣ Verificar se o servidor está parado

Se o servidor estiver rodando, pare-o (`Ctrl+C`) e reinicie depois.

### 2️⃣ Migrar senhas existentes (IMPORTANTE!)

Se você já tem usuários no banco de dados, execute este comando **UMA VEZ**:

```bash
npm run db:migrate-passwords
```

**O que este comando faz:**
- Busca todos os usuários no banco
- Identifica senhas em texto plano
- Converte para bcrypt hash
- **As senhas dos usuários continuam as mesmas!** Apenas o formato de armazenamento muda.

**Exemplo de saída esperada:**
```
🔄 Iniciando migração de senhas...

📊 Encontrados 5 usuário(s) no banco de dados.

✅ Senha do usuário "admin" migrada com sucesso.
✅ Senha do usuário "campo01" migrada com sucesso.
✅ Senha do usuário "transporte01" migrada com sucesso.

==================================================
✅ Migração concluída com sucesso!
   - 3 senha(s) migrada(s)
   - 0 senha(s) já estavam hasheadas
==================================================
```

### 3️⃣ Reiniciar o servidor

```bash
npm run dev
```

### 4️⃣ Testar o login

1. Abra o navegador em `http://localhost:3000`
2. Faça login com suas credenciais normais
3. Se tudo estiver correto, você verá que o login funciona normalmente!

---

## 🧪 Como Testar se está Funcionando

### Teste 1: Login Bem-Sucedido

1. Abra as **DevTools** do navegador (F12)
2. Vá na aba **Console**
3. Faça login
4. Você deve ver os tokens no `localStorage`:

```javascript
// Verifique no console:
localStorage.getItem('cotton_access_token')
// Deve retornar algo como: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Teste 2: Rate Limiting

Tente fazer login com senha errada 6 vezes seguidas. Na 6ª tentativa você deve ver:

```
❌ Muitas tentativas de login. Tente novamente em 15 minutos.
```

### Teste 3: Token JWT Válido

Abra as **DevTools** → **Network** tab e faça uma requisição (ex: carregar fardos).

Verifique os **Request Headers** e você verá:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔧 Resolução de Problemas

### ❌ Problema: "JWT_SECRET é obrigatória"

**Solução:** Verifique se o `.env` tem a linha:
```env
JWT_SECRET=y2gXVjWqd5tF2GOtfc7Y6hqxUC6lOYBYmg494HtzkB8=
```

Reinicie o servidor após adicionar.

### ❌ Problema: "Credenciais inválidas" após migração

**Causa:** A migração não foi executada ou falhou.

**Solução:**
1. Execute novamente: `npm run db:migrate-passwords`
2. Verifique se não há erros no console
3. Se persistir, verifique a conexão com o banco de dados

### ❌ Problema: Token expirado mesmo após login

**Causa:** JWT_SECRET pode ter mudado entre o login e a requisição.

**Solução:**
1. Faça logout
2. Limpe o localStorage: `localStorage.clear()`
3. Faça login novamente

### ❌ Problema: CORS error no navegador

**Causa:** Configuração de CORS muito restritiva.

**Solução:** Em desenvolvimento, deixe `CORS_ORIGIN` vazio no `.env`:
```env
CORS_ORIGIN=
```

---

## 📊 Comparação: Antes vs Depois

### Antes da Migração:
```javascript
// Senha no banco:
{ username: "admin", password: "senha123" }  // ❌ Texto plano
```

### Depois da Migração:
```javascript
// Senha no banco:
{
  username: "admin",
  password: "$2b$10$N9qo8uLOickgx2ZMRZoMye..." // ✅ Hash bcrypt
}

// Mas o usuário ainda usa "senha123" para fazer login!
```

---

## 🎯 Para Produção

Quando for fazer deploy em produção:

### 1. Gere um novo JWT_SECRET

```bash
# No terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Configure CORS

```env
CORS_ORIGIN=https://seu-dominio.com
```

### 3. Configure NODE_ENV

```env
NODE_ENV=production
```

### 4. Use HTTPS

Certifique-se de que seu servidor está usando HTTPS em produção.

---

## 📝 Checklist de Verificação

- [ ] `.env` tem `JWT_SECRET` configurado
- [ ] Executei `npm run db:migrate-passwords` (se tinha usuários)
- [ ] Servidor reiniciado com `npm run dev`
- [ ] Consegui fazer login com sucesso
- [ ] Tokens aparecem no localStorage
- [ ] Rate limiting funciona (testei 6 tentativas erradas)
- [ ] Headers de autorização aparecem nas requisições

---

## ✅ Tudo Pronto!

Se todos os testes passaram, parabéns! 🎉

Seu sistema agora está protegido com:
- ✅ Senhas hasheadas com bcrypt
- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Headers de segurança (Helmet)
- ✅ Autorização baseada em papéis
- ✅ Validação de ambiente

---

## 🆘 Precisa de Ajuda?

Se algo não estiver funcionando:

1. Verifique os logs do servidor no terminal
2. Verifique o console do navegador (F12)
3. Consulte [SECURITY.md](SECURITY.md) para documentação detalhada
4. Revise [CHANGELOG_SECURITY.md](CHANGELOG_SECURITY.md) para ver todas as mudanças

---

**Data de Configuração:** 2025-01-27
