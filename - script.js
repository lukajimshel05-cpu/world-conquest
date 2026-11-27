
const gameCanvas = document.getElementById("map");

if (!gameCanvas) {
  throw new Error("Canvas with id 'map' was not found!");
}

const ctx = gameCanvas.getContext("2d");

const W = 100;
const H = 60;
const SIZE = 10;

const colors = {
  sea: "#183452",
  neutral: "#778568",
  player: "#287dcc",
  red: "#d64b4b",
  green: "#36a66b",
  purple: "#9660c9",
  orange: "#d58a35",
  pink: "#d65c9d"
};

const botColors = [
  colors.red,
  colors.green,
  colors.purple,
  colors.orange,
  colors.pink
];

let map = [];
let cities = [];
let factories = [];
let ships = [];
let bots = [];

let gameStarted = false;
let startedNation = false;
let aiDifficulty = "medium";

let player = {
  army: 100,
  gold: 500
};

let selectedShipTarget = null;
let buildingMode = null;

let zoom = 1;
let offsetX = 0;
let offsetY = 0;

let dragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

const lobby = document.getElementById("lobby");
const difficultyMenu = document.getElementById("difficultyMenu");
const lobbyMessage = document.getElementById("lobbyMessage");
const gameUI = document.getElementById("gameUI");
const bottomBar = document.getElementById("bottomBar");

function getElement(id) {
  const el = document.getElementById(id);

  if (!el) {
    console.error("Missing HTML element:", id);
  }

  return el;
}

function connectButton(id, action) {
  const button = getElement(id);

  if (button) {
    button.addEventListener("click", action);
  }
}

// CANVAS

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  gameCanvas.width = window.innerWidth * dpr;
  gameCanvas.height = window.innerHeight * dpr;

  gameCanvas.style.width = window.innerWidth + "px";
  gameCanvas.style.height = window.innerHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setMessage(message) {
  const el = getElement("message");

  if (el) {
    el.textContent = message;
  }
}

// MENU

connectButton("singleplayer", () => {
  if (difficultyMenu) {
    difficultyMenu.style.display = "flex";
  }

  if (lobbyMessage) {
    lobbyMessage.textContent = "";
  }

  const heading = lobby?.querySelector(".lobby-panel > h2");

  if (heading) {
    heading.textContent = "SELECT DIFFICULTY";
  }
});

connectButton("back", () => {
  if (difficultyMenu) {
    difficultyMenu.style.display = "none";
  }

  const heading = lobby?.querySelector(".lobby-panel > h2");

  if (heading) {
    heading.textContent = "MAIN MENU";
  }
});

connectButton("easy", () => startGame("easy"));
connectButton("medium", () => startGame("medium"));
connectButton("hard", () => startGame("hard"));

connectButton("multiplayer", () => {
  const button = getElement("multiplayer");

  if (!button || !lobbyMessage) return;

  button.style.display = "none";
  lobbyMessage.textContent = "COMING SOON...";

  setTimeout(() => {
    lobbyMessage.textContent = "";
    button.style.display = "";
  }, 3000);
});

connectButton("settings", () => {
  if (!lobbyMessage) return;

  lobbyMessage.textContent = "SETTINGS - COMING SOON...";

  setTimeout(() => {
    lobbyMessage.textContent = "";
  }, 3000);
});

// START GAME

function startGame(difficulty) {
  aiDifficulty = difficulty;

  gameStarted = true;
  startedNation = false;

  player = {
    army: 100,
    gold: 500
  };

  selectedShipTarget = null;
  buildingMode = null;

  if (lobby) lobby.style.display = "none";
  if (difficultyMenu) difficultyMenu.style.display = "none";
  if (gameUI) gameUI.style.display = "block";
  if (bottomBar) bottomBar.style.display = "flex";

  generateMap();
  createBots();
  centerMap();
  updateStats();

  setMessage("CHOOSE AN UNCLAIMED LAND TILE TO START!");
}

// STATS

function updateStats() {
  const armyEl = getElement("army");
  const goldEl = getElement("gold");

  if (armyEl) armyEl.textContent = player.army;
  if (goldEl) goldEl.textContent = player.gold;

  updateBottomBar();
}

function updateBottomBar() {
  const bottomGold = getElement("bottomGold");
  const bottomArmy = getElement("bottomArmy");
  const cityCount = getElement("cityCount");
  const factoryCount = getElement("factoryCount");

  if (bottomGold) bottomGold.textContent = player.gold;
  if (bottomArmy) bottomArmy.textContent = player.army;

  if (cityCount) {
    cityCount.textContent =
      cities.filter(c => c.owner === "player").length;
  }

  if (factoryCount) {
    factoryCount.textContent =
      factories.filter(f => f.owner === "player").length;
  }
}

