"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/option-chain/TopBar";
import { AnalyticsBar } from "@/components/option-chain/AnalyticsBar";
import { OptionChainTable } from "@/components/option-chain/OptionChainTable";
import { StrategyBuilder } from "@/components/option-chain/StrategyBuilder";
import { getIndexPrices, getOptionChain, getExpiryDates, getLotSize, batchLTP, getLiveIndices } from "@/lib/api";
import { FeedConnection } from "@/lib/ws";
import type {
    IndexPrice,
    Instrument,
    StrikeData,
    StrategyLeg,
    OptionType,
    TransactionType,
} from "@/lib/types";

// ─── Market hours check (IST: 9:15 AM - 3:30 PM, Mon-Fri) ───
function isMarketOpen(): boolean {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const day = istTime.getDay();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Weekday check (Mon=1, Fri=5)
    if (day === 0 || day === 6) return false;

    // Market hours: 9:15 AM (555 min) to 3:30 PM (930 min)
    return totalMinutes >= 555 && totalMinutes <= 930;
}

// ─── Polling intervals ───
const INDEX_POLL_INTERVAL = 3000;  // 3 seconds (fallback if WebSocket fails)
const CHAIN_POLL_INTERVAL = 30000; // 30 seconds for full option chain refresh (Greeks, OI)
const LTP_POLL_INTERVAL = 2000;    // 2 seconds for fast LTP-only updates

