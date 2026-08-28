# InternMatch AI — Deployment Architecture & Production Guide

**Version:** 1.0.0  
**Status:** Approved & Authoritative  
**Target Environments:**
- **Current Hackathon & Evaluation Baseline:** Docker Compose (FastAPI, Redis, RQ Worker, PostgreSQL/Supabase), Expo Native Development Client (Android / Test Store)
- **Future Production Roadmap:** Managed Cloud Containers (Cloud Run / Render), Expo EAS Standalone Builds, Supabase Cloud, Optional Next.js Web Deployment

---

## 1. Deployment Models

### 1.1 Current Hackathon Demonstration Model (Canonical)
For evaluator reproduction and hackathon judging, the entire stack runs locally and containerized without external commercial dependencies:
- **Backend & Worker:** Docker Compose orchestrating FastAPI, Redis, and RQ Worker.
- **Mobile Client:** Expo SDK 54 Native Android Development Client (`npx expo run:android` / `npx expo start --dev-client`).
- **RevenueCat Sandbox:** RevenueCat Test Store via public SDK key (`EXPO_PUBLIC_REVENUECAT_API_KEY`) with zero Play Store / App Store console overhead.

### 1.2 Future Production Target Matrix

| Application Component | Target Platform | Deployment Strategy | Responsible Engineer |
| :--- | :--- | :--- | :--- |
| **Mobile Application** | Expo Application Services (EAS) | Standalone iOS & Android App Store Builds | Selen |
| **Backend Gateway** | Managed Docker Host (Cloud Run / Render) | Containerized FastAPI Docker Build | Mohammad |
| **Background Worker** | Managed Docker Host / Worker Service | Containerized RQ Worker Docker Build | Mohammad |
| **Database & Vector DB** | Supabase Cloud | Managed PostgreSQL 17 (`pgvector`) | Mohammad |
| **Authentication & Auth** | Supabase Auth | Managed Supabase Identity Provider | Mohammad |
| **Object Storage** | Supabase Storage | Private Bucket (`cvs`, `avatars`) | Mohammad |
| **Redis Queue** | Managed Redis (Upstash / Redis Cloud) | Managed Redis Instance | Mohammad |
| **Landing Page (Optional)** | Vercel | Native Next.js Git Deployment | Selen |

---

## 2. Mobile Build Profiles (EAS)

The mobile application defines two internal APK build profiles in `apps/mobile/eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "developmentClient": false,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

- **`development` Profile (Canonical):**
  - Configured with `developmentClient: true`.
  - Bundles native RevenueCat billing modules for local Test Store purchase evaluation.
  - Used for daily development and live evaluator walkthroughs.
- **`preview` Profile (Internal QA):**
  - Configured with `developmentClient: false`.
  - Standalone internal APK intended for general UI/navigation testing.
  - Intentionally configured without `EXPO_PUBLIC_REVENUECAT_API_KEY` to avoid embedding Test Store keys in standalone release packages.

---

## 3. Containerization Strategy (Docker)

### 3.1 Backend Dockerfile (`backend/Dockerfile`)
- Base Image: `python:3.13-slim`
- User Execution: Hardened non-root `appuser`.
- Container Runtime Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Scaling: Horizontal replica scaling is delegated to the managed container platform (e.g. Cloud Run / Render) when required.
- Exposed Port: `8000`

### 3.2 Worker Dockerfile (`worker/Dockerfile`)
- Base Image: `python:3.13-slim`
- User Execution: Hardened non-root `appuser`.
- Container Runtime Command: `python worker.py`
- Worker Architecture (`worker.py`):
  - Validates configuration (`validate_production_config`) before executing network operations.
  - Verifies Redis connectivity with `ping()`.
  - Creates and listens on configured RQ queues defined by `QUEUES` (default: `default`).
  - Processes jobs using `Worker.work()`.
  - Operates as an isolated worker runtime to prevent background job failures from impacting the API server.

---

## 4. Database Migration & Provisioning Strategy

1. **Schema Management:** Ordered SQL migrations stored in `database/migrations/`:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_add_processing_job_progress.sql`
   - `004_add_application_applied_date.sql`
   - `005_add_avatar_storage_path.sql`
   - `006_add_saved_internships.sql`
   - `007_add_application_status_events.sql`
2. **Cloud Migration Execution:**
   ```bash
   # Link project
   supabase link --project-ref <SUPABASE_PROJECT_REF>
   
   # Apply ordered migrations to production database
   supabase db push
   ```

---

## 5. Production Health Checks & Monitoring

1. **Dual Health Check Endpoints:**
   - **Infrastructure Liveness Probe (`GET /health`):**
     - Used by container orchestrators for HTTP process liveness.
     - Dependency-independent: zero database or queue calls.
     - Returns HTTP 200 when FastAPI process is responsive.
   - **Operational Readiness Probe (`GET /api/v1/health`):**
     - Probes PostgreSQL database connectivity (`SELECT 1`).
     - Probes Redis connectivity (`PING`) with bounded timeouts.
     - Probes RQ worker readiness (`Worker.count(queue=default) >= 1`).
     - Returns HTTP 200 only when all components are healthy.
     - Returns HTTP 503 if any dependency fails, without leaking credentials.

---

## 6. Minimal Production Deployment Sequence

1. **Provision Environment Variables:** Configure `.env` (`SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`, etc.).
2. **Validate Configuration:** Automatic validation occurs on application and worker startup.
3. **Apply Migrations:** Execute `001`–`007` SQL scripts.
4. **Seed Curated Listings:** Execute `python scripts/seed_internships.py`.
5. **Start Redis & RQ Worker:** Launch background worker service.
6. **Start API Server:** Launch FastAPI backend (`uvicorn app.main:app`).
7. **Verify Health:** Verify `/health` and `/api/v1/health` return HTTP 200.

---

## 7. RevenueCat Setup & Store Integration

### 7.1 Canonical Hackathon Contract (Test Store)
- **Entitlement ID:** `pro_student`
- **Product ID:** `internmatch_pro_student_monthly`
- **Offering ID:** `default`
- **Package ID:** `$rc_monthly`
- **Mobile Public Key:** `EXPO_PUBLIC_REVENUECAT_API_KEY` (Test Store SDK Key)

### 7.2 Future Live Store Production Setup
When preparing for commercial App Store and Google Play publication:
1. **Apple App Store Connect:** Link In-App Purchase Shared Secret or App Store Connect API Key in RevenueCat dashboard.
2. **Google Play Console:** Link Service Account JSON key with Financial access.
3. **Store Subscriptions:** Configure matching store subscriptions in App Store Connect and Google Play Console.
4. **Production Keys:** Inject platform-specific production SDK keys during production EAS build workflows.
