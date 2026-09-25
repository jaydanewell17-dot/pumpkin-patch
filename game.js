const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const WORLD_W = 1500;
const WORLD_H = 2300;

const assets = {
  pumpkin: loadAsset('assets/pumpkin.svg'),
  pumpkinGold: loadAsset('assets/pumpkin-gold.svg'),
  tree: loadAsset('assets/tree.svg'),
  house: loadAsset('assets/house.svg'),
  barn: loadAsset('assets/barn.svg'),
  stand: loadAsset('assets/stand.svg'),
  haybale: loadAsset('assets/haybale.svg'),
  scarecrow: loadAsset('assets/scarecrow.svg'),
  wagon: loadAsset('assets/wagon.svg'),
};

function loadAsset(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function drawAsset(img, x, y, w, h, alpha = 1) {
  if (!img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  ctx.restore();
  return true;
}

const game = {
  day: 1,
  minutes: 8 * 60,
  money: 25,
  pumpkins: 0,
  messageTimer: 0,
  lastTime: 0,
};

const camera = {
  x: 500,
  y: 770,
};

const farm = { x: 110, y: 400, w: 590, h: 560 };
const field = { x: 160, y: 480, w: 490, h: 365 };
const stand = { x: 900, y: 560, w: 310, h: 180 };
const house = { x: 840, y: 255, w: 245, h: 200 };
const barn = { x: 1060, y: 1020, w: 250, h: 185 };
const path = { x: 0, y: 1810, w: WORLD_W, h: 320 };

const pumpkins = [];
const grassBlobs = [];
const trees = [];
const decorations = [];

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function worldFromScreen(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) * VIEW_W / rect.width;
  const sy = (clientY - rect.top) * VIEW_H / rect.height;
  return { x: sx + camera.x - VIEW_W / 2, y: sy + camera.y - VIEW_H / 2 };
}

function makeWorld() {
  for (let i = 0; i < 650; i++) {
    grassBlobs.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), s: rand(1, 5), a: rand(.08, .24) });
  }

  for (let i = 0; i < 58; i++) {
    let x = rand(45, WORLD_W - 45);
    let y = rand(100, WORLD_H - 120);
    if (x > farm.x - 70 && x < farm.x + farm.w + 70 && y > farm.y - 70 && y < farm.y + farm.h + 70) continue;
    if (x > stand.x - 90 && x < stand.x + stand.w + 90 && y > stand.y - 90 && y < stand.y + stand.h + 90) continue;
    trees.push({ x, y, r: rand(25, 34) });
  }

  decorations.push(
    { type: 'haybale', x: 770, y: 900, w: 82, h: 60 },
    { type: 'haybale', x: 865, y: 905, w: 82, h: 60 },
    { type: 'scarecrow', x: 220, y: 810, w: 72, h: 96 },
    { type: 'wagon', x: 720, y: 1910, w: 140, h: 86 },
  );

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 10; col++) {
      pumpkins.push({
        x: field.x + 26 + col * 47 + (row % 2 ? 10 : 0),
        y: field.y + 25 + row * 47,
        ready: true,
        size: rand(.82, 1.18),
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
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${suffix}`;
}

function pointInRect(point, rect, pad = 0) {
  return point.x >= rect.x - pad && point.x <= rect.x + rect.w + pad && point.y >= rect.y - pad && point.y <= rect.y + rect.h + pad;
}

function interactAt(point) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const p of pumpkins) {
    if (!p.ready) continue;
    const d = Math.hypot(point.x - p.x, point.y - p.y);
    if (d < 48 && d < nearestDistance) {
      nearest = p;
      nearestDistance = d;
    }
  }

  if (nearest) {
    nearest.ready = false;
    game.pumpkins += 1;
    setMessage('You harvested a pumpkin.');
    updateHud();
    return true;
  }

  if (pointInRect(point, stand, 70)) {
    if (game.pumpkins <= 0) {
      setMessage('You have no pumpkins to sell.');
      return true;
    }
    const earnings = game.pumpkins * 4;
    const sold = game.pumpkins;
    game.money += earnings;
    game.pumpkins = 0;
    setMessage(`Sold ${sold} pumpkin${sold === 1 ? '' : 's'} for $${earnings}.`);
    updateHud();
    return true;
  }

  return false;
}

function resetDay() {
  game.day += 1;
  game.minutes = 8 * 60;
  for (const p of pumpkins) p.ready = true;
  camera.x = 500;
  camera.y = 770;
  setMessage(`Day ${game.day}. The patch is open again.`);
}

function update(dt) {
  game.minutes += dt * (1 / 0.65);
  if (game.minutes >= 22 * 60) resetDay();

  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) document.getElementById('message').classList.remove('show');
  }

  camera.x = clamp(camera.x, VIEW_W / 2, WORLD_W - VIEW_W / 2);
  camera.y = clamp(camera.y, VIEW_H / 2, WORLD_H - VIEW_H / 2);
  updateHud();
}

function drawBackground() {
  const night = game.minutes >= 19 * 60;
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (night) {
    sky.addColorStop(0, '#2a3045');
    sky.addColorStop(1, '#4d5047');
  } else {
    sky.addColorStop(0, '#9aae77');
    sky.addColorStop(1, '#718b55');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  for (const b of grassBlobs) {
    const sx = b.x - camera.x + VIEW_W / 2;
    const sy = b.y - camera.y + VIEW_H / 2;
    if (sx < -8 || sy < -8 || sx > VIEW_W + 8 || sy > VIEW_H + 8) continue;
    ctx.fillStyle = night ? `rgba(27,34,24,${b.a})` : `rgba(43,61,31,${b.a})`;
    ctx.fillRect(Math.round(sx), Math.round(sy), b.s, b.s);
  }

  for (const t of trees) {
    const sx = t.x - camera.x + VIEW_W / 2;
    const sy = t.y - camera.y + VIEW_H / 2;
    if (sx < -70 || sy < -90 || sx > VIEW_W + 70 || sy > VIEW_H + 90) continue;
    const scale = t.r / 29;
    drawAsset(assets.tree, sx, sy + 7, 92 * scale, 108 * scale);
  }
}

function drawWorldRect(rect, fill, stroke = null) {
  const x = rect.x - camera.x + VIEW_W / 2;
  const y = rect.y - camera.y + VIEW_H / 2;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, rect.w, rect.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, rect.w, rect.h);
  }
}

function drawBuilding(rect, kind, label) {
  const cx = rect.x + rect.w / 2 - camera.x + VIEW_W / 2;
  const cy = rect.y + rect.h / 2 + 2 - camera.y + VIEW_H / 2;
  if (!drawAsset(assets[kind], cx, cy, rect.w + 50, rect.h + 50)) {
    drawWorldRect(rect, '#9b714e');
  }
  ctx.fillStyle = '#f5ddb3';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, rect.y + rect.h + 26 - camera.y + VIEW_H / 2);
  ctx.textAlign = 'left';
}

function drawFarm() {
  drawWorldRect(farm, '#8b6a47', 'rgba(74,48,28,.42)');
  drawWorldRect(field, '#6d5035');

  for (let row = 0; row < 7; row++) {
    const y = field.y + 36 + row * 47 - camera.y + VIEW_H / 2;
    ctx.fillStyle = 'rgba(46,31,19,.28)';
    ctx.fillRect(field.x - camera.x + VIEW_W / 2, y, field.w, 3);
  }

  for (const p of pumpkins) {
    if (!p.ready) continue;
    const sx = p.x - camera.x + VIEW_W / 2;
    const sy = p.y - camera.y + VIEW_H / 2;
    if (sx < -50 || sy < -50 || sx > VIEW_W + 50 || sy > VIEW_H + 50) continue;
    const img = p.variant > .84 ? assets.pumpkinGold : assets.pumpkin;
    const size = 42 * p.size;
    drawAsset(img, sx, sy, size, size * .9);
  }

  const left = farm.x - camera.x + VIEW_W / 2;
  const top = farm.y - camera.y + VIEW_H / 2;
  for (let x = farm.x + 8; x < farm.x + farm.w; x += 35) {
    ctx.fillStyle = '#9d875d';
    ctx.fillRect(x - camera.x + VIEW_W / 2, top - 10, 7, 15);
    ctx.fillRect(x - camera.x + VIEW_W / 2, top + farm.h - 5, 7, 15);
  }
}

function drawFestivalStand() {
  const cx = stand.x + stand.w / 2 - camera.x + VIEW_W / 2;
  const cy = stand.y + stand.h / 2 + 2 - camera.y + VIEW_H / 2;
  drawAsset(assets.stand, cx, cy, stand.w + 55, stand.h + 40);
  ctx.fillStyle = '#f5ddb3';
  ctx.font = '16px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('PUMPKIN STAND', cx, stand.y + stand.h + 28 - camera.y + VIEW_H / 2);
  ctx.font = '12px Georgia';
  ctx.fillStyle = '#d9c09f';
  ctx.fillText('Tap to sell', cx, stand.y + stand.h + 46 - camera.y + VIEW_H / 2);
  ctx.textAlign = 'left';
}

function drawPath() {
  drawWorldRect(path, '#a58d67');
  for (let x = 0; x < WORLD_W; x += 70) {
    ctx.fillStyle = 'rgba(78,57,34,.13)';
    ctx.fillRect(x - camera.x + VIEW_W / 2 + 14, path.y - camera.y + VIEW_H / 2 + 28 + (x % 3) * 10, 28, 5);
  }
}

function drawDecorations() {
  for (const d of decorations) {
    const sx = d.x - camera.x + VIEW_W / 2;
    const sy = d.y - camera.y + VIEW_H / 2;
    drawAsset(assets[d.type], sx, sy, d.w, d.h);
  }
}

function drawZoneLabels() {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,221,179,.76)';
  ctx.font = '18px Georgia';
  const patchX = farm.x + farm.w / 2 - camera.x + VIEW_W / 2;
  const patchY = farm.y - 20 - camera.y + VIEW_H / 2;
  ctx.fillText('PUMPKIN PATCH', patchX, patchY);
  ctx.textAlign = 'left';
}

function drawLighting() {
  const evening = Math.max(0, (game.minutes - 17 * 60) / (2 * 60));
  const night = game.minutes >= 19 * 60;
  const alpha = night ? .43 : evening * .2;
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(15,19,34,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function draw() {
  drawBackground();
  drawPath();
  drawFarm();
  drawBuilding(house, 'house', 'HOUSE');
  drawBuilding(barn, 'barn', 'BARN');
  drawFestivalStand();
  drawDecorations();
  drawZoneLabels();
  drawLighting();
}

let gesture = null;
canvas.addEventListener('pointerdown', (e) => {
  gesture = {
    id: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    moved: false,
  };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!gesture || e.pointerId !== gesture.id) return;
  const dx = e.clientX - gesture.lastX;
  const dy = e.clientY - gesture.lastY;
  if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 8) gesture.moved = true;
  camera.x -= dx * VIEW_W / canvas.getBoundingClientRect().width;
  camera.y -= dy * VIEW_H / canvas.getBoundingClientRect().height;
  gesture.lastX = e.clientX;
  gesture.lastY = e.clientY;
});

canvas.addEventListener('pointerup', (e) => {
  if (!gesture || e.pointerId !== gesture.id) return;
  if (!gesture.moved) interactAt(worldFromScreen(e.clientX, e.clientY));
  gesture = null;
});

canvas.addEventListener('pointercancel', () => { gesture = null; });

document.getElementById('focus-button').addEventListener('click', () => {
  camera.x = 500;
  camera.y = 770;
  setMessage('Back at the pumpkin patch.');
});

window.addEventListener('keydown', (e) => {
  const pan = 80;
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') camera.x -= pan;
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') camera.x += pan;
  if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') camera.y -= pan;
  if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') camera.y += pan;
  camera.x = clamp(camera.x, VIEW_W / 2, WORLD_W - VIEW_W / 2);
  camera.y = clamp(camera.y, VIEW_H / 2, WORLD_H - VIEW_H / 2);
});

function loop(timestamp) {
  const dt = Math.min(.04, (timestamp - game.lastTime) / 1000 || 0);
  game.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

makeWorld();
updateHud();
setMessage('The patch is open. Swipe around and tap a pumpkin to harvest it.');
requestAnimationFrame(loop);
