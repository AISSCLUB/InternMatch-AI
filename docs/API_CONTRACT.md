# InternMatch AI — REST API Contract (v1)

**Version:** 1.0.0  
**Status:** Approved & Authoritative Interface Boundary  
**Base URL:** `http://localhost:8000/api/v1` (Local Docker) / `https://api.internmatch.ai/api/v1` (Production)  
**Authentication:** HTTP Authorization Header `Bearer <Supabase_Access_Token>`

---

## 1. Overview & General Standards

The API contract defines the exact interface boundary between the Frontend apps (Expo Mobile / Next.js Landing owned by **Selen**) and the Backend API (FastAPI owned by **Mohammad**).

### 1.1 Content Types & Headers
- All request and response bodies MUST be formatted in valid `application/json` unless handling multipart file uploads (`multipart/form-data`).
- Authenticated endpoints REQUIRE the header:
  ```
  Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
  ```

### 1.2 Standard Error Response Schema
All error responses return standard HTTP error codes ($400, 401, 403, 404, 422, 500$) with the following JSON payload:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token.",
    "details": null,
    "timestamp": "2026-08-10T17:00:00Z"
  }
}
```

### 1.3 Localization & Content Locale Parameters
- **UI Locale (`ui_locale`):** Frontend clients specify preferred UI language via standard `Accept-Language` HTTP header (e.g. `Accept-Language: tr, en;q=0.9`). Supported MVP UI locales: `en`, `tr`. Future locale: `ar`.
- **AI Target Content Locale (`content_locale`):** AI generation requests (such as `POST /applications/generate`) accept an optional payload parameter `content_locale` (`"en"`, `"tr"`, `"ar"`; default: `"en"`), decoupling UI language from AI output language.

---

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
- **Security:** Optional / Public or Authenticated
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
- **Security:** Authenticated / Public
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
    "tone": "professional"
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

### 2.6 Application Tracker

#### `GET /applications`
Lists tracked internship applications.
- **Security:** Authenticated (`Bearer <JWT>`)
- **Response 200 OK:**
  ```json
  {
    "applications": [
      {
        "id": "app_555",
        "internship_id": "int_001",
        "company_name": "CloudTech Inc.",
        "job_title": "Backend Engineering Intern",
        "status": "applied",
        "generated_cover_letter": "Dear Hiring Manager...",
        "applied_date": "2026-08-10",
        "notes": "Submitted application via portal."
      }
    ]
  }
  ```

#### `PATCH /applications/{id}/status`
Updates tracker state (`saved`, `applied`, `interviewing`, `rejected`, `accepted`).
- **Security:** Authenticated (`Bearer <JWT>`)
- **Request Body:**
  ```json
  {
    "status": "interviewing",
    "notes": "Recruiter scheduled initial screening call."
  }
  ```
- **Response 200 OK:** Updated application object.

---

### 2.7 Polling Asynchronous Jobs

#### `GET /jobs/{job_id}`
Polls status of long-running operations (CV parsing, profile extraction, match calculation, document generation).
- **Security:** Authenticated (`Bearer <JWT>`)
- **Response 200 OK:**
  ```json
  {
    "job_id": "job_cv_123456",
    "status": "completed",
    "progress_percent": 100,
    "result": {
      "profile_id": "prof_123"
    },
    "error": null,
    "updated_at": "2026-08-10T17:01:00Z"
  }
  ```
  *(Status values: `queued` | `processing` | `completed` | `failed`)*
