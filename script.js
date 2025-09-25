// ==================== Configurações ====================
const CANVAS_SIZE = 400;         // largura/altura em px (canvas quadrado)
const GRID         = 20;         // grid GRID x GRID (ex.: 20x20)
const CELL         = CANVAS_SIZE / GRID;
const BASE_INTERVAL_MS = 150;    // menor = mais rápido
const WRAP_WALLS   = false;      // true => atravessa paredes (teleporte)
const START_LENGTH = 5;          // tamanho inicial da cobra

// Progressão de velocidade: a cada N comidas, acelera
const FOODS_PER_SPEED = 5;
const SPEED_STEP_MS   = 12;      // quanto reduz por nível (capado depois)

// ==================== Estado global ====================
const canvas  = document.getElementById('game');
const ctx     = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const speedEl = document.getElementById('speed');
const msgEl   = document.getElementById('msg');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');

let snake, dir, nextDir, food, running, paused, timer, intervalMs;
let foodsEaten, speedLvl, score, best;

// ==================== Utilidades ====================
function randInt(max){ return Math.floor(Math.random() * max); }
function same(a,b){ return a.x === b.x && a.y === b.y; }

function randomCellNotInSnake() {
  let c;
  do {
    c = { x: randInt(GRID), y: randInt(GRID) };
  } while (snake.some(seg => seg.x === c.x && seg.y === c.y));
  return c;
}

// ==================== Jogo: ciclo de vida ====================
function reset() {
  const startX = Math.floor(GRID/2);
  const startY = Math.floor(GRID/2);

  snake = [];
  for (let i = 0; i < START_LENGTH; i++) {
    snake.push({ x: startX - i, y: startY });
  }

  dir = { x: 1, y: 0 };          // direção inicial (direita)
  nextDir = { ...dir };

  food = randomCellNotInSnake();

  running = false;
  paused  = false;
  foodsEaten = 0;
  speedLvl   = 1;
  intervalMs = BASE_INTERVAL_MS;
  score = 0;
  best  = Number(localStorage.getItem('snake_best') || 0);

  updateHUD();
  clearInterval(timer);
  draw();

  msgEl.textContent = 'Pressione Iniciar (ou barra de espaço) para começar.';
}

function start() {
  if (running && paused) { resume(); return; }
  if (running) return;
  running = true;
  paused  = false;
  msgEl.textContent = '';
  loop();
}

function pause() {
  if (!running || paused) return;
  paused = true;
  clearInterval(timer);
  msgEl.textContent = 'Jogo pausado — pressione barra de espaço para continuar.';
}

function resume() {
  if (!running || !paused) return;
  paused = false;
  msgEl.textContent = '';
  loop();
}

function restart() {
  reset();
  start();
}

// ==================== Loop ====================
function loop() {
  clearInterval(timer);
  timer = setInterval(step, intervalMs);
}

function step() {
  // Atualiza direção (impede reversão imediata)
  if ((nextDir.x !== -dir.x) || (nextDir.y !== -dir.y)) {
    dir = nextDir;
  }

  // Nova cabeça
  let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Paredes
  if (WRAP_WALLS) {
    head.x = (head.x + GRID) % GRID;
    head.y = (head.y + GRID) % GRID;
  } else {
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return gameOver();
    }
  }

  // Colisão com o corpo
  if (snake.some(seg => same(seg, head))) {
    return gameOver();
  }

  // Move
  snake.unshift(head);

  // Comer
  if (same(head, food)) {
    score++;
    foodsEaten++;
    food = randomCellNotInSnake();

    // acelera de tempos em tempos
    if (foodsEaten % FOODS_PER_SPEED === 0) {
      speedLvl++;
      intervalMs = Math.max(60, intervalMs - SPEED_STEP_MS);
      loop(); // aplica nova velocidade imediatamente
    }
  } else {
    snake.pop(); // mantém tamanho
  }

  updateHUD();
  draw();
}

function gameOver() {
  running = false;
  clearInterval(timer);
  msgEl.textContent = 'Game Over — clique em Reiniciar ou pressione barra de espaço.';

  // best score
  if (score > best) {
    best = score;
    localStorage.setItem('snake_best', String(best));
    updateHUD();
  }
}

// ==================== Desenho ====================
function draw() {
  // fundo
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // grid sutil (visual retrô)
  ctx.strokeStyle = 'rgba(28,255,102,0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + .5, 0);
    ctx.lineTo(i * CELL + .5, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL + .5);
    ctx.lineTo(CANVAS_SIZE, i * CELL + .5);
    ctx.stroke();
  }

  // comida (●)
  ctx.fillStyle = '#1cff66';
  ctx.beginPath();
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  ctx.arc(cx, cy, CELL * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // cobra (blocos verdes com “brilho”)
  ctx.fillStyle = '#30ff85';
  ctx.strokeStyle = 'rgba(28,255,102,.35)';
  snake.forEach(seg => {
    const x = seg.x * CELL;
    const y = seg.y * CELL;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeRect(x + .5, y + .5, CELL - 1, CELL - 1);
  });
}

// ==================== HUD / Controles ====================
function updateHUD() {
  scoreEl.textContent = String(score);
  bestEl.textContent  = String(best);
  speedEl.textContent = String(speedLvl);
}

function setDir(dx, dy) {
  // evita reverter 180° pelo nextDir
  if (dx === -dir.x && dy === -dir.y) return;
  nextDir = { x: dx, y: dy };
}

// Teclado
window.addEventListener('keydown', (e) => {
  // evita rolagem com setas
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'ArrowUp')    setDir(0,-1);
  if (e.key === 'ArrowDown')  setDir(0, 1);
  if (e.key === 'ArrowLeft')  setDir(-1,0);
  if (e.key === 'ArrowRight') setDir(1,0);

  if (e.key === ' ') {
    if (!running) start();
    else if (!paused) pause();
    else resume();
  }
});

// Botões
btnStart.addEventListener('click', start);
btnPause.addEventListener('click', pause);
btnReset.addEventListener('click', restart);

// Inicializa
reset();
