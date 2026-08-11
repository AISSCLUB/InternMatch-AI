# InternMatch AI — Engineering Foundation & Monorepo

**Product:** AI-Powered Personalized Internship Matching & Application Assistant  
**License:** [MIT License](LICENSE)

---

## 1. Project Identity & Team

- **Authors & Developers:** Mohamad Barakat & Selenur Yurdakul (Two-Person Student Team)
- **Team Responsibilities:**
  - **Mohamad:** Backend Gateway, Database Schemas, Infrastructure, APIs, AI Pipeline, Vector Search, Security, Containerization, Deployment.
  - **Selenur:** Mobile Application (React Native / Expo), Next.js Landing Page, UI/UX, Interaction Design, RevenueCat Integration, Frontend API Integration.
  - **Both:** Product Strategy, Architecture Review, Testing, Demo Video Creation, Submission.
- **Affiliation:** **AISS Club — Üsküdar University**  
  *Mohammad serves as President of AISS Club; Selen serves as Vice President of AISS Club.*  
  *(Note: AISS Club represents the team's student-club affiliation and does not imply university ownership, sponsorship, funding, or intellectual property holding.*
- **Code Repository:** `https://github.com/aissclub/internmatch-ai`

---

## 2. System Architecture Overview

```
[Mobile App (Expo / React Native)]    [Landing Page (Next.js)]
                │                               │
                └───────────────┬───────────────┘
                                │ REST HTTP (Bearer JWT)
                                v
               [FastAPI Gateway (Python 3.13 / Docker)]
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
   [Supabase DB / pgvector]           [Redis Task Queue]
                                               │
                                               v
                                     [Python RQ Worker]
```

---

## 3. Environment Prerequisites

Ensure the following runtimes are installed on your development machine:

- **Python:** `3.13.x`
- **Node.js:** `24.x LTS`
- **Docker & Docker Compose:** `Docker Desktop v24+`
- **Git:** `2.40+`

---

## 4. Local Development Setup Guide

### 4.1 Clone Repository & Environment Setup
```bash
# 1. Clone workspace repository
git clone https://github.com/aissclub/internmatch-ai.git
cd internmatch-ai

# 2. Create environment file from template
cp .env.example .env
```

### 4.2 Docker Services Startup (Backend, Worker, Redis)
```bash
# Build and launch FastAPI, Redis, and Python RQ Worker in detached mode
docker compose up --build -d

# Check service container status
docker compose ps

# Verify API health endpoint
curl http://localhost:8000/health
```
- Interactive Swagger API Documentation: `http://localhost:8000/docs`
- Root Health Endpoint: `http://localhost:8000/health`

### 4.3 Mobile App Development (Selen)
```bash
cd apps/mobile
npm install
npx expo start
```

### 4.4 Landing Page Development (Selen)
```bash
cd apps/landing
npm install
npm run dev
```

---

## 5. Testing & Code Quality Commands

```bash
# Run pytest backend test suite
pytest

# Code quality linting check (Ruff)
ruff check .
```

---

## 6. Project Directory Layout

```
internmatch-ai/
├── apps/
│   ├── mobile/             # React Native / Expo Mobile App (Selen)
│   └── landing/            # Next.js Marketing Landing Page (Selen)
├── backend/                # FastAPI Gateway (Mohammad)
│   ├── app/
│   │   ├── api/            # API Endpoints & Versioned Routers
│   │   ├── core/           # Config, Security & Logging
│   │   └── main.py         # FastAPI Entrypoint
│   ├── Dockerfile
│   └── requirements.txt
├── worker/                 # Python RQ Background Worker (Mohammad)
│   ├── tasks/              # Asynchronous Worker Tasks
│   ├── worker.py           # RQ Worker Entrypoint
│   ├── Dockerfile
│   └── requirements.txt
├── database/               # SQL Migrations & Seeders
│   ├── migrations/
│   └── seeds/
├── infrastructure/         # Environment templates
├── docs/                   # Authoritative System Documentation (7 files)
├── tests/                  # Pytest Unit & Liveness Tests
├── docker-compose.yml      # Local Container Orchestration
├── .env.example            # Master Environment Variable Template
├── .gitignore
├── pyproject.toml
├── README.md
└── LICENSE                 # MIT License
```
