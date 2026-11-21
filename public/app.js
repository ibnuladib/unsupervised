const $ = (id) => document.getElementById(id);
const api = (path, opts) =>
  fetch(path, { headers: { "Content-Type": "application/json" }, ...opts }).then((r) => r.json());

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const NEXT_STATUS = { Backlog: "Learning", Learning: "Done", Done: "Backlog" };

const FOOTER_LINES = [
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

(function cycleFooter() {
  const el = $("footer-line");
  let i = Math.floor(Math.random() * FOOTER_LINES.length);
  const show = () => {
    el.parentElement.style.opacity = 0;
    setTimeout(() => {
      el.textContent = FOOTER_LINES[i++ % FOOTER_LINES.length];
      el.parentElement.style.opacity = 1;
    }, 600);
  };
  el.textContent = FOOTER_LINES[i++ % FOOTER_LINES.length];
  setInterval(show, 9000);
})();

let lastState = null;

function render(state) {
  lastState = state;
  $("mode-dot").classList.toggle("live", state.mode === "notion");
  $("mode-dot").title = state.mode === "notion" ? "synced to notion" : "demo mode";

  const s = state.stats;
  $("stats").innerHTML =
    `ep. ${String(episodeNo()).padStart(2, "0")} &nbsp;·&nbsp; ` +
    `<b>${s.doneThisWeek}</b> finished this week &nbsp;·&nbsp; ` +
    `<b>${s.learning}</b> in progress &nbsp;·&nbsp; ` +
    `<b>${s.backlog}</b> in backlog` +
    (s.streak > 1 ? ` &nbsp;·&nbsp; <b>${s.streak}</b>-day streak` : "") +
    (s.focusMinWeek ? ` &nbsp;·&nbsp; <b>${s.focusMinWeek}</b>m focus` : "");

  renderHeatmap(state);

  const groups = $("groups");
  groups.innerHTML = "";
  const byStatus = (st) => state.items.filter((i) => i.status === st);
  addGroup(groups, "in progress", byStatus("Learning"));
  addGroup(groups, "up next", byStatus("Backlog"));
  addGroup(groups, `done — ${byStatus("Done").length} total`, byStatus("Done"));
}

function addGroup(root, title, items) {
  if (!items.length) return;
  const h = document.createElement("div");
  h.className = "group-title";
  h.textContent = title;
  root.appendChild(h);
  for (const i of items) root.appendChild(itemRow(i));
}

function itemRow(item) {
  const el = document.createElement("div");
  el.className = "item" + (item.status === "Done" ? " done" : "");

  const check = document.createElement("button");
  check.className = "check" + (item.status === "Learning" ? " learning" : "");
  check.title = "mark done / reopen";
  check.onclick = () => setStatus(item.id, item.status === "Done" ? "Learning" : "Done");

  const body = document.createElement("div");
  body.className = "i-body";
  const title = item.link
    ? `<a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.title)}</a>`
    : esc(item.title);
  const meta = [
    item.type,
    item.topic ? `<em>${esc(item.topic)}</em>` : null,
    item.target ? `by ${item.target}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  body.innerHTML =
    `<div class="i-title">${title}</div><div class="i-meta">${meta}</div>` +
    (item.note ? `<div class="i-note">${esc(item.note.slice(0, 110))}</div>` : "");

  const cyc = document.createElement("button");
  cyc.className = "status-btn";
  cyc.textContent = item.status;
  cyc.title = `move to ${NEXT_STATUS[item.status].toLowerCase()}`;
  cyc.onclick = () => setStatus(item.id, NEXT_STATUS[item.status]);

  el.append(check, body);
  if (item.status !== "Done") {
    const focus = document.createElement("button");
    focus.className = "focus-btn" + (session?.itemId === item.id ? " active" : "");
    focus.textContent = session?.itemId === item.id ? "stop" : "◦ 25m";
    focus.title = "start a focus session";
    focus.onclick = () => toggleSession(item);
    el.appendChild(focus);
  }
  el.appendChild(cyc);
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
      cell.className = "day";
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
  const el = $("session-timer");
  el.classList.remove("hidden");
  timerId = setInterval(tickTimer, 1000);
  tickTimer();
  if (lastState) render(lastState);
}

function tickTimer() {
  const sec = Math.floor((Date.now() - session.startedAt) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  $("session-timer").textContent = `${mm}:${ss} — ${session.itemTitle.slice(0, 32)}`;
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

$("add-form").onsubmit = async (e) => {
  e.preventDefault();
  const raw = $("i-title").value.trim();
  const isUrl = /^https?:\/\/\S+$/.test(raw);
  const titleEl = $("i-title");
  if (isUrl) titleEl.placeholder = "capturing…";
  const res = await api(isUrl ? "/api/capture" : "/api/items", {
    method: "POST",
    body: JSON.stringify(
      isUrl
        ? { url: raw, topic: $("i-topic").value, target: $("i-target").value || null }
        : {
            title: raw,
            topic: $("i-topic").value,
            type: $("i-type").value,
            target: $("i-target").value || null,
          }
    ),
  });
  titleEl.placeholder = "what are you learning next?";
  if (res.state) {
    $("i-title").value = "";
    render(res.state);
  } else if (res.error) {
    titleEl.value = res.error;
  }
};

const openRecap = async () => {
  $("recap-modal").classList.remove("hidden");
  $("recap-text").textContent = "rolling the recap…";
  $("recap-status").textContent = "";
  const res = await api("/api/recap", { method: "POST" });
  if (res.error) {
    $("recap-text").textContent = "error: " + res.error;
    return;
  }
  typewrite($("recap-text"), res.markdown);
  $("recap-status").textContent =
    res.saved?.saved === "notion" ? `filed to notion — ${res.saved.url}` : "demo mode — not saved.";
};

function typewrite(el, text) {
  el.textContent = "";
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, (i += 5));
    if (i < text.length) setTimeout(tick, 14);
  };
  tick();
}

$("recap-btn").onclick = openRecap;
$("recap-btn-2").onclick = openRecap;
$("recap-close").onclick = () => $("recap-modal").classList.add("hidden");
$("connect-btn").onclick = () => $("connect-modal").classList.remove("hidden");
$("connect-close").onclick = () => $("connect-modal").classList.add("hidden");

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

(async () => {
  const state = await api("/api/state");
  if (state.error) {
    $("groups").innerHTML = `<div class="group-title">error — ${esc(state.error)}</div>`;
    return;
  }
  render(state);
  await handleCaptureHash();
})();

// ---------- the wall ----------
const WALL = [
  ["pins/battlestation.jpg", "the desk, 2am"],
  ["pins/rei-tux.jpg", "rei \u00d7 tux"],
  ["pins/cooper.jpg", "damn fine"],
  ["pins/torres.jpg", "torres, in the rain"],
  ["pins/cat.jpg", "lo-fi resident"],
  ["pins/sky.jpg", "frame still"],
  ["pins/ds.jpg", "keep on keeping on"],
  ["pins/peep.jpg", "at your lowest"],
];
WALL.forEach(([s]) => { const i = new Image(); i.src = s; });
(() => {
  const img = $("wall-img"), cap = $("wall-cap");
  let wi = 0; cap.textContent = WALL[0][1];
  setInterval(() => {
    wi = (wi + 1) % WALL.length;
    img.style.opacity = 0;
    setTimeout(() => { img.src = WALL[wi][0]; cap.textContent = WALL[wi][1]; img.style.opacity = 1; }, 850);
  }, 6500);
})();
