# 📱 Guia de Build do APK - Cotton App

## Métodos de Build

### 🚀 Método Rápido (Script Automatizado)

Use o script PowerShell `build-apk.ps1`:

```powershell
# APK de Debug (para testes)
.\build-apk.ps1 debug

# APK de Release (assinado, para produção)
.\build-apk.ps1 release

# AAB (Android App Bundle, para Play Store)
.\build-apk.ps1 bundle
```

O script automaticamente:
- ✅ Compila o frontend
- ✅ Sincroniza com Capacitor
- ✅ Gera o APK/AAB
- ✅ Abre a pasta com o arquivo gerado

---

### 🛠️ Método Manual

#### 1. **Build Debug (Testes)**

```powershell
# Compilar frontend
npm run build

# Sincronizar Capacitor
npx cap sync android

# Gerar APK debug
cd android
.\gradlew assembleDebug
cd ..

# APK gerado em: android\app\build\outputs\apk\debug\app-debug.apk
```

#### 2. **Build Release (Produção)**

```powershell
# Compilar frontend
npm run build

# Sincronizar Capacitor
npx cap sync android

# Gerar APK release
cd android
.\gradlew assembleRelease
cd ..

# APK gerado em: android\app\build\outputs\apk\release\app-release.apk
```

#### 3. **Build AAB (Play Store)**

```powershell
# Compilar frontend
npm run build

# Sincronizar Capacitor
npx cap sync android

# Gerar AAB
cd android
.\gradlew bundleRelease
cd ..

# AAB gerado em: android\app\build\outputs\bundle\release\app-release.aab
```

---

## 🔐 Configuração do Keystore (Primeira Vez)

### Se você ainda NÃO tem um keystore:

```powershell
cd android

# Gerar novo keystore
keytool -genkey -v -keystore progresso-cotton-release.keystore -alias progresso-cotton-key -keyalg RSA -keysize 2048 -validity 10000

cd ..
```

**Preencha:**
- Nome e sobrenome
- Organização: Progresso Cotton
- Cidade, Estado, País
- **IMPORTANTE:** Anote a senha (você vai precisar!)

### Atualizar `android/keystore.properties`:

```properties
storePassword=SUA_SENHA_AQUI
keyPassword=SUA_SENHA_AQUI
keyAlias=progresso-cotton-key
storeFile=progresso-cotton-release.keystore
```

⚠️ **NUNCA commite o arquivo `keystore.properties` ou o `.keystore`** (já estão no `.gitignore`)

---

## 📋 Checklist Antes de Gerar APK

- [ ] Código compilando sem erros (`npm run build`)
- [ ] Versão atualizada em `android/app/build.gradle` (versionCode e versionName)
- [ ] Keystore configurado (para release)
- [ ] Testes realizados em modo debug
- [ ] Changelog atualizado

---

## 🔢 Atualizar Versão do App

Edite `android/app/build.gradle`:

```groovy
defaultConfig {
    applicationId "com.progressocotton.app"
    versionCode 2        // ← Incrementar a cada build
    versionName "1.1.0"  // ← Versão legível (major.minor.patch)
}
```

**Regra:**
- `versionCode`: número inteiro sequencial (1, 2, 3...)
- `versionName`: versão semântica (1.0.0, 1.0.1, 1.1.0, 2.0.0)

---

## 🐛 Problemas Comuns

### "JAVA_HOME não configurado"

```powershell
# Execute o script de correção
.\android\run-fix-complete.ps1
```

### "Keystore not found"

- Verifique se `android/progresso-cotton-release.keystore` existe
- Verifique se `android/keystore.properties` está configurado
- Se não tiver keystore, gere um novo (veja seção acima)

### "Build failed"

```powershell
# Limpar build anterior
cd android
.\gradlew clean
cd ..

# Tentar novamente
.\build-apk.ps1 release
```

### "Out of memory"

Edite `android/gradle.properties` e aumente a memória:

```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

---

## 📤 Distribuir o APK

### Instalação Manual (Usuários Finais)

1. Compartilhe o arquivo `app-release.apk`
2. No Android: **Configurações > Segurança > Fontes desconhecidas** (permitir)
3. Abrir o APK no celular para instalar

### Google Play Store

1. Use o arquivo `.aab` (não `.apk`)
2. Acesse [Google Play Console](https://play.google.com/console)
3. Crie um novo release
4. Faça upload do `app-release.aab`

---

## 📊 Tamanho do APK

**Tamanhos esperados:**
- Debug: ~15-25 MB
- Release: ~8-15 MB (com minify)
- AAB: ~6-10 MB (Google otimiza por dispositivo)

Para reduzir tamanho:
- Habilitar `minifyEnabled true` em `build.gradle`
- Habilitar `shrinkResources true`
- Usar AAB ao invés de APK

---

## ✅ Comandos Úteis

```powershell
# Ver versão atual
Select-String -Path android\app\build.gradle -Pattern "versionCode|versionName"

# Listar dispositivos conectados
adb devices

# Instalar APK em dispositivo conectado
adb install android\app\build\outputs\apk\release\app-release.apk

# Ver logs do app em tempo real
adb logcat | Select-String "CottonApp"

# Limpar dados do app no dispositivo
adb shell pm clear com.progressocotton.app
```

---

## 📚 Recursos

- [Documentação Capacitor](https://capacitorjs.com/docs/android)
- [Guia de Assinatura Android](https://developer.android.com/studio/publish/app-signing)
- [Play Console](https://play.google.com/console)
