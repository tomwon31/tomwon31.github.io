#!/usr/bin/env python3
"""Fetch index and macro series into data/market.json.

Each series is isolated: a failure keeps the last good payload and marks it
stale. The page can always read the file.
"""

from __future__ import annotations

import io
import json
import re
import time
import traceback
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "market.json"
FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}"
# FRED returns an empty body unless the request looks like a browser.
FRED_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/csv,text/plain,*/*",
}
UA = {"User-Agent": FRED_HEADERS["User-Agent"]}


def log(msg: str) -> None:
    print(msg, flush=True)


def load_prev() -> dict:
    if not OUT.exists():
        return {"generated": None, "series": {}}
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"generated": None, "series": {}}


def save(doc: dict) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def as_date(value) -> str:
    if isinstance(value, str):
        return value[:10]
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def recent_pack(dates, values, days: int = 800, limit: int = 260) -> list:
    pairs = []
    for raw_date, raw_value in zip(dates, values):
        if pd.isna(raw_value):
            continue
        pairs.append((pd.Timestamp(raw_date), float(raw_value)))
    if not pairs:
        return []
    start = pairs[-1][0] - pd.Timedelta(days=days)
    pairs = [pair for pair in pairs if pair[0] >= start]
    return pack([pair[0] for pair in pairs], [pair[1] for pair in pairs], limit)


def pack(dates, values, limit: int = 200) -> list:
    rows = []
    for raw_date, raw_value in zip(dates, values):
        if pd.isna(raw_value):
            continue
        rows.append([as_date(raw_date), round(float(raw_value), 4)])
    if len(rows) > limit:
        step = len(rows) / limit
        trimmed = [rows[min(len(rows) - 1, int(i * step))] for i in range(limit - 1)]
        trimmed.append(rows[-1])
        rows = trimmed
    return rows


def window(rows: list, days: int) -> list:
    if not rows:
        return []
    end = datetime.strptime(rows[-1][0][:10], "%Y-%m-%d")
    start = end - timedelta(days=days)
    return [row for row in rows if datetime.strptime(row[0][:10], "%Y-%m-%d") >= start]


def change_of(rows: list, kind: str) -> float | None:
    if len(rows) < 2 or rows[-2][1] in (None, 0):
        return None
    last, prev = rows[-1][1], rows[-2][1]
    if kind == "pct":
        return (last / prev - 1) * 100
    return last - prev


def series_doc(meta: dict, daily: list, intraday: list | None = None, hourly: list | None = None) -> dict:
    kind = meta["changeKind"]
    base = daily or hourly or intraday or []
    doc = {
        "id": meta["id"],
        "name": meta["name"],
        "symbol": meta.get("symbol", ""),
        "source": meta["source"],
        "updated": base[-1][0][:10] if base else None,
        "sample": False,
        "stale": False,
        "error": "",
        "note": meta.get("note", ""),
        "digits": meta.get("digits", 2),
        "suffix": meta.get("suffix", ""),
        "changeKind": kind,
        "value": base[-1][1] if base else None,
        "change": change_of(daily or base, kind),
        "ranges": {
            "日内": intraday if intraday and len(intraday) >= 2 else [],
            "一周": (hourly if hourly and len(hourly) >= 2 else window(daily, 7)),
            "一月": window(daily, 31),
            "一年": window(daily, 370),
        },
    }
    return doc


def stale_or_empty(prev: dict, meta: dict, err: Exception) -> dict:
    old = (prev.get("series") or {}).get(meta["id"])
    message = f"{type(err).__name__}: {err}"[:180]
    if old and old.get("value") is not None and not old.get("sample"):
        kept = json.loads(json.dumps(old))
        kept["stale"] = True
        kept["error"] = message
        return kept
    return {
        "id": meta["id"],
        "name": meta["name"],
        "symbol": meta.get("symbol", ""),
        "source": meta["source"],
        "updated": None,
        "sample": True,
        "stale": False,
        "error": message,
        "note": f"免费源这次没有取到。{meta.get('note', '')}".strip(),
        "digits": meta.get("digits", 2),
        "suffix": meta.get("suffix", ""),
        "changeKind": meta["changeKind"],
        "value": None,
        "change": None,
        "ranges": {"日内": [], "一周": [], "一月": [], "一年": []},
    }


def yahoo_close(symbol: str, period: str, interval: str) -> pd.Series:
    frame = yf.Ticker(symbol).history(period=period, interval=interval, auto_adjust=True)
    if frame is None or frame.empty or "Close" not in frame:
        raise RuntimeError(f"Yahoo 没有 {symbol} {period}/{interval}")
    close = frame["Close"].dropna()
    if close.empty:
        raise RuntimeError(f"Yahoo {symbol} 收盘为空")
    return close


def yahoo_price(meta: dict, symbol: str) -> dict:
    close = yahoo_close(symbol, "2y", "1d")
    daily = recent_pack(close.index, close.values)
    intraday = None
    hourly = None
    try:
        bars = yahoo_close(symbol, "1d", "5m")
        if len(bars) >= 10:
            intraday = pack(bars.index, bars.values, 120)
    except Exception as exc:
        log(f"  intraday skip {symbol}: {exc}")
    try:
        bars = yahoo_close(symbol, "5d", "60m")
        if len(bars) >= 8:
            hourly = pack(bars.index, bars.values, 80)
    except Exception as exc:
        log(f"  hourly skip {symbol}: {exc}")
    return series_doc(meta, daily, intraday, hourly)


def _fred_body_ok(sid: str, body: str) -> bool:
    if not body or not body.strip():
        return False
    head = body[:800]
    lowered = head.lstrip().lower()
    return sid in head or "DATE" in head or lowered.startswith("date") or lowered.startswith("observation_date")


def fred_text(sid: str) -> str:
    """Browser headers first. FRED sometimes answers only those, and sometimes only a plain client."""
    csv_url = FRED.format(sid=sid)
    plain = {"Accept": "text/csv,text/plain,*/*"}
    attempts = [
        (csv_url, FRED_HEADERS),
        (csv_url, plain),
        (f"{csv_url}&cosd=2024-01-01", FRED_HEADERS),
        (f"https://fred.stlouisfed.org/data/{sid}.txt", FRED_HEADERS),
        (f"https://fred.stlouisfed.org/data/{sid}.txt", plain),
    ]
    last = None
    for url, headers in attempts:
        try:
            response = requests.get(url, timeout=(8, 12), headers=headers)
            response.raise_for_status()
            if _fred_body_ok(sid, response.text):
                return response.text
            last = RuntimeError(f"FRED {sid} 响应为空或不是序列")
        except Exception as exc:
            last = exc
            log(f"  FRED {sid} {url.split('?')[0][-32:]} {exc}")
    raise last or RuntimeError(f"FRED {sid} 没有响应")


