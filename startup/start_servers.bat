@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Placement Portal - Startup Controller

:: Resolve project root directory (parent of startup folder)
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI\"
set "BACKEND_DIR=%ROOT_DIR%placement-portal-backend"
set "FRONTEND_DIR=%ROOT_DIR%placement-portal-frontend"

cls
echo =====================================================================
echo           🎓 PLACEMENT PORTAL - AUTOMATED STARTUP SYSTEM
echo =====================================================================
echo.
echo [1/3] Verifying environment prerequisites...

:: Check backend virtual environment
if not exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at:
    echo         "%BACKEND_DIR%\venv"
    echo.
    echo Please create it first by running in placement-portal-backend:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)
echo [OK] Backend Python virtual environment found.

:: Check frontend dependencies
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [WARNING] Frontend node_modules not found. Running npm install...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
    cd /d "%ROOT_DIR%"
)
echo [OK] Frontend dependencies verified.

echo.
echo [2/3] Launching backend and frontend servers...

:: Launch Backend in separate terminal window
start "Placement Portal - Backend (FastAPI :8000)" cmd /k "title Placement Portal - Backend (FastAPI :8000) && cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && echo [BACKEND] Starting FastAPI on http://127.0.0.1:8000 ... && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Launch Frontend in separate terminal window
start "Placement Portal - Frontend (Vite :5173)" cmd /k "title Placement Portal - Frontend (Vite :5173) && cd /d "%FRONTEND_DIR%" && echo [FRONTEND] Starting Vite on http://localhost:5173 ... && npm run dev"

echo.
echo [3/3] Servers started in dedicated windows!
echo.
echo =====================================================================
echo   🚀 SERVERS ARE RUNNING
echo =====================================================================
echo   • Frontend App:      http://localhost:5173
echo   • Backend API:       http://localhost:8000
echo   • Interactive Docs:  http://localhost:8000/docs
echo   • ReDoc API Docs:    http://localhost:8000/redoc
echo   • Health Check:      http://localhost:8000/health
echo =====================================================================
echo.
echo Select an option below or keep this window open:
echo   [1] Open Frontend in Browser (http://localhost:5173)
echo   [2] Open API Documentation in Browser (http://localhost:8000/docs)
echo   [3] Open Both Frontend and API Docs
echo   [4] Stop All Servers (kill ports 8000 and 5173)
echo   [5] Exit this launcher (servers continue running in background)
echo.

:menu
set /p "CHOICE=Enter choice [1-5] (default is 1): "
if "%CHOICE%"=="" set CHOICE=1

if "%CHOICE%"=="1" (
    start http://localhost:5173
    echo Opened Frontend in default browser.
    goto menu
)
if "%CHOICE%"=="2" (
    start http://localhost:8000/docs
    echo Opened API Documentation in default browser.
    goto menu
)
if "%CHOICE%"=="3" (
    start http://localhost:5173
    start http://localhost:8000/docs
    echo Opened Frontend and API Docs in default browser.
    goto menu
)
if "%CHOICE%"=="4" (
    echo.
    echo Stopping servers on ports 8000 and 5173...
    call "%SCRIPT_DIR%stop_servers.bat"
    goto end
)
if "%CHOICE%"=="5" (
    echo Exiting launcher. Servers are running in their own windows.
    goto end
)

echo Invalid selection. Please enter 1, 2, 3, 4, or 5.
goto menu

:end
timeout /t 2 >nul
exit /b 0
