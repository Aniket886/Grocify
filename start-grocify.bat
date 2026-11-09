@echo off
rem =====================================================================
rem  Grocify launcher
rem    .\start-grocify.bat       start everything (default)
rem    .\start-grocify.bat stop  stop everything
rem  Works from any folder: it always runs from the folder this file is in.
rem  Needs only Node.js 22.12 or newer. Everything else is automatic.
rem =====================================================================
setlocal EnableExtensions
title Grocify Launcher
cd /d "%~dp0"

rem ---------------------------------------------------------------------
rem  SETTINGS - edit the text between the quotes
rem ---------------------------------------------------------------------
rem  [FILL: link to working demo]   <- put your live demo link here
set "DEMO_URL=[FILL: link to working demo]"

rem  [FILL: command to start development environment]
rem  Runs once, only when node_modules is missing. Default: install dependencies.
set "CMD_DEVENV=npm install"

rem  [FILL: command to start server]
rem  For auto-restart on file changes use: npm run dev:server
set "CMD_SERVER=npm run server"

rem  [FILL: command to start client]
set "CMD_CLIENT=npm run dev:client"

rem  [FILL: any additional required commands]   (leave empty if none)
rem  UPI Gateway (PHP, port 8000). Uses PHP from PATH or the winget install.
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe;%PATH%"
set "CMD_EXTRA=npm run gateway"

set "API_PORT=5000"
set "WEB_PORT=5173"
if not defined OPEN_BROWSER set "OPEN_BROWSER=1"
rem ---------------------------------------------------------------------

if /i "%~1"=="stop" goto :stop

echo.
echo  === Grocify launcher ===
echo.

rem ---- 1. Node.js is the one thing we cannot install for you ----------
where node >nul 2>nul || goto :no_node
where npm >nul 2>nul || goto :no_node
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)" || goto :old_node

rem ---- 2. Development environment: dependencies -----------------------
if exist "node_modules" goto :deps_ok
echo  Installing dependencies - first run only, this can take a minute...
call %CMD_DEVENV% || goto :fail
:deps_ok

rem ---- 3. Settings file with a random admin password and login secret --
if exist ".env" goto :env_ok
call :make_env || goto :fail
:env_ok

rem ---- 4. Sample data (first run only) ---------------------------------
if exist "server\data\dev-db.json" goto :data_ok
echo  Creating sample products and the admin account...
call npm run seed || goto :fail
:data_ok

rem ---- 5. Start each component in its own window -----------------------
call :is_listening %API_PORT% && goto :api_running
echo  Starting the API server...
start "Grocify API" cmd /k %CMD_SERVER%
goto :api_started
:api_running
echo  API already running on port %API_PORT% - leaving it as it is.
:api_started

call :is_listening %WEB_PORT% && goto :web_running
echo  Starting the website...
start "Grocify Website" cmd /k %CMD_CLIENT%
goto :web_started
:web_running
echo  Website already running on port %WEB_PORT% - leaving it as it is.
:web_started

if not defined CMD_EXTRA goto :extra_done
echo  Starting extra component...
start "Grocify Extra" cmd /k %CMD_EXTRA%
:extra_done

rem ---- 6. Wait until both answer, then open the browser ----------------
where curl >nul 2>nul || goto :ready
echo  Waiting for the API and the website to answer...
set /a TRIES=0
:wait_loop
set "API_OK=" & set "WEB_OK="
curl -sf -o nul "http://localhost:%API_PORT%/api/health" && set "API_OK=1"
curl -sf -o nul "http://localhost:%WEB_PORT%/" && set "WEB_OK=1"
if defined API_OK if defined WEB_OK goto :ready
set /a TRIES+=1
if %TRIES% GEQ 90 goto :slow
ping -n 2 127.0.0.1 >nul
goto :wait_loop

:slow
echo  Still starting. Check the two Grocify windows for messages.

:ready
if "%OPEN_BROWSER%"=="1" start "" "http://localhost:%WEB_PORT%"
echo.
echo  Grocify is running
echo    Website : http://localhost:%WEB_PORT%
echo    API     : http://localhost:%API_PORT%/api/health
echo    Admin   : email and password are in the .env file
echo              (SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD)
echo    Stop    : .\start-grocify.bat stop   (or close the two Grocify windows)
if "%DEMO_URL:[FILL=%"=="%DEMO_URL%" echo    Demo    : "%DEMO_URL%"
echo.
if not defined NO_PAUSE ping -n 9 127.0.0.1 >nul
exit /b 0

rem ---------------------------------------------------------------------
:stop
echo  Stopping Grocify...
call :kill_port %API_PORT%
call :kill_port %WEB_PORT%
echo  Stopped.
exit /b 0

:kill_port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do taskkill /pid %%a /f >nul 2>nul
exit /b 0

:is_listening
netstat -ano | findstr /r /c:":%~1 .*LISTENING" >nul
exit /b %errorlevel%

:make_env
echo  Creating .env with a random admin password and login secret...
copy /y ".env.example" ".env" >nul || exit /b 1
node -e "const fs=require('fs'),c=require('crypto');let t=fs.readFileSync('.env','utf8');const set=(k,v)=>{t=t.replace(new RegExp('^'+k+'=.*$','m'),k+'='+v)};set('SEED_ADMIN_EMAIL','admin@grocify.test');set('SEED_ADMIN_PASSWORD',c.randomBytes(9).toString('base64url'));set('JWT_SECRET',c.randomBytes(32).toString('hex'));fs.writeFileSync('.env',t)" || exit /b 1
exit /b 0

rem ---------------------------------------------------------------------
:no_node
echo.
echo  Node.js is not installed. Install version 22.12 or newer from https://nodejs.org
echo  then run this file again.
goto :end_error

:old_node
echo.
echo  Your Node.js is too old. Install version 22.12 or newer from https://nodejs.org
echo  then run this file again.
goto :end_error

:fail
echo.
echo  Something went wrong above. Fix it, then run this file again.

:end_error
if not defined NO_PAUSE pause
exit /b 1
