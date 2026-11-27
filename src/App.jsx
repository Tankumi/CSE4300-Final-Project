import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { compareApproaches, metrics, rules, SchedulingRound } from "./scheduler.js";
import { levels } from "./workload.js";

const storageKey = "scheduler-lab-levels-v1";
const dragType = "application/x-scheduler-task";

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Object.fromEntries(levels
      .filter(({ id }) => saved?.[id] === "clean" || saved?.[id] === "solved")
      .map(({ id }) => [id, saved[id]]));
  } catch {
    return {};
  }
}

function TimelineSegments({ segments }) {
  return segments.map(({ processId, start, end }) => (
    <div
      className="segment"
      data-task={processId ?? "idle"}
      style={{ gridColumn: `${start + 1} / ${end + 1}` }}
      title={`${processId ?? "Idle"} · ${start}–${end}`}
      key={start}
    >
      {processId ?? "Idle"}
    </div>
  ));
}

function Timeline({ round, onDropTask }) {
  const scroller = useRef(null);
  const ticks = [...round.processes].sort((a, b) => a.arrival - b.arrival)
    .reduce((end, { arrival, burst }) => Math.max(end, arrival) + burst, 0);
  const ranges = round.timeline.map(({ processId, start, end }) => `${processId ?? "Idle"} from ${start} to ${end}`);
  useLayoutEffect(() => {
    const view = scroller.current;
    if (round.time === 0) {
      view.scrollLeft = 0;
      return;
    }
    const tick = view.querySelector(".current");
    if (tick) {
      view.scrollLeft += Math.max(0, tick.getBoundingClientRect().right - view.getBoundingClientRect().right);
    }
  }, [round.time]);
  return (
    <div
      className="timeline-scroll"
      ref={scroller}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(dragType)) event.preventDefault();
      }}
      onDrop={(event) => {
        const id = event.dataTransfer.getData(dragType);
        if (id) {
          event.preventDefault();
          onDropTask(id);
        }
      }}
    >
      <div
        className="timeline"
        role="img"
        aria-label={ranges.length ? ranges.join(", ") : "Empty CPU timeline"}
        style={{ "--ticks": ticks }}
      >
        {Array.from({ length: ticks }, (_, tick) => (
          <div className={tick === round.time ? "tick current" : "tick"} style={{ gridColumn: tick + 1 }} key={tick}>
            <span>{tick}</span>
          </div>
        ))}
        <TimelineSegments segments={round.timeline} />
      </div>
    </div>
  );
}

