# Roadmap: Member Portal, Governance & HR Expansion

> Plans the next big expansion (member self-service, RBAC refinement, transfers,
> announcements, campaigns/budgeting, resources). Builds on the existing platform
> (Phases 0–3, 13 commits). Status: **Phases 1–4 done; Phase 5 next.**

## 0. Framing — one key clarification

**Tenancy stays as-is.** One tenant = one denomination/organization in a country.
- **Country Super Admin** = that tenant's top admin (`tenant_admin`, scope `/`).
- **"Churches"** = **org units** in the hierarchy engine (already built).
- Registering "all churches top-down" = creating/importing the org-unit tree.
- "Cascading access downward" = the scoped-appointment RBAC we already have.
- Multi-tenancy remains for *separate* denominations/countries.

=> This expansion is **extension, not re-architecture.**

## What already exists (reuse — do not rebuild)
- Hierarchy engine (levels + org units + materialized path)
- Role-at-unit RBAC (scoped `Assignment`, `appoint`)
- Provisioning / onboarding wizard
- Members (rich profile, tied to org unit) — currently create-only
- Sacraments + **PDF generation** (reuse for transfer letters, ID cards)
- **Service-request workflow engine** (reuse for verification + transfers)
- Finance (maker-checker, contributions) + Assets + Reports/Dashboards
- Redis + Celery already in docker-compose (async / notifications)

## New foundations most features depend on
1. **User ↔ Member linkage** (a member can log in; a leader is a member + a role).
2. **File/object storage** (MinIO) — certificates, resources, photos, ID cards.
3. **In-app notifications** core (announcements, routing verification/transfers).
4. **Member verification status** (gates certain services).

---

## Requirement → phase mapping (nothing dropped)

| Your item | Phase |
|---|---|
| 1. Country super admin, batch church registration, cascading access | 1 |
| 2. Structure listing by level + leaders + filter | 1 |
| 3a. Login view/change password | 1 |
| 3a. Member self-registration + demographics + church select | 2 |
| 3a. Verification workflow (upload certs, leader verifies, route to baptism church) | 2 |
| 8. Member profile full CRUD + photo upload | 2 |
| 3b. Transfers between churches (out/in letters, move profile) | 3 |
| 5. Announcements card + notifications (admins publish by level) | 4 |
| 7. Wire all cards clickable | 4 |
| 6. Contribution & donation campaigns (target vs collected) | 5 |
| 9. Budgeting (periods, allocated/available/deficit, request central) | 5 |
| 10. Income-generating assets categorized by source | 5 |
| 4. Resources library (downloadable books/PDFs/prayers) | 6 |
| 8. Print member ID card (level-based) | 6 |

---

## Phase 1 — Foundations & RBAC refinement ✅ done
**Goal:** identity, files, org-unit registration, and the "leader is a member first" rule.
- **User ↔ Member link** (`Member.user_id`) + migration. A member may have a login; a
  staff/leader = a member with a `User` account + an `Assignment`.
- **Appoint-from-members**: appointment picks an existing *member of that unit* (enforces
  "must be a member first"), and provisions/links their user account.
- **Org-unit registration data**: add `external_id/code`, `region`, `district`, optional
  GPS to `OrgUnit`; **batch import** (CSV/XLSX upload → build hierarchy) for the super admin.
- **Object storage (MinIO)**: add the service to compose; a file upload/download API with
  access control (used by Phases 2/6). Size/type limits.
- **In-app notification core**: `Notification` model + emit helper + list/mark-read API
  (Phases 2–4 emit into it).
- **Login UX**: show/hide password toggle + change-password endpoint & screen.
- **Structure by level** (item 2): filter units by level, show each unit's leader(s)
  (join assignments).
- *Exit:* super admin can batch-import the church tree, appoint a regional admin from a
  member, who can cascade appointments downward; files can be stored; passwords changed.

## Phase 2 — Member self-service portal & verification ✅ done
**Goal:** the public member experience.
- **Public self-registration**: creates `User` + `Member` (full demographics, select a
  church). Security: rate-limit, email verification, spam controls.
