"""
FnoPilot Backend — FastAPI server for Groww API proxy
===================================================
Endpoints are called by the frontend. The frontend handles polling intervals
for real-time data updates.

Authentication:
  1. API Key + Secret  → set GROWW_API_KEY and GROWW_API_SECRET in .env
  2. TOTP               → set GROWW_TOTP_TOKEN and GROWW_TOTP_SECRET in .env
  3. Raw token          → set GROWW_ACCESS_TOKEN in .env
"""

import os
import logging
import traceback
import asyncio
import json
import csv
import io
import threading
import time as time_module
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta

import httpx

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FnoPilot")

# ── Groww API Setup ──
_cached_access_token: Optional[str] = None
_cached_groww_client: Any = None
_token_lock = threading.Lock()


def _get_access_token(force_refresh: bool = False) -> str:
    """Generate or retrieve a cached Groww API access token.
    
    When force_refresh=True, re-reads .env and re-authenticates regardless
    of any cached token.  This is triggered automatically when an API call
    fails with an auth/token error.
    """
    global _cached_access_token

    if _cached_access_token and not force_refresh:
        return _cached_access_token

    if force_refresh:
        logger.info("Force-refreshing access token (re-reading .env) ...")
        _cached_access_token = None
        # Re-read .env so the user can drop new keys without restarting
        load_dotenv(override=True)

    from growwapi import GrowwAPI

    # Flow 1: API Key + Secret (daily approval flow)
    api_key = os.getenv("GROWW_API_KEY", "")
    api_secret = os.getenv("GROWW_API_SECRET", "")
    if api_key and api_secret:
        logger.info("Authenticating with API Key + Secret...")
        try:
            _cached_access_token = GrowwAPI.get_access_token(api_key=api_key, secret=api_secret)
            logger.info("Access token obtained via API Key flow")
            return _cached_access_token
        except Exception as e:
            logger.error(f"API Key + Secret auth failed: {e}")
            raise HTTPException(
                status_code=401,
                detail=f"Authentication failed. Your Groww API key has expired or is invalid. "
                       f"Please generate a fresh API key from the Groww Trade portal and update "
                       f"GROWW_API_KEY in backend/.env. Error: {e}"
            )

    # Flow 2: TOTP (no daily expiry)
    totp_token = os.getenv("GROWW_TOTP_TOKEN", "")
    totp_secret = os.getenv("GROWW_TOTP_SECRET", "")
    if totp_token and totp_secret:
        import pyotp
        totp = pyotp.TOTP(totp_secret).now()
        logger.info("Authenticating with TOTP...")
        try:
            _cached_access_token = GrowwAPI.get_access_token(api_key=totp_token, totp=totp)
            logger.info("Access token obtained via TOTP flow")
            return _cached_access_token
        except Exception as e:
            logger.error(f"TOTP auth failed: {e}")
            raise HTTPException(
                status_code=401,
                detail=f"TOTP authentication failed: {e}"
            )

    # Flow 3: Raw access token
    raw_token = os.getenv("GROWW_ACCESS_TOKEN", "")
    if raw_token:
        _cached_access_token = raw_token
        logger.info("Using raw access token from GROWW_ACCESS_TOKEN")
        return _cached_access_token

    raise HTTPException(
        status_code=500,
        detail="No Groww API credentials configured. "
               "Set GROWW_API_KEY + GROWW_API_SECRET, OR "
               "GROWW_TOTP_TOKEN + GROWW_TOTP_SECRET, OR "
               "GROWW_ACCESS_TOKEN in .env"
    )


def _invalidate_groww_client():
    """Clear cached client and token so the next call re-authenticates."""
    global _cached_access_token, _cached_groww_client
    with _token_lock:
        _cached_access_token = None
        _cached_groww_client = None
    logger.info("Groww client cache invalidated — will re-auth on next request")


def get_groww_client(force_refresh: bool = False):
    """Returns the globally initialized GrowwAPI client.
    
    If force_refresh=True, drops the cached client and re-authenticates
    (re-reading .env for updated credentials).
    """
    global _cached_groww_client
    with _token_lock:
        if _cached_groww_client and not force_refresh:
            return _cached_groww_client
        from growwapi import GrowwAPI
        _cached_groww_client = None
        token = _get_access_token(force_refresh=force_refresh)
        _cached_groww_client = GrowwAPI(token)
        return _cached_groww_client


def _is_auth_error(exc: Exception) -> bool:
    """Check if an exception is an authentication / token-expired error."""
    msg = str(exc).lower()
    return any(kw in msg for kw in (
        "authentication failed", "token", "expired", "invalid",
        "unauthorized", "401", "auth",
    ))


# Initialize client immediately so colorama.init() runs on the main thread
try:
    logger.info("Initializing GrowwAPI client on main thread...")
    get_groww_client()
except Exception as e:
    logger.error(f"Failed to initialize GrowwAPI client on startup: {e}")


