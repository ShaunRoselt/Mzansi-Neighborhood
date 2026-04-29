const TICK_MS = 900;
const TILE_W = 88;
const TILE_H = 44;
const ORIGIN_X = 500;
const ORIGIN_Y = 52;
const DAILY_STIPEND = 110;
const MAX_LOG_ENTRIES = 7;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NEED_ORDER = ["hunger", "comfort", "hygiene", "bladder", "energy", "fun", "social", "room"];

const rooms = {
  K: { name: "Kitchen", color: "#d6a85d" },
  B: { name: "Bathroom", color: "#8fc5d4" },
  D: { name: "Bedroom", color: "#b594cc" },
  L: { name: "Lounge", color: "#c98258" },
  Y: { name: "Garden", color: "#88ad62" }
};

const lot = [
  "YYYYYYYYYYYY",
  "YKKKKLLLYYYY",
  "YKKKKLLLYYYY",
  "YKKKKLLLYYYY",
  "YKKKKLLLYYYY",
  "YDDDBBBYYYYY",
  "YDDDBBBYYYYY",
  "YDDDBBBYYYYY",
  "YDDDLLLYYYYY",
  "YDDDLLLYYYYY"
];

const catalog = [
  { id: "lamp", label: "Standing Lamp", cost: 85, x: 8, y: 8, room: "L", icon: "lamp", interactions: [{ label: "Admire lamp", duration: 20, effects: { room: 10, fun: 3 }, log: "enjoys the warm lamplight." }] },
  { id: "bookcase", label: "Bookcase", cost: 210, x: 7, y: 3, room: "L", icon: "books", interactions: [{ label: "Read", duration: 45, effects: { fun: 17, comfort: -5 }, log: "gets absorbed in a paperback novel." }] },
  { id: "garden-chair", label: "Garden Chair", cost: 130, x: 9, y: 6, room: "Y", icon: "chair", interactions: [{ label: "Sit outside", duration: 35, effects: { comfort: 18, fun: 6, room: 8 }, log: "takes in the neighborhood air." }] }
];

let objects = [
  { id: "fridge", label: "Fridge", x: 1, y: 1, room: "K", icon: "fridge", interactions: [{ label: "Make dinner", duration: 45, cost: 22, effects: { hunger: 38, room: -2 }, log: "makes a hot plate of food." }, { label: "Snack", duration: 20, cost: 8, effects: { hunger: 16 }, log: "grabs a quick snack." }] },
  { id: "table", label: "Dining Table", x: 3, y: 3, room: "K", icon: "table", interactions: [{ label: "Eat together", duration: 40, effects: { hunger: 20, social: 12, comfort: 4 }, log: "sits down for a proper meal." }] },
  { id: "shower", label: "Shower", x: 5, y: 5, room: "B", icon: "shower", interactions: [{ label: "Take shower", duration: 35, effects: { hygiene: 42, comfort: 5 }, log: "washes away the day." }] },
  { id: "toilet", label: "Toilet", x: 6, y: 6, room: "B", icon: "toilet", interactions: [{ label: "Use toilet", duration: 20, effects: { bladder: 55, hygiene: -5 }, log: "takes care of urgent business." }] },
  { id: "bed", label: "Bed", x: 1, y: 6, room: "D", icon: "bed", interactions: [{ label: "Sleep", duration: 180, effects: { energy: 58, comfort: 18, hunger: -18, bladder: -14 }, log: "sleeps under a patchwork blanket." }, { label: "Nap", duration: 75, effects: { energy: 26, comfort: 10 }, log: "takes a short nap." }] },
  { id: "mirror", label: "Mirror", x: 3, y: 6, room: "D", icon: "mirror", interactions: [{ label: "Practice speech", duration: 45, effects: { social: 12, fun: 7, hygiene: -2 }, log: "practices a confident introduction." }] },
  { id: "sofa", label: "Sofa", x: 6, y: 2, room: "L", icon: "sofa", interactions: [{ label: "Watch TV", duration: 55, effects: { fun: 30, comfort: 14, energy: -4 }, log: "laughs at an old sitcom." }, { label: "Sit", duration: 25, effects: { comfort: 20, energy: 4 }, log: "sinks into the sofa cushions." }] },
  { id: "phone", label: "Telephone", x: 7, y: 1, room: "L", icon: "phone", interactions: [{ label: "Call neighbor", duration: 35, effects: { social: 28, fun: 5 }, log: "catches up with a neighbor." }] },
  { id: "easel", label: "Easel", x: 9, y: 4, room: "Y", icon: "easel", interactions: [{ label: "Paint", duration: 70, income: 70, effects: { fun: 18, energy: -12, hygiene: -6 }, log: "sells a small painting." }] },
  { id: "trash", label: "Bin", x: 10, y: 3, room: "Y", icon: "trash", interactions: [{ label: "Clean up", duration: 30, effects: { room: 22, hygiene: -8 }, log: "tidies the lot and improves the room score." }] }
];