// HELPERS

function valid(x, y) {
  return x >= 0 && x < W && y >= 0 && y < H;
}

function ownsLand(x, y, owner) {
  return valid(x, y) && map[y][x].owner === owner;
}

function getNeighbors(x, y) {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1]
  ].filter(([nx, ny]) => valid(nx, ny));
}

// MAP GENERATION

function generateMap() {
  map = [];
  cities = [];
  factories = [];
  ships = [];
  bots = [];

  for (let y = 0; y < H; y++) {
    map[y] = [];

    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / (W / 2);
      const ny = (y - H / 2) / (H / 2);

      const noise = Math.random() * 0.25;
      const distance = Math.sqrt(nx * nx + ny * ny);

      const island =
        Math.sin(x * 0.16) * 0.18 +
        Math.cos(y * 0.19) * 0.16 +
        Math.sin((x + y) * 0.09) * 0.15;

      const land =
        distance < 0.95 &&
        island + noise > -0.08;

      map[y][x] = {
        owner: land ? "neutral" : "sea",
        city: false,
        factory: false
      };
    }
  }
}

function createBots() {
  const positions = [
    [15, 12],
    [80, 12],
    [15, 45],
    [80, 45],
    [50, 8]
  ];

  positions.forEach((pos, i) => {
    const bot = {
      color: botColors[i],
      army: 100,
      gold: 300,
      alive: true
    };

    bots.push(bot);

    for (let y = pos[1] - 1; y <= pos[1] + 1; y++) {
      for (let x = pos[0] - 1; x <= pos[0] + 1; x++) {
        if (
          valid(x, y) &&
          map[y][x].owner === "neutral"
        ) {
          map[y][x].owner = bot.color;
        }
      }
    }
  });
}

// DRAWING

function draw() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = map[y][x];

      ctx.fillStyle = colors[tile.owner] || tile.owner;

      ctx.fillRect(
        x * SIZE,
        y * SIZE,
        SIZE,
        SIZE
      );

      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.strokeRect(
        x * SIZE,
        y * SIZE,
        SIZE,
        SIZE
      );

      if (tile.city) drawCity(x, y);
      if (tile.factory) drawFactory(x, y);
    }
  }

  ships.forEach(ship => {
    ctx.fillStyle = "#e9f5ff";
    ctx.fillRect(
      ship.x * SIZE + 2,
      ship.y * SIZE + 2,
      6,
      6
    );

    ctx.fillStyle = "#24394d";
    ctx.fillRect(
      ship.x * SIZE + 3,
      ship.y * SIZE + 4,
      4,
      2
    );
  });

  if (selectedShipTarget) {
    ctx.strokeStyle = "#ffe36a";
    ctx.lineWidth = 2;

    ctx.strokeRect(
      selectedShipTarget.x * SIZE,
      selectedShipTarget.y * SIZE,
      SIZE,
      SIZE
    );

    ctx.lineWidth = 1;
  }
}

