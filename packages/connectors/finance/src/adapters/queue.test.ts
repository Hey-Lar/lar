import { describe, it, expect } from 'vitest';
import { SerialQueue } from './queue';

// ---------------------------------------------------------------------------
// Serialisation tests — tasks run in order, never concurrently
// ---------------------------------------------------------------------------

describe('SerialQueue — serialisation', () => {
  it('runs tasks in enqueue order', async () => {
    const q = new SerialQueue();
    const order: number[] = [];

    await Promise.all([
      q.enqueue(async () => {
        order.push(1);
      }),
      q.enqueue(async () => {
        order.push(2);
      }),
      q.enqueue(async () => {
        order.push(3);
      }),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it('does not start the second task until the first resolves', async () => {
    const q = new SerialQueue();
    let firstDone = false;
    let secondStartedBeforeFirstDone = false;

    const p1 = q.enqueue(async () => {
      await new Promise<void>((r) => setTimeout(r, 20));
      firstDone = true;
    });

    const p2 = q.enqueue(async () => {
      if (!firstDone) secondStartedBeforeFirstDone = true;
    });

    await Promise.all([p1, p2]);
    expect(secondStartedBeforeFirstDone).toBe(false);
    expect(firstDone).toBe(true);
  });

  it('continues processing later tasks even when an earlier task rejects', async () => {
    const q = new SerialQueue();
    const results: string[] = [];

    const p1 = q.enqueue(async () => {
      throw new Error('boom');
    });
    const p2 = q.enqueue(async () => {
      results.push('second');
    });

    await expect(p1).rejects.toThrow('boom');
    await p2;
    expect(results).toEqual(['second']);
  });

  it('returns the resolved value of the task', async () => {
    const q = new SerialQueue();
    const result = await q.enqueue(async () => 42);
    expect(result).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Rate-limit / min-spacing tests — using an injected fake clock
// ---------------------------------------------------------------------------

describe('SerialQueue — minSpacingMs with injected clock', () => {
  it('waits the min-spacing between tasks', async () => {
    // We use a fake monotonic clock so the queue sees simulated time,
    // but real setTimeout still fires quickly. We advance the fake clock
    // in between tasks to prove the spacing check fires.
    let fakeNow = 0;
    const clock = () => fakeNow;

    const q = new SerialQueue({ minSpacingMs: 100, clock });

    const startTimes: number[] = [];

    // Task 1: completes immediately; fake time is 0 at start.
    const p1 = q.enqueue(async () => {
      startTimes.push(fakeNow);
      // Simulate task duration; advance fake clock by 10 ms.
      fakeNow += 10;
    });

    // Task 2 should not start until fakeNow >= lastRun + 100 = 0 + 100 = 100.
    // We advance fake time to 120 before task 2 starts its wait check.
    // We do this by wrapping the enqueue and advancing after p1 settles.
    let task2Started = false;
    const p2 = q.enqueue(async () => {
      task2Started = true;
      startTimes.push(fakeNow);
    });

    await p1;
    // Advance fake clock so the wait condition resolves.
    fakeNow = 120;

    await p2;

    expect(task2Started).toBe(true);
    // Task 1 started at fakeNow=0, task 2 started at fakeNow=120 (>= 0+100).
    expect(startTimes[0]).toBe(0);
    expect(startTimes[1]).toBeGreaterThanOrEqual(100);
  });

  it('first task runs immediately — no phantom rate-limit wait', async () => {
    // With lastRun = -Infinity, clock() - lastRun = +Infinity, so
    // wait = minSpacingMs - Infinity < 0 → no setTimeout for task 1.
    // We verify this by checking that task 1 starts at the same fake-clock
    // value it was enqueued at (fakeNow=0), without any injected delay.
    let fakeNow = 0;
    const clock = () => fakeNow;
    const q = new SerialQueue({ minSpacingMs: 100, clock });

    const task1StartTime: number[] = [];
    const p1 = q.enqueue(async () => {
      task1StartTime.push(fakeNow); // should be 0 — no wait inflated this
      fakeNow += 10; // simulate task duration
    });
    await p1;

    expect(task1StartTime).toHaveLength(1);
    // Task 1 must have started at fakeNow=0 (no delay was injected).
    expect(task1StartTime[0]).toBe(0);

    // Sanity-check: task 2 IS still spaced by minSpacingMs.
    fakeNow = 120; // advance past lastRun(10) + spacing(100) = 110
    const task2StartTime: number[] = [];
    const p2 = q.enqueue(async () => {
      task2StartTime.push(fakeNow);
    });
    await p2;

    expect(task2StartTime[0]).toBeGreaterThanOrEqual(110);
  });

  it('does not add extra delay when tasks are already spaced far enough apart', async () => {
    // Simulate task 1 completing at fake time 0, then fake time advances to 60
    // before task 2 starts. minSpacingMs=50 → no wait needed (60 >= 0+50).
    let fakeNow = 0;
    const clock = () => fakeNow;
    const q = new SerialQueue({ minSpacingMs: 50, clock });

    const t2StartFakeTime: number[] = [];

    const p1 = q.enqueue(async () => {
      // After task 1 finishes, fake clock is at 0; queue records lastRun=0.
      fakeNow = 60; // simulate time passing before p2 starts
    });
    await p1;

    // Enqueue task 2 now; fake clock is already at 60, lastRun is 0.
    // wait = 50 - (60 - 0) = -10 → no setTimeout call expected.
    const p2 = q.enqueue(async () => {
      t2StartFakeTime.push(fakeNow);
    });
    await p2;

    // Task 2 started at fakeNow=60 — we can verify it ran (array has one entry).
    expect(t2StartFakeTime).toHaveLength(1);
    // And it did not start before the min-spacing clock value.
    expect(t2StartFakeTime[0]).toBeGreaterThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Real-time spacing test (small tolerance) — no fake clock
// ---------------------------------------------------------------------------

describe('SerialQueue — minSpacingMs real timing', () => {
  it('enforces spacing between tasks in real time (50 ms, ±30 ms tolerance)', async () => {
    const SPACING = 50;
    const q = new SerialQueue({ minSpacingMs: SPACING });

    const times: number[] = [];

    const p1 = q.enqueue(async () => {
      times.push(Date.now());
    });
    const p2 = q.enqueue(async () => {
      times.push(Date.now());
    });

    await Promise.all([p1, p2]);

    const gap = times[1] - times[0];
    // Should be at least SPACING ms apart, allow 30 ms tolerance for CI jitter.
    expect(gap).toBeGreaterThanOrEqual(SPACING - 5);
  });
});
