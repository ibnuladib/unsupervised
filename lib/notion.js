// Notion-backed store. Same interface as lib/demo.js.
// Mirrors the Student OS shape: a "learning log" database where each row is
// a resource or task, grouped by topic (the self-directed version of courses),
// plus a "sessions" database logging focus time per item.

const { Client } = require("@notionhq/client");

const DB_TITLE = "unsupervised — learning log";
const SESSIONS_TITLE = "unsupervised — sessions";

const SCHEMA = {
  Name: { title: {} },
  Topic: { select: { options: [] } },
  Type: {
    select: {
      options: [
        { name: "Paper", color: "blue" },
        { name: "Video", color: "red" },
        { name: "Docs", color: "purple" },
        { name: "Project", color: "green" },
        { name: "Repo", color: "yellow" },
        { name: "Habit", color: "gray" },
      ],
    },
  },
  Status: {
    select: {
      options: [
        { name: "Backlog", color: "default" },
        { name: "Learning", color: "blue" },
        { name: "Done", color: "green" },
      ],
    },
  },
  Target: { date: {} },
  Link: { url: {} },
  Completed: { date: {} },
};

const sessionSchema = (logDbId) => ({
  Name: { title: {} },
  Item: { relation: { database_id: logDbId, single_property: {} } },
  Minutes: { number: { format: "number" } },
  Date: { date: {} },
});

// Accept a raw ID or any Notion URL and return a clean UUID.
function extractId(input) {
  const m = String(input).replace(/-/g, "").match(/[0-9a-fA-F]{32}/);
  if (!m) throw new Error("Could not find a Notion ID in: " + input);
  const hex = m[0];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const sel = (p) => (p && p.select ? p.select.name : null);
const dt = (p) => (p && p.date ? p.date.start : null);

function pageToItem(page) {
  const props = page.properties;
  return {
    id: page.id,
    title: (props.Name?.title || []).map((t) => t.plain_text).join(""),
    topic: sel(props.Topic),
    type: sel(props.Type) || "Docs",
    status: sel(props.Status) || "Backlog",
    target: dt(props.Target),
    link: props.Link?.url || null,
    note: null,
    completedAt: dt(props.Completed),
  };
}

async function provision(notion, parentPageId) {
  const log = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: DB_TITLE } }],
    properties: SCHEMA,
  });
  const sessions = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: SESSIONS_TITLE } }],
    properties: sessionSchema(log.id),
  });
  return { logId: log.id, sessionsId: sessions.id };
}

function createNotionStore(token, dbId, parentPageId, sessionsDbId = null) {
  const notion = new Client({ auth: token });
  let sessionsId = sessionsDbId;

  async function ensureSessionsDb() {
    if (!sessionsId) {
      if (!parentPageId) throw new Error("no parent page to create sessions db");
      const db = await notion.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: SESSIONS_TITLE } }],
        properties: sessionSchema(dbId),
      });
      sessionsId = db.id;
    }
    return sessionsId;
  }

  return {
    mode: "notion",

    async listItems() {
      const items = [];
      let cursor;
      do {
        const res = await notion.databases.query({
          database_id: dbId,
          start_cursor: cursor,
          sorts: [{ property: "Target", direction: "ascending" }],
        });
        items.push(...res.results.filter((p) => p.object === "page").map(pageToItem));
        cursor = res.has_more ? res.next_cursor : undefined;
      } while (cursor);
      return items;
    },

    async createItem({ title, topic, type, target, link, note }) {
      const page = await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: title } }] },
          Topic: { select: { name: topic || "General" } },
          Type: { select: { name: type || "Docs" } },
          Status: { select: { name: "Backlog" } },
          ...(target ? { Target: { date: { start: target } } } : {}),
          ...(link ? { Link: { url: link } } : {}),
        },
        ...(note
          ? {
              children: [
                {
                  type: "quote",
                  quote: {
                    rich_text: [{ type: "text", text: { content: note } }],
                  },
                },
              ],
            }
          : {}),
      });
      return pageToItem(page);
    },

    async setStatus(id, status) {
      const page = await notion.pages.update({
        page_id: id,
        properties: {
          Status: { select: { name: status } },
          Completed: { date: status === "Done" ? { start: new Date().toISOString() } : null },
        },
      });
      return pageToItem(page);
    },

    async listSessions() {
      if (!sessionsId) return [];
      const sessions = [];
      let cursor;
      do {
        const res = await notion.databases.query({
          database_id: sessionsId,
          start_cursor: cursor,
          sorts: [{ property: "Date", direction: "descending" }],
        });
        for (const p of res.results) {
          if (p.object !== "page") continue;
          const props = p.properties;
          sessions.push({
            id: p.id,
            itemId: props.Item?.relation?.[0]?.id || null,
            itemTitle: (props.Name?.title || []).map((t) => t.plain_text).join(""),
            minutes: props.Minutes?.number || 0,
            date: dt(props.Date),
          });
        }
        cursor = res.has_more ? res.next_cursor : undefined;
      } while (cursor);
      return sessions;
    },

    async addSession({ itemId, minutes, itemTitle }) {
      const sid = await ensureSessionsDb();
      const page = await notion.pages.create({
        parent: { database_id: sid },
        properties: {
          Name: { title: [{ text: { content: itemTitle || "focus session" } }] },
          Minutes: { number: Math.max(1, Math.round(minutes)) },
          Date: { date: { start: new Date().toISOString().slice(0, 10) } },
          ...(itemId ? { Item: { relation: [{ id: itemId }] } } : {}),
        },
      });
      return { id: page.id, itemId, itemTitle, minutes, date: dt(page.properties.Date) };
    },

    sessionsDbId: () => sessionsId,

    async saveRecap({ title, blocks }) {
      if (!parentPageId) return { saved: "none" };
      const page = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: blocks.slice(0, 100),
      });
      return { saved: "notion", url: page.url };
    },
  };
}

module.exports = { createNotionStore, provision, extractId, DB_TITLE, SESSIONS_TITLE };