const state = {
  paused: false,
  speed: 1,
  autonomy: true,
  wallsCutaway: true,
  day: 0,
  minutes: 7 * 60,
  funds: 1200,
  selectedSimId: "nomsa",
  sims: [
    createSim("nomsa", "Nomsa Dlamini", 2, 3, "#2c8a65"),
    createSim("thabo", "Thabo Mokoena", 6, 3, "#8c4f9f")
  ],
  log: []
};

const isoStage = document.querySelector("#isoStage");
const householdList = document.querySelector("#householdList");
const selectedSimName = document.querySelector("#selectedSimName");
const selectedSimMood = document.querySelector("#selectedSimMood");
const needsPanel = document.querySelector("#needsPanel");
const needTemplate = document.querySelector("#needTemplate");
const queueList = document.querySelector("#queueList");
const catalogList = document.querySelector("#catalogList");
const dayLabel = document.querySelector("#dayLabel");
const timeLabel = document.querySelector("#timeLabel");
const fundsValue = document.querySelector("#fundsValue");
const pauseButton = document.querySelector("#pauseButton");
const wallsButton = document.querySelector("#wallsButton");
const autonomyButton = document.querySelector("#autonomyButton");
const eventLog = document.querySelector("#eventLog");
const speedButtons = document.querySelectorAll(".speed-button");