def parse_fred(text: str) -> pd.DataFrame:
    if text.lstrip().lower().startswith("date") or text.lstrip().startswith("observation"):
        frame = pd.read_csv(io.StringIO(text))
        frame.columns = ["date", "value"]
    else:
        rows = []
        for line in text.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[0][:1].isdigit():
                rows.append(parts[:2])
        frame = pd.DataFrame(rows, columns=["date", "value"])
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
    return frame.dropna().sort_values("date")


def fred_series(meta: dict, sid: str) -> dict:
    frame = parse_fred(fred_text(sid))
    if frame.empty:
        raise RuntimeError(f"FRED {sid} 为空")
    recent = frame[frame["date"] >= frame["date"].iloc[-1] - pd.Timedelta(days=800)]
    return series_doc(meta, recent_pack(recent["date"], recent["value"]))


def sina_index(symbol: str) -> list:
    import akshare as ak

    frame = ak.index_zh_daily_sina(symbol=symbol)
    frame = frame.dropna(subset=["date", "close"]).sort_values("date")
    if frame.empty:
        raise RuntimeError(f"新浪没有 {symbol}")
    return recent_pack(frame["date"], frame["close"])


def tx_index(symbol: str) -> list:
    import akshare as ak

    frame = ak.index_zh_daily_tx(symbol=symbol, start_date="20240101", end_date="20300101")
    frame = frame.dropna(subset=["date", "close"]).sort_values("date")
    if frame.empty:
        raise RuntimeError(f"腾讯没有 {symbol}")
    return recent_pack(frame["date"], frame["close"])


def levels_from_rows(meta: dict, rows: list, intraday=None, hourly=None) -> dict:
    if not rows:
        raise RuntimeError("点数不足")
    return series_doc(meta, rows, intraday, hourly)


