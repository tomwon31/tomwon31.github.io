/**
 * 行情桌。股票指数和宏观数据读 data/market.json；
 * 利率、通胀、就业、汇率、大宗商品仍是示例。
 */

const RANGES = ['日内', '一周', '一月', '一年'];
const RANGE_SALT = { 日内: 1, 一周: 9, 一月: 21, 一年: 47 };
const TICKER = ['GSPC', 'IXIC', 'DJI', 'HSI', 'HSTECH', 'SSE', 'STAR50', 'CHINEXT'];

const SAMPLE = {
  rates: [
    { name: '联邦基金利率', value: '4.50%', change: '0.00', dir: 'flat', seed: 2 },
    { name: '美债10年', value: '4.28%', change: '+0.03', dir: 'up', seed: 11 },
    { name: '美债2年', value: '4.02%', change: '−0.01', dir: 'down', seed: 7 },
    { name: '10Y-2Y利差', value: '0.26%', change: '+0.04', dir: 'up', seed: 15 },
  ],
  cpi: [
    { name: 'CPI同比', value: '2.6%', change: '−0.1', dir: 'down', seed: 4 },
    { name: '核心CPI', value: '3.1%', change: '0.0', dir: 'flat', seed: 6 },
    { name: 'PCE', value: '2.4%', change: '−0.1', dir: 'down', seed: 10 },
    { name: '5年盈亏平衡', value: '2.35%', change: '+0.02', dir: 'up', seed: 14 },
  ],
  jobs: [
    { name: '非农就业', value: '+14.2万', change: '−3.1万', dir: 'down', seed: 9 },
    { name: '失业率', value: '4.1%', change: '+0.1', dir: 'up', seed: 12 },
    { name: '初请失业金', value: '22.3万', change: '+0.6万', dir: 'up', seed: 16 },
    { name: '时薪同比', value: '3.9%', change: '−0.1', dir: 'down', seed: 18 },
  ],
  fx: [
    { name: '美元指数', value: '104.82', change: '+0.21%', dir: 'up', seed: 19 },
    { name: '美元/人民币', value: '7.24', change: '+0.08%', dir: 'up', seed: 22 },
    { name: '欧元/美元', value: '1.08', change: '−0.12%', dir: 'down', seed: 24 },
    { name: '美元/日元', value: '152.40', change: '+0.33%', dir: 'up', seed: 27 },
  ],
  cmd: [
    { name: 'WTI原油', value: '78.40', change: '−1.12%', dir: 'down', seed: 28 },
    { name: '布伦特', value: '82.15', change: '−0.84%', dir: 'down', seed: 31 },
    { name: '伦敦金', value: '2,684', change: '+0.56%', dir: 'up', seed: 33 },
    { name: 'LME铜', value: '9,420', change: '+0.27%', dir: 'up', seed: 36 },
  ],
};

const CATALOG = [
  {
    id: 'eq',
    name: '股票指数',
    blurb: '美股、港股与A股。日频品种没有日内曲线。',
    live: true,
    groups: [
      { name: '美股', ids: ['IXIC', 'DJI', 'GSPC', 'RUT'] },
      { name: '港股', ids: ['HSI', 'HSTECH'] },
      { name: 'A股', ids: ['SSE', 'STAR50', 'CHINEXT'] },
    ],
  },
  {
    id: 'macro',
    name: '宏观数据',
    blurb: '信用、股债性价比、波动和资金。卡片写明口径。',
    live: true,
    groups: [
      { name: '信用风险', ids: ['HY_OAS', 'IG_OAS', 'BBB_OAS'] },
      { name: '估值与股债性价比', ids: ['US_ERP', 'CN_ERP'] },
      { name: '情绪与波动', ids: ['VIX', 'VXN', 'MOVE', 'CSI300_RV'] },
      { name: '资金与拥挤度', ids: ['CROWDING', 'HUIJIN_ETF'] },
    ],
  },
  { id: 'rates', name: '利率与美债', blurb: '收益率与利差为示例刻度，不是报价。', cards: SAMPLE.rates },
  { id: 'cpi', name: '通胀', blurb: '物价指标的示意走势。', cards: SAMPLE.cpi },
  { id: 'jobs', name: '就业', blurb: '劳工市场示例，不是劳工部公布值。', cards: SAMPLE.jobs },
  { id: 'fx', name: '汇率', blurb: '汇率刻度为示例，不含点差。', cards: SAMPLE.fx },
  { id: 'cmd', name: '大宗商品', blurb: '能源与金属的示意价格。', cards: SAMPLE.cmd },
];

