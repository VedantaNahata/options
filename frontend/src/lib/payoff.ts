/**
 * Payoff Calculation Engine for Strategy Lab
 * ============================================
 * Black-Scholes model for current-date P&L estimation,
 * intrinsic-value for expiry P&L, plus breakeven and margin calculations.
 */

import type { StrategyLeg, PayoffPoint, StrategyAnalysis, MarginEstimate } from "./types";

/* ─── Standard Normal Distribution ─── */
function normCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

/* ─── Black-Scholes Option Pricing ─── */
function blackScholes(
    S: number,    // spot price
    K: number,    // strike price
    T: number,    // time to expiry in years
    r: number,    // risk-free rate
    sigma: number, // implied volatility (decimal)
    type: "CE" | "PE"
): number {
    if (T <= 0 || sigma <= 0) {
        // At or past expiry, return intrinsic value
        if (type === "CE") return Math.max(0, S - K);
        return Math.max(0, K - S);
    }

    const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    if (type === "CE") {
        return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    } else {
        return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    }
}

/* ─── Calculate P&L for a single leg at a given spot price ─── */
function legPnL(
    leg: StrategyLeg,
    spot: number,
    lotSize: number,
    daysToExpiry: number,
    ivShift: number,
    riskFreeRate: number = 0.065
): { pnlExpiry: number; pnlCurrent: number } {
    const multiplier = leg.transaction_type === "BUY" ? 1 : -1;
    const qty = leg.lots * lotSize;

    // Intrinsic value at expiry
    const intrinsic = leg.option_type === "CE"
        ? Math.max(0, spot - leg.strike_price)
        : Math.max(0, leg.strike_price - spot);
    const pnlExpiry = (intrinsic - leg.ltp) * multiplier * qty;

    // Black-Scholes value at current date
    const T = Math.max(daysToExpiry / 365, 0);
    const iv = ((leg.greeks?.iv || 20) / 100) + (ivShift / 100);
    const effectiveIV = Math.max(iv, 0.01); // floor IV
    const bsPrice = blackScholes(spot, leg.strike_price, T, riskFreeRate, effectiveIV, leg.option_type);
    const pnlCurrent = (bsPrice - leg.ltp) * multiplier * qty;

    return { pnlExpiry, pnlCurrent };
}

