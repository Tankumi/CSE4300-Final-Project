const names = ["Render", "Input", "Decode", "Sync", "Alert"];

const goals = {
  order: {
    title: "Preserve arrival order",
    description: "Minimize how often a later task finishes before an earlier one. Break ties with fewer interruptions.",
    metrics: ["overtakes", "interruptions"],
  },
  uninterrupted: {
    title: "Finish quickly without interruptions",
    description: "Favor approaches with the fewest interruptions, then the lowest average time from arrival to completion.",
    metrics: ["interruptions", "averageTurnaround"],
  },
  turnaround: {
    title: "Minimize average turnaround",
    description: "Minimize the average time from arrival to completion. Interruptions are allowed.",
    metrics: ["averageTurnaround"],
  },
  response: {
    title: "Give every task a quick first turn",
    description: "Minimize the average time each task waits before it first gets the CPU.",
    metrics: ["averageResponse"],
  },
};

function level(id, title, goal, jobs, quantum = 2) {
  return {
    id, title, goal: goals[goal], quantum,
    workload: jobs.map(([arrival, burst], index) => ({
      id: String.fromCharCode(65 + index),
      name: names[index],
      arrival,
      burst,
    })),
  };
}

export const levels = [
  level(1, "First in line", "order", [[0, 4], [1, 2], [2, 1]]),
  level(2, "Rush hour", "order", [[0, 3], [0, 2], [2, 1], [8, 2]]),
  level(3, "Quick wins", "uninterrupted", [[0, 5], [0, 3], [1, 1], [3, 2]]),
  level(4, "Short list", "uninterrupted", [[0, 5], [0, 4], [1, 2], [3, 2], [5, 1]]),
  level(5, "Change of plans", "turnaround", [[0, 6], [2, 2], [3, 1]]),
  level(6, "Interruptions", "turnaround", [[0, 7], [1, 4], [2, 1], [5, 2], [7, 1]]),
  level(7, "Take turns", "response", [[0, 5], [0, 4], [0, 3]], 2),
  level(8, "Back of the line", "response", [[0, 6], [1, 5], [3, 4], [6, 4], [8, 3]], 3),
];