let market = { series: {} };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakeSeries(seed) {
  const rand = mulberry32(seed);
  let v = (rand() - 0.4) * 2;
  const pts = [];
  for (let i = 0; i < 36; i += 1) {
    v += (rand() - 0.48) * 1.15;
    v *= 0.9;
    pts.push(v);
  }
  return pts;
}

function chartFromValues(values, dir) {
  if (!values || values.length < 2) {
    return '<p class="nodata">该区间点数不足</p>';
  }
  const nums = values.map((row) => row[1]);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const w = 320;
  const h = 86;
  const pad = 4;
  const span = max - min || 1;
  const xy = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const d = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const fill = `${d} L${xy[xy.length - 1][0].toFixed(1)} ${h} L${xy[0][0].toFixed(1)} ${h} Z`;
  return `<svg class="chart ${dir}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="fill" d="${fill}"></path><path class="line" d="${d}"></path></svg>`;
}

function chartFromSeed(seed, dir) {
  return chartFromValues(fakeSeries(seed).map((v) => ['', v]), dir);
}

function signOf(value) {
  if (value > 0.0000001) return 'up';
  if (value < -0.0000001) return 'down';
  return 'flat';
}

function formatNumber(value, digits) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatChange(item) {
  const value = item?.change;
  if (value == null || Number.isNaN(Number(value))) return { text: '—', dir: 'flat' };
  const abs = Math.abs(Number(value));
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const body = item.changeKind === 'pct' ? `${abs.toFixed(2)}%` : abs.toFixed(item.digits ?? 2);
  return { text: `${sign}${body}`, dir: signOf(value) };
}

function liveCard(id) {
  const item = market.series?.[id];
  if (!item) {
    return {
      id,
      name: id,
      value: '—',
      change: '—',
      dir: 'flat',
      sample: true,
      tag: '示例数据',
      footer: '数据文件里还没有这一项',
      points: [],
    };
  }
  const change = formatChange(item);
  const suffix = item.value == null ? '' : (item.suffix || '');
  return {
    id,
    name: item.name || id,
    value: item.value == null ? '—' : `${formatNumber(item.value, item.digits ?? 2)}${suffix}`,
    change: change.text,
    dir: change.dir,
    sample: Boolean(item.sample),
    tag: item.sample ? '示例数据' : (item.stale ? '沿用上次' : (item.symbol || '行情')),
    footer: [item.source, item.updated ? `更新 ${item.updated}` : '', item.note].filter(Boolean).join(' · '),
    points: item.ranges || {},
  };
}

function categoryIds(cat) {
  if (!cat.groups) return [];
  return cat.groups.flatMap((group) => group.ids);
}

function hasIntraday(cat) {
  return categoryIds(cat).some((id) => (market.series?.[id]?.ranges?.['日内'] || []).length >= 2);
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
  let chart = '';
  let foot = card.footer;
  if (card.sample && card.seed != null) {
    chart = chartFromSeed(card.seed * 17 + (RANGE_SALT[range] || 1), card.dir);
    foot = picked ? '示例序列 · 未接入数据源' : '日线示意';
  } else if (card.sample) {
    chart = '<p class="nodata">暂无序列</p>';
  } else if (range === '日内' && (!card.points['日内'] || card.points['日内'].length < 2)) {
    chart = '<p class="nodata">仅日频</p>';
  } else {
    chart = chartFromValues(card.points[range], card.dir);
  }
  return `<article class="card${picked ? ' picked' : ''}" data-card="${card.id || card.name}">
    <header><h3>${card.name}</h3><span class="tag">${card.tag || '示例数据'}</span></header>
    <div class="stat"><b>${card.value}</b><em class="${card.dir}">${card.change}</em></div>
    ${chart}
    <footer>${foot || ''}</footer>
  </article>`;
}

