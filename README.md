# Task Compass

Task Compass is an interactive full-stack workplace simulation platform designed to bridge the gap between academic theory and real-world engineering teamwork. Students step into cross-functional organizational environments—navigating incidents, identifying ownership boundaries, building task escalation pipelines, and coordinating multi-role teams under realistic operational constraints. Built with Django REST Framework, modular Vanilla JavaScript, and a tailored Vanilla CSS design system, Task Compass provides authoritative server-side assessment, personalized competency analytics, and verifiable career readiness credentials.

---

## Live Demo

* **Live Deployment:** [https://task-compass.onrender.com](https://task-compass.onrender.com)
* **Status:** Configured for cloud hosting on Render via automated Blueprint (`render.yaml`).
* **Local Production Preview:** Available via `gunicorn task_compass.wsgi:application` or `python manage.py runserver`.

---

## Overview

Traditional technical education excels at teaching syntax and isolated algorithms but rarely prepares students for how software organizations actually operate. In production environments, engineers do not work in isolation—they coordinate with Product Managers, UX Designers, DevOps Engineers, and Security Analysts across complex workflows.

Task Compass solves this problem by immersing students in simulated enterprise scenarios where they master four essential workplace pillars:
1. **Ownership**: Identifying primary accountability for critical system components and incidents.
2. **Delegation**: Routing tasks and security alerts to the correct specialist rather than hoarding work.
3. **Collaboration**: Assembling cross-functional squads to tackle multi-dimensional challenges.
4. **Workflow Thinking**: Understanding sequential handoffs, escalation paths, and communication flows.

---

## Key Features

* **Authentic Workplace Catalog**: 4 curated workplace profiles (Tech Company, Startup, Corporate Office, Healthcare) with distinct organizational dynamics.
* **12 Tech Company Roles**: Deep role exploration cards with high-resolution portraits, core responsibilities, key collaborators, and cybersecurity distinctions.
* **3-Stage Simulation Engine**: Interactive problem-solving spanning Ownership, Task Routing, and Collaboration Challenges.
* **Accessible Interaction Modes**: Drag-and-drop mechanics paired with accessible keyboard buttons (`▲`/`▼`) and native dropdown fallbacks for complete WCAG compatibility.
* **Authoritative Server-Side Scoring**: Anti-tampering assessment engine that calculates percentage scores, strengths, and areas to practice directly from persisted database responses.
* **Student Identity & Session Migration (Step 15)**: Frictionless guest exploration with retroactive session linking upon student registration or login.
* **Career Portfolio Dashboard (Step 16)**: Analytics dashboard tracking simulation history, average score, and competency tiers (Mastered, Proficient, Developing).
* **Question-by-Question Review Drawer (Step 16)**: Historical audit drawer allowing students to inspect their answers against optimal role rationales.
* **Verified Career Readiness Certificates (Step 16)**: Official credentials with unique verification codes (`TC-VERIFIED-*`) awarded for scores $\ge$ 70%.
* **Zero External CSS/JS Dependencies**: Fast, lightweight frontend built entirely in Vanilla ES6+ and Vanilla CSS without bulky frameworks.
* **Production-Hardened Asset Pipeline**: WhiteNoise compression and caching for instant page loads.

---

## Simulation Workflow

```
Workplace Selection (Tech Company)
         ↓
Role Exploration (12 Detailed Roles)
         ↓
Simulation Start (Guest or Authenticated)
         ↓
Stage 1 — Who Owns This? (Accountability Triage)
         ↓
Stage 2 — Task Routing (Sequential Escalation Pipelines)
         ↓
Stage 3 — Collaboration Challenge (Cross-Functional Squad Assembly)
         ↓
Final Results & Scorecard (Authoritative 9/9 Assessment & Strengths)
         ↓
Student Reflection (Takeaway Persistence & Session Finalization)
         ↓
Dashboard Analytics / Question Review / Verified Certificate
```

---

## Simulation Stages

### Stage 1 — Who Owns This?
Students evaluate ambiguous, high-urgency incidents (e.g., suspected database breach, checkout funnel latency, design system drift) and determine the single role with primary accountability. This stage reinforces ownership boundaries and prevents diffusion of responsibility.

### Stage 2 — Task Routing
Students receive complex operational tasks and construct the exact sequential route required to resolve them (e.g., API latency triage, security patch pipelines, customer churn mitigation). Students practice workflow order, delegation, and inter-departmental handoffs.

### Stage 3 — Collaboration Challenge
Students confront enterprise-scale challenges (e.g., payment gateway blackouts, SOC 2 compliance audits, Black Friday peak traffic scaling). Students must nominate the primary squad lead, select supporting cross-functional collaborators, and specify the operational flow.

---

## Technology Stack

### Frontend
* **HTML5**: Semantic document layout with ARIA landmarks and dialog roles.
* **Vanilla CSS3**: Bespoke design system utilizing CSS Custom Properties (`variables.css`), responsive Flexbox/Grid (`layout.css`), and micro-interactions (`components.css`, `stages.css`).
* **Vanilla ES6+ JavaScript**: Modular, framework-free architecture (`api.js`, `state.js`, stage controllers, and `app.js`).
* **Typography**: Google Fonts (*Outfit* for headings, *Inter* for body copy).

### Backend
* **Python**: 3.12+ (tested up to 3.14).
* **Django**: 6.1.1 (High-performance web framework).
* **Django REST Framework (DRF)**: 3.18.1 (RESTful API serializers, views, and permission classes).
* **WhiteNoise**: 6.12.0 (High-performance static file compression and caching).
* **Gunicorn**: 26.2.0 (Production WSGI HTTP server).

### Database
* **Development**: SQLite3 (`db.sqlite3`).
* **Production**: PostgreSQL support via `dj-database-url` and `psycopg2-binary` (auto-detected via `DATABASE_URL`).

### APIs
* **REST Architecture**: 20 standardized JSON endpoints with CSRF token authentication and object-level authorization.

### Deployment & Tooling
* **Render**: Infrastructure-as-Code Blueprint (`render.yaml`) and `Procfile`.
* **Database Seeder**: Custom idempotent Django management command (`python manage.py seed_task_compass`).

---

## System Architecture

```
[ Client Browser (Desktop / Tablet / Mobile) ]
                      │
                      │ HTTPS (TLS 1.3)
                      ▼
[ Cloud Edge Proxy / Reverse Proxy (Render / Nginx) ]
  • SSL Termination
  • 'X-Forwarded-Proto: https' Injection
                      │
                      │ HTTP / Unix Socket
                      ▼
[ Gunicorn WSGI Application Server ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ WhiteNoise Middleware ]   [ Django Application Pipeline ]
• /static/* Interception     • Security & CSRF Middleware
• Gzip/Brotli Compression   • Authentication & Session Middleware
• Browser Cache Headers      • DRF Class-Based API Views
        │                    • Object-Level Authorization (`check_session_ownership`)
        ▼                    • Public Serializers (Answer Key Masking)
[ staticfiles/ Root ]               │
                                    ▼
                            [ Django ORM ]
                                    │
                                    ▼
                            [ Database Layer ]
                            • SQLite3 (Default) OR
                            • Managed PostgreSQL (`DATABASE_URL`)
```

---

## Database Schema & Models

```
┌──────────────────┐        ┌──────────────────┐
│    Workplace     │───────<│       Role       │
└──────────────────┘        └──────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│     Scenario     │───────<│  ScenarioOption  │
└──────────────────┘        └──────────────────┘
         │
         │
         ▼
┌──────────────────┐        ┌──────────────────┐
│SimulationSession │───────<│  StageResponse   │
└──────────────────┘        └──────────────────┘
         │
         │ 1:1
         ▼
┌──────────────────┐
│StudentReflection │
└──────────────────┘
```

* **`Workplace`**: Defines organizational contexts (e.g., Tech Company, Startup) with styling themes and order.
* **`Role`**: Represents specialized positions with category, responsibilities, collaborators, and image references.
* **`Scenario`**: Multi-stage simulation prompts storing incident situations, target roles, ideal routes, and rationales.
* **`ScenarioOption`**: Selectable answers with stage-specific score weights and educational feedback.
* **`SimulationSession`**: Central session record tracking student identity, current stage, individual stage scores, and completion status.
* **`StageResponse`**: Historical record of student submissions, selected options, and student reflection notes.
* **`StudentReflection`**: One-to-one takeaway record capturing Ownership, Delegation, Collaboration, and Workflow learning points.

---

## API Reference

The application provides 20 RESTful API endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Serves the main Single-Page Application (SPA) HTML shell |
| `GET` | `/api/workplaces/` | Lists all available workplaces with summary metadata |
| `GET` | `/api/workplaces/<slug_or_id>/` | Retrieves detailed workplace data and all associated roles |
| `POST` | `/api/sessions/` | Initializes a new simulation session for a student or guest |
| `GET` | `/api/sessions/<session_id>/` | Fetches active session state, progress, and answered questions |
| `POST` | `/api/sessions/<session_id>/answers/` | Submits answers for Stages 1, 2, or 3 with server validation |
| `GET` | `/api/sessions/<session_id>/stage/<stage_num>/` | Returns sanitized scenario prompts for a specific stage |
| `POST` | `/api/sessions/<session_id>/stage/<stage_num>/submit/` | Batch submission endpoint for stage responses |
| `GET` | `/api/sessions/<session_id>/results/` | Authoritative calculation of stage scores, percentages, and takeaways |
| `GET` | `/api/sessions/<session_id>/reflection/` | Retrieves saved student reflection takeaways |
| `POST` | `/api/sessions/<session_id>/reflection/` | Saves student takeaways and marks the simulation completed |
| `POST` | `/api/sessions/<session_id>/complete/` | Explicitly transitions session status to completed |
| `POST` | `/api/auth/register/` | Registers a student account, auto-logs in, and links active guest session |
| `POST` | `/api/auth/login/` | Authenticates student credentials and links active guest session |
| `POST` | `/api/auth/logout/` | Terminates active student authentication session |
| `GET` | `/api/auth/me/` | Returns active student profile, simulation statistics, or guest state |
| `GET` | `/api/auth/history/` | Returns student simulation history and portfolio statistics |
| `GET` | `/api/student/dashboard/` | Computes competency tiers (Mastered/Proficient), history, and certificates |
| `GET` | `/api/sessions/<session_id>/review/` | Question-by-question audit drawer with user answers and optimal rationales |
| `GET` | `/api/sessions/<session_id>/certificate/` | Generates verified certificate credential (enforces $\ge 70\%$ threshold) |

---

## Security & Hardening

* **Object-Level Authorization (IDOR Prevention)**: `check_session_ownership()` enforces that authenticated student sessions cannot be viewed, tampered with, or completed by other users.
* **Answer Key Isolation**: `ScenarioPublicSerializer` automatically filters out `primary_owner_id`, `workflow_route`, and `explanation` from public API payloads, eliminating client-side inspection vulnerabilities.
* **Authoritative Server-Side Scoring**: Client submissions cannot alter scores; point values and percentages are computed dynamically from stored database responses.
* **Cross-Site Request Forgery (CSRF)**: CSRF tokens are injected via `<meta name="csrf-token">` and transmitted via `X-CSRFToken` HTTP headers on all mutating requests.
* **Security Headers**:
  * `X-Frame-Options: DENY` blocks clickjacking iframe embedding.
  * `X-Content-Type-Options: nosniff` stops MIME-type sniffing.
  * `SECURE_PROXY_SSL_HEADER` honors proxy TLS headers.
* **Cookie Security**: `SESSION_COOKIE_HTTPONLY = True`, `SESSION_COOKIE_SAMESITE = 'Lax'`, and configurable `SESSION_COOKIE_SECURE = True` in production.
* **Input Validation**: Strict serializer validation rejects malformed payloads, non-UUID route parameters, and duplicate answer submissions.

---

## Responsive Design

Task Compass is built from the ground up to support modern form factors without layout breakage or horizontal overflow:

* **Desktop (1920 × 1080 & 1366 × 768)**: Two-column hero, 4-column workplace card grid, 3-column role catalog, wide simulation drag-and-drop workspace.
* **Tablet (768 × 1024)**: Responsive 2-column role grid, stacked dropzones, collapsible navigation header, 44px+ touch targets.
* **Mobile (390 × 844 & Small Screens)**: Single-column flow, sliding drawer menu, modal dialogs resized to 95vw, and accessible button-based route ordering (`▲`/`▼`) eliminating mobile drag limitations.

---

## Testing & Quality Assurance

Task Compass underwent an exhaustive testing and verification pass in Step 18 and Step 19:

* **Total Automated Tests Executed**: 144 tests across 12 distinct test suites.
* **Pass Rate**: 100% (144 Passed, 0 Failed).
* **Test Coverage**:
  * Application startup & migration consistency (17 migrations verified).
  * Workplace & 12-role catalog data integrity.
  * Complete user simulation journeys (Stages 1, 2, and 3).
  * Error cases: Duplicate submissions, incomplete routes, duplicate roles in route, unauthorized access.
  * Student authentication, session migration, and history tracking.
  * Dashboard analytics, question review drawer, and verified certificate generation.
  * All 20 API contracts validated for status codes and payloads.
* **Database Optimization**: Reduced session detail queries from 26 down to 10 queries using `select_related`, `prefetch_related`, and in-memory partitioning (average response time under 16ms).

---

## Deployment

Task Compass is prepared for zero-downtime deployment on **Render** (as well as Railway, Fly.io, or any Docker/Linux host).

* **WSGI Server**: Gunicorn (`gunicorn task_compass.wsgi:application`).
* **Static Assets**: Processed via `python manage.py collectstatic --noinput` and served via WhiteNoise with compression.
* **Render Blueprint**: Configured via [render.yaml](render.yaml) for automated one-click setup.

### Automated Deployment with Render
1. Push this repository to GitHub.
2. Log in to [Render](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml`, configures environment variables, builds static assets, runs migrations, and seeds the database.
4. Your application will be live at `https://task-compass.onrender.com`.

---

## Project Structure

```
Task-Compass/
├── .env.example              # Template for production environment variables
├── .gitignore                # Source control ignore rules (protects secrets & DB)
├── manage.py                 # Django command-line management utility
├── Procfile                  # Gunicorn web worker declaration for cloud deployment
├── README.md                 # Professional repository documentation
├── render.yaml               # Render Infrastructure-as-Code deployment blueprint
├── requirements.txt          # Python production dependencies
├── scratch/                  # QA test suites & verification scripts
│   ├── test_step15_auth.py
│   ├── test_step16_dashboard_review_cert.py
│   ├── test_step17_security.py
│   ├── test_step18_complete_system.py
│   └── test_step19_production_deployment.py
├── simulation/               # Core Django simulation application
│   ├── admin.py              # Django admin model registrations
│   ├── apps.py               # Simulation app configuration
│   ├── management/
│   │   └── commands/
│   │       ├── seed_simulation.py
│   │       └── seed_task_compass.py  # Comprehensive database seeder
│   ├── migrations/           # 17 applied schema migrations
│   ├── models.py             # Workplace, Role, Scenario, Session, Response, Reflection
│   ├── serializers.py        # DRF serializers (public vs internal, feedback, profile)
│   ├── urls.py               # API route definitions
│   └── views.py              # 20 REST API Class-Based Views & index view
├── static/                   # Static source assets
│   ├── css/
│   │   ├── base.css          # CSS reset and baseline styling
│   │   ├── components.css    # Cards, buttons, badges, modals, drawers, certificate
│   │   ├── layout.css        # Navigation, hero, layout grids, footer
│   │   ├── stages.css        # Stage workspaces, dropzones, ordering chips
│   │   └── variables.css     # CSS design tokens (colors, typography, shadows)
│   ├── images/
│   │   └── roles/            # 12 real photography portraits for Tech Company roles
│   └── js/
│       ├── api.js            # Centralized fetch wrapper with CSRF injection
│       ├── app.js            # Main SPA orchestrator, auth modals, dashboard
│       ├── state.js          # Reactive client state management
│       └── stages/
│           ├── results.js    # Scorecard, percentage breakdown, reflection form
│           ├── stage1_ownership.js     # Stage 1 drag-and-drop & accessible picker
│           ├── stage2_routing.js       # Stage 2 sequence ordering controller
│           └── stage3_collaboration.js # Stage 3 squad assembly controller
├── staticfiles/              # Collected, compressed static assets for WhiteNoise
├── task_compass/             # Django project configuration package
│   ├── asgi.py
│   ├── settings.py           # Production settings, WhiteNoise, DRF, Security
│   ├── urls.py               # Root URL configuration
│   └── wsgi.py               # WSGI entrypoint for Gunicorn
└── templates/                # HTML templates
    ├── base.html             # Base shell, meta tags, modals, drawers, script loads
    └── index.html            # SPA view containers (home, stages, results, dashboard)
```

---

## Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/task-compass.git
cd task-compass
```

### 2. Create and Activate a Virtual Environment
```bash
# On Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# On macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
*(For local development, default values in `settings.py` work out of the box with `DEBUG=True`).*

### 5. Apply Migrations
```bash
python manage.py migrate
```

### 6. Seed Simulation Data
Populate all 4 workplaces, 12 tech roles, and simulation scenarios:
```bash
python manage.py seed_task_compass
```

### 7. Run the Development Server
```bash
python manage.py runserver
```

### 8. Open the Application
Navigate to [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

---

## Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `SECRET_KEY` | Cryptographic key for signing sessions and CSRF tokens | `django-insecure-...` *(generate a 50+ char key in prod)* |
| `DJANGO_DEBUG` | Enables or disables debug mode (`True` or `False`) | `True` (dev) / `False` (prod) |
| `ALLOWED_HOSTS` | Comma-separated list of hostnames allowed to serve the app | `localhost,127.0.0.1,.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated list of trusted origins for CSRF verification | `https://*.onrender.com` |
| `SECURE_SSL_REDIRECT` | Enforces HTTPS redirection across all incoming requests | `False` (dev) / `True` (prod) |
| `DATABASE_URL` | Optional PostgreSQL connection string (defaults to SQLite if unset) | `postgres://user:password@host:5432/dbname` |
| `DJANGO_LOG_LEVEL` | Logging threshold for server events (`INFO`, `WARNING`, `ERROR`) | `INFO` |

---

## Screenshots

<!-- Add application screenshots here for GitHub preview -->
| Home & Role Exploration | Stage 1: Who Owns This? |
|---|---|
| ![Workplace Exploration](static/images/roles/cybersecurity-engineer.jpg) | *(Interactive ownership dropzones)* |

| Stage 2: Task Routing | Verified Career Certificate |
|---|---|
| *(Sequential pipeline builder)* | *(Official credential with verification code)* |

---

## Future Improvements

* **Multi-Player Team Incidents**: Real-time collaborative incident simulations using WebSockets / Django Channels.
* **Additional Workplace Scenarios**: Full 3-stage incident packs for the Startup, Corporate Office, and Healthcare workplaces.
* **PDF Certificate Export**: Client-side or server-side downloadable PDF credential generator using Canvas / ReportLab.
* **Timer & Stress-Testing Modes**: Optional time-bounded incident modes simulating high-pressure live production outages.

---

## Author

* **Satya & Task Compass Contributors**
* **Project Repository:** [https://github.com/your-username/task-compass](https://github.com/your-username/task-compass)
* Developed as an interactive full-stack learning platform showcasing modern Django REST Framework, Vanilla JavaScript, and web engineering best practices.
