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

function render(state) {
  $("mode-dot").classList.toggle("live", state.mode === "notion");
  $("mode-dot").title = state.mode === "notion" ? "synced to notion" : "demo mode";

  const s = state.stats;
  $("stats").innerHTML =
    `ep. ${String(episodeNo()).padStart(2, "0")} &nbsp;·&nbsp; ` +
    `<b>${s.doneThisWeek}</b> finished this week &nbsp;·&nbsp; ` +
    `<b>${s.learning}</b> in progress &nbsp;·&nbsp; ` +
    `<b>${s.backlog}</b> in backlog` +
    (s.streak > 1 ? ` &nbsp;·&nbsp; <b>${s.streak}</b>-day streak` : "");

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
  body.innerHTML = `<div class="i-title">${title}</div><div class="i-meta">${meta}</div>`;

  const cyc = document.createElement("button");
  cyc.className = "status-btn";
  cyc.textContent = item.status;
  cyc.title = `move to ${NEXT_STATUS[item.status].toLowerCase()}`;
  cyc.onclick = () => setStatus(item.id, NEXT_STATUS[item.status]);

  el.append(check, body, cyc);
  return el;
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

$("recap-btn").onclick = async () => {
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
})();
