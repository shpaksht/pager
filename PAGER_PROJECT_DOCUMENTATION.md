# Pager — Project Documentation

## 1. Project Overview

**Pager** is a web application for personal book reading management.
The product combines four core directions in one interface:

- reader speed calibration;
- book ingestion (EPUB and catalog);
- reading planning and forecast;
- ongoing progress tracking with chapter-level control.

The project is designed as a practical reading cockpit where a user can:

- add books quickly;
- estimate real reading time based on personal speed;
- plan start and finish dates;
- track progress chapter by chapter;
- monitor library status and reading portfolio.

---

## 2. Product Goals

Pager solves three practical user problems:

1. **Uncertainty of reading duration**
- user does not know how much time a book will actually take;
- Pager estimates this using a personal reading speed baseline.

2. **Lack of reading structure**
- no clear reading schedule and completion date;
- Pager provides start date, estimated finish date, and completion flow.

3. **Weak execution discipline**
- users lose track of what is already read;
- Pager allows chapter-level tracking and visual progress updates.

---

## 3. Core User Scenarios

### 3.1 Onboarding and Access
- User registers or signs in.
- Auth is powered by Supabase Auth.
- Supported methods:
  - email/password;
  - Google OAuth.

### 3.2 Reading Speed Calibration
- User opens **Speed Test**.
- Receives a long structured reading text.
- Runs timer with Start/Stop.
- System records words per minute (WPM).
- Latest WPM is used across forecasts and planning.

### 3.3 Adding Books
User can add books in two ways via one flow:

- **From Catalog** (Google Books + OpenLibrary search, deduplicated results).
- **Upload EPUB** (drag & drop or file picker, including batch upload).

### 3.4 Matching and Metadata Correction
- If matching is incorrect, user can run **Match / Fix match** from actions.
- Matching can be updated manually from catalog results.
- Cover and metadata are refreshed accordingly.

### 3.5 Start and Finish Reading Flow
- In book header area, user starts reading via **Start** action.
- Start date is selected in modal (today by default).
- After start:
  - estimated finish date appears;
  - finish action becomes available (date modal).

### 3.6 Ongoing Progress Tracking
- User opens a specific book.
- Tracks chapters as read/unread.
- Progress metrics update in real time:
  - Read %;
  - Remaining time;
  - progress bar.

### 3.7 Library Management
- User sees all books in library cards.
- Available controls:
  - search;
  - multi-author filters;
  - multi-status filters;
  - sorting;
  - multi-select and bulk delete;
  - per-book actions (match/fix match/delete).

---

## 4. Full Functional Scope

## 4.1 Authentication

- Registration and login.
- Supabase session-based authentication.
- Google social login support.
- Protected dashboard routes.

## 4.2 Reading Speed Module

- Interactive timed reading test.
- Adjustable text readability controls.
- WPM persistence in database.
- Latest speed used as system-wide baseline.

## 4.3 Book Ingestion Module

- EPUB upload (single and batch).
- Drag-and-drop UX with upload feedback.
- EPUB parsing:
  - title extraction;
  - word count;
  - estimated pages;
  - cover extraction;
  - chapter list generation.
- Catalog add flow:
  - merged search from Google Books and OpenLibrary;
  - result deduplication;
  - quick add to personal library.

## 4.4 Catalog Matching Module

- Automatic matching attempts during upload.
- Manual matching flow (Fix match).
- Match correction from dropdown actions.
- Title/author normalization helpers.

## 4.5 Cover Handling Module

- Cover retrieval from catalog and EPUB sources.
- Smart fallback handling.
- Cover endpoint and cache strategy.
- Versioned cover URLs for reliable refresh behavior.
- Placeholder visuals when no image exists.

## 4.6 Planning and Forecast Module

- Start reading flow (date modal).
- Estimated finish date calculation.
- Finish reading flow (date modal).
- Completion statistics support.

## 4.7 Reading Tracking Module

- Chapter checklist with read state persistence.
- TOC-based chapter ordering.
- Real-time progress updates.
- Remaining time calculation from current progress + WPM.

## 4.8 Library Operations Module

- Search by title and author.
- Multi-select author filters.
- Multi-select status filters.
- Sort options:
  - words;
  - estimated time;
  - start date;
  - finish date.
- Single delete.
- Bulk delete.

## 4.9 UX/UI Module

- Book-inspired visual language.
- Desktop and mobile responsive behavior.
- Unified sidebar (desktop + mobile drawer).
- Modal-based add book workflow.
- Loading states and skeleton screens.

---

## 5. Status Model

Pager uses a practical three-state lifecycle for each book:

- **Pending** — reading has not started (no start date).
- **In Progress** — start date exists, finish date is empty.
- **Completed** — finish date exists.

Status impacts UI and logic:

- progress indicators are emphasized for In Progress;
- tracking tools unlock after reading is started;
- completion actions and stats appear at the final stage.

---

## 6. Data and Computation Principles

### 6.1 Reading Speed
- stored as WPM from speed test sessions;
- latest valid value is used for planning and time estimates.

### 6.2 Page Estimation
- pages are estimation-based where exact pagination is unavailable;
- default heuristic is words-to-pages conversion.

### 6.3 Progress Estimation
- chapter-level read signals are aggregated into percent;
- remaining reading time is derived from unread volume and personal WPM.

### 6.4 Date Forecasting
- estimated finish date is calculated after start date and plan context are known;
- actual finish date closes lifecycle and enables completion reporting.

---

## 7. System Architecture (High-Level)

Pager is implemented as a full-stack web app.

- **Frontend:** Next.js App Router (React + TypeScript)
- **Backend API:** Next.js route handlers
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **External sources:** Google Books API + OpenLibrary

Design approach:

- server-rendered pages where practical;
- client components for interactive reading workflows;
- modular API routes for books, plans, chapters, catalog, auth.

---

## 8. Deployment and Environment Requirements

Required environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GOOGLE_BOOKS_API_KEY`

Deployment target:

- Vercel (production + preview environments)

Operational prerequisite:

- Supabase project configured with Auth providers and PostgreSQL connectivity.

---

## 9. Operational Notes

- If matching is wrong, use **Fix match** rather than re-adding the book.
- For best forecast quality, user should complete speed test before planning.
- If EPUB parsing fails for specific files, fallback behavior still allows catalog-based tracking.
- Extensions in browser can affect perceived UI behavior and visual overlays during QA.

---

## 10. Product Value Summary

Pager delivers a complete reading workflow from “find/add a book” to “finish with measurable results.”

It is not only a catalog or bookshelf app.
It is a **reading execution system** that connects planning, progress control, and time predictability in one practical interface.

