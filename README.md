# unsupervised.

> learning, unsupervised — a student OS for what you teach yourself.

Built at the **Cognition × Notion Student OS Hackathon** with Devin.

## The problem

Notion's Student OS organizes *classes* — but a lot of real learning happens
outside any course. Papers half-read, videos queued, side projects "almost
done", scattered across tabs and apps. Self-directed learners don't need
grades; they need a ledger.

## What it does

**unsupervised** is a minimal learning tracker with a cinematic streak:

- One list of everything you're learning — papers, videos, docs, projects —
  tagged by **topic** (your self-made "courses": AI Infra, PyTorch, Research…)
  and status (**Backlog → Learning → Done**).
- A quiet stats line: finished this week, in progress, backlog, streak.
- **"previously on"** — a weekly, episode-style recap of what you finished,
  what's still open, and what's up next — written back into your Notion
  workspace as a formatted page.

All state lives in a real **Notion database** mirroring the Student OS model
(resources grouped by topic instead of courses). No Notion account? It boots
in **demo mode** so anyone can try it instantly.

## How Devin was used

Designed and built end-to-end inside **Devin** during the hackathon —
data model, Notion API layer, recap generator, and the interface. The Notion
MCP server was connected to Devin for live workspace access during
development.

## How it uses Notion

- `POST /api/connect` provisions a **"unsupervised — learning log"** database under
  any page shared with your integration (Topic, Type, Status, Target, Link,
  Completed).
- Items sync bidirectionally with that database via `@notionhq/client` —
  check something off in Notion and it shows done in the app.
- "previously on" recaps are written as formatted Notion pages under the same
  parent page.

## Run it

```bash
npm install
npm start          # http://localhost:3000 — demo mode, zero setup
```

### Connect real Notion

1. Create an integration at https://www.notion.so/profile/integrations → copy
   the token (`ntn_…`).
2. Create a Notion page → **…** → *Connections* → add your integration →
   copy the page link.
3. Click **connect notion** in the app and paste both — or set `NOTION_TOKEN`,
   `NOTION_PARENT_PAGE`, `NOTION_DB_ID` in `.env` (see `.env.example`).

## Stack

Node.js · Express · @notionhq/client · vanilla JS/CSS (EB Garamond + IBM Plex
Mono, film-grain dark theme — no build step)

## Roadmap

- Spaced-repetition resurfacing: backlog items you keep skipping come back up
- Notion Calendar sync for target dates
- A "notes" field per item, filed under the recap page each week
