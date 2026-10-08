@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title ORION STORAGE

echo ========================================
echo            ORION STORAGE
echo ========================================
echo Inicializador local
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js / npm nao encontrado.
  echo Instale o Node.js antes de iniciar o Orion Storage.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dependencias nao encontradas.
  echo Executando npm install...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Falha ao executar npm install.
    echo O servidor nao foi iniciado.
    echo.
    pause
    exit /b 1
  )
  echo.
)

:ask_port
echo ========================================
echo         ORION STORAGE - INICIAR
echo ========================================
echo Porta padrao: 8080
echo Digite a porta que deseja utilizar
echo ou pressione ENTER para usar 8080:
set "PORT="
set /p PORT="> "

if "!PORT!"=="" set "PORT=8080"

echo(!PORT!| findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo.
  echo Porta invalida. Informe um numero entre 1024 e 65535.
  echo.
  goto ask_port
)

if not "!PORT:~5!"=="" (
  echo.
  echo Porta invalida. Informe um numero entre 1024 e 65535.
  echo.
  goto ask_port
)

if !PORT! LSS 1024 (
  echo.
  echo Porta invalida. Informe um numero entre 1024 e 65535.
  echo.
  goto ask_port
)

if !PORT! GTR 65535 (
  echo.
  echo Porta invalida. Informe um numero entre 1024 e 65535.
  echo.
  goto ask_port
)

set "PORT_BUSY=0"
where powershell >nul 2>&1
if errorlevel 1 goto skip_port_check
powershell -NoProfile -Command "$p=!PORT!; $busy=@([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() ^| Where-Object { $_.Port -eq $p }); if ($busy.Count -gt 0) { exit 2 } else { exit 0 }"
if errorlevel 2 set "PORT_BUSY=1"
:skip_port_check
if "!PORT_BUSY!"=="1" (
  echo.
  echo A porta !PORT! parece estar em uso.
  echo Deseja escolher outra porta?
  echo.
  goto ask_port
)

echo.
echo ========================================
echo            ORION STORAGE
echo ========================================
echo Inicializador local
echo Porta selecionada: !PORT!
echo URL: http://localhost:!PORT!
echo ========================================
echo.
echo Iniciando Orion Storage...
echo Porta: !PORT!
echo Endereco:
echo http://localhost:!PORT!
echo.
echo Pressione Ctrl+C para encerrar o servidor.
echo.

where powershell >nul 2>&1
if errorlevel 1 goto start_server
start "Orion Storage navegador" /min powershell -NoProfile -WindowStyle Hidden -Command "$p=!PORT!; for ($i=0; $i -lt 45; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $p); $c.Close(); Start-Process ('http://localhost:' + $p); exit 0 } catch { Start-Sleep -Seconds 1 } }"

:start_server
call npm run dev -- --port !PORT!
set "EXITCODE=!ERRORLEVEL!"

echo.
if not "!EXITCODE!"=="0" (
  echo O servidor encerrou com erro. Codigo: !EXITCODE!
  echo.
  pause
)
exit /b !EXITCODE!