function createSim(id, name, x, y, color) {
  if (!isWalkable(x, y)) {
    throw new Error(`Invalid starting position for ${name}: ${x},${y}`);
  }

  return {
    id,
    name,
    x,
    y,
    color,
    queue: [],
    active: null,
    needs: {
      hunger: 76,
      comfort: 68,
      hygiene: 74,
      bladder: 70,
      energy: 72,
      fun: 60,
      social: 62,
      room: 58
    }
  };
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function isoPosition(x, y, z = 0) {
  return {
    left: ORIGIN_X + (x - y) * (TILE_W / 2),
    top: ORIGIN_Y + (x + y) * (TILE_H / 2) - z
  };
}

function getSelectedSim() {
  return state.sims.find((sim) => sim.id === state.selectedSimId) || state.sims[0];
}

function getObject(id) {
  return objects.find((object) => object.id === id);
}

function getInteraction(objectId, label) {
  const object = getObject(objectId);
  return object?.interactions.find((interaction) => interaction.label === label);
}

function addLog(message) {
  state.log.unshift(`${formatTime(state.minutes)} — ${message}`);
  state.log = state.log.slice(0, MAX_LOG_ENTRIES);
}

function roomAt(x, y) {
  return rooms[lot[y]?.[x]] || rooms.Y;
}

function isWalkable(x, y) {
  return Boolean(lot[y]?.[x]);
}

function lowestNeed(sim) {
  return Object.entries(sim.needs).sort((a, b) => a[1] - b[1])[0];
}

function moodFor(sim) {
  const [need, value] = lowestNeed(sim);
  if (value < 18) return `Desperate for ${need}`;
  if (value < 35) return `Worried about ${need}`;
  const average = Object.values(sim.needs).reduce((sum, value) => sum + value, 0) / NEED_ORDER.length;
  if (average > 78) return "Living their best day";
  if (average > 58) return "Comfortably settled";
  return "Needs direction";
}

function needColor(value) {
  if (value < 25) return "#cf3f2f";
  if (value < 52) return "#d08a23";
  return "#2e9f62";
}

function canAfford(interaction) {
  return !interaction.cost || state.funds >= interaction.cost;
}

function formatMoneyNote(interaction) {
  if (interaction.income) return ` (+§${interaction.income})`;
  if (interaction.cost) return ` (-§${interaction.cost})`;
  return "";
}

function queueInteraction(sim, objectId, interaction) {
  if (!interaction || !canAfford(interaction)) return;
  sim.queue.push({ objectId, label: interaction.label });
  addLog(`${sim.name} queues “${interaction.label}”.`);
  render();
}

function buyItem(itemId) {
  const item = catalog.find((entry) => entry.id === itemId);
  if (!item || objects.some((object) => object.id === item.id) || state.funds < item.cost) return;

  state.funds -= item.cost;
  objects.push(structuredClone(item));
  addLog(`Bought ${item.label} for §${item.cost}.`);
  render();
}

function startNextAction(sim) {
  if (sim.active || sim.queue.length === 0) return;
  const queued = sim.queue.shift();
  const object = getObject(queued.objectId);
  const interaction = getInteraction(queued.objectId, queued.label);
  if (!object || !interaction || !canAfford(interaction)) return;

  sim.active = {
    objectId: object.id,
    label: interaction.label,
    duration: interaction.duration,
    remaining: interaction.duration,
    phase: "routing"
  };
}

function moveTowardsObject(sim, object) {
  if (sim.x === object.x && sim.y === object.y) {
    sim.active.phase = "using";
    return;
  }

  const dx = Math.sign(object.x - sim.x);
  const dy = Math.sign(object.y - sim.y);
  const horizontalStep = { x: sim.x + dx, y: sim.y };
  const verticalStep = { x: sim.x, y: sim.y + dy };
  const preferHorizontal = Math.abs(object.x - sim.x) >= Math.abs(object.y - sim.y);
  const options = preferHorizontal ? [horizontalStep, verticalStep] : [verticalStep, horizontalStep];
  const next = options.find((step) => isWalkable(step.x, step.y));

  if (next) {
    sim.x = next.x;
    sim.y = next.y;
  }
}

function finishAction(sim, interaction) {
  if (interaction.cost) state.funds -= interaction.cost;
  if (interaction.income) state.funds += interaction.income;

  Object.entries(interaction.effects || {}).forEach(([need, amount]) => {
    sim.needs[need] = clamp(sim.needs[need] + amount);
  });

  addLog(`${sim.name} ${interaction.log}${formatMoneyNote(interaction)}`);
  sim.active = null;
}

function decayNeeds(sim, amount) {
  const decay = {
    hunger: 0.055,
    comfort: 0.035,
    hygiene: 0.045,
    bladder: 0.06,
    energy: 0.04,
    fun: 0.038,
    social: 0.032,
    room: 0.026
  };

  Object.entries(decay).forEach(([need, rate]) => {
    sim.needs[need] = clamp(sim.needs[need] - rate * amount);
  });
}

function chooseAutonomy(sim) {
  if (!state.autonomy || sim.active || sim.queue.length > 0) return;
  const [need, value] = lowestNeed(sim);
  if (value > 34) return;

  const best = objects
    .flatMap((object) => object.interactions.map((interaction) => ({ object, interaction, gain: interaction.effects?.[need] || 0 })))
    .filter((candidate) => candidate.gain > 0 && canAfford(candidate.interaction))
    .sort((a, b) => b.gain - a.gain)[0];

  if (best) queueInteraction(sim, best.object.id, best.interaction);
}

function advanceSimulation(minutes) {
  state.minutes += minutes;
  if (state.minutes >= 24 * 60) {
    state.minutes %= 24 * 60;
    state.day += 1;
    state.funds += DAILY_STIPEND;
    addLog(`A new morning starts with household stipend income (+§${DAILY_STIPEND}).`);
  }

  state.sims.forEach((sim) => {
    decayNeeds(sim, minutes);
    chooseAutonomy(sim);
    startNextAction(sim);

    if (!sim.active) return;
    const object = getObject(sim.active.objectId);
    const interaction = getInteraction(sim.active.objectId, sim.active.label);
    if (!object || !interaction) {
      sim.active = null;
      return;
    }

    if (sim.active.phase === "routing") moveTowardsObject(sim, object);
    else {
      sim.active.remaining -= minutes;
      if (sim.active.remaining <= 0) finishAction(sim, interaction);
    }
  });
}

function renderStage() {
  isoStage.innerHTML = "";

  lot.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const room = rooms[code];
      const position = isoPosition(x, y);
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `iso-tile room-${code}`;
      tile.style.left = `${position.left}px`;
      tile.style.top = `${position.top}px`;
      tile.style.setProperty("--room-color", room.color);
      tile.setAttribute("aria-label", `${room.name} floor tile`);
      isoStage.append(tile);
    });
  });

  if (!state.wallsCutaway) {
    lot.forEach((row, y) => {
      [...row].forEach((code, x) => {
        if (code === "Y") return;
        const northEdge = y === 0 || lot[y - 1][x] !== code;
        const westEdge = x === 0 || lot[y][x - 1] !== code;
        if (northEdge) renderWall(x, y, "north");
        if (westEdge) renderWall(x, y, "west");
      });
    });
  }

  objects.forEach(renderObject);
  state.sims.forEach(renderSim);
}

