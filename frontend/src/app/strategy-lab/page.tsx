"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    ArrowLeft,
    FlaskConical,
    Settings2,
    BarChart3,
} from "lucide-react";
import { StrategyTemplates } from "@/components/strategy-lab/StrategyTemplates";
import { LegEditor } from "@/components/strategy-lab/LegEditor";
import { PayoffChart } from "@/components/strategy-lab/PayoffChart";
import { StrategyMetrics } from "@/components/strategy-lab/StrategyMetrics";
import { PortfolioGreeks } from "@/components/strategy-lab/PortfolioGreeks";
import { WhatIfSliders } from "@/components/strategy-lab/WhatIfSliders";
import { MarginEstimator } from "@/components/strategy-lab/MarginEstimator";
import { SavedStrategies } from "@/components/strategy-lab/SavedStrategies";
import { analyzeStrategy, calculatePortfolioGreeks, estimateMargin, STRATEGY_TEMPLATES } from "@/lib/payoff";
import { getExpiryDates, getOptionChain, getLotSize } from "@/lib/api";
import type { StrategyLeg, OptionType, TransactionType, StrikeData } from "@/lib/types";
import type { SavedStrategy } from "@/lib/strategies";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const INSTRUMENTS = [
    { symbol: "NIFTY", name: "NIFTY 50", exchange: "NSE" },
    { symbol: "BANKNIFTY", name: "BANK NIFTY", exchange: "NSE" },
    { symbol: "FINNIFTY", name: "FIN NIFTY", exchange: "NSE" },
    { symbol: "MIDCPNIFTY", name: "MIDCAP SELECT", exchange: "NSE" },
    { symbol: "SENSEX", name: "SENSEX", exchange: "BSE" },
];

