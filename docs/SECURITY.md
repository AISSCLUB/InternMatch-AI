# InternMatch AI - Security & Data Isolation Policy

**Version:** 1.0.0
**Status:** Approved & Mandatory
**Scope:** Authentication, authorization, tenant isolation, secrets, file uploads, AI safety, RevenueCat boundaries, and dependency-risk documentation

---

## 1. Authentication & Token Verification

InternMatch AI uses **Supabase Auth** as the identity provider.

Protected FastAPI endpoints derive identity from the `Authorization: Bearer <JWT>` header through the shared `get_current_user` dependency.

The current backend verification path uses Supabase Auth's verified-claims API:

```text
supabase.auth.get_claims(jwt=token)
```

This verification validates the token cryptographically, including its signature, supported signing algorithm, and expiration. The backend then applies additional application-level checks:

- issuer must equal `{SUPABASE_URL}/auth/v1`
- audience must contain or equal `authenticated`
- `sub` must be present
- `sub` must parse as a valid UUID
- invalid or expired authentication returns HTTP 401

The verified `sub` UUID is the canonical application `user_id`.

Raw bearer tokens and private credentials must never be written to application logs.

---

## 2. Authorization & Tenant Isolation

### 2.1 Identity Rule

Authorization MUST NOT trust a `user_id`, `student_id`, or employer identity supplied by a client request when the authenticated identity can be derived from the verified JWT.

Candidate endpoints use the authenticated `current_user.user_id` and repository ownership filters to scope user-owned resources.

Employer operations use the authenticated employer gate (`require_employer_user`) together with opportunity ownership checks.

### 2.2 Row Level Security

After migrations `001` through `010`, RLS is enabled on all twelve application-owned public tables:

- `student_profiles`
- `skills`
- `student_skills`
- `education_entries`
- `experience_entries`
- `project_entries`
- `internship_listings`
- `matches`
- `applications`
- `processing_jobs`
- `saved_internships`
- `application_status_events`

RLS does not mean every table has identical privileges. Catalog-style tables can expose controlled read access while candidate-owned data remains ownership-scoped.

Trusted backend operations may use server-side Supabase service-role credentials, but application authorization checks remain mandatory.

---

## 3. Secret & Environment Boundaries

### 3.1 Mobile Client-Safe Configuration

The current mobile client environment surface is limited to:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_REVENUECAT_API_KEY
```

Every `EXPO_PUBLIC_*` value is bundled into the client and MUST be treated as public configuration, not as a secret.

### 3.2 Server-Only Credentials

The following values must remain on trusted backend / worker infrastructure when configured:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
DATABASE_URL
REDIS_URL
GEMINI_API_KEY
REVENUECAT_SECRET_KEY
```

`REVENUECAT_SECRET_KEY` is currently reserved/optional server-side configuration and is not required for the Shipaton RevenueCat Test Store mobile flow.

Private credentials MUST NOT be copied into mobile environment files, source code, screenshots, demo material, or committed repository history.

Application logging must redact configured secret values rather than emitting them.

---

## 4. File Upload & Storage Security

### 4.1 Candidate CV Documents

