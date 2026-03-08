/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║  SLEEVE — app.js                                              ║
  ║  All interactivity lives here.                                ║
  ║  Made by Kevin · Protected under DMCA Copyright Law          ║
  ╚═══════════════════════════════════════════════════════════════╝
*/

// ─────────────────────────────────────────
// HAPTICS
// Works on Android Chrome. Silent on iOS (Safari blocks it).
// ─────────────────────────────────────────
const haptic = {
  tap:     () => navigator.vibrate?.(10),
  double:  () => navigator.vibrate?.([12, 60, 12]),
  alert:   () => navigator.vibrate?.([30, 80, 30, 80, 60]),
  success: () => navigator.vibrate?.([15, 50, 30]),
};

// ─────────────────────────────────────────
// LOGO — swaps SVG fallback for sleeve-logo.png if found
// ─────────────────────────────────────────
(function () {
  const img = new Image();
  img.onload = () => {
    ['pairLogoBox'].forEach(id => {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.innerHTML = '';
      const i = document.createElement('img');
      i.src = 'sleeve-logo.png'; i.alt = 'Sleeve';
      i.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:10px;';
      wrap.appendChild(i);
    });
  };
  img.src = 'sleeve-logo.png';
})();

// ─────────────────────────────────────────
// SCREEN TRANSITIONS
// Fades between loading → pair → main
// ─────────────────────────────────────────
function showScreen(id) {
  const cur = document.querySelector('.screen.active');
  if (cur) {
    cur.classList.add('exit');
    setTimeout(() => cur.classList.remove('active', 'exit'), 340);
  }
  setTimeout(() => document.getElementById('screen-' + id).classList.add('active'), 180);
}

// Auto-advance loading screen after 2.5s
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

  // Simulate device found after 2.1s
  setTimeout(() => {
    haptic.double();
    s.textContent = 'Device found nearby';
    document.getElementById('pairFoundCard').classList.add('visible');
    pairState = 'found';
  }, 2100);
}

function connectDevice() {
  haptic.tap();
  const s = document.getElementById('pairStatus');
  s.textContent = 'Connecting…';
  document.querySelector('.pair-connect-btn').textContent = '…';

  setTimeout(() => {
    haptic.success();
    s.className = 'pair-status paired';
    s.textContent = '✓ Connected';
    setTimeout(() => showScreen('main'), 700);
  }, 1300);
}

// ─────────────────────────────────────────
// TAB NAVIGATION
// Switches between home / modes / monitor / alerts
// ─────────────────────────────────────────
let activeTab = 'home';

function goTab(tab) {
  if (tab === activeTab) return;

  // Hide current tab
  document.getElementById('tab-' + activeTab).classList.remove('show');
  document.getElementById('nav-' + activeTab).classList.remove('active');

  // Show new tab
  activeTab = tab;
  const el = document.getElementById('tab-' + tab);
  el.classList.remove('show');
  void el.offsetWidth; // force reflow so animation replays
  el.classList.add('show');
  document.getElementById('nav-' + tab).classList.add('active');

  // Scroll new tab back to top
  el.scrollTop = 0;

  if (tab === 'muscle') setTimeout(drawGraphs, 50);
  if (tab === 'alerts') setTimeout(triggerAlertHaptics, 100);
}

// ─────────────────────────────────────────
// ALERT HAPTICS
// Plays a haptic per unread alert when you open the alerts tab
// ─────────────────────────────────────────
function triggerAlertHaptics() {
  let delay = 0;
  document.querySelectorAll('#alertsList .alert-card').forEach(card => {
    const dot    = card.querySelector('.a-dot');
    const stripe = card.querySelector('.a-stripe');
    if (!dot || dot.classList.contains('gone')) return;

    const sev = stripe?.classList.contains('danger') ? 'danger'
              : stripe?.classList.contains('warn')   ? 'warn' : 'info';

    setTimeout(() => {
      if (sev === 'danger')    haptic.alert();
      else if (sev === 'warn') haptic.double();
      else                     haptic.tap();
    }, delay);
    delay += 350;
  });
}

// ─────────────────────────────────────────
// MODES
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

// Speed slider label map
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
// EMG WAVEFORM GRAPHS (canvas)
// Called when switching to the Monitor tab
// ─────────────────────────────────────────
function drawWave(id, color1, color2, seed) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth * dpr;
  const H = canvas.offsetHeight * dpr;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  function makePts(offset) {
    return Array.from({ length: 61 }, (_, i) => ({
      x: (i / 60) * W,
      y: (H / 2)
        + Math.sin(i * 0.38 + seed + offset) * H * 0.20
        + Math.sin(i * 0.85 + seed * 1.8 + offset) * H * 0.09
        + (Math.random() - 0.5) * H * 0.05,
    }));
  }

  function drawLine(pts, color) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y,
        (pts[i].x + pts[i+1].x) / 2, (pts[i].y + pts[i+1].y) / 2);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
  }

  if (color2) drawLine(makePts(1.6), color2);
  drawLine(makePts(0), color1);
}

function drawGraphs() {
  drawWave('muscleGraph', '#3d9e68', '#5ec98a', 2.1);
  drawWave('bicepGraph',  '#d9943a', null,       5.4);
}

// ─────────────────────────────────────────
// LIVE MUSCLE VALUES
// Updates the 4 muscle chips every 2 seconds with simulated EMG data
// ─────────────────────────────────────────
const muscleChannels = [
  { id: 'mv1', bar: 'mb1', base: 68 },
  { id: 'mv2', bar: 'mb2', base: 42 },
  { id: 'mv3', bar: 'mb3', base: 81 },
  { id: 'mv4', bar: 'mb4', base: 29 },
];

setInterval(() => {
  muscleChannels.forEach(({ id, bar, base }) => {
    const v = Math.max(10, Math.min(99, base + Math.round((Math.random() - 0.5) * 9)));
    const el  = document.getElementById(id);
    const b   = document.getElementById(bar);
    if (el) el.textContent  = v + ' µV';
    if (b)  b.style.width   = v + '%';
  });
}, 2000);