/* ─── Generate Full Payoff Analysis ─── */
export function analyzeStrategy(
    legs: StrategyLeg[],
    underlyingLTP: number,
    lotSize: number,
    daysToExpiry: number,
    spotOverride?: number,
    ivShift: number = 0,
    dteOverride?: number,
    numPoints: number = 200
): StrategyAnalysis {
    if (legs.length === 0) {
        return {
            payoffCurve: [],
            maxProfit: 0,
            maxProfitSpot: underlyingLTP,
            maxLoss: 0,
            maxLossSpot: underlyingLTP,
            upperBreakeven: null,
            lowerBreakeven: null,
            netPremium: 0,
            riskRewardRatio: 0,
            popEstimate: 0,
        };
    }

    const effectiveDTE = dteOverride !== undefined ? dteOverride : daysToExpiry;
    const currentSpot = spotOverride !== undefined ? spotOverride : underlyingLTP;

    // Define range: ±25% of spot
    const rangePct = 0.25;
    const minSpot = Math.max(currentSpot * (1 - rangePct), 0);
    const maxSpot = currentSpot * (1 + rangePct);
    const step = (maxSpot - minSpot) / numPoints;

    const curve: PayoffPoint[] = [];
    let maxProfit = -Infinity;
    let maxProfitSpot = currentSpot;
    let maxLoss = Infinity;
    let maxLossSpot = currentSpot;

    for (let i = 0; i <= numPoints; i++) {
        const spot = minSpot + step * i;
        let totalExpiry = 0;
        let totalCurrent = 0;

        for (const leg of legs) {
            const { pnlExpiry, pnlCurrent } = legPnL(leg, spot, lotSize, effectiveDTE, ivShift);
            totalExpiry += pnlExpiry;
            totalCurrent += pnlCurrent;
        }

        curve.push({ spot, pnlAtExpiry: totalExpiry, pnlCurrent: totalCurrent });

        if (totalExpiry > maxProfit) {
            maxProfit = totalExpiry;
            maxProfitSpot = spot;
        }
        if (totalExpiry < maxLoss) {
            maxLoss = totalExpiry;
            maxLossSpot = spot;
        }
    }

    // Find breakevens (where expiry P&L crosses zero)
    let upperBreakeven: number | null = null;
    let lowerBreakeven: number | null = null;

    for (let i = 1; i < curve.length; i++) {
        const prev = curve[i - 1];
        const curr = curve[i];
        if (prev.pnlAtExpiry * curr.pnlAtExpiry < 0) {
            // Linear interpolation
            const ratio = Math.abs(prev.pnlAtExpiry) / (Math.abs(prev.pnlAtExpiry) + Math.abs(curr.pnlAtExpiry));
            const breakeven = prev.spot + ratio * (curr.spot - prev.spot);

            if (breakeven < currentSpot) {
                lowerBreakeven = breakeven;
            } else {
                if (upperBreakeven === null) upperBreakeven = breakeven;
            }
        }
    }

    // If breakeven is on one side only, adjust
    if (lowerBreakeven === null && upperBreakeven !== null && upperBreakeven < currentSpot) {
        lowerBreakeven = upperBreakeven;
        upperBreakeven = null;
    }

    // Net premium
    const netPremium = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? -1 : 1;
        return sum + leg.ltp * leg.lots * lotSize * mult;
    }, 0);

    // Risk-reward ratio
    const absMaxLoss = Math.abs(maxLoss);
    const riskRewardRatio = absMaxLoss > 0 ? maxProfit / absMaxLoss : maxProfit > 0 ? Infinity : 0;

    // Simplified Probability of Profit estimate
    // Count how many spots are profitable at expiry
    const profitablePoints = curve.filter(p => p.pnlAtExpiry > 0).length;
    const popEstimate = (profitablePoints / curve.length) * 100;

    return {
        payoffCurve: curve,
        maxProfit: maxProfit === -Infinity ? 0 : maxProfit,
        maxProfitSpot,
        maxLoss: maxLoss === Infinity ? 0 : maxLoss,
        maxLossSpot,
        upperBreakeven,
        lowerBreakeven,
        netPremium,
        riskRewardRatio: isFinite(riskRewardRatio) ? riskRewardRatio : 99.9,
        popEstimate,
    };
}

/* ─── Portfolio Greeks Calculation ─── */
export function calculatePortfolioGreeks(legs: StrategyLeg[], lotSize: number) {
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;

    for (const leg of legs) {
        const mult = leg.transaction_type === "BUY" ? 1 : -1;
        const qty = leg.lots * lotSize;
        netDelta += (leg.greeks?.delta || 0) * mult * qty;
        netGamma += (leg.greeks?.gamma || 0) * mult * qty;
        netTheta += (leg.greeks?.theta || 0) * mult * qty;
        netVega += (leg.greeks?.vega || 0) * mult * qty;
    }

    return { netDelta, netGamma, netTheta, netVega };
}

