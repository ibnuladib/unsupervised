# unsupervised.

**A Student OS for the things you teach yourself.**

Notion's Student OS gives your classes a home. *unsupervised* does the same for
the learning nobody assigns you: the papers, lectures, docs and side projects
you pick up on your own. It is a small web app backed by a real Notion
workspace.

Built with **Devin Chat** and **Notion** for the Cognition × Notion Student OS
Hackathon.

![The unsupervised home screen: a widescreen title card over this week's numbers](docs/hero.jpg)

| | |
|---|---|
| **Try it** | `npm install && npm start`, then open http://localhost:3000. No Notion account needed. |
| **Notion workspace** | [unsupervised. on Notion](https://app.notion.com/p/41ffba39bd0681e79e3fc977f8e56169) |
| **Stack** | Node.js, Express, the official Notion SDK, vanilla JS and CSS. No build step. |

## Contents

1. [What it does and the problem it solves](#1-what-it-does-and-the-problem-it-solves)
2. [How I used Devin Chat](#2-how-i-used-devin-chat)
3. [How it incorporates Notion Student OS](#3-how-it-incorporates-notion-student-os)
4. [How to run and test it](#4-how-to-run-and-test-it)
5. [How it works](#5-how-it-works)
6. [Limitations and roadmap](#6-limitations-and-roadmap)

---

## 1. What it does and the problem it solves

### The problem

Student OS is built around classes: a course has a syllabus, assignments and
deadlines, so there is always a next thing to do.

A lot of the learning that shapes a student's career has none of that. I'm
teaching myself AI infrastructure, PyTorch and AI research outside any course.
That work lives in forty open tabs: papers half read, lectures queued, docs
bookmarked, projects "almost done". Nothing tracks it, nothing is ever due, and
at the end of a week I can't say what I actually finished.

### The solution

*unsupervised* treats self-directed learning the way Student OS treats a
semester. Your topics are your courses. Every paper, video, doc, repo or
project is an item that moves **Backlog → Learning → Done**. Notion is the
database underneath, so the same log is there in your workspace as a board,
a table and a calendar.

![The desk: capture bar, items grouped by status, topics and heatmap on the left](docs/desk.jpg)

### Features

| Feature | What it does |
|---|---|
| **Learning log** | One list of everything you're learning, grouped by status, tagged by topic and type, with optional target dates. Overdue targets are marked. |
| **Quick capture** | Paste a link and press add. The app fetches the page's real title and files it as a Paper, Video or Repo based on the site (anything else is Docs). |
| **Auto-digest** | Captured links also bring their abstract or description, saved as a note on the item. In Notion it is written into the item's page. |
| **Bookmarklet** | Drag `+ unsupervised` to your bookmarks bar, then capture whatever page you're on in one click. |
| **Focus sessions** | Press `focus` on an item to start a timer. Stopping it logs the minutes to a Sessions database in Notion, linked to that item. |
| **The shelf** | Each topic with its done/total count and a progress bar. Click a topic to filter the log. |
| **Readouts and heatmap** | Finished this week, in progress, backlog, streak, focus minutes, and 15 weeks of completions. |
| **"Previously on"** | A weekly recap written like the opening of a TV episode: what you finished, what's still open, what's due next. It is saved to Notion as a page. |
| **Demo mode** | With no Notion credentials the app runs on built-in sample data, so anyone can try every feature immediately. |

![The weekly recap, shown as an episode title card](docs/recap.jpg)

The recap is assembled from your own data with a set of written templates. It
does not call a language model, so it needs no API key and never invents
anything you didn't do.

---

## 2. How I used Devin Chat

The whole project was built in one Devin Chat session: the idea, the Notion
workspace, every line of code, the tests and this repository. I directed and
reviewed; Devin did the work.

| Stage | What Devin did |
|---|---|
| **Research** | Read the hackathon brief and the Student OS documentation, and looked through my public Pinterest board to set the visual direction. |
| **Product** | Proposed concepts and rebuilt the project when I redirected it. The first version was a gamified planner; I asked for something quieter and focused on self-directed AI learning, and Devin started over. |
| **Notion workspace** | Connected the **Notion MCP server** over OAuth and built my live workspace from chat: the page, two related databases, the relation and rollup properties, the board, grouped-table and calendar views, the seed items, and images uploaded into Notion's own storage. |
| **Application** | Wrote the Express server, the Notion store on the official SDK, the demo store, the stats and recap logic, the link capture service and the frontend. |
| **Design** | Redesigned the interface several times from my feedback, checking each version with headless Chrome screenshots at desktop and phone widths. |
| **Testing** | Ran syntax checks and requests against the running server, drove the real UI flows in a headless browser (add, capture, status change, filter, focus session, recap), and confirmed a fresh clone installs and starts. |
| **Shipping** | Created this public repository with the GitHub CLI and committed and pushed every change. |

Notion MCP tools used from chat: `notion-create-pages`,
`notion-create-database`, `notion-create-view`, `notion-update-page`,
`notion-create-file-upload`, `notion-fetch` and `notion-search`.

The commit history shows the session as it happened, including the changes of
direction.

---

## 3. How it incorporates Notion Student OS

Student OS describes itself as one home for your classes, assignments, notes
and to-dos. *unsupervised* keeps that model and changes what goes in it.

| Student OS concept | In unsupervised | Notion feature |
|---|---|---|
| Courses | **Topics** such as AI Infra, PyTorch and AI Research | A `topics` database |
| Assignments and resources | **Learning log** items | A database with `Name`, `Topic`, `Type`, `Status`, `Target`, `Link` and `Completed` |
| Course progress | Done and total per topic | A **relation** from topics to items, with **rollups** |
| Planning views | The same log seen three ways | **Board** by status, **table** grouped by topic, **calendar** by target date |
| Study time | Focus sessions | A `sessions` database, each row **related** to the item studied |
| Dashboard | One page holding the log, the topics and the recaps | A Notion page with cover, icon, toggle, bookmark and uploaded images |
| Knowing what's next | Target dates, the readouts and the weekly recap | Recap **pages** written by the app |

### Two ways Notion is used

**My workspace, built through the Notion MCP server.** The
[live workspace](https://app.notion.com/p/41ffba39bd0681e79e3fc977f8e56169)
has everything in the table above. Devin created it from chat.

**Any workspace, through the app.** Press **connect notion**, paste an
integration token and a page link, and the app creates the learning log and
sessions databases under that page with the official `@notionhq/client` SDK.
From then on:

- the app reads its items from the Notion database, so anything you change in
  Notion shows up in the app
- new items, status changes and completion dates are written back to Notion
- captured links get their abstract written into the item's page as a quote
- focus sessions are added as rows related to their item
- each weekly recap is created as a page under the same parent

The in-app connect flow creates the two databases only. The topics database,
rollups and extra views are in my workspace and are quick to add by hand in
Notion.

---

## 4. How to run and test it

Requires **Node.js 18 or newer**.

```bash
git clone https://github.com/ibnuladib/unsupervised
cd unsupervised
npm install
npm start
```

Open http://localhost:3000. With no `.env` file the app starts in **demo mode**
on sample data. Demo data is kept in memory and resets when the server
restarts.

### Test it in two minutes

| Step | Do this | Expect |
|---|---|---|
| 1 | Open the page | The title card, this week's numbers, the log, topics and heatmap |
| 2 | Paste `https://arxiv.org/abs/2307.08691` into the capture bar and press **add** | A new *Paper* under "up next" with the paper's real title and abstract |
| 3 | Click an item's status button | It moves Backlog → Learning → Done, and the numbers, topic bars and heatmap update |
| 4 | Click **focus** on an open item, wait a few seconds, click it again | "+1m focus logged", and focus minutes go up |
| 5 | Click a topic under **the shelf** | The log shows only that topic; **clear** brings everything back |
| 6 | Click **previously on** | This week's recap |

### Connect your own Notion (optional)

1. Create an integration at https://www.notion.so/profile/integrations and copy
   its token (`ntn_…`).
2. Create a page in Notion, open **…** → *Connections*, add your integration,
   and copy the page link.
3. In the app, click **connect notion** and paste both.

The app creates the databases and switches to Notion. It saves the token and
database IDs to a local `.env` file, which is git-ignored, so it stays
connected after a restart.

You can also set the values yourself. Copy `.env.example` to `.env`:

| Variable | Meaning |
|---|---|
| `NOTION_TOKEN` | Integration token |
| `NOTION_DB_ID` | ID of the learning log database |
| `NOTION_PARENT_PAGE` | Page that recaps (and a missing sessions database) are created under |
| `NOTION_SESSIONS_DB` | ID of the sessions database; created on first use if empty |
| `PORT` | Port to listen on, default `3000` |

The app uses Notion when `NOTION_TOKEN` and `NOTION_DB_ID` are both set, and
demo mode otherwise.

---

## 5. How it works

```mermaid
flowchart LR
  B[Browser<br/>public/] -->|JSON over /api| S[Express server<br/>server.js]
  S --> ST{Store}
  ST -->|no credentials| D[Demo store<br/>in memory]
  ST -->|token + database ID| N[Notion store<br/>@notionhq/client]
  N --> W[(Notion workspace<br/>learning log · sessions · recap pages)]
  S -->|fetch title + description| L[Captured link]
```

The server talks to a *store*. The demo store and the Notion store expose the
same methods, so every feature works the same in both modes.

### Project layout

| Path | Purpose |
|---|---|
| `server.js` | Express app, API routes, link capture |
| `lib/notion.js` | Notion store: schema, provisioning, items, sessions, recap pages |
| `lib/demo.js` | In-memory store with sample data |
| `lib/stats.js` | Streak and weekly numbers |
| `lib/recap.js` | Recap text and its Notion blocks |
| `public/` | The frontend: `index.html`, `style.css`, `app.js`, fonts and images |
| `docs/` | Screenshots used in this README |

### API

Every write returns the new item together with the full refreshed state.

| Method and path | Body | Does |
|---|---|---|
| `GET /api/state` | | Mode, stats, items and sessions |
| `GET /api/config` | | Whether Notion is connected |
| `POST /api/items` | `title`, `topic`, `type`, `target` | Add an item |
| `POST /api/capture` | `url`, `topic`, `target` | Fetch the link's title and description, classify it, add it |
| `POST /api/items/:id/status` | `status` | Set Backlog, Learning or Done |
| `POST /api/sessions` | `itemId`, `itemTitle`, `minutes` | Log a focus session |
| `POST /api/recap` | | Build this week's recap and save it to Notion |
| `POST /api/connect` | `token`, `parentPage` | Create the databases and switch to Notion |

### Notion schema created by the app

| Database | Properties |
|---|---|
| **unsupervised — learning log** | `Name` (title), `Topic` (select), `Type` (select: Paper, Video, Docs, Project, Repo, Habit), `Status` (select: Backlog, Learning, Done), `Target` (date), `Link` (URL), `Completed` (date) |
| **unsupervised — sessions** | `Name` (title), `Item` (relation to the learning log), `Minutes` (number), `Date` (date) |

### Design

![The wall: a strip of images from my Pinterest board](docs/wall.jpg)

The interface is personal on purpose. It is styled as a film title card, drawn
from my own Pinterest board: a letterboxed still, a tracked condensed title, a
single amber accent, and a strip of the images I keep coming back to. The fonts
(Barlow, Barlow Condensed and JetBrains Mono, all under the SIL Open Font
License) are bundled in the repository, so the page makes no third-party
requests.

The images in `public/pins/` and `assets/` are from my Pinterest board and
belong to their original creators. They are included for this personal
hackathon demo only.

---

## 6. Limitations and roadmap

Known limitations:

- **Notes in Notion mode.** A captured link's abstract is written into the
  item's Notion page, but the app does not read it back, so the note shows in
  the app only in demo mode.
- **Capture depends on the site.** Titles and descriptions come from the page's
  own metadata. A site that blocks the request or has none is filed under its
  domain name.
- **Single user.** The app holds one Notion connection and has no accounts. It
  is meant to run locally for one person.
- **No automated test suite.** Testing was done by hand and with scripted
  browser runs during the build.

Next:

- Resurface backlog items that keep getting skipped
- Create the topics database and views from the in-app connect flow
- Read notes back from Notion and make them editable in the app
- Sync target dates to Notion Calendar
