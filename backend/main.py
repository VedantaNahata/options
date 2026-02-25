"""
OptiX Backend — FastAPI server for Groww API proxy
===================================================
All endpoints are lazy — they only call the Groww API when explicitly requested
by the frontend. No background polling or startup API calls.
"""

import os
from typing import Any, Optional, List, Dict, Union
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ── Groww API Setup ──
# Supports two authentication flows:
#   1. API Key + Secret  → set GROWW_API_KEY and GROWW_API_SECRET in .env
#   2. TOTP               → set GROWW_TOTP_TOKEN and GROWW_TOTP_SECRET in .env
# Legacy: GROWW_API_TOKEN (raw access token, if you already have one)

_cached_access_token: Optional[str] = None

def _get_access_token() -> str:
    """Generate or retrieve a cached Groww API access token."""
    global _cached_access_token
    if _cached_access_token:
        return _cached_access_token

    from growwapi import GrowwAPI

    # Flow 1: API Key + Secret
    api_key = os.getenv("GROWW_API_KEY", "")
    api_secret = os.getenv("GROWW_API_SECRET", "")
    if api_key and api_secret:
        _cached_access_token = GrowwAPI.get_access_token(api_key=api_key, secret=api_secret)
        return _cached_access_token

    # Flow 2: TOTP
    totp_token = os.getenv("GROWW_TOTP_TOKEN", "")
    totp_secret = os.getenv("GROWW_TOTP_SECRET", "")
    if totp_token and totp_secret:
        import pyotp
        totp = pyotp.TOTP(totp_secret).now()
        _cached_access_token = GrowwAPI.get_access_token(api_key=totp_token, totp=totp)
        return _cached_access_token

    # Flow 3: Legacy — raw token passed directly
    raw_token = os.getenv("GROWW_API_TOKEN", "")
    if raw_token:
        _cached_access_token = raw_token
        return _cached_access_token

    raise HTTPException(
        status_code=500,
        detail="No Groww API credentials configured. "
               "Set GROWW_API_KEY + GROWW_API_SECRET, or "
               "GROWW_TOTP_TOKEN + GROWW_TOTP_SECRET, or "
               "GROWW_API_TOKEN in .env"
    )

def get_groww_client():
    """Lazy initialization — only creates client when an API call is made."""
    from growwapi import GrowwAPI
    token = _get_access_token()
    return GrowwAPI(token)

