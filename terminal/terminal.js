/**
 * 行情桌占位。以后把 CATALOG 换成真数据即可：
 * 每个分类一组 cards，卡片含 name / value / change / dir / seed。
 */

const RANGES = ['日内', '一周', '一月', '一年'];
const RANGE_SALT = { 日内: 1, 一周: 9, 一月: 21, 一年: 47 };

const CATALOG = [
  {
    id: 'us',
    name: '美股指数',
    blurb: '示意看板。数字与曲线都是示例，尚未接入行情。',
    cards: [
      { name: '标普500', value: '5,842.31', change: '+0.46%', dir: 'up', seed: 3 },
      { name: '纳斯达克', value: '18,972.64', change: '−0.22%', dir: 'down', seed: 8 },
      { name: '道琼斯', value: '43,150.80', change: '+0.18%', dir: 'up', seed: 5 },
      { name: '罗素2000', value: '2,284.11', change: '+0.63%', dir: 'up', seed: 13 },
    ],
  },
  {
    id: 'rates',
    name: '利率与美债',
    blurb: '收益率与利差为示例刻度，不是报价。',
    cards: [
      { name: '联邦基金利率', value: '4.50%', change: '0.00', dir: 'flat', seed: 2 },
      { name: '美债10年', value: '4.28%', change: '+0.03', dir: 'up', seed: 11 },
      { name: '美债2年', value: '4.02%', change: '−0.01', dir: 'down', seed: 7 },
      { name: '10Y-2Y利差', value: '0.26%', change: '+0.04', dir: 'up', seed: 15 },
    ],
  },
  {
    id: 'cpi',
    name: '通胀',
    blurb: '物价指标的示意走势。',
    cards: [
      { name: 'CPI同比', value: '2.6%', change: '−0.1', dir: 'down', seed: 4 },
      { name: '核心CPI', value: '3.1%', change: '0.0', dir: 'flat', seed: 6 },
      { name: 'PCE', value: '2.4%', change: '−0.1', dir: 'down', seed: 10 },
      { name: '5年盈亏平衡', value: '2.35%', change: '+0.02', dir: 'up', seed: 14 },
    ],
  },
  {
    id: 'jobs',
    name: '就业',
    blurb: '劳工市场示例，不是劳工部公布值。',
    cards: [
      { name: '非农就业', value: '+14.2万', change: '−3.1万', dir: 'down', seed: 9 },
      { name: '失业率', value: '4.1%', change: '+0.1', dir: 'up', seed: 12 },
      { name: '初请失业金', value: '22.3万', change: '+0.6万', dir: 'up', seed: 16 },
      { name: '时薪同比', value: '3.9%', change: '−0.1', dir: 'down', seed: 18 },
    ],
  },
  {
    id: 'fx',
    name: '汇率',
    blurb: '汇率刻度为示例，不含点差。',
    cards: [
      { name: '美元指数', value: '104.82', change: '+0.21%', dir: 'up', seed: 19 },
      { name: '美元/人民币', value: '7.24', change: '+0.08%', dir: 'up', seed: 22 },
      { name: '欧元/美元', value: '1.08', change: '−0.12%', dir: 'down', seed: 24 },
      { name: '美元/日元', value: '152.40', change: '+0.33%', dir: 'up', seed: 27 },
    ],
  },
  {
    id: 'cmd',
    name: '大宗商品',
    blurb: '能源与金属的示意价格。',
    cards: [
      { name: 'WTI原油', value: '78.40', change: '−1.12%', dir: 'down', seed: 28 },
      { name: '布伦特', value: '82.15', change: '−0.84%', dir: 'down', seed: 31 },
      { name: '伦敦金', value: '2,684', change: '+0.56%', dir: 'up', seed: 33 },
      { name: 'LME铜', value: '9,420', change: '+0.27%', dir: 'up', seed: 36 },
    ],
  },
  {
    id: 'crypto',
    name: '加密货币',
    blurb: '币价为示例，不构成任何买卖提示。',
    cards: [
      { name: '比特币', value: '67,420', change: '+1.84%', dir: 'up', seed: 40 },
      { name: '以太坊', value: '3,286', change: '+1.12%', dir: 'up', seed: 42 },
      { name: '总市值', value: '2.41万亿', change: '+1.40%', dir: 'up', seed: 44 },
      { name: '稳定币占比', value: '7.8%', change: '−0.05', dir: 'down', seed: 46 },
    ],
  },
];

