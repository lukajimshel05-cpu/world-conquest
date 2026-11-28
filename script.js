
const gameCanvas = document.getElementById("map");
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

let player = { army: 100, gold: 500 };

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

const mainMenuView = document.getElementById("mainMenuView");
const multiplayerMenu = document.getElementById("multiplayerMenu");
const roomLobby = document.getElementById("roomLobby");

// MULTIPLAYER VARIABLES

let selectedMap = "world";
let currentRoomCode = "";
let isReady = false;

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
  const el = document.getElementById("message");
  if (el) el.textContent = message;
}

// MENU HELPERS

function showMenu(menu) {
  if (mainMenuView) mainMenuView.style.display = "none";
  if (multiplayerMenu) multiplayerMenu.style.display = "none";
  if (roomLobby) roomLobby.style.display = "none";

  difficultyMenu.style.display = "none";

  if (menu) menu.style.display = "flex";
}

// SINGLEPLAYER MENU

document.getElementById("singleplayer").onclick = () => {
  showMenu(difficultyMenu);
  lobbyMessage.textContent = "";
};

document.getElementById("back").onclick = () => {
  showMenu(mainMenuView);
  lobbyMessage.textContent = "";
};

document.getElementById("easy").onclick = () => startGame("easy");
document.getElementById("medium").onclick = () => startGame("medium");
document.getElementById("hard").onclick = () => startGame("hard");

// SETTINGS

document.getElementById("settings").onclick = () => {
  lobbyMessage.textContent = "SETTINGS - COMING SOON...";

  setTimeout(() => {
    lobbyMessage.textContent = "";
  }, 3000);
};

// START GAME

function startGame(difficulty) {
  aiDifficulty = difficulty || "medium";

  gameStarted = true;
  startedNation = false;

  player = { army: 100, gold: 500 };

  selectedShipTarget = null;
  buildingMode = null;

  lobby.style.display = "none";
  difficultyMenu.style.display = "none";

  gameUI.style.display = "block";
  bottomBar.style.display = "flex";

  generateMap();
  createBots();
  centerMap();
  updateStats();

  setMessage("CHOOSE AN UNCLAIMED LAND TILE TO START!");
}

// STATS

function updateStats() {
  const armyEl = document.getElementById("army");
  const goldEl = document.getElementById("gold");

  if (armyEl) armyEl.textContent = player.army;
  if (goldEl) goldEl.textContent = player.gold;

  updateBottomBar();
}

