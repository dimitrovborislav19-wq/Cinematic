const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

const DURATION = 6;
const particleCount = 850;
let width = 0;
let height = 0;
let rafId = null;
let start = 0;
let running = false;

const particles = Array.from({ length: particleCount }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 2 - 1,
  z: Math.random(),
  drift: Math.random() * 0.8 + 0.2,
  phase: Math.random() * Math.PI * 2,
  glow: Math.random() * 0.7 + 0.3,
}));

function resize() {
  width = canvas.width = window.innerWidth * devicePixelRatio;
  height = canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function drawBackground(t) {
  const g = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.05, width * 0.5, height * 0.55, width * 0.68);
  g.addColorStop(0, "rgba(24,40,80,0.28)");
  g.addColorStop(0.4, "rgba(7,12,27,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.96)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const fog = smoothstep(0.8, 2.8, t) * 0.2;
  ctx.fillStyle = `rgba(180,160,255,${fog * 0.1})`;
  ctx.fillRect(0, 0, width, height);
}

function project(p, t, pull = 1) {
  const z = (p.z * 0.9 + 0.1) * pull;
  const depth = 1.9 / z;
  const driftX = Math.sin(t * 0.35 + p.phase) * 0.07 * p.drift;
  const driftY = Math.cos(t * 0.28 + p.phase * 1.4) * 0.07 * p.drift;
  return {
    x: width * (0.5 + (p.x + driftX) * depth * 0.36),
    y: height * (0.5 + (p.y + driftY) * depth * 0.36),
    scale: depth,
    z,
  };
}

function drawParticles(t) {
  const wake = smoothstep(0.9, 2.2, t);
  const openSpace = smoothstep(2, 3.6, t);

  for (const p of particles) {
    const point = project(p, t, 1 - openSpace * 0.18);
    const hueShift = Math.sin(t + p.phase) * 20;
    const size = (0.8 + p.glow * 2.1) * point.scale;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${200 + hueShift}, 100%, ${70 + wake * 12}%, ${0.08 + wake * 0.52})`;
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();

    if (wake > 0.2 && Math.random() > 0.986) {
      const link = project(
        {
          ...p,
          x: p.x + (Math.random() - 0.5) * 0.25,
          y: p.y + (Math.random() - 0.5) * 0.25,
          z: Math.min(1, p.z + Math.random() * 0.1),
        },
        t,
        1
      );
      ctx.strokeStyle = `rgba(111,212,255,${0.12 + wake * 0.34})`;
      ctx.lineWidth = point.scale * 0.35;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(link.x, link.y);
      ctx.stroke();
    }
  }
}

function drawRings(t) {
  const reveal = smoothstep(2, 3.2, t);
  const sync = smoothstep(3.2, 4.5, t);
  const centerX = width * 0.5 + Math.sin(t * 0.8) * width * 0.005;
  const centerY = height * 0.5 + Math.cos(t * 0.65) * height * 0.004;
  const shapeReactivity = 0.9 + Math.sin(t * 2.2) * 0.06 + Math.cos(t * 1.35) * 0.04;

  for (let i = 0; i < 5; i++) {
    const radius = width * (0.08 + i * 0.05 + Math.sin(t * 0.4 + i) * 0.005) * shapeReactivity;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((t * 0.2 + i * 0.7 + Math.sin(t * 1.2 + i) * 0.14) * (i % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = `rgba(${110 + i * 20},${180 - i * 8},255,${0.06 + reveal * 0.35})`;
    ctx.lineWidth = (i + 1) * 0.6;
    ctx.setLineDash([22 + i * 8, 14 + i * 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1 + sync * 0.03), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.setLineDash([]);
}

function drawCore(t) {
  const wake = smoothstep(0.25, 1.25, t);
  const ignite = smoothstep(2.2, 4.5, t);
  const lock = smoothstep(4.5, 5.9, t);
  const pulse = 0.5 + Math.sin(t * 2.3) * 0.22 + Math.sin(t * 4.4 + 1.2) * 0.1;
  const microX = Math.sin(t * 0.92) * width * 0.008 + Math.cos(t * 2.5) * width * 0.0015;
  const microY = Math.cos(t * 0.74 + 0.9) * height * 0.006 + Math.sin(t * 2.1 + 0.4) * height * 0.0015;
  const cx = width * 0.5 + microX;
  const cy = height * 0.5 + microY;

  const coreRadius = width * 0.055 * (0.84 + pulse * 0.2 + ignite * 0.16);
  const shellRadius = coreRadius * (1.75 + Math.sin(t * 1.1) * 0.08);
  const aperture = 0.3 + Math.sin(t * 1.7 + 0.4) * 0.25 + Math.cos(t * 2.6 + 1.3) * 0.15;
  const split = smoothstep(1.2, 3.3, t) * (0.15 + Math.sin(t * 1.4 + 0.9) * 0.16);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, shellRadius * 2.8);
  glow.addColorStop(0, `rgba(118,120,170,${0.13 + wake * 0.16})`);
  glow.addColorStop(0.42, `rgba(52,58,92,${0.14 + ignite * 0.18})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, shellRadius * 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 0.5) * 0.08 + Math.cos(t * 1.45) * 0.05);

  const layers = 6;
  for (let i = 0; i < layers; i++) {
    const depth = i / (layers - 1);
    const layerOpen = 1 + aperture * 0.06 + Math.sin(t * (1.7 + depth * 0.8) + i * 0.9) * 0.09;
    const squash = 0.85 + Math.cos(t * (1.2 + depth * 1.3) + i) * 0.16;
    const radius = coreRadius * (1.08 - depth * 0.55) * layerOpen;

    ctx.beginPath();
    const points = 22;
    for (let j = 0; j <= points; j++) {
      const a = (j / points) * Math.PI * 2;
      const fold = Math.sin(a * (3 + i) + t * (1.2 + depth) + i * 0.7) * (0.16 + depth * 0.05);
      const shard = Math.cos(a * (5 + i * 0.8) - t * (2.4 - depth * 0.6)) * (0.08 + depth * 0.02);
      const px = Math.cos(a) * radius * (1 + fold + shard + split * Math.sign(Math.cos(a * 2 + i)));
      const py = Math.sin(a) * radius * squash * (1 + fold * 0.5 - shard * 0.6);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${20 + i * 12},${26 + i * 10},${34 + i * 12},${0.5 - depth * 0.22 + wake * 0.1})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${80 + i * 15},${95 + i * 12},${125 + i * 10},${0.2 + wake * 0.2 - depth * 0.05})`;
    ctx.lineWidth = 1.3 - depth * 0.7;
    ctx.stroke();
  }

  const spokes = 10;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + t * 0.37;
    const extension = (0.35 + Math.sin(t * 2 + i * 1.6) * 0.5 + Math.cos(t * 1.1 - i) * 0.2) * smoothstep(0.4, 2.7, t);
    const length = coreRadius * (1.15 + Math.max(0, extension));
    const root = coreRadius * 0.44;
    ctx.strokeStyle = `rgba(120,145,185,${0.06 + ignite * 0.13})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * root, Math.sin(a) * root);
    ctx.quadraticCurveTo(
      Math.cos(a + Math.sin(t * 1.7 + i) * 0.4) * (length * 0.75),
      Math.sin(a - Math.cos(t * 1.4 + i) * 0.4) * (length * 0.68),
      Math.cos(a) * length,
      Math.sin(a) * length
    );
    ctx.stroke();
  }
  ctx.restore();

  const scan = smoothstep(3.35, 4.1, t) * (1 - smoothstep(4.1, 4.55, t));
  if (scan > 0) {
    const y = cy - height * 0.12 + scan * height * 0.24;
    const lg = ctx.createLinearGradient(0, y - 10, 0, y + 10);
    lg.addColorStop(0, "rgba(0,0,0,0)");
    lg.addColorStop(0.5, "rgba(130,230,255,0.5)");
    lg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(width * 0.12, y - 16, width * 0.76, 32);
  }
}

