export const rules = {
  FIFO: {
    name: "First in, first out",
    description: "Pick the ready task that arrived first. It runs to completion.",
    tradeoff: "Good for preserving arrival order. Long jobs can hold up short ones.",
  },
  SJCF: {
    name: "Shortest job to completion first",
    description: "Pick the ready task with the shortest burst. Let it finish, even if a shorter task arrives.",
    tradeoff: "Gets short tasks out of the queue without interrupting running work.",
  },
  SRTCF: {
    name: "Shortest remaining time to completion first",
    description: "Pick the task with the least time left. Recheck at every arrival or completion. If tied, keep the task already running.",
    tradeoff: "Can finish tasks sooner on average. New short tasks can interrupt a running task.",
  },
  "Round Robin": {
    name: "Round Robin",
    description: "Run the first task in the queue for one slice. New arrivals join the queue before an unfinished task returns to the back.",
    tradeoff: "Gives waiting tasks a turn sooner. Switching between tasks can delay their completion.",
  },
};

export const metrics = {
  overtakes: { label: "Finish-order inversions" },
  interruptions: { label: "Interruptions" },
  averageTurnaround: { label: "Avg. turnaround", average: true },
  averageResponse: { label: "Avg. response", average: true },
};

function arrivalOrder(a, b) {
  return a.arrival - b.arrival || a.id.localeCompare(b.id);
}

export class SchedulingRound {
  constructor(level, processes, time = 0, timeline = [], queue = []) {
    this.level = level;
    this.processes = processes;
    this.time = time;
    this.timeline = timeline;
    this.queue = queue;
  }

  static start(level) {
    const processes = level.workload.map((process) => ({ ...process, remaining: process.burst, result: null }));
    const queue = processes.filter((process) => process.arrival === 0).sort(arrivalOrder).map(({ id }) => id);
    return new SchedulingRound(level, processes, 0, [], queue);
  }

  get ready() {
    const arrived = this.processes.filter((process) => process.remaining > 0 && process.arrival <= this.time);
    if (this.level.method === "Round Robin") {
      const byId = new Map(arrived.map((process) => [process.id, process]));
      return this.queue.map((id) => byId.get(id));
    }
    return arrived.sort(arrivalOrder);
  }

  get upcoming() {
    return this.processes.filter((process) => process.arrival > this.time).sort(arrivalOrder);
  }

  get completed() {
    return this.processes.filter((process) => process.result);
  }

  get finished() {
    return this.completed.length === this.processes.length;
  }

  get expected() {
    const ready = this.ready;
    if (this.level.method === "SJCF") {
      ready.sort((a, b) => a.burst - b.burst || arrivalOrder(a, b));
    }
    if (this.level.method === "SRTCF") {
      const previous = this.timeline.at(-1)?.processId;
      ready.sort((a, b) => a.remaining - b.remaining
        || Number(b.id === previous) - Number(a.id === previous)
        || arrivalOrder(a, b));
    }
    return ready[0]?.id ?? null;
  }

  dispatch(processId) {
    if (this.finished || processId !== this.expected) return this;

    const start = this.time;
    const nextArrival = this.upcoming[0]?.arrival ?? Infinity;
    const process = this.ready.find(({ id }) => id === processId);
    const limit = this.level.method === "Round Robin" ? this.level.quantum
      : this.level.method === "SRTCF" ? nextArrival - start : Infinity;
    const duration = process ? Math.min(process.remaining, limit) : nextArrival - start;
    const end = start + duration;
    let processes = this.processes;
    let queue = this.queue;

    if (process) {
      const remaining = process.remaining - duration;
      const turnaround = end - process.arrival;
      const firstStart = process.firstStart ?? start;
      const result = remaining === 0
        ? { finish: end, turnaround, wait: turnaround - process.burst, response: firstStart - process.arrival }
        : null;
      processes = processes.map((item) => item.id === processId ? { ...item, firstStart, remaining, result } : item);
    }

    if (this.level.method === "Round Robin") {
      const arrivals = this.upcoming.filter(({ arrival }) => arrival <= end).map(({ id }) => id);
      queue = [...(process ? queue.slice(1) : queue), ...arrivals];
      if (process && process.remaining > duration) queue.push(processId);
    }

    return new SchedulingRound(this.level, processes, end, [...this.timeline, { processId, start, end }], queue);
  }

  get score() {
    const completed = this.completed;
    const totals = completed.reduce(({ wait, turnaround, response }, { result }) => ({
      wait: wait + result.wait,
      turnaround: turnaround + result.turnaround,
      response: response + result.response,
    }), { wait: 0, turnaround: 0, response: 0 });
    return {
      averageWait: completed.length ? totals.wait / completed.length : null,
      averageTurnaround: completed.length ? totals.turnaround / completed.length : null,
      averageResponse: completed.length ? totals.response / completed.length : null,
    };
  }
}

export function compareApproaches(level) {
  const outcomes = Object.keys(rules).map((method) => {
    let round = SchedulingRound.start({ ...level, method });
    while (!round.finished) round = round.dispatch(round.expected);

    const arrivals = [...round.completed].sort(arrivalOrder);
    const finishById = new Map(arrivals.map(({ id, result }) => [id, result.finish]));
    const overtakes = arrivals.reduce((count, task, index) => count + arrivals.slice(index + 1)
      .filter((other) => other.result.finish < task.result.finish).length, 0);
    const interruptions = round.timeline.filter(({ processId, end }, index) =>
      processId !== null && end < finishById.get(processId)
      && round.timeline[index + 1]?.processId !== processId,
    ).length;
    return { method, timeline: round.timeline, overtakes, interruptions, ...round.score };
  });

  function rank(first, second) {
    for (const metric of level.goal.metrics) {
      const difference = first[metric] - second[metric];
      if (difference !== 0) return difference;
    }
    return 0;
  }

  outcomes.sort(rank);
  return outcomes.map((outcome) => ({ ...outcome, best: rank(outcome, outcomes[0]) === 0 }));
}
