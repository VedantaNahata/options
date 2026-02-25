"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/option-chain/TopBar";
import { AnalyticsBar } from "@/components/option-chain/AnalyticsBar";
import { OptionChainTable } from "@/components/option-chain/OptionChainTable";
import { StrategyBuilder } from "@/components/option-chain/StrategyBuilder";
import { getIndexPrices, getOptionChain } from "@/lib/api";
import type {
    IndexPrice,
    Instrument,
    StrikeData,
    StrategyLeg,
    OptionType,
    TransactionType,
} from "@/lib/types";

// ─── Default Expiry Dates (next few Thursdays from today) ───
function getUpcomingExpiries(): string[] {
    const expiries: string[] = [];
    const today = new Date();
    let d = new Date(today);

    // Find next Thursday
    while (d.getDay() !== 4) {
        d.setDate(d.getDate() + 1);
    }

    for (let i = 0; i < 6; i++) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        expiries.push(`${yyyy}-${mm}-${dd}`);
        d.setDate(d.getDate() + 7);
    }

    return expiries;
}

export default function OptionChainPage() {
    // ─── State ───
    const [indices, setIndices] = useState<IndexPrice[]>([]);
    const [indicesLoading, setIndicesLoading] = useState(true);
    const [currentInstrument, setCurrentInstrument] = useState("NIFTY");
    const [currentExchange, setCurrentExchange] = useState("NSE");
    const [expiryDates, setExpiryDates] = useState<string[]>(getUpcomingExpiries());
    const [selectedExpiry, setSelectedExpiry] = useState(expiryDates[0] || "");
    const [strikes, setStrikes] = useState<StrikeData[]>([]);
    const [underlyingLTP, setUnderlyingLTP] = useState(0);
    const [pcr, setPcr] = useState(0);
    const [maxPain, setMaxPain] = useState(0);
    const [atmStrike, setAtmStrike] = useState(0);
    const [chainLoading, setChainLoading] = useState(false);
    const [chainError, setChainError] = useState<string | null>(null);

    // Strategy Builder
    const [strategyLegs, setStrategyLegs] = useState<StrategyLeg[]>([]);
    const [isStrategyOpen, setIsStrategyOpen] = useState(false);

    // Track if route is active (for lazy loading)
    const isActiveRef = useRef(true);

    // ─── Lifecycle: Mark route as inactive on unmount ───
    useEffect(() => {
        isActiveRef.current = true;
        return () => {
            isActiveRef.current = false;
        };
    }, []);

    // ─── Fetch Index Prices (LAZY — only when this route is active) ───
    useEffect(() => {
        if (!isActiveRef.current) return;

        async function fetchIndices() {
            setIndicesLoading(true);
            try {
                const data = await getIndexPrices();
                if (isActiveRef.current) {
                    setIndices(data.indices);
                }
            } catch (err) {
                console.error("Failed to fetch indices:", err);
                // Set mock data as fallback for demo
                if (isActiveRef.current) {
                    setIndices([
                        { symbol: "NIFTY 50", ltp: 22547.55, change: 94.3, change_perc: 0.42 },
                        { symbol: "BANK NIFTY", ltp: 48632.10, change: -124.5, change_perc: -0.26 },
                        { symbol: "FIN NIFTY", ltp: 21845.90, change: 67.2, change_perc: 0.31 },
                        { symbol: "SENSEX", ltp: 74339.44, change: 312.8, change_perc: 0.42 },
                    ]);
                }
            } finally {
                if (isActiveRef.current) {
                    setIndicesLoading(false);
                }
            }
        }

        fetchIndices();
    }, []);

    // ─── Fetch Option Chain (LAZY — only when instrument or expiry changes) ───
    const fetchOptionChain = useCallback(
        async (symbol: string, expiry: string, exchange: string) => {
            if (!isActiveRef.current) return;

            setChainLoading(true);
            setChainError(null);

            try {
                const data = await getOptionChain(symbol, expiry, exchange);
                if (isActiveRef.current) {
                    setStrikes(data.strikes);
                    setUnderlyingLTP(data.underlying_ltp);
                    setPcr(data.pcr);
                    setMaxPain(data.max_pain);
                    setAtmStrike(data.atm_strike);
                }
            } catch (err: any) {
                console.error("Failed to fetch option chain:", err);
                if (isActiveRef.current) {
                    setChainError(err.message || "Failed to load option chain");
                    // Generate mock data for demo
                    generateMockData(symbol);
                }
            } finally {
                if (isActiveRef.current) {
                    setChainLoading(false);
                }
            }
        },
        []
    );

    // Generate mock data for demo/offline mode
    function generateMockData(symbol: string) {
        const basePrice = symbol === "NIFTY" ? 22550 :
            symbol === "BANKNIFTY" || symbol === "NIFTY BANK" ? 48650 :
                symbol === "SENSEX" ? 74340 :
                    symbol === "FINNIFTY" || symbol === "NIFTY FIN SERVICE" ? 21850 :
                        2500; // stock default

        const step = symbol === "NIFTY" || symbol === "FINNIFTY" || symbol === "NIFTY FIN SERVICE" ? 50 :
            symbol === "BANKNIFTY" || symbol === "NIFTY BANK" ? 100 :
                symbol === "SENSEX" ? 100 : 50;

        const numStrikes = 40;
        const halfStrikes = numStrikes / 2;
        const mockStrikes: StrikeData[] = [];
        let totalCallOI = 0;
        let totalPutOI = 0;

        for (let i = -halfStrikes; i <= halfStrikes; i++) {
            const strikePrice = Math.round((basePrice + i * step) / step) * step;
            const distance = Math.abs(strikePrice - basePrice);
            const distanceFactor = Math.max(0, 1 - distance / (halfStrikes * step));

            const callOI = Math.floor(Math.random() * 50000 * distanceFactor + 100);
            const putOI = Math.floor(Math.random() * 50000 * distanceFactor + 100);
            totalCallOI += callOI;
            totalPutOI += putOI;

            const callIV = 10 + Math.random() * 20 + distance / 200;
            const putIV = 10 + Math.random() * 20 + distance / 200;

            const callDelta = Math.max(0, Math.min(1, 0.5 + (basePrice - strikePrice) / (basePrice * 0.05)));
            const putDelta = callDelta - 1;

            const callLTP = Math.max(0.05, (basePrice - strikePrice) + distanceFactor * 200 * Math.random());
            const putLTP = Math.max(0.05, (strikePrice - basePrice) + distanceFactor * 200 * Math.random());

            mockStrikes.push({
                strike_price: strikePrice,
                CE: {
                    trading_symbol: `${symbol}CE${strikePrice}`,
                    ltp: Math.round(callLTP * 100) / 100,
                    open_interest: callOI,
                    volume: Math.floor(Math.random() * 20000),
                    greeks: {
                        delta: Math.round(callDelta * 10000) / 10000,
                        gamma: Math.round(Math.random() * 0.005 * 10000) / 10000,
                        theta: -Math.round(Math.random() * 15 * 10000) / 10000,
                        vega: Math.round(Math.random() * 20 * 10000) / 10000,
                        rho: Math.round(Math.random() * 5 * 10000) / 10000,
                        iv: Math.round(callIV * 100) / 100,
                    },
                },
                PE: {
                    trading_symbol: `${symbol}PE${strikePrice}`,
                    ltp: Math.round(putLTP * 100) / 100,
                    open_interest: putOI,
                    volume: Math.floor(Math.random() * 20000),
                    greeks: {
                        delta: Math.round(putDelta * 10000) / 10000,
                        gamma: Math.round(Math.random() * 0.005 * 10000) / 10000,
                        theta: -Math.round(Math.random() * 15 * 10000) / 10000,
                        vega: Math.round(Math.random() * 20 * 10000) / 10000,
                        rho: -Math.round(Math.random() * 5 * 10000) / 10000,
                        iv: Math.round(putIV * 100) / 100,
                    },
                },
            });
        }

        // Sort by strike
        mockStrikes.sort((a, b) => a.strike_price - b.strike_price);

        // Find ATM
        const atm = mockStrikes.reduce((prev, curr) =>
            Math.abs(curr.strike_price - basePrice) < Math.abs(prev.strike_price - basePrice) ? curr : prev
        ).strike_price;

        // Simple max pain
        const maxPainStrike = mockStrikes[Math.floor(mockStrikes.length / 2)].strike_price;

        setStrikes(mockStrikes);
        setUnderlyingLTP(basePrice);
        setPcr(totalCallOI > 0 ? totalPutOI / totalCallOI : 0);
        setMaxPain(maxPainStrike);
        setAtmStrike(atm);
    }

    // ─── Load chain when instrument or expiry changes ───
    useEffect(() => {
        if (currentInstrument && selectedExpiry) {
            fetchOptionChain(currentInstrument, selectedExpiry, currentExchange);
        }
    }, [currentInstrument, selectedExpiry, currentExchange, fetchOptionChain]);

    // ─── Instrument Selection ───
    const handleSelectInstrument = (inst: Instrument) => {
        setCurrentInstrument(inst.symbol);
        setCurrentExchange(inst.exchange);
        setStrikes([]);
        setStrategyLegs([]);
    };

    // ─── Expiry Change ───
    const handleExpiryChange = (expiry: string) => {
        setSelectedExpiry(expiry);
    };

    // ─── Strategy Builder ───
    const handleStrikeSelect = (
        strikePrice: number,
        optionType: OptionType,
        transactionType: TransactionType
    ) => {
        const strikeData = strikes.find((s) => s.strike_price === strikePrice);
        if (!strikeData) return;

        const optData = optionType === "CE" ? strikeData.CE : strikeData.PE;
        if (!optData) return;

        const newLeg: StrategyLeg = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            strike_price: strikePrice,
            option_type: optionType,
            transaction_type: transactionType,
            lots: 1,
            trading_symbol: optData.trading_symbol,
            ltp: optData.ltp,
            greeks: optData.greeks,
        };

        setStrategyLegs((prev) => [...prev, newLeg]);
        setIsStrategyOpen(true);
    };

    const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
        setStrategyLegs((prev) =>
            prev.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
        );
    };

    const handleRemoveLeg = (id: string) => {
        setStrategyLegs((prev) => {
            const updated = prev.filter((leg) => leg.id !== id);
            if (updated.length === 0) setIsStrategyOpen(false);
            return updated;
        });
    };

    const handleClearAll = () => {
        setStrategyLegs([]);
        setIsStrategyOpen(false);
    };

    return (
        <div
            className="h-screen flex flex-col overflow-hidden"
            style={{ background: "#0A0B0F" }}
        >
            {/* Top Bar with index prices and search */}
            <TopBar
                indices={indices}
                indicesLoading={indicesLoading}
                onSelectInstrument={handleSelectInstrument}
                currentInstrument={currentInstrument}
            />

            {/* Analytics Bar with PCR, Max Pain, expiry tabs */}
            <AnalyticsBar
                underlyingLTP={underlyingLTP}
                pcr={pcr}
                maxPain={maxPain}
                atmStrike={atmStrike}
                expiryDates={expiryDates}
                selectedExpiry={selectedExpiry}
                onExpiryChange={handleExpiryChange}
                totalStrikes={strikes.length}
                loading={chainLoading}
            />

            {/* Main content: Option Chain Table + Strategy Builder */}
            <div className="flex-1 flex overflow-hidden">
                {/* Error banner */}
                {chainError && !chainLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-0 left-0 right-0 z-30 px-6 py-2 text-center text-[10px] font-medium"
                        style={{
                            background: "rgba(255, 179, 0, 0.1)",
                            color: "#FFB300",
                            borderBottom: "1px solid rgba(255, 179, 0, 0.2)",
                        }}
                    >
                        ⚠ Using demo data — {chainError}. Configure your API token in backend/.env
                    </motion.div>
                )}

                {/* Option Chain Table */}
                <OptionChainTable
                    strikes={strikes}
                    atmStrike={atmStrike}
                    underlyingLTP={underlyingLTP}
                    maxPain={maxPain}
                    pcr={pcr}
                    loading={chainLoading}
                    onStrikeSelect={handleStrikeSelect}
                />

                {/* Strategy Builder Side Panel */}
                <StrategyBuilder
                    isOpen={isStrategyOpen}
                    onClose={() => setIsStrategyOpen(false)}
                    legs={strategyLegs}
                    onUpdateLeg={handleUpdateLeg}
                    onRemoveLeg={handleRemoveLeg}
                    onClearAll={handleClearAll}
                    underlyingLTP={underlyingLTP}
                />
            </div>
        </div>
    );
}
