const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
const heldDirections = new Set();

const game = {
  day: 1,
  minutes: 8 * 60,
  money: 25,
  pumpkins: 0,
  messageTimer: 0,
  lastTime: 0,
  ended: false,
};

const player = {
  x: 475,
  y: 392,
  speed: 180,
  radius: 12,
};

const farm = { x: 75, y: 145, w: 400, h: 285 };
const field = { x: 110, y: 190, w: 305, h: 190 };
const stand = { x: 675, y: 206, w: 175, h: 110 };
const house = { x: 535, y: 150, w: 135, h: 105 };
const barn = { x: 715, y: 350, w: 135, h: 95 };
const path = { x: 0, y: 430, w: W, h: 95 };

const pumpkins = [];
const grassBlobs = [];
const trees = [];

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function makeWorld() {
  for (let i = 0; i < 220; i++) {
    grassBlobs.push({ x: rand(0, W), y: rand(0, H), s: rand(1, 4), a: rand(.12, .3) });
  }

  for (let i = 0; i < 20; i++) {
    let x = rand(30, W - 30);
    let y = rand(65, 405);
    if (x > farm.x - 30 && x < farm.x + farm.w + 30 && y > farm.y - 30 && y < farm.y + farm.h + 30) continue;
    if (x > stand.x - 40 && x < stand.x + stand.w + 40 && y > stand.y - 40 && y < stand.y + stand.h + 40) continue;
    trees.push({ x, y, r: rand(16, 24), tone: Math.random() });
  }

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      pumpkins.push({
        x: field.x + 22 + col * 43 + (row % 2 ? 8 : 0),
        y: field.y + 20 + row * 34,
        ready: true,
        size: rand(.85, 1.12),
        variant: Math.random(),
      });
    }
  }
}

function setMessage(text) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.classList.add('show');
  game.messageTimer = 2.4;
}

function updateHud() {
  document.getElementById('day-value').textContent = game.day;
  document.getElementById('time-value').textContent = formatTime(game.minutes);
  document.getElementById('money-value').textContent = `$${game.money}`;
  document.getElementById('pumpkin-value').textContent = game.pumpkins;
}