function drawCity(x, y) {
  const px = x * SIZE;
  const py = y * SIZE;

  ctx.fillStyle = "#168f7a";
  ctx.beginPath();
  ctx.arc(px + 5, py + 5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263b43";
  ctx.fillRect(px + 1, py + 3, 3, 5);
  ctx.fillRect(px + 5, py + 1, 3, 7);

  ctx.fillStyle = "#d9e8dc";
  ctx.fillRect(px + 1, py + 2, 3, 2);
  ctx.fillRect(px + 5, py, 3, 2);

  ctx.fillStyle = "#ffdf65";
  ctx.fillRect(px + 2, py + 5, 1, 1);
  ctx.fillRect(px + 6, py + 4, 1, 1);
}

function drawFactory(x, y) {
  const px = x * SIZE;
  const py = y * SIZE;

  ctx.fillStyle = "#bd9454";
  ctx.beginPath();
  ctx.arc(px + 5, py + 5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#333b40";
  ctx.fillRect(px + 1, py + 4, 8, 5);
  ctx.fillRect(px + 6, py + 1, 2, 4);

  ctx.fillStyle = "#e3c69b";
  ctx.fillRect(px + 1, py + 3, 8, 2);

  ctx.fillStyle = "#ffda64";
  ctx.fillRect(px + 3, py + 6, 2, 2);
}

// ZOOM AND POSITION

function centerMap() {
  resizeCanvas();

  const cw = window.innerWidth;
  const ch = window.innerHeight;

  zoom = Math.min(
    cw / (W * SIZE),
    ch / (H * SIZE),
    1
  );

  offsetX = (cw - W * SIZE * zoom) / 2;
  offsetY = (ch - H * SIZE * zoom) / 2;

  redrawZoom();
}

function redrawZoom() {
  const dpr = window.devicePixelRatio || 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.clearRect(
    0,
    0,
    gameCanvas.width,
    gameCanvas.height
  );

  ctx.setTransform(
    dpr * zoom,
    0,
    0,
    dpr * zoom,
    dpr * offsetX,
    dpr * offsetY
  );

  if (gameStarted && map.length) {
    draw();
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function mouseTile(event) {
  const rect = gameCanvas.getBoundingClientRect();

  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;

  return {
    x: Math.floor((sx - offsetX) / (SIZE * zoom)),
    y: Math.floor((sy - offsetY) / (SIZE * zoom))
  };
}

gameCanvas.addEventListener("wheel", event => {
  if (!gameStarted) return;

  event.preventDefault();

  const rect = gameCanvas.getBoundingClientRect();

  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;

  const oldZoom = zoom;

  zoom *= event.deltaY < 0 ? 1.1 : 0.9;
  zoom = Math.max(0.3, Math.min(4, zoom));

  offsetX = mx - (mx - offsetX) * (zoom / oldZoom);
  offsetY = my - (my - offsetY) * (zoom / oldZoom);

  redrawZoom();
}, { passive: false });

// START NATION

function startNation(x, y) {
  if (!ownsLand(x, y, "neutral")) {
    setMessage("CHOOSE NEUTRAL LAND!");
    return;
  }

  map[y][x].owner = "player";
  startedNation = true;

  setMessage("YOUR NATION HAS BEEN CREATED!");

  updateStats();
  redrawZoom();
}

// EXPANSION

function expandFrom(x, y) {
  if (!ownsLand(x, y, "player")) return;

  const candidates = [];

  for (let yy = 0; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      if (
        map[yy][xx].owner === "neutral" &&
        getNeighbors(xx, yy).some(([nx, ny]) =>
          ownsLand(nx, ny, "player")
        )
      ) {
        candidates.push({ x: xx, y: yy });
      }
    }
  }

  let expanded = 0;

  const timer = setInterval(() => {
    if (
      expanded >= 20 ||
      !candidates.length ||
      player.army < 2
    ) {
      clearInterval(timer);
      updateStats();
      redrawZoom();
      return;
    }

    const index = Math.floor(Math.random() * candidates.length);
    const tile = candidates.splice(index, 1)[0];

    map[tile.y][tile.x].owner = "player";
    player.army -= 2;
    expanded++;

    updateStats();
    redrawZoom();
  }, 100);
}

function expandRandom() {
  const owned = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x].owner === "player") {
        owned.push({ x, y });
      }
    }
  }

  if (owned.length) {
    const tile = owned[Math.floor(Math.random() * owned.length)];
    expandFrom(tile.x, tile.y);
  }
}

// ATTACK

function attackTile(x, y) {
  if (!valid(x, y)) return;

  if (player.army < 20) {
    setMessage("NOT ENOUGH ARMY!");
    return;
  }

  const adjacent = getNeighbors(x, y).some(([nx, ny]) =>
    ownsLand(nx, ny, "player")
  );

  if (
    !adjacent ||
    map[y][x].owner === "sea" ||
    map[y][x].owner === "player"
  ) return;

  player.army -= 20;
  map[y][x].owner = "player";

  updateStats();
  redrawZoom();

  setMessage("ENEMY LAND CAPTURED!");
}

function attackAllBots() {
  if (!startedNation) return;

  bots.forEach(bot => {
    if (!bot.alive || player.army < 20) return;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (map[y][x].owner !== bot.color) continue;

        const adjacent = getNeighbors(x, y).some(([nx, ny]) =>
          ownsLand(nx, ny, "player")
        );

        if (adjacent && player.army >= 20) {
          player.army -= 20;
          map[y][x].owner = "player";

          updateStats();
          redrawZoom();
          break;
        }
      }
    }
  });
}

// BUILDINGS

function buildCity(x, y) {
  if (!ownsLand(x, y, "player")) {
    setMessage("SELECT YOUR OWN LAND!");
    return;
  }

  if (map[y][x].city || map[y][x].factory) {
    setMessage("BUILDING ALREADY EXISTS!");
    return;
  }

  if (player.gold < 200) {
    setMessage("NOT ENOUGH GOLD!");
    return;
  }

  player.gold -= 200;
  map[y][x].city = true;

  cities.push({ x, y, owner: "player" });

  buildingMode = null;

  setMessage("CITY BUILT!");
  updateStats();
  redrawZoom();
}