function drawFractalStructures(t) {
  const reveal = smoothstep(1.2, 3, t);
  const sync = smoothstep(3.2, 5.5, t);
  const cx = width * 0.5 + Math.sin(t * 0.92) * width * 0.008;
  const cy = height * 0.5 + Math.cos(t * 0.74 + 0.9) * height * 0.006;

  for (let i = 0; i < 3; i++) {
    const points = 6 + i * 2;
    const radius = width * (0.09 + i * 0.06) * (0.95 + Math.sin(t * 1.8 + i) * 0.06);
    ctx.beginPath();
    for (let j = 0; j <= points; j++) {
      const a = (j / points) * Math.PI * 2 + t * 0.15 * (i + 1) + Math.cos(t * 0.9 + i + j * 0.3) * 0.08;
      const pulse = 1 + Math.sin(t * 1.4 + j + i * 2) * 0.1 + Math.cos(t * 2.1 - j * 0.7) * 0.05;
      const x = cx + Math.cos(a) * radius * pulse;
      const y = cy + Math.sin(a * 1.35 + Math.sin(t + i) * 0.18) * radius * 0.5 * pulse;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(180,150,255,${0.08 + reveal * 0.2 + sync * 0.08})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawFinalText(t) {
  const lock = smoothstep(4.75, 5.9, t);
  if (lock <= 0) return;
  statusEl.textContent = "JARVIS ONLINE";
  statusEl.classList.toggle("show", lock > 0.12);
  statusEl.style.opacity = String(lock);
}

function render(now) {
  const elapsed = (now - start) / 1000;
  if (elapsed > DURATION) {
    running = false;
    cancelAnimationFrame(rafId);
    startBtn.classList.remove("hidden");
    return;
  }

  ctx.clearRect(0, 0, width, height);
  drawBackground(elapsed);
  drawParticles(elapsed);
  drawFractalStructures(elapsed);
  drawRings(elapsed);
  drawCore(elapsed);
  drawFinalText(elapsed);

  rafId = requestAnimationFrame(render);
}

function runAudio() {
  const audio = new (window.AudioContext || window.webkitAudioContext)();
  const master = audio.createGain();
  master.gain.value = 0.18;
  master.connect(audio.destination);

  const hum = audio.createOscillator();
  hum.type = "sine";
  hum.frequency.setValueAtTime(42, audio.currentTime);
  hum.frequency.linearRampToValueAtTime(58, audio.currentTime + 4.3);
  const humGain = audio.createGain();
  humGain.gain.setValueAtTime(0.0001, audio.currentTime);
  humGain.gain.exponentialRampToValueAtTime(0.45, audio.currentTime + 1.1);
  humGain.gain.linearRampToValueAtTime(0.26, audio.currentTime + DURATION);
  hum.connect(humGain).connect(master);

  const pulse = audio.createOscillator();
  pulse.type = "triangle";
  pulse.frequency.setValueAtTime(110, audio.currentTime);
  pulse.frequency.exponentialRampToValueAtTime(330, audio.currentTime + 4.8);
  const pulseGain = audio.createGain();
  pulseGain.gain.setValueAtTime(0.0001, audio.currentTime + 0.8);
  pulseGain.gain.exponentialRampToValueAtTime(0.24, audio.currentTime + 4.3);
  pulseGain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + DURATION);
  pulse.connect(pulseGain).connect(master);

  const clickBuffer = audio.createBuffer(1, audio.sampleRate * 0.03, audio.sampleRate);
  const clickData = clickBuffer.getChannelData(0);
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 200);
  }
  for (let i = 0; i < 9; i++) {
    const source = audio.createBufferSource();
    source.buffer = clickBuffer;
    const g = audio.createGain();
    g.gain.value = 0.06;
    source.connect(g).connect(master);
    source.start(audio.currentTime + 1.2 + i * 0.42 + Math.random() * 0.1);
  }

  const impactOsc = audio.createOscillator();
  impactOsc.type = "sawtooth";
  impactOsc.frequency.setValueAtTime(220, audio.currentTime + 4.95);
  impactOsc.frequency.exponentialRampToValueAtTime(55, audio.currentTime + 5.35);
  const impactGain = audio.createGain();
  impactGain.gain.setValueAtTime(0.0001, audio.currentTime + 4.92);
  impactGain.gain.exponentialRampToValueAtTime(0.5, audio.currentTime + 5.02);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 5.6);
  impactOsc.connect(impactGain).connect(master);

  hum.start();
  pulse.start(audio.currentTime + 0.9);
  impactOsc.start(audio.currentTime + 4.92);

  hum.stop(audio.currentTime + DURATION + 0.2);
  pulse.stop(audio.currentTime + DURATION + 0.2);
  impactOsc.stop(audio.currentTime + 5.8);
}

function startSequence() {
  if (running) return;
  running = true;
  statusEl.classList.remove("show");
  statusEl.style.opacity = "0";
  statusEl.textContent = "";
  startBtn.classList.add("hidden");
  start = performance.now();
  runAudio();
  rafId = requestAnimationFrame(render);
}

window.addEventListener("resize", resize);
startBtn.addEventListener("click", startSequence);

resize();
