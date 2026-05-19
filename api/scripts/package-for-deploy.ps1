# Gera pacote ZIP pronto para o servidor Windows (com node_modules).
# Executar na sua maquina, NA PASTA api:
#   powershell -ExecutionPolicy Bypass -File scripts\package-for-deploy.ps1
#
# Requisito: Node.js instalado. Ideal: mesma versao major do Node do servidor.

$ErrorActionPreference = "Stop"
$apiRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outDir = Join-Path $apiRoot "dist"
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$zipName = "api-parceiros-deploy-$stamp.zip"
$zipPath = Join-Path $outDir $zipName
$stage = Join-Path $outDir "stage-api"

Write-Host "==> Pasta da API: $apiRoot"

if (-not (Test-Path (Join-Path $apiRoot "package.json"))) {
  throw "Execute a partir do projeto api (package.json nao encontrado)."
}

Write-Host "==> npm install (producao)..."
Push-Location $apiRoot
npm install --omit=dev
if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }
Pop-Location

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeDirs = @("dist", ".git", ".cursor")
$excludeFiles = @(".env")

Get-ChildItem $apiRoot -Force | ForEach-Object {
  if ($_.Name -in $excludeDirs) { return }
  if ($_.Name -in $excludeFiles) { return }
  Copy-Item $_.FullName -Destination $stage -Recurse -Force
}

Copy-Item (Join-Path $apiRoot ".env.example") (Join-Path $stage ".env.example") -Force

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "==> Compactando..."
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -Force
Remove-Item $stage -Recurse -Force

Write-Host ""
Write-Host "Pacote gerado:"
Write-Host "  $zipPath"
Write-Host ""
Write-Host "No servidor:"
Write-Host "  1. Descompacte em E:\site\api\API_ASUS (ou pasta desejada)"
Write-Host "  2. Copie .env.example para .env e configure"
Write-Host "  3. Duplo clique em start.bat  OU: node server.js"
Write-Host ""
Write-Host "IMPORTANTE: gere o pacote em Windows se o servidor for Windows."
Write-Host "Mesma versao major do Node.js (ex.: 20.x) evita incompatibilidades."
