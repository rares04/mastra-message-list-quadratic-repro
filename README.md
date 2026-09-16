# `MessageList.add(..., 'memory')` is quadratic in the number of stored messages

`@mastra/core` `MessageList.addOne` dedups a memory-source message by comparing it with
**every** stored message (`messagesAreEqual` in a loop over `this.messages`), looks the
message up by id with `Array.prototype.find`, and re-sorts the whole list after every add.
Adding N messages therefore costs O(N²). `@mastra/pg` (and the other stores) run every
row returned by `listMessages` through exactly that call, so an unpaged read of a long
thread (`perPage: false`, which Observational Memory uses for the unobserved tail)
blocks the event loop for seconds.

## Expected

Loading N stored messages into a `MessageList` should cost roughly O(N): the time for
8 000 messages should be about 4× the time for 4 000, not 16×.

## Actual

Time grows with N²; the "ns per message pair" column stays flat while wall time explodes.

```
N= 1000  add(rows)     28 ms  one add per row     28 ms  (27.9 ns per message pair)
N= 2000  add(rows)     79 ms  one add per row     74 ms  (19.7 ns per message pair)
N= 4000  add(rows)    289 ms  one add per row    289 ms  (18.1 ns per message pair)
N= 8000  add(rows)   1193 ms  one add per row   1168 ms  (18.6 ns per message pair)
```

(Apple M4 Pro, Node 24.15; see `bench.mjs`. `@mastra/core`'s own test suite on Node 22 shows the same curve: 20 000 rows take ~24 s. Real rows with several parts cost more
per pair — a production thread of ~10 000 rows measured 14–25 s in a wall-clock profile.)

## Steps to reproduce

```bash
npm install
npm run bench            # defaults to N = 1000,2000,4000,8000
npm run bench -- 12000   # any comma-separated list of sizes
```

No API keys, no database, no model: the script only builds `MastraDBMessage` rows in
memory and calls `new MessageList().add(rows, 'memory')`.

## Environment

- `@mastra/core` 1.67.0 (also present in 1.59.0)
- Node 24.15.0, npm 11.12.1, macOS 26.6 (arm64)
