/**
 * OptiX API Client
 * ================
 * All API calls are LAZY — they only fire when explicitly invoked.
 * No polling, no background fetches, no startup calls.
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

/* ─── Instrument Search ─── */
export async function searchInstruments(query: string) {
    const params = new URLSearchParams({ q: query });
    return fetchAPI<{ results: import("./types").Instrument[] }>(
        `/api/instruments/search?${params.toString()}`
    );
}