function calculateDTE(expiryDate: string): number {
    if (!expiryDate) return 7;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function StrategyLabPage() {
    // Instrument & expiry state
    const [instrument, setInstrument] = useState("NIFTY");
    const [exchange, setExchange] = useState("NSE");
    const [expiryDates, setExpiryDates] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState("");
    const [expiryLoading, setExpiryLoading] = useState(true);
    const [lotSize, setLotSize] = useState(25);
    const [underlyingLTP, setUnderlyingLTP] = useState(0);
    const [strikes, setStrikes] = useState<StrikeData[]>([]);
    const [atmStrike, setAtmStrike] = useState(0);
    const [chainLoading, setChainLoading] = useState(false);

    // Strategy state
    const [legs, setLegs] = useState<StrategyLeg[]>([]);

    // What-if state
    const [spotOverride, setSpotOverride] = useState<number>(0);
    const [ivShift, setIVShift] = useState(0);
    const [dteOverride, setDTEOverride] = useState<number>(7);

    // Active tab for mobile
    const [activeTab, setActiveTab] = useState<"build" | "analyze">("build");

    // ─── Load expiry dates ───
    useEffect(() => {
        async function load() {
            setExpiryLoading(true);
            try {
                const data = await getExpiryDates(instrument, exchange);
                if (data.expiry_dates.length > 0) {
                    setExpiryDates(data.expiry_dates);
                    setSelectedExpiry(data.expiry_dates[0]);
                }
            } catch (err) {
                console.error("Failed to load expiries:", err);
            } finally {
                setExpiryLoading(false);
            }
        }
        load();
    }, [instrument, exchange]);

    // ─── Load lot size ───
    useEffect(() => {
        async function load() {
            try {
                const data = await getLotSize(instrument);
                if (data.lot_size) setLotSize(data.lot_size);
            } catch (err) {
                console.error("Failed to load lot size:", err);
            }
        }
        load();
    }, [instrument]);

    // ─── Load option chain ───
    useEffect(() => {
        if (!selectedExpiry) return;
        async function load() {
            setChainLoading(true);
            try {
                const data = await getOptionChain(instrument, selectedExpiry, exchange);
                if (data.strikes?.length > 0) {
                    setStrikes(data.strikes);
                    setUnderlyingLTP(data.underlying_ltp);
                    setAtmStrike(data.atm_strike);
                    setSpotOverride(data.underlying_ltp);
                    if (data.lot_size) setLotSize(data.lot_size);
                    const dte = calculateDTE(selectedExpiry);
                    setDTEOverride(dte);
                }
            } catch (err) {
                console.error("Failed to load chain:", err);
            } finally {
                setChainLoading(false);
            }
        }
        load();
    }, [instrument, selectedExpiry, exchange]);

    // ─── DTE from expiry ───
    const maxDTE = useMemo(() => calculateDTE(selectedExpiry), [selectedExpiry]);

    // ─── Template selection ───
    const handleTemplateSelect = useCallback((templateId: string) => {
        const template = STRATEGY_TEMPLATES.find((t) => t.id === templateId);
        if (!template || strikes.length === 0) return;

        const atmIdx = strikes.findIndex((s) => s.strike_price === atmStrike);
        if (atmIdx < 0) return;

        const strikePrices = strikes.map((s) => s.strike_price);
        const strikeStep = strikePrices.length > 1 ? strikePrices[1] - strikePrices[0] : 50;

        const newLegs: StrategyLeg[] = template.legs.map((tl) => {
            const targetStrike = atmStrike + tl.strikeOffset * strikeStep;
            const closest = strikes.reduce((prev, curr) =>
                Math.abs(curr.strike_price - targetStrike) < Math.abs(prev.strike_price - targetStrike) ? curr : prev
            );

            const optData = tl.option_type === "CE" ? closest.CE : closest.PE;

            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                strike_price: closest.strike_price,
                option_type: tl.option_type,
                transaction_type: tl.transaction_type,
                lots: tl.lots,
                trading_symbol: optData?.trading_symbol || "",
                ltp: optData?.ltp || 0,
                greeks: optData?.greeks || { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, iv: 20 },
            };
        });

        setLegs(newLegs);
    }, [strikes, atmStrike]);

    // ─── Leg management ───
    const handleUpdateLeg = useCallback((id: string, updates: Partial<StrategyLeg>) => {
        setLegs((prev) => prev.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)));
    }, []);

    const handleRemoveLeg = useCallback((id: string) => {
        setLegs((prev) => prev.filter((leg) => leg.id !== id));
    }, []);

    const handleAddCustomLeg = useCallback(() => {
        if (strikes.length === 0) return;
        const atmData = strikes.find((s) => s.strike_price === atmStrike) || strikes[Math.floor(strikes.length / 2)];
        const optData = atmData.CE;

        const newLeg: StrategyLeg = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            strike_price: atmData.strike_price,
            option_type: "CE",
            transaction_type: "BUY",
            lots: 1,
            trading_symbol: optData?.trading_symbol || "",
            ltp: optData?.ltp || 0,
            greeks: optData?.greeks || { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, iv: 20 },
        };

        setLegs((prev) => [...prev, newLeg]);
    }, [strikes, atmStrike]);

    const handleClearAll = useCallback(() => setLegs([]), []);

    // ─── Load saved strategy ───
    const handleLoadStrategy = useCallback((strategy: SavedStrategy) => {
        const sLegs = strategy.legs as StrategyLeg[];
        setLegs(sLegs);
        setUnderlyingLTP(strategy.underlying_ltp);
        setSpotOverride(strategy.underlying_ltp);
        // Try to set instrument/expiry to match
        const inst = INSTRUMENTS.find((i) => i.symbol === strategy.instrument);
        if (inst) {
            setInstrument(inst.symbol);
            setExchange(inst.exchange);
        }
        if (strategy.expiry_date) {
            setSelectedExpiry(strategy.expiry_date);
        }
        if (strategy.lot_size) {
            setLotSize(strategy.lot_size);
        }
    }, []);

    // ─── What-if reset ───
    const handleWhatIfReset = useCallback(() => {
        setSpotOverride(underlyingLTP);
        setIVShift(0);
        setDTEOverride(maxDTE);
    }, [underlyingLTP, maxDTE]);

    // ─── Instrument change ───
    const handleInstrumentChange = useCallback((sym: string) => {
        const inst = INSTRUMENTS.find((i) => i.symbol === sym);
        if (!inst) return;
        setInstrument(inst.symbol);
        setExchange(inst.exchange);
        setLegs([]);
        setStrikes([]);
        setSelectedExpiry("");
        setExpiryDates([]);
    }, []);

    // ─── Analysis (reactive) ───
    const analysis = useMemo(() => {
        return analyzeStrategy(legs, underlyingLTP, lotSize, maxDTE, spotOverride, ivShift, dteOverride);
    }, [legs, underlyingLTP, lotSize, maxDTE, spotOverride, ivShift, dteOverride]);

    const greeks = useMemo(() => {
        return calculatePortfolioGreeks(legs, lotSize);
    }, [legs, lotSize]);

    const margin = useMemo(() => {
        return estimateMargin(legs, underlyingLTP, lotSize);
    }, [legs, underlyingLTP, lotSize]);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#07080C" }}>
            {/* ── Top Navigation Bar ── */}
            <header
                className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
                style={{
                    borderColor: "rgba(255,255,255,0.04)",
                    background: "rgba(7,8,12,0.85)",
                    backdropFilter: "blur(24px) saturate(1.5)",
                }}
            >
                <div className="flex items-center gap-4">
                    <Link
                        href="/option-chain"
                        className="flex items-center gap-1.5 text-[10px] font-medium text-white/40 hover:text-white/70 transition-colors"
                    >
                        <ArrowLeft size={12} />
                        Option Chain
                    </Link>
                    <div className="h-4 w-px bg-white/[0.06]" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))" }}>
                            <FlaskConical size={13} className="text-[#A78BFA]" />
                        </div>
                        <h1 className="text-sm font-bold text-white">Strategy Lab</h1>
                    </div>
                </div>

                {/* Instrument + Expiry selectors */}
                <div className="flex items-center gap-3">
                    <Select value={instrument} onValueChange={handleInstrumentChange}>
                        <SelectTrigger className="h-8 text-[11px] w-[140px] bg-white/[0.04] border-white/[0.08]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {INSTRUMENTS.map((inst) => (
                                <SelectItem key={inst.symbol} value={inst.symbol} className="text-[11px]">
                                    {inst.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={expiryLoading}>
                        <SelectTrigger className="h-8 text-[11px] w-[130px] bg-white/[0.04] border-white/[0.08]">
                            <SelectValue placeholder={expiryLoading ? "Loading..." : "Select expiry"} />
                        </SelectTrigger>
                        <SelectContent className="glass max-h-[200px]">
                            {expiryDates.map((exp) => (
                                <SelectItem key={exp} value={exp} className="text-[11px]">
                                    {exp}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Spot + Lot info */}
                    {underlyingLTP > 0 && (
                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/30">Spot</span>
                                <span className="text-[11px] font-bold text-[#F59E0B]">
                                    ₹{underlyingLTP.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.06]" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/30">Lot</span>
                                <span className="text-[11px] font-bold text-[#A78BFA]">{lotSize}</span>
                            </div>
                            <div className="h-3 w-px bg-white/[0.06]" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/30">DTE</span>
                                <span className="text-[11px] font-bold text-[#06B6D4]">{maxDTE}d</span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Mobile Tab Switcher ── */}
            <div className="lg:hidden flex border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <button
                    onClick={() => setActiveTab("build")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors"
                    style={{
                        color: activeTab === "build" ? "#A78BFA" : "rgba(255,255,255,0.35)",
                        borderBottom: activeTab === "build" ? "2px solid #8B5CF6" : "2px solid transparent",
                    }}
                >
                    <Settings2 size={12} /> Build
                </button>
                <button
                    onClick={() => setActiveTab("analyze")}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors"
                    style={{
                        color: activeTab === "analyze" ? "#A78BFA" : "rgba(255,255,255,0.35)",
                        borderBottom: activeTab === "analyze" ? "2px solid #8B5CF6" : "2px solid transparent",
                    }}
                >
                    <BarChart3 size={12} /> Analyze
                </button>
            </div>

            {/* ── Loading overlay ── */}
            {chainLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-40 flex items-center justify-center"
                    style={{ background: "rgba(7,8,12,0.7)", backdropFilter: "blur(8px)" }}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] animate-spin" />
                        <span className="text-[11px] text-white/50">Loading option chain...</span>
                    </div>
                </motion.div>
            )}

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* ── Left Column: Build ── */}
                        <div className={`lg:col-span-5 space-y-5 ${activeTab !== "build" ? "hidden lg:block" : ""}`}>
                            <StrategyTemplates onSelect={handleTemplateSelect} />

                            <LegEditor
                                legs={legs}
                                onUpdateLeg={handleUpdateLeg}
                                onRemoveLeg={handleRemoveLeg}
                                onAddCustomLeg={handleAddCustomLeg}
                                onClearAll={handleClearAll}
                                lotSize={lotSize}
                                instrumentName={instrument}
                                underlyingLTP={underlyingLTP}
                            />

                            <SavedStrategies
                                onLoadStrategy={handleLoadStrategy}
                                currentLegs={legs}
                                instrumentName={instrument}
                                exchange={exchange}
                                expiryDate={selectedExpiry}
                                underlyingLTP={underlyingLTP}
                                lotSize={lotSize}
                            />
                        </div>

                        {/* ── Right Column: Analyze ── */}
                        <div className={`lg:col-span-7 space-y-5 ${activeTab !== "analyze" ? "hidden lg:block" : ""}`}>
                            {/* Metrics strip */}
                            <StrategyMetrics analysis={analysis} />

                            {/* Payoff chart */}
                            <PayoffChart
                                curve={analysis.payoffCurve}
                                underlyingLTP={underlyingLTP}
                                upperBreakeven={analysis.upperBreakeven}
                                lowerBreakeven={analysis.lowerBreakeven}
                                spotOverride={spotOverride}
                            />

                            {/* What-if + Greeks row */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                <WhatIfSliders
                                    underlyingLTP={underlyingLTP}
                                    spotValue={spotOverride || underlyingLTP}
                                    onSpotChange={setSpotOverride}
                                    ivShift={ivShift}
                                    onIVShiftChange={setIVShift}
                                    daysToExpiry={dteOverride}
                                    maxDTE={maxDTE}
                                    onDTEChange={setDTEOverride}
                                    onReset={handleWhatIfReset}
                                />

                                <MarginEstimator estimate={margin} />
                            </div>

                            {/* Portfolio Greeks */}
                            <PortfolioGreeks
                                netDelta={greeks.netDelta}
                                netGamma={greeks.netGamma}
                                netTheta={greeks.netTheta}
                                netVega={greeks.netVega}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
