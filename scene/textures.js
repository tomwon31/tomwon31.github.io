import * as THREE from 'three';

function finish(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

export function woodTexture({
  base = '#6a4630',
  dark = '#3a2416',
  line = '#2a180e',
  w = 512,
  h = 512,
  planks = 5,
} = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const pw = w / planks;
  for (let i = 0; i < planks; i += 1) {
    const x = i * pw;
    g.fillStyle = i % 2 === 0 ? dark : base;
    g.globalAlpha = 0.45;
    g.fillRect(x, 0, pw, h);
    g.globalAlpha = 0.55;
    g.strokeStyle = 'rgba(18, 8, 4, 0.65)';
    g.strokeRect(x + 0.5, 0, pw - 1, h);
    g.globalAlpha = 0.22;
    g.strokeStyle = line;
    g.lineWidth = 1;
    for (let k = 0; k < 14; k += 1) {
      g.beginPath();
      let y = Math.random() * h;
      g.moveTo(x + 2, y);
      for (let xx = x + 2; xx < x + pw - 2; xx += 10) {
        y += (Math.random() - 0.5) * 4;
        g.lineTo(xx, y);
      }
      g.stroke();
    }
  }
  g.globalAlpha = 0.08;
  g.fillStyle = '#000';
  for (let n = 0; n < 80; n += 1) {
    g.fillRect(Math.random() * w, Math.random() * h, 2, 1);
  }
  g.globalAlpha = 1;
  return finish(c);
}

export function rugTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#6a2c32';
  g.fillRect(0, 0, 512, 384);
  g.fillStyle = '#7d3838';
  for (let y = 0; y < 384; y += 6) {
    g.globalAlpha = 0.15;
    g.fillRect(0, y, 512, 2);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#d7b56a';
  g.lineWidth = 14;
  g.strokeRect(22, 18, 468, 348);
  g.strokeStyle = '#3e181c';
  g.lineWidth = 6;
  g.strokeRect(40, 34, 432, 316);
  g.fillStyle = '#8d3e3a';
  g.beginPath();
  g.ellipse(256, 192, 62, 78, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#e6c98a';
  g.lineWidth = 3;
  g.stroke();
  g.globalAlpha = 0.2;
  g.fillStyle = '#2a1012';
  for (let i = 0; i < 200; i += 1) g.fillRect(Math.random() * 512, Math.random() * 384, 2, 2);
  g.globalAlpha = 1;
  return finish(c);
}

export function paperTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe4';
  g.fillRect(0, 0, 256, 320);
  g.strokeStyle = 'rgba(90, 70, 50, 0.28)';
  g.lineWidth = 1;
  for (let y = 28; y < 300; y += 14) {
    g.beginPath();
    g.moveTo(18, y);
    g.lineTo(238, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(150, 70, 60, 0.45)';
  g.beginPath();
  g.moveTo(36, 12);
  g.lineTo(36, 308);
  g.stroke();
  return finish(c);
}

export function keyboardTexture() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 220;
  const g = c.getContext('2d');
  g.fillStyle = '#161310';
  g.fillRect(0, 0, 640, 220);
  const rows = [15, 14, 13, 12, 7];
  let y = 14;
  rows.forEach((n, row) => {
    const kw = 40;
    const kh = row === 4 ? 34 : 30;
    let x = (640 - n * kw) / 2;
    for (let i = 0; i < n; i += 1) {
      const accent = row === 4 || (row === 0 && i === n - 1);
      g.fillStyle = accent ? '#6a5038' : '#3a342e';
      g.fillRect(x + 3, y, kw - 7, kh);
      g.fillStyle = 'rgba(255, 236, 210, 0.05)';
      g.fillRect(x + 5, y + 2, kw - 11, 4);
      x += kw;
    }
    y += kh + 8;
  });
  return finish(c);
}

export function photoTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#e7c9a0');
  sky.addColorStop(0.55, '#d9a06a');
  sky.addColorStop(1, '#8c5a3c');
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#6a4634';
  const blocks = [40, 70, 36, 90, 50, 64, 42];
  let x = 8;
  blocks.forEach((h, i) => {
    const w = 28 + (i % 3) * 6;
    g.globalAlpha = 0.75;
    g.fillRect(x, 210 - h, w, h + 110);
    x += w - 2;
  });
  g.globalAlpha = 1;
  g.fillStyle = '#f0d7a4';
  g.beginPath();
  g.arc(70, 78, 22, 0, Math.PI * 2);
  g.fill();
  return finish(c);
}

export function newsTexture() {
  const c = document.createElement('canvas');
  c.width = 280;
  c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6d4';
  g.fillRect(0, 0, 280, 360);
  g.fillStyle = '#2a2118';
  g.font = '28px "WenQuanYi Micro Hei", sans-serif';
  g.fillText('华尔街', 18, 40);
  g.font = '12px "WenQuanYi Micro Hei", sans-serif';
  g.fillStyle = '#6a5344';
  g.fillText('午盘  ·  示例', 18, 62);
  g.strokeStyle = '#2a2118';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(16, 74);
  g.lineTo(264, 74);
  g.stroke();
  g.fillStyle = 'rgba(50, 36, 24, 0.55)';
  for (let col = 0; col < 3; col += 1) {
    const x = 16 + col * 88;
    for (let y = 92; y < 340; y += 8) {
      g.fillRect(x, y, 76, 3);
    }
  }
  return finish(c);
}

export function laneTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2724';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#3a342c';
  g.fillRect(6, 0, 4, 256);
  g.fillRect(118, 0, 4, 256);
  g.fillStyle = '#d2b15a';
  g.fillRect(58, 0, 3, 256);
  g.fillRect(66, 0, 3, 256);
  g.fillStyle = '#d9d4cc';
  for (const x of [32, 96]) {
    for (let y = 8; y < 256; y += 36) g.fillRect(x, y, 3, 16);
  }
  return finish(c);
}

export function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.25, 'rgba(226,234,238,0.15)');
  grd.addColorStop(0.55, 'rgba(236,242,246,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(14, 0, 4, 128);
  return finish(c);
}

export function steamTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 96;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(32, 58, 2, 32, 52, 28);
  glow.addColorStop(0, 'rgba(255,252,246,0.45)');
  glow.addColorStop(0.45, 'rgba(255,248,236,0.14)');
  glow.addColorStop(1, 'rgba(255,248,236,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.ellipse(32, 58, 16, 26, 0, 0, Math.PI * 2);
  g.fill();
  const wisp = g.createRadialGradient(30, 28, 1, 34, 24, 18);
  wisp.addColorStop(0, 'rgba(255,255,255,0.22)');
  wisp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = wisp;
  g.beginPath();
  g.ellipse(32, 26, 10, 18, -0.3, 0, Math.PI * 2);
  g.fill();
  return finish(c);
}

export function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,255,255,0.95)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return finish(c);
}