/* ─── Margin Estimator (Approximate) ─── */
export function estimateMargin(
    legs: StrategyLeg[],
    underlyingLTP: number,
    lotSize: number
): MarginEstimate {
    // Simplified SPAN margin estimation
    // Real SPAN is complex; this is an approximation
    let spanMargin = 0;
    let exposureMargin = 0;

    const sellLegs = legs.filter(l => l.transaction_type === "SELL");
    const buyLegs = legs.filter(l => l.transaction_type === "BUY");

    for (const leg of sellLegs) {
        const qty = leg.lots * lotSize;
        // Approximate: ~15% of underlying value for naked options
        const baseMargin = underlyingLTP * qty * 0.15;
        // Reduce for spreads (if matched buy leg exists)
        const matchedBuy = buyLegs.find(
            b => b.option_type === leg.option_type && b.lots >= leg.lots
        );
        if (matchedBuy) {
            // Spread margin: limited to max loss
            const maxLoss = Math.abs(leg.strike_price - matchedBuy.strike_price) * qty;
            spanMargin += Math.min(baseMargin, maxLoss);
        } else {
            spanMargin += baseMargin;
        }
        exposureMargin += underlyingLTP * qty * 0.03;
    }

    // Buy legs: premium paid is the margin
    for (const leg of buyLegs) {
        const qty = leg.lots * lotSize;
        spanMargin += leg.ltp * qty;
    }

    const totalMargin = spanMargin + exposureMargin;

    // Charges calculation (approximate Indian market rates)
    const totalTurnover = legs.reduce((sum, leg) => {
        return sum + leg.ltp * leg.lots * lotSize;
    }, 0);

    const brokerage = Math.min(legs.length * 20, 40); // Rs 20 per order, max Rs 40
    const stt = totalTurnover * 0.000625; // 0.0625% on sell side
    const transactionCharges = totalTurnover * 0.00053; // NSE charges
    const gst = (brokerage + transactionCharges) * 0.18;
    const sebiCharges = totalTurnover * 0.000001; // Rs 10 per crore
    const stampDuty = totalTurnover * 0.00003; // 0.003%

    const totalCharges = brokerage + stt + transactionCharges + gst + sebiCharges + stampDuty;

    return {
        spanMargin: Math.round(spanMargin),
        exposureMargin: Math.round(exposureMargin),
        totalMargin: Math.round(totalMargin),
        brokerage: Math.round(brokerage * 100) / 100,
        stt: Math.round(stt * 100) / 100,
        transactionCharges: Math.round(transactionCharges * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        sebiCharges: Math.round(sebiCharges * 100) / 100,
        stampDuty: Math.round(stampDuty * 100) / 100,
        totalCharges: Math.round(totalCharges * 100) / 100,
    };
}

/* ─── Strategy Templates ─── */
export const STRATEGY_TEMPLATES = [
    {
        id: "long-straddle",
        name: "Long Straddle",
        description: "Buy ATM Call + ATM Put. Profits from big moves in either direction.",
        category: "volatile" as const,
        legs: [
            { strikeOffset: 0, option_type: "CE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: 0, option_type: "PE" as const, transaction_type: "BUY" as const, lots: 1 },
        ],
    },
    {
        id: "short-straddle",
        name: "Short Straddle",
        description: "Sell ATM Call + ATM Put. Profits from range-bound movement.",
        category: "neutral" as const,
        legs: [
            { strikeOffset: 0, option_type: "CE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: 0, option_type: "PE" as const, transaction_type: "SELL" as const, lots: 1 },
        ],
    },
    {
        id: "long-strangle",
        name: "Long Strangle",
        description: "Buy OTM Call + OTM Put. Cheaper than straddle, needs bigger move.",
        category: "volatile" as const,
        legs: [
            { strikeOffset: 2, option_type: "CE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: -2, option_type: "PE" as const, transaction_type: "BUY" as const, lots: 1 },
        ],
    },
    {
        id: "short-strangle",
        name: "Short Strangle",
        description: "Sell OTM Call + OTM Put. Wider profit zone than straddle.",
        category: "neutral" as const,
        legs: [
            { strikeOffset: 2, option_type: "CE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: -2, option_type: "PE" as const, transaction_type: "SELL" as const, lots: 1 },
        ],
    },
    {
        id: "bull-call-spread",
        name: "Bull Call Spread",
        description: "Buy lower CE + Sell higher CE. Limited risk bullish bet.",
        category: "bullish" as const,
        legs: [
            { strikeOffset: 0, option_type: "CE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: 3, option_type: "CE" as const, transaction_type: "SELL" as const, lots: 1 },
        ],
    },
    {
        id: "bear-put-spread",
        name: "Bear Put Spread",
        description: "Buy higher PE + Sell lower PE. Limited risk bearish bet.",
        category: "bearish" as const,
        legs: [
            { strikeOffset: 0, option_type: "PE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: -3, option_type: "PE" as const, transaction_type: "SELL" as const, lots: 1 },
        ],
    },
    {
        id: "iron-condor",
        name: "Iron Condor",
        description: "Sell strangle + Buy wider strangle. Defined risk, range-bound.",
        category: "neutral" as const,
        legs: [
            { strikeOffset: -3, option_type: "PE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: -1, option_type: "PE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: 1, option_type: "CE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: 3, option_type: "CE" as const, transaction_type: "BUY" as const, lots: 1 },
        ],
    },
    {
        id: "iron-butterfly",
        name: "Iron Butterfly",
        description: "Sell straddle + Buy strangle. Tighter, more credit than condor.",
        category: "neutral" as const,
        legs: [
            { strikeOffset: -3, option_type: "PE" as const, transaction_type: "BUY" as const, lots: 1 },
            { strikeOffset: 0, option_type: "PE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: 0, option_type: "CE" as const, transaction_type: "SELL" as const, lots: 1 },
            { strikeOffset: 3, option_type: "CE" as const, transaction_type: "BUY" as const, lots: 1 },
        ],
    },
];
