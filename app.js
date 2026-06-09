const hiraganaCharacters = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ", "を", "ん",
];

const cards = [
  { id: "oruni", name: "オルニトミムス", rarity: "N", image: "./public/assets/cards/oruni.png" },
  { id: "pakike", name: "パキケファロサウルス", rarity: "R", image: "./public/assets/cards/pakike.png" },
  { id: "putera", name: "プテラノドン", rarity: "SR", image: "./public/assets/cards/putera.png" },
  { id: "toricera", name: "トリケラトプス", rarity: "SR", image: "./public/assets/cards/toricera.png" },
  { id: "spino", name: "スピノサウルス", rarity: "UR", image: "./public/assets/cards/spino.png" },
  { id: "tirano", name: "ティラノサウルス", rarity: "UR", image: "./public/assets/cards/tirano.png" },
];

const rarityRates = [
  { rarity: "UR", weight: 6 },
  { rarity: "SR", weight: 18 },
  { rarity: "R", weight: 28 },
  { rarity: "N", weight: 48 },
];

const storageKey = "hiragana-dinosaur-mvp";
const gridSize = 26;
const completionThreshold = 0.13;

const state = {
  practiceCount: 0,
  currentCharacter: "",
  lastCharacter: "",
  drawing: false,
  completed: false,
  touchedCells: new Set(),
  collection: {},
};

const characterTitle = document.getElementById("characterTitle");
const hiraganaImage = document.getElementById("hiraganaImage");
const traceCanvas = document.getElementById("traceCanvas");
const clearButton = document.getElementById("clearButton");
const completeButton = document.getElementById("completeButton");
const changeCharacterButton = document.getElementById("changeCharacterButton");
const gachaButton = document.getElementById("gachaButton");
const gachaResult = document.getElementById("gachaResult");
const collectionGrid = document.getElementById("collectionGrid");
const collectionCount = document.getElementById("collectionCount");
const progressFill = document.getElementById("progressFill");
const practiceCount = document.getElementById("practiceCount");
const progressMessage = document.getElementById("progressMessage");
const traceHint = document.getElementById("traceHint");

const ctx = traceCanvas.getContext("2d");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    state.practiceCount = Number(saved.practiceCount) || 0;
    state.collection = saved.collection || {};
  } catch {
    // Ignore invalid local storage state and start fresh.
  }
}

function saveState() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      practiceCount: state.practiceCount,
      collection: state.collection,
    }),
  );
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function chooseNextCharacter() {
  const pool = hiraganaCharacters.filter((character) => character !== state.lastCharacter);
  const next = randomItem(pool.length > 0 ? pool : hiraganaCharacters);
  state.lastCharacter = next;
  state.currentCharacter = next;
  state.completed = false;
  state.touchedCells.clear();
  completeButton.disabled = true;
  characterTitle.textContent = `${next} を なぞろう`;
  hiraganaImage.src = `./public/assets/hiragana/${next}.png`;
  hiraganaImage.alt = `${next} のなぞりれんしゅう`;
  traceHint.textContent = "もじのうえを たくさん なぞると クリアになるよ。";
  clearCanvas();
}

function resizeCanvas() {
  const { width, height } = traceCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  traceCanvas.width = Math.round(width * ratio);
  traceCanvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ff5d8f";
  ctx.lineWidth = Math.max(18, width * 0.055);
}

function clearCanvas() {
  ctx.clearRect(0, 0, traceCanvas.width, traceCanvas.height);
}

function resetTrace() {
  state.completed = false;
  state.drawing = false;
  state.touchedCells.clear();
  completeButton.disabled = true;
  traceHint.textContent = "もじのうえを たくさん なぞると クリアになるよ。";
  clearCanvas();
}

function getCanvasPoint(event) {
  const rect = traceCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function markCells(point) {
  const brush = Math.max(18, point.width * 0.055);
  const minX = Math.max(0, Math.floor((point.x - brush) / point.width * gridSize));
  const maxX = Math.min(gridSize - 1, Math.floor((point.x + brush) / point.width * gridSize));
  const minY = Math.max(0, Math.floor((point.y - brush) / point.height * gridSize));
  const maxY = Math.min(gridSize - 1, Math.floor((point.y + brush) / point.height * gridSize));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      state.touchedCells.add(`${x}:${y}`);
    }
  }

  const progress = state.touchedCells.size / (gridSize * gridSize);
  if (!state.completed && progress >= completionThreshold) {
    state.completed = true;
    completeButton.disabled = false;
    traceHint.textContent = "すごい。クリアできたよ。つぎへ すすもう。";
  }
}