const SHEET = [
  ['标普500', '5,842.31', '+0.46%', '日内'],
  ['纳斯达克', '18,972.64', '−0.22%', '日内'],
  ['美债10年', '4.28%', '+0.03', '一周'],
  ['美元指数', '104.82', '+0.21%', '一周'],
  ['WTI原油', '78.40', '−1.12%', '一月'],
  ['伦敦金', '2,684', '+0.56%', '一月'],
  ['比特币', '67,420', '+1.84%', '一年'],
  ['失业率', '4.1%', '+0.1', '一年'],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(seed, n = 36) {
  const rand = mulberry32(seed);
  let v = (rand() - 0.4) * 2;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    v += (rand() - 0.48) * 1.15;
    v *= 0.9;
    pts.push(v);
  }
  return pts;
}

function chartSvg(seed, dir) {
  const pts = series(seed);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const w = 320;
  const h = 86;
  const pad = 4;
  const span = max - min || 1;
  const xy = pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const d = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const fill = `${d} L${xy[xy.length - 1][0].toFixed(1)} ${h} L${xy[0][0].toFixed(1)} ${h} Z`;
  return `<svg class="chart ${dir}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="fill" d="${fill}"></path><path class="line" d="${d}"></path></svg>`;
}

function nyClock(date = new Date()) {
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date).replace(/^24:/, '00:');
  const day = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
  return { time, day };
}

function cardHtml(card, range, picked) {
  const seed = card.seed * 17 + (RANGE_SALT[range] || 1);
  const note = picked ? '示例序列 · 未接入数据源' : '日线示意';
  return `<article class="card${picked ? ' picked' : ''}" data-card="${card.name}">
    <header><h3>${card.name}</h3><span class="tag">示例数据</span></header>
    <div class="stat"><b>${card.value}</b><em class="${card.dir}">${card.change}</em></div>
    ${chartSvg(seed, card.dir)}
    <footer>${note}</footer>
  </article>`;
}

