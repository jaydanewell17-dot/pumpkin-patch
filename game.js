const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const WORLD_W = 1900;
const WORLD_H = 2700;

const assets = {
  pumpkin: loadAsset('assets/pumpkin.svg'), pumpkinGold: loadAsset('assets/pumpkin-gold.svg'),
  tree: loadAsset('assets/tree.svg'), house: loadAsset('assets/house.svg'), barn: loadAsset('assets/barn.svg'),
  stand: loadAsset('assets/stand.svg'), haybale: loadAsset('assets/haybale.svg'), scarecrow: loadAsset('assets/scarecrow.svg'), wagon: loadAsset('assets/wagon.svg'),
  cider: loadAsset('assets/cider-stand.svg'), cocoa: loadAsset('assets/cocoa-stand.svg'), caramel: loadAsset('assets/caramel-stand.svg'), donuts: loadAsset('assets/donut-stand.svg'),
  gate: loadAsset('assets/festival-gate.svg'), stage: loadAsset('assets/stage.svg'), fire: loadAsset('assets/bonfire.svg'), picnic: loadAsset('assets/picnic.svg'), lights: loadAsset('assets/lights.svg'), visitor: loadAsset('assets/visitor.svg'), sign: loadAsset('assets/sign.svg')
};
function loadAsset(src) { const img = new Image(); img.src = src; return img; }
function drawAsset(img, x, y, w, h, alpha = 1) { if (!img.complete || !img.naturalWidth) return false; ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h); ctx.restore(); return true; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function screenPoint(clientX, clientY) { const rect = canvas.getBoundingClientRect(); return { x: (clientX - rect.left) * VIEW_W / rect.width, y: (clientY - rect.top) * VIEW_H / rect.height }; }
function worldFromScreen(clientX, clientY) { const s = screenPoint(clientX, clientY); return { x: s.x + camera.x - VIEW_W / 2, y: s.y + camera.y - VIEW_H / 2 }; }

const game = {
  day: 1, minutes: 8 * 60, money: 25, pumpkins: 0, messageTimer: 0, festivalOpen: false, lastTime: 0,
  stands: {
    pumpkin: { name: 'Pumpkin Stand', stock: 4, max: 8, price: 4, asset: 'stand', x: 1030, y: 900, w: 310, h: 180, fuel: 'pumpkins' },
    cider: { name: 'Cider Stand', stock: 3, max: 8, price: 6, restock: 8, asset: 'cider', x: 1390, y: 760, w: 280, h: 160 },
    cocoa: { name: 'Cocoa Stand', stock: 3, max: 8, price: 7, restock: 9, asset: 'cocoa', x: 1390, y: 1080, w: 280, h: 160 },
    caramel: { name: 'Caramel Apple Stand', stock: 3, max: 8, price: 8, restock: 10, asset: 'caramel', x: 1030, y: 1220, w: 280, h: 160 },
    donuts: { name: 'Donut Stand', stock: 3, max: 8, price: 7, restock: 9, asset: 'donuts', x: 1390, y: 1390, w: 280, h: 160 }
  }
};
const camera = { x: 650, y: 1080 };
const farm = { x: 100, y: 430, w: 640, h: 590 };
const field = { x: 150, y: 520, w: 530, h: 400 };
const house = { x: 850, y: 260, w: 245, h: 200 };
const barn = { x: 555, y: 1060, w: 250, h: 185 };
const festival = { x: 840, y: 590, w: 850, h: 1080 };
const gate = { x: 1260, y: 580, w: 340, h: 260 };
const stage = { x: 1160, y: 1600, w: 460, h: 300 };
const fire = { x: 1050, y: 1480, w: 180, h: 180 };
const path = { x: 0, y: 2110, w: WORLD_W, h: 300 };
const pumpkins = [];
const grass = [];
const trees = [];
const festivalDecor = [];
const visitors = [];

function pointInRect(p, r, pad = 0) { return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; }
function rectCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

