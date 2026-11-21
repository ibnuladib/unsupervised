require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { createDemoStore } = require("./lib/demo");
const { createNotionStore, provision, extractId } = require("./lib/notion");
const { computeStats } = require("./lib/stats");
const { generateRecap } = require("./lib/recap");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let store =
  process.env.NOTION_TOKEN && process.env.NOTION_DB_ID
    ? createNotionStore(
        process.env.NOTION_TOKEN,
        process.env.NOTION_DB_ID,
        process.env.NOTION_PARENT_PAGE || null
      )
    : createDemoStore();

function persistEnv(vars) {
  const envPath = path.join(__dirname, ".env");
  let content = "";
  try {
    content = fs.readFileSync(envPath, "utf8");
  } catch {}
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}=${v}`;
    content = content.match(new RegExp(`^${k}=.*$`, "m"))
      ? content.replace(new RegExp(`^${k}=.*$`, "m"), line)
      : content.trimEnd() + (content.trim() ? "\n" : "") + line + "\n";
    process.env[k] = v;
  }
  fs.writeFileSync(envPath, content);
}

async function statePayload() {
  const items = await store.listItems();
  return { mode: store.mode, stats: computeStats(items), items };
}

app.get("/api/config", (req, res) =>
  res.json({ mode: store.mode, connected: store.mode === "notion" })
);

app.get("/api/state", async (req, res) => {
  try {
    res.json(await statePayload());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "title required" });
    const item = await store.createItem(req.body);
    res.json({ item, state: await statePayload() });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

const TYPE_BY_HOST = [
  [/arxiv\.org|acm\.org|ieee\.org|openreview\.net/, "Paper"],
  [/youtube\.com|youtu\.be|vimeo\.com/, "Video"],
  [/github\.com|gitlab\.com/, "Repo"],
];

async function fetchTitle(url) {
  const r = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; unsupervised/1.0)" },
  });
  const html = (await r.text()).slice(0, 300000);
  const pick = (re) => html.match(re)?.[1]?.trim();
  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i);
  return title ? title.replace(/\s+/g, " ") : null;
}

// Quick-capture: paste a URL -> fetch its title -> file it under the right type.
app.post("/api/capture", async (req, res) => {
  try {
    const { url, topic, target } = req.body;
    if (!url || !/^https?:\/\//.test(url)) {
      return res.status(400).json({ error: "valid http(s) url required" });
    }
    const host = new URL(url).hostname.replace(/^www\./, "");
    const type = TYPE_BY_HOST.find(([re]) => re.test(host))?.[1] || "Docs";
    const title = (await fetchTitle(url).catch(() => null)) || host;
    const item = await store.createItem({ title, topic, type, target, link: url });
    res.json({ item, state: await statePayload() });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/items/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Backlog", "Learning", "Done"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }
    const item = await store.setStatus(req.params.id, status);
    res.json({ item, state: await statePayload() });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/recap", async (req, res) => {
  try {
    const items = await store.listItems();
    const stats = computeStats(items);
    const recap = generateRecap(items, stats);
    const saved = await store.saveRecap(recap);
    res.json({ ...recap, saved });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Paste token + parent page URL -> provision the learning log -> go live.
app.post("/api/connect", async (req, res) => {
  try {
    const { token, parentPage } = req.body;
    if (!token || !parentPage) {
      return res.status(400).json({ error: "token and parentPage required" });
    }
    const parentId = extractId(parentPage);
    const { Client } = require("@notionhq/client");
    const notion = new Client({ auth: token });
    const dbId = await provision(notion, parentId);
    persistEnv({
      NOTION_TOKEN: token,
      NOTION_PARENT_PAGE: parentId,
      NOTION_DB_ID: dbId,
    });
    store = createNotionStore(token, dbId, parentId);
    res.json({ ok: true, dbId });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`unsupervised running at http://localhost:${PORT} [${store.mode} mode]`)
);