function drawPoint(point, previousPoint) {
  if (!previousPoint) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5d8f";
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(previousPoint.x, previousPoint.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

let previousPoint = null;

function onPointerDown(event) {
  event.preventDefault();
  state.drawing = true;
  previousPoint = null;
  traceCanvas.setPointerCapture(event.pointerId);
  const point = getCanvasPoint(event);
  drawPoint(point, previousPoint);
  markCells(point);
  previousPoint = point;
}

function onPointerMove(event) {
  if (!state.drawing) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  drawPoint(point, previousPoint);
  markCells(point);
  previousPoint = point;
}

function onPointerUp(event) {
  if (!state.drawing) return;
  state.drawing = false;
  previousPoint = null;
  if (traceCanvas.hasPointerCapture(event.pointerId)) {
    traceCanvas.releasePointerCapture(event.pointerId);
  }
}

function updateProgressUI() {
  practiceCount.textContent = String(state.practiceCount);
  progressFill.style.width = `${(state.practiceCount / 5) * 100}%`;

  if (state.practiceCount >= 5) {
    progressMessage.textContent = "ガチャのじゅんびができたよ";
    gachaButton.disabled = false;
    gachaButton.textContent = "ガチャをひく";
  } else {
    const remain = 5 - state.practiceCount;
    progressMessage.textContent = `あと ${remain} かいで ガチャ`;
    gachaButton.disabled = true;
    gachaButton.textContent = "まだひけないよ";
  }
}

function renderCollection() {
  const ownedEntries = cards
    .filter((card) => state.collection[card.id])
    .sort((a, b) => {
      const rarityIndex = ["UR", "SR", "R", "N"];
      return rarityIndex.indexOf(a.rarity) - rarityIndex.indexOf(b.rarity);
    });

  const total = Object.values(state.collection).reduce((sum, count) => sum + count, 0);
  collectionCount.textContent = `${total} まい`;

  if (ownedEntries.length === 0) {
    collectionGrid.innerHTML = '<div class="empty-collection">まだカードはありません</div>';
    return;
  }

  collectionGrid.innerHTML = ownedEntries
    .map((card) => {
      const count = state.collection[card.id];
      return `
        <article class="collection-item">
          <img src="${card.image}" alt="${card.name}" />
          <h3>${card.name}</h3>
          <div class="collection-meta">
            <span class="rarity-chip rarity-${card.rarity}">${card.rarity}</span>
            <span>${count} まい</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function pickRarity() {
  const total = rarityRates.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of rarityRates) {
    roll -= item.weight;
    if (roll <= 0) return item.rarity;
  }

  return "N";
}

function drawGacha() {
  const rarity = pickRarity();
  const pool = cards.filter((card) => card.rarity === rarity);
  const pickedCard = randomItem(pool);

  state.collection[pickedCard.id] = (state.collection[pickedCard.id] || 0) + 1;
  state.practiceCount = 0;
  saveState();
  updateProgressUI();
  renderCollection();

  gachaResult.classList.remove("empty");
  gachaResult.innerHTML = `
    <div class="result-card">
      <span class="rarity-chip rarity-${pickedCard.rarity}">${pickedCard.rarity}</span>
      <img src="${pickedCard.image}" alt="${pickedCard.name}" />
      <h3>${pickedCard.name}</h3>
      <p>${pickedCard.rarity} のカードを てにいれたよ。</p>
    </div>
  `;
}

function completePractice() {
  if (!state.completed) return;
  state.practiceCount = Math.min(5, state.practiceCount + 1);
  saveState();
  updateProgressUI();
  chooseNextCharacter();
}

function boot() {
  loadState();
  resizeCanvas();
  updateProgressUI();
  renderCollection();
  chooseNextCharacter();

  clearButton.addEventListener("click", resetTrace);
  completeButton.addEventListener("click", completePractice);
  changeCharacterButton.addEventListener("click", chooseNextCharacter);
  gachaButton.addEventListener("click", drawGacha);
  traceCanvas.addEventListener("pointerdown", onPointerDown);
  traceCanvas.addEventListener("pointermove", onPointerMove);
  traceCanvas.addEventListener("pointerup", onPointerUp);
  traceCanvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => {
    resizeCanvas();
    clearCanvas();
  });
}

boot();