function makeWorld() {
  for (let i = 0; i < 850; i++) grass.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), s: rand(1, 5), a: rand(.08, .22) });
  for (let i = 0; i < 85; i++) {
    const x = rand(40, WORLD_W - 40), y = rand(100, WORLD_H - 120);
    if (x > farm.x - 80 && x < farm.x + farm.w + 80 && y > farm.y - 80 && y < farm.y + farm.h + 80) continue;
    if (pointInRect({x, y}, festival, 90)) continue;
    trees.push({ x, y, s: rand(.82, 1.2) });
  }
  for (let row = 0; row < 8; row++) for (let col = 0; col < 11; col++) pumpkins.push({ x: field.x + 26 + col * 48 + (row % 2 ? 9 : 0), y: field.y + 28 + row * 47, ready: true, size: rand(.84, 1.18), variant: Math.random() });
  festivalDecor.push(
    { asset: 'haybale', x: 930, y: 930, w: 82, h: 60 }, { asset: 'haybale', x: 1010, y: 930, w: 82, h: 60 },
    { asset: 'picnic', x: 1090, y: 1080, w: 170, h: 128 }, { asset: 'picnic', x: 1170, y: 1230, w: 170, h: 128 },
    { asset: 'picnic', x: 1460, y: 1260, w: 170, h: 128 }, { asset: 'picnic', x: 1510, y: 1480, w: 170, h: 128 },
    { asset: 'sign', x: 850, y: 760, w: 120, h: 120 }, { asset: 'wagon', x: 760, y: 2090, w: 140, h: 86 },
    { asset: 'scarecrow', x: 220, y: 855, w: 72, h: 96 }
  );
}

function festivalIsOpen() { return game.minutes >= 10 * 60 && game.minutes < 20 * 60; }
function timeTillOpen() {
  if (game.minutes < 10 * 60) return `${formatTime(10 * 60 - (game.minutes % 1440))} until opening`;
  if (game.minutes >= 20 * 60) return 'Festival closed for the night';
  return 'Festival is open';
}
function formatTime(minutes) {
  let total = Math.floor(minutes) % 1440; if (total < 0) total += 1440;
  let hour = Math.floor(total / 60); const min = String(Math.floor(total % 60)).padStart(2, '0');
  const suffix = hour >= 12 ? 'PM' : 'AM'; hour %= 12; if (hour === 0) hour = 12; return `${hour}:${min} ${suffix}`;
}
function restockStand(s) {
  if (s.fuel === 'pumpkins') {
    const need = s.max - s.stock;
    const used = Math.min(need, game.pumpkins);
    if (!used) { setMessage('Harvest more pumpkins before stocking this stand.'); return; }
    s.stock += used; game.pumpkins -= used; setMessage(`Stocked ${s.name} with ${used} pumpkin${used === 1 ? '' : 's'}.`);
    updateHud(); return;
  }
  const need = s.max - s.stock; if (need <= 0) { setMessage(`${s.name} is fully stocked.`); return; }
  const affordable = Math.floor(game.money / s.restock); const bought = Math.min(need, affordable);
  if (!bought) { setMessage(`You need $${s.restock} to restock ${s.name}.`); return; }
  game.money -= bought * s.restock; s.stock += bought; setMessage(`Restocked ${s.name} by ${bought}.`); updateHud();
}

function spawnVisitor() {
  if (!festivalIsOpen() || visitors.length >= 10) return;
  const choices = Object.keys(game.stands).filter(k => game.stands[k].stock > 0);
  const target = choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
  const x = gate.x + gate.w / 2 + rand(-90, 90), y = gate.y + gate.h + rand(-20, 45);
  visitors.push({ x, y, target, wait: rand(1, 5), bought: false, speed: rand(26, 48), seed: Math.random() * 10 });
}
function moveVisitor(v, dt) {
  if (!game.festivalOpen) return;
  let tx = v.x + Math.cos(v.seed + game.minutes / 80) * 60, ty = v.y + Math.sin(v.seed + game.minutes / 95) * 60;
  if (v.target && game.stands[v.target].stock > 0 && !v.bought) { const c = rectCenter(game.stands[v.target]); tx = c.x + rand(-35, 35); ty = c.y + 100; }
  else if (v.bought || !v.target) { tx = gate.x + gate.w / 2 + Math.sin(v.seed + game.minutes / 25) * 110; ty = gate.y + gate.h + 35; }
  const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy) || 1;
  v.x += dx / d * v.speed * dt; v.y += dy / d * v.speed * dt;
  if (v.target && !v.bought && d < 75 && v.wait <= 0) {
    const s = game.stands[v.target];
    if (s.stock > 0 && game.festivalOpen) { s.stock--; game.money += s.price; v.bought = true; setMessage(`${s.name}: a visitor made a purchase for $${s.price}.`); updateHud(); }
    v.wait = rand(2, 5);
  }
  v.wait -= dt;
}
function cleanupVisitors() { for (let i = visitors.length - 1; i >= 0; i--) if (visitors[i].y < gate.y - 30 || (visitors[i].bought && Math.hypot(visitors[i].x - (gate.x + gate.w / 2), visitors[i].y - (gate.y + gate.h)) < 65 && Math.random() < .01)) visitors.splice(i, 1); }

