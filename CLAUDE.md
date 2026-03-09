# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Platziflix is a multi-platform course catalog (Netflix-style) with:
- **Backend**: FastAPI + PostgreSQL (Docker)
- **Frontend**: Next.js 15 (App Router, TypeScript)
- **Mobile**: Android (Kotlin + Jetpack Compose) + iOS (Swift + SwiftUI)

## Development Commands

### Backend

All backend commands run via Docker. Always verify containers are running before executing commands. Check `Backend/Makefile` for the full list.

```bash
cd Backend
make start              # docker-compose up -d
make stop               # docker-compose down
make logs               # docker-compose logs -f
make migrate            # alembic upgrade head (runs inside container)
make create-migration   # interactive prompt to create new migration
make seed               # populate DB with test data
make seed-fresh         # clear + recreate seed data
make clean              # remove containers, volumes, images
```

**Running tests (inside container):**
```bash
# All tests
docker-compose exec api bash -c "cd /app && uv run pytest app/ -v"

# Single file
docker-compose exec api bash -c "cd /app && uv run pytest app/test_main.py -v"

# Single test class
docker-compose exec api bash -c "cd /app && uv run pytest app/test_main.py::TestCoursesEndpoints -v"

# Single test
docker-compose exec api bash -c "cd /app && uv run pytest app/test_main.py::TestCoursesEndpoints::test_get_all_courses_success -v"
```

### Frontend

```bash
cd Frontend
yarn dev            # dev server on :3000
yarn build          # production build
yarn test           # Vitest (all tests)
yarn test --watch   # watch mode
yarn lint           # ESLint
```

**Single test file:**
```bash
yarn test src/components/StarRating/__tests__/StarRating.test.tsx
```

## Architecture

### Backend (`Backend/app/`)

- **`main.py`** — FastAPI app + all route definitions
- **`models/`** — SQLAlchemy models; `base.py` provides `id`, `created_at`, `updated_at`, `deleted_at`
- **`services/course_service.py`** — All business logic; injected via FastAPI `Depends(get_course_service)`
- **`schemas/rating.py`** — Pydantic request/response schemas
- **`db/base.py`** — SQLAlchemy engine + `get_db` session dependency
- **`alembic/versions/`** — Migration files

**API endpoints:**
```
GET  /courses                                      → list with rating stats
GET  /courses/{slug}                               → detail + teachers + lessons
GET  /classes/{class_id}                           → lesson detail + video URL
POST /courses/{course_id}/ratings                  → create or update (201)
GET  /courses/{course_id}/ratings/stats            → aggregated stats
GET  /courses/{course_id}/ratings/user/{user_id}   → user's rating (204 if none)
PUT  /courses/{course_id}/ratings/{user_id}        → update existing only
DELETE /courses/{course_id}/ratings/{user_id}      → soft delete (204)
```

**Data model:**
- `Course` ↔ `Teacher` (Many-to-Many via `course_teachers`)
- `Course` → `Lesson` → `Class` (One-to-Many chains)
- `Course` → `CourseRating` (One-to-Many; one active rating per user per course enforced via UNIQUE + `deleted_at`)
- `Course.average_rating` and `Course.total_ratings` are Python-level properties; stats endpoints use DB-level aggregation

**Error handling pattern:** Raise `ValueError` in service layer → caught in endpoint → returns `HTTPException`

**Testing strategy:** unittest.mock for CourseService; no DB dependencies in unit tests. AAA pattern throughout.

### Frontend (`Frontend/src/`)

- **`app/`** — Next.js App Router pages; Server Components with async `fetch`
- **`components/`** — `Course`, `CourseDetail`, `VideoPlayer`, `StarRating`
- **`services/ratingsApi.ts`** — Client-side API calls for ratings
- **`types/`** — TypeScript interfaces (`index.ts` for core types, `rating.ts` for rating types)
- **`test/setup.ts`** — Vitest + jsdom + React Testing Library setup

Path alias `@/` maps to `./src/`.

### Mobile

- **Android** (`Mobile/PlatziFlixAndroid/`): MVVM + Jetpack Compose + Retrofit
- **iOS** (`Mobile/PlatziFlixiOS/`): SwiftUI + Repository + Mapper Pattern; directories: `Presentation/`, `Domain/`, `Data/`, `Services/`

## Key Conventions

- **Naming**: `snake_case` (Python), `camelCase` (TS/JS), `PascalCase` (Swift/Kotlin/React components)
- **Soft deletes**: `deleted_at` field used everywhere (models + ratings)
- **Migrations**: required for all DB schema changes; auto-migrate on `make start`
- **Data source**: Frontend and Mobile consume only the REST API; no direct DB access

## Specs & Reference Docs

- `spec/` — Implementation plans and security review for the rating system
- `Backend/specs/00_contracts.md` — API contract specifications
- `Backend/app/TESTING_README.md` — Comprehensive backend testing guide
- `.claude/agents/` — Specialized agent personas for backend, frontend, and architect roles