The authenticated CV upload flow accepts only:

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`)

Security controls include:

- maximum size: **10 MiB**
- endpoint reads only `MAX_CV_SIZE_BYTES + 1` to detect oversized payloads
- oversized requests return HTTP **413 Payload Too Large**
- MIME allowlist validation
- filename-extension agreement validation
- PDF `%PDF-` binary signature validation
- DOCX ZIP/container structure validation including `word/document.xml`
- server-generated object keys: `{user_id}/{uuid4}.{ext}`
- invalid type/signature/content returns HTTP 400
- storage download/delete helpers verify the object path belongs to the target authenticated user
- Supabase storage access uses trusted server-side service-role credentials

The configured CV bucket name is supplied through `CV_STORAGE_BUCKET` (default template value `cvs`).

### 4.2 Profile Avatars

The avatar flow accepts JPEG, PNG, and WebP images.

Security controls include:

- maximum size: **5 MB**
- binary signature verification
- MIME-to-binary-content agreement
- server-generated object keys: `{user_id}/{uuid4}.{ext}`
- ownership verification before signed URL generation or deletion
- short-lived signed URLs with a current default lifetime of **3600 seconds**

### 4.3 Storage Provisioning Boundary

`database/supabase_storage_setup.sql` currently provisions the private `avatars` bucket and its repository-managed policies.

That SQL file does **not** provision the CV bucket.

The CV bucket remains a separately configured runtime requirement through `CV_STORAGE_BUCKET`; documentation must not claim that `supabase_storage_setup.sql` creates both buckets.

---

## 5. AI Guardrails & Prompt-Injection Defense

AI security rules are implemented per workflow rather than through one fictional universal prompt string.

### 5.1 CV Extraction

CV extraction:

- extracts only facts supported by the supplied CV
- forbids invented education, employers, dates, technologies, roles, locations, or skills
- forbids inference of protected or sensitive personal attributes
- uses strict Pydantic structured output
- does not return raw CV text in the structured profile result

### 5.2 Cover Letter Generation

Cover-letter generation explicitly treats candidate data, listing descriptions, match metrics, and requested tone as **untrusted data**.

The system prompt instructs the model not to execute or follow commands or system-like instructions embedded inside supplied candidate or internship data.

Generated content must remain grounded in canonical candidate, internship, and match data and must not invent qualifications.

### 5.3 Match Explanations

`Why You Match` generation is grounded in persisted candidate and internship data.

The model is explicitly forbidden from altering or contradicting the canonical `matching_skills` and `missing_skills` arrays.

A deterministic provider-independent fallback uses only persisted match score and canonical skill-gap data.

### 5.4 Interview Preparation

Interview preparation uses only the supplied canonical candidate, internship, match, application, and interview context.

Likely interview questions are preparation suggestions and must not be represented as claims about what an employer will definitely ask.

### 5.5 Translation Integrity

Turkish and Arabic translation prompts require faithful translation without summarizing, omitting facts, or adding new information.

---

## 6. Deterministic Matching Authority

The numerical matching score is produced by deterministic application code, not by the LLM.

Current hybrid formula:

```text
overall_score =
    0.50 * skill_score
  + 0.30 * vector_score
  + 0.20 * attribute_score
```

Vector scoring is derived from PostgreSQL `pgvector` cosine distance.

Persisted `overall_score`, `skill_score`, `vector_score`, `attribute_score`, `matching_skills`, and `missing_skills` remain authoritative inputs to AI explanation and application-generation flows.

The LLM may explain canonical matching results but must not redefine them.

---

## 7. RevenueCat & Payment Data Isolation

The current Shipaton billing baseline uses the native RevenueCat SDK in the mobile application with the public:

```text
EXPO_PUBLIC_REVENUECAT_API_KEY
```

RevenueCat `CustomerInfo` entitlement state is the mobile subscription authority for the current Test Store flow.

The application does not store card numbers, CVVs, bank details, or raw payment credentials in its backend database.

`REVENUECAT_SECRET_KEY` exists only as optional/reserved server configuration. The current backend and worker contain no active RevenueCat billing integration beyond configuration/log-redaction support.

There is currently **no FastAPI RevenueCat webhook endpoint**.

If a future server-side RevenueCat integration or webhook is added, it must introduce explicit server authentication/signature verification, replay/duplicate-event handling, secret isolation, authorization tests, and updated documentation before being considered part of the production security boundary.

---

## 8. Dependency Advisory Baseline

The documented Expo SDK 54 mobile production dependency audit baseline contains:

```text
12 moderate
9 high
0 critical
21 total
```

The high-severity findings are inherited primarily through the Expo / Metro toolchain, and the available remediation path requires a breaking or major toolchain upgrade.

For the Shipaton baseline, the tested Expo SDK 54 stack is retained rather than applying an unverified major native migration immediately before submission.

This is an explicitly documented dependency risk and MUST NOT be interpreted as a claim of zero vulnerabilities.

A future maintenance cycle must upgrade to an appropriate remediated Expo / React Native toolchain and repeat native build, authentication/deep-link, RevenueCat, TypeScript, and regression verification.

Backend/worker dependency auditing is enforced separately in CI through `pip-audit`. The mobile npm audit baseline is tracked separately from that CI job.

---

## 9. Operational Security Invariants

The following rules are mandatory:

1. Never commit real credentials, bearer tokens, service-role keys, API secrets, or private database URLs.
2. Never expose service-role or other server secrets through `EXPO_PUBLIC_*` variables.
3. Derive candidate and employer identity from verified authentication context, not client-supplied ownership identifiers.
4. Preserve RLS and backend authorization together; neither layer replaces the other.
5. Validate uploaded file size, type, and binary structure before downstream processing.
6. Keep storage object paths scoped to authenticated user identity.
7. Treat candidate/listing text supplied to LLM workflows as untrusted data.
8. Keep canonical match scores and skill-gap data deterministic and outside LLM authority.
9. Treat RevenueCat server credentials and any future webhook secrets as server-only.
10. Re-run dependency, security, and regression verification whenever framework or native dependency versions materially change.

---

**End of Security Policy**
