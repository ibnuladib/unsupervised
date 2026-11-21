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
- **Quick-capture**: paste any link (arXiv, YouTube, GitHub, docs) — it fetches the real title and files it under the right type.
- **Quick-capture digest**: captured links also pull their description/abstract into the item's Notion page as a "why I saved this" note.
- **Focus sessions**: a 25m chip on any open item starts a live timer; stopping logs the session to a **Sessions database** in Notion (related to the learning-log item).
- A quiet stats line: finished this week, in progress, backlog, streak, focus minutes — plus a GitHub-style **completion heatmap**.
- A draggable **[ + unsupervised ] bookmarklet**: capture whatever page you're on without opening the app.
- **"previously on"** — a weekly, episode-style recap of what you finished,
  what's still open, and what's up next — written back into your Notion
  workspace as a formatted page.

All state lives in a real **Notion database** mirroring the Student OS model
(resources grouped by topic instead of courses). No Notion account? It boots
in **demo mode** so anyone can try it instantly.

## How it maps to Student OS

Student OS is "one home for your classes, assignments, notes, and to-dos."
**unsupervised** applies that model to self-directed learning:

| Student OS | unsupervised |
|---|---|
| Courses | **Topics** (AI Infra, PyTorch, AI Research — a `topics` database with relations + %done rollups) |
| Assignments | **Learning items** (papers, videos, docs, projects — `Status: Backlog → Learning → Done`, `Target` = deadline) |
| Dashboard page | The `unsupervised.` Notion page: learning log + topics + recaps under one roof |
| "Always know what's next" | Stats line, target dates, and the weekly "previously on" recap |

The Notion workspace itself was built with the full feature set: a database
with multiple views (kanban board, topic-grouped table, target calendar), a
related database with rollups, page covers/icons, callouts, toggles, and
linked sub-pages — all provisioned programmatically.

## How Devin was used

The entire project was built inside **Devin** in a single hackathon session:

- **Connected the Notion MCP server** to Devin (`.devin/mcp_config.json`) and
  authenticated with OAuth — then used `notion-create-database`,
  `notion-create-view`, `notion-create-pages`, and `notion-update-page` to
  provision the live workspace: both databases, relation + rollup properties,
  kanban/grouped/calendar views, seeded items, and the personalized page
  layout (cover, callouts, image columns, toggles).
- **Wrote the application end-to-end**: Express server, Notion API store
  (`@notionhq/client`), demo-mode store, stats engine, recap generator,
  quick-capture service, and the vanilla-JS frontend — all through Devin's
  edit/exec tools with syntax checks and live curl smoke tests between
  iterations.
- **Shipped it**: `gh` CLI repo creation, commits, and pushes — all from the
  same session.

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

## Live workspace

The author's real instance: [unsupervised. on Notion](https://app.notion.com/p/41ffba39bd0681e79e3fc977f8e56169) — learning log + topics rollups + kanban/calendar views + filed recaps.

## Stack

Node.js · Express · @notionhq/client · Notion MCP server · vanilla JS/CSS
(Space Grotesk + IBM Plex Mono, film-grain dark theme — no build step)

## Roadmap

- Spaced-repetition resurfacing: backlog items you keep skipping come back up
- Notion Calendar sync for target dates
- A "notes" field per item, filed under the recap page each week
