# InternMatch AI — Security & Data Isolation Policy

**Version:** 1.0.0  
**Status:** Approved & Mandatory  
**Scope:** Authentication, Authorization, Secret Management, File Uploads, AI Safety

---

## 1. Authentication & Token Verification

1. **Authentication Provider:** Authentication is handled by **Supabase Auth**.
2. **Backend JWT Verification:**
   - Every protected API endpoint in FastAPI MUST pass requests through an authentication dependency (`get_current_user`).
   - The dependency extracts the Bearer token from the `Authorization` header, verifies the signature against Supabase JWT public key / secret, checks token expiration, and decodes the claims (`sub` = `user_id`).
   - Anonymous or invalid token requests MUST be rejected immediately with HTTP 401 Unauthorized.

```python
# Conceptual Verification Rule (FastAPI Dependency)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    payload = verify_supabase_jwt(token) # Raises HTTP_401 if invalid
    return payload["sub"] # Authentic user_id derived from cryptographic signature
```

---

## 2. Authorization, Identity Derivation & Service-Role Guardrails

1. **Identity Rule:** NEVER trust a `user_id` passed in request bodies, query parameters, or form fields for authorization.
2. **Context Derivation:** All backend database queries and business operations derive `user_id` strictly from the verified JWT `sub` claim (`current_user`).
3. **Service-Role Credentials & RLS Bypass Warning:**
   - **CRITICAL:** Supabase service-role credentials **BYPASS Row Level Security (RLS)** entirely.
   - RLS MUST NOT be relied upon as the sole authorization boundary for backend operations using service-role keys.
4. **Explicit Backend Resource Scoping:**
   - Every backend database query accessing user-owned resources MUST explicitly include user isolation filters (e.g., `WHERE user_id = current_user_id` or `WHERE student_id = current_student_id`).
   - Software routines must explicitly authorize the derived `user_id` against the resource owner before returning or mutating data.
5. **Restricted Service-Role Scope:**
   - Service-role access is strictly limited to explicitly justified server-side operations (e.g., background worker profile updates, system dataset seeding, and administrative sync tasks).
   - Standard client-facing API logic must execute under explicitly scoped queries matching the authenticated identity.
6. **Database Level Isolation:** Supabase RLS is enabled on all student data tables (`student_profiles`, `matches`, `applications`, `processing_jobs`) to enforce tenant isolation for direct database client connections.

---

## 3. Secret Management & Environmental Boundaries

```
┌───────────────────────────────────────────────────────────┐
│                    PUBLIC / CLIENT TIER                   │
│   (Expo Mobile App / Next.js Landing — Selen's Scope)    │
│                                                           │
│   Allowed Keys:                                           │
│   - EXPO_PUBLIC_SUPABASE_URL                              │
│   - EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY                  │
│   - EXPO_PUBLIC_REVENUECAT_API_KEY                        │
│   - EXPO_PUBLIC_API_URL / NEXT_PUBLIC_API_URL            │
│                                                           │
│   STRICTLY FORBIDDEN IN CLIENT CODE:                      │
│   - SUPABASE_SERVICE_ROLE_KEY                             │
│   - SUPABASE_JWT_SECRET                                   │
│   - REVENUECAT_SECRET_KEY                                 │
│   - DATABASE_URL / POSTGRES_PASSWORD                      │
│   - GEMINI_API_KEY / OPENAI_API_KEY                       │
│   - REDIS_PASSWORD / REDIS_URL                            │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              │ REST HTTP Requests (JWT Header)
                              ▼
┌───────────────────────────────────────────────────────────┐
│                   PRIVATE / BACKEND TIER                  │
│    (FastAPI Gateway / RQ Worker / Docker — Mohammad)    │
│                                                           │
│   Secure Environment Variables (.env):                    │
│   - SUPABASE_SERVICE_ROLE_KEY                             │
│   - SUPABASE_JWT_SECRET                                   │
│   - REVENUECAT_SECRET_KEY                                 │
│   - DATABASE_URL                                          │
│   - GEMINI_API_KEY                                        │
│   - REDIS_URL                                             │
└───────────────────────────────────────────────────────────┘
```

---

## 4. File Upload Security (CV Documents)

Uploaded CVs represent a potential threat vector (malicious files, execution exploits, memory exhaustion). The following strict pipeline MUST be enforced:

1. **MIME Type Validation:**
   - Allowed MIME types strictly limited to:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`)
   - Validation performed via magic bytes (file signature), not relying solely on file extension header.
2. **File Size Enforcement:** Maximum file size is strictly capped at **10 MB** ($10 \times 1024 \times 1024$ bytes). Requests exceeding this limit receive HTTP 413 Payload Too Large.
3. **Safe Filename Handling:** Uploaded filenames are discarded. Files are assigned a random UUID (e.g. `raw_cv_<UUID>.pdf`) before being saved to storage.
4. **Isolated Storage:** Files are stored in private Supabase Storage buckets (`cvs`, `avatars`). Buckets prohibit public read access; download links are generated as short-lived Signed URLs.
5. **Non-Executable Processing:** Processing parsers (`pypdf`, `python-docx`) parse plain text into memory inside isolated RQ worker containers. Uploaded files are never executed or evaluated as scripts.

---

## 5. AI Guardrails & Hallucination Defense

1. **Strict Context Grounding:**
   - The AI pipeline MUST NEVER invent or extrapolate candidate qualifications, degrees, experience, companies, or skills.
   - Every LLM prompt MUST include the explicit constraint:
     > *"You are an objective evaluation assistant. Rely ONLY on the candidate profile provided. Do NOT assume, extrapolate, or invent any education, project, skill, or work experience not explicitly stated."*
2. **Deterministic Match Scores:** Match scores ($0–100$) are calculated using deterministic code routines and PostgreSQL vector similarity distance. The LLM is NEVER permitted to emit raw match score integers directly.
3. **No Uncontrolled Web Scraping:** Scraping of external websites or social platforms (e.g. LinkedIn) is explicitly prohibited for the MVP. All internship listing data is loaded from controlled, sanitized datasets.

---

## 6. RevenueCat Security & Payment Data Isolation

1. **Zero Card Data Storage:** Backend servers, databases, and logs MUST NEVER receive, process, or persist credit card numbers, expiration dates, CVVs, or bank details.
2. **RevenueCat Secret Separation:**
   - Client applications only receive RevenueCat public SDK keys (`EXPO_PUBLIC_REVENUECAT_*`).
   - RevenueCat secret V2 API keys / Webhook signing secrets MUST be stored exclusively in backend environment variables (`REVENUECAT_SECRET_KEY`) and NEVER committed to repository code.
3. **Webhook Verification:** Optional RevenueCat webhooks (`/webhooks/revenuecat`) MUST verify signature headers to prevent fake entitlement injection.

---

## Mobile Dependency Advisory Baseline

Final submission verification of the Expo SDK 54 mobile dependency tree reports npm audit advisories, including high-severity findings inherited through the Expo/Metro toolchain. The available npm remediation path for the high-severity findings requires a breaking/major Expo upgrade.

For the Shipaton submission baseline, the tested Expo SDK 54 stack is intentionally retained rather than introducing an unverified major native migration immediately before submission. Final verification reported **0 critical** npm advisories. The remaining advisories are treated as an explicitly documented dependency risk and must not be interpreted as a claim of zero vulnerabilities.

A future maintenance cycle should upgrade the Expo/React Native toolchain to a remediated supported release and repeat native build, authentication/deep-link, RevenueCat, TypeScript, and regression verification before release.
