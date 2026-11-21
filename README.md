# unsupervised.

> learning, unsupervised — a Student OS for what you teach yourself.

Built at the **Cognition × Notion Student OS Hackathon** using **Devin Chat** and **Notion**.

- **Repo:** https://github.com/ibnuladib/unsupervised
- **Live Notion workspace:** [unsupervised. on Notion](https://app.notion.com/p/41ffba39bd0681e79e3fc977f8e56169)
- **Try it:** `npm install && npm start` → http://localhost:3000 (demo mode, no Notion account needed)

---

## 1. What the project does and the problem it solves

**The problem.** Notion's Student OS organizes *classes*. But for a lot of
students, the learning that matters most for their career happens outside any
course: papers half-read, lecture videos queued, docs bookmarked, side projects
"almost done" — scattered across browser tabs with no deadline, no syllabus and
nobody keeping track. I'm teaching myself AI infrastructure, PyTorch and AI
research this way, and there is no home for it.

**The solution.** **unsupervised** is a Student OS for self-directed learning: a
small web app backed by a real Notion workspace, where your self-made topics are
your courses and everything you're learning is tracked in one ledger.

What it does:

- **One learning log.** Papers, videos, docs, repos and projects, tagged by
  **topic** (AI Infra, PyTorch, AI Research…) and moved through
  **Backlog → Learning → Done**, with optional target dates.
- **Quick capture.** Paste any link (arXiv, YouTube, GitHub, docs) — the app
  fetches the real title, classifies the type, and files it.
- **Auto-digest.** Captured links also pull their abstract/description, shown
  in the app and written into the item's Notion page as a note.
- **Bookmarklet.** Drag `[ + unsupervised ]` to the bookmarks bar and capture
  the page you're on in one click.
- **Focus sessions.** A `focus` button on any open item starts a timer; stopping it
  logs the session to a **Sessions database** in Notion, related to the item.
- **Progress at a glance.** Finished this week, in progress, backlog, streak,
  focus minutes, and a GitHub-style completion heatmap.
- **"previously on".** A weekly episode-style recap of what you finished, what's
  still open and what's next — written back into Notion as a page.
- **Demo mode.** With no Notion credentials it boots on seeded data, so anyone
  can try it immediately.

## 2. How I used Devin Chat

The whole project — idea, Notion workspace, code, repo — was built with Devin
Chat in one hackathon session. Concretely:

- **Planning and pivots.** Devin read the hackathon brief and the Student OS
  documentation, proposed concepts, and rebuilt the project when I redirected
  it (from a gamified planner to this focused learning tracker).
- **Notion via MCP.** Devin connected the **Notion MCP server**
  (`.devin/mcp_config.local.json`, OAuth) and used its tools directly from chat:
  `notion-create-pages`, `notion-create-database`, `notion-create-view`,
  `notion-update-page`, `notion-create-file-upload`. That provisioned the live
  workspace — both databases, the relation and rollup properties, the
  kanban/grouped/calendar views, seeded items, the page layout, and images
  uploaded into Notion's own storage.
- **Writing the app.** Devin wrote every file: the Express server, the Notion
  API store (`@notionhq/client`), the demo store, the stats engine, the recap
  generator, the capture/digest service, and the vanilla JS/CSS frontend.
- **Testing.** Between iterations Devin ran syntax checks and curl smoke tests
  against the running server (capture, sessions, recap), and verified that a
  fresh clone of this repo installs and boots.
- **Shipping.** Devin created this public repo with the `gh` CLI and committed
  and pushed each change.

## 3. How it incorporates Notion Student OS

Student OS is "one home for your classes, assignments, notes, and to-dos."
**unsupervised** keeps that model and swaps the contents for self-directed
learning:

| Student OS concept | unsupervised |
|---|---|
| Courses | **Topics** database (AI Infra, PyTorch, AI Research…) |
| Assignments / resources | **Learning log** database — `Topic`, `Type`, `Status`, `Target`, `Link`, `Completed` |
| Course progress | **Relation** topics → items, with **rollups** for total and done per topic |
| Dashboard / homepage | The `unsupervised.` Notion page: learning log, topics and recaps in one place |
| "Always know what's next" | Target dates, the stats line, and the weekly "previously on" recap |
| Study time | **Sessions** database, each row related to the item studied |

Notion features used in the workspace: related databases, rollups, multiple
database views (kanban board by status, table grouped by topic, calendar by
target date), page cover and icon, toggle and bookmark blocks, uploaded images,
and recap sub-pages.

How the app talks to Notion (`lib/notion.js`, official `@notionhq/client`):

- **connect notion** (`POST /api/connect`) provisions the learning-log and
  sessions databases under any page you share with your integration.
- The app reads items from the Notion database and writes new items and status
  changes back — tick something off in Notion and it shows as done in the app.
- Focus sessions and weekly recaps are written to Notion as rows and pages.

## 4. How to run and test it

Requires **Node.js 18+**.

```bash
git clone https://github.com/ibnuladib/unsupervised
cd unsupervised
npm install
npm start          # http://localhost:3000
```

With no `.env`, the app starts in **demo mode** on seeded data. Nothing else to
configure.

### Test it in a minute

1. Open http://localhost:3000 — you'll see the learning log, stats and heatmap.
2. **Capture:** paste `https://arxiv.org/abs/2307.08691` into the input and
   press *add*. It files itself as a *Paper* with its real title and abstract.
3. **Progress:** click an item's status button to move it Backlog → Learning →
   Done. The readouts, topic progress bars and heatmap update.
4. **Focus:** click `focus` on an open item, then click it again (it now shows
   the running time) to stop. Focus minutes go up.
5. **Filter:** click a topic under *the shelf* to show only that topic.
6. **Recap:** click **previously on** for this week's recap.

### Connect your own Notion (optional)

1. Create an integration at https://www.notion.so/profile/integrations and copy
   the token (`ntn_…`).
2. Create a Notion page → **…** → *Connections* → add the integration → copy
   the page link.
3. Click **connect notion** in the app and paste both. The databases are created
   for you. (Or set `NOTION_TOKEN`, `NOTION_PARENT_PAGE`, `NOTION_DB_ID` in
   `.env` — see `.env.example`.)

Items, sessions and recaps now live in your Notion workspace.

---

## Stack

Node.js · Express · `@notionhq/client` · Notion MCP server · vanilla JS/CSS (no
build step) · self-hosted Barlow, Barlow Condensed and JetBrains Mono (SIL Open
Font License)

## Roadmap

- Spaced-repetition resurfacing for backlog items that keep getting skipped
- Notion Calendar sync for target dates
- A notes field per item, collected under each weekly recap