# ── FastAPI App ──
app = FastAPI(
    title="OptiX API",
    description="Options Analytics Platform API — Proxy for Groww Trade API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──
class IndexPrice(BaseModel):
    symbol: str
    ltp: float
    change: Optional[float] = None
    change_perc: Optional[float] = None

class OptionLeg(BaseModel):
    trading_symbol: str
    ltp: float
    open_interest: int
    volume: int
    greeks: dict

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


# ── Helper Functions ──

def calculate_pcr(strikes_data: Dict[str, Any]) -> float:
    """Calculate Put-Call Ratio from OI data."""
    total_put_oi: int = 0
    total_call_oi: int = 0
    for strike, data in strikes_data.items():
        if "CE" in data and "open_interest" in data["CE"]:
            total_call_oi += data["CE"]["open_interest"]
        if "PE" in data and "open_interest" in data["PE"]:
            total_put_oi += data["PE"]["open_interest"]
    return round(total_put_oi / total_call_oi, 4) if total_call_oi > 0 else 0


def calculate_max_pain(strikes_data: Dict[str, Any]) -> float:
    """
    Calculate Max Pain — the strike price where option writers (sellers)
    would have the least financial loss.
    """
    strike_prices = sorted([float(s) for s in strikes_data.keys()])
    min_pain: float = float("inf")
    max_pain_strike: float = strike_prices[0] if strike_prices else 0.0

    for test_strike in strike_prices:
        total_pain: float = 0.0
        for strike_str, data in strikes_data.items():
            strike = float(strike_str)
            # Call writers pain: if test_strike > strike, calls are ITM
            if "CE" in data:
                ce_oi = data["CE"].get("open_interest", 0)
                if test_strike > strike:
                    total_pain += (test_strike - strike) * ce_oi
            # Put writers pain: if test_strike < strike, puts are ITM
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


# ── Endpoints ──

@app.get("/")
async def root():
    return {"status": "ok", "service": "OptiX API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/index-prices")
async def get_index_prices():
    """
    Fetch LTP for major indices.
    LAZY — only called when the user is on a page that needs this data.
    """
    try:
        groww = get_groww_client()
        
        # Fetch LTPs for major indices
        ltp_response = groww.get_ltp(
            segment=groww.SEGMENT_CASH,
            exchange_trading_symbols=("NSE_NIFTY", "NSE_NIFTY BANK", "NSE_NIFTY FIN SERVICE", "BSE_SENSEX")
        )
        
        # Also get quote data for change percentages
        indices = []
        symbol_map = {
            "NSE_NIFTY": {"name": "NIFTY 50", "exchange": groww.EXCHANGE_NSE, "symbol": "NIFTY"},
            "NSE_NIFTY BANK": {"name": "BANK NIFTY", "exchange": groww.EXCHANGE_NSE, "symbol": "NIFTY BANK"},
            "NSE_NIFTY FIN SERVICE": {"name": "FIN NIFTY", "exchange": groww.EXCHANGE_NSE, "symbol": "NIFTY FIN SERVICE"},
            "BSE_SENSEX": {"name": "SENSEX", "exchange": groww.EXCHANGE_BSE, "symbol": "SENSEX"},
        }
        
        for key, info in symbol_map.items():
            ltp = ltp_response.get(key, 0)
            # Try to get quote for change data
            try:
                quote = groww.get_quote(
                    exchange=info["exchange"],
                    segment=groww.SEGMENT_CASH,
                    trading_symbol=info["symbol"]
                )
                indices.append(IndexPrice(
                    symbol=info["name"],
                    ltp=ltp if ltp else quote.get("last_price", 0),
                    change=quote.get("day_change", 0),
                    change_perc=quote.get("day_change_perc", 0),
                ))
            except Exception:
                indices.append(IndexPrice(
                    symbol=info["name"],
                    ltp=ltp,
                ))
        
        return {"indices": [idx.model_dump() for idx in indices]}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/option-chain")
async def get_option_chain(
    underlying: str = Query(..., description="Underlying symbol, e.g. NIFTY, BANKNIFTY"),
    expiry_date: str = Query(..., description="Expiry date in YYYY-MM-DD format"),
    exchange: str = Query("NSE", description="Exchange: NSE or BSE"),
):
    """
    Fetch complete option chain for an underlying + expiry.
    LAZY — only called when user navigates to the Option Chain page.
    """
    try:
        groww = get_groww_client()
        
        exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE
        
        # Get option chain data
        oc_response = groww.get_option_chain(
            exchange=exchange_const,
            underlying=underlying,
            expiry_date=expiry_date,
        )
        
        underlying_ltp = oc_response.get("underlying_ltp", 0)
        raw_strikes = oc_response.get("strikes", {})
        
        # Calculate analytics
        pcr = calculate_pcr(raw_strikes)
        max_pain = calculate_max_pain(raw_strikes)
        strike_prices = sorted([float(s) for s in raw_strikes.keys()])
        atm_strike = find_atm_strike(underlying_ltp, strike_prices)
        
        # Build structured response
        strikes_list = []
        for strike_str in sorted(raw_strikes.keys(), key=lambda x: float(x)):
            data = raw_strikes[strike_str]
            strike_item: Dict[str, Any] = {"strike_price": float(strike_str), "CE": None, "PE": None}
            
            if "CE" in data:
                ce = data["CE"]
                strike_item["CE"] = {
                    "trading_symbol": ce.get("trading_symbol", ""),
                    "ltp": ce.get("ltp", 0),
                    "open_interest": ce.get("open_interest", 0),
                    "volume": ce.get("volume", 0),
                    "greeks": ce.get("greeks", {}),
                }
            
            if "PE" in data:
                pe = data["PE"]
                strike_item["PE"] = {
                    "trading_symbol": pe.get("trading_symbol", ""),
                    "ltp": pe.get("ltp", 0),
                    "open_interest": pe.get("open_interest", 0),
                    "volume": pe.get("volume", 0),
                    "greeks": pe.get("greeks", {}),
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
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quote")
async def get_quote(
    symbol: str = Query(..., description="Trading symbol"),
    exchange: str = Query("NSE", description="Exchange: NSE or BSE"),
    segment: str = Query("CASH", description="Segment: CASH or FNO"),
):
    """Fetch real-time quote for an instrument. LAZY."""
    try:
        groww = get_groww_client()
        exchange_const = groww.EXCHANGE_NSE if exchange.upper() == "NSE" else groww.EXCHANGE_BSE
        segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO
        
        quote = groww.get_quote(
            exchange=exchange_const,
            segment=segment_const,
            trading_symbol=symbol,
        )
        return quote
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ltp")
async def get_ltp(
    symbols: str = Query(..., description="Comma-separated exchange_trading_symbols, e.g. NSE_NIFTY,NSE_RELIANCE"),
    segment: str = Query("CASH", description="Segment: CASH or FNO"),
):
    """Fetch LTP for multiple instruments. LAZY."""
    try:
        groww = get_groww_client()
        segment_const = groww.SEGMENT_CASH if segment.upper() == "CASH" else groww.SEGMENT_FNO
        symbol_list = tuple(s.strip() for s in symbols.split(",") if s.strip())
        
        ltp_response = groww.get_ltp(
            segment=segment_const,
            exchange_trading_symbols=symbol_list if len(symbol_list) > 1 else symbol_list[0],
        )
        return ltp_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/instruments/search")
async def search_instruments(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """
    Search for instruments. Returns a list of matching symbols.
    This is a static list of popular F&O instruments for now.
    """
    # Popular F&O instruments in Indian market
    instruments = [
        {"symbol": "NIFTY", "name": "Nifty 50", "exchange": "NSE", "type": "INDEX"},
        {"symbol": "BANKNIFTY", "name": "Bank Nifty", "exchange": "NSE", "type": "INDEX"},
        {"symbol": "NIFTY BANK", "name": "Bank Nifty", "exchange": "NSE", "type": "INDEX"},
        {"symbol": "NIFTY FIN SERVICE", "name": "Fin Nifty", "exchange": "NSE", "type": "INDEX"},
        {"symbol": "FINNIFTY", "name": "Fin Nifty", "exchange": "NSE", "type": "INDEX"},
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
        {"symbol": "ADANIENT", "name": "Adani Enterprises", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "HCLTECH", "name": "HCL Technologies", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "POWERGRID", "name": "Power Grid Corporation", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "NTPC", "name": "NTPC Limited", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "ONGC", "name": "Oil & Natural Gas Corp", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "COALINDIA", "name": "Coal India", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "JSWSTEEL", "name": "JSW Steel", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "M&M", "name": "Mahindra & Mahindra", "exchange": "NSE", "type": "STOCK"},
        {"symbol": "TECHM", "name": "Tech Mahindra", "exchange": "NSE", "type": "STOCK"},
    ]
    
    query = q.upper()
    results = [
        inst for inst in instruments
        if query in inst["symbol"].upper() or query in inst["name"].upper()
    ]
    return {"results": results[:15]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
