# 📱 Guia de Publicação na Google Play Store

## Passo 1: Criar a Keystore (Chave de Assinatura)

⚠️ **MUITO IMPORTANTE:** Guarde a keystore e as senhas em local seguro! Você precisará delas para TODAS as atualizações futuras.

Execute no terminal (PowerShell):

```powershell
cd android\app
keytool -genkeypair -v -storetype PKCS12 -keystore progresso-cotton-release.keystore -alias progresso-cotton-key -keyalg RSA -keysize 2048 -validity 10000
```

Será solicitado:
- **Senha da keystore** (crie uma senha forte, mínimo 6 caracteres)
- **Senha da chave** (pode ser a mesma)
- **Nome/Organização:** Grupo Progresso
- **Cidade:** [sua cidade]
- **Estado:** [seu estado]
- **Código do país:** BR

## Passo 2: Configurar as Senhas

Edite o arquivo `android/keystore.properties` e substitua com suas senhas:

```properties
storePassword=SUA_SENHA_DA_KEYSTORE
keyPassword=SUA_SENHA_DA_KEY
keyAlias=progresso-cotton-key
storeFile=progresso-cotton-release.keystore
```

⚠️ **NUNCA commite este arquivo no Git!**

## Passo 3: Gerar o App Bundle (AAB)

No terminal, execute:

```bash
cd android
./gradlew bundleRelease
```

Ou no Windows:

```bash
cd android
gradlew.bat bundleRelease
```

O arquivo AAB será gerado em:
`android/app/build/outputs/bundle/release/app-release.aab`

## Passo 4: Criar Conta no Google Play Console

1. Acesse: https://play.google.com/console
2. Crie uma conta de desenvolvedor (taxa única de $25 USD)
3. Preencha seus dados e aceite os termos

## Passo 5: Criar o App no Play Console

1. No Play Console, clique em **"Criar app"**
2. Preencha:
   - **Nome:** Progresso Cotton
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** Aplicativo
   - **Gratuito ou pago:** Gratuito
3. Aceite as declarações e clique em **Criar app**

## Passo 6: Preparar Assets da Play Store

Você vai precisar de:

### Ícone do App (obrigatório)
- **Tamanho:** 512 x 512 px
- **Formato:** PNG de 32 bits
- **Arquivo:** Use `client/public/favicon-512.png` ou crie um específico

### Screenshots (obrigatório - mínimo 2)
- **Tamanho:** Entre 320px e 3840px (qualquer lado)
- **Formato:** JPG ou PNG de 24 bits
- **Quantidade:** Mínimo 2, máximo 8

Como tirar screenshots:
1. Abra o app no emulador Android
2. No Android Studio: View → Tool Windows → Running Devices
3. Clique no ícone 📷 (camera) para capturar

### Feature Graphic (obrigatório)
- **Tamanho:** 1024 x 500 px
- **Formato:** JPG ou PNG de 24 bits
- Use um editor como Canva ou Photoshop

### Descrição Curta (obrigatório)
Máximo 80 caracteres:
```
Sistema de rastreabilidade de fardos de algodão do Grupo Progresso
```

### Descrição Completa (obrigatório)
Máximo 4000 caracteres - use o conteúdo do README.md como base.

## Passo 7: Configurar a Ficha da Loja

No Play Console → **Ficha da loja principal**:

1. **Detalhes do app:**
   - Nome do app: Progresso Cotton
   - Descrição curta e completa
   - Ícone do app (512x512)

2. **Elementos gráficos:**
   - Screenshots do celular (mínimo 2)
   - Feature graphic (1024x500)

3. **Categorização:**
   - Categoria: Produtividade ou Negócios
   - Tags: Agricultura, Rastreamento, Gestão

4. **Detalhes de contato:**
   - Email de contato
   - Site (opcional)
   - Política de privacidade (se coletar dados)

## Passo 8: Fazer Upload do AAB

1. No Play Console → **Produção** (ou **Teste interno** para testar primeiro)
2. Clique em **Criar nova versão**
3. Faça upload do arquivo `app-release.aab`
4. Preencha as **Notas da versão**:

```
Versão inicial do Progresso Cotton
- Rastreabilidade completa de fardos
- Sistema de QR Code
- Dashboard em tempo real
- Gestão de usuários e permissões
```

5. Clique em **Salvar** e depois **Revisar versão**

## Passo 9: Preencher Questionários Obrigatórios

Antes de publicar, você precisa preencher:

### Conteúdo do App
- Classificação etária
- Público-alvo
- Anúncios (Não contém anúncios)

### Privacidade e Segurança
- Política de privacidade (URL)
- Tipo de dados coletados
- Declaração de segurança de dados

### Países e Regiões
- Selecione: Brasil (ou outros países onde vai disponibilizar)

## Passo 10: Enviar para Revisão

1. Quando tudo estiver preenchido, clique em **Enviar para revisão**
2. O Google Play irá revisar seu app (pode levar de algumas horas a alguns dias)
3. Você receberá um email quando for aprovado

## Passo 11: Publicar

Após aprovação:
1. Vá em **Produção**
2. Clique em **Publicar**
3. Seu app ficará disponível na Play Store em algumas horas!

---

## 🔄 Como Atualizar o App no Futuro

1. Aumente o `versionCode` e `versionName` em `android/app/build.gradle`
2. Faça as alterações no código
3. Rebuild: `npm run build:android`
4. Gere novo AAB: `cd android && ./gradlew bundleRelease`
5. No Play Console, crie uma nova versão e faça upload do novo AAB

---

## ⚠️ Checklist Antes de Publicar

- [ ] Keystore criada e backup feito
- [ ] Senhas anotadas em local seguro
- [ ] AAB gerado com sucesso
- [ ] Ícone 512x512 pronto
- [ ] Mínimo 2 screenshots
- [ ] Feature graphic 1024x500 criado
- [ ] Descrições escritas
- [ ] Categoria selecionada
- [ ] Email de contato configurado
- [ ] Questionários preenchidos
- [ ] Testou o app completamente
- [ ] URL da API está apontando para produção (Railway)

---

## 📞 Suporte

- Google Play Console: https://support.google.com/googleplay/android-developer
- Developer Policy: https://play.google.com/about/developer-content-policy/

---

Boa sorte com a publicação! 🚀
