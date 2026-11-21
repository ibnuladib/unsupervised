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
      note: "The transformer. Scaled dot-product attention, multi-head attention, positional encoding.",
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
      note: "Better parallelism and work partitioning over FlashAttention.",
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

function makeDemoSessions() {
  const t = todayStr();
  // Sparse history so the heatmap/stats have signal.
  return [
    { id: "s1", itemId: "d4", itemTitle: "vLLM internals", minutes: 50, date: addDays(t, -1) },
    { id: "s2", itemId: "d3", itemTitle: "Karpathy GPT-2", minutes: 40, date: addDays(t, -3) },
    { id: "s3", itemId: "d9", itemTitle: "NCCL primer", minutes: 65, date: addDays(t, -4) },
    { id: "s4", itemId: "d4", itemTitle: "vLLM internals", minutes: 25, date: t },
  ];
}

function makeDemoTodos() {
  const t = todayStr();
  return [
    { id: "t1", title: "Write the backward() for a custom ReLU and gradcheck it", done: false, due: addDays(t, 1), topic: "PyTorch", itemId: "d2" },
    { id: "t2", title: "Run the vLLM quickstart locally and watch the batching logs", done: false, due: addDays(t, 2), topic: "AI Infra", itemId: "d4" },
    { id: "t3", title: "Finish hour 2 of the GPT-2 video and commit the training loop", done: false, due: addDays(t, 3), topic: "PyTorch", itemId: "d3" },
    { id: "t4", title: "Skim the FlashAttention-2 abstract and decide if it's this week", done: false, due: null, topic: "AI Infra", itemId: "d5" },
    { id: "t5", title: "Re-derive scaled dot-product attention on paper", done: true, due: null, topic: "AI Research", itemId: "d1" },
  ];
}

function makeDemoNotes() {
  const t = todayStr();
  return [
    {
      id: "n1",
      title: "PagedAttention is virtual memory for the KV cache",
      text: "The KV cache is stored in fixed-size blocks that don't need to be contiguous, so memory isn't reserved up front for the longest possible sequence. That is what makes continuous batching practical.",
      topic: "AI Infra",
      itemId: "d4",
      createdAt: t + "T09:20:00Z",
    },
    {
      id: "n2",
      title: "Why attention divides by sqrt(d_k)",
      text: "Dot products grow with dimension, which pushes softmax into regions with tiny gradients. Dividing by sqrt(d_k) keeps the variance near 1 so the softmax stays trainable.",
      topic: "AI Research",
      itemId: "d1",
      createdAt: addDays(t, -1) + "T21:30:00Z",
    },
    {
      id: "n3",
      title: "all-reduce is the one to understand first",
      text: "Every worker ends up with the sum of everyone's gradients. NCCL builds rings or trees over the GPUs to do it; the topology matters more than I expected.",
      topic: "AI Infra",
      itemId: "d9",
      createdAt: addDays(t, -2) + "T19:10:00Z",
    },
  ];
}

function createDemoStore() {
  const items = makeDemoItems();
  const sessions = makeDemoSessions();
  const todos = makeDemoTodos();
  const notes = makeDemoNotes();

  return {
    mode: "demo",
    async listItems() {
      return items.map((i) => ({ ...i }));
    },
    async createItem({ title, topic, type, target, link, note }) {
      const item = {
        id: "d" + ++seq,
        title,
        topic: topic || "General",
        type: type || "Docs",
        status: "Backlog",
        target: target || null,
        link: link || null,
        note: note || null,
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
    async listSessions() {
      return sessions.map((s) => ({ ...s }));
    },
    async addSession({ itemId, minutes }) {
      const item = items.find((x) => x.id === itemId);
      const s = {
        id: "s" + ++seq,
        itemId,
        itemTitle: item ? item.title : "?",
        minutes: Math.max(1, Math.round(minutes)),
        date: todayStr(),
      };
      sessions.push(s);
      return s;
    },
    async listTodos() {
      return todos.map((x) => ({ ...x }));
    },
    async createTodo({ title, topic, due, itemId }) {
      const todo = { id: "t" + ++seq, title, done: false, due: due || null, topic: topic || "General", itemId: itemId || null };
      todos.push(todo);
      return { ...todo };
    },
    async setTodoDone(id, done) {
      const todo = todos.find((x) => x.id === id);
      if (!todo) throw new Error("to-do not found");
      todo.done = !!done;
      return { ...todo };
    },
    async listNotes() {
      return notes.map((x) => ({ ...x }));
    },
    async createNote({ title, text, topic, itemId }) {
      const note = {
        id: "n" + ++seq,
        title,
        text: text || "",
        topic: topic || "General",
        itemId: itemId || null,
        createdAt: new Date().toISOString(),
      };
      notes.unshift(note);
      return { ...note };
    },
    async saveRecap() {
      return { saved: "memory" };
    },
  };
}

module.exports = { createDemoStore };
