// "previously, on your studies" — a quiet, cinematic weekly recap of
// self-directed learning, written back into Notion as a formatted page.

const { todayStr, addDays } = require("./stats");

const pick = (arr, i) => arr[Math.abs(i) % arr.length];

const OPENERS = [
  "The work continues in small rooms and late hours.",
  "Another week of following the interesting questions.",
  "No syllabus but the one you wrote yourself.",
  "Progress is quiet. It mostly looks like reading and trying again.",
];

const DONE_LINES = [
  (n) => `This week, ${n} thing${n === 1 ? "" : "s"} actually got finished.`,
  (n) => `${n} item${n === 1 ? "" : "s"} moved from “learning” to “done”.`,
];

const LEARNING_LINES = [
  (n) => `Still open on the desk: ${n} thread${n === 1 ? "" : "s"} in progress.`,
  (n) => `${n} topic${n === 1 ? " is" : "s are"} mid-thought — the good kind of unfinished.`,
];

const STALE_LINES = [
  (n) => `${n} thing${n === 1 ? "" : "s"} on the backlog are starting to gather dust.`,
];

const CLOSERS = [
  "Keep going. The compounding is the point.",
  "Next episode: same desk, slightly further along.",
  "Slow is fine. Stopped is the only failure state.",
  "To be continued.",
];

function daysUntil(dateStr, now = new Date()) {
  return Math.round((new Date(dateStr) - new Date(todayStr(now))) / 86400000);
}

function generateRecap(items, stats, now = new Date()) {
  const weekAgo = addDays(todayStr(now), -7);
  const doneWeek = items.filter(
    (i) => i.status === "Done" && i.completedAt && i.completedAt.slice(0, 10) >= weekAgo
  );
  const learning = items.filter((i) => i.status === "Learning");
  const backlog = items.filter((i) => i.status === "Backlog");
  const upcoming = items
    .filter((i) => i.status !== "Done" && i.target && i.target > todayStr(now))
    .sort((a, b) => a.target.localeCompare(b.target));
  const seed = doneWeek.length + learning.length + backlog.length;

  const lines = [];
  lines.push("# previously, on your studies");
  lines.push(`*${pick(OPENERS, seed)}*`);
  lines.push("");
  if (doneWeek.length) {
    lines.push(pick(DONE_LINES, seed)(doneWeek.length));
    for (const i of doneWeek.slice(0, 5)) {
      lines.push(`  - ${i.title}${i.topic ? ` — ${i.topic}` : ""}`);
    }
  } else {
    lines.push(
      "Nothing finished this week. It happens — the streak is not the work, the work is the work."
    );
  }
  lines.push("");
  if (learning.length) {
    lines.push(pick(LEARNING_LINES, seed)(learning.length));
    for (const i of learning.slice(0, 4)) {
      lines.push(`  - ${i.title}`);
    }
  }
  if (backlog.length > learning.length + 2) {
    lines.push(pick(STALE_LINES, seed)(backlog.length));
  }
  if (upcoming.length) {
    lines.push("");
    const next = upcoming[0];
    const d = daysUntil(next.target, now);
    lines.push(`Next on the docket: **${next.title}** — in ${d} day${d === 1 ? "" : "s"}.`);
  }
  lines.push("");
  lines.push(
    `Week ledger: ${stats.doneThisWeek} finished · ${stats.learning} in progress · ${stats.streak}-day streak.`
  );
  lines.push("");
  lines.push(`*${pick(CLOSERS, seed + stats.streak)}*`);

  const title = `previously on — week of ${todayStr(now)}`;
  return { title, markdown: lines.join("\n"), blocks: markdownToBlocks(lines.join("\n")) };
}

// Minimal Notion-flavored markdown -> blocks for the recap page.
function markdownToBlocks(md) {
  const text = (content) => ({
    type: "text",
    text: { content: content.replace(/\*\*|\*/g, "") },
  });
  return md.split("\n").map((line) => {
    if (line.startsWith("# ")) {
      return {
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [text(line.slice(2))] },
      };
    }
    if (line.trim().startsWith("- ")) {
      return {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: [text(line.trim().slice(2))] },
      };
    }
    if (!line.trim()) {
      return { object: "block", type: "divider", divider: {} };
    }
    return { object: "block", type: "paragraph", paragraph: { rich_text: [text(line)] } };
  });
}

module.exports = { generateRecap, markdownToBlocks };