function updateBottomBar() {
  document.getElementById("bottomGold").textContent = player.gold;
  document.getElementById("bottomArmy").textContent = player.army;

  document.getElementById("cityCount").textContent =
    cities.filter(c => c.owner === "player").length;

  document.getElementById("factoryCount").textContent =
    factories.filter(f => f.owner === "player").length;
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
        if (valid(x, y) && map[y][x].owner === "neutral") {
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
      ctx.fillRect(x * SIZE, y * SIZE, SIZE, SIZE);

      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.strokeRect(x * SIZE, y * SIZE, SIZE, SIZE);

      if (tile.city) drawCity(x, y);
      if (tile.factory) drawFactory(x, y);
    }
  }

  ships.forEach(ship => {
    ctx.fillStyle = "#e9f5ff";
    ctx.fillRect(ship.x * SIZE + 2, ship.y * SIZE + 2, 6, 6);

    ctx.fillStyle = "#24394d";
    ctx.fillRect(ship.x * SIZE + 3, ship.y * SIZE + 4, 4, 2);
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
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  ctx.setTransform(
    dpr * zoom, 0,
    0, dpr * zoom,
    dpr * offsetX, dpr * offsetY
  );

  if (gameStarted && map.length) draw();

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

  const target = candidates[Math.floor(Math.random() * candidates.length)];

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

  const spot = spots[Math.floor(Math.random() * spots.length)];

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

  const target = targets[Math.floor(Math.random() * targets.length)];

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

function connectButton(id, action) {
  const button = document.getElementById(id);
  if (button) button.onclick = action;
}

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

lobby.style.display = "flex";
difficultyMenu.style.display = "none";

gameUI.style.display = "none";
bottomBar.style.display = "none";

updateStats();

// TOP-RIGHT GAME CONTROL PANEL

(function addTopRightControls() {
  const panel = document.createElement("div");
  panel.id = "topControls";

  panel.innerHTML = `
    <span id="gameTimer">00:00</span>
    <button id="settingsBtn" type="button" title="Settings">⚙</button>
    <button id="shareBtn" type="button" title="Share">↗</button>
    <button id="fullscreenBtn" type="button" title="Fullscreen">⛶</button>
    <button id="exitBtn" type="button" title="Exit">⇥</button>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #topControls {
      position: fixed;
      top: 5px;
      right: 5px;
      z-index: 10000;
      display: none;
      align-items: center;
      gap: 12px;
      padding: 5px 12px;
      min-height: 40px;
      box-sizing: border-box;
      color: white;
      background: #202d3d;
      border-radius: 0 0 0 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
    }

    #topControls #gameTimer {
      min-width: 42px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    #topControls button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 28px;
      padding: 2px 4px;
      border: 0;
      border-radius: 5px;
      color: white;
      background: transparent;
      font-size: 21px;
      line-height: 1;
      cursor: pointer;
    }

    #topControls button:hover {
      color: #55baff;
      background: rgba(255,255,255,.08);
    }

    @media (max-width: 600px) {
      #topControls {
        gap: 6px;
        padding: 4px 7px;
      }

      #topControls button {
        min-width: 25px;
        font-size: 19px;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  let elapsedSeconds = 0;
  let timerInterval = null;

  function updateTimer() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timer = document.getElementById("gameTimer");

    if (timer) {
      timer.textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }
  }

  function startGameTimer() {
    elapsedSeconds = 0;
    updateTimer();

    if (timerInterval !== null) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (gameStarted && startedNation) {
        elapsedSeconds++;
        updateTimer();
      }
    }, 1000);
  }

  const originalStartGame = startGame;

  startGame = function(difficulty) {
    originalStartGame(difficulty);
    panel.style.display = "flex";
    startGameTimer();
  };

  document.getElementById("settingsBtn").addEventListener("click", () => {
    alert("SETTINGS - COMING SOON!");
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareData = {
      title: "WORLD CONQUEST",
      text: "Play WORLD CONQUEST!",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
        alert("Game link copied!");
      } else {
        window.prompt("Copy your game link:", window.location.href);
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        window.prompt("Copy your game link:", window.location.href);
      }
    }
  });

  document.getElementById("fullscreenBtn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      alert("Fullscreen is not available in this browser.");
    }
  });

  document.getElementById("exitBtn").addEventListener("click", () => {
    if (confirm("Return to the main menu? Your current game will restart if you leave.")) {
      window.location.reload();
    }
  });
})();

// LEADERBOARD WITH CHANGEABLE NAME

(function addLeaderboard() {
  const leaderboard = document.createElement("div");
  leaderboard.id = "leaderboard";

  leaderboard.innerHTML = `
    <div id="leaderboardHeader">
      <span>🏆 WORLD RANKING</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button id="changePlayerName" type="button" title="Change name">✎</button>
        <button id="leaderboardToggle" type="button" title="Minimize">−</button>
      </div>
    </div>
    <div id="leaderboardContent">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>PLAYER</th>
            <th>LAND</th>
            <th>ARMY</th>
            <th>GOLD</th>
            <th>CITIES</th>
            <th>FACTORIES</th>
          </tr>
        </thead>
        <tbody id="leaderboardRows"></tbody>
      </table>
    </div>
  `;

  const leaderboardStyle = document.createElement("style");
  leaderboardStyle.textContent = `
    #leaderboard {
      position: fixed;
      top: 55px;
      right: 10px;
      width: min(650px, calc(100vw - 20px));
      max-height: 45vh;
      z-index: 9999;
      overflow: hidden;
      color: #f2f5fa;
      background: #202d3d;
      border: 1px solid #40536a;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
      display: none;
    }

    #leaderboardHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      background: #26394e;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: .5px;
    }

    #leaderboard button {
      width: 27px;
      height: 27px;
      border: 0;
      border-radius: 5px;
      color: white;
      background: #40536a;
      font-size: 17px;
      cursor: pointer;
    }

    #leaderboard button:hover {
      background: #287dcc;
    }

    #leaderboardContent {
      max-height: calc(45vh - 43px);
      overflow: auto;
    }

    #leaderboard table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: center;
      white-space: nowrap;
    }

    #leaderboard th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 9px 7px;
      color: #c8d7e8;
      background: #1b2938;
      border-bottom: 1px solid #40536a;
    }

    #leaderboard td {
      padding: 9px 7px;
      border-bottom: 1px solid #34485e;
    }

    #leaderboard tbody tr:nth-child(even) {
      background: rgba(255,255,255,.035);
    }

    #leaderboard tbody tr:first-child {
      background: rgba(255,210,80,.12);
    }

    .leaderboardName {
      display: flex;
      align-items: center;
      gap: 7px;
      text-align: left;
      font-weight: bold;
    }

    .leaderboardColor {
      display: inline-block;
      width: 9px;
      height: 9px;
      flex-shrink: 0;
      border-radius: 50%;
    }

    @media (max-width: 600px) {
      #leaderboard {
        top: 52px;
        right: 5px;
        width: calc(100vw - 10px);
      }

      #leaderboard table {
        font-size: 10px;
      }

      #leaderboard th,
      #leaderboard td {
        padding: 7px 4px;
      }
    }
  `;

  document.head.appendChild(leaderboardStyle);
  document.body.appendChild(leaderboard);

  const botNames = [
    "AnonOmen5",
    "CoolName",
    "JacquesPasD",
    "goy",
    "Larry"
  ];

  let playerName = "";

  function getSavedName() {
    try {
      return localStorage.getItem("worldConquestPlayerName") || "";
    } catch (error) {
      return "";
    }
  }

  function saveName(name) {
    try {
      localStorage.setItem("worldConquestPlayerName", name);
    } catch (error) {}
  }

  function askForName(firstTime = false) {
    const currentName = playerName || getSavedName() || "Player";

    const answer = prompt(
      firstTime ? "Choose your player name:" : "Enter your new player name:",
      currentName
    );

    if (answer === null) return;

    const newName = answer.trim().slice(0, 18);

    if (!newName) {
      alert("Name cannot be empty!");
      return;
    }

    playerName = newName;
    saveName(playerName);
    updateLeaderboard();
  }

  playerName = getSavedName();

  document.getElementById("changePlayerName")
    .addEventListener("click", () => {
      askForName(false);
    });

  function countLand(owner) {
    let count = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (map[y][x].owner === owner) count++;
      }
    }

    return count;
  }

  function countBuildings(list, owner) {
    return list.filter(item => item.owner === owner).length;
  }

  function countBotBuildings(owner, type) {
    let count = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (map[y][x].owner === owner && map[y][x][type]) {
          count++;
        }
      }
    }

    return count;
  }

  function updateLeaderboard() {
    if (!gameStarted || !map.length) return;

    const rankings = [];

    rankings.push({
      name: playerName || "Player",
      color: colors.player,
      land: countLand("player"),
      army: player.army,
      gold: player.gold,
      cities: countBuildings(cities, "player"),
      factories: countBuildings(factories, "player")
    });

    bots.forEach((bot, index) => {
      rankings.push({
        name: botNames[index] || "BOT " + (index + 1),
        color: bot.color,
        land: countLand(bot.color),
        army: bot.army,
        gold: bot.gold,
        cities: countBotBuildings(bot.color, "city"),
        factories: countBotBuildings(bot.color, "factory")
      });
    });

    rankings.sort((a, b) => b.land - a.land);

    const rows = document.getElementById("leaderboardRows");
    if (!rows) return;

    rows.innerHTML = rankings.map((item, index) => {
      const safeName = String(item.name).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="leaderboardName">
              <span class="leaderboardColor"
                style="background:${item.color}">
              </span>
              ${safeName}
            </div>
          </td>
          <td>${item.land}</td>
          <td>${Math.floor(item.army)}</td>
          <td>${Math.floor(item.gold)}</td>
          <td>${item.cities}</td>
          <td>${item.factories}</td>
        </tr>
      `;
    }).join("");
  }

  document.getElementById("leaderboardToggle")
    .addEventListener("click", () => {
      const content = document.getElementById("leaderboardContent");
      const button = document.getElementById("leaderboardToggle");

      const isHidden = content.style.display === "none";

      content.style.display = isHidden ? "block" : "none";
      button.textContent = isHidden ? "−" : "+";
    });

  const previousStartGame = startGame;

  startGame = function(difficulty) {
    if (!playerName) {
      askForName(true);
      if (!playerName) playerName = "Player";
    }

    previousStartGame(difficulty);

    leaderboard.style.display = "block";
    updateLeaderboard();
  };

  setInterval(updateLeaderboard, 1000);
})();

