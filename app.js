// ─────────────────────────────────────────
// HAPTICS
// ─────────────────────────────────────────
const haptic = {
  tap:     () => navigator.vibrate && navigator.vibrate(10),
  double:  () => navigator.vibrate && navigator.vibrate([12, 60, 12]),
  heavy:   () => navigator.vibrate && navigator.vibrate(40),
  alert:   () => navigator.vibrate && navigator.vibrate([30, 80, 30, 80, 60]),
  success: () => navigator.vibrate && navigator.vibrate([15, 50, 30]),
};

// ─────────────────────────────────────────
// LOGO LOADER
// ─────────────────────────────────────────
(function () {
  ['logoWrap', 'pairLogoBox'].forEach(function (id) {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    const img = new Image();
    img.onload = function () {
      wrap.innerHTML = '';
      const i = document.createElement('img');
      i.src = 'sleeve-logo.png';
      i.alt = 'Sleeve';
      i.style.cssText = id === 'logoWrap'
        ? 'width:62px;height:62px;object-fit:contain;'
        : 'width:100%;height:100%;object-fit:contain;padding:12px;';
      wrap.appendChild(i);
    };
    img.src = 'sleeve-logo.png';
  });
})();

// ─────────────────────────────────────────
// SCREEN TRANSITIONS
// ─────────────────────────────────────────
function showScreen(id) {
  const cur = document.querySelector('.screen.active');
  if (cur) {
    cur.classList.add('exit');
    setTimeout(() => cur.classList.remove('active', 'exit'), 340);
  }
  setTimeout(() => document.getElementById('screen-' + id).classList.add('active'), 180);
}

// Auto-advance loading → pair
setTimeout(() => showScreen('pair'), 2500);

// ─────────────────────────────────────────
// PAIRING FLOW
// ─────────────────────────────────────────
let pairState = 'idle';

function startPairing() {
  if (pairState !== 'idle') return;
  pairState = 'searching';
  haptic.tap();

  document.querySelectorAll('.pair-ring').forEach(r => r.classList.add('pairing'));

  const s = document.getElementById('pairStatus');
  s.className = 'pair-status searching';
  s.textContent = 'Scanning for Sleeve device…';

  setTimeout(() => {
    haptic.double(); // device found pulse
    s.textContent = 'Device found nearby';
    document.getElementById('pairFoundCard').classList.add('visible');
    pairState = 'found';
  }, 2100);
}

function connectDevice() {
  const s = document.getElementById('pairStatus');
  haptic.tap();
  s.textContent = 'Connecting…';
  document.querySelector('.pair-connect-btn').textContent = '…';

  setTimeout(() => {
    haptic.success(); // connected!
    s.className = 'pair-status paired';
    s.textContent = '✓ Connected';
    setTimeout(() => showScreen('main'), 700);
  }, 1300);
}

// ─────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────
let activeTab = 'home';

function goTab(tab) {
  if (tab === activeTab) return;

  document.getElementById('tab-' + activeTab).classList.remove('show');
  document.getElementById('nav-' + activeTab).classList.remove('active');

  activeTab = tab;
  const el = document.getElementById('tab-' + tab);
  el.classList.remove('show');
  void el.offsetWidth; // force reflow for animation replay
  el.classList.add('show');
  document.getElementById('nav-' + tab).classList.add('active');

  if (tab === 'muscle') setTimeout(drawGraphs, 50);
  if (tab === 'alerts') setTimeout(triggerAlertHaptics, 100);
}

// ─────────────────────────────────────────
// ALERT HAPTICS
// ─────────────────────────────────────────
function triggerAlertHaptics() {
  const cards = document.querySelectorAll('#alertsList .alert-card');
  let delay = 0;

  cards.forEach(card => {
    const dot = card.querySelector('.a-dot');
    if (!dot || dot.classList.contains('gone')) return; // unread only

    const stripe = card.querySelector('.a-stripe');
    const sev = stripe
      ? (stripe.classList.contains('danger') ? 'danger'
        : stripe.classList.contains('warn') ? 'warn' : 'info')
      : 'info';

    setTimeout(() => {
      if (sev === 'danger')     haptic.alert();
      else if (sev === 'warn')  haptic.double();
      else                      haptic.tap();
    }, delay);

    delay += 350;
  });
}

// ─────────────────────────────────────────
// MODE SELECTION
// ─────────────────────────────────────────
let selectedMode = { icon: '✍️', name: 'Writing Mode' };

function selectMode(card, icon, name) {
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedMode = { icon, name };
}

function applyMode() {
  document.getElementById('homeModeIcon').textContent = selectedMode.icon;
  document.getElementById('homeModeText').textContent = selectedMode.name;
  showToast('Mode applied: ' + selectedMode.name);
}

function updateSpeed(v) {
  document.getElementById('speedVal').textContent = { 1: 'Slow', 2: 'Medium', 3: 'Fast' }[v];
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─────────────────────────────────────────
// CLEAR ALERTS
// ─────────────────────────────────────────
function clearAlerts() {
  const l = document.getElementById('alertsList');
  l.style.transition = 'opacity 0.3s';
  l.style.opacity = '0';
  setTimeout(() => {
    l.innerHTML = '<div style="text-align:center;color:var(--muted);padding:52px 0;font-size:14px;">No notifications</div>';
    l.style.opacity = '1';
    document.querySelector('.nav-dot').style.display = 'none';
  }, 300);
}

// ─────────────────────────────────────────
// GRAPH DRAWING
// ─────────────────────────────────────────
function drawWave(id, c1, c2, seed) {
  const canvas = document.getElementById(id);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth * dpr;
  const H = canvas.offsetHeight * dpr;
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  function makePts(off) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * W;
      const y = (H / 2)
        + Math.sin(i * 0.38 + seed + off) * H * 0.2
        + Math.sin(i * 0.85 + seed * 1.8 + off) * H * 0.09
        + (Math.random() - 0.5) * H * 0.05;
      pts.push({ x, y });
    }
    return pts;
  }

  function drawLine(pts, color) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(
        pts[i].x, pts[i].y,
        (pts[i].x + pts[i + 1].x) / 2,
        (pts[i].y + pts[i + 1].y) / 2
      );
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
  }

  if (c2) drawLine(makePts(1.6), c2);
  drawLine(makePts(0), c1);
}

function drawGraphs() {
  drawWave('muscleGraph', '#2d7a4f', '#4caf7d', 2.1);
  drawWave('bicepGraph',  '#d9943a', null,       5.4);
}

// ─────────────────────────────────────────
// LIVE MUSCLE VALUES
// ─────────────────────────────────────────
setInterval(() => {
  [
    { id: 'mv1', bar: 'mb1', base: 68 },
    { id: 'mv2', bar: 'mb2', base: 42 },
    { id: 'mv3', bar: 'mb3', base: 81 },
    { id: 'mv4', bar: 'mb4', base: 29 },
  ].forEach(d => {
    const v = Math.max(10, Math.min(99, d.base + Math.round((Math.random() - 0.5) * 9)));
    const el  = document.getElementById(d.id);
    const bar = document.getElementById(d.bar);
    if (el)  el.textContent  = v + ' µV';
    if (bar) bar.style.width = v + '%';
  });
}, 2000);