function tickerHtml() {
  const parts = TICKER.map((id) => {
    const card = liveCard(id);
    if (card.value === '—') return '';
    return `${card.name} ${card.value} <em class="${card.dir}">${card.change}</em>`;
  }).filter(Boolean);
  return parts.length ? parts.join('　·　') : '指数行情尚未写入';
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
      <div class="mast"><strong>行情桌</strong><span>华尔街</span></div>
      <div class="ny"><small data-date>纽约</small><b data-time>--:--:--</b></div>
    </header>
    <div class="tape" data-tape>正在读取指数…</div>
    <div class="term-body">
      <nav class="side" aria-label="分类"></nav>
      <div class="main"></div>
    </div>`;

  const side = el.querySelector('.side');
  const main = el.querySelector('.main');
  const tape = el.querySelector('[data-tape]');
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
    const intradayOk = !cat.live || hasIntraday(cat);
    if (state.range === '日内' && !intradayOk) state.range = '一月';
    const top = resetScroll ? 0 : main.scrollTop;
    const ranges = RANGES.map((name) => {
      const disabled = name === '日内' && !intradayOk ? ' disabled' : '';
      const on = name === state.range ? ' on' : '';
      return `<button type="button" data-range="${name}" class="${on.trim()}"${disabled}>${name}</button>`;
    }).join('');
    let body = '';
    if (cat.live) {
      body = cat.groups.map((group) => {
        const cards = group.ids.map((id) => cardHtml(liveCard(id), state.range, state.pick === id)).join('');
        return `<h2 class="group-title">${group.name}</h2><div class="cards">${cards}</div>`;
      }).join('');
    } else {
      const cards = cat.cards.map((card) => cardHtml({
        ...card,
        id: card.name,
        sample: true,
        tag: '示例数据',
      }, state.range, state.pick === card.name)).join('');
      body = `<div class="cards">${cards}</div>`;
    }
    const sheetRows = (cat.live ? categoryIds(cat).map((id) => liveCard(id)) : cat.cards).map((card) => (
      `<tr><td>${card.name}</td><td>${card.value}</td><td class="${card.dir}">${card.change}</td><td>${cat.live ? (card.sample ? '示例' : '行情') : '示例'}</td></tr>`
    )).join('');
    main.innerHTML = `
      <div class="lede">
        <div><h1>${cat.name}</h1><p>${cat.blurb}</p></div>
        <div class="ranges" role="tablist" aria-label="区间">${ranges}</div>
      </div>
      ${body}
      <section class="sheet">
        <header><h3>一览</h3>${cat.live ? '' : '<span class="tag">示例数据</span>'}</header>
        <table>
          <thead><tr><th>名称</th><th>最新</th><th>变动</th><th>性质</th></tr></thead>
          <tbody>${sheetRows}</tbody>
        </table>
      </section>`;
    main.scrollTop = top;
    tape.innerHTML = tickerHtml();
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

  fetch(new URL('../data/market.json', import.meta.url))
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((data) => {
      market = data || { series: {} };
      paintMain(false);
    })
    .catch(() => {
      tape.textContent = '指数文件没有读到，股票与宏观会显示为空';
    });

  el.addEventListener('click', (event) => {
    const back = event.target.closest('[data-back]');
    if (back) {
      onBack?.();
      return;
    }
    const catBtn = event.target.closest('[data-cat]');
    if (catBtn) {
      state.cat = catBtn.dataset.cat;
      state.pick = '';
      paintSide();
      paintMain(true);
      return;
    }
    const range = event.target.closest('[data-range]');
    if (range && !range.disabled) {
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
