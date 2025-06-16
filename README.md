# MOTK – Production Management System

*Comprehensive Design & Architecture*
**Version 2.4 – Last updated 2025‑06‑16**

---

## Table of Contents

* [1. Core Vision & Guiding Principles](#1-core-vision--guiding-principles)

  * [1.1 The Goal](#11-the-goal)
  * [1.2 Key Design Principles](#12-key-design-principles)
* [2. Architectural Evolution & Final Decisions](#2-architectural-evolution--final-decisions)

  * [2.1 UI/UX Vision – The Three‑Tier Frame](#21-uiux-vision--the-three-tier-frame)
  * [2.2 The “User” Problem – A Journey to Simplicity](#22-the-user-problem--a-journey-to-simplicity)
  * [2.3 Future Vision – Customizable Detail Pages](#23-future-vision--customizable-detail-pages)
  * [2.4 Audit Logs, Multi‑Tenancy, Custom Fields](#24-audit-logs-multi-tenancy-custom-fields)
* [3. Future Vision – Advanced Features & Workflow Enhancements](#3-future-vision--advanced-features--workflow-enhancements)

  * [3.1 Safe Deletion, Archiving & Versioning](#31-safe-deletion-archiving--versioning)
  * [3.2 Advanced Data I/O – Safe CSV Management](#32-advanced-data-io--safe-csv-management)
* [4. The Final Blueprint – Database Schema](#4-the-final-blueprint--database-schema)
* [5. Development Chronicle & Debugging Log](#5-development-chronicle--debugging-log)
* [6. Immediate Roadmap & Technical Stack](#6-immediate-roadmap--technical-stack)

---

## 1. Core Vision & Guiding Principles

### 1.1 The Goal

MOTK is a **highly‑customizable, open‑source production‑management system** for VFX, animation, and game studios. Its ambition is to rival Autodesk ShotGrid while offering:

* **Superior flexibility**
* **More intuitive UI**
* **Modern, maintainable tech stack** (Python / FastAPI, TypeScript / React, PostgreSQL)

MOTK is designed to become the *heart* of production—centralizing data on projects, assets, shots, tasks, media, and personnel to optimize scheduling, quality, and resource allocation.

### 1.2 Key Design Principles

1. **Clarity over Complexity – “No Useless Things”**  Avoid extra tables / abstractions unless they demonstrably improve workflow.
2. **Separation of Concerns – Backend as the Fortress**  All business logic & security live in the API; the frontend only renders.
3. **Pragmatic Evolution – Build, Then Polish**  Ship a minimal, working core first; layer features later.
4. **Workflow‑Driven Design**  Model real‑world, non‑linear creative pipelines (e.g., assign roles before staff exist).

---

## 2. Architectural Evolution & Final Decisions

### 2.1 UI/UX Vision – The Three‑Tier Frame

```
┌────────────── Global Header ──────────────┐
│  Org Switch | Search | Notifications | …   │
└─────── Project Nav (Sidebar / Tabs) ──────┘
│  Toolbar + Context Actions                │
│  ───────────────────────────────────────  │
│  Data Grid / Detail Pane                  │
└───────────────────────────────────────────┘
```

* **Global header** handles cross‑project actions (org switch, profile, global search).
* **Project nav** surfaces project‑scoped entities (Shots, Assets, Tasks, Members…).
* **Main pane** hosts a toolbar + AG Grid, enabling inline edit, sort, filter, bulk ops.

### 2.2 The “User” Problem – A Journey to Simplicity

| Iteration | Idea                                                                                                      | Outcome                                                         |
| --------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **v0**    | Conventional `Account → User → Org`                                                                       | Too rigid for project‑based staffing                            |
| **v1**    | `ProjectAssignment` bridge                                                                                | Complexity remained                                             |
| **v2**    | Distinguish **AccountType** vs **Role**                                                                   | Concept cleared but still heavy                                 |
| **Final** | **Abolish global `User` table**. Introduce `ProjectMember` (role slot) optionally linked to an `Account`. | Simplest model; enables planning before staffing & auto‑credits |

### 2.3 Future Vision – Customizable Detail Pages

Every entity (Project, Shot, Asset, …) will get a dedicated detail page whose layout & visible fields adapt to role and user prefs. Widgets will be React components declared via JSON schema so integrators can extend without forking core.

### 2.4 Audit Logs, Multi‑Tenancy, Custom Fields

* **Audit**: Hybrid—`ActivityLog` (short‑term fine grain) + per‑row `created_by / updated_by`.
* **Multi‑Tenancy**: Simple model “1 Account = 1 Org” (future UI account switcher).
* **Custom Fields**: Deferred; will leverage PostgreSQL `JSONB` for schemaless extension.

---

## 3. Future Vision – Advanced Features & Workflow Enhancements

### 3.1 Safe Deletion, Archiving & Versioning

| Topic           | Strategy                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Soft Delete** | Replace “Delete” with “Archive”. Status flips; data retained.                                                        |
| **UI**          | Delete moved to context menu; “Archived Items” page for restore/perma‑delete.                                        |
| **Versioning**  | Each significant update spawns a new row version; UI diff & revert. Undo button is avoided—history is authoritative. |

### 3.2 Advanced Data I/O – Safe CSV Management

1. **Guided Import Modal** with 4‑step wizard: Upload → Match keys → Validate/Preview → Commit.
2. **Row Matching** defaults to UUID `id`; alt keys (e.g., Shot Name) optional.
3. **Validation** highlights new rows, updates, errors; user chooses conflict policy.
4. **Bulk Media Upload (Long‑term)**: ZIP of thumbnails aligned by filename convention.

---

## 4. The Final Blueprint – Database Schema

```text
accounts
└─ id UUID PK
   organization_id FK
   account_name unique
   display_name   -- human‑readable
   hashed_password
   account_type   -- enum('admin','manager','artist','client')
   created_at, updated_at

project_members
└─ id UUID PK
   project_id FK
   account_id nullable FK
   display_name
   department
   role
   created_at, updated_at

tasks
└─ id UUID PK
   project_id FK
   asset_id   FK nullable
   shot_id    FK nullable
   name, status enum('todo','wip','done')
   assigned_to_id FK project_members
   created_at, updated_at

assets / shots … (similar pattern, each with JSONB `extra_data` column for future custom fields)
```

---

## 5. Development Chronicle & Debugging Log (Excerpt)

* **Alembic Migration Saga**: Mis‑ordered `down_revision` → wiped & regenerated initial migration.
* **Uvicorn ImportError**: Fixed by always launching from repo root + relative imports.
* **npm ETARGET Loop**: Solved by locking all AG Grid deps to 33.3.2.

Full log lives in `docs/devlog/2025‑06‑15.md` (auto‑generated daily).

---

## 6. Immediate Roadmap & Technical Stack

### 6.1 Phase 2 Focus (June 2025)

1. **Inline Editing (AG Grid)** – status: *in progress*.
2. **Soft Delete / Archive** – scaffold API + UI context menu.
3. **Modal‑based Create Forms** – shots, assets.
4. **Media Upload Foundation** – S3‑compatible MinIO, presigned POST.

### 6.2 Technical Stack

* **Backend:** Python 3.12, FastAPI 1.x, SQLAlchemy 2.x, PostgreSQL 14
* **Frontend:** Vite + React 18, TypeScript 5, AG Grid Community 33
* **DevOps:** Docker Compose, GitHub Actions CI/CD, Dependabot, Vite Preview on GH Pages
* **Testing:** Pytest + httpx, Vitest + React Testing Library, Playwright E2E

---

*End of document – includes all prior context plus v2.4 additions, formatted for AI parsability.*
