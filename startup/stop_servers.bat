@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Placement Portal - Stop Servers

echo =====================================================================
echo         🛑 STOPPING PLACEMENT PORTAL SERVERS
echo =====================================================================
echo.

set FOUND_ANY=0

for %%P in (8000 5173) do (
    echo Checking for active process on port %%P...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%%P *LISTENING"') do (
        set "PID=%%a"
        if defined PID (
            if not "!PID!"=="0" (
                echo   - Terminating process PID !PID! on port %%P...
                taskkill /F /PID !PID! >nul 2>&1
                set FOUND_ANY=1
            )
        )
    )
)

echo.
if "!FOUND_ANY!"=="1" (
    echo [SUCCESS] Backend and Frontend processes stopped.
) else (
    echo [INFO] No active servers found on ports 8000 or 5173.
)
echo =====================================================================
echo.
echo Press any key to close this window...
pause >nul
