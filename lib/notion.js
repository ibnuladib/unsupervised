// Notion-backed store. Same interface as lib/demo.js.
// Mirrors the Student OS shape: a "learning log" database where each row is
// a resource or task, grouped by topic (the self-directed version of courses),
// plus "sessions" (focus time), "to-dos" and "notes" databases related to it.

const { Client } = require("@notionhq/client");

// Requests go through client.request() on a pinned API version, so the
// database endpoints and payload shapes below stay stable across SDK releases.
const NOTION_VERSION = "2022-06-28";

const DB_TITLE = "unsupervised — learning log";
const SESSIONS_TITLE = "unsupervised — sessions";
const TODOS_TITLE = "unsupervised — to-dos";
const NOTES_TITLE = "unsupervised — notes";

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

const itemRelation = (logDbId) => ({ relation: { database_id: logDbId, single_property: {} } });

const sessionSchema = (logDbId) => ({
  Name: { title: {} },
  Item: itemRelation(logDbId),
  Minutes: { number: { format: "number" } },
  Date: { date: {} },
});

const todoSchema = (logDbId) => ({
  Name: { title: {} },
  Done: { checkbox: {} },
  Due: { date: {} },
  Topic: { select: { options: [] } },
  Item: itemRelation(logDbId),
});

const noteSchema = (logDbId) => ({
  Name: { title: {} },
  Text: { rich_text: {} },
  Topic: { select: { options: [] } },
  Item: itemRelation(logDbId),
});

