# InternMatch AI — Deployment Architecture & Production Guide

**Version:** 1.0.0  
**Status:** Approved & Authoritative  
**Target Environments:**
- **Current Hackathon & Evaluation Baseline:** Docker Compose (FastAPI, Redis, RQ Worker) + Supabase PostgreSQL/Auth/Storage + Expo Native Android Development Client + RevenueCat Test Store.
- **Future Production Roadmap:** Managed Cloud Containers (Cloud Run / Render), Expo EAS Standalone Builds, Supabase Cloud, Optional Next.js Web Deployment

---

## 1. Deployment Models

### 1.1 Current Hackathon Demonstration Model (Canonical)
For evaluator reproduction and hackathon judging, the backend runtime is orchestrated locally with Docker Compose, the mobile application runs as a native Expo Android development client, and configured Supabase, Gemini, and RevenueCat Test Store services provide managed data, AI, and subscription capabilities:
- **Backend & Worker:** Docker Compose orchestrating FastAPI, Redis, and RQ Worker.
- **Mobile Client:** Expo SDK 54 Native Android Development Client (`npx expo run:android` / `npx expo start --dev-client`).
- **RevenueCat Sandbox:** RevenueCat Test Store via public SDK key (`EXPO_PUBLIC_REVENUECAT_API_KEY`) with zero Play Store / App Store console overhead.

### 1.2 Future Production Target Matrix

| Application Component | Target Platform | Deployment Strategy | Notes |
| :--- | :--- | :--- | :--- |
| **Mobile Application** | Expo Application Services (EAS) | Standalone iOS & Android App Store Builds | Native store binaries with production RevenueCat keys |
| **Backend Gateway** | Managed Docker Host (Cloud Run / Render) | Containerized FastAPI Docker Build | Horizontally scalable stateless API service |
| **Background Worker** | Managed Docker Host / Worker Service | Containerized RQ Worker Docker Build | Asynchronous document parsing and match processing |
| **Database & Vector DB** | Supabase Cloud | Managed PostgreSQL + `pgvector` (repository migrations target PostgreSQL 15+ compatibility) | Relational database with vector search |
| **Authentication & Auth** | Supabase Auth | Managed Supabase Identity Provider | User session management and JWT authentication |
| **Object Storage** | Supabase Storage | Configured storage buckets (`cvs`, `avatars`); repository script provisions `avatars`, while CV storage is configured separately | Private object storage boundary for candidate files |
| **Redis Queue** | Managed Redis (Upstash / Redis Cloud) | Managed Redis Instance | Distributed message queue for background jobs |
| **Landing Page (Optional)** | Vercel | Native Next.js Git Deployment | Marketing and product overview web client (scaffold) |

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
   - `008_add_internship_employer_ownership.sql`
   - `009_add_internship_lifecycle_status.sql`
   - `010_add_application_interview_schedule.sql`
2. **Migration Execution:**
   - Apply the versioned SQL migration files in numeric order (`001` through `010`) against the target Supabase PostgreSQL environment or an equivalent PostgreSQL migration execution workflow.
   - After the ordered schema migrations, apply `database/supabase_storage_setup.sql` for the repository-managed private `avatars` bucket and its policies; provision/configure the CV bucket separately through `CV_STORAGE_BUCKET`.
   - Migration execution credentials and database secrets remain server-side and must never be embedded in client applications.

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
3. **Apply Migrations:** Execute versioned migrations `001` through `010` in numeric order, then apply `database/supabase_storage_setup.sql` for the repository-managed `avatars` bucket/policies and separately configure CV storage through `CV_STORAGE_BUCKET`.
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
1. **Store Integrations:** Configure the required App Store Connect and Google Play integrations in RevenueCat according to the production store requirements active at deployment time.
2. **Store Products:** Configure corresponding production subscription products and map them to the canonical RevenueCat offering, package, and entitlement contract.
3. **Production SDK Keys:** Inject the appropriate public production RevenueCat SDK keys through the production EAS build environment.
4. **Credential Isolation:** Store-management credentials, private API keys, and merchant configuration must remain outside client code and public repository content.