- **Member profile full CRUD** (item 8) + **photo upload** (MinIO).
- **Verification workflow** (reuse workflow engine):
  - New member is `unverified`; can use basic services + give/tithe, but gated from
    privileged actions (e.g. request a wedding).
  - Dashboard shows "not verified" + a **Request verification** form (upload baptism/other
    certificates; choose the **baptizing church** from a dropdown).
  - Request routes to that church's leader queue; leader verifies docs → `verified`
    (full privileges). Never-baptized → leader approves after internal evaluation.
- **Service gating**: capability/status checks so unverified members see limited options.
- *Exit:* a member self-registers, uploads a baptism certificate, a leader verifies, and
  privileged services unlock.

## Phase 3 — Transfers between churches ✅ done
**Goal:** move a member (with profile) between units, two-step.
- **Transfer request**: member → source-unit leader approves → **transfer-out letter (PDF)**
  → routed to destination-unit leader → destination approves → member's `org_unit_id`
  (and profile) moves; both sides notified; sacramental history preserved.
- Reuses the service-request workflow + certificate-PDF infra + notifications.
- *Exit:* an approved transfer relocates a member and their profile across units.

## Phase 4 — Announcements & notifications UI ✅ done
**Goal:** communication + finishing the clickable UX.
- **Announcements**: model scoped by org unit/level + urgency; admins publish within their
  scope; **latest-announcement card** on every dashboard, clickable, ordered by urgency.
- **Notification center** in every profile (feed from approvals, verification, transfers,
  announcements). In-app now; email/SMS later (needs provider — Celery ready).
- **Wire all cards clickable** (item 7): dashboard/stat cards navigate to their module.
- *Exit:* an admin publishes a scoped announcement; members see it + a notification; cards
  navigate.

## Phase 5 — Financial expansion
**Goal:** campaigns, budgeting, and income sources.
- **Contribution/donation campaigns** (item 6): `Campaign` (name, target, budget, dates);
  members contribute (links to finance contributions); **progress card (collected vs
  target)**; highlighted causes ("helping the poor", building project, etc.).
- **Budgeting** (item 9): `Budget` per period (month/quarter/semi/annual/year) with
  allocations; budget-vs-actual from finance; on deficit, **request additional** from the
  parent/central unit (up the hierarchy) or open a member campaign.
- **Income-generating assets** (item 10): flag assets as income sources (farm, livestock,
  school, rental building, radio, business); income entries categorized by source;
  **income-by-source** report.
- *Exit:* an admin runs a building-fund campaign with a live progress bar, sets a quarterly
  budget, and sees income grouped by source.

## Phase 6 — Resources library, ID cards & polish
**Goal:** member-facing content + final deliverables.
- **Resources library** (item 4): leaders upload books/PDFs/prayers (MinIO); members browse
  + download; scoped by unit/level; categories.
- **Member ID card PDF** (item 8): level-based, includes photo; printable.
- Final UX polish (remaining filters, empty states, mobile).
- *Exit:* members download resources; leaders print member ID cards.

---

## Cross-cutting risks & decisions
- **File storage & PII**: certificates and photos are sensitive PII. Need access control
  (who can view/download), size/type limits, ideally malware scanning, and a retention
  policy (Tanzania PDPA 2022). Certificates route only to the relevant church leader.
- **Public registration abuse**: rate-limiting, email verification, and possibly CAPTCHA
  to prevent spam/fake members. Unverified members are limited by design.
- **Notifications delivery**: in-app first; email/SMS needs a provider (SMTP / an SMS
  gateway) and credentials you supply — deferred but Celery-ready.
- **Verification routing** needs a `baptized_at` unit reference on the member (dropdown at
  registration/verification).
- **Budget "request from central"** climbs the org hierarchy — reuses scope/parent path.

## Decisions (LOCKED 2026-07-18)
1. **Tenancy: CONFIRMED** — country/denomination = tenant; Country Super Admin = tenant_admin
   (scope `/`); churches = org units. No re-architecture.
2. **File storage: MinIO** (self-hosted, S3-compatible) — add to docker-compose; swap for
   cloud S3/R2 later with no code change.
3. **Signup: open self-registration + verification gates** — anyone registers and uses basic
   services + giving immediately; privileged actions unlock after leader verification.
4. Batch import: CSV first (columns: level_key, name, code, parent_code, region, district).
5. Proceeding to **build Phase 1** now, one increment at a time, verified + committed.