# ── FastAPI App ──
app = FastAPI(
    title="FnoPilot API",
    description="FnoPilot — Options Analytics Platform API for Groww Trade",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Thread pool for blocking Groww API calls ──
_executor = ThreadPoolExecutor(max_workers=12)


# ── Real-Time Feed State ──
_feed_instance: Any = None
_feed_cache: Dict[str, Any] = {"indices": {}, "ltp": {}, "ts": 0}
_feed_started = False
_active_ws: set = set()
_tracked_option_symbols: List[str] = []  # "NSE_NIFTY25N1823400CE" format
_tracked_options_lock = threading.Lock()

# Cache previous-close prices so we can derive change/change_perc from the live feed value
_index_prev_close: Dict[str, float] = {}  # display_name -> previous close

# ── Dynamic Instrument CSV State ──
GROWW_INSTRUMENTS_CSV_URL = "https://growwapi-assets.groww.in/instruments/instrument.csv"
_csv_last_loaded: Optional[datetime] = None
_CSV_REFRESH_HOURS = 6

# Index tokens for GrowwFeed subscribe_index_value
INDEX_FEED_TOKENS = [
    {"exchange": "NSE", "segment": "CASH", "exchange_token": "NIFTY"},
    {"exchange": "BSE", "segment": "CASH", "exchange_token": "SENSEX"},
    {"exchange": "BSE", "segment": "CASH", "exchange_token": "BANKEX"},
]

# Feed token → display name mapping
INDEX_TOKEN_DISPLAY = {
    "NIFTY": "NIFTY 50",
    "SENSEX": "SENSEX",
    "BANKEX": "BANKEX",
}

# ── Symbol Normalization ──
# Map long / alternate names to the SHORT symbols expected by Groww option-chain API.
# The API accepts BANKNIFTY (not "NIFTY BANK"), FINNIFTY (not "NIFTY FIN SERVICE"), etc.
UNDERLYING_ALIAS_MAP = {
    "NIFTY BANK": "BANKNIFTY",
    "NIFTY FIN SERVICE": "FINNIFTY",
    "NIFTY MID SELECT": "MIDCPNIFTY",
    "MIDCAP SELECT": "MIDCPNIFTY",
    "NIFTY NEXT 50": "NIFTYNXT50",
}

def normalize_underlying(symbol: str) -> str:
    """Normalize underlying symbol alias to the Groww API expected name."""
    key = symbol.upper().strip()
    return UNDERLYING_ALIAS_MAP.get(key, key)


# ── Models ──
class IndexPrice(BaseModel):
    symbol: str
    ltp: float
    change: Optional[float] = None
    change_perc: Optional[float] = None


class Greeks(BaseModel):
    delta: float = 0
    gamma: float = 0
    theta: float = 0
    vega: float = 0
    rho: float = 0
    iv: float = 0


class OptionLeg(BaseModel):
    trading_symbol: str
    ltp: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    change_perc: Optional[float] = None
    oi_change: Optional[int] = None
    open_interest: int
    volume: int
    greeks: Greeks


class StrikeData(BaseModel):
    strike_price: float
    CE: Optional[OptionLeg] = None
    PE: Optional[OptionLeg] = None


class OptionChainResponse(BaseModel):
    underlying_ltp: float
    strikes: List[StrikeData]
    expiry_date: str
    pcr: float
    max_pain: float
    atm_strike: float
    total_strikes: int
    lot_size: int = 1


# ── Helper Functions ──

def calculate_pcr(strikes_data: Dict[str, Any]) -> float:
    """Calculate Put-Call Ratio from OI data."""
    total_put_oi = 0
    total_call_oi = 0
    for strike, data in strikes_data.items():
        if "CE" in data and "open_interest" in data["CE"]:
            total_call_oi += int(data["CE"]["open_interest"])
        if "PE" in data and "open_interest" in data["PE"]:
            total_put_oi += int(data["PE"]["open_interest"])
    if total_call_oi > 0:
        return round(float(total_put_oi) / float(total_call_oi), 4)
    return 0.0


def calculate_max_pain(strikes_data: Dict[str, Any]) -> float:
    """
    Calculate Max Pain — the strike price where option writers (sellers)
    would have the least financial loss.
    """
    strike_prices = sorted([float(s) for s in strikes_data.keys()])
    if not strike_prices:
        return 0.0
    min_pain = float("inf")
    max_pain_strike = strike_prices[0]

    for test_strike in strike_prices:
        total_pain = 0.0
        for strike_str, data in strikes_data.items():
            strike = float(strike_str)
            if "CE" in data:
                ce_oi = data["CE"].get("open_interest", 0)
                if test_strike > strike:
                    total_pain += (test_strike - strike) * ce_oi
            if "PE" in data:
                pe_oi = data["PE"].get("open_interest", 0)
                if test_strike < strike:
                    total_pain += (strike - test_strike) * pe_oi

        if total_pain < min_pain:
            min_pain = total_pain
            max_pain_strike = test_strike

    return max_pain_strike


def find_atm_strike(underlying_ltp: float, strike_prices: list) -> float:
    """Find the ATM (At The Money) strike closest to the underlying LTP."""
    if not strike_prices:
        return 0
    return min(strike_prices, key=lambda s: abs(s - underlying_ltp))


# ── Expiry Dates from CSV ──
# Populated during CSV loading — maps "UNDERLYING_EXCHANGE" → sorted list of future expiry dates
_csv_expiry_dates: Dict[str, List[str]] = {}


def _get_expiry_dates_from_csv(underlying: str, exchange: str) -> List[str]:
    """
    Return valid expiry dates for an underlying, extracted from the Groww
    instrument CSV during startup.  No API probing needed — instant response.
    Only returns dates >= today.
    """
    api_underlying = normalize_underlying(underlying)
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Try exact key first, then just the underlying (some underlyings appear on both exchanges)
    for key in (f"{api_underlying}_{exchange.upper()}", f"{underlying.upper()}_{exchange.upper()}"):
        dates = _csv_expiry_dates.get(key, [])
        if dates:
            future = [d for d in dates if d >= today_str]
            if future:
                logger.info(f"CSV expiry dates for {key}: {len(future)} dates (nearest: {future[0]})")
                return future

    # Fallback: search all keys containing this underlying
    for key, dates in _csv_expiry_dates.items():
        if key.startswith(f"{api_underlying}_") or key.startswith(f"{underlying.upper()}_"):
            future = [d for d in dates if d >= today_str]
            if future:
                logger.info(f"CSV expiry dates (fuzzy match {key}): {len(future)} dates")
                return future

    logger.warning(f"No expiry dates found in CSV for {underlying} ({api_underlying}) @ {exchange}")
    return []


# ── Index Configuration ──
# Each index: (ltp_symbol, display_name, quote_exchange, quote_trading_symbol)
INDEX_CONFIG = [
    ("NSE_NIFTY", "NIFTY 50", "NSE", "NIFTY"),
    ("BSE_SENSEX", "SENSEX", "BSE", "SENSEX"),
    ("BSE_BANKEX", "BANKEX", "BSE", "BANKEX"),
]


def _fetch_single_index(config_tuple: tuple, groww: Any) -> Optional[dict]:
    """Fetch a single index price — runs in thread pool."""
    ltp_sym, display_name, quote_exchange, quote_symbol = config_tuple
    try:
        exchange_const = groww.EXCHANGE_NSE if quote_exchange == "NSE" else groww.EXCHANGE_BSE
        quote = groww.get_quote(
            exchange=exchange_const,
            segment=groww.SEGMENT_CASH,
            trading_symbol=quote_symbol,
        )
        ltp = quote.get("last_price", 0)
        change = quote.get("day_change")
        change_perc = quote.get("day_change_perc")

        if ltp:
            # Cache previous close so the real-time feed can compute change
            ltp_f = float(ltp)
            if change is not None:
                prev_close = ltp_f - float(change)
                if prev_close > 0:
                    _index_prev_close[display_name] = prev_close
            return {
                "symbol": display_name,
                "ltp": ltp_f,
                "change": float(change) if change is not None else None,
                "change_perc": float(change_perc) if change_perc is not None else None,
            }
    except Exception as e:
        # If quote fails, try LTP as fallback
        try:
            ltp_response = groww.get_ltp(
                segment=groww.SEGMENT_CASH,
                exchange_trading_symbols=(ltp_sym,),
            )
            ltp_val = ltp_response.get(ltp_sym, 0)
            if ltp_val:
                return {
                    "symbol": display_name,
                    "ltp": float(ltp_val),
                    "change": None,
                    "change_perc": None,
                }
        except Exception:
            # Some indices (NIFTY NEXT 50, etc.) may not work via REST — they
            # still work via GrowwFeed, so just log at debug level.
            logger.debug(f"Index REST fetch failed for {display_name} (will use feed): {e}")
    return None


# ── GrowwFeed Initialization ──

def _init_groww_feed():
    """Initialize GrowwFeed in synchronous mode for real-time index data."""
    global _feed_instance, _feed_started
    try:
        groww = get_groww_client()
        from growwapi import GrowwFeed
        _feed_instance = GrowwFeed(groww)
        # Subscribe to index values (sync mode — no consume() needed)
        _feed_instance.subscribe_index_value(INDEX_FEED_TOKENS)
        _feed_started = True
        logger.info("GrowwFeed initialized — subscribed to index values")
    except Exception as e:
        logger.error(f"Failed to init GrowwFeed: {e}")
        _feed_started = False


def _feed_poll_loop():
    """Background thread: poll feed data every second and update cache."""
    while True:
        try:
            if _feed_started and _feed_instance:
                idx = _feed_instance.get_index_value()
                if idx:
                    _feed_cache["indices"] = idx
                _feed_cache["ts"] = time_module.time()
        except Exception as e:
            logger.error(f"Feed poll error: {e}")
        time_module.sleep(1)


def _transform_index_feed_data() -> List[dict]:
    """Transform raw feed index data into frontend-compatible format."""
    indices = []
    raw = _feed_cache.get("indices", {})
    if not raw:
        return indices
    # GrowwFeed returns: {"NSE": {"CASH": {"NIFTY": {"tsInMillis": ..., "value": ...}}}}
    for exchange, segments in raw.items():
        if not isinstance(segments, dict):
            continue
        for segment, tokens in segments.items():
            if not isinstance(tokens, dict):
                continue
            for token, data in tokens.items():
                if not isinstance(data, dict):
                    continue
                name = INDEX_TOKEN_DISPLAY.get(token, token)
                ltp_val = data.get("value", 0)
                change = None
                change_perc = None
                prev = _index_prev_close.get(name)
                if prev and prev > 0 and ltp_val:
                    change = round(float(ltp_val) - prev, 2)
                    change_perc = round((change / prev) * 100, 2)
                indices.append({
                    "symbol": name,
                    "ltp": ltp_val,
                    "change": change,
                    "change_perc": change_perc,
                })
    return indices


# ── App Startup ──

@app.on_event("startup")
async def startup_event():
    """Initialize GrowwFeed, load instrument CSV, and start background polling."""
    # ── Load instrument CSV (first attempt, synchronous) ──
    _load_instruments_from_csv()

    def _startup_thread():
        _init_groww_feed()
        _feed_poll_loop()  # Runs forever

    thread = threading.Thread(target=_startup_thread, daemon=True)
    thread.start()

    # ── Background CSV refresh task ──
    async def _csv_refresh_loop():
        while True:
            await asyncio.sleep(_CSV_REFRESH_HOURS * 3600)
            try:
                logger.info("Scheduled CSV refresh starting...")
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_executor, _load_instruments_from_csv)
            except Exception as e:
                logger.error(f"Scheduled CSV refresh failed: {e}")

    asyncio.create_task(_csv_refresh_loop())
    logger.info("FnoPilot API started — feed polling + CSV refresh launched")


