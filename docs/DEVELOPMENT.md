# InternMatch AI — Local Development & Setup Guide

**Version:** 1.0.0  
**Status:** Approved & Authoritative  
**Target Runtimes:** Python 3.13, Node.js 22 LTS, Docker & Docker Compose

---

## 1. Environment Prerequisites

Before initiating local development, ensure the following runtimes and tools are installed on your workstation:

| Tool / Runtime | Target Version | Primary Purpose |
| :--- | :--- | :--- |
| **Python** | `3.13.x` | Backend API & Worker |
| **Node.js** | `22.x LTS` | Mobile Application & Web Scaffold |
| **Docker & Compose** | `Docker with Compose v2` | Containerized Backend, Worker, Redis |
| **Expo CLI** | Latest (`npx expo`) | React Native Mobile Development |
| **Git** | `Current supported release` | Version Control |


---

## 2. Repository Architecture & Layout

```
internmatch-ai/
├── apps/
│   ├── mobile/             # React Native mobile application (Expo SDK 54, TS)
│   └── landing/            # Next.js web landing page (optional scaffold)
├── backend/                # FastAPI Application
├── worker/                 # Python RQ Background Worker
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
*Note: InternMatch AI is created and developed by the collaborative two-person student team, Mohamad Barakat & Selanur Yurdakul (AISS Club — Üsküdar University). Repository is hosted at `https://github.com/AISSCLUB/InternMatch-AI`.*

```bash
# 1. Clone workspace repository from AISS Club GitHub Org
git clone https://github.com/AISSCLUB/InternMatch-AI.git
cd InternMatch-AI

# 2. Prepare environment file
cp .env.example .env
```

### 3.2 Database Provisioning
Before starting the application services against a fresh Supabase PostgreSQL environment:

1. Apply the versioned SQL migrations in numeric order from `database/migrations/`, starting with `001_initial_schema.sql` and continuing through `010_add_application_interview_schedule.sql`.
2. Apply `database/supabase_storage_setup.sql` to provision the repository-managed private `avatars` bucket and its storage policies; configure the CV bucket separately through `CV_STORAGE_BUCKET`.
3. Confirm the environment variables in the root `.env` point to the intended Supabase PostgreSQL, Auth, and Storage environment.

Migration execution credentials and server-side database secrets must remain outside client applications and public repository content.

### 3.3 Backend & Infrastructure Setup
The backend service, background RQ worker, and Redis queue are containerized using Docker Compose.

```bash
# Build and launch FastAPI, Redis, and RQ Worker in detached mode
docker compose up --build -d

# Verify container status
docker compose ps

# View backend logs
docker compose logs -f backend

# Seed controlled internship dataset from a configured local Python environment
# after database provisioning and Python dependencies are available
python scripts/seed_internships.py
```
*Backend endpoints will be accessible at `http://localhost:8000/api/v1` and interactive Swagger docs at `http://localhost:8000/docs`. The infrastructure process liveness probe is at `http://localhost:8000/health` (process liveness only), and the versioned operational readiness endpoint is at `http://localhost:8000/api/v1/health` (probes PostgreSQL database, Redis connectivity, and RQ worker readiness).*


### 3.4 Mobile Application Setup
The mobile application operates as a standard Expo SDK 54 environment outside of Docker.

```bash
# Navigate to mobile directory
cd apps/mobile

# Prepare environment file
cp .env.example .env

# Install dependencies deterministically
npm ci

# Run on Android Emulator with native development client (required for RevenueCat)
npx expo run:android

# Or start Metro bundler in development client mode
npx expo start --dev-client
```

### 3.5 Landing Page Setup (Optional Scaffold)
The landing page operates as a standard Next.js environment.

```bash
# Navigate to landing directory
cd apps/landing

# Install dependencies
npm ci

# Start Next.js development server
npm run dev
```
*Landing page will be accessible at `http://localhost:3000`.*

### 3.6 RevenueCat Test Store Development Setup
The mobile app uses `react-native-purchases` for in-app subscription management in Test Store mode.

1. **RevenueCat Canonical Identifiers:**
   - Entitlement: `pro_student`
   - Offering: `default`
   - Package: `$rc_monthly`
   - Product: `internmatch_pro_student_monthly`
2. **Environment Configuration (`apps/mobile/.env`):**
   ```env
   EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_public_api_key_here
   ```
3. **Local Testing Execution:**
   - Launch with the native Android development client: `npx expo run:android` or `npx expo start --dev-client`.
   - Complete Test Store transactions in the Plans screen; entitlement state is reflected through RevenueCat `CustomerInfo`.
   - No Apple App Store Connect or Google Play Console billing setup is required for the hackathon Test Store workflow.

---

## 4. Development Conventions & Workflow Rules

1. **Independent Frontend/Backend Operations:** Frontend components develop cleanly against the defined endpoints in `docs/API_CONTRACT.md`.
2. **Database Schema Changes:** All database modifications must be saved as versioned SQL scripts in `database/migrations/` (e.g. `001_initial_schema.sql`).
3. **No Hardcoded Secrets:** Never hardcode secrets, API keys, or private URLs in code. Always load from `.env`.
4. **Git Branching Strategy:**
   - `main`: Primary integration branch.
   - `feature/<scope>-<description>`: Isolated feature branches.
5. **Quality Verification:** Before finalizing a change, run the checks applicable to the modified components. Repository CI workflows, dependency manifests, and package scripts are the source of truth for the exact current commands; documentation must not introduce stale or conflicting quality commands.

---

## Current Mobile Runtime Notes

- Current integrated mobile baseline uses Expo SDK 54 (`react-native` 0.81.5).
- Start Metro in dev-client mode: `npx expo start --dev-client`.
- Native RevenueCat billing requires a native development client build (`npx expo run:android`).
- Standard Expo Go does not bundle native store billing modules.
- React Native Web is available for rapid layout checks (`npm run web`), but native device/emulator execution is canonical for RevenueCat testing.
- Do not add `newArchEnabled=false` to `app.json`.
