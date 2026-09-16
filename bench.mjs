import { MessageList } from '@mastra/core/agent';

// Shape of a row as @mastra/pg hands it to `new MessageList().add(rows, 'memory')`.
const message = (i) => ({
  id: `m-${i}`,
  role: i % 2 ? 'assistant' : 'user',
  threadId: 'thread-1',
  resourceId: 'resource-1',
  type: 'text',
  createdAt: new Date(1_700_000_000_000 + i * 1000),
  content: { format: 2, parts: [{ type: 'text', text: `message ${i} ` + 'x'.repeat(600) }] },
});

const sizes = (process.argv[2] ?? '1000,2000,4000,8000').split(',').map(Number);
for (const n of sizes) {
  const rows = Array.from({ length: n }, (_, i) => message(i));
  const t0 = performance.now();
  const list = new MessageList().add(rows, 'memory');
  const batchMs = performance.now() - t0;

  const perMessage = new MessageList();
  const t1 = performance.now();
  for (const row of rows) perMessage.add(row, 'memory');
  const perMessageMs = performance.now() - t1;

  if (list.get.all.db().length !== n) throw new Error('lost messages');
  console.log(
    `N=${n.toString().padStart(5)}  add(rows) ${batchMs.toFixed(0).padStart(6)} ms  ` +
      `one add per row ${perMessageMs.toFixed(0).padStart(6)} ms  ` +
      `(${((batchMs / (n * n)) * 1e6).toFixed(1)} ns per message pair)`,
  );
}