function setMessage(text) { const el = document.getElementById('message'); el.textContent = text; el.classList.add('show'); game.messageTimer = 3; }
function updateHud() { document.getElementById('day-value').textContent = game.day; document.getElementById('time-value').textContent = formatTime(game.minutes); document.getElementById('money-value').textContent = `$${game.money}`; document.getElementById('pumpkin-value').textContent = game.pumpkins; updateStatus(); }
function updateStatus() {
  const open = festivalIsOpen(); game.festivalOpen = open; const dot = document.getElementById('festival-dot');
  dot.classList.toggle('open', open); document.getElementById('festival-status').textContent = open ? `Festival open · ${visitors.length} guests` : (game.minutes < 10 * 60 ? `Opens at 10:00 AM` : `Festival closed · opens again at 10:00 AM`);
  document.getElementById('instruction-copy').textContent = open ? 'Swipe to explore. Tap a stall to manage stock.' : 'Swipe to explore. The festival opens at 10:00 AM.';
}

function interactAt(p) {
  for (const pumpkin of pumpkins) if (pumpkin.ready && Math.hypot(p.x - pumpkin.x, p.y - pumpkin.y) < 48) { pumpkin.ready = false; game.pumpkins++; setMessage('You harvested a pumpkin.'); updateHud(); return; }
  if (pointInRect(p, gate, 90)) { camera.x = gate.x + gate.w / 2; camera.y = gate.y + gate.h + 230; setMessage(festivalIsOpen() ? 'Welcome to the festival.' : 'The festival gate is closed right now.'); return; }
  for (const [key, s] of Object.entries(game.stands)) if (pointInRect(p, s, 75)) { if (!festivalIsOpen()) { setMessage('The festival stalls are closed.'); return; } restockStand(s); return; }
  if (pointInRect(p, stage, 90)) { setMessage('The harvest stage is ready for the festival activities in Stage 3.'); return; }
  if (pointInRect(p, fire, 80)) { setMessage('The bonfire area is ready for evening festival events.'); return; }
}
function resetDay() { game.day++; game.minutes = 8 * 60; game.money += 8; game.pumpkins = 0; for (const p of pumpkins) p.ready = true; for (const s of Object.values(game.stands)) s.stock = Math.min(s.max, 3); visitors.length = 0; camera.x = 650; camera.y = 1080; setMessage(`Day ${game.day}. You earned $8 from the patch overnight.`); updateHud(); }

