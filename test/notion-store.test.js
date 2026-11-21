// Exercises the Notion store against a local stand-in for the Notion API.
const http = require("http");
const { createNotionStore, provision, makeClient } = require("../lib/notion");
const dbs = {}, pages = {}, calls = [];
let n = 0;
const id = () => "00000000-0000-0000-0000-" + String(++n).padStart(12, "0");
const read = (v) => (v.title ? { title: v.title.map((t) => ({ ...t, plain_text: t.text.content })) } : v.rich_text ? { rich_text: v.rich_text.map((t) => ({ ...t, plain_text: t.text.content })) } : v);
const srv = http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c)).on("end", () => {
    const body = b ? JSON.parse(b) : {};
    calls.push(req.method + " " + req.url + " v=" + req.headers["notion-version"]);
    const send = (o, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    let m;
    if (req.method === "POST" && req.url === "/v1/databases") {
      if (!body.properties || !body.parent.page_id) return send({ object: "error", status: 400, code: "validation_error", message: "bad db" }, 400);
      const d = { object: "database", id: id(), properties: body.properties }; dbs[d.id] = d; return send(d);
    }
    if (req.method === "POST" && (m = req.url.match(/^\/v1\/databases\/([^/]+)\/query$/))) {
      if (!dbs[m[1]]) return send({ object: "error", status: 404, code: "object_not_found", message: "no db" }, 404);
      return send({ object: "list", results: Object.values(pages).filter((p) => p.parent.database_id === m[1]), has_more: false });
    }
    if (req.method === "POST" && req.url === "/v1/pages") {
      const schema = body.parent.database_id && dbs[body.parent.database_id];
      if (body.parent.database_id && !schema) return send({ object: "error", status: 404, code: "object_not_found", message: "no db" }, 404);
      if (schema) for (const k of Object.keys(body.properties)) if (!schema.properties[k]) return send({ object: "error", status: 400, code: "validation_error", message: k + " is not a property that exists" }, 400);
      const p = { object: "page", id: id(), url: "https://notion.so/x", created_time: new Date().toISOString(), parent: body.parent, properties: {}, children: body.children };
      for (const [k, v] of Object.entries(body.properties)) p.properties[k] = read(v);
      pages[p.id] = p; return send(p);
    }
    if (req.method === "PATCH" && (m = req.url.match(/^\/v1\/pages\/([^/]+)$/))) {
      const p = pages[m[1]]; for (const [k, v] of Object.entries(body.properties)) p.properties[k] = read(v); return send(p);
    }
    send({ object: "error", status: 404, code: "object_not_found", message: "unhandled " + req.url }, 404);
  });
});
srv.listen(0, async () => {
  const baseUrl = "http://127.0.0.1:" + srv.address().port;
  const assert = (c, msg) => { if (!c) throw new Error("FAIL: " + msg); console.log("ok  " + msg); };
  try {
    const ids = await provision(makeClient("t", { baseUrl }), "11111111111111111111111111111111");
    assert(ids.logId && ids.sessionsId && ids.todosId && ids.notesId, "provision creates four databases");
    const st = createNotionStore("t", ids.logId, "11111111111111111111111111111111", { sessions: ids.sessionsId, todos: ids.todosId, notes: ids.notesId }, { baseUrl });
    const it = await st.createItem({ title: "Paper A", topic: "AI Infra", type: "Paper", link: "https://x.y", note: "abstract", target: "2026-12-01" });
    assert(it.title === "Paper A" && it.status === "Backlog" && it.topic === "AI Infra", "createItem round-trips");
    const done = await st.setStatus(it.id, "Done");
    assert(done.status === "Done" && done.completedAt, "setStatus sets Done + Completed");
    assert((await st.listItems()).length === 1, "listItems");
    await st.addSession({ itemId: it.id, minutes: 25, itemTitle: "Paper A" });
    const ss = await st.listSessions();
    assert(ss.length === 1 && ss[0].minutes === 25 && ss[0].itemId === it.id, "sessions add + list, related to item");
    const td = await st.createTodo({ title: "do thing", topic: "PyTorch", due: "2026-12-02", itemId: it.id });
    assert(td.done === false && td.due === "2026-12-02" && td.topic === "PyTorch", "createTodo");
    assert((await st.setTodoDone(td.id, true)).done === true, "setTodoDone");
    assert((await st.listTodos()).length === 1, "listTodos");
    const nt = await st.createNote({ title: "note", text: "body text", topic: "AI Infra", itemId: it.id });
    assert(nt.text === "body text" && nt.itemId === it.id && nt.createdAt, "createNote");
    assert((await st.listNotes()).length === 1, "listNotes");
    assert((await st.saveRecap({ title: "r", blocks: [] })).saved === "notion", "saveRecap");
    const lazy = createNotionStore("t", ids.logId, "11111111111111111111111111111111", {}, { baseUrl });
    assert((await lazy.listTodos()).length === 0, "missing to-dos db lists as empty");
    await lazy.createTodo({ title: "x" });
    assert(lazy.dbIds().todos, "missing to-dos db is created on first write");
    assert(calls.every((c) => c.endsWith("v=2022-06-28")), "every request pins Notion-Version 2022-06-28 (" + calls.length + " calls)");
  } catch (e) { console.log(e.message); process.exitCode = 1; }
  srv.close();
});
