# CSE4300-Final-Project

## Scheduler Lab

Scheduler Lab is a React app built with Vite. Use Node.js 20.19+ in the 20.x series, or Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` to generate a production build in `dist/`, or `npm run preview` to serve that build locally.

Scheduler Lab has eight replayable puzzles. Review the workload and its goal, open the **Approach guide** for help, then choose any scheduling approach. Fill the CPU timeline one move at a time by clicking or dragging a ready task. A move that breaks the chosen rule counts as a mistake and leaves the clock where it is. **Show hint** reveals the next move. When the CPU has no ready tasks, use **Wait until tick …** to record an idle interval. Changing approaches starts the timeline over.

- **FIFO** runs the earliest arriving ready task to completion.
- **SJCF** runs the ready task with the shortest burst to completion.
- **SRTCF** runs the ready task with the least time remaining until an arrival or completion. At equal remaining times the current task keeps the CPU.
- **Round Robin** runs the front of the queue for up to one time slice. Arrivals during or at the end of that slice join before the unfinished task goes to the back.

Break other ties by arrival time, then task letter. After each attempt, the game compares all four approaches on the same workload and ranks them using that puzzle’s goal. A perfect solve uses a best-fit approach with zero mistakes and zero hints. The browser saves completed levels and perfect solves.

Times are measured in ticks. Turnaround is completion minus arrival, wait is turnaround minus CPU burst, and response is first start minus arrival. An interruption counts when the CPU switches away from an unfinished task.

`src/App.jsx` contains the React game UI, `src/scheduler.js` implements the rules and scoring, and `src/workload.js` defines the levels.