function renderWall(x, y, direction) {
  const position = isoPosition(x, y, 24);
  const wall = document.createElement("div");
  wall.className = `wall wall-${direction}`;
  wall.style.left = `${position.left}px`;
  wall.style.top = `${position.top}px`;
  isoStage.append(wall);
}

function renderObject(object) {
  const position = isoPosition(object.x, object.y, 16);
  const node = document.createElement("article");
  node.className = `object-card object-${object.icon}`;
  node.style.left = `${position.left}px`;
  node.style.top = `${position.top}px`;
  node.innerHTML = `<strong>${object.label}</strong><div class="interaction-menu"></div>`;

  const menu = node.querySelector(".interaction-menu");
  object.interactions.forEach((interaction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.objectId = object.id;
    button.dataset.interaction = interaction.label;
    button.disabled = !canAfford(interaction);
    button.textContent = interaction.cost ? `${interaction.label} §${interaction.cost}` : interaction.label;
    menu.append(button);
  });

  isoStage.append(node);
}

function renderSim(sim) {
  const position = isoPosition(sim.x, sim.y, 46);
  const node = document.createElement("button");
  node.type = "button";
  node.className = `sim ${sim.id === state.selectedSimId ? "selected" : ""}`;
  node.style.left = `${position.left}px`;
  node.style.top = `${position.top}px`;
  node.style.setProperty("--sim-color", sim.color);
  node.dataset.simId = sim.id;
  node.innerHTML = `<span>${sim.name.split(" ")[0]}</span>`;
  node.setAttribute("aria-label", `Select ${sim.name}, currently in ${roomAt(sim.x, sim.y).name}`);
  isoStage.append(node);
}