// Accept a raw ID or any Notion URL and return a clean UUID.
function extractId(input) {
  const m = String(input).replace(/-/g, "").match(/[0-9a-fA-F]{32}/);
  if (!m) throw new Error("Could not find a Notion ID in: " + input);
  const hex = m[0];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const makeClient = (token, opts = {}) => new Client({ auth: token, notionVersion: NOTION_VERSION, ...opts });

const sel = (p) => (p && p.select ? p.select.name : null);
const dt = (p) => (p && p.date ? p.date.start : null);
const plain = (arr) => (arr || []).map((t) => t.plain_text).join("");
const text = (content) => [{ type: "text", text: { content: String(content).slice(0, 2000) } }];
const topicProp = (topic) => ({ Topic: { select: { name: topic || "General" } } });
const itemProp = (itemId) => (itemId ? { Item: { relation: [{ id: itemId }] } } : {});

function pageToItem(page) {
  const props = page.properties;
  return {
    id: page.id,
    title: plain(props.Name?.title),
    topic: sel(props.Topic),
    type: sel(props.Type) || "Docs",
    status: sel(props.Status) || "Backlog",
    target: dt(props.Target),
    link: props.Link?.url || null,
    note: null,
    completedAt: dt(props.Completed),
  };
}

const pageToTodo = (page) => ({
  id: page.id,
  title: plain(page.properties.Name?.title),
  done: !!page.properties.Done?.checkbox,
  due: dt(page.properties.Due),
  topic: sel(page.properties.Topic),
  itemId: page.properties.Item?.relation?.[0]?.id || null,
});

const pageToNote = (page) => ({
  id: page.id,
  title: plain(page.properties.Name?.title),
  text: plain(page.properties.Text?.rich_text),
  topic: sel(page.properties.Topic),
  itemId: page.properties.Item?.relation?.[0]?.id || null,
  createdAt: page.created_time,
});

function createDb(notion, parentPageId, title, properties) {
  return notion.request({
    path: "databases",
    method: "post",
    body: { parent: { type: "page_id", page_id: parentPageId }, title: text(title), properties },
  });
}

async function queryAll(notion, dbId, sorts) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.request({
      path: `databases/${dbId}/query`,
      method: "post",
      body: { ...(cursor ? { start_cursor: cursor } : {}), ...(sorts ? { sorts } : {}) },
    });
    pages.push(...res.results.filter((p) => p.object === "page"));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const createPage = (notion, body) => notion.request({ path: "pages", method: "post", body });
const updatePage = (notion, id, properties) =>
  notion.request({ path: `pages/${id}`, method: "patch", body: { properties } });

async function provision(notion, parentPageId) {
  const log = await createDb(notion, parentPageId, DB_TITLE, SCHEMA);
  const sessions = await createDb(notion, parentPageId, SESSIONS_TITLE, sessionSchema(log.id));
  const todos = await createDb(notion, parentPageId, TODOS_TITLE, todoSchema(log.id));
  const notes = await createDb(notion, parentPageId, NOTES_TITLE, noteSchema(log.id));
  return { logId: log.id, sessionsId: sessions.id, todosId: todos.id, notesId: notes.id };
}

// ids: { sessions, todos, notes } — any that are missing are created under the
// parent page the first time something is written to them.
function createNotionStore(token, dbId, parentPageId, ids = {}, clientOpts = {}) {
  const notion = makeClient(token, clientOpts);
  const db = { sessions: ids.sessions || null, todos: ids.todos || null, notes: ids.notes || null };
  const SPEC = {
    sessions: [SESSIONS_TITLE, sessionSchema],
    todos: [TODOS_TITLE, todoSchema],
    notes: [NOTES_TITLE, noteSchema],
  };

  async function ensure(kind) {
    if (!db[kind]) {
      if (!parentPageId) throw new Error(`no parent page to create the ${kind} database under`);
      const [title, schema] = SPEC[kind];
      db[kind] = (await createDb(notion, parentPageId, title, schema(dbId))).id;
    }
    return db[kind];
  }

  return {
    mode: "notion",
    dbIds: () => ({ ...db }),

    async listItems() {
      const pages = await queryAll(notion, dbId, [{ property: "Target", direction: "ascending" }]);
      return pages.map(pageToItem);
    },

    async createItem({ title, topic, type, target, link, note }) {
      const page = await createPage(notion, {
        parent: { database_id: dbId },
        properties: {
          Name: { title: text(title) },
          ...topicProp(topic),
          Type: { select: { name: type || "Docs" } },
          Status: { select: { name: "Backlog" } },
          ...(target ? { Target: { date: { start: target } } } : {}),
          ...(link ? { Link: { url: link } } : {}),
        },
        ...(note ? { children: [{ type: "quote", quote: { rich_text: text(note) } }] } : {}),
      });
      return pageToItem(page);
    },

    async setStatus(id, status) {
      const page = await updatePage(notion, id, {
        Status: { select: { name: status } },
        Completed: { date: status === "Done" ? { start: new Date().toISOString() } : null },
      });
      return pageToItem(page);
    },

    async listSessions() {
      if (!db.sessions) return [];
      const pages = await queryAll(notion, db.sessions, [{ property: "Date", direction: "descending" }]);
      return pages.map((p) => ({
        id: p.id,
        itemId: p.properties.Item?.relation?.[0]?.id || null,
        itemTitle: plain(p.properties.Name?.title),
        minutes: p.properties.Minutes?.number || 0,
        date: dt(p.properties.Date),
      }));
    },

    async addSession({ itemId, minutes, itemTitle }) {
      const page = await createPage(notion, {
        parent: { database_id: await ensure("sessions") },
        properties: {
          Name: { title: text(itemTitle || "focus session") },
          Minutes: { number: Math.max(1, Math.round(minutes)) },
          Date: { date: { start: new Date().toISOString().slice(0, 10) } },
          ...itemProp(itemId),
        },
      });
      return { id: page.id, itemId, itemTitle, minutes, date: dt(page.properties.Date) };
    },

    async listTodos() {
      if (!db.todos) return [];
      const pages = await queryAll(notion, db.todos, [{ property: "Due", direction: "ascending" }]);
      return pages.map(pageToTodo);
    },

    async createTodo({ title, topic, due, itemId }) {
      const page = await createPage(notion, {
        parent: { database_id: await ensure("todos") },
        properties: {
          Name: { title: text(title) },
          Done: { checkbox: false },
          ...topicProp(topic),
          ...(due ? { Due: { date: { start: due } } } : {}),
          ...itemProp(itemId),
        },
      });
      return pageToTodo(page);
    },

    async setTodoDone(id, done) {
      return pageToTodo(await updatePage(notion, id, { Done: { checkbox: !!done } }));
    },

    async listNotes() {
      if (!db.notes) return [];
      const pages = await queryAll(notion, db.notes, [{ timestamp: "created_time", direction: "descending" }]);
      return pages.map(pageToNote);
    },

    async createNote({ title, text: body, topic, itemId }) {
      const page = await createPage(notion, {
        parent: { database_id: await ensure("notes") },
        properties: {
          Name: { title: text(title) },
          Text: { rich_text: text(body || "") },
          ...topicProp(topic),
          ...itemProp(itemId),
        },
        ...(body ? { children: [{ type: "paragraph", paragraph: { rich_text: text(body) } }] } : {}),
      });
      return pageToNote(page);
    },

    async saveRecap({ title, blocks }) {
      if (!parentPageId) return { saved: "none" };
      const page = await createPage(notion, {
        parent: { page_id: parentPageId },
        properties: { title: { title: text(title) } },
        children: blocks.slice(0, 100),
      });
      return { saved: "notion", url: page.url };
    },
  };
}

module.exports = { createNotionStore, provision, extractId, makeClient, DB_TITLE, SESSIONS_TITLE };
