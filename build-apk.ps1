# Script para gerar APK do Cotton App
# Uso: .\build-apk.ps1 [debug|release|bundle]

param(
    [Parameter(Position=0)]
    [ValidateSet('debug', 'release', 'bundle')]
    [string]$BuildType = 'debug'
)

Write-Host "🚀 Iniciando build do Cotton App - Tipo: $BuildType" -ForegroundColor Green
Write-Host ""

# 1. Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# 2. Build do frontend
Write-Host "🔨 Compilando frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao compilar frontend!" -ForegroundColor Red
    exit 1
}

# 3. Sincronizar com Capacitor
Write-Host "🔄 Sincronizando Capacitor..." -ForegroundColor Cyan
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao sincronizar Capacitor!" -ForegroundColor Red
    exit 1
}

# 4. Build do Android
Write-Host "📱 Gerando APK..." -ForegroundColor Cyan
Set-Location android

switch ($BuildType) {
    'debug' {
        Write-Host "🛠️ Build DEBUG" -ForegroundColor Yellow
        .\gradlew assembleDebug
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    }
    'release' {
        Write-Host "🚀 Build RELEASE (assinado)" -ForegroundColor Yellow
        
        # Verificar se keystore existe
        if (-not (Test-Path "progresso-cotton-release.keystore")) {
            Write-Host "⚠️ AVISO: keystore não encontrado!" -ForegroundColor Red
            Write-Host "O APK será gerado mas não estará assinado." -ForegroundColor Yellow
        }
        
        .\gradlew assembleRelease
        $apkPath = "app\build\outputs\apk\release\app-release.apk"
    }
    'bundle' {
        Write-Host "📦 Build AAB (Android App Bundle)" -ForegroundColor Yellow
        .\gradlew bundleRelease
        $apkPath = "app\build\outputs\bundle\release\app-release.aab"
    }
}

Set-Location ..

# 5. Verificar resultado
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar APK!" -ForegroundColor Red
    exit 1
}

$fullApkPath = Join-Path "android" $apkPath

if (Test-Path $fullApkPath) {
    Write-Host ""
    Write-Host "✅ APK gerado com sucesso!" -ForegroundColor Green
    Write-Host "📍 Localização: $fullApkPath" -ForegroundColor Cyan
    
    $fileInfo = Get-Item $fullApkPath
    $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "📊 Tamanho: $sizeInMB MB" -ForegroundColor Cyan
    Write-Host ""
    
    # Abrir pasta no Explorer
    Write-Host "📂 Abrindo pasta do APK..." -ForegroundColor Yellow
    $apkDir = Split-Path $fullApkPath -Parent
    Start-Process explorer.exe $apkDir
} else {
    Write-Host "❌ APK não foi gerado!" -ForegroundColor Red
    exit 1
}