export function createTerminal({ onBack }) {
  const el = document.createElement('div');
  el.className = 'term';
  el.inert = true;
  el.style.pointerEvents = 'none';

  const state = { cat: CATALOG[0].id, range: '一月', pick: '' };

  el.innerHTML = `
    <header class="term-top">
      <button type="button" data-back class="term-back">← 返回办公室</button>
      <div class="mast"><strong>行情桌</strong><span>华尔街 · 示意终端</span></div>
      <div class="ny"><small data-date>纽约</small><b data-time>--:--:--</b></div>
    </header>
    <div class="tape">标普500 5,842.31 <em>+0.46%</em>　·　纳指 18,972.64 <em class="down">−0.22%</em>　·　十年期 4.28% <em>+0.03</em>　·　美元指数 104.82 <em>+0.21%</em>　·　伦敦金 2,684 <em>+0.56%</em>　·　比特币 67,420 <em>+1.84%</em>　·　示例数据</div>
    <div class="term-body">
      <nav class="side" aria-label="分类"></nav>
      <div class="main"></div>
    </div>`;

  const side = el.querySelector('.side');
  const main = el.querySelector('.main');
  const timeEl = el.querySelector('[data-time]');
  const dateEl = el.querySelector('[data-date]');

  function paintSide() {
    side.innerHTML = `<div class="kicker">分类</div>${CATALOG.map((cat, i) => {
      const on = cat.id === state.cat;
      return `<button type="button" data-cat="${cat.id}" class="${on ? 'on' : ''}" aria-pressed="${on}"><i>${String(i + 1).padStart(2, '0')}</i><span>${cat.name}</span></button>`;
    }).join('')}`;
  }

  function paintMain(resetScroll) {
    const cat = CATALOG.find((item) => item.id === state.cat) || CATALOG[0];
    const top = resetScroll ? 0 : main.scrollTop;
    const ranges = RANGES.map((name) => `<button type="button" data-range="${name}" class="${name === state.range ? 'on' : ''}">${name}</button>`).join('');
    const cards = cat.cards.map((card) => cardHtml(card, state.range, state.pick === card.name)).join('');
    const rows = SHEET.map(([name, value, change, span]) => {
      const dir = change.startsWith('−') || change.startsWith('-') ? 'down' : change.startsWith('+') ? 'up' : '';
      return `<tr><td>${name}</td><td>${value}</td><td class="${dir}">${change}</td><td>${span}</td></tr>`;
    }).join('');
    main.innerHTML = `
      <div class="lede">
        <div><h1>${cat.name}</h1><p>${cat.blurb}</p></div>
        <div class="ranges" role="tablist" aria-label="区间">${ranges}</div>
      </div>
      <div class="cards">${cards}</div>
      <section class="sheet">
        <header><h3>最近打印</h3><span class="tag">示例数据</span></header>
        <table>
          <thead><tr><th>名称</th><th>最新</th><th>变动</th><th>区间</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>打印条只为占位，滚动这个区域即可。</footer>
      </section>`;
    main.scrollTop = top;
  }

  function tick() {
    const now = nyClock();
    timeEl.textContent = now.time;
    dateEl.textContent = `纽约 · ${now.day}`;
  }

  paintSide();
  paintMain(true);
  tick();
  const timer = setInterval(tick, 1000);

  el.addEventListener('click', (event) => {
    const back = event.target.closest('[data-back]');
    if (back) {
      onBack?.();
      return;
    }
    const cat = event.target.closest('[data-cat]');
    if (cat) {
      state.cat = cat.dataset.cat;
      state.pick = '';
      paintSide();
      paintMain(true);
      return;
    }
    const range = event.target.closest('[data-range]');
    if (range) {
      state.range = range.dataset.range;
      paintMain(false);
      return;
    }
    const card = event.target.closest('[data-card]');
    if (card) {
      state.pick = state.pick === card.dataset.card ? '' : card.dataset.card;
      paintMain(false);
    }
  });

  el.addEventListener('wheel', (event) => {
    if (el.inert) return;
    const scroller = event.target.closest('.main, .side');
    if (!scroller) return;
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (scroller.classList.contains('side') && scroller.scrollWidth > scroller.clientWidth + 4) {
      scroller.scrollLeft += Math.abs(event.deltaX) > Math.abs(delta) ? event.deltaX : delta;
    } else {
      scroller.scrollTop += delta;
    }
    event.preventDefault();
  }, { passive: false });

  let touchY = 0;
  let touchX = 0;
  let touchScroller = null;
  el.addEventListener('touchstart', (event) => {
    touchScroller = event.target.closest('.main, .side');
    if (!touchScroller) return;
    touchY = event.touches[0].clientY;
    touchX = event.touches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchmove', (event) => {
    if (!touchScroller || el.inert) return;
    const y = event.touches[0].clientY;
    const x = event.touches[0].clientX;
    touchScroller.scrollTop += touchY - y;
    touchScroller.scrollLeft += touchX - x;
    touchY = y;
    touchX = x;
    event.preventDefault();
  }, { passive: false });

  return {
    el,
    setLive(on) {
      el.inert = !on;
      el.style.pointerEvents = on ? 'auto' : 'none';
      el.style.userSelect = on ? 'text' : 'none';
      el.classList.toggle('is-live', on);
    },
    dispose() {
      clearInterval(timer);
    },
  };
}
