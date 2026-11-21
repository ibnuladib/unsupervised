const $ = (id) => document.getElementById(id);
const api = (path, opts) =>
  fetch(path, { headers: { "Content-Type": "application/json" }, ...opts }).then((r) => r.json());

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
const pad = (n) => String(n).padStart(2, "0");

const NEXT_STATUS = { Backlog: "Learning", Learning: "Done", Done: "Backlog" };

const HUD_LINES = [
  "keep on keeping on.",
  "get in the repo, ibnul.",
  "damn fine studying.",
  "the owls are not what they seem.",
  "tux was there for you at your lowest.",
  "the compounding is the point.",
  "same desk, slightly further along.",
];

// Week of the year as episode number — this semester is a season.
function episodeNo(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - start) / 604800000) + 1;
}
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------- hud ----------
$("ep").textContent = `ep. ${pad(episodeNo())}`;
$("recap-ep").textContent = `episode:${pad(episodeNo())}`;

(function clock() {
  const d = new Date();
  $("clock").textContent =
    d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }) +
    ` / ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  setTimeout(clock, 20000);
})();

(function cycleHud() {
  const el = $("footer-line");
  let i = Math.floor(Math.random() * HUD_LINES.length);
  el.textContent = HUD_LINES[i++ % HUD_LINES.length];
  setInterval(() => {
    el.parentElement.style.opacity = 0;
    setTimeout(() => {
      el.textContent = HUD_LINES[i++ % HUD_LINES.length];
      el.parentElement.style.opacity = 1;
    }, 600);
  }, 9000);
})();

// ---------- render ----------
let lastState = null;
let topicFilter = null;

function render(state) {
  lastState = state;
  const live = state.mode === "notion";
  $("mode-dot").classList.toggle("live", live);
  $("mode-label").textContent = live ? "synced to notion" : "demo mode";

  const s = state.stats;
  const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const w = (n) => WORDS[n] ?? String(n);
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const parts = [
    `<b class="${s.doneThisWeek ? "hot" : ""}">${cap(w(s.doneThisWeek))} finished</b> this week.`,
    `<b>${cap(w(s.learning))}</b> still open on the desk, <b>${w(s.backlog)}</b> waiting.`,
  ];
  if (s.streak > 1) parts.push(`<b>${cap(w(s.streak))} days</b> in a row.`);
  if (s.focusMinWeek) parts.push(`<b>${s.focusMinWeek} minutes</b> of focus.`);
  $("stats").innerHTML = `<p class="week-line"><span class="ep">ep. ${pad(episodeNo())}</span>${parts.join(" ")}</p>`;

  renderTopics(state);
  renderHeatmap(state);
  renderGroups(state);
  renderTodos(state);
  renderNotes(state);
}

function renderTopics(state) {
  const topics = {};
  for (const i of state.items) {
    const t = (topics[i.topic || "General"] ||= { total: 0, done: 0 });
    t.total++;
    if (i.status === "Done") t.done++;
  }
  const names = Object.keys(topics).sort((a, b) => topics[b].total - topics[a].total);
  if (topicFilter && !topics[topicFilter]) topicFilter = null;

  const root = $("topics");
  root.innerHTML = "";
  for (const name of names) {
    const t = topics[name];
    const b = document.createElement("button");
    b.className = "topic" + (topicFilter === name ? " on" : "");
    b.title = topicFilter === name ? "show everything" : `show only ${name}`;
    b.innerHTML =
      `<span class="topic-row"><span class="topic-name">${esc(name)}</span>` +
      `<span class="topic-count">${t.done}/${t.total}</span></span>` +
      `<span class="topic-bar"><i style="width:${Math.round((t.done / t.total) * 100)}%"></i></span>`;
    b.onclick = () => {
      topicFilter = topicFilter === name ? null : name;
      render(lastState);
    };
    root.appendChild(b);
  }
  $("topic-list").innerHTML = names.map((n) => `<option value="${esc(n)}">`).join("");
}

function renderGroups(state) {
  const root = $("groups");
  root.innerHTML = "";
  const items = topicFilter
    ? state.items.filter((i) => (i.topic || "General") === topicFilter)
    : state.items;

  if (topicFilter) {
    const h = document.createElement("div");
    h.className = "group-title";
    h.innerHTML = `<span>showing ${esc(topicFilter)}</span>`;
    const clear = document.createElement("button");
    clear.textContent = "clear";
    clear.onclick = () => {
      topicFilter = null;
      render(lastState);
    };
    h.appendChild(clear);
    root.appendChild(h);
  }

  const byStatus = (st) => items.filter((i) => i.status === st);
  addGroup(root, "in progress", byStatus("Learning"));
  addGroup(root, "up next", byStatus("Backlog"));
  addGroup(root, "done", byStatus("Done"));
  if (!items.length) root.insertAdjacentHTML("beforeend", `<div class="empty">nothing here yet. paste a link above.</div>`);
}

function addGroup(root, title, items) {
  if (!items.length) return;
  const h = document.createElement("div");
  h.className = "group-title";
  h.innerHTML = `<span>${title}</span><b>${pad(items.length)}</b>`;
  root.appendChild(h);
  items.forEach((item, n) => root.appendChild(itemRow(item, n + 1)));
}

function itemRow(item, n) {
  const el = document.createElement("div");
  el.className = "item" + (item.status === "Done" ? " done" : "");

  const late = item.target && item.status !== "Done" && item.target < localDay();
  const title = item.link
    ? `<a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.title)}</a>`
    : esc(item.title);
  const meta =
    `<span class="t-type">${esc(item.type)}</span>` +
    (item.topic ? `<span>${esc(item.topic)}</span>` : "") +
    (item.target ? `<span class="${late ? "late" : ""}">${late ? "overdue" : "due"} ${esc(item.target)}</span>` : "") +
    (item.status === "Done" && item.completedAt ? `<span>finished ${esc(item.completedAt.slice(0, 10))}</span>` : "");

  const body = document.createElement("div");
  body.className = "i-body";
  body.innerHTML =
    `<div class="i-title">${title}</div><div class="i-meta">${meta}</div>` +
    (item.note ? `<div class="i-note">${esc(item.note)}</div>` : "");

  const actions = document.createElement("div");
  actions.className = "i-actions";
  if (item.status !== "Done") {
    const on = session?.itemId === item.id;
    const focus = document.createElement("button");
    focus.className = "focus-btn" + (on ? " active" : "");
    focus.textContent = on ? "stop 00:00" : "focus";
    focus.title = on ? "stop and log this session" : "start a focus session";
    focus.onclick = () => toggleSession(item);
    actions.appendChild(focus);
  }
  const noteBtn = document.createElement("button");
  noteBtn.textContent = "note";
  noteBtn.title = "write a note on this";
  noteBtn.onclick = () => openNote(item);
  actions.appendChild(noteBtn);

  const cyc = document.createElement("button");
  cyc.className = "status-btn s-" + item.status.toLowerCase();
  cyc.textContent = item.status;
  cyc.title = `move to ${NEXT_STATUS[item.status].toLowerCase()}`;
  cyc.onclick = () => setStatus(item.id, NEXT_STATUS[item.status]);
  actions.appendChild(cyc);

  el.insertAdjacentHTML("afterbegin", `<span class="i-no">${pad(n)}</span>`);
  el.append(body, actions);
  return el;
}

// ---- heatmap: last 15 weeks of completions ----
function renderHeatmap(state) {
  const counts = {};
  for (const i of state.items) {
    if (i.status === "Done" && i.completedAt) {
      const d = i.completedAt.slice(0, 10);
      counts[d] = (counts[d] || 0) + 1;
    }
  }
  const WEEKS = 15;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const dow = (today.getDay() + 6) % 7; // Mon=0
  const start = new Date(today);
  start.setDate(start.getDate() - dow - 7 * (WEEKS - 1));

  const hm = $("heatmap");
  hm.innerHTML = "";
  for (let w = 0; w < WEEKS; w++) {
    const col = document.createElement("div");
    col.className = "week";
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const cell = document.createElement("div");
      cell.className = "day" + (key === todayKey ? " today" : "");
      const n = counts[key] || 0;
      cell.dataset.l = n === 0 ? 0 : Math.min(4, n);
      cell.title = `${key}: ${n} done`;
      if (day > today) cell.style.visibility = "hidden";
      col.appendChild(cell);
    }
    hm.appendChild(col);
  }
}

// ---- focus sessions ----
let session = null;
let timerId = null;

function toggleSession(item) {
  if (session?.itemId === item.id) return stopSession();
  if (session) stopSession(true);
  session = { itemId: item.id, itemTitle: item.title, startedAt: Date.now() };
  $("session-timer").classList.remove("hidden");
  timerId = setInterval(tickTimer, 1000);
  if (lastState) render(lastState);
  tickTimer();
}

function tickTimer() {
  const sec = Math.floor((Date.now() - session.startedAt) / 1000);
  const clock = `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
  $("session-timer").textContent = `${clock} ${session.itemTitle.slice(0, 26)}`;
  const btn = document.querySelector(".focus-btn.active");
  if (btn) btn.textContent = `stop ${clock}`;
}