def us_equity_premium() -> list:
    """S&P 500 earnings yield (100 / monthly PE) minus the 10-year yield."""
    page = requests.get(
        "https://www.multpl.com/s-p-500-pe-ratio/table/by-month",
        timeout=40,
        headers=UA,
    )
    page.raise_for_status()
    found = re.findall(
        r"<tr[^>]*>\s*<td[^>]*>\s*([A-Z][a-z]{2} \d{1,2}, \d{4})\s*</td>\s*<td[^>]*>(.*?)</td>",
        page.text,
        re.S,
    )
    pe_rows = []
    for label, cell in found:
        match = re.search(r"([0-9]+(?:\.[0-9]+)?)", cell)
        if not match:
            continue
        pe_rows.append((datetime.strptime(label, "%b %d, %Y"), float(match.group(1))))
    if len(pe_rows) < 3:
        raise RuntimeError("multpl 市盈率解析失败")
    pe_rows.sort()
    yields = fred_frame("DGS10")
    points = []
    for when, pe in pe_rows:
        if pe <= 0:
            continue
        ey = 100 / pe
        prior = yields[yields["date"] <= pd.Timestamp(when)]
        if prior.empty:
            continue
        if (pd.Timestamp(when) - prior["date"].iloc[-1]).days > 20:
            continue
        points.append([when.strftime("%Y-%m-%d"), round(ey - float(prior["value"].iloc[-1]), 4)])
    if len(points) < 3:
        raise RuntimeError("股债利差对齐失败")
    return points[-36:]


def fred_frame(sid: str) -> pd.DataFrame:
    try:
        return parse_fred(fred_text(sid))
    except Exception as exc:
        log(f"  FRED {sid} 失败，改用 Yahoo ^TNX：{exc}")
        close = yahoo_close("^TNX", "5y", "1d")
        values = close / 10 if float(close.median()) > 20 else close
        dates = pd.to_datetime(values.index).tz_localize(None)
        return pd.DataFrame({"date": dates, "value": values.to_numpy()}).sort_values("date")


def cn_equity_premium() -> list:
    import akshare as ak

    pe = ak.stock_index_pe_lg(symbol="沪深300")
    pe = pe.rename(columns={"日期": "date", "滚动市盈率": "pe"})
    pe["date"] = pd.to_datetime(pe["date"])
    pe["pe"] = pd.to_numeric(pe["pe"], errors="coerce")
    pe = pe.dropna(subset=["date", "pe"]).sort_values("date")
    start = (pe["date"].iloc[-1] - pd.Timedelta(days=320)).strftime("%Y%m%d")
    end = (pe["date"].iloc[-1] + pd.Timedelta(days=3)).strftime("%Y%m%d")
    bonds = ak.bond_china_yield(start_date=start, end_date=end)
    bonds = bonds[bonds["曲线名称"] == "中债国债收益率曲线"].copy()
    bonds["date"] = pd.to_datetime(bonds["日期"])
    bonds["y10"] = pd.to_numeric(bonds["10年"], errors="coerce")
    bonds = bonds.dropna(subset=["date", "y10"]).sort_values("date")
    points = []
    for _, row in pe.iterrows():
        if row["pe"] <= 0:
            continue
        prior = bonds[bonds["date"] <= row["date"]]
        if prior.empty:
            continue
        if (row["date"] - prior["date"].iloc[-1]).days > 15:
            continue
        spread = 100 / float(row["pe"]) - float(prior["y10"].iloc[-1])
        points.append([row["date"].strftime("%Y-%m-%d"), round(spread, 4)])
    if len(points) < 3:
        raise RuntimeError("A股股债利差对齐失败")
    return points[-36:]


def realized_vol() -> list:
    import akshare as ak

    frame = ak.index_zh_daily_sina(symbol="sh000300")
    frame = frame.dropna(subset=["date", "close"]).sort_values("date")
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame[frame["date"] >= frame["date"].iloc[-1] - pd.Timedelta(days=800)]
    close = pd.Series(pd.to_numeric(frame["close"], errors="coerce").to_numpy(), index=frame["date"])
    vol = close.pct_change().rolling(20).std() * (252 ** 0.5) * 100
    vol = vol.dropna()
    if len(vol) < 30:
        raise RuntimeError("沪深300历史太短")
    return recent_pack(vol.index, vol.values)


