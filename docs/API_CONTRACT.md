# InternMatch AI — REST API Contract (v1)

**Version:** 1.0.0  
**Status:** Approved & Authoritative Interface Boundary  
**Base URL:** `http://localhost:8000/api/v1` (canonical local evaluation baseline). A production base URL is deployment-specific and is not claimed as live by this repository.
**Authentication:** HTTP Authorization Header `Bearer <Supabase_Access_Token>`

---

## 1. Overview & General Standards

The API contract defines the authoritative interface boundary between the Frontend client applications (Expo Mobile App / Web Scaffold) and the Backend API Gateway (FastAPI).

### 1.1 Content Types & Headers
- All request and response bodies MUST be formatted in valid `application/json` unless handling multipart file uploads (`multipart/form-data`).
- Authenticated endpoints REQUIRE the header:
  ```
  Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
  ```

### 1.2 Error Response Behavior

The API does **not** guarantee one universal error-envelope shape for every failure path.

- Endpoint-specific not-found handlers may return a machine-readable payload such as:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found.",
    "details": null,
    "timestamp": "2026-08-10T17:00:00+00:00"
  }
}
```

- FastAPI `HTTPException` paths use the standard FastAPI `detail` response shape unless an endpoint explicitly formats its own response.
- Request validation failures use FastAPI / Pydantic HTTP 422 validation responses.
- Clients MUST branch primarily on HTTP status and the actual response payload; they MUST NOT assume every error is wrapped in the custom `error` object.

### 1.3 Localization & Content Locale Parameters

- **UI Localization:** English (`en`), Turkish (`tr`), and Arabic (`ar`) UI localization is handled by the mobile client, including dynamic RTL behavior for Arabic. There is no authoritative `Accept-Language` header contract in the current backend implementation.
- **Internship Detail Locale:** `GET /internships/{id}` accepts query parameter `locale=en|tr|ar` (default `en`) for localized free-form listing content.
- **Match Explanation Locale:** `GET /matches/{id}/explanation` accepts query parameter `content_locale=en|tr|ar` (default `en`).
- **Application Generation Locale:** `POST /applications/generate` accepts body field `content_locale` with values `en`, `tr`, or `ar` (default `en`).
- **Interview Preparation Locale:** `POST /applications/{id}/interview-prep` accepts query parameter `content_locale`, enabling generated interview-preparation content to use the requested supported locale.

## 2. Endpoints Specification

### 2.1 Authentication & User Session Sync

#### `POST /auth/sync`
Syncs user account upon first login via Supabase Auth. Backend initializes user profile if not present.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Request Body:** None
- **Response 200 OK:**
  ```json
  {
    "user_id": "usr_987654321",
    "email": "student@university.edu",
    "has_profile": true,
    "created_at": "2026-08-10T10:00:00Z"
  }
  ```

---

### 2.2 Student Profile & CV Operations

#### `POST /profile/cv`
Uploads a candidate CV (PDF or DOCX) to initiate background AI profile extraction.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: Binary file (PDF or DOCX, max 10MB)
- **Response 202 Accepted:**
  ```json
  {
    "job_id": "job_cv_123456",
    "status": "queued",
    "message": "CV processing enqueued successfully.",
    "estimated_seconds": 15
  }
  ```

#### `GET /profile`
Retrieves the candidate's structured profile (skills, education, experience, projects, preferences).
- **Security:** Authenticated (`Bearer <JWT>`)
- **Response 200 OK:**
  ```json
  {
    "id": "prof_123",
    "user_id": "usr_987654321",
    "full_name": "Jane Doe",
    "headline": "Computer Science Undergraduate @ Tech Univ",
    "skills": ["Python", "React Native", "FastAPI", "SQL", "Git"],
    "education": [
      {
        "institution": "Tech University",
        "degree": "B.S. Computer Science",
        "start_year": 2023,
        "end_year": 2027
      }
    ],
    "experience": [
      {
        "role": "Software Intern",
        "company": "Dev Solutions",
        "description": "Built REST APIs in Python."
      }
    ],
    "projects": [
      {
        "title": "Smart Task App",
        "tech_stack": ["React", "FastAPI"],
        "description": "Fullstack task management application."
      }
    ],
    "preferences": {
      "work_types": ["remote", "hybrid"],
      "desired_locations": ["San Francisco", "Remote"],
      "target_roles": ["Backend Intern", "AI Software Intern"]
    },
    "cv_url": "https://supabase.co/storage/v1/object/signed/cvs/usr_987654321.pdf"
  }
  ```

#### `PUT /profile`
Manually updates fields in candidate profile.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Request Body:** Partial or full profile fields (matching `GET /profile` schema).
- **Response 200 OK:** Updated profile object.

---

### 2.3 Internship Catalog

#### `GET /internships`
Retrieves the list of curated internships with optional filtering.
- **Security:** Public read-only
- **Query Parameters:**
  - `work_type`: string (e.g. `remote`, `onsite`, `hybrid`)
  - `location`: string
  - `skill`: string
  - `limit`: integer (default `20`, max `50`)
  - `offset`: integer (default `0`)
- **Response 200 OK:**
  ```json
  {
    "items": [
      {
        "id": "int_001",
        "title": "Backend Engineering Intern",
        "company": "CloudTech Inc.",
        "location": "Remote",
        "work_type": "remote",
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "preferred_skills": ["Docker", "Redis"],
        "posted_at": "2026-08-01T00:00:00Z"
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
  ```

#### `GET /internships/{id}`
Retrieves complete details of a specific internship listing.
- **Security:** Public read-only
- **Query Parameters:** `locale`: `en` | `tr` | `ar` (default `en`)
- **Response 200 OK:**
  ```json
  {
    "id": "int_001",
    "title": "Backend Engineering Intern",
    "company": "CloudTech Inc.",
    "location": "Remote",
    "work_type": "remote",
    "description": "Join our cloud team to build high-scale APIs...",
    "required_skills": ["Python", "FastAPI", "PostgreSQL"],
    "preferred_skills": ["Docker", "Redis"],
    "languages": ["English"],
    "min_education": "Bachelor Student",
    "posted_at": "2026-08-01T00:00:00Z"
  }
  ```

---

### 2.4 Hybrid Matching Engine

#### `POST /matches/calculate`
Triggers an asynchronous calculation of candidate matches against active listings.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Response 202 Accepted:**
  ```json
  {
    "job_id": "job_match_789012",
    "status": "queued",
    "message": "Matching calculation enqueued."
  }
  ```

#### `GET /matches`
Retrieves pre-calculated matches for the authenticated student, sorted by score.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Response 200 OK:**
  ```json
  {
    "matches": [
      {
        "match_id": "mtc_999",
        "internship": {
          "id": "int_001",
          "title": "Backend Engineering Intern",
          "company": "CloudTech Inc.",
          "location": "Remote"
        },
        "overall_score": 88,
        "skill_score": 90,
        "vector_score": 85,
        "created_at": "2026-08-10T12:00:00Z"
      }
    ]
  }
  ```

#### `GET /matches/{id}/explanation`
Retrieves the grounded LLM explanation ("Why You Match") and Skill Gap analysis for a specific match.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Query Parameters:** `content_locale`: `en` | `tr` | `ar` (default `en`)
- **Data Derivation Note:** `matching_skills` and `missing_skills` in the response payload are derived directly from the canonical `matches.skill_gap_analysis` JSONB column.
- **Response 200 OK:**
  ```json
  {
    "match_id": "mtc_999",
    "overall_score": 88,
    "why_you_match": "Your experience building RESTful APIs in Python matches CloudTech's core stack. Your coursework in database management aligns directly with their PostgreSQL requirement.",
    "matching_skills": ["Python", "FastAPI", "PostgreSQL"],
    "missing_skills": ["Docker", "Redis"],
    "skill_gap_analysis": {
      "summary": "You are missing 2 preferred containerization & caching skills.",
      "recommendations": [
        "Complete a 2-hour tutorial on Docker basics and containerize a simple FastAPI service.",
        "Learn basic Redis key-value caching patterns."
      ]
    }
  }
  ```

---

### 2.5 Personalized Application Generation

#### `POST /applications/generate`
Enqueues grounded AI generation of a tailored cover letter / application note for a match.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Request Body:**
  ```json
  {
    "match_id": "mtc_999",
    "tone": "professional",
    "content_locale": "en"
  }
  ```
- **Response 202 Accepted:**
  ```json
  {
    "job_id": "job_gen_345678",
    "status": "queued",
    "message": "Personalized application generation enqueued."
  }
  ```

---

### 2.6 Application Tracker & Candidate Lifecycle

Application status values are:

`saved | applied | interviewing | rejected | accepted`

#### `GET /applications`

Lists the authenticated candidate's tracked applications.

- **Security:** Authenticated (`Bearer <JWT>`)
- **Response:** `ApplicationListResponse`

#### `GET /applications/{id}`

Retrieves full application detail, including chronological status timeline and interview scheduling metadata when present.

- **Security:** Authenticated (`Bearer <JWT>`)
- **Response:** `ApplicationDetailResponse`
- **Timeline Fields:** status events expose `status` and `occurred_at`.
- **Interview Fields:** `interview_scheduled_at`, `interview_mode`, `interview_location`, and `interview_message`.

#### `POST /applications/{id}/submit`

Explicitly submits an eligible candidate application.

- **Security:** Authenticated (`Bearer <JWT>`)
- **Request:** Optional edited `cover_letter` and optional candidate `notes`.
- The backend owns the valid submit-state transition rules.

#### `PATCH /applications/{id}/status`

Updates candidate-managed tracker state subject to backend lifecycle validation.

- **Security:** Authenticated (`Bearer <JWT>`)
- Candidates MUST NOT manually set `interviewing`, `accepted`, or `rejected`; those states are employer-managed.
- A submitted application cannot be reverted to a `saved` draft.
- Employer-controlled transitions are performed through employer-owned applicant endpoints.

#### `POST /applications/{id}/interview-prep`

Generates AI interview-preparation content for an internship-linked application.

- **Security:** Authenticated (`Bearer <JWT>`)
- **Query:** `content_locale` (supported locale, default `en`)
- Available only while the application is in `interviewing` status.

#### `DELETE /applications/{id}`

Discards an eligible candidate application draft according to backend state rules.

- **Security:** Authenticated (`Bearer <JWT>`)

---

### 2.7 Saved Internships

Candidate bookmarks are authenticated and tenant-scoped to the current Supabase identity.

#### `GET /saved-internships`

Returns saved internships newest-first with real internship summary data.

- **Security:** Authenticated (`Bearer <JWT>`)
- **Query:** `limit` (default 20, max 50), `offset` (default 0)

#### `POST /saved-internships/{internship_id}`

Saves/bookmarks an internship.

- **Security:** Authenticated (`Bearer <JWT>`)
- Operation is idempotent.

#### `DELETE /saved-internships/{internship_id}`

Removes a candidate bookmark.

- **Security:** Authenticated (`Bearer <JWT>`)
- Operation is idempotent and does not delete the internship listing or application.

---

### 2.8 Employer Opportunity & Applicant Lifecycle

Employer operations require an authenticated employer identity and enforce ownership of the affected opportunity.

Canonical employer lifecycle:

```text
applied -> interviewing | accepted | rejected
interviewing -> accepted | rejected
accepted -> terminal
rejected -> terminal
saved -> not employer-transitionable
```

Scheduling an interview for an `applied` candidate promotes the application into the `interviewing` state.

Interview scheduling accepts:

- an ISO-8601 timestamp with timezone information,
- mode (`online` or `onsite`),
- a required location or meeting URL,
- and an optional employer message.

The exact current employer routes are included in the source-derived route inventory below.

---

### 2.9 Polling Asynchronous Jobs

#### `GET /jobs/{job_id}`

Retrieves an asynchronous processing job owned by the authenticated user.

- **Security:** Authenticated (`Bearer <JWT>`)
- Job lookup is scoped by both `job_id` and authenticated `user_id`.
- **Response Model:** `ProcessingJobResponse`

Current source-defined response fields:

- `job_id`: `UUID`
- `status`: `Literal['queued', 'processing', 'completed', 'failed']`
- `progress_percent`: `int`
- `result`: `Optional[Dict[str, Any]]`
- `error`: `Optional[str]`
- `updated_at`: `datetime`

Endpoint-specific not-found behavior returns the machine-readable `NOT_FOUND` error object documented in Section 1.2.

---

### 2.10 Current Source-Derived Route Inventory

The following inventory is generated from the currently mounted FastAPI route decorators in `backend/app/api/v1/endpoints/`.

It represents the implemented HTTP surface at the time of this documentation reconciliation.

| Method | Route | Access | Source Handler |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | `get_readiness` |
| `POST` | `/api/v1/auth/sync` | Authenticated JWT | `sync_authenticated_user` |
| `GET` | `/api/v1/profile` | Authenticated JWT | `get_my_profile` |
| `PUT` | `/api/v1/profile` | Authenticated JWT | `upsert_my_profile` |
| `POST` | `/api/v1/profile/cv` | Authenticated JWT | `upload_candidate_cv` |
| `POST` | `/api/v1/profile/avatar` | Authenticated JWT | `upload_profile_avatar` |
| `DELETE` | `/api/v1/profile/avatar` | Authenticated JWT | `delete_profile_avatar` |
| `POST` | `/api/v1/internships` | Employer JWT | `create_internship` |
| `GET` | `/api/v1/internships` | Public | `list_internships` |
| `GET` | `/api/v1/internships/mine` | Employer JWT | `list_my_internships` |
| `GET` | `/api/v1/internships/{id}/applicants` | Employer JWT | `list_internship_applicants` |
| `POST` | `/api/v1/internships/{id}/close` | Employer JWT | `close_internship_opportunity` |
| `GET` | `/api/v1/internships/{id}/applicants/{application_id}` | Employer JWT | `get_internship_applicant_detail` |
| `POST` | `/api/v1/internships/{id}/applicants/{application_id}/interview` | Employer JWT | `schedule_employer_applicant_interview` |
| `PATCH` | `/api/v1/internships/{id}/applicants/{application_id}/status` | Employer JWT | `update_employer_applicant_status` |
| `GET` | `/api/v1/internships/{id}` | Public | `get_internship_detail` |
| `GET` | `/api/v1/saved-internships` | Authenticated JWT | `list_saved_internships` |
| `POST` | `/api/v1/saved-internships/{internship_id}` | Authenticated JWT | `save_internship` |
| `DELETE` | `/api/v1/saved-internships/{internship_id}` | Authenticated JWT | `unsave_internship` |
| `GET` | `/api/v1/jobs/{job_id}` | Authenticated JWT | `get_job_status` |
| `GET` | `/api/v1/matches` | Authenticated JWT | `get_my_matches` |
| `POST` | `/api/v1/matches/calculate` | Authenticated JWT | `calculate_matches` |
| `GET` | `/api/v1/matches/{id}/explanation` | Authenticated JWT | `get_match_explanation` |
| `GET` | `/api/v1/applications` | Authenticated JWT | `get_my_applications` |
| `GET` | `/api/v1/applications/{id}` | Authenticated JWT | `get_application_detail` |
| `DELETE` | `/api/v1/applications/{id}` | Authenticated JWT | `discard_saved_application_draft` |
| `POST` | `/api/v1/applications/generate` | Authenticated JWT | `generate_application` |
| `POST` | `/api/v1/applications/{id}/submit` | Authenticated JWT | `submit_application` |
| `PATCH` | `/api/v1/applications/{id}/status` | Authenticated JWT | `update_application_status` |
| `POST` | `/api/v1/applications/{id}/interview-prep` | Authenticated JWT | `generate_interview_prep` |
| `GET` | `/health` | Public | root infrastructure liveness |