// PLAYER NAME SYSTEM

const playerNameInput = document.getElementById("playerNameInput");
const savePlayerNameButton = document.getElementById("savePlayerName");

let playerName = localStorage.getItem("worldConquestPlayerName") || "";

if (playerNameInput) {
  playerNameInput.value = playerName;
}

if (savePlayerNameButton) {
  savePlayerNameButton.addEventListener("click", () => {
    const name = playerNameInput.value.trim();

    if (!name) {
      alert("Please enter your name!");
      return;
    }

    playerName = name.slice(0, 18);

    localStorage.setItem("worldConquestPlayerName", playerName);

    playerNameInput.value = playerName;

    alert("Name saved: " + playerName);
  });
}

// FIREBASE

const firebaseConfig = {
  apiKey: "AIzaSyCxP05nyB-MBIq1MWNVkdV96XE1aIVqnWk",
  authDomain: "worldqonquest-io.firebaseapp.com",
  databaseURL: "https://worldqonquest-io-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "worldqonquest-io",
  storageBucket: "worldqonquest-io.firebasestorage.app",
  messagingSenderId: "232407608551",
  appId: "1:232407608551:web:bb7679bfe07f38e96a4642",
  measurementId: "G-SW19XB3F6Y"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const auth = firebase.auth();

auth.signInAnonymously()
  .then(() => {
    console.log("Firebase connected!");
    console.log("Player ID:", auth.currentUser.uid);
  })
  .catch(error => {
    console.error("Firebase error:", error);
    alert("FIREBASE ERROR: " + error.message);
  });

// MULTIPLAYER MENU

document.getElementById("multiplayer").onclick = function () {
  showMenu(multiplayerMenu);
  lobbyMessage.textContent = "";
};

document.getElementById("multiBack").onclick = function () {
  showMenu(mainMenuView);
  lobbyMessage.textContent = "";
};

document.querySelectorAll(".map-card").forEach(card => {
  card.onclick = function () {
    document.querySelectorAll(".map-card").forEach(item => {
      item.classList.remove("selected");
    });

    this.classList.add("selected");
    selectedMap = this.dataset.map;
  };
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function openRoom(code) {
  currentRoomCode = code;
  isReady = false;

  document.getElementById("roomCodeDisplay").textContent = code;

  document.getElementById("selectedMapText").textContent =
    "MAP: " + selectedMap.toUpperCase();

  const savedPlayerName =
    localStorage.getItem("worldConquestPlayerName") || "Player";

  document.getElementById("roomPlayers").textContent =
    savedPlayerName + " — NOT READY";

  document.getElementById("readyButton").textContent = "READY";

  showMenu(roomLobby);
}

document.getElementById("createRoom").onclick = function () {
  const code = generateRoomCode();

  openRoom(code);

  lobbyMessage.textContent = "ROOM CREATED (LOCAL PREVIEW)";
};

document.getElementById("joinRoom").onclick = function () {
  const code = document.getElementById("roomCodeInput")
    .value.trim().toUpperCase();

  if (code.length !== 6) {
    lobbyMessage.textContent = "ENTER A VALID 6-CHARACTER CODE";
    return;
  }

  lobbyMessage.textContent =
    "ONLINE JOIN IS NOT ENABLED YET";
};

document.getElementById("readyButton").onclick = function () {
  isReady = !isReady;

  const savedPlayerName =
    localStorage.getItem("worldConquestPlayerName") || "Player";

  document.getElementById("roomPlayers").textContent =
    savedPlayerName + (isReady ? " — READY" : " — NOT READY");

  this.textContent = isReady ? "NOT READY" : "READY";
};

// FIXED START GAME BUTTON

document.getElementById("startRoom").onclick = function () {
  if (!currentRoomCode) {
    lobbyMessage.textContent = "CREATE A ROOM FIRST!";
    return;
  }

  if (!isReady) {
    lobbyMessage.textContent = "PRESS READY FIRST!";
    return;
  }

  lobbyMessage.textContent = "";

  // Start the existing game using medium difficulty.
  // This also activates the timer and leaderboard.
  startGame("medium");
};

document.getElementById("leaveRoom").onclick = function () {
  currentRoomCode = "";
  isReady = false;

  showMenu(multiplayerMenu);
  lobbyMessage.textContent = "";
};
// ===================================
// WORLD / CONTINENTS / ISLANDS UPDATE
// ===================================

function isLandAt(nx, ny, mode) {
  const noise =
    Math.sin(nx * 35 + ny * 17) * 0.018 +
    Math.cos(nx * 24 - ny * 31) * 0.015 +
    Math.sin((nx + ny) * 48) * 0.012;

  const shapes = {
    world: [
      [0.22, 0.30, 0.16, 0.19],
      [0.37, 0.12, 0.055, 0.08],
      [0.32, 0.65, 0.085, 0.24],
      [0.53, 0.28, 0.09, 0.09],
      [0.55, 0.53, 0.12, 0.23],
      [0.75, 0.30, 0.23, 0.18],
      [0.68, 0.49, 0.05, 0.12],
      [0.83, 0.75, 0.09, 0.10],
      [0.92, 0.42, 0.025, 0.07]
    ],

    continents: [
      [0.17, 0.25, 0.13, 0.19],
      [0.35, 0.68, 0.10, 0.25],
      [0.52, 0.25, 0.12, 0.14],
      [0.54, 0.57, 0.14, 0.25],
      [0.78, 0.30, 0.17, 0.20],
      [0.83, 0.76, 0.11, 0.12]
    ]
  };

  if (mode === "islands") {
    for (let i = 0; i < 28; i++) {
      const cx = 0.08 + (Math.sin(i * 127.1) * 0.5 + 0.5) * 0.84;
      const cy = 0.08 + (Math.sin(i * 311.7) * 0.5 + 0.5) * 0.84;

      const rx = 0.018 + (Math.sin(i * 51.3) * 0.5 + 0.5) * 0.035;
      const ry = 0.025 + (Math.cos(i * 73.9) * 0.5 + 0.5) * 0.055;

      const dx = (nx - cx) / rx;
      const dy = (ny - cy) / ry;

      if (dx * dx + dy * dy < 1 + noise * 8) {
        return true;
      }
    }

    return false;
  }

  for (const [cx, cy, rx, ry] of shapes[mode] || shapes.world) {
    const dx = (nx - cx) / rx;
    const dy = (ny - cy) / ry;

    if (dx * dx + dy * dy < 1 + noise * 8) {
      return true;
    }
  }

  return false;
}

// ეს ფუნქცია ძველ generateMap-ს ჩაანაცვლებს
function generateMap() {
  map = [];
  cities = [];
  factories = [];
  ships = [];
  bots = [];

  const mode = selectedMap || "world";

  for (let y = 0; y < H; y++) {
    map[y] = [];

    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5) / W;
      const ny = (y + 0.5) / H;

      const land = isLandAt(nx, ny, mode);

      map[y][x] = {
        owner: land ? "neutral" : "sea",
        city: false,
        factory: false
      };
    }
  }
}

// ბოტების განთავსება ახლომდებარე ხმელეთზე
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

    let bestTile = null;
    let bestDistance = Infinity;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (map[y][x].owner !== "neutral") continue;

        const distance =
          Math.abs(x - pos[0]) + Math.abs(y - pos[1]);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestTile = { x, y };
        }
      }
    }

    if (!bestTile) return;

    for (let y = bestTile.y - 1; y <= bestTile.y + 1; y++) {
      for (let x = bestTile.x - 1; x <= bestTile.x + 1; x++) {
        if (valid(x, y) && map[y][x].owner === "neutral") {
          map[y][x].owner = bot.color;
        }
      }
    }
  });
}