def crowding(prev_rows: list) -> list:
    import akshare as ak

    frame = ak.stock_zh_a_spot_sina()
    amount = pd.to_numeric(frame["成交额"], errors="coerce").fillna(0)
    amount = amount[amount > 0]
    if len(amount) < 100:
        raise RuntimeError("A股成交额样本太少")
    count = max(1, int(round(len(amount) * 0.05)))
    share = float(amount.nlargest(count).sum() / amount.sum() * 100)
    today = date.today().isoformat()
    rows = [row for row in prev_rows if row and row[0] != today]
    rows.append([today, round(share, 4)])
    return rows[-260:]


def etf_proxy() -> list:
    import akshare as ak

    codes = {"510050", "510300", "510310"}
    today = date.today()
    dates = [today]
    year, month = today.year, today.month
    for _ in range(8):
        first = date(year, month, 1)
        dates.append(first - timedelta(days=1))
        year, month = dates[-1].year, dates[-1].month
    points = []
    for day in sorted(set(dates)):
        try:
            frame = ak.fund_etf_scale_sse(date=day.strftime("%Y%m%d"))
        except Exception as exc:
            log(f"  etf scale skip {day}: {exc}")
            continue
        frame["基金代码"] = frame["基金代码"].astype(str).str.zfill(6)
        picked = frame[frame["基金代码"].isin(codes)]
        if picked.empty:
            continue
        total = pd.to_numeric(picked["基金份额"], errors="coerce").fillna(0).sum() / 1e8
        stamp = str(picked["统计日期"].iloc[0])[:10]
        points.append([stamp, round(float(total), 4)])
    dedup = {}
    for stamp, value in points:
        dedup[stamp] = value
    rows = [[stamp, dedup[stamp]] for stamp in sorted(dedup)]
    if not rows:
        raise RuntimeError("上交所 ETF 份额为空")
    return rows


