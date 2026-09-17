#!/usr/bin/env bash

# Placement Portal - Stop Servers Script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DIR="$( cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd )"
PID_FILE="$DIR/.server_pids"
SILENT=0

if [ "$1" == "--silent" ]; then
    SILENT=1
fi

[ $SILENT -eq 0 ] && echo "====================================================================="
[ $SILENT -eq 0 ] && echo "        🛑 STOPPING PLACEMENT PORTAL SERVERS"
[ $SILENT -eq 0 ] && echo "====================================================================="

# 1. Kill recorded PIDs
if [ -f "$PID_FILE" ]; then
    while read -r pid; do
        if [ -n "$pid" ]; then
            [ $SILENT -eq 0 ] && echo "Terminating PID: $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# 2. Kill any processes remaining on ports 8000 and 5173
if command -v lsof >/dev/null 2>&1; then
    PORT_PIDS=$(lsof -ti:8000,5173 2>/dev/null)
    if [ -n "$PORT_PIDS" ]; then
        [ $SILENT -eq 0 ] && echo "Terminating remaining processes on ports 8000, 5173..."
        kill -9 $PORT_PIDS 2>/dev/null || true
    fi
elif command -v netstat >/dev/null 2>&1; then
    # Git Bash / Windows fallback
    for PORT in 8000 5173; do
        for PID in $(netstat -ano 2>/dev/null | grep ":$PORT " | grep -i "LISTENING" | awk '{print $5}'); do
            if [ -n "$PID" ] && [ "$PID" != "0" ]; then
                [ $SILENT -eq 0 ] && echo "Terminating PID $PID on port $PORT..."
                taskkill //F //PID "$PID" 2>/dev/null || true
            fi
        done
    done
fi

[ $SILENT -eq 0 ] && echo "[SUCCESS] Backend and Frontend stopped."
[ $SILENT -eq 0 ] && echo "====================================================================="
