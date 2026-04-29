const TICK_MS = 1400;
const START_HOUR = 7;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const rooms = {
  kitchen: { label: "Kitchen", color: "#f2c66d" },
  bathroom: { label: "Bathroom", color: "#9fd2db" },
  bedroom: { label: "Bedroom", color: "#c7a4d9" },
  lounge: { label: "Lounge", color: "#e69b75" },
  yard: { label: "Yard", color: "#9fcf79" }
};

const objects = [
  { id: "fridge", icon: "🧊", room: "kitchen", x: 2, y: 1, action: "Cook meal", need: "hunger", amount: 34, fundsDelta: -18, log: "Nomsa cooks a quick plate of food." },
  { id: "table", icon: "🍽️", room: "kitchen", x: 3, y: 2, action: "Eat", need: "hunger", amount: 24, fundsDelta: 0, log: "Nomsa enjoys a calm meal at the table." },
  { id: "shower", icon: "🚿", room: "bathroom", x: 7, y: 1, action: "Shower", need: "hygiene", amount: 38, fundsDelta: 0, log: "A refreshing shower restores hygiene." },
  { id: "toilet", icon: "🚽", room: "bathroom", x: 8, y: 2, action: "Use toilet", need: "bladder", amount: 45, fundsDelta: 0, log: "Nomsa takes care of bladder needs." },
  { id: "bed", icon: "🛏️", room: "bedroom", x: 2, y: 7, action: "Sleep", need: "energy", amount: 48, fundsDelta: 0, log: "Nomsa gets some much-needed rest." },
  { id: "sofa", icon: "🛋️", room: "lounge", x: 6, y: 5, action: "Relax", need: "comfort", amount: 30, fundsDelta: 0, log: "The sofa brings comfort back up." },
  { id: "stereo", icon: "📻", room: "lounge", x: 7, y: 6, action: "Dance", need: "fun", amount: 34, fundsDelta: 0, log: "Music fills the house and fun rises." },
  { id: "phone", icon: "☎️", room: "lounge", x: 5, y: 6, action: "Call friend", need: "social", amount: 32, fundsDelta: 0, log: "A chat with a friend improves social mood." },
  { id: "easel", icon: "🎨", room: "yard", x: 8, y: 8, action: "Paint", need: "fun", amount: 18, fundsDelta: 42, log: "Nomsa sells a small painting for household funds." }
];

const floorPlan = [
  "WWWWWWWWWW",
  "WKKKKWBBBW",
  "WKKKKWBBBW",
  "WKKKKWBBBW",
  "WWWWDWWDWW",
  "WLLLLLLLLW",
  "WLLLLLLLLW",
  "WDDDWWLLLW",
  "WYYYWWLLLW",
  "WWWWWWWWWW"
];

const roomCodes = {
  K: "kitchen",
  B: "bathroom",
  D: "bedroom",
  L: "lounge",
  Y: "yard"
};

const state = {
  paused: false,
  day: 0,
  minutes: START_HOUR * 60,
  funds: 850,
  activeObjectId: "table",
  simPosition: { x: 3, y: 2 },
  needs: {
    hunger: 78,
    energy: 68,
    hygiene: 82,
    bladder: 73,
    fun: 66,
    social: 58,
    comfort: 72
  }
};

const needMeta = {
  hunger: "Food",
  energy: "Rest",
  hygiene: "Cleanliness",
  bladder: "Bladder",
  fun: "Fun",
  social: "Social",
  comfort: "Comfort"
};

const decayRates = {
  hunger: 2.2,
  energy: 1.7,
  hygiene: 1.6,
  bladder: 2.4,
  fun: 1.4,
  social: 1.2,
  comfort: 1.1
};

const houseGrid = document.querySelector("#houseGrid");
const needsList = document.querySelector("#needsList");
const needTemplate = document.querySelector("#needTemplate");
const actionButtons = document.querySelector("#actionButtons");
const eventLog = document.querySelector("#eventLog");
const dayLabel = document.querySelector("#dayLabel");
const timeLabel = document.querySelector("#timeLabel");
const fundsValue = document.querySelector("#fundsValue");
const pauseButton = document.querySelector("#pauseButton");
const simMood = document.querySelector("#simMood");

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function getNeedColor(value) {
  if (value < 28) return "var(--danger)";
  if (value < 55) return "#d49a2f";
  return "var(--accent)";
}

