/* ─── API Types ─── */

export interface IndexPrice {
    symbol: string;
    ltp: number;
    change?: number;
    change_perc?: number;
}

export interface Greeks {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    iv: number;
}

export interface OptionLeg {
    trading_symbol: string;
    ltp: number;
    bid?: number | null;
    ask?: number | null;
    change_perc?: number | null;
    oi_change?: number | null;
    open_interest: number;
    volume: number;
    greeks: Greeks;
}

export interface StrikeData {
    strike_price: number;
    CE: OptionLeg | null;
    PE: OptionLeg | null;
}

export interface OptionChainData {
    underlying_ltp: number;
    strikes: StrikeData[];
    expiry_date: string;
    pcr: number;
    max_pain: number;
    atm_strike: number;
    total_strikes: number;
    lot_size: number;
}

export interface Instrument {
    symbol: string;
    name: string;
    exchange: string;
    type: "INDEX" | "STOCK";
}

export interface QuoteData {
    average_price: number;
    bid_quantity: number;
    bid_price: number;
    day_change: number;
    day_change_perc: number;
    upper_circuit_limit: number;
    lower_circuit_limit: number;
    ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
    };
    depth: {
        buy: { price: number; quantity: number }[];
        sell: { price: number; quantity: number }[];
    };
    implied_volatility: number;
    last_trade_quantity: number;
    last_trade_time: number;
    last_price: number;
    offer_price: number;
    offer_quantity: number;
    oi_day_change: number;
    oi_day_change_percentage: number;
    open_interest: number;
    previous_open_interest: number;
    total_buy_quantity: number;
    total_sell_quantity: number;
    volume: number;
}

/* ─── Strategy Builder Types ─── */

export type OptionType = "CE" | "PE";
export type TransactionType = "BUY" | "SELL";

export interface StrategyLeg {
    id: string;
    strike_price: number;
    option_type: OptionType;
    transaction_type: TransactionType;
    lots: number;
    trading_symbol: string;
    ltp: number;
    greeks: Greeks;
}

export interface Strategy {
    name: string;
    legs: StrategyLeg[];
    underlying_ltp: number;
}
