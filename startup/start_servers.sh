#!/usr/bin/env bash

# Placement Portal - Automated Bash Startup Script
# Works in Git Bash (Windows), WSL, Linux, and macOS

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DIR="$( cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd )"
BACKEND_DIR="$DIR/placement-portal-backend"
FRONTEND_DIR="$DIR/placement-portal-frontend"
PID_FILE="$DIR/.server_pids"
LOGS_DIR="$DIR/.logs"

mkdir -p "$LOGS_DIR"

echo "====================================================================="
echo "          🎓 PLACEMENT PORTAL - AUTOMATED STARTUP SYSTEM"
echo "====================================================================="
echo ""

# 1. Check Python virtual environment
ACTIVATE_SCRIPT=""
if [ -f "$BACKEND_DIR/venv/Scripts/activate" ]; then
    ACTIVATE_SCRIPT="$BACKEND_DIR/venv/Scripts/activate"
elif [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
    ACTIVATE_SCRIPT="$BACKEND_DIR/venv/bin/activate"
else
    echo "[ERROR] Python virtual environment not found in $BACKEND_DIR/venv"
    echo "Please create it using: python -m venv venv"
    exit 1
fi

echo "[OK] Python virtual environment detected."

# 2. Check Frontend node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[WARNING] node_modules not found in frontend. Installing dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
fi
echo "[OK] Frontend dependencies verified."

# 3. Stop any existing instances running on ports 8000 or 5173
if [ -f "$SCRIPT_DIR/stop_servers.sh" ]; then
    bash "$SCRIPT_DIR/stop_servers.sh" --silent 2>/dev/null
fi

echo ""
echo "Starting Backend (FastAPI on port 8000)..."
(
    cd "$BACKEND_DIR"
    # shellcheck disable=SC1090
    source "$ACTIVATE_SCRIPT"
    exec python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) > "$LOGS_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "Starting Frontend (Vite on port 5173)..."
(
    cd "$FRONTEND_DIR"
    exec npm run dev
) > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Save PIDs
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo "====================================================================="
echo "  🚀 SERVERS ARE RUNNING IN BACKGROUND"
echo "====================================================================="
echo "  • Frontend App:      http://localhost:5173"
echo "  • Backend API:       http://localhost:8000"
echo "  • Interactive Docs:  http://localhost:8000/docs"
echo "  • Health Check:      http://localhost:8000/health"
echo "  • Backend Log:       $LOGS_DIR/backend.log"
echo "  • Frontend Log:      $LOGS_DIR/frontend.log"
echo "====================================================================="
echo ""
echo "Press Ctrl+C to stop both servers, or run: ./stop_servers.sh"
echo ""

# Function to stop servers on exit
cleanup() {
    echo ""
    echo "Stopping servers (PIDs: $BACKEND_PID, $FRONTEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "Servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Try to open default browser if command is available
if command -v start >/dev/null 2>&1; then
    # Git Bash on Windows
    start http://localhost:5173 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open http://localhost:5173 2>/dev/null || true
elif command -v open >/dev/null 2>&1; then
    # macOS
    open http://localhost:5173 2>/dev/null || true
fi

# Wait for processes
wait