function formatTime(minutes) {
  let total = Math.floor(minutes) % (24 * 60);
  let hour = Math.floor(total / 60);
  const min = Math.floor(total % 60).toString().padStart(2, '0');
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${suffix}`;
}

function currentNearbyObject() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const p of pumpkins) {
    if (!p.ready) continue;
    const d = distance(player, p);
    if (d < 30 && d < nearestDistance) {
      nearest = { type: 'pumpkin', target: p };
      nearestDistance = d;
    }
  }

  const sellPoint = { x: stand.x + stand.w / 2, y: stand.y + stand.h + 16 };
  const sellDistance = distance(player, sellPoint);
  if (sellDistance < 60 && sellDistance < nearestDistance) {
    nearest = { type: 'sell' };
    nearestDistance = sellDistance;
  }

  return nearest;
}

function interact() {
  const nearby = currentNearbyObject();
  if (!nearby) return;

  if (nearby.type === 'pumpkin') {
    nearby.target.ready = false;
    game.pumpkins += 1;
    setMessage('You harvested a pumpkin.');
  }

  if (nearby.type === 'sell') {
    if (game.pumpkins <= 0) {
      setMessage('You have no pumpkins to sell.');
      return;
    }
    const earnings = game.pumpkins * 4;
    game.money += earnings;
    const sold = game.pumpkins;
    game.pumpkins = 0;
    setMessage(`Sold ${sold} pumpkin${sold === 1 ? '' : 's'} for $${earnings}.`);
  }

  updateHud();
}

function resetDay() {
  game.day += 1;
  game.minutes = 8 * 60;
  for (const p of pumpkins) p.ready = true;
  player.x = 475;
  player.y = 392;
  setMessage(`Day ${game.day}. The patch is open again.`);
}

function update(dt) {
  if (game.ended) return;

  let dx = 0;
  let dy = 0;

  if (keys.has('w') || keys.has('arrowup') || heldDirections.has('up')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown') || heldDirections.has('down')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft') || heldDirections.has('left')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright') || heldDirections.has('right')) dx += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
  }

  player.x = clamp(player.x, 22, W - 22);
  player.y = clamp(player.y, 70, H - 24);

  // Simple time progression: one in-game minute every 0.65 real seconds.
  game.minutes += dt * (1 / 0.65);
  if (game.minutes >= 22 * 60) resetDay();

  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) document.getElementById('message').classList.remove('show');
  }

  const nearby = currentNearbyObject();
  const hint = document.getElementById('interact-hint');
  hint.classList.toggle('show', !!nearby);
  if (nearby?.type === 'pumpkin') hint.textContent = 'Press E to pick pumpkin';
  else if (nearby?.type === 'sell') hint.textContent = 'Press E to sell pumpkins';

  updateHud();
}

function drawBackground() {
  const night = game.minutes >= 19 * 60;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (night) {
    sky.addColorStop(0, '#253046');
    sky.addColorStop(1, '#4d5247');
  } else {
    sky.addColorStop(0, '#89a86f');
    sky.addColorStop(1, '#728e58');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const b of grassBlobs) {
    ctx.fillStyle = night ? `rgba(30,40,25,${b.a})` : `rgba(42,64,30,${b.a})`;
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
  }

  for (const t of trees) {
    ctx.fillStyle = '#725338';
    ctx.fillRect(t.x - 4, t.y + 8, 8, 18);
    const leaf = t.tone > .5 ? '#6f713d' : '#866640';
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuilding(rect, roofColor, wallColor, label) {
  ctx.fillStyle = 'rgba(20, 15, 10, .22)';
  ctx.fillRect(rect.x + 7, rect.y + 7, rect.w, rect.h);
  ctx.fillStyle = wallColor;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(rect.x - 7, rect.y);
  ctx.lineTo(rect.x + rect.w / 2, rect.y - 35);
  ctx.lineTo(rect.x + rect.w + 7, rect.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d291f';
  ctx.fillRect(rect.x + rect.w / 2 - 14, rect.y + rect.h - 52, 28, 52);
  ctx.fillStyle = '#f5ddb3';
  ctx.font = '12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h + 16);
  ctx.textAlign = 'left';
}

function drawFarm() {
  ctx.fillStyle = '#8b6a47';
  ctx.fillRect(farm.x, farm.y, farm.w, farm.h);
  ctx.strokeStyle = 'rgba(74,48,28,.42)';
  ctx.lineWidth = 3;
  ctx.strokeRect(farm.x, farm.y, farm.w, farm.h);

  ctx.fillStyle = '#6d5035';
  ctx.fillRect(field.x, field.y, field.w, field.h);

  for (let row = 0; row < 5; row++) {
    ctx.fillStyle = 'rgba(46,31,19,.28)';
    ctx.fillRect(field.x, field.y + 28 + row * 34, field.w, 3);
  }

  for (const p of pumpkins) {
    if (!p.ready) continue;
    const s = 10 * p.size;
    ctx.fillStyle = p.variant > .8 ? '#d9ad5e' : '#c97d2e';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * .76, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e5129';
    ctx.fillRect(p.x - 1.5, p.y - s - 2, 3, 5);
  }

  ctx.fillStyle = '#9d875d';
  for (let x = farm.x + 8; x < farm.x + farm.w; x += 30) {
    ctx.fillRect(x, farm.y - 8, 6, 12);
    ctx.fillRect(x, farm.y + farm.h - 4, 6, 12);
  }
}

function drawFestivalStand() {
  ctx.fillStyle = 'rgba(20,15,10,.25)';
  ctx.fillRect(stand.x + 8, stand.y + 9, stand.w, stand.h);
  ctx.fillStyle = '#b66f42';
  ctx.fillRect(stand.x, stand.y, stand.w, stand.h);
  ctx.fillStyle = '#6f3c2b';
  ctx.fillRect(stand.x - 5, stand.y - 18, stand.w + 10, 26);
  ctx.fillStyle = '#e3c48d';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(stand.x + i * 26, stand.y - 18, 13, 26);
  }
  ctx.fillStyle = '#fff0d3';
  ctx.font = 'bold 15px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('PUMPKIN STAND', stand.x + stand.w / 2, stand.y + 43);
  ctx.font = '12px Georgia';
  ctx.fillText('$4 each', stand.x + stand.w / 2, stand.y + 65);
  ctx.textAlign = 'left';
}

function drawPath() {
  ctx.fillStyle = '#a58d67';
  ctx.fillRect(path.x, path.y, path.w, path.h);
  for (let x = 0; x < W; x += 55) {
    ctx.fillStyle = 'rgba(78,57,34,.13)';
    ctx.fillRect(x + 12, path.y + 24 + (x % 3) * 8, 22, 5);
  }
}

function drawPlayer() {
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 10, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f3d1b1';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 7, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d2c22';
  ctx.fillRect(player.x - 8, player.y - 16, 16, 4);
  ctx.fillRect(player.x - 5, player.y - 20, 10, 5);

  ctx.fillStyle = '#7a4831';
  ctx.fillRect(player.x - 8, player.y + 1, 16, 15);
  ctx.fillStyle = '#42302b';
  ctx.fillRect(player.x - 8, player.y + 15, 6, 7);
  ctx.fillRect(player.x + 2, player.y + 15, 6, 7);
}

function drawLighting() {
  const evening = Math.max(0, (game.minutes - 17 * 60) / (2 * 60));
  const night = game.minutes >= 19 * 60;
  let alpha = night ? .43 : evening * .2;
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(15,19,34,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function draw() {
  drawBackground();
  drawPath();
  drawFarm();
  drawBuilding(house, '#6d4031', '#b98d61', 'HOUSE');
  drawBuilding(barn, '#594536', '#99683f', 'BARN');
  drawFestivalStand();
  drawPlayer();
  drawLighting();

  const nearby = currentNearbyObject();
  if (nearby?.type === 'pumpkin') {
    ctx.strokeStyle = 'rgba(255,236,191,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nearby.target.x, nearby.target.y, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(key)) e.preventDefault();
  keys.add(key);
  if (key === 'e' && !e.repeat) interact();
});

window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

for (const button of document.querySelectorAll('.control')) {
  const dir = button.dataset.dir;
  const start = (e) => { e.preventDefault(); heldDirections.add(dir); };
  const end = (e) => { e.preventDefault(); heldDirections.delete(dir); };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('pointerleave', end);
}

canvas.addEventListener('pointerdown', () => canvas.focus());

function loop(timestamp) {
  const dt = Math.min(.04, (timestamp - game.lastTime) / 1000 || 0);
  game.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

makeWorld();
updateHud();
setMessage('The patch is open. Pick pumpkins and sell them at the stand.');
requestAnimationFrame(loop);