export default function OptionChainPage() {
    // ─── State ───
    const [indices, setIndices] = useState<IndexPrice[]>([]);
    const [indicesLoading, setIndicesLoading] = useState(true);
    const [currentInstrument, setCurrentInstrument] = useState("NIFTY");
    const [currentExchange, setCurrentExchange] = useState("NSE");
    const [expiryDates, setExpiryDates] = useState<string[]>([]);
    const [expiryLoading, setExpiryLoading] = useState(true);
    const [selectedExpiry, setSelectedExpiry] = useState("");
    const [strikes, setStrikes] = useState<StrikeData[]>([]);
    const [underlyingLTP, setUnderlyingLTP] = useState(0);
    const [pcr, setPcr] = useState(0);
    const [maxPain, setMaxPain] = useState(0);
    const [atmStrike, setAtmStrike] = useState(0);
    const [chainLoading, setChainLoading] = useState(false);
    const [chainError, setChainError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(false);

    // Strategy Builder
    const [strategyLegs, setStrategyLegs] = useState<StrategyLeg[]>([]);
    const [isStrategyOpen, setIsStrategyOpen] = useState(false);
    const [lotSize, setLotSize] = useState<number>(25); // NIFTY default lot size

    // Track if route is active
    const isActiveRef = useRef(true);
    const indexPollRef = useRef<NodeJS.Timeout | null>(null);
    const chainPollRef = useRef<NodeJS.Timeout | null>(null);
    const ltpPollRef = useRef<NodeJS.Timeout | null>(null);
    const indexFetchInProgress = useRef(false);
    const chainFetchInProgress = useRef(false);
    const feedRef = useRef<FeedConnection | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    // ─── Lifecycle: Mark route as inactive on unmount ───
    useEffect(() => {
        isActiveRef.current = true;

        // ── Initialize WebSocket Feed Connection ──
        const feed = new FeedConnection({
            onIndexUpdate: (feedIndices) => {
                if (isActiveRef.current) {
                    setIndices(feedIndices);
                    setIndicesLoading(false);
                    setLastUpdated(new Date());
                    setIsLive(true);
                }
            },
            onLTPUpdate: (ltpData) => {
                if (isActiveRef.current) {
                    // Update strike LTPs from feed data
                    setStrikes((prev) => {
                        if (prev.length === 0) return prev;
                        let changed = false;
                        const updated = prev.map((strike) => {
                            const newStrike = { ...strike };
                            if (strike.CE?.trading_symbol) {
                                const key = `NSE_${strike.CE.trading_symbol}`;
                                const altKey = `BSE_${strike.CE.trading_symbol}`;
                                const newLtp = ltpData[key] ?? ltpData[altKey];
                                if (newLtp !== undefined && newLtp !== strike.CE.ltp) {
                                    newStrike.CE = { ...strike.CE, ltp: newLtp };
                                    changed = true;
                                }
                            }
                            if (strike.PE?.trading_symbol) {
                                const key = `NSE_${strike.PE.trading_symbol}`;
                                const altKey = `BSE_${strike.PE.trading_symbol}`;
                                const newLtp = ltpData[key] ?? ltpData[altKey];
                                if (newLtp !== undefined && newLtp !== strike.PE.ltp) {
                                    newStrike.PE = { ...strike.PE, ltp: newLtp };
                                    changed = true;
                                }
                            }
                            return newStrike;
                        });
                        return changed ? updated : prev;
                    });
                    setLastUpdated(new Date());
                }
            },
            onConnect: () => setWsConnected(true),
            onDisconnect: () => setWsConnected(false),
        });
        feed.connect();
        feedRef.current = feed;

        return () => {
            isActiveRef.current = false;
            if (indexPollRef.current) clearInterval(indexPollRef.current);
            if (chainPollRef.current) clearInterval(chainPollRef.current);
            if (ltpPollRef.current) clearInterval(ltpPollRef.current);
            feed.destroy();
            feedRef.current = null;
        };
    }, []);

    // ─── Fetch Index Prices (uses live/feed endpoint for speed) ───
    const fetchIndices = useCallback(async (isInitial = false) => {
        if (!isActiveRef.current) return;
        if (indexFetchInProgress.current) return;
        indexFetchInProgress.current = true;

        if (isInitial) setIndicesLoading(true);

        try {
            const data = await getLiveIndices();
            if (isActiveRef.current) {
                setIndices(data.indices);
                setLastUpdated(new Date());
            }
        } catch (err) {
            // Fallback to regular endpoint
            try {
                const data = await getIndexPrices();
                if (isActiveRef.current) {
                    setIndices(data.indices);
                    setLastUpdated(new Date());
                }
            } catch {
                console.error("Failed to fetch indices:", err);
                if (isInitial && isActiveRef.current) {
                    setIndices([
                        { symbol: "NIFTY 50", ltp: 22547.55, change: 94.3, change_perc: 0.42 },
                        { symbol: "BANK NIFTY", ltp: 48632.10, change: -124.5, change_perc: -0.26 },
                        { symbol: "FIN NIFTY", ltp: 21845.90, change: 67.2, change_perc: 0.31 },
                        { symbol: "SENSEX", ltp: 74339.44, change: 312.8, change_perc: 0.42 },
                    ]);
                }
            }
        } finally {
            indexFetchInProgress.current = false;
            if (isInitial && isActiveRef.current) {
                setIndicesLoading(false);
            }
        }
    }, []);

    // ─── Index Prices Polling ───
    useEffect(() => {
        // Fetch once immediately
        fetchIndices(true).then(() => {
            // Only start polling AFTER initial fetch completes
            if (isActiveRef.current) {
                if (indexPollRef.current) clearInterval(indexPollRef.current);
                indexPollRef.current = setInterval(() => {
                    fetchIndices(false);
                }, INDEX_POLL_INTERVAL);
                setIsLive(true);
            }
        });

        return () => {
            if (indexPollRef.current) clearInterval(indexPollRef.current);
        };
    }, [fetchIndices]);

    // ─── Fetch Expiry Dates from Backend ───
    useEffect(() => {
        async function loadExpiries() {
            setExpiryLoading(true);
            try {
                const data = await getExpiryDates(currentInstrument, currentExchange);
                if (isActiveRef.current && data.expiry_dates.length > 0) {
                    setExpiryDates(data.expiry_dates);
                    setSelectedExpiry(data.expiry_dates[0]);
                } else if (isActiveRef.current) {
                    // Fallback: generate next few weekdays as candidates
                    const fallback = generateFallbackExpiries();
                    setExpiryDates(fallback);
                    setSelectedExpiry(fallback[0] || "");
                }
            } catch (err) {
                console.error("Failed to fetch expiry dates:", err);
                if (isActiveRef.current) {
                    const fallback = generateFallbackExpiries();
                    setExpiryDates(fallback);
                    setSelectedExpiry(fallback[0] || "");
                }
            } finally {
                if (isActiveRef.current) setExpiryLoading(false);
            }
        }

        loadExpiries();
    }, [currentInstrument, currentExchange]);

    // ─── Fetch Lot Size ───
    useEffect(() => {
        async function loadLotSize() {
            try {
                const data = await getLotSize(currentInstrument);
                if (isActiveRef.current && data.lot_size) {
                    setLotSize(data.lot_size);
                }
            } catch (err) {
                console.error("Failed to fetch lot size:", err);
                // Fallback defaults
                const defaults: Record<string, number> = {
                    NIFTY: 25, BANKNIFTY: 15, "NIFTY BANK": 15,
                    FINNIFTY: 25, "NIFTY FIN SERVICE": 25,
                    SENSEX: 10, BANKEX: 15,
                };
                setLotSize(defaults[currentInstrument] || 1);
            }
        }
        loadLotSize();
    }, [currentInstrument]);

    // Fallback expiry date generator
    function generateFallbackExpiries(): string[] {
        const expiries: string[] = [];
        const today = new Date();
        let d = new Date(today);
        // Just generate next 8 weekdays as candidates
        let count = 0;
        while (count < 8) {
            d.setDate(d.getDate() + 1);
            if (d.getDay() !== 0 && d.getDay() !== 6) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                expiries.push(`${yyyy}-${mm}-${dd}`);
                count++;
            }
        }
        return expiries;
    }

    // ─── Fetch Option Chain ───
    const fetchOptionChain = useCallback(
        async (symbol: string, expiry: string, exchange: string, isInitial = false) => {
            if (!isActiveRef.current || !expiry) return;
            if (chainFetchInProgress.current && !isInitial) return; // Skip polling if fetch in progress
            chainFetchInProgress.current = true;

            if (isInitial) {
                setChainLoading(true);
                setChainError(null);
            }

            try {
                const data = await getOptionChain(symbol, expiry, exchange);
                if (isActiveRef.current) {
                    if (data.strikes && data.strikes.length > 0) {
                        setStrikes(data.strikes);
                        setUnderlyingLTP(data.underlying_ltp);
                        setPcr(data.pcr);
                        setMaxPain(data.max_pain);
                        setAtmStrike(data.atm_strike);
                        setChainError(null);
                        setLastUpdated(new Date());

                        // Update lot size from API response
                        if (data.lot_size && data.lot_size > 0) {
                            setLotSize(data.lot_size);
                        }

                        // Subscribe to LTP updates via WebSocket
                        const tradingSymbols: string[] = [];
                        data.strikes.forEach((s) => {
                            if (s.CE?.trading_symbol) tradingSymbols.push(s.CE.trading_symbol);
                            if (s.PE?.trading_symbol) tradingSymbols.push(s.PE.trading_symbol);
                        });
                        if (feedRef.current && tradingSymbols.length > 0) {
                            feedRef.current.subscribeOptions(tradingSymbols, exchange);
                        }
                    } else if (isInitial) {
                        setChainError(`No option data available for expiry ${expiry}. Try a different expiry date.`);
                        setStrikes([]);
                    }
                }
            } catch (err: any) {
                console.error("Failed to fetch option chain:", err);
                if (isInitial && isActiveRef.current) {
                    setChainError(err.message || "Failed to load option chain");
                    setStrikes([]);
                }
            } finally {
                chainFetchInProgress.current = false;
                if (isInitial && isActiveRef.current) {
                    setChainLoading(false);
                }
            }
        },
        []
    );

    // ─── Option Chain Polling ───
    useEffect(() => {
        if (currentInstrument && selectedExpiry) {
            // Initial fetch, then start polling AFTER it completes
            fetchOptionChain(currentInstrument, selectedExpiry, currentExchange, true).then(() => {
                if (isActiveRef.current && currentInstrument && selectedExpiry) {
                    if (chainPollRef.current) clearInterval(chainPollRef.current);
                    chainPollRef.current = setInterval(() => {
                        fetchOptionChain(currentInstrument, selectedExpiry, currentExchange, false);
                    }, CHAIN_POLL_INTERVAL);
                }
            });
        }

        return () => {
            if (chainPollRef.current) clearInterval(chainPollRef.current);
        };
    }, [currentInstrument, selectedExpiry, currentExchange, fetchOptionChain]);

    // ─── Instrument Selection ───
    const handleSelectInstrument = (inst: Instrument) => {
        setCurrentInstrument(inst.symbol);
        setCurrentExchange(inst.exchange);
        setStrikes([]);
        setStrategyLegs([]);
        setExpiryDates([]);
        setSelectedExpiry("");
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
                instrumentName={currentInstrument}
                lotSize={lotSize}
            />

            {/* Main content: Option Chain Table + Strategy Builder */}
            <div className="flex-1 flex overflow-hidden">
                {/* Live indicator + last updated */}
                {isLive && lastUpdated && !chainLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-0 right-4 z-30 px-3 py-1 text-[9px] font-medium flex items-center gap-1.5"
                        style={{
                            color: "rgba(0, 255, 136, 0.8)",
                        }}
                    >
                        <span
                            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ background: "#00FF88" }}
                        />
                        LIVE
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>
                            {lastUpdated.toLocaleTimeString()}
                        </span>
                    </motion.div>
                )}

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
                        ⚠ {chainError.includes("demo") ? `Using demo data — ${chainError}` : chainError}
                    </motion.div>
                )}

                {/* Expiry loading indicator */}
                {expiryLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 left-0 right-0 z-30 px-6 py-2 text-center text-[10px] font-medium"
                        style={{
                            background: "rgba(0, 200, 255, 0.05)",
                            color: "rgba(0, 200, 255, 0.6)",
                            borderBottom: "1px solid rgba(0, 200, 255, 0.1)",
                        }}
                    >
                        Discovering valid expiry dates...
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
                    lotSize={lotSize}
                    instrumentName={currentInstrument}
                />
            </div>
        </div>
    );
}
