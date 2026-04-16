/**
 * FnoPilot API Client
 * ===================
 * API calls with support for real-time polling.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(error.detail || `API Error: ${res.status}`);
    }

    return res.json();
}

/* ─── Index Prices ─── */
export async function getIndexPrices() {
    return fetchAPI<{ indices: import("./types").IndexPrice[] }>("/api/index-prices");
}

/* ─── Option Chain ─── */
export async function getOptionChain(
    underlying: string,
    expiryDate: string,
    exchange: string = "NSE"
) {
    const params = new URLSearchParams({
        underlying,
        expiry_date: expiryDate,
        exchange,
    });
    return fetchAPI<import("./types").OptionChainData>(
        `/api/option-chain?${params.toString()}`
    );
}

/* ─── Expiry Dates (fetched from backend, auto-discovered) ─── */
export async function getExpiryDates(
    underlying: string = "NIFTY",
    exchange: string = "NSE"
) {
    const params = new URLSearchParams({ underlying, exchange });
    return fetchAPI<{ expiry_dates: string[]; underlying: string }>(
        `/api/expiry-dates?${params.toString()}`
    );
}

/* ─── Quote ─── */
export async function getQuote(
    symbol: string,
    exchange: string = "NSE",
    segment: string = "CASH"
) {
    const params = new URLSearchParams({ symbol, exchange, segment });
    return fetchAPI<import("./types").QuoteData>(
        `/api/quote?${params.toString()}`
    );
}

/* ─── LTP ─── */
export async function getLTP(symbols: string[], segment: string = "CASH") {
    const params = new URLSearchParams({
        symbols: symbols.join(","),
        segment,
    });
    return fetchAPI<Record<string, number>>(`/api/ltp?${params.toString()}`);
}

/* ─── Lot Size ─── */
export async function getLotSize(underlying: string) {
    const params = new URLSearchParams({ underlying });
    return fetchAPI<{ underlying: string; lot_size: number }>(
        `/api/lot-size?${params.toString()}`
    );
}

/* ─── Instruments (full list from CSV) ─── */
export async function getInstruments() {
    return fetchAPI<{ instruments: import("./types").Instrument[]; count: number }>(
        `/api/instruments`
    );
}

/* ─── Instrument Search ─── */
export async function searchInstruments(query: string) {
    const params = new URLSearchParams({ q: query });
    return fetchAPI<{ results: import("./types").Instrument[] }>(
        `/api/instruments/search?${params.toString()}`
    );
}

/* ─── Batch LTP (fast option chain price refresh) ─── */
export async function batchLTP(
    symbols: string[],
    exchange: string = "NSE",
    segment: string = "FNO"
) {
    return fetchAPI<{ ltps: Record<string, number> }>("/api/batch-ltp", {
        method: "POST",
        body: JSON.stringify({ symbols, exchange, segment }),
    });
}

/* ─── Live Index Prices (feed-backed, near-instant) ─── */
export async function getLiveIndices() {
    return fetchAPI<{ indices: import("./types").IndexPrice[] }>("/api/live/indices");
}