function renderHousehold() {
  householdList.innerHTML = "";
  state.sims.forEach((sim) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = sim.id === state.selectedSimId ? "active" : "";
    button.dataset.simId = sim.id;
    button.innerHTML = `<span class="mini-head" style="--sim-color:${sim.color}"></span><strong>${sim.name}</strong><small>${moodFor(sim)}</small>`;
    householdList.append(button);
  });
}

function renderNeeds() {
  const sim = getSelectedSim();
  selectedSimName.textContent = sim.name;
  selectedSimMood.textContent = moodFor(sim);
  needsPanel.innerHTML = "";

  NEED_ORDER.forEach((need) => {
    const row = needTemplate.content.firstElementChild.cloneNode(true);
    const value = sim.needs[need];
    row.querySelector("span").textContent = need[0].toUpperCase() + need.slice(1);
    row.querySelector("strong").textContent = value;
    row.querySelector("i").style.width = `${value}%`;
    row.querySelector("i").style.backgroundColor = needColor(value);
    needsPanel.append(row);
  });
}

function renderQueue() {
  const sim = getSelectedSim();
  queueList.innerHTML = "";
  const active = sim.active ? [`${sim.active.phase === "routing" ? "Go to" : "Do"} ${sim.active.label}`] : [];
  const queued = sim.queue.map((item) => item.label);
  [...active, ...queued].forEach((label) => {
    const li = document.createElement("li");
    li.textContent = label;
    queueList.append(li);
  });

  if (queueList.children.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No queued actions";
    queueList.append(li);
  }
}

function renderCatalog() {
  catalogList.innerHTML = "";
  catalog.forEach((item) => {
    const owned = objects.some((object) => object.id === item.id);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.itemId = item.id;
    button.disabled = owned || state.funds < item.cost;
    button.innerHTML = `<strong>${item.label}</strong><span>${owned ? "Owned" : `§${item.cost}`}</span>`;
    catalogList.append(button);
  });
}

function renderHud() {
  dayLabel.textContent = DAYS[state.day % DAYS.length];
  timeLabel.textContent = formatTime(state.minutes);
  fundsValue.textContent = state.funds;
  pauseButton.classList.toggle("active", state.paused);
  wallsButton.textContent = `Walls: ${state.wallsCutaway ? "Cutaway" : "Up"}`;
  autonomyButton.textContent = `Autonomy: ${state.autonomy ? "On" : "Off"}`;
  eventLog.innerHTML = "";
  state.log.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    eventLog.append(li);
  });
}

function render() {
  renderStage();
  renderHousehold();
  renderNeeds();
  renderQueue();
  renderCatalog();
  renderHud();
}

isoStage.addEventListener("click", (event) => {
  const simButton = event.target.closest("[data-sim-id]");
  if (simButton) {
    state.selectedSimId = simButton.dataset.simId;
    render();
    return;
  }

  const action = event.target.closest("[data-object-id][data-interaction]");
  if (!action) return;
  const object = getObject(action.dataset.objectId);
  const interaction = object?.interactions.find((item) => item.label === action.dataset.interaction);
  queueInteraction(getSelectedSim(), action.dataset.objectId, interaction);
});

householdList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sim-id]");
  if (!button) return;
  state.selectedSimId = button.dataset.simId;
  render();
});

catalogList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-item-id]");
  if (button) buyItem(button.dataset.itemId);
});

pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  renderHud();
});

wallsButton.addEventListener("click", () => {
  state.wallsCutaway = !state.wallsCutaway;
  render();
});

autonomyButton.addEventListener("click", () => {
  state.autonomy = !state.autonomy;
  renderHud();
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.speed = Number(button.dataset.speed);
    speedButtons.forEach((speedButton) => speedButton.classList.remove("active"));
    button.classList.add("active");
  });
});

addLog(`${state.sims.map((sim) => sim.name.split(" ")[0]).join(" and ")} arrive at their starter home.`);
render();

setInterval(() => {
  if (state.paused) return;
  advanceSimulation(5 * state.speed);
  render();
}, TICK_MS);
