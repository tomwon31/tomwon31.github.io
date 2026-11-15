const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=40.7069&longitude=-74.0113&current=weather_code,is_day,temperature_2m,cloud_cover,precipitation&timezone=America%2FNew_York';

export const WEATHER_LABEL = {
  clear: '晴',
  cloudy: '阴',
  rain: '雨',
  snow: '雪',
  fog: '雾',
};

const KINDS = ['clear', 'cloudy', 'rain', 'snow', 'fog'];

export function readDebug(search) {
  const q = new URLSearchParams(search);
  const weather = q.get('weather');
  const time = q.get('time');
  const view = q.get('view');
  return {
    weather: KINDS.includes(weather) ? weather : null,
    time: time === 'night' || time === 'day' ? time : null,
    view: view === 'screen' ? 'screen' : null,
  };
}

export function codeToKind(code, cloud = 0) {
  const c = Number(code);
  if (c === 0 || c === 1) return 'clear';
  if (c === 2) return Number(cloud) >= 60 ? 'cloudy' : 'clear';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (c >= 95 && c <= 99)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  return 'cloudy';
}

export function nyParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const grab = (type) => parts.find((p) => p.type === type)?.value ?? '0';
  let hour = Number(grab('hour'));
  if (hour === 24) hour = 0;
  return { hour, minute: Number(grab('minute')) };
}

/** 0 = full day, 1 = full night, with a short dusk and dawn. */
export function nightAmount(date, override) {
  if (override === 'night') return 1;
  if (override === 'day') return 0;
  const { hour, minute } = nyParts(date);
  const t = hour + minute / 60;
  if (t >= 7.5 && t < 17.25) return 0;
  if (t >= 20 || t < 5.5) return 1;
  if (t >= 17.25 && t < 20) return (t - 17.25) / 2.75;
  return 1 - (t - 5.5) / 2;
}

export async function fetchNycWeather() {
  const res = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  const c = data.current || {};
  return {
    code: c.weather_code,
    cloud: c.cloud_cover,
    precip: c.precipitation,
    temp: c.temperature_2m,
    isDay: c.is_day,
    kind: codeToKind(c.weather_code, c.cloud_cover),
  };
}

export function createWeatherFeed(debug) {
  const state = {
    kind: debug.weather || 'clear',
    lockKind: Boolean(debug.weather),
    lockTime: debug.time,
    temp: null,
    precip: 0,
    cloud: null,
    ok: false,
    error: false,
  };
  let last = 0;

  async function pull() {
    last = Date.now();
    try {
      const w = await fetchNycWeather();
      state.ok = true;
      state.error = false;
      state.temp = typeof w.temp === 'number' ? w.temp : null;
      state.precip = Number(w.precip) || 0;
      state.cloud = w.cloud;
      if (!state.lockKind) state.kind = w.kind;
    } catch (err) {
      state.error = true;
      console.warn('天气获取失败', err);
    }
  }

  pull();
  const timer = setInterval(pull, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - last >= 15 * 60 * 1000) pull();
  });

  return {
    state,
    night() {
      return nightAmount(new Date(), state.lockTime);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

export function weatherLine(state, night) {
  if (!state.ok && state.temp == null && !state.lockKind) {
    return state.error ? '纽约 · 天气未接上' : '纽约 · 正在看天';
  }
  const label = WEATHER_LABEL[state.kind] || '阴';
  const when = night > 0.58 ? '夜' : '';
  const temp = state.temp == null ? '' : `${Math.round(state.temp)}°C`;
  return ['纽约', when, label, temp].filter(Boolean).join(' · ');
}
