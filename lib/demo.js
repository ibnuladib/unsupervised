// Demo mode: in-memory store so the app runs with zero Notion setup.
// Mirrors the notion.js store interface exactly.
// Seeded for a self-directed AI learner: infra, research, pytorch.

const { todayStr, addDays } = require("./stats");

let seq = 100;

function makeDemoItems() {
  const t = todayStr();
  return [
    {
      id: "d1",
      title: "Attention Is All You Need — annotated re-read",
      topic: "AI Research",
      type: "Paper",
      status: "Done",
      target: null,
      link: "https://arxiv.org/abs/1706.03762",
      completedAt: addDays(t, -1) + "T21:14:00Z",
    },
    {
      id: "d2",
      title: "PyTorch: write a custom autograd.Function",
      topic: "PyTorch",
      type: "Project",
      status: "Learning",
      target: addDays(t, 2),
      link: null,
      completedAt: null,
    },
    {
      id: "d3",
      title: "Karpathy — Let's reproduce GPT-2 (124M)",
      topic: "PyTorch",
      type: "Video",
      status: "Learning",
      target: null,
      link: "https://www.youtube.com/watch?v=l8pRSuU81PU",
      completedAt: null,
    },
    {
      id: "d4",
      title: "vLLM internals: PagedAttention & continuous batching",
      topic: "AI Infra",
      type: "Docs",
      status: "Learning",
      target: addDays(t, 4),
      link: null,
      completedAt: null,
    },
    {
      id: "d5",
      title: "FlashAttention-2 paper",
      topic: "AI Infra",
      type: "Paper",
      status: "Backlog",
      target: null,
      link: "https://arxiv.org/abs/2307.08691",
      completedAt: null,
    },
    {
      id: "d6",
      title: "Triton tutorial — fused softmax kernel",
      topic: "AI Infra",
      type: "Project",
      status: "Backlog",
      target: addDays(t, 7),
      link: null,
      completedAt: null,
    },
    {
      id: "d7",
      title: "DDPM paper — skim the math",
      topic: "AI Research",
      type: "Paper",
      status: "Backlog",
      target: null,
      link: null,
      completedAt: null,
    },
    {
      id: "d8",
      title: "30 min spaced-rep flashcards",
      topic: "Habit",
      type: "Habit",
      status: "Done",
      target: null,
      link: null,
      completedAt: t + "T08:30:00Z",
    },
    {
      id: "d9",
      title: "NCCL & collective comms primer",
      topic: "AI Infra",
      type: "Docs",
      status: "Done",
      target: null,
      link: null,
      completedAt: addDays(t, -2) + "T19:02:00Z",
    },
  ];
}

function createDemoStore() {
  const items = makeDemoItems();

  return {
    mode: "demo",
    async listItems() {
      return items.map((i) => ({ ...i }));
    },
    async createItem({ title, topic, type, target, link }) {
      const item = {
        id: "d" + ++seq,
        title,
        topic: topic || "General",
        type: type || "Docs",
        status: "Backlog",
        target: target || null,
        link: link || null,
        completedAt: null,
      };
      items.push(item);
      return { ...item };
    },
    async setStatus(id, status) {
      const i = items.find((x) => x.id === id);
      if (!i) throw new Error("item not found");
      i.status = status;
      i.completedAt = status === "Done" ? new Date().toISOString() : null;
      return { ...i };
    },
    async saveRecap({ title, markdown }) {
      return { saved: "memory" };
    },
  };
}

module.exports = { createDemoStore };