function buildFactory(x, y) {
  if (!ownsLand(x, y, "player")) {
    setMessage("SELECT YOUR OWN LAND!");
    return;
  }

  if (map[y][x].city || map[y][x].factory) {
    setMessage("BUILDING ALREADY EXISTS!");
    return;
  }

  if (player.gold < 300) {
    setMessage("NOT ENOUGH GOLD!");
    return;
  }

  player.gold -= 300;
  map[y][x].factory = true;

  factories.push({ x, y, owner: "player" });

  buildingMode = null;

  setMessage("FACTORY BUILT!");
  updateStats();
  redrawZoom();
}

// SHIPS

function sendShip(x, y) {
  if (!selectedShipTarget) return;

  if (player.army < 30) {
    setMessage("NOT ENOUGH ARMY!");
    return;
  }

  const target = selectedShipTarget;

  if (
    map[target.y][target.x].owner === "sea" ||
    map[target.y][target.x].owner === "player"
  ) {
    setMessage("INVALID SHIP TARGET!");
    return;
  }

  player.army -= 30;

  const ship = {
    x,
    y,
    targetX: target.x,
    targetY: target.y
  };

  ships.push(ship);
  selectedShipTarget = null;

  updateStats();
  redrawZoom();

  const timer = setInterval(() => {
    if (ship.x < ship.targetX) ship.x++;
    else if (ship.x > ship.targetX) ship.x--;

    if (ship.y < ship.targetY) ship.y++;
    else if (ship.y > ship.targetY) ship.y--;

    if (ship.x === ship.targetX && ship.y === ship.targetY) {
      map[ship.y][ship.x].owner = "player";

      ships = ships.filter(s => s !== ship);

      clearInterval(timer);
      setMessage("SHIP ARRIVED! LAND CAPTURED!");
    }

    redrawZoom();
  }, 350);
}

// RECRUIT

function recruit() {
  if (player.gold < 100) {
    setMessage("NOT ENOUGH GOLD!");
    return;
  }

  player.gold -= 100;
  player.army += 25;

  updateStats();
  setMessage("25 ARMY RECRUITED!");
}

// AI

function botExpand(bot) {
  const candidates = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x].owner !== bot.color) continue;

      getNeighbors(x, y).forEach(([nx, ny]) => {
        if (map[ny][nx].owner === "neutral") {
          candidates.push({ x: nx, y: ny });
        }
      });
    }
  }

  if (!candidates.length) return;

  const target = candidates[
    Math.floor(Math.random() * candidates.length)
  ];

  map[target.y][target.x].owner = bot.color;
  bot.army = Math.max(0, bot.army - 2);
}

function botBuild(bot, type) {
  const cost = type === "city" ? 200 : 300;

  if (bot.gold < cost) return;

  const spots = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (
        map[y][x].owner === bot.color &&
        !map[y][x].city &&
        !map[y][x].factory
      ) {
        spots.push({ x, y });
      }
    }
  }

  if (!spots.length) return;

  const spot = spots[
    Math.floor(Math.random() * spots.length)
  ];

  if (type === "city") {
    map[spot.y][spot.x].city = true;
  } else {
    map[spot.y][spot.x].factory = true;
  }

  bot.gold -= cost;
}

function botAttack(bot) {
  const threshold = {
    easy: 20,
    medium: 35,
    hard: 60
  }[aiDifficulty];

  if (player.army > threshold || bot.army < 20) return;

  const targets = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x].owner !== bot.color) continue;

      getNeighbors(x, y).forEach(([nx, ny]) => {
        if (map[ny][nx].owner === "player") {
          targets.push({ x: nx, y: ny });
        }
      });
    }
  }

  if (!targets.length) return;

  const target = targets[
    Math.floor(Math.random() * targets.length)
  ];

  map[target.y][target.x].owner = bot.color;
  bot.army -= 20;
}