def main() -> None:
    prev = load_prev()
    series = dict(prev.get("series") or {})

    yahoo_jobs = [
        ("IXIC", "^IXIC", "纳斯达克综合"),
        ("DJI", "^DJI", "道琼斯"),
        ("GSPC", "^GSPC", "标普500"),
        ("RUT", "^RUT", "罗素2000"),
        ("HSI", "^HSI", "恒生指数"),
        ("VIX", "^VIX", "VIX"),
        ("VXN", "^VXN", "VXN"),
        ("MOVE", "^MOVE", "MOVE"),
    ]
    for sid, symbol, name in yahoo_jobs:
        meta = {
            "id": sid,
            "name": name,
            "symbol": symbol,
            "source": "Yahoo Finance",
            "changeKind": "pct" if sid not in {"VIX", "VXN", "MOVE"} else "level",
            "digits": 2,
            "suffix": "" if sid not in {"VIX", "VXN", "MOVE"} else "",
            "note": "指数点位。" if sid not in {"VIX", "VXN", "MOVE"} else "波动率指数点位。",
        }
        if sid == "MOVE":
            meta["note"] = "美债期权隐含波动，ICE BofA MOVE。"
        elif sid == "VXN":
            meta["note"] = "纳斯达克100波动率指数。"
        elif sid == "VIX":
            meta["note"] = "标普500的30日隐含波动。"
        try:
            series[sid] = yahoo_price(meta, symbol)
            log(f"ok {sid} {series[sid]['value']}")
        except Exception as exc:
            log(f"fail {sid} {exc}")
            series[sid] = stale_or_empty(prev, meta, exc)

    daily_jobs = [
        ("HSTECH", "恒生科技", "HSTECH", "腾讯证券", lambda: tx_index("hkHSTECH"), "恒生科技指数。"),
        ("SSE", "上证指数", "000001.SS", "新浪财经", lambda: sina_index("sh000001"), "上证综合指数。"),
        ("STAR50", "科创50", "000688.SS", "新浪财经", lambda: sina_index("sh000688"), "上证科创板50。"),
        ("CHINEXT", "创业板指", "399006.SZ", "新浪财经", lambda: sina_index("sz399006"), "创业板指数。"),
    ]
    for sid, name, symbol, source, loader, note in daily_jobs:
        meta = {
            "id": sid, "name": name, "symbol": symbol, "source": source,
            "changeKind": "pct", "digits": 2, "suffix": "", "note": note,
        }
        try:
            series[sid] = levels_from_rows(meta, loader())
            log(f"ok {sid} {series[sid]['value']}")
        except Exception as exc:
            log(f"fail {sid} {exc}")
            series[sid] = stale_or_empty(prev, meta, exc)

    fred_jobs = [
        ("HY_OAS", "美国高收益债OAS", "BAMLH0A0HYM2", "美国高收益公司债期权调整利差，单位为百分点。"),
        ("IG_OAS", "美国投资级债OAS", "BAMLC0A0CM", "美国投资级公司债期权调整利差，单位为百分点。"),
        ("BBB_OAS", "美国BBB债OAS", "BAMLC0A4CBBB", "美国BBB公司债期权调整利差，单位为百分点。"),
    ]
    for sid, name, fred_id, note in fred_jobs:
        meta = {
            "id": sid, "name": name, "symbol": fred_id, "source": "FRED",
            "changeKind": "level", "digits": 2, "suffix": "%", "note": note,
        }
        try:
            series[sid] = fred_series(meta, fred_id)
            log(f"ok {sid} {series[sid]['value']}")
        except Exception as exc:
            log(f"fail {sid} {exc}")
            series[sid] = stale_or_empty(prev, meta, exc)

    spreads = [
        ("US_ERP", "美股股债利差", "multpl / FRED", "标普500盈利收益率（月度市盈率的倒数）减去美国10年期国债收益率，单位为百分点。月度，不含日内。"),
        ("CN_ERP", "A股股债利差", "乐咕乐股 / 中债", "沪深300滚动市盈率的倒数减去中债国债10年收益率，单位为百分点。月度，不含日内。"),
    ]
    loaders = {"US_ERP": us_equity_premium, "CN_ERP": cn_equity_premium}
    for sid, name, source, note in spreads:
        meta = {
            "id": sid, "name": name, "symbol": sid, "source": source,
            "changeKind": "level", "digits": 2, "suffix": "", "note": note,
        }
        try:
            series[sid] = levels_from_rows(meta, loaders[sid]())
            log(f"ok {sid} {series[sid]['value']}")
        except Exception as exc:
            log(f"fail {sid} {exc}")
            traceback.print_exc()
            series[sid] = stale_or_empty(prev, meta, exc)

    vol_meta = {
        "id": "CSI300_RV",
        "name": "沪深300历史波动",
        "symbol": "000300.SS",
        "source": "新浪财经",
        "changeKind": "level",
        "digits": 2,
        "suffix": "%",
        "note": "沪深300过去20个交易日收益率的年化标准差。",
    }
    try:
        series["CSI300_RV"] = levels_from_rows(vol_meta, realized_vol())
        log(f"ok CSI300_RV {series['CSI300_RV']['value']}")
    except Exception as exc:
        log(f"fail CSI300_RV {exc}")
        series["CSI300_RV"] = stale_or_empty(prev, vol_meta, exc)

    crowd_meta = {
        "id": "CROWDING",
        "name": "市场拥挤度",
        "symbol": "A股成交额",
        "source": "新浪财经",
        "changeKind": "level",
        "digits": 1,
        "suffix": "%",
        "note": "全A成交额排名前5%的个股，其成交额占全A成交额的比重。只有截面，历史从本仓库接入日起由定时任务累加。",
    }
    try:
        old_rows = ((prev.get("series") or {}).get("CROWDING") or {}).get("ranges", {}).get("一年") or []
        rows = crowding(old_rows if isinstance(old_rows, list) else [])
        series["CROWDING"] = levels_from_rows(crowd_meta, rows)
        log(f"ok CROWDING {series['CROWDING']['value']}")
    except Exception as exc:
        log(f"fail CROWDING {exc}")
        series["CROWDING"] = stale_or_empty(prev, crowd_meta, exc)

    etf_meta = {
        "id": "HUIJIN_ETF",
        "name": "国家队ETF份额",
        "symbol": "510050+510300+510310",
        "source": "上交所",
        "changeKind": "level",
        "digits": 1,
        "suffix": "亿份",
        "note": "510050、510300、510310 基金份额合计。这是汇金重仓宽基ETF的份额代理，不是中央汇金的官方持仓披露。",
    }
    try:
        series["HUIJIN_ETF"] = levels_from_rows(etf_meta, etf_proxy())
        log(f"ok HUIJIN_ETF {series['HUIJIN_ETF']['value']}")
    except Exception as exc:
        log(f"fail HUIJIN_ETF {exc}")
        series["HUIJIN_ETF"] = stale_or_empty(prev, etf_meta, exc)

    doc = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "series": series,
    }
    save(doc)
    real = sum(1 for item in series.values() if item.get("value") is not None and not item.get("sample"))
    log(f"wrote {OUT} series={len(series)} with_values={real}")


if __name__ == "__main__":
    main()