function ApproachGuide() {
  return (
    <details className="approach-guide">
      <summary>Approach guide</summary>
      <dl>
        {Object.entries(rules).map(([method, rule]) => (
          <div key={method}>
            <dt>{method === rule.name ? method : `${method} · ${rule.name}`}</dt>
            <dd>{rule.description} {rule.tradeoff}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Comparison({ goal, outcomes, chosenMethod }) {
  return (
    <div className="comparison">
      <table>
        <caption>How each approach performed</caption>
        <thead>
          <tr>
            <th scope="col">Approach</th>
            {goal.metrics.map((metric) => <th scope="col" key={metric}>{metrics[metric].label}</th>)}
          </tr>
        </thead>
        <tbody>
          {outcomes.map((outcome) => (
            <tr key={outcome.method}>
              <th scope="row">
                {outcome.method}{outcome.method === chosenMethod && <small> Your pick</small>}
                {outcome.best && <small className="best-fit"> Best fit</small>}
              </th>
              {goal.metrics.map((metric) => (
                <td key={metric}>{metrics[metric].average ? outcome[metric].toFixed(2) : outcome[metric]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleComparison({ outcomes, chosenMethod }) {
  const ticks = Math.max(...outcomes.map(({ timeline }) => timeline.at(-1).end));
  return (
    <section className="schedule-comparison" aria-labelledby="schedules-heading">
      <h2 id="schedules-heading">CPU schedules</h2>
      <p>Each bar shows one scheduling decision. All four schedules use the same tick scale.</p>
      <div
        className="schedule-scroll"
        role="region"
        aria-label="Schedule comparison in ticks"
        tabIndex={0}
      >
        <div className="schedule-grid" style={{ "--ticks": ticks }}>
          <div className="schedule-axis" aria-hidden="true">
            {Array.from({ length: ticks }, (_, tick) => <span key={tick}>{tick}</span>)}
            <span className="schedule-end">{ticks}</span>
          </div>
          {outcomes.map(({ method, timeline, best }) => (
            <figure key={method}>
              <figcaption>
                <strong>{method}</strong>
                {method === chosenMethod && <span>Your pick</span>}
                {best && <span className="schedule-best">Best fit</span>}
              </figcaption>
              <div className="schedule-track" aria-hidden="true">
                <TimelineSegments segments={timeline} />
              </div>
              <ol className="schedule-order" aria-label={`${method} execution order`}>
                {timeline.map(({ processId, start, end }) => (
                  <li key={start}>{processId ?? "Idle"} {start}–{end}</li>
                ))}
              </ol>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LevelPuzzle({ level, onSolve, onNext }) {
  const [round, setRound] = useState(() => SchedulingRound.start(level));
  const [mistakes, setMistakes] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const board = useRef(null);
  const result = useRef(null);
  const moveFocus = useRef(false);
  const method = round.level.method ?? "";
  const rule = rules[method];
  const outcomes = useMemo(() => compareApproaches(level), [level]);
  const bestFit = outcomes.some((outcome) => outcome.method === method && outcome.best);
  const ready = round.ready;
  const available = new Set(ready.map(({ id }) => id));
  const tasks = round.processes;
  const score = round.score;

  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const target = round.finished ? result.current : board.current.querySelector("button:enabled");
    target?.focus({ preventScroll: !round.finished });
  }, [round]);

  function choose(id, fromKeyboard = false) {
    if (!method) return;
    const next = round.dispatch(id);
    if (next === round) {
      if (!round.finished && available.has(id)) {
        setMistakes(mistakes + 1);
        setFeedback({ kind: "wrong", id, text: `${id} doesn’t follow ${method} at tick ${round.time}. Try another task.` });
      }
      return;
    }
    const segment = next.timeline.at(-1);
    const label = id ? `Task ${id}` : "CPU idle";
    moveFocus.current = fromKeyboard;
    setFeedback({ kind: "right", text: `${label} · ticks ${segment.start}–${segment.end}${next.finished ? ". Puzzle solved!" : "."}` });
    setRound(next);
    if (next.finished) onSolve(bestFit && mistakes === 0 && !usedHint);
  }

  function showHint() {
    setUsedHint(true);
    setFeedback({ kind: "hint", id: round.expected, text: round.expected
      ? `Try task ${round.expected} at tick ${round.time}.`
      : "The ready queue is empty. Advance to the next arrival." });
  }

  function resetAttempt(nextMethod) {
    setRound(SchedulingRound.start({ ...level, method: nextMethod }));
    setMistakes(0);
    setUsedHint(false);
    setFeedback(null);
  }

  return (
    <article className="puzzle">
      <div className="puzzle-heading">
        <h1>{level.title}</h1>
        <button className="utility" onClick={() => resetAttempt(method)} type="button" disabled={!method}>Restart</button>
      </div>

      <div className="rule">
        <h2>{level.goal.title}</h2>
        <p>{level.goal.description}</p>
      </div>
      <div className="approach-picker">
        <label htmlFor="approach">Your approach</label>
        <select id="approach" value={method} onChange={(event) => resetAttempt(event.target.value)}>
          <option value="" disabled>Choose an approach</option>
          {Object.keys(rules).map((name) => (
            <option value={name} key={name}>{name === "Round Robin" ? `${name} · ${level.quantum}-tick slice` : name}</option>
          ))}
        </select>
        {rule && <p>{rule.description} Break other ties by arrival time, then task letter.</p>}
        {round.time > 0 && <p>Changing approaches restarts this attempt.</p>}
      </div>
      <ApproachGuide />

      <section className="cpu" aria-labelledby="cpu-heading">
        <div className="board-heading">
          <h2 id="cpu-heading">CPU timeline</h2>
          <div className="clock">Tick <strong>{round.time}</strong></div>
        </div>
        <Timeline round={round} onDropTask={choose} />
      </section>

      <div className="board-heading task-heading">
        <h2>Tasks</h2>
        <span>{round.completed.length} of {tasks.length} done</span>
      </div>
      <div ref={board}>
        <div className="task-columns" aria-hidden="true">
          <span>Task</span><span>Arrival</span><span>Left</span><span>Status</span>
        </div>
        <ul className="task-grid">
          {tasks.map((task) => {
            const status = task.result ? "Done" : available.has(task.id) ? "Ready" : "Upcoming";
            return (
              <li key={task.id}>
                <button
                  type="button"
                  className={`task ${feedback?.id === task.id ? feedback.kind : ""}`}
                  data-task={task.id}
                  disabled={!method || status !== "Ready"}
                  draggable={Boolean(method) && status === "Ready"}
                  onClick={(event) => choose(task.id, event.detail === 0)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(dragType, task.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <span className="task-name"><strong>{task.id}</strong>{task.name}</span>
                  <span className="task-number"><span className="sr-only">Arrives at tick </span>{task.arrival}</span>
                  <span className="task-number">{task.remaining}<span className="sr-only"> ticks left</span></span>
                  <span className="task-status" data-status={status}>{status}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {method && !round.finished && ready.length === 0 && (
          <button className="primary idle-button" type="button" onClick={(event) => choose(null, event.detail === 0)}>
            Wait until tick {round.upcoming[0].arrival}
          </button>
        )}
      </div>

      <div className="feedback-row">
        <p className={`feedback ${feedback?.kind ?? ""}`} role="status">
          {feedback?.text ?? (method
            ? "Pick a ready task or drag it onto the timeline."
            : "Review the tasks and choose an approach to start.")}
        </p>
        {method && !round.finished && <button className="utility hint-button" type="button" onClick={showHint}>Show hint</button>}
      </div>

      {round.finished && (
        <section className="results" tabIndex={-1} ref={result} aria-labelledby="results-heading">
          <div>
            <h2 id="results-heading">{bestFit && mistakes === 0 && !usedHint ? "Perfect solve" : "Schedule complete"}</h2>
            <p>{mistakes} {mistakes === 1 ? "mistake" : "mistakes"}{usedHint && " · Hint used"}</p>
            <p>{bestFit ? "Your approach met the goal best." : `${outcomes[0].method} did better on this goal.`}</p>
          </div>
          <dl>
            <div><dt>Avg. wait</dt><dd>{score.averageWait.toFixed(1)}</dd></div>
            <div><dt>Avg. turnaround</dt><dd>{score.averageTurnaround.toFixed(1)}</dd></div>
          </dl>
          {onNext && <button className="primary" type="button" onClick={onNext}>Next puzzle</button>}
          <Comparison goal={level.goal} outcomes={outcomes} chosenMethod={method} />
          <ScheduleComparison outcomes={outcomes} chosenMethod={method} />
        </section>
      )}
    </article>
  );
}

export default function App() {
  const [progress, setProgress] = useState(readProgress);
  const [index, setIndex] = useState(() => {
    const next = levels.findIndex(({ id }) => !progress[id]);
    return Math.max(next, 0);
  });
  const level = levels[index];
  const heading = useRef(null);
  const focusPuzzle = useRef(false);

  useLayoutEffect(() => {
    if (!focusPuzzle.current) return;
    focusPuzzle.current = false;
    heading.current.focus({ preventScroll: true });
  }, [index]);

  function selectLevel(nextIndex) {
    if (nextIndex === index) return;
    focusPuzzle.current = true;
    setIndex(nextIndex);
  }

  function saveSolve(clean) {
    const next = { ...progress, [level.id]: clean || progress[level.id] === "clean" ? "clean" : "solved" };
    setProgress(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The current session still tracks progress when browser storage is unavailable.
    }
  }

  const nextUnsolved = levels.findIndex(({ id }, position) => position !== index && !progress[id]);
  const nextIndex = index + 1 < levels.length ? index + 1 : nextUnsolved;

  return (
    <>
      <header className="site-header">
        <div className="shell header-content">
          <div className="brand">Scheduler Lab</div>
          <span>{Object.keys(progress).length} / {levels.length} solved</span>
        </div>
      </header>
      <main className="shell layout">
        <nav className="level-menu" aria-label="Puzzle levels">
          <h2>Puzzles</h2>
          <ol>
            {levels.map((item, position) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={index === position ? "step" : undefined}
                  aria-label={`Puzzle ${item.id}, ${item.title}${progress[item.id] === "clean" ? ", perfect solve" : progress[item.id] ? ", solved" : ""}`}
                  title={item.title}
                  onClick={() => selectLevel(position)}
                >
                  <span>{String(item.id).padStart(2, "0")}</span>
                  {progress[item.id] && <span className="solved" aria-hidden="true">✓</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="puzzle-area" ref={heading} tabIndex={-1} aria-label={`Puzzle ${level.id}, ${level.title}`}>
          <LevelPuzzle
            key={level.id}
            level={level}
            onSolve={saveSolve}
            onNext={nextIndex >= 0 ? () => selectLevel(nextIndex) : undefined}
          />
        </div>
      </main>
    </>
  );
}