function aiTurn() {
  if (!gameStarted || !startedNation) return;

  bots.forEach(bot => {
    let expansions = 1;
    let cityChance = 18;
    let factoryChance = 10;
    let armyGain = 5;
    let goldGain = 10;

    if (aiDifficulty === "easy") {
      expansions = Math.random() < 0.5 ? 1 : 0;
      cityChance = 8;
      factoryChance = 3;
      armyGain = 2;
      goldGain = 5;
    }

    if (aiDifficulty === "hard") {
      expansions = 2;
      cityChance = 35;
      factoryChance = 22;
      armyGain = 15;
      goldGain = 20;
    }

    bot.army += armyGain;
    bot.gold += goldGain;

    for (let i = 0; i < expansions; i++) {
      botExpand(bot);
    }

    if (Math.random() * 100 < cityChance) {
      botBuild(bot, "city");
    }

    if (Math.random() * 100 < factoryChance) {
      botBuild(bot, "factory");
    }

    botAttack(bot);
  });

  redrawZoom();
}

// INCOME

setInterval(() => {
  if (!gameStarted || !startedNation) return;

  player.army += 20;
  updateStats();
}, 1000);

setInterval(() => {
  if (!gameStarted || !startedNation) return;

  player.gold += 10;
  player.gold += cities.filter(c => c.owner === "player").length * 25;
  player.gold += factories.filter(f => f.owner === "player").length * 50;

  updateStats();
}, 5000);

setInterval(aiTurn, 3000);

// BUTTONS

connectButton("expand", expandRandom);
connectButton("attackAll", attackAllBots);
connectButton("recruit", recruit);

connectButton("buildCity", () => {
  if (!startedNation) {
    setMessage("FIRST CHOOSE YOUR STARTING LAND!");
    return;
  }

  buildingMode = "city";
  setMessage("CITY MODE: CLICK YOUR LAND TO BUILD!");
});

connectButton("buildFactory", () => {
  if (!startedNation) {
    setMessage("FIRST CHOOSE YOUR STARTING LAND!");
    return;
  }

  buildingMode = "factory";
  setMessage("FACTORY MODE: CLICK YOUR LAND TO BUILD!");
});

// KEYBOARD SHORTCUTS

window.addEventListener("keydown", event => {
  if (!gameStarted) return;

  if (
    event.target.tagName === "INPUT" ||
    event.target.tagName === "TEXTAREA"
  ) return;

  if (event.key === "1") {
    if (!startedNation) {
      setMessage("FIRST CHOOSE YOUR STARTING LAND!");
      return;
    }

    buildingMode = "city";
    setMessage("CITY MODE: CLICK YOUR LAND TO BUILD!");
  }

  if (event.key === "2") {
    if (!startedNation) {
      setMessage("FIRST CHOOSE YOUR STARTING LAND!");
      return;
    }

    buildingMode = "factory";
    setMessage("FACTORY MODE: CLICK YOUR LAND TO BUILD!");
  }
});

// MAP CLICK

gameCanvas.addEventListener("contextmenu", event => {
  event.preventDefault();

  if (!gameStarted || !startedNation) return;

  const { x, y } = mouseTile(event);

  if (!valid(x, y)) return;

  if (
    map[y][x].owner !== "sea" &&
    map[y][x].owner !== "player"
  ) {
    selectedShipTarget = { x, y };

    setMessage("SHIP TARGET SELECTED!");
    redrawZoom();
  }
});

gameCanvas.addEventListener("click", event => {
  if (!gameStarted) return;

  const { x, y } = mouseTile(event);

  if (!valid(x, y)) return;

  if (!startedNation) {
    startNation(x, y);
    return;
  }

  if (buildingMode === "city") {
    buildCity(x, y);
    return;
  }

  if (buildingMode === "factory") {
    buildFactory(x, y);
    return;
  }

  if (selectedShipTarget && map[y][x].owner === "player") {
    sendShip(x, y);
    return;
  }

  if (map[y][x].owner === "player") {
    expandFrom(x, y);
    return;
  }

  attackTile(x, y);
});

// MIDDLE MOUSE DRAG

gameCanvas.addEventListener("mousedown", event => {
  if (event.button === 1) {
    dragging = true;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    event.preventDefault();
  }
});

window.addEventListener("mouseup", () => {
  dragging = false;
});

gameCanvas.addEventListener("mousemove", event => {
  if (!dragging) return;

  offsetX += event.clientX - lastMouseX;
  offsetY += event.clientY - lastMouseY;

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  redrawZoom();
});

// RESIZE

window.addEventListener("resize", () => {
  if (gameStarted) {
    centerMap();
  } else {
    resizeCanvas();
  }
});

// INITIALIZATION

resizeCanvas();

if (lobby) lobby.style.display = "flex";
if (difficultyMenu) difficultyMenu.style.display = "none";
if (gameUI) gameUI.style.display = "none";
if (bottomBar) bottomBar.style.display = "none";

updateStats();

console.log("WORLD CONQUEST SCRIPT LOADED SUCCESSFULLY");