# ── Real-Time Endpoints ──

@app.get("/api/live/indices")
async def live_indices():
    """
    Returns index prices from GrowwFeed cache (near-instant).
    Falls back to REST API if feed is not running.
    """
    if _feed_started and _feed_cache.get("ts", 0) > 0:
        indices = _transform_index_feed_data()
        if indices:
            return {"indices": indices, "source": "feed"}

    # Fallback to REST if feed not available
    return await get_index_prices()


@app.post("/api/batch-ltp")
async def batch_ltp(body: dict):
    """
    Fetch LTPs for multiple option trading symbols in one call.
    Accepts: {"symbols": ["NIFTY25N1823400CE", ...], "exchange": "NSE", "segment": "FNO"}
    Returns: {"ltps": {"NSE_NIFTY25N1823400CE": 247.3, ...}}
    """
    try:
        symbols = body.get("symbols", [])
        exchange = body.get("exchange", "NSE").upper()
        segment = body.get("segment", "FNO").upper()
        if not symbols:
            return {"ltps": {}}

        groww = get_groww_client()
        segment_const = groww.SEGMENT_FNO if segment == "FNO" else groww.SEGMENT_CASH
        all_ltps = {}

        # Batch in groups of 50 (API limit)
        for i in range(0, len(symbols), 50):
            batch = symbols[i:i + 50]
            exchange_symbols = tuple(f"{exchange}_{sym}" for sym in batch)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                _executor,
                lambda es=exchange_symbols: groww.get_ltp(
                    segment=segment_const,
                    exchange_trading_symbols=es if len(es) > 1 else es[0],
                )
            )
            if result:
                all_ltps.update(result)

        return {"ltps": all_ltps}
    except Exception as e:
        logger.error(f"Batch LTP error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── WebSocket Feed ──

@app.websocket("/ws/feed")
async def websocket_feed(ws: WebSocket):
    """
    WebSocket endpoint for real-time data updates.
    Pushes index values and option LTPs to connected clients.
    Accepts subscription messages: {"action": "subscribe_options", "symbols": [...], "exchange": "NSE"}
    """
    await ws.accept()
    _active_ws.add(ws)
    logger.info(f"WebSocket client connected. Total: {len(_active_ws)}")

    async def sender():
        """Push real-time updates to client every second."""
        last_index_ts = 0
        ltp_backoff = 0  # seconds of extra delay after rate-limit errors
        while True:
            try:
                update = {}

                # 1. Index values from GrowwFeed cache
                current_ts = _feed_cache.get("ts", 0)
                if current_ts > last_index_ts and _feed_started:
                    indices = _transform_index_feed_data()
                    if indices:
                        update["index_update"] = indices
                    last_index_ts = current_ts

                # 2. Option LTPs — batch fetch from REST API (skip if in backoff)
                with _tracked_options_lock:
                    symbols = list(_tracked_option_symbols)

                if symbols and ltp_backoff <= 0:
                    try:
                        groww = get_groww_client()
                        all_ltps = {}
                        for i in range(0, len(symbols), 50):
                            batch = tuple(symbols[i:i + 50])
                            loop = asyncio.get_event_loop()
                            result = await loop.run_in_executor(
                                _executor,
                                lambda b=batch: groww.get_ltp(
                                    segment=groww.SEGMENT_FNO,
                                    exchange_trading_symbols=b if len(b) > 1 else b[0],
                                )
                            )
                            if result:
                                all_ltps.update(result)
                        if all_ltps:
                            update["ltp_update"] = all_ltps
                    except Exception as e:
                        err_msg = str(e).lower()
                        if "rate limit" in err_msg or "rate_limit" in err_msg or "too many" in err_msg:
                            ltp_backoff = 15  # back off 15 seconds on rate limit
                            logger.warning(f"WS LTP rate-limited, backing off {ltp_backoff}s")
                        else:
                            logger.error(f"WS LTP poll error: {e}")
                elif ltp_backoff > 0:
                    ltp_backoff -= 2  # decrease by sleep interval

                # 3. Push update
                if update:
                    await ws.send_json(update)

            except Exception:
                break
            await asyncio.sleep(2)  # Push updates every 2 seconds

    async def receiver():
        """Handle subscription messages from client."""
        while True:
            try:
                data = await ws.receive_json()
                action = data.get("action")

                if action == "subscribe_options":
                    symbols = data.get("symbols", [])
                    exchange = data.get("exchange", "NSE")
                    with _tracked_options_lock:
                        _tracked_option_symbols.clear()
                        for sym in symbols:
                            _tracked_option_symbols.append(f"{exchange}_{sym}")
                    logger.info(f"WS: Subscribed to {len(symbols)} FNO symbols")

                elif action == "unsubscribe_options":
                    with _tracked_options_lock:
                        _tracked_option_symbols.clear()
                    logger.info("WS: Unsubscribed from FNO symbols")

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WS receive error: {e}")
                break

    try:
        done, pending = await asyncio.wait(
            {asyncio.create_task(sender()), asyncio.create_task(receiver())},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
    except Exception:
        pass
    finally:
        _active_ws.discard(ws)
        logger.info(f"WebSocket client disconnected. Total: {len(_active_ws)}")


# ── Endpoints ──

@app.get("/")
async def root():
    return {"status": "ok", "service": "FnoPilot API", "version": "2.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/index-prices")
async def get_index_prices():
    """
    Fetch LTP + change data for major indices via Groww API.
    Uses PARALLEL calls for all indices to avoid sequential blocking.
    If GrowwFeed is active, returns feed data for speed.
    """
    # Try feed first for instant response
    if _feed_started and _feed_cache.get("ts", 0) > 0:
        indices = _transform_index_feed_data()
        if indices:
            return {"indices": indices}

    try:
        groww = get_groww_client()
        loop = asyncio.get_event_loop()

        # Fetch all indices in parallel using thread pool
        futures = []
        for config in INDEX_CONFIG:
            future = loop.run_in_executor(_executor, _fetch_single_index, config, groww)
            futures.append(future)

        results = await asyncio.gather(*futures, return_exceptions=True)

        # Check if ALL results are auth errors → retry with fresh token
        auth_errors = [r for r in results if isinstance(r, Exception) and _is_auth_error(r)]
        if auth_errors and len(auth_errors) == len(results):
            logger.warning("All index fetches failed with auth error, refreshing token and retrying...")
            groww = get_groww_client(force_refresh=True)
            futures = [loop.run_in_executor(_executor, _fetch_single_index, c, groww) for c in INDEX_CONFIG]
            results = await asyncio.gather(*futures, return_exceptions=True)

        indices = []
        for result in results:
            if isinstance(result, dict):
                indices.append(result)
            elif isinstance(result, Exception):
                logger.warning(f"Index fetch error: {result}")

        return {"indices": indices}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Index prices error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/option-chain")
async def get_option_chain(
    underlying: str = Query(..., description="Underlying symbol, e.g. NIFTY, BANKNIFTY"),
    expiry_date: str = Query(..., description="Expiry date in YYYY-MM-DD format"),
    exchange: str = Query("NSE", description="Exchange: NSE or BSE"),
):
    """
    Fetch complete option chain from Groww API.
    Returns strikes with CE/PE data including Greeks, OI, volume.
    """
    try:
        groww = get_groww_client()
        api_underlying = normalize_underlying(underlying)

        exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE

        logger.info(f"Fetching option chain: {underlying} (api: {api_underlying}) @ {exchange} expiry={expiry_date}")

        # Run blocking API call in thread pool (with auto-retry on auth errors)
        loop = asyncio.get_event_loop()
        try:
            oc_response = await loop.run_in_executor(
                _executor,
                lambda: groww.get_option_chain(
                    exchange=exchange_const,
                    underlying=api_underlying,
                    expiry_date=expiry_date,
                )
            )
        except Exception as api_err:
            if _is_auth_error(api_err):
                logger.warning(f"Auth error on option-chain, refreshing token and retrying...")
                groww = get_groww_client(force_refresh=True)
                exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE
                oc_response = await loop.run_in_executor(
                    _executor,
                    lambda: groww.get_option_chain(
                        exchange=exchange_const,
                        underlying=api_underlying,
                        expiry_date=expiry_date,
                    )
                )
            else:
                raise

        underlying_ltp = oc_response.get("underlying_ltp", 0)
        raw_strikes: Dict[str, Any] = oc_response.get("strikes", {})

        logger.info(f"Underlying LTP: {underlying_ltp}, Num strikes: {len(raw_strikes)}")

        # Calculate analytics
        pcr = calculate_pcr(raw_strikes)
        max_pain = calculate_max_pain(raw_strikes)
        strike_prices = sorted([float(s) for s in raw_strikes.keys()])
        atm_strike = find_atm_strike(underlying_ltp, strike_prices)

        # Build structured response
        strikes_list = []
        for strike_str in sorted(raw_strikes.keys(), key=lambda x: float(x)):
            data = raw_strikes[strike_str]
            strike_item: Dict[str, Any] = {
                "strike_price": float(strike_str),
                "CE": None,
                "PE": None,
            }

            if "CE" in data:
                ce = data["CE"]
                greeks_data = ce.get("greeks", {})
                strike_item["CE"] = {
                    "trading_symbol": ce.get("trading_symbol", ""),
                    "ltp": ce.get("ltp", 0),
                    "bid": ce.get("bid_price", ce.get("bid", None)),
                    "ask": ce.get("offer_price", ce.get("ask", ce.get("ask_price", None))),
                    "change_perc": ce.get("day_change_perc", ce.get("change_perc", ce.get("change_percentage", None))),
                    "oi_change": ce.get("oi_day_change", ce.get("oi_change", ce.get("open_interest_change", None))),
                    "open_interest": ce.get("open_interest", 0),
                    "volume": ce.get("volume", 0),
                    "greeks": {
                        "delta": greeks_data.get("delta", 0),
                        "gamma": greeks_data.get("gamma", 0),
                        "theta": greeks_data.get("theta", 0),
                        "vega": greeks_data.get("vega", 0),
                        "rho": greeks_data.get("rho", 0),
                        "iv": greeks_data.get("iv", 0),
                    },
                }

            if "PE" in data:
                pe = data["PE"]
                greeks_data = pe.get("greeks", {})
                strike_item["PE"] = {
                    "trading_symbol": pe.get("trading_symbol", ""),
                    "ltp": pe.get("ltp", 0),
                    "bid": pe.get("bid_price", pe.get("bid", None)),
                    "ask": pe.get("offer_price", pe.get("ask", pe.get("ask_price", None))),
                    "change_perc": pe.get("day_change_perc", pe.get("change_perc", pe.get("change_percentage", None))),
                    "oi_change": pe.get("oi_day_change", pe.get("oi_change", pe.get("open_interest_change", None))),
                    "open_interest": pe.get("open_interest", 0),
                    "volume": pe.get("volume", 0),
                    "greeks": {
                        "delta": greeks_data.get("delta", 0),
                        "gamma": greeks_data.get("gamma", 0),
                        "theta": greeks_data.get("theta", 0),
                        "vega": greeks_data.get("vega", 0),
                        "rho": greeks_data.get("rho", 0),
                        "iv": greeks_data.get("iv", 0),
                    },
                }

            strikes_list.append(strike_item)

        return {
            "underlying_ltp": underlying_ltp,
            "strikes": strikes_list,
            "expiry_date": expiry_date,
            "pcr": pcr,
            "max_pain": max_pain,
            "atm_strike": atm_strike,
            "total_strikes": len(strikes_list),
            "lot_size": LOT_SIZES.get(underlying.upper().strip(), LOT_SIZES.get(api_underlying.upper().strip(), 1)),
        }

    except HTTPException:
        raise
    except Exception as e:
        if _is_auth_error(e):
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Your API token has either expired or is invalid. "
                       "Update GROWW_API_KEY + GROWW_API_SECRET in backend/.env and the server "
                       "will auto-refresh on the next request."
            )
        logger.error(f"Option chain error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quote")
async def get_quote(
    symbol: str = Query(..., description="Trading symbol"),
    exchange: str = Query("NSE", description="Exchange: NSE or BSE"),
    segment: str = Query("CASH", description="Segment: CASH or FNO"),
):
    """Fetch real-time quote for an instrument."""
    try:
        groww = get_groww_client()
        exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE
        segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO

        loop = asyncio.get_event_loop()
        try:
            quote = await loop.run_in_executor(
                _executor,
                lambda: groww.get_quote(
                    exchange=exchange_const,
                    segment=segment_const,
                    trading_symbol=symbol,
                )
            )
        except Exception as api_err:
            if _is_auth_error(api_err):
                logger.warning("Auth error on quote, refreshing token and retrying...")
                groww = get_groww_client(force_refresh=True)
                exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE
                segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO
                quote = await loop.run_in_executor(
                    _executor,
                    lambda: groww.get_quote(
                        exchange=exchange_const,
                        segment=segment_const,
                        trading_symbol=symbol,
                    )
                )
            else:
                raise
        return quote
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ltp")
async def get_ltp(
    symbols: str = Query(..., description="Comma-separated exchange_trading_symbols"),
    segment: str = Query("CASH", description="Segment: CASH or FNO"),
):
    """Fetch LTP for multiple instruments."""
    try:
        groww = get_groww_client()
        segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO
        symbol_list = tuple(s.strip() for s in symbols.split(",") if s.strip())

        loop = asyncio.get_event_loop()
        try:
            ltp_response = await loop.run_in_executor(
                _executor,
                lambda: groww.get_ltp(
                    segment=segment_const,
                    exchange_trading_symbols=symbol_list if len(symbol_list) > 1 else symbol_list[0],
                )
            )
        except Exception as api_err:
            if _is_auth_error(api_err):
                logger.warning("Auth error on LTP, refreshing token and retrying...")
                groww = get_groww_client(force_refresh=True)
                segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO
                ltp_response = await loop.run_in_executor(
                    _executor,
                    lambda: groww.get_ltp(
                        segment=segment_const,
                        exchange_trading_symbols=symbol_list if len(symbol_list) > 1 else symbol_list[0],
                    )
                )
            else:
                raise
        return ltp_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LTP error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/expiry-dates")
async def get_expiry_dates(
    underlying: str = Query("NIFTY", description="Underlying symbol"),
    exchange: str = Query("NSE", description="Exchange: NSE or BSE"),
):
    """
    Return valid expiry dates extracted from the Groww instrument CSV.
    Instant response — no API probing needed.
    """
    try:
        valid_dates = _get_expiry_dates_from_csv(underlying, exchange)
        return {"expiry_dates": valid_dates, "underlying": underlying}
    except Exception as e:
        logger.error(f"Expiry dates error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/refresh-token")
async def refresh_token():
    """Force re-authentication by re-reading .env and obtaining a fresh token."""
    try:
        _invalidate_groww_client()
        get_groww_client(force_refresh=True)
        return {"status": "ok", "message": "Token refreshed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Lot Size & Instruments — Fallback Constants ──
# These are used ONLY if the Groww CSV download fails on startup.
_FALLBACK_LOT_SIZES: Dict[str, int] = {
    "NIFTY": 25, "NIFTY 50": 25, "BANKNIFTY": 15, "NIFTY BANK": 15,
    "FINNIFTY": 25, "NIFTY FIN SERVICE": 25, "MIDCPNIFTY": 50,
    "NIFTY MID SELECT": 50, "MIDCAP SELECT": 50, "NIFTY NEXT 50": 25,
    "SENSEX": 10, "BANKEX": 15,
    "RELIANCE": 250, "TCS": 150, "INFY": 300, "HDFCBANK": 550,
    "ICICIBANK": 700, "SBIN": 750, "BHARTIARTL": 950, "ITC": 1600,
    "KOTAKBANK": 400, "LT": 150, "HINDUNILVR": 300, "BAJFINANCE": 125,
    "MARUTI": 100, "TATAMOTORS": 1400, "TATASTEEL": 6100, "AXISBANK": 600,
    "WIPRO": 1500, "ADANIENT": 250, "SUNPHARMA": 350, "HCLTECH": 350,
    "POWERGRID": 2700, "NTPC": 2250, "ONGC": 3850, "COALINDIA": 1200,
    "JSWSTEEL": 675, "M&M": 350, "TECHM": 400,
    "ASIANPAINT": 300, "BAJAJFINSV": 500, "TITAN": 375, "NESTLEIND": 200,
    "ULTRACEMCO": 100, "DRREDDY": 125, "CIPLA": 650, "DIVISLAB": 175,
    "APOLLOHOSP": 125, "EICHERMOT": 175, "HEROMOTOCO": 200, "BAJAJ-AUTO": 125,
    "TRENT": 100, "SHRIRAMFIN": 300, "BEL": 3000, "HAL": 150,
    "TATACONSUM": 850, "GRASIM": 275, "INDUSINDBK": 500, "ADANIPORTS": 625,
    "HINDALCO": 1000, "BPCL": 1800, "IOC": 4500, "VEDL": 1500,
    "TATAPOWER": 2250, "PNB": 8000, "BANKBARODA": 3600, "CANBK": 6750,
    "FEDERALBNK": 5000, "IDFCFIRSTB": 10000, "DLF": 825, "GODREJCP": 500,
    "DABUR": 1250, "PIDILITIND": 250, "HAVELLS": 500, "SIEMENS": 100,
    "ABB": 125, "AMBUJACEM": 900, "SHREECEM": 25, "ACC": 250,
    "INDUSTOWER": 2100, "ZOMATO": 3000, "PAYTM": 600, "NYKAA": 3500,
    "DMART": 125, "LTIM": 150, "PERSISTENT": 100, "COFORGE": 75,
    "MPHASIS": 175, "IDEA": 100000, "SAIL": 5700, "NMDC": 3350,
    "BHEL": 3150, "RECLTD": 1200, "PFC": 1500, "IRFC": 5000,
    "IRCTC": 500, "LTF": 4500, "CHOLAFIN": 500, "MUTHOOTFIN": 400,
    "MANAPPURAM": 4000, "VOLTAS": 400, "DIXON": 50, "POLYCAB": 100,
    "PAGEIND": 15, "MFSL": 500, "SBILIFE": 375, "HDFCLIFE": 1100,
    "ICICIPRULI": 1050,
}

_FALLBACK_INSTRUMENTS: List[Dict] = [
    {"symbol": "NIFTY", "name": "Nifty 50", "exchange": "NSE", "type": "INDEX"},
    {"symbol": "BANKNIFTY", "name": "Bank Nifty", "exchange": "NSE", "type": "INDEX"},
    {"symbol": "FINNIFTY", "name": "Fin Nifty", "exchange": "NSE", "type": "INDEX"},
    {"symbol": "MIDCPNIFTY", "name": "Midcap Nifty", "exchange": "NSE", "type": "INDEX"},
    {"symbol": "SENSEX", "name": "Sensex", "exchange": "BSE", "type": "INDEX"},
    {"symbol": "BANKEX", "name": "Bankex", "exchange": "BSE", "type": "INDEX"},
    {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "INFY", "name": "Infosys", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "ITC", "name": "ITC Limited", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "LT", "name": "Larsen & Toubro", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "TATASTEEL", "name": "Tata Steel", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "AXISBANK", "name": "Axis Bank", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "WIPRO", "name": "Wipro", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical", "exchange": "NSE", "type": "STOCK"},
    {"symbol": "HCLTECH", "name": "HCL Technologies", "exchange": "NSE", "type": "STOCK"},
]

# ── Mutable module-level dicts populated from CSV (or fallback) ──
LOT_SIZES: Dict[str, int] = dict(_FALLBACK_LOT_SIZES)
INSTRUMENTS: List[Dict] = list(_FALLBACK_INSTRUMENTS)

# Known F&O index underlying symbols → human-readable display names
_INDEX_DISPLAY_NAMES: Dict[str, str] = {
    "NIFTY": "Nifty 50",
    "BANKNIFTY": "Bank Nifty",
    "FINNIFTY": "Fin Nifty",
    "MIDCPNIFTY": "Midcap Nifty",
    "NIFTYNXT50": "Nifty Next 50",
    "SENSEX": "Sensex",
    "BANKEX": "Bankex",
}


def _load_instruments_from_csv() -> None:
    """
    Download Groww's instrument CSV, parse it, and populate LOT_SIZES,
    INSTRUMENTS, and _csv_expiry_dates.
    Falls back to _FALLBACK_* constants on any failure.
    Thread-safe: called from startup and periodic refresh.
    """
    global LOT_SIZES, INSTRUMENTS, _csv_last_loaded, _csv_expiry_dates

    url = GROWW_INSTRUMENTS_CSV_URL
    logger.info(f"Downloading instrument CSV from {url} ...")

    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            resp = client.get(url)
            resp.raise_for_status()
        csv_text = resp.text
    except Exception as e:
        logger.error(f"CSV download failed: {e} — keeping {'existing' if _csv_last_loaded else 'fallback'} data")
        if not _csv_last_loaded:
            LOT_SIZES = dict(_FALLBACK_LOT_SIZES)
            INSTRUMENTS = list(_FALLBACK_INSTRUMENTS)
        return

    reader = csv.DictReader(io.StringIO(csv_text))

    # ── Pass 1: Collect FNO underlying → lot_size, expiry dates, and names from CASH EQ ──
    fno_underlyings: Dict[str, int] = {}       # symbol → lot_size
    fno_exchanges: Dict[str, str] = {}          # symbol → exchange (NSE/BSE)
    cash_names: Dict[str, str] = {}             # trading_symbol → company name
    expiry_dates_map: Dict[str, set] = {}       # "UNDERLYING_EXCHANGE" → set of expiry dates
    rows_processed = 0

    for row in reader:
        rows_processed += 1
        segment = row.get("segment", "").strip()
        exchange = row.get("exchange", "").strip()
        instrument_type = row.get("instrument_type", "").strip()

        # Collect company names from CASH EQ rows
        if segment == "CASH" and instrument_type == "EQ":
            ts = row.get("trading_symbol", "").strip()
            name = row.get("name", "").strip()
            if ts and name:
                cash_names[ts] = name

        # Collect FNO underlyings with lot sizes AND expiry dates
        if segment == "FNO":
            underlying = row.get("underlying_symbol", "").strip()
            lot_str = row.get("lot_size", "").strip()
            expiry_date = row.get("expiry_date", "").strip()
            if not underlying or not lot_str:
                continue
            # Skip test/internal symbols
            if "NSETEST" in underlying or "BSETEST" in underlying:
                continue
            try:
                lot = int(lot_str)
            except ValueError:
                continue
            if lot > 0 and underlying not in fno_underlyings:
                fno_underlyings[underlying] = lot
                fno_exchanges[underlying] = exchange

            # Collect expiry dates for this underlying
            if expiry_date and lot > 0:
                key = f"{underlying}_{exchange}"
                if key not in expiry_dates_map:
                    expiry_dates_map[key] = set()
                expiry_dates_map[key].add(expiry_date)

    if not fno_underlyings:
        logger.warning("CSV parsed but no FNO instruments found — keeping existing data")
        return

    # ── Build expiry dates (sorted, deduplicated) ──
    new_expiry_dates: Dict[str, List[str]] = {}
    total_expiry_count = 0
    for key, dates in expiry_dates_map.items():
        sorted_dates = sorted(dates)
        new_expiry_dates[key] = sorted_dates
        total_expiry_count += len(sorted_dates)

    # Also add alias-based keys so lookups by canonical name work
    for alias, canonical in UNDERLYING_ALIAS_MAP.items():
        for exchange_suffix in ("_NSE", "_BSE"):
            alias_key = f"{alias}{exchange_suffix}"
            canonical_key = f"{canonical}{exchange_suffix}"
            if alias_key in new_expiry_dates and canonical_key not in new_expiry_dates:
                new_expiry_dates[canonical_key] = new_expiry_dates[alias_key]
            elif canonical_key in new_expiry_dates and alias_key not in new_expiry_dates:
                new_expiry_dates[alias_key] = new_expiry_dates[canonical_key]

    # ── Build LOT_SIZES with alias support ──
    new_lot_sizes: Dict[str, int] = {}
    for sym, lot in fno_underlyings.items():
        new_lot_sizes[sym] = lot
        # Add Groww API alias forms (UNDERLYING_ALIAS_MAP is alias → canonical)
        # We need reverse: canonical → alias  AND  alias → canonical
        for alias, canonical in UNDERLYING_ALIAS_MAP.items():
            if sym == alias:
                new_lot_sizes[canonical] = lot
            elif sym == canonical:
                new_lot_sizes[alias] = lot

    # ── Build INSTRUMENTS list ──
    # Index underlyings (FNO underlyings that are known indices)
    index_syms = set(_INDEX_DISPLAY_NAMES.keys())
    new_instruments: List[Dict] = []
    seen_symbols: set = set()

    # Indices first
    for sym in sorted(fno_underlyings.keys()):
        if sym in index_syms:
            new_instruments.append({
                "symbol": sym,
                "name": _INDEX_DISPLAY_NAMES.get(sym, sym),
                "exchange": fno_exchanges.get(sym, "NSE"),
                "type": "INDEX",
            })
            seen_symbols.add(sym)

    # Stocks (everything else)
    for sym in sorted(fno_underlyings.keys()):
        if sym in seen_symbols:
            continue
        name = cash_names.get(sym, sym)  # Use company name from CASH EQ, or symbol
        new_instruments.append({
            "symbol": sym,
            "name": name,
            "exchange": fno_exchanges.get(sym, "NSE"),
            "type": "STOCK",
        })
        seen_symbols.add(sym)

    # ── Atomically swap ──
    LOT_SIZES = new_lot_sizes
    INSTRUMENTS = new_instruments
    _csv_expiry_dates = new_expiry_dates
    _csv_last_loaded = datetime.now()

    logger.info(
        f"✓ Instrument CSV loaded: {len(new_lot_sizes)} lot sizes, "
        f"{len(new_instruments)} instruments "
        f"({sum(1 for i in new_instruments if i['type']=='INDEX')} indices + "
        f"{sum(1 for i in new_instruments if i['type']=='STOCK')} stocks), "
        f"{total_expiry_count} expiry dates across {len(new_expiry_dates)} underlyings "
        f"from {rows_processed:,} CSV rows"
    )


@app.get("/api/lot-sizes")
async def get_lot_sizes():
    """Return lot sizes for all configured underlyings."""
    return {"lot_sizes": LOT_SIZES}


@app.get("/api/lot-size")
async def get_lot_size(
    underlying: str = Query(..., description="Underlying symbol"),
):
    """Return lot size for a specific underlying."""
    key = underlying.upper().strip()
    api_key = normalize_underlying(underlying).upper().strip()
    lot_size = LOT_SIZES.get(key, LOT_SIZES.get(api_key, 1))
    return {"underlying": underlying, "lot_size": lot_size}


@app.get("/api/instruments")
async def get_instruments():
    """Return the full list of F&O instruments loaded from the Groww CSV."""
    return {"instruments": INSTRUMENTS, "count": len(INSTRUMENTS)}


@app.get("/api/instruments/search")
async def search_instruments(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Search for instruments — instant local lookup from CSV-loaded data."""
    query = q.upper()
    results = [
        inst for inst in INSTRUMENTS
        if query in inst["symbol"].upper() or query in inst["name"].upper()
    ]
    return {"results": results[:30]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
