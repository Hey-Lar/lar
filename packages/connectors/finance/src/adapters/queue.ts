// SerialQueue — concurrency=1 async task queue with optional min-interval.
//
// Ported from the founder's invest-bot-personal design/code/adapters/queue.ts.
// Pure timing logic — no I/O, no external dependencies. Concurrency=1 is the
// right default for broker REST endpoints that have per-second rate caps.
//
// Clock injection: pass `clock` in options to use a custom `now()` function.
// Tests can use a fake clock; production code omits it and gets Date.now().

export interface SerialQueueOptions {
  /** Minimum milliseconds between the end of one task and the start of the next. */
  minSpacingMs?: number;
  /** Inject a clock (returns unix ms). Defaults to Date.now. */
  clock?: () => number;
}

export class SerialQueue {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly minSpacingMs: number;
  private readonly clock: () => number;
  private lastRun = -Infinity;

  constructor(opts: SerialQueueOptions = {}) {
    this.minSpacingMs = opts.minSpacingMs ?? 0;
    this.clock = opts.clock ?? (() => Date.now());
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      if (this.minSpacingMs > 0) {
        const wait = this.minSpacingMs - (this.clock() - this.lastRun);
        if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      }
      try {
        return await fn();
      } finally {
        this.lastRun = this.clock();
      }
    };

    const next = this.chain.then(run, run);
    // Keep the chain alive even on rejection so later tasks still run.
    this.chain = next.catch(() => undefined);
    return next as Promise<T>;
  }
}