// რუკების პატარა ნახვები და არჩევა
(function setupMapPreviews() {
  const cards = document.querySelectorAll(".map-card");

  const style = document.createElement("style");

  style.textContent = `
    .map-card {
      overflow: hidden;
      cursor: pointer;
      transition: .2s;
    }

    .map-card canvas {
      display: block;
      width: 100%;
      height: 105px;
      margin: 8px auto;
      border-radius: 7px;
      background: #183452;
      image-rendering: pixelated;
    }

    .map-card.selected {
      outline: 3px solid #36a6ff;
      transform: scale(1.03);
      box-shadow: 0 0 15px rgba(54,166,255,.45);
    }

    .map-selected-label {
      display: none;
      color: #55baff;
      font-size: 12px;
      font-weight: bold;
      margin-top: 5px;
    }

    .map-card.selected .map-selected-label {
      display: block;
    }
  `;

  document.head.appendChild(style);

  function drawPreview(canvas, mode) {
    const previewCtx = canvas.getContext("2d");

    canvas.width = 180;
    canvas.height = 105;

    previewCtx.fillStyle = "#183452";
    previewCtx.fillRect(0, 0, 180, 105);

    const cols = 60;
    const rows = 35;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = (x + 0.5) / cols;
        const ny = (y + 0.5) / rows;

        if (isLandAt(nx, ny, mode)) {
          previewCtx.fillStyle = "#778568";
          previewCtx.fillRect(
            x * 3,
            y * 3,
            3,
            3
          );
        }
      }
    }
  }

  cards.forEach(card => {
    const mode = card.dataset.map;

    if (!mode) return;

    const canvas = document.createElement("canvas");
    canvas.className = "map-preview";

    const label = document.createElement("div");
    label.className = "map-selected-label";
    label.textContent = "✓ SELECTED";

    card.insertBefore(canvas, card.firstChild);
    card.appendChild(label);

    drawPreview(canvas, mode);

    card.onclick = function() {
      selectedMap = mode;

      cards.forEach(item => {
        item.classList.remove("selected");
      });

      card.classList.add("selected");

      if (lobbyMessage) {
        lobbyMessage.textContent =
          mode.toUpperCase() + " MAP SELECTED";
      }
    };
  });

  const defaultCard = document.querySelector(
    '.map-card[data-map="world"]'
  );

  if (defaultCard) {
    defaultCard.classList.add("selected");
  }
})();
