# Junior AI Investigator — Fraud Case Review Prototype

An AI-first triage tool for insurance fraud investigators. On load, all 50 sample claims
are automatically scored by an LLM (risk level, confidence, evidence-cited key drivers,
recommended next step) and written to Postgres, so investigators open the app to an
already-triaged queue instead of a blank slate. They can drill into any case, see the raw
signals alongside the AI's reasoning, ask natural-language follow-up questions grounded in
that case's data, and record a disposition + notes.

## Architecture

- **Backend**: Python + FastAPI (`backend/app`)
- **Database**: PostgreSQL 16 — relational columns for claim/signal/workflow fields,
  JSONB for the AI's `key_drivers`, and a `case_chat_history` table (auto-provisioned by
  `langchain-postgres`) for per-case chat transcripts.
- **AI reasoning**: LangChain + Google Gemini (`gemini-3.6-flash`), temperature 0, Pydantic-enforced
  structured output. The model is prompted to reason **only** over the claim's 16 given
  fields, must cite the exact signal name + value behind every key driver (no
  black-box conclusions), and must self-report lower confidence when signals are weak or
  conflicting — this is how uncertainty is surfaced to the investigator instead of hidden.
- **Frontend**: React + TypeScript + Tailwind CSS (`frontend`), a two-screen app (triage
  queue → case detail with signals, AI assessment, disposition actions, notes, and chat).

Postgres runs as a single Docker container; the backend and frontend run natively (no
multi-service orchestration) — this keeps the prototype's iteration loop fast, per the
assignment's "not production software" framing.

## Prerequisites

- Docker Desktop
- Python 3.11+ (tested on 3.14)
- Node.js 18+
- A Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

## Setup & Run

### 1. Start Postgres

```bash
docker run -d --name fraud-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fraud \
  -p 5433:5432 \
  postgres:16-alpine
```

> Uses host port **5433** (not the default 5432) to avoid colliding with any Postgres
> instance already installed/running natively on your machine.

### 2. Backend



Create a .env file under the backend directory and copy paste below :

```bash

GEMINI_API_KEY=your_gemini_api_key_here

DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="fraud"
```
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On startup, the backend automatically creates the schema, loads
`sample_cases_synthetic.csv`, and triages any case that doesn't yet have a `risk_level`
(idempotent — restarting the server does not re-trigger already-scored cases). The first
boot takes roughly 20-40 seconds while all 50 cases are scored.

API available at `http://localhost:8000` (docs at `/docs`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`.


## API

| Endpoint | Description |
|---|---|
| `GET /api/cases` | List cases; filter with `?risk_level=`, `?care_type=`, `?review_status=` |
| `GET /api/cases/{case_id}` | Full case bundle: signals + AI triage + workflow state |
| `POST /api/cases/{case_id}/decision` | Body `{status?, notes?}` — record a disposition and/or save notes |
| `GET /api/cases/{case_id}/chat` | Chat transcript for the case |
| `POST /api/cases/{case_id}/chat` | Body `{message}` — ask a grounded follow-up question |
