# SupportPilot — AI Support Desk Copilot

A complete, portfolio-ready full-stack AI support desk application with semantic search, RAG-powered answer drafting, human-in-the-loop approval, and AI evaluation.

## Architecture

`
SupportPilot/
├── backend/          # Python FastAPI + SQLAlchemy + pgvector
├── frontend/         # React + TypeScript + Vite + Tailwind CSS
├── docker-compose.yml  # PostgreSQL + pgvector local dev
└── README.md
`

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x, Alembic |
| Database | PostgreSQL 16 + pgvector (768-dim embeddings) |
| AI Engine | Google Gemini API (gemini-2.0-flash + text-embedding-004) |
| Auth | JWT (python-jose + passlib) |
| Testing | Pytest, httpx test client |

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (for PostgreSQL with pgvector)
- Google Gemini API key (get one free at https://aistudio.google.com)

## Quick Start

### 1. Start the Database

`ash
docker-compose up -d
`

This starts PostgreSQL 16 with the pgvector extension on port 5432.

### 2. Backend Setup

`ash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY

# Run database migrations
alembic upgrade head

# (Optional) Seed demo data
python scripts/seed_demo.py

# Start the server
uvicorn app.main:app --reload --port 8000
`

Backend API: http://localhost:8000  
API docs: http://localhost:8000/docs  
Health check: http://localhost:8000/api/health

### 3. Frontend Setup

`ash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start dev server
npm run dev
`

Frontend: http://localhost:5173

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@supportpilot.demo | demo1234 |
| Agent | agent@supportpilot.demo | demo1234 |

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | ✅ |
| SECRET_KEY | JWT signing secret (256-bit) | ✅ |
| GEMINI_API_KEY | Google Gemini API key | ✅ |
| ALGORITHM | JWT algorithm (default: HS256) | ❌ |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token lifetime (default: 1440) | ❌ |
| EMBEDDING_DIMENSIONS | Vector dimensions (default: 768) | ❌ |
| DEFAULT_TOP_K | RAG retrieval count (default: 5) | ❌ |
| MIN_SIMILARITY_THRESHOLD | Min cosine similarity (default: 0.7) | ❌ |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend URL (default: http://localhost:8000) |

## Running Tests

`ash
cd backend
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=app --cov-report=html
`

## Application Features

### A. Dashboard
Real metrics from database: ticket counts, urgency distribution, resolution stats, KB statistics.

### B. Ticket Management
Create, list, filter, search, assign tickets. Status tracking with PostgreSQL persistence.

### C. AI Copilot
Ask support questions → RAG retrieves relevant KB passages → Gemini generates grounded answer with citations. Low-confidence answers trigger escalation.

### D. Knowledge Base Ingestion
Upload PDF/TXT/MD files → extract text → chunk with overlap → generate embeddings → store in pgvector. Track ingestion status.

### E. RAG Lab
Test semantic search interactively. View similarity scores, chunk rankings, configurable top-k and threshold.

### F. AI Classification
Gemini classifies ticket category, urgency, confidence, escalation recommendation. Pydantic validates all outputs. Manual override supported.

### G. Draft Generation & Approval
Generate cited response drafts. Never auto-sent. Edit → Approve → Escalate workflow. Separate send action (email integration noted as out-of-scope).

### H. Review Queue
Human review queue for low-confidence drafts. Approve, reject with reason, or escalate. Audit trail preserved.

### I. AI Evaluation
Run retrieval and generation evaluations. Measure Recall@K, groundedness, citation precision. Clearly distinguishes auto-scored vs manually verified metrics.

### J. Security
JWT auth, RBAC (agent/admin), input validation, audit logs, prompt injection resistance (documents treated as untrusted data).

## Deployment

### Frontend → Vercel

1. Push rontend/ to GitHub
2. Import in Vercel dashboard
3. Set build command: 
pm run build
4. Set output directory: dist
5. Add env var: VITE_API_URL=https://your-backend.onrender.com

### Backend → Render

1. Create new Web Service
2. Connect GitHub repo
3. Set runtime: Python 3.11
4. Build command: pip install -r requirements.txt && alembic upgrade head
5. Start command: uvicorn app.main:app --host 0.0.0.0 --port 
6. Add all env vars from .env.example

### Database → Render PostgreSQL (with pgvector)

1. Create PostgreSQL service on Render (or use Supabase/Neon)
2. Enable pgvector extension:
   `sql
   CREATE EXTENSION IF NOT EXISTS vector;
   `
3. Set DATABASE_URL in backend env vars

## Architecture Decisions

- **pgvector cosine distance**: Used <=> operator for cosine similarity search
- **768 dimensions**: text-embedding-004 produces 768-dim vectors
- **Chunking**: 512 words per chunk, 64-word overlap for context continuity
- **Draft safety**: All drafts show "DRAFT — NOT SENT" banner; approval and sending are separate
- **Grounding**: Drafts only cite content from retrieved KB chunks; unsupported claims trigger escalation
- **Demo data**: Seed script creates data flagged as demo; UI clearly labels demo records

## Security Notes

- Documents are treated as untrusted data — document content cannot override system prompts
- Prompt injection resistance: user input is parameter-substituted, not concatenated into system instructions
- Document-level access checks happen in the backend service layer, not just frontend
- All sensitive actions (approve, reject, escalate, admin changes) are audit-logged

## Incomplete / External Integrations

- **Email sending**: Draft approval marks status; actual email delivery requires SMTP/SendGrid integration (instructions in Settings page)
- **Real-time updates**: Polling-based status updates; WebSocket upgrade path documented
- **SSO/OAuth**: JWT auth implemented; OAuth2 provider integration is a documented next step
