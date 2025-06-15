# MOTK – Production Management System

*Comprehensive Design & Architecture*

**Version 2.0 – Last updated 2025‑06‑15**

---

## Table of Contents

* [1. Core Vision & Guiding Principles](#1-core-vision--guiding-principles)

  * [1.1 The Goal](#11-the-goal)
  * [1.2 Key Design Principles](#12-key-design-principles)
* [2. Architectural Evolution & Final Decisions](#2-architectural-evolution--final-decisions)

  * [2.1 The "User" Problem: A Design Journey to Simplicity](#21-the-user-problem-a-design-journey-to-simplicity)
  * [2.2 Audit Logs: Balancing Detail and Performance](#22-audit-logs-balancing-detail-and-performance)
  * [2.3 Multi‑Tenancy & Access Control: A Pragmatic Start](#23-multi-tenancy--access-control-a-pragmatic-start)
  * [2.4 Custom Fields: A Deliberately Postponed Goal](#24-custom-fields-a-deliberately-postponed-goal)
* [3. The Final Blueprint: Database Schema](#3-the-final-blueprint-database-schema)
* [4. Development Chronicle & Debugging Log](#4-development-chronicle--debugging-log)
* [5. Immediate Roadmap: Phase 1 (Foundation)](#5-immediate-roadmap-phase-1-foundation)
* [6. Technical Stack](#6-technical-stack)

---

## 1. Core Vision & Guiding Principles

### 1.1 The Goal

MOTK aims to be a **highly customizable, open‑source production management system** tailored for the demanding workflows of VFX, animation, and game‑development studios. The objective is to create a central hub that rivals Autodesk ShotGrid but with:

* **Superior flexibility**
* **More intuitive UI**
* **Modern, maintainable tech stack** (Python / FastAPI, TypeScript / React, PostgreSQL)

MOTK must serve as the *heart* of production, centralizing data on projects, assets, shots, tasks, media, and personnel to optimize scheduling, quality, and resource allocation.

### 1.2 Key Design Principles

These principles were forged through extensive discussion, direct experience, and iterative refinement:

1. **Clarity over Complexity – “No Useless Things”**
   Avoid adding database tables, entities, or abstractions unless they clearly improve workflow.
2. **Separation of Concerns – Backend as the Fortress**
   Backend API holds all business logic and security. Frontend only presents data.
3. **Pragmatic Evolution – Build, Then Polish**
   Start with a simple, solid foundation; add complexity later.
4. **Workflow‑Driven Design**
   Architecture must match real‑world, non‑linear creative workflows (e.g., planning roles before hiring people).

---

## 2. Architectural Evolution & Final Decisions

### 2.1 The "User" Problem: A Design Journey to Simplicity

| Stage                                                                                                                                | Idea / Action                                                                            | Outcome                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Initial State**                                                                                                                    | Conventional schema: `Account ➜ User ➜ Organization`.                                    | Too rigid for project‑based work.                            |
| **Problem**                                                                                                                          | Need to assign tasks to *roles* (e.g., “Lead Modeler”) before actual people are hired.   | —                                                            |
| **Iteration 1 (Rejected)**                                                                                                           | Introduce `ProjectAssignment` bridge table (`User ↔ Task`).                              | Still required global `User` table → unnecessary complexity. |
| **Iteration 2 (Refined)**                                                                                                            | Separate **Account Type** (system permission) from **Role** (project context).           | Conceptual clarity improved, but complexity remained.        |
| **Final Decision (Adopted)**                                                                                                         | **Abolish global `User` table**.                                                         |                                                              |
| `Account` (real person) logs in → creates a `ProjectMember` **role/slot** within a project, optionally linked back to the `Account`. | Dramatically simplified model; enables planning before staffing; auto‑generates credits. |                                                              |

### 2.2 Audit Logs: Balancing Detail and Performance

* **Requirement:** Track changes for accountability/debugging.
* **Challenge:** Logging every read/write risks database bloat.
* **Decision:** Hybrid approach—

  * `ActivityLog` table for high‑granularity changes, auto‑purged (e.g., after 1 week).
  * `created_by` / `updated_by` columns on core tables for permanent low‑overhead traceability.

### 2.3 Multi‑Tenancy & Access Control: A Pragmatic Start

* **Requirement:** Support multiple, isolated organizations.
* **Decision:** *Simple Plan A* – `Account` belongs to one `Organization` (`organization_id` FK).
  Users working across companies create separate accounts; future UI switcher planned.

### 2.4 Custom Fields: A Deliberately Postponed Goal

* Critical for long‑term flexibility but **postponed** to keep core stable.
* Future‑proof design will likely exploit PostgreSQL `JSONB`, avoiding classic EAV pitfalls.

---

## 3. The Final Blueprint: Database Schema

```text
accounts
└─ id (PK, UUID auto‑gen)
   organization_id (FK)
   account_name (unique, login identifier)
   display_name (String)  # human‑readable name for UI
   hashed_password
   account_type (admin | manager | artist | client)
   created_at, updated_at

project_members  (NEW)
└─ id (PK, UUID auto‑gen)
   project_id (FK projects)
   account_id  (nullable FK accounts)
   display_name (String, e.g., "John Doe")
   department  (e.g., "CG", "Production")
   role        (e.g., "Director", "Lead Animator")
   created_at, updated_at

tasks  (MODIFIED)
└─ id (PK, UUID auto‑gen)
   … task‑specific columns …
   assigned_to_id (FK project_members)
   created_at, updated_at

# Note: global `users` table was **deleted** by design.
```

> **ID Generation:** Primary keys (`id`) are auto‑generated UUIDs. **Business rule:** uniqueness is required *only inside each `organization_id`*. UUIDs naturally exceed this requirement (virtually zero collision risk) and make merging data across orgs safe; however, you could also switch to simpler per‑org sequences later if desired.

**Display Name:** `display_name` is the *only* human‑readable field required at creation time (`Account.display_name`, `ProjectMember.display_name`). All other metadata (department, role, permissions, etc.) can be filled in later without breaking references.:\*\* `display_name` provides a user‑friendly label for UI and can be the only required human input at project creation; other metadata can be populated later.:\*\* `display_name` provides a user‑friendly label for UI and can be the only required human input at project creation; other metadata can be populated later.

```
All other tables (`organizations`, `projects`, `shots`, `assets`, …) include standard timestamp and audit columns.

---

## 4. Development Chronicle & Debugging Log

### 4.1 Alembic Migration Saga
| Issue | Cause | Resolution |
|-------|-------|------------|
| *No 'script_location' key found* | Running Alembic from project root | Run inside `/backend` |
| *Target DB not up to date* | Schema ↔ migration mismatch | Purge bad migrations, reset DB |
| *psycopg2.errors.DuplicateTable* | Reversed `down_revision` chain | Delete `alembic/versions`, recreate single “initial” migration |

### 4.2 Uvicorn Startup
| Issue | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: backend` | Ran `uvicorn backend.main:app` *inside* `/backend` | Run from project root |
| `ModuleNotFoundError: database` | Relative imports missing | Use `from .database import …` |

### 4.3 GitHub Authentication
| Issue | Cause | Fix |
|-------|-------|-----|
| Password auth removed | GitHub PAT required | Generate PAT w/ `repo` scope |
| `RPC failed; HTTP 400` | Pushing enormous `venv` folder | Add proper `.gitignore` |

### 4.4 History Cleanup
- Used `git commit --amend` + `git push --force` to remove `directory0613.txt` from history.

---

## 5. Immediate Roadmap: Phase 1 (Foundation)
1. **DB Schema Refresh**  
   - Implement blueprint, generate clean Alembic migration.
2. **Authentication API**  
   - `/auth/register`, `/auth/token` (JWT).
3. **Basic Access Control**  
   - JWT‑based dependency; protect mutating endpoints.
4. **Backend → Frontend Hello‑World**  
   - FastAPI endpoint + React fetch to validate stack.

---

## 6. Technical Stack
- **Backend:** Python 3.12 + FastAPI, SQLAlchemy 2.x
- **Frontend:** TypeScript, React (Vite or Next.js)
- **Database:** PostgreSQL 14+
- **Dependency Mgmt:** `venv` / `pip` (backend), `npm` (frontend)
- **Version Control:** Git / GitHub

---

*End of document – all original content preserved, reformatted for readability.*

```
