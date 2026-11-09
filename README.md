# BlueYonder ChatGPT

A full-stack ChatGPT-style conversational UI built with **React + Material UI** on the frontend and **Python FastAPI** on the backend.

## Features

### Core
- User registration / login with JWT authentication
- Persistent conversations and messages (SQLite locally, PostgreSQL in Docker)
- RESTful API for auth, conversations, settings, and chat
- Server-Sent Events (SSE) message streaming
- Rich markdown responses: **tables**, **lists**, **images**, fenced **code**, and **charts**
- **AI image generation** (maps, illustrations, photos, diagrams)
  - With `OPENAI_API_KEY`: uses OpenAI image models (default `gpt-image-1.5`)
  - Without a key: Pollinations demo generator
  - Generated files are saved under `backend/static/generated/` and served at `/static/generated/...`
- Interactive action / choice buttons on assistant replies
- Material UI theming with light / dark / system modes

### Bonus
- **Backend:** Redis/in-memory caching, Docker Compose, Alembic migrations
- **Frontend:** Recharts charts, syntax highlighting, conversation search/filter, copy message, markdown rendering, export (Markdown / JSON), image expand + download

## Architecture

```
┌─────────────────┐   REST + SSE + /static   ┌──────────────────────┐
│  React (Vite)   │ ───────────────────────► │  FastAPI (Uvicorn)   │
│  Material UI    │ ◄─────────────────────── │  SQLAlchemy + JWT    │
└─────────────────┘                          └──────────┬───────────┘
                                                        │
                                         ┌──────────────┼──────────────┐
                                         ▼              ▼              ▼
                                    SQLite/Postgres   Redis*      OpenAI*
                                                         (* optional)
```

**Design decisions**
- **Demo LLM mode** when `OPENAI_API_KEY` is unset — still streams rich markdown (charts, tables, code, action buttons) so the UI is fully demoable without paid API access.
- **Image intents** (e.g. “generate an image…”, “create a map…”, “draw a diagram…”) are routed to the image pipeline before normal chat completion.
- **SSE streaming** (`POST /api/chat/stream`) mirrors ChatGPT’s token-by-token UX.
- **Cache layer** uses Redis when available and falls back to an in-memory dict so local setup stays zero-ops.
- **CamelCase JSON** on the wire for a natural React client; snake_case in Python models.
- **Alembic** ships an initial migration; `create_all` also runs on startup for quick local bootstrapping.

## Project structure

```
blueyonder/
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── main.py          # App entry, CORS, /static mount
│   │   ├── routers/         # auth, conversations, chat, settings
│   │   ├── models.py
│   │   ├── llm.py           # Chat streaming + image-intent routing
│   │   ├── images.py        # OpenAI / Pollinations image generation
│   │   └── cache.py         # Redis + in-memory cache
│   ├── static/generated/    # Persisted generated images
│   ├── alembic/             # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # React + Vite + MUI
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Quick start (local)

### Prerequisites
- Node.js 20+
- Python 3.11+
- (Optional) Redis, OpenAI API key

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or: cp .env.example .env

# Optional: run migrations
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Vite proxies:
- `/api` → `http://localhost:8000`
- `/static` → `http://localhost:8000` (generated images)

## Enable Redis cache (optional)

Redis is already wired. If Redis is unreachable, the API falls back to in-memory cache.

```bash
# Start Redis (example)
docker start redis
# or create it:
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Ensure `backend/.env` contains:

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
```

Restart the backend, then check:

```bash
curl http://localhost:8000/api/health
```

Expect `"cache": "redis"` (instead of `"memory"`).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS origin |
| `DATABASE_URL` | `sqlite:///./chatgpt_clone.db` | SQLAlchemy URL |
| `JWT_SECRET` | (required in prod) | JWT signing secret |
| `JWT_EXPIRES_MINUTES` | `10080` | Token lifetime (7 days) |
| `OPENAI_API_KEY` | _(empty)_ | Enables real LLM replies + OpenAI image generation |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model when OpenAI is enabled |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` | Image model (`gpt-image-1.5`, `gpt-image-2`, `chatgpt-image-latest`, …) |
| `REDIS_URL` | `redis://localhost:6379` | Cache (falls back to memory) |
| `CACHE_TTL_SECONDS` | `300` | Cache TTL |
| `VITE_API_URL` | _(empty)_ | Frontend API base (leave empty when using Vite proxy / nginx) |

> **Note:** Many OpenAI accounts no longer expose legacy `dall-e-3`. Prefer `gpt-image-1.5` (or another `gpt-image-*` model available on your key).

## Docker

```bash
# Optional: export OPENAI_API_KEY=sk-...
docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:8000  
- Postgres + Redis included

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Current user + settings |
| `GET` | `/api/conversations/` | List / search conversations (`?q=`) |
| `POST` | `/api/conversations/` | Create conversation |
| `GET` | `/api/conversations/{id}` | Conversation + messages |
| `PATCH` | `/api/conversations/{id}` | Rename / archive |
| `DELETE` | `/api/conversations/{id}` | Delete |
| `GET` | `/api/conversations/{id}/export` | Export `markdown` or `json` |
| `POST` | `/api/chat/stream` | Stream assistant reply (SSE); also handles image generation |
| `POST` | `/api/chat/send` | Non-streaming fallback |
| `GET/PATCH` | `/api/settings/` | Read / update user settings |
| `GET` | `/api/health` | Health + cache / OpenAI / image-generation status |
| `GET` | `/static/generated/{file}` | Served generated images |

### SSE events (`/api/chat/stream`)
- `meta` — conversation id + persisted user message  
- `token` — incremental assistant text (and markdown image embeds)  
- `rich` — optional metadata (action buttons, generated image info)  
- `done` — final persisted assistant message  
- `error` — failure payload  

## Try these prompts

**Rich content**
- “Show me a chart”
- “Give me a code example”
- “Show a comparison table”
- “How to build a chatbot” (lists + action buttons)

**Image / map generation**
- “Generate an image of a futuristic city at dusk”
- “Generate India Country Map in World map”
- “Create a diagram of photosynthesis”
- “Draw a logo for a travel app”

## Assumptions & limitations
- Without `OPENAI_API_KEY`, chat demo mode uses keyword-triggered canned rich responses (not a real LLM); image requests still work via Pollinations.
- With an OpenAI key, image generation depends on which image models your account exposes (configure `OPENAI_IMAGE_MODEL` accordingly).
- SQLite is used for local simplicity; use Postgres via Docker for multi-process / production-like setups.
- Redis is optional; without it, caching is process-local and resets on restart.
- Generated images are stored on local disk (`backend/static/generated/`) and are not cleaned up automatically.
- No file upload / voice / plugins — out of scope for this homework.
- JWT is stored in `localStorage` (fine for a homework demo; prefer httpOnly cookies in production).

## License
MIT — for educational / interview assignment use.
