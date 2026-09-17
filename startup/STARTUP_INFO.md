# 🚀 Placement Portal - Server Startup & Architecture Guide

This document contains complete information about starting, configuring, and managing both the **Backend (FastAPI)** and **Frontend (Vite + React)** services.

---

## 📌 Quick Summary Table

| Service | Technology | Local URL | Documentation / Health | Directory | Default Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend** | FastAPI / Python 3.11+ / Uvicorn | `http://localhost:8000` | [Swagger UI](http://localhost:8000/docs)<br>[Redoc](http://localhost:8000/redoc)<br>[Health Check](http://localhost:8000/health) | `placement-portal-backend` | `8000` |
| **Frontend** | React 19 / Vite / Tailwind CSS | `http://localhost:5173` | UI Dashboard in browser | `placement-portal-frontend` | `5173` |
| **Database** | PostgreSQL | `localhost:5432` | DB Name: `placement_portal` | PostgreSQL Service | `5432` |

---

## ⚡ 1-Click Startup Scripts (in `startup/` folder)

All startup scripts reside inside the `startup/` directory:

### 🪟 Windows (Recommended)
- **Start Everything**: Double-click `startup\start_servers.bat` (or `startup\run.bat`)
  - Automatically verifies Python venv and Node modules.
  - Launches Backend in its own labeled terminal.
  - Launches Frontend in its own labeled terminal.
  - Displays an interactive menu to launch the browser or stop services.
- **Stop Everything**: Double-click `startup\stop_servers.bat`
  - Gracefully terminates all processes running on port `8000` and `5173`.

### 🐧 Git Bash / Linux / macOS
- **Start Everything**:
  ```bash
  chmod +x startup/start_servers.sh startup/stop_servers.sh
  ./startup/start_servers.sh
  ```
- **Stop Everything**:
  ```bash
  ./startup/stop_servers.sh
  ```

---

## 🛠️ Manual Startup Commands

If you prefer running the services in separate manual terminals, use the following commands from the project root:

### 1. Backend (FastAPI)
```bash
# Navigate to backend directory
cd placement-portal-backend

# Windows (Command Prompt / PowerShell)
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Git Bash / Linux / macOS
source venv/Scripts/activate     # on Windows Git Bash
# or: source venv/bin/activate   # on standard Linux/macOS
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Root: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Docs: `http://localhost:8000/redoc`
- Health Endpoint: `http://localhost:8000/health`

### 2. Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd placement-portal-frontend

# Start Vite Development Server
npm run dev
```
- Development Server: `http://localhost:5173`
- Communicates with Backend at: `http://localhost:8000` (defined in `placement-portal-frontend/.env`)

---

## ⚙️ Configuration & Environment Variables

### Backend (`placement-portal-backend/.env`)
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:Password@localhost:5432/placement_portal`).
- `JWT_SECRET`: Secret key for authentication tokens.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Access token expiration (e.g., 30 mins).
- `GROQ_API_KEY`: Groq AI key for resume analysis, interview simulation, etc.
- `SMTP_*`: Gmail SMTP configuration for sending verification and notification emails.
- `RAZORPAY_*`: Test API credentials for payment processing.

### Frontend (`placement-portal-frontend/.env`)
- `VITE_API_BASE_URL`: URL pointing to the FastAPI backend (`http://localhost:8000`).
- `VITE_RAZORPAY_KEY_ID`: Razorpay Public Key ID for client-side checkout.

---

## 🔍 Troubleshooting & Common Issues

1. **Port 8000 or 5173 is already in use:**
   - Run `startup\stop_servers.bat` or `./startup/stop_servers.sh` to kill lingering processes.

2. **Database Connection Error on Backend Startup:**
   - Ensure your PostgreSQL service is running on `localhost:5432`.
   - Verify that the database `placement_portal` exists:
     ```sql
     CREATE DATABASE placement_portal;
     ```

3. **Frontend `node_modules` missing:**
   - Run:
     ```bash
     cd placement-portal-frontend
     npm install
     ```

4. **Python Virtual Environment (`venv`) missing or corrupt:**
   - Create and install requirements:
     ```bash
     cd placement-portal-backend
     python -m venv venv
     venv\Scripts\activate
     pip install -r requirements.txt
     ```
