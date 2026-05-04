# Hex - AI Model Security Scanner Dashboard

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker)
![License](https://img.shields.io/badge/license-MIT-green)

**A full-stack web dashboard for the Hex AI/ML Model Security Scanner by Layerd AI**

</div>

## Overview

This project wraps the [Hex scanner](https://github.com/Layerd-AI/layerd-hex) with a modern web dashboard, providing a complete interface for scanning AI/ML models, tracking security history, comparing scan results, and exporting reports.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Backend | FastAPI (Python 3.11) |
| Database | SQLite |
| Authentication | JWT (python-jose + passlib/bcrypt) |
| PDF Export | jsPDF + jspdf-autotable |
| Scanner Engine | Hex by Layerd AI (Docker) |
| Container | Docker + Docker Compose |

## Features

- **Security Scanning** — Upload any ML model file and run a full security scan
- **JWT Authentication** — Login system with bcrypt password hashing and token-based sessions
- **Scan History** — All scans persisted to SQLite, viewable and deletable
- **Scan Comparison** — Compare two scans side-by-side to track security improvements
- **PDF & CSV Export** — Download full scan reports in PDF or CSV format
- **Settings Page** — Configure scanner workers, timeout, output format, and preferences
- **About Page** — Tech stack, feature overview, and resource links
- **Demo Mode** — Try the dashboard without a real model file

## Supported Model Formats

`.safetensors` `.pth` `.onnx` `.bin` `.h5` `.pkl` `.joblib` `.tf` `.tflite` `.mlmodel` `.pt` `.model` `.weights` `.caffemodel` `.pb`

## Quick Start

### Prerequisites
- Docker Desktop (running)
- Python 3.11+
- Node.js 20+

### 1. Pull the scanner image
```bash
docker pull layerd/hex:latest
```

### 2. Set up the backend
```bash
cd backend
pip install -r requirements.txt
python seed_history.py   # populate demo scan history
uvicorn main:app --reload
```

### 3. Set up the frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the dashboard
Navigate to `http://localhost:5173`

Default credentials: `admin` / `admin123`

## Project Structure

```
Hex-main/
├── backend/
│   ├── main.py              # FastAPI app + all API routes
│   ├── auth.py              # JWT authentication + user management
│   ├── database.py          # SQLite operations
│   ├── seed_history.py      # Demo data seeder
│   ├── test_main.py         # Backend tests (pytest)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app + routing + auth state
│   │   ├── components/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ScanUpload.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── ComparePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── AboutPage.jsx
│   │   │   └── ResultsTable.jsx
│   │   └── utils/
│   │       └── exportReport.js  # PDF + CSV export
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── LICENSE
└── README.md
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login and get JWT token | No |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/scan` | Upload and scan a model file | Yes |
| POST | `/scan/demo` | Run demo scan | Yes |
| GET | `/history` | Get all scan history | Yes |
| GET | `/history/{id}` | Get specific scan | Yes |
| DELETE | `/history/{id}` | Delete a scan | Yes |
| GET | `/compare?scan_a={id}&scan_b={id}` | Compare two scans | Yes |

## Running Tests

**Backend:**
```bash
cd backend
pytest test_main.py -v
```

**Frontend:**
```bash
cd frontend
npm test
```

## Docker Compose

```bash
docker-compose up
```

Opens at `http://localhost:5173`

## Security Compliance

- CWE Coverage: 50+ Common Weakness Enumerations
- OWASP Top 10 for AI/ML
- NIST AI Risk Management Framework
- EU AI Act compliance support
- CVSS v3.1 scoring with EPSS integration

## License

MIT License — Copyright 2026 Layerd AI
