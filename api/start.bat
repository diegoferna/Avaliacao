@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo [ERRO] Arquivo .env nao encontrado nesta pasta.
  echo Copie .env.example para .env e configure antes de iniciar.
  exit /b 1
)
echo Iniciando API de parceiros...
node server.js
