# Church ERP

Multi-tenant, white-label church ERP platform. Each denomination/country is a
**tenant**; every church, diocese, region, or district it contains is an **org
unit** inside that tenant's own configurable hierarchy. Access is enforced by
PostgreSQL Row-Level Security, not just application code.

- Backend: FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL
- Frontend: React + Vite + TypeScript (per-tenant theming)
- Object storage: MinIO (S3-compatible) — member photos, certificates, verification documents
- Tenancy: shared DB + RLS; each tenant reached by subdomain (`grace.localhost`) or `?tenant=`/`X-Tenant-Slug`

See [`ROADMAP_MEMBER_PORTAL.md`](ROADMAP_MEMBER_PORTAL.md) for the phased build plan.

---

## Running it in Docker

This is the only supported way to run the full stack — `docker-compose.yml`
wires together 5 services: Postgres, Redis, MinIO, the FastAPI backend, and the
Vite frontend.

### 1. First-time setup

```bash
cd church-erp
cp .env.example .env
docker compose up --build
```

On startup the backend container automatically:
1. runs `alembic upgrade head` (applies every migration),
2. runs `python -m app.seeds.seed` (seeds two demo tenants with sample data — safe to re-run, it's idempotent),
3. starts `uvicorn` with `--reload`.

Once it's up:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 (interactive docs at `/docs`) |
| MinIO console | http://localhost:9001 (`minio` / `minio12345`) |
| Postgres | `localhost:5432` (`postgres`/`postgres`, db `church_erp`) |

### 2. Everyday commands

```bash
docker compose up -d          # start in the background
docker compose logs -f backend    # tail one service's logs
docker compose restart frontend   # Vite's file-watcher over the Windows→Linux
                                   # volume mount is unreliable; restart after
                                   # editing frontend code if hot-reload doesn't pick it up
docker compose down           # stop everything, keep data
docker compose down -v        # stop and WIPE all data (Postgres + MinIO volumes)
```

> **Windows note:** `docker compose down -v` (or plain `down`) stops *every*
> service, including the frontend — bring it back with
> `docker compose up -d frontend`; `restart` won't recreate a removed container.

### 3. Try the multi-tenant white-labeling

Two seeded churches with different branding:

- http://localhost:5173/?tenant=grace   → "Grace Community Church" (purple)
- http://localhost:5173/?tenant=stmarks → "St. Mark's Parish" (green)

Seeded login for both: `admin@<tenant>.local` / `password`

(In production, tenants are reached by subdomain: `grace.churcherp.app`.
Locally, pass the tenant via `?tenant=<slug>` query param, the
`X-Tenant-Slug` header, or `grace.localhost:5173`.)

### 4. Run the test suite

```bash
docker compose exec backend pytest -v
```

`tests/test_tenant_isolation.py` proves that with tenant B's context set, a
query **cannot** read tenant A's rows — enforced by Postgres RLS, not app
code. No feature ships until this passes.

### 5. Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | asyncpg connection string — always the non-superuser `church_app` role, never a superuser (RLS is bypassed by superusers/`BYPASSRLS` roles) |
| `REDIS_URL` | Redis connection |
| `JWT_SECRET` | HMAC signing key for access tokens — **change in production** |
| `JWT_EXPIRE_MINUTES` | token lifetime |
| `BASE_DOMAIN` | production wildcard domain used for subdomain tenant resolution |
| `CORS_ORIGINS` | comma-separated allowed origins |
| `MINIO_*` | endpoint/keys/bucket — set directly in `docker-compose.yml` for the containerized stack |

### 6. Running the backend without Docker (optional)

Requires Python 3.12 and a reachable Postgres.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seeds.seed
uvicorn app.main:app --reload
```

### `.claude/launch.json` dev-server shortcuts

The project root (one level above `church-erp/`) has a `.claude/launch.json`
with two named configs you can launch from Claude Code's dev-server picker:

- **web (full stack)** — `docker compose -f church-erp/docker-compose.yml up` (port 5173)
- **api (backend only)** — same, but only `db redis minio backend` (port 8000)

---

## Role-Based Access Control (RBAC)

Authorization is **role (function) × org unit (scope)**. A role like `admin`
means "diocese admin" when assigned at a diocese and "parish admin" when
assigned at a parish — there's no per-denomination explosion of role names.

### How it works

1. **Hierarchy**: each tenant defines its own `HierarchyLevelType`s (e.g.
   Country → Region → Diocese → Parish), and every `OrgUnit` stores a
   materialized path (`/root/child/self/`) so "does scope X cover unit Y" is
   just a string-prefix check.
2. **Assignment**: a user is granted a `role_key` at a specific `OrgUnit` (or
   tenant-wide, scope `/`) via the `Assignment` model.
3. **Capability check**: `authz.can(grants, CAPABILITY, target_path)` returns
   true if *any* active assignment grants that capability with a scope that
   is a prefix of the target path.

### Capabilities (`backend/app/domain/authz.py`)

| Capability | Meaning |
|---|---|
| `manage_structure` | create/edit org units, batch-import churches |
| `manage_members` | register/edit members, verify membership, run the verification queue |
| `manage_sacraments` | record baptisms/marriages/etc. |
| `manage_assets` | register and maintain church assets/inventory |
| `record_finance` | enter finance transactions |
| `view_finance` | view finance reports/entries |
| `view_reports` | view the dashboard/reports center |
| `approve` | approve pending service requests / finance entries (maker-checker: whoever recorded an entry can't approve it) |
| `appoint` | assign roles to members (provisions a login if the appointee has none yet) |

### Role catalog

| Role | Capabilities |
|---|---|
| `tenant_admin` | everything — this is the single Country/Denomination-level Super Admin who registers all churches top-down and issues cascading access |
| `admin` | same capability set as `tenant_admin`, but scoped to whatever unit they're assigned at (e.g. a diocese admin) |
| `pastor` | `manage_members`, `manage_sacraments`, `approve` — sacraments are pastoral acts |
| `secretary` | `manage_members` |
| `treasurer` | `record_finance`, `view_finance` |
| `member` | no elevated capabilities — self-service only (own profile, own requests, own contributions) |

### Key rules enforced in code, not just labels

- **"A leader must already be a member" rule**: appointing someone to a
  leadership role requires them to already be a `Member` whose org unit lies
  within the target scope. If they have no login yet, appointment
  auto-provisions one and returns a one-time `temp_password` shown once to the
  admin doing the appointing.
- **Verification gating**: an unverified member is blocked (HTTP 403) from
  self-requesting privileged sacramental services (e.g. marriage) until a
  leader with `manage_members` approves their verification request.
- **Scoped document/record access**: e.g. a verification document can be
  viewed by the member who owns it, or by anyone whose `manage_members`
  scope covers the routing path (the church where they were baptized, or
  their current church).
- **Self vs. admin editing**: a member can always edit their own profile and
  upload their own photo; editing someone else's requires `manage_members`
  scoped to that member's church.

---

## Password & Login Features

- **Show/hide password toggle** on the login screen (`frontend/src/pages/Login.tsx`).
- **Change password** (`🔑` icon in the app header, any logged-in user):
  `POST /auth/change-password` — requires the current password, hashed with
  Argon2 via `passlib`.
- **Self-registration** (`POST /auth/register`, public, no auth required):
  a prospective member fills in full demographic info, picks their church from
  a dropdown, and is logged in immediately with limited (`unverified`) access.
  To unlock privileged services they upload a certificate (e.g. baptism),
  which routes to the leaders of the church where it happened for review and
  approval.
- **Temporary passwords on appointment**: when an admin appoints a member who
  has no existing login, the system generates a random temporary password
  (`secrets.token_urlsafe(6)`), creates their `User` record, and displays the
  temp password once in the UI so the admin can hand it to the new leader.
- All passwords are hashed with **Argon2** (`app/core/security.py`) — never
  stored or logged in plaintext.
