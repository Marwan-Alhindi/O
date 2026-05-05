<div align="center">
  <img src="glyph-frontend/public/logo-white.png" alt="Glyph" width="96" />

  # Glyph

  **Collaborative LLMs and teammates in the same chat.**

  <p>
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
    <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white" />
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white" />
    <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white" />
    <img alt="LangChain" src="https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white" />
    <img alt="LangGraph" src="https://img.shields.io/badge/LangGraph-FF6B6B?logoColor=white" />
    <img alt="LangSmith" src="https://img.shields.io/badge/LangSmith-7C3AED?logoColor=white" />
  </p>
</div>

---

Glyph is a chat workspace where humans and multiple LLMs work together in the same room. Mention any model with `@`, invite teammates, and let the agents call tools — web search, PDF generation, and inviting other LLMs into the conversation.

> [!NOTE]
> Glyph is in active development. Auth and realtime are powered by Supabase; the backend orchestrates LLM agents and tool calls via FastAPI + **LangChain** and **LangGraph**, with **LangSmith** handling tracing and evals.

## Quickstart

**Backend** — Python + FastAPI

```bash
cd glyph-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** — React + Vite + Tailwind v4

```bash
cd glyph-frontend
npm install
npm run dev
```

> [!TIP]
> The backend reads secrets from `glyph-backend/.env` (OpenAI, Supabase). The frontend reads from `glyph-frontend/.env`.

## Repos

- **[`glyph-frontend/`](glyph-frontend/)** — React 19 + Vite + Tailwind v4 client. Auth, realtime chat, marketing site.
- **[`glyph-backend/`](glyph-backend/)** — FastAPI server. LangChain + LangGraph agent orchestration, tool calls (web search, PDF generation, mention/invite LLM), LangSmith tracing/evals, Supabase auth verification.

## Features

- **Multi-LLM chat** — `@mention` any configured model in the same conversation.
- **Tool-using agents** — LangGraph-driven agents call `web_search`, `create_pdf`, `mention_llm`, and `invite_llm` mid-response, with LangChain wiring up the LLM/tool layer and LangSmith capturing every run for tracing and evaluation.
- **Per-LLM accent palette** — each model gets a distinct color so threads stay visually parseable.
- **Realtime** — Supabase realtime pushes new messages to every participant instantly.
- **Auth + protected routes** — Supabase auth, `ProtectedRoute` wrapper, server-side JWT verification.

## Frontend structure

```
glyph-frontend/src/
├── app/                    # Authenticated app UI (after login)
│   ├── components/         # Chat, Message, AIMessage, InviteLLM, InviteUser, LLMContext
│   ├── pages/              # Chat page
│   ├── utils/              # llmColors helper (per-LLM accent palette)
│   ├── services/           # API calls
│   └── AppLayout.jsx       # Shared shell + sidebar
│
├── marketing/              # Public site
│   ├── components/         # Hero, Navigation
│   ├── pages/              # Landing, Login, Getstarted
│   └── MarketingLayout.jsx # Shared marketing shell
│
├── contexts/               # AuthContext
├── components/             # ProtectedRoute
├── services/               # supabase client
├── styles/                 # Tailwind + design tokens
├── main.jsx                # Entry point
└── router.jsx              # React Router setup
```

## Backend structure

```
glyph-backend/
├── main.py            # FastAPI app, routes, request handling
├── tools.py           # Agent tools: web_search, create_pdf, mention_llm, invite_llm
├── pdfs/              # Generated PDFs (served as downloads)
└── requirements.txt
```

---

<div align="center">
  <sub>Built by <a href="https://github.com/Marwan-Alhindi">Marwan Alhindi</a></sub>
</div>