function drawBackground() {
  const night = game.minutes >= 19 * 60, evening = game.minutes >= 17 * 60;
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (night) { sky.addColorStop(0, '#242a3b'); sky.addColorStop(1, '#4d5147'); } else if (evening) { sky.addColorStop(0, '#9b805f'); sky.addColorStop(1, '#667b51'); } else { sky.addColorStop(0, '#a6ba80'); sky.addColorStop(1, '#718c56'); }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const b of grass) { const sx = b.x - camera.x + VIEW_W / 2, sy = b.y - camera.y + VIEW_H / 2; if (sx < -8 || sy < -8 || sx > VIEW_W + 8 || sy > VIEW_H + 8) continue; ctx.fillStyle = night ? `rgba(27,34,24,${b.a})` : `rgba(43,61,31,${b.a})`; ctx.fillRect(sx, sy, b.s, b.s); }
  for (const t of trees) { const sx = t.x - camera.x + VIEW_W / 2, sy = t.y - camera.y + VIEW_H / 2; if (sx < -80 || sy < -100 || sx > VIEW_W + 80 || sy > VIEW_H + 100) continue; drawAsset(assets.tree, sx, sy + 7, 92 * t.s, 108 * t.s); }
}
function drawRect(r, fill, stroke) { const x = r.x - camera.x + VIEW_W / 2, y = r.y - camera.y + VIEW_H / 2; ctx.fillStyle = fill; ctx.fillRect(x, y, r.w, r.h); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.strokeRect(x, y, r.w, r.h); } }
function label(text, x, y, size = 15, color = '#f5ddb3') { ctx.save(); ctx.textAlign = 'center'; ctx.font = `${size}px Georgia`; ctx.fillStyle = color; ctx.fillText(text, x - camera.x + VIEW_W / 2, y - camera.y + VIEW_H / 2); ctx.restore(); }
function drawFarm() {
  drawRect(farm, '#8b6a47', 'rgba(74,48,28,.42)'); drawRect(field, '#6d5035');
  for (let row = 0; row < 8; row++) { const y = field.y + 38 + row * 47 - camera.y + VIEW_H / 2; ctx.fillStyle = 'rgba(46,31,19,.28)'; ctx.fillRect(field.x - camera.x + VIEW_W / 2, y, field.w, 3); }
  for (const p of pumpkins) if (p.ready) { const sx = p.x - camera.x + VIEW_W / 2, sy = p.y - camera.y + VIEW_H / 2; if (sx < -50 || sy < -50 || sx > VIEW_W + 50 || sy > VIEW_H + 50) continue; const img = p.variant > .84 ? assets.pumpkinGold : assets.pumpkin; drawAsset(img, sx, sy, 42 * p.size, 38 * p.size); }
}
function drawBuilding(r, asset, name) { const c = rectCenter(r); drawAsset(assets[asset], c.x - camera.x + VIEW_W / 2, c.y - camera.y + VIEW_H / 2, r.w + 50, r.h + 50); label(name, c.x, r.y + r.h + 25); }
function drawFestival() {
  drawRect(festival, game.festivalOpen ? '#806443' : '#745a42', 'rgba(73,45,27,.46)');
  drawRect({ x: festival.x + 50, y: festival.y + 205, w: 750, h: 55 }, '#a48b68');
  drawRect({ x: festival.x + 50, y: festival.y + 470, w: 750, h: 55 }, '#a48b68');
  drawAsset(assets.gate, gate.x + gate.w / 2 - camera.x + VIEW_W / 2, gate.y + gate.h / 2 - camera.y + VIEW_H / 2, gate.w, gate.h);
  drawAsset(assets.stage, stage.x + stage.w / 2 - camera.x + VIEW_W / 2, stage.y + stage.h / 2 - camera.y + VIEW_H / 2, stage.w, stage.h);
  drawAsset(assets.fire, fire.x + fire.w / 2 - camera.x + VIEW_W / 2, fire.y + fire.h / 2 - camera.y + VIEW_H / 2, fire.w, fire.h);
  drawAsset(assets.lights, festival.x + 390 - camera.x + VIEW_W / 2, festival.y + 285 - camera.y + VIEW_H / 2, 600, 100, game.minutes >= 17 * 60 ? 1 : .72);
  for (const [key, s] of Object.entries(game.stands)) { const c = rectCenter(s); drawAsset(assets[s.asset], c.x - camera.x + VIEW_W / 2, c.y - camera.y + VIEW_H / 2, s.w + 35, s.h + 32); label(s.name, c.x, s.y + s.h + 26, 13); ctx.save(); ctx.textAlign = 'center'; ctx.font = '12px Georgia'; ctx.fillStyle = game.festivalOpen ? '#f2d7ae' : '#b6a18b'; ctx.fillText(`Stock ${s.stock}/${s.max}`, c.x - camera.x + VIEW_W / 2, s.y + s.h + 43 - camera.y + VIEW_H / 2); if (game.festivalOpen) ctx.fillText('Tap to restock', c.x - camera.x + VIEW_W / 2, s.y + s.h + 59 - camera.y + VIEW_H / 2); ctx.restore(); }
  label('FESTIVAL GROUNDS', festival.x + festival.w / 2, festival.y - 22, 18);
}
function drawDecor() { for (const d of festivalDecor) drawAsset(assets[d.asset], d.x - camera.x + VIEW_W / 2, d.y - camera.y + VIEW_H / 2, d.w, d.h); }
function drawVisitors() { for (const v of visitors) drawAsset(assets.visitor, v.x - camera.x + VIEW_W / 2, v.y - camera.y + VIEW_H / 2, 54, 74); }
function drawPath() { drawRect(path, '#a58d67'); for (let x = 0; x < WORLD_W; x += 70) { ctx.fillStyle = 'rgba(78,57,34,.13)'; ctx.fillRect(x - camera.x + VIEW_W / 2 + 14, path.y - camera.y + VIEW_H / 2 + 28 + (x % 3) * 10, 28, 5); } }
function drawLighting() { const night = game.minutes >= 19 * 60; const evening = Math.max(0, (game.minutes - 17 * 60) / (2 * 60)); const alpha = night ? .43 : evening * .2; if (!alpha) return; ctx.fillStyle = `rgba(15,19,34,${alpha})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
function draw() { drawBackground(); drawPath(); drawFarm(); drawBuilding(house, 'house', 'HOUSE'); drawBuilding(barn, 'barn', 'BARN'); drawFestival(); drawDecor(); drawVisitors(); drawLighting(); }

let gesture = null;
canvas.addEventListener('pointerdown', e => { gesture = { id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; const dx = e.clientX - gesture.lastX, dy = e.clientY - gesture.lastY; if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 8) gesture.moved = true; camera.x -= dx * VIEW_W / canvas.getBoundingClientRect().width; camera.y -= dy * VIEW_H / canvas.getBoundingClientRect().height; camera.x = clamp(camera.x, VIEW_W / 2, WORLD_W - VIEW_W / 2); camera.y = clamp(camera.y, VIEW_H / 2, WORLD_H - VIEW_H / 2); gesture.lastX = e.clientX; gesture.lastY = e.clientY; });
canvas.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; if (!gesture.moved) interactAt(worldFromScreen(e.clientX, e.clientY)); gesture = null; });
canvas.addEventListener('pointercancel', () => gesture = null);

document.getElementById('home-button').addEventListener('click', () => { camera.x = house.x + house.w / 2; camera.y = house.y + house.h / 2; setMessage('Back at your house.'); });
document.getElementById('patch-button').addEventListener('click', () => { camera.x = farm.x + farm.w / 2; camera.y = farm.y + farm.h / 2; setMessage('Back at the pumpkin patch.'); });
window.addEventListener('keydown', e => { const pan = 80; if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') camera.x -= pan; if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') camera.x += pan; if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') camera.y -= pan; if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') camera.y += pan; camera.x = clamp(camera.x, VIEW_W / 2, WORLD_W - VIEW_W / 2); camera.y = clamp(camera.y, VIEW_H / 2, WORLD_H - VIEW_H / 2); });

function update(dt) {
  const wasOpen = game.festivalOpen;
  game.minutes += dt * (1 / .65);
  if (game.minutes >= 20 * 60 && game.minutes < 20 * 60 + dt * 2) setMessage('The festival is closing. Guests are heading home.');
  if (game.minutes >= 22 * 60) resetDay();
  const open = festivalIsOpen();
  if (open && !wasOpen) { setMessage('The festival is open. Guests are arriving.'); }
  if (!open && wasOpen && game.minutes >= 20 * 60) { for (const s of Object.values(game.stands)) s.stock = Math.min(s.max, s.stock); }
  if (open && Math.random() < dt * .55) spawnVisitor();
  for (const v of visitors) moveVisitor(v, dt); cleanupVisitors();
  if (game.messageTimer > 0) { game.messageTimer -= dt; if (game.messageTimer <= 0) document.getElementById('message').classList.remove('show'); }
  updateHud();
}
function loop(t) { const dt = Math.min(.04, (t - game.lastTime) / 1000 || 0); game.lastTime = t; update(dt); draw(); requestAnimationFrame(loop); }

makeWorld(); updateHud(); setMessage('Harvest pumpkins before 10:00 AM, then explore the festival.'); requestAnimationFrame(loop);