$("session-timer").onclick = () => session && stopSession();

async function stopSession(silent = false) {
  clearInterval(timerId);
  const elapsed = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const s = session;
  session = null;
  $("session-timer").classList.add("hidden");
  if (!silent) {
    const res = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ itemId: s.itemId, itemTitle: s.itemTitle, minutes: elapsed }),
    });
    if (res.state) {
      toast(`+${elapsed}m focus logged`);
      render(res.state);
      return;
    }
  }
  if (lastState) render(lastState);
}

// ---- toast ----
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---- bookmarklet + capture via hash ----
$("bm").href =
  "javascript:window.open('" +
  location.origin +
  "/#capture='+encodeURIComponent(location.href),'_blank')";
$("bm").onclick = (e) => {
  e.preventDefault();
  toast("drag this to your bookmarks bar");
};

async function handleCaptureHash() {
  if (!location.hash.startsWith("#capture=")) return false;
  const url = decodeURIComponent(location.hash.slice(9));
  history.replaceState(null, "", location.pathname);
  toast("capturing link…");
  const res = await api("/api/capture", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  if (res.state) {
    toast(`filed: ${res.item.title.slice(0, 60)}`);
    render(res.state);
  } else {
    toast("capture failed: " + (res.error || "?"));
  }
  return true;
}

async function setStatus(id, status) {
  const res = await api(`/api/items/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  if (res.state) render(res.state);
}

const TITLE_PLACEHOLDER = $("i-title").placeholder;

$("add-form").onsubmit = async (e) => {
  e.preventDefault();
  const titleEl = $("i-title");
  const raw = titleEl.value.trim();
  if (!raw) return;
  const isUrl = /^https?:\/\/\S+$/.test(raw);
  const topic = $("i-topic").value.trim();
  const target = $("i-target").value || null;
  if (isUrl) {
    titleEl.value = "";
    titleEl.placeholder = "capturing…";
  }
  const res = await api(isUrl ? "/api/capture" : "/api/items", {
    method: "POST",
    body: JSON.stringify(isUrl ? { url: raw, topic, target } : { title: raw, topic, type: $("i-type").value, target }),
  });
  titleEl.placeholder = TITLE_PLACEHOLDER;
  if (res.state) {
    titleEl.value = "";
    topicFilter = null;
    render(res.state);
    if (isUrl && res.item) toast(`filed: ${res.item.title.slice(0, 60)}`);
  } else {
    if (isUrl) titleEl.value = raw;
    toast(res.error || "could not add that");
  }
};

// ---- recap ----
const openRecap = async () => {
  $("recap-modal").classList.remove("hidden");
  $("recap-text").innerHTML = `<p class="dim">rolling the recap…</p>`;
  $("recap-status").textContent = "";
  const res = await api("/api/recap", { method: "POST" });
  if (res.error) {
    $("recap-text").innerHTML = `<p class="dim">error: ${esc(res.error)}</p>`;
    return;
  }
  showRecap($("recap-text"), res.markdown);
  $("recap-status").textContent =
    res.saved?.saved === "notion" ? `filed to notion — ${res.saved.url}` : "demo mode — not saved.";
};

// The recap arrives as markdown; show it as prose, one line at a time.
function showRecap(el, md) {
  const inline = (s) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const lines = md.split("\n").filter((l) => !/^#\s/.test(l));
  while (lines.length && !lines[0].trim()) lines.shift();
  el.innerHTML = lines
    .map((l, i) => {
      const li = /^\s*[-•]\s+/.test(l);
      const text = l.replace(/^\s*[-•]\s+/, "");
      const cls = !text.trim() ? "gap" : li ? "li" : "";
      return `<p class="${cls}" style="animation-delay:${i * 90}ms">${inline(text)}</p>`;
    })
    .join("");
}

const closeModals = () => {
  $("recap-modal").classList.add("hidden");
  $("connect-modal").classList.add("hidden");
  $("note-modal").classList.add("hidden");
};
$("note-close").onclick = closeModals;
$("recap-btn").onclick = openRecap;
$("recap-btn-2").onclick = openRecap;
$("recap-close").onclick = closeModals;
$("connect-btn").onclick = () => $("connect-modal").classList.remove("hidden");
$("connect-close").onclick = closeModals;
for (const m of document.querySelectorAll(".modal")) m.onclick = (e) => e.target === m && closeModals();
document.addEventListener("keydown", (e) => e.key === "Escape" && closeModals());

$("connect-go").onclick = async () => {
  $("connect-status").textContent = "provisioning learning log…";
  const res = await api("/api/connect", {
    method: "POST",
    body: JSON.stringify({
      token: $("n-token").value.trim(),
      parentPage: $("n-parent").value.trim(),
    }),
  });
  $("connect-status").textContent = res.ok ? "connected — reloading…" : "failed: " + res.error;
  if (res.ok) setTimeout(() => location.reload(), 800);
};

// ---------- the list: to-dos ----------
const inTopic = (x) => !topicFilter || (x.topic || "General") === topicFilter;

function renderTodos(state) {
  const root = $("todos");
  const todos = (state.todos || []).filter(inTopic);
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  root.innerHTML = "";
  if (!todos.length) root.innerHTML = `<div class="empty">nothing on the list.</div>`;
  for (const t of [...open, ...done]) {
    const late = t.due && !t.done && t.due < localDay();
    const row = document.createElement("label");
    row.className = "todo" + (t.done ? " done" : "");
    row.innerHTML =
      `<input type="checkbox" ${t.done ? "checked" : ""} />` +
      `<span class="box"></span>` +
      `<span class="todo-body"><span class="todo-title">${esc(t.title)}</span>` +
      `<span class="i-meta"><span>${esc(t.topic || "General")}</span>` +
      (t.due ? `<span class="${late ? "late" : ""}">${late ? "overdue" : "due"} ${esc(t.due)}</span>` : "") +
      `</span></span>`;
    row.querySelector("input").onchange = async (e) => {
      const res = await api(`/api/todos/${t.id}/done`, { method: "POST", body: JSON.stringify({ done: e.target.checked }) });
      if (res.state) render(res.state);
      else toast(res.error || "could not update that");
    };
    root.appendChild(row);
  }
}

$("todo-form").onsubmit = async (e) => {
  e.preventDefault();
  const title = $("t-title").value.trim();
  if (!title) return;
  const res = await api("/api/todos", {
    method: "POST",
    body: JSON.stringify({ title, due: $("t-due").value || null, topic: topicFilter || "General" }),
  });
  if (res.state) {
    $("t-title").value = "";
    $("t-due").value = "";
    render(res.state);
  } else toast(res.error || "could not add that");
};

// ---------- the notebook: notes ----------
function renderNotes(state) {
  const root = $("notes");
  const notes = (state.notes || []).filter(inTopic);
  const titleOf = Object.fromEntries(state.items.map((i) => [i.id, i.title]));
  root.innerHTML = notes.length ? "" : `<div class="empty">no notes yet. press "note" on anything you're learning.</div>`;
  for (const n of notes) {
    const card = document.createElement("article");
    card.className = "note";
    card.innerHTML =
      `<h4>${esc(n.title)}</h4>` +
      (n.text ? `<p>${esc(n.text)}</p>` : "") +
      `<div class="i-meta"><span>${esc(n.topic || "General")}</span>` +
      (titleOf[n.itemId] ? `<span class="from">from ${esc(titleOf[n.itemId])}</span>` : "") +
      (n.createdAt ? `<span>${esc(n.createdAt.slice(0, 10))}</span>` : "") +
      `</div>`;
    card.onclick = () => card.classList.toggle("open");
    root.appendChild(card);
  }
}

let noteItem = null;
function openNote(item = null) {
  noteItem = item;
  $("note-for").textContent = item ? `on: ${item.title.slice(0, 48)}` : topicFilter ? `in ${topicFilter}` : "a note";
  $("note-title").value = "";
  $("note-text").value = "";
  $("note-modal").classList.remove("hidden");
  $("note-title").focus();
}
$("note-new").onclick = () => openNote();

$("note-form").onsubmit = async (e) => {
  e.preventDefault();
  const title = $("note-title").value.trim();
  if (!title) return;
  const res = await api("/api/notes", {
    method: "POST",
    body: JSON.stringify({
      title,
      text: $("note-text").value,
      topic: noteItem?.topic || topicFilter || "General",
      itemId: noteItem?.id || null,
    }),
  });
  if (res.state) {
    closeModals();
    toast("note saved");
    render(res.state);
  } else toast(res.error || "could not save that");
};

// ---------- the wall ----------
const WALL = [
  ["pins/battlestation.jpg", "the desk, 2am"],
  ["pins/ds.jpg", "keep on keeping on"],
  ["pins/rei-tux.jpg", "rei \u00d7 tux"],
  ["pins/torres.jpg", "torres, in the rain"],
  ["pins/cooper.jpg", "damn fine"],
  ["pins/cat.jpg", "zizou"],
  ["pins/peep.jpg", "at your lowest"],
  ["pins/sky.jpg", "frame still"],
];
(() => {
  const strip = $("wall-strip");
  strip.innerHTML = WALL.map(
    ([src, cap], i) =>
      `<figure><img src="${src}" alt="${esc(cap)}" loading="lazy" /><figcaption><b>${pad(i + 1)}</b>${esc(cap)}</figcaption></figure>`
  ).join("");
  const step = (dir) => {
    const max = strip.scrollWidth - strip.clientWidth;
    if (dir > 0 && strip.scrollLeft >= max - 4) return strip.scrollTo({ left: 0, behavior: "smooth" });
    if (dir < 0 && strip.scrollLeft <= 4) return strip.scrollTo({ left: max, behavior: "smooth" });
    strip.scrollBy({ left: dir * Math.max(280, strip.clientWidth * 0.5), behavior: "smooth" });
  };
  $("wall-prev").onclick = () => step(-1);
  $("wall-next").onclick = () => step(1);
  let paused = false;
  const wall = strip.closest(".wall");
  wall.onmouseenter = () => (paused = true);
  wall.onmouseleave = () => (paused = false);
  setInterval(() => !paused && !document.hidden && step(1), 6000);
})();

(async () => {
  const state = await api("/api/state");
  if (state.error) {
    $("groups").innerHTML = `<div class="empty">error — ${esc(state.error)}</div>`;
    return;
  }
  render(state);
  await handleCaptureHash();
})();

// ---------- type styles: pick a look, remembered in this browser ----------
(() => {
  const NAMES = { 1: "terminal", 2: "title card", 3: "notebook", 4: "case file" };
  const bar = document.createElement("div");
  bar.className = "type-pick";
  const set = (n) => {
    document.body.dataset.type = n;
    localStorage.setItem("type", n);
    bar.innerHTML = "<span>type</span>";
    for (const k of Object.keys(NAMES)) {
      const b = document.createElement("button");
      b.textContent = k + " " + NAMES[k];
      b.className = k === String(n) ? "on" : "";
      b.onclick = () => set(k);
      bar.appendChild(b);
    }
  };
  set(new URLSearchParams(location.search).get("type") || localStorage.getItem("type") || "2");
  document.body.appendChild(bar);
})();
