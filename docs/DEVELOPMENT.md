# InternMatch AI — Local Development & Setup Guide

**Version:** 1.0.0  
**Status:** Approved & Authoritative  
**Target Runtimes:** Python 3.13, Node.js 22 LTS / 24 LTS (`>=20.0.0`), Docker & Docker Compose

---

## 1. Environment Prerequisites

Before initiating local development, ensure the following runtimes and tools are installed on your workstation:

| Tool / Runtime | Target Version | Primary Owner / Purpose |
| :--- | :--- | :--- |
| **Python** | `3.13.x` | Backend API & Worker (Mohammad) |
| **Node.js** | `22.x LTS / 24.x LTS (>=20.0.0)` | Mobile App & Landing Page (Selen) |
| **Docker & Compose** | `Docker Desktop v24+` | Containerized Backend, Worker, Redis (Mohammad) |
| **Expo CLI** | Latest (`npx expo`) | React Native Mobile Development (Selen) |
| **Git** | `2.40+` | Version Control |


---

## 2. Repository Architecture & Layout

```
internmatch-ai/
├── apps/
│   ├── mobile/             # React Native (Expo, TS) - Selen
│   └── landing/            # Next.js (TS) - Selen
├── backend/                # FastAPI Application - Mohammad
├── worker/                 # Python RQ Background Worker - Mohammad
├── infrastructure/         # Environment templates & Docker orchestration
├── database/               # SQL migrations & RLS policies
├── docs/                   # Authoritative system documentation
├── scripts/                # Database seeders & utility scripts
├── docker-compose.yml      # Local container orchestration
└── .env.example            # Master environment variable template
```

---

## 3. Step-by-Step Initial Setup

### 3.1 Clone & Environment Variables Setup
*Note: InternMatch AI is created and developed by the two-person student team, Mohammad & Selen (affiliated with AISS Club — Üsküdar University). Code is hosted under the AISS Club GitHub Organization (`https://github.com/aissclub/internmatch-ai`).*

```bash
# 1. Clone workspace repository from AISS Club GitHub Org
git clone https://github.com/aissclub/internmatch-ai.git
cd internmatch-ai

# 2. Prepare environment file
cp .env.example .env
```

### 3.2 Backend & Infrastructure Setup (Engineer 1: Mohammad)
The backend service, background RQ worker, and Redis queue are containerized using Docker Compose.

```bash
# Build and launch FastAPI, Redis, and RQ Worker in detached mode
docker compose up --build -d

# Verify container status
docker compose ps

# View backend logs
docker compose logs -f backend

# Seed controlled internship dataset (30-50 listings)
python scripts/seed_internships.py
```
*Backend endpoints will be accessible at `http://localhost:8000/api/v1` and interactive Swagger docs at `http://localhost:8000/docs`. The infrastructure process liveness probe is at `http://localhost:8000/health` (process liveness only), and the versioned operational readiness endpoint is at `http://localhost:8000/api/v1/health` (probes PostgreSQL database, Redis connectivity, and RQ worker readiness).*


### 3.3 Mobile App Setup (Engineer 2: Selen)
The mobile application operates as a standard Expo environment outside of Docker.

```bash
# Navigate to mobile directory
cd apps/mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```
*Press `a` for Android Emulator, `i` for iOS Simulator, or scan QR code with Expo Go app.*

### 3.4 Landing Page Setup (Engineer 2: Selen)
The landing page operates as a standard Next.js environment.

```bash
# Navigate to landing directory
cd apps/landing

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
*Landing page will be accessible at `http://localhost:3000`.*

### 3.5 RevenueCat Sandbox Development Setup (Engineer 2: Selen)
The mobile app uses `react-native-purchases` for in-app subscription management in sandbox/test mode.

1. **Configure RevenueCat Project:**
   - Create a project on the [RevenueCat Dashboard](https://app.revenuecat.com/).
   - Define entitlement `internmatch_pro` and link to an offering containing a monthly/annual package.
   - Configure StoreKit configuration file (`StoreKit.storekit`) for local iOS testing or Google Play Sandbox testing credentials for Android.
2. **Environment Configuration (`apps/mobile/.env`):**
   ```env
   EXPO_PUBLIC_REVENUECAT_APPLE_KEY=appl_sandbox_key_here
   EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=goog_sandbox_key_here
   ```
3. **Local Testing Execution:**
   - On iOS Simulator: Use Xcode StoreKit configuration to test `$0.00` sandbox purchase of `internmatch_pro`.
   - On Android Emulator: Use Google Play License Testing account to verify entitlement unlocking.

---

## 4. Development Conventions & Workflow Rules

1. **Independent Frontend/Backend Operations:** Selen can develop UI components independently by relying on the defined endpoints in `docs/API_CONTRACT.md`.
2. **Database Schema Changes:** All database modifications must be saved as versioned SQL scripts in `database/migrations/` (e.g. `001_initial_schema.sql`).
3. **No Hardcoded Secrets:** Never hardcode secrets, API keys, or private URLs in code. Always load from `.env`.
4. **Git Branching Strategy:**
   - `main`: Production-ready branch.
   - `feature/backend-<feature>`: Backend work (Mohammad).
   - `feature/frontend-<feature>`: Mobile/Landing UI work (Selen).