function getMood() {
  const values = Object.values(state.needs);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const lowestNeed = Object.entries(state.needs).sort((a, b) => a[1] - b[1])[0];

  if (lowestNeed[1] < 20) return `Desperate for ${needMeta[lowestNeed[0]].toLowerCase()}`;
  if (average > 75) return "Thriving at home";
  if (average > 55) return "Feeling balanced";
  if (average > 35) return "Needs some attention";
  return "Having a rough day";
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = `${formatTime(state.minutes)} — ${message}`;
  eventLog.prepend(item);

  while (eventLog.children.length > 8) {
    eventLog.lastElementChild.remove();
  }
}

function renderHouse() {
  houseGrid.innerHTML = "";

  floorPlan.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.setAttribute("aria-label", "Empty floor tile");

      if (code === "W") {
        tile.classList.add("wall");
        tile.disabled = true;
        tile.setAttribute("aria-label", "Wall");
      } else {
        const roomName = roomCodes[code];
        tile.classList.add(`room-${roomName}`);
        tile.style.setProperty("--room-color", rooms[roomName].color);
        tile.setAttribute("aria-label", `${rooms[roomName].label} floor tile`);
      }

      const object = objects.find((item) => item.x === x && item.y === y);
      if (object) {
        tile.classList.add("clickable");
        tile.dataset.objectId = object.id;
        tile.innerHTML = `<span aria-hidden="true">${object.icon}</span>`;
        tile.setAttribute("aria-label", `${object.action} at ${rooms[object.room].label}`);
        tile.disabled = false;
      }

      if (state.simPosition.x === x && state.simPosition.y === y) {
        const sim = document.createElement("i");
        sim.className = "sim-token";
        sim.setAttribute("aria-label", "Nomsa is here");
        tile.append(sim);
      }

      houseGrid.append(tile);
    });
  });
}

function renderNeeds() {
  needsList.innerHTML = "";

  Object.entries(state.needs).forEach(([key, value]) => {
    const row = needTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector("strong").textContent = needMeta[key];
    row.querySelector("span").textContent = `${value}%`;
    row.querySelector("i").style.setProperty("--value", `${value}%`);
    row.querySelector("i").style.setProperty("--meter-color", getNeedColor(value));
    needsList.append(row);
  });
}


function canPerformAction(object) {
  return object.fundsDelta >= 0 || state.funds >= Math.abs(object.fundsDelta);
}

function renderActions() {
  actionButtons.innerHTML = "";

  objects.forEach((object) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = object.action;
    button.dataset.objectId = object.id;
    button.disabled = !canPerformAction(object);
    actionButtons.append(button);
  });
}

function renderHud() {
  dayLabel.textContent = DAYS[state.day % DAYS.length];
  timeLabel.textContent = formatTime(state.minutes);
  fundsValue.textContent = state.funds;
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
  simMood.textContent = getMood();
}

function render() {
  renderHouse();
  renderNeeds();
  renderActions();
  renderHud();
}

function advanceTime(amount) {
  state.minutes += amount;

  if (state.minutes >= 24 * 60) {
    state.minutes %= 24 * 60;
    state.day += 1;
    state.funds += 65;
    addLog("A new day starts with a modest household stipend.");
  }
}

function decayNeeds() {
  Object.entries(decayRates).forEach(([need, rate]) => {
    state.needs[need] = clamp(state.needs[need] - rate);
  });
}

function performAction(objectId) {
  const object = objects.find((item) => item.id === objectId);
  if (!object || !canPerformAction(object)) return;

  state.activeObjectId = object.id;
  state.simPosition = { x: object.x, y: object.y };
  state.needs[object.need] = clamp(state.needs[object.need] + object.amount);
  state.funds += object.fundsDelta;
  advanceTime(object.action === "Sleep" ? 180 : 35);
  addLog(object.log);
  render();
}

function tick() {
  if (state.paused) return;

  decayNeeds();
  advanceTime(20);
  render();
}

houseGrid.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-object-id]");
  if (tile) performAction(tile.dataset.objectId);
});

houseGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  const tile = event.target.closest("[data-object-id]");
  if (tile) performAction(tile.dataset.objectId);
});

actionButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-object-id]");
  if (button) performAction(button.dataset.objectId);
});

pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  renderHud();
});

addLog("Nomsa moves into a small starter home.");
render();
setInterval(tick, TICK_MS);
