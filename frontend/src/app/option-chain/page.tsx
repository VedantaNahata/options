"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/option-chain/TopBar";
import { AnalyticsBar } from "@/components/option-chain/AnalyticsBar";
import { OptionChainTable } from "@/components/option-chain/OptionChainTable";
import { StrategyBuilder } from "@/components/option-chain/StrategyBuilder";
import { getIndexPrices, getOptionChain, getExpiryDates, getLotSize, getLiveIndices } from "@/lib/api";
import { FeedConnection } from "@/lib/ws";
import type {
    IndexPrice,
    Instrument,
    StrikeData,
    StrategyLeg,
    OptionType,
    TransactionType,
} from "@/lib/types";

const INDEX_POLL_INTERVAL = 3000;
const CHAIN_POLL_INTERVAL = 10000;

const INSTRUMENT_INDEX_MAP: Record<string, string> = {
    NIFTY: "NIFTY 50",
    BANKNIFTY: "BANK NIFTY",
    "NIFTY BANK": "BANK NIFTY",
    FINNIFTY: "FIN NIFTY",
    "NIFTY FIN SERVICE": "FIN NIFTY",
    SENSEX: "SENSEX",
    BANKEX: "BANKEX",
    MIDCPNIFTY: "MIDCAP SELECT",
    "NIFTY MID SELECT": "MIDCAP SELECT",
    NIFTYNXT50: "NIFTY NEXT 50",
    "NIFTY NEXT 50": "NIFTY NEXT 50",
};

export default function OptionChainPage() {
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
    const [chainLoading, setChainLoading] = useState(true);
    const [chainError, setChainError] = useState<string | null>(null);

    const [strategyLegs, setStrategyLegs] = useState<StrategyLeg[]>([]);
    const [isStrategyOpen, setIsStrategyOpen] = useState(false);
    const [lotSize, setLotSize] = useState<number>(25);

    const isActiveRef = useRef(true);
    const indexPollRef = useRef<NodeJS.Timeout | null>(null);
    const chainPollRef = useRef<NodeJS.Timeout | null>(null);
    const indexFetchInProgress = useRef(false);
    const chainFetchInProgress = useRef(false);
    const feedRef = useRef<FeedConnection | null>(null);

    const currentInstrumentRef = useRef(currentInstrument);
    const currentExchangeRef = useRef(currentExchange);

    useEffect(() => {
        currentInstrumentRef.current = currentInstrument;
        currentExchangeRef.current = currentExchange;
    }, [currentInstrument, currentExchange]);

    useEffect(() => {
        isActiveRef.current = true;

        const feed = new FeedConnection({
            onIndexUpdate: (feedIndices) => {
                if (isActiveRef.current) {
                    setIndices(feedIndices);
                    setIndicesLoading(false);
                }
            },
            onLTPUpdate: (ltpData) => {
                if (isActiveRef.current) {
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
                }
            },
        });

        feed.connect();
        feedRef.current = feed;

        return () => {
            isActiveRef.current = false;
            if (indexPollRef.current) clearInterval(indexPollRef.current);
            if (chainPollRef.current) clearInterval(chainPollRef.current);
            feed.destroy();
            feedRef.current = null;
        };
    }, []);

    const fetchIndices = useCallback(async (isInitial = false) => {
        if (!isActiveRef.current || indexFetchInProgress.current) return;
        indexFetchInProgress.current = true;

        if (isInitial) setIndicesLoading(true);

        try {
            const data = await getLiveIndices();
            if (isActiveRef.current) {
                setIndices(data.indices);
            }
        } catch (err) {
            try {
                const data = await getIndexPrices();
                if (isActiveRef.current) {
                    setIndices(data.indices);
                }
            } catch {
                console.error("Failed to fetch indices:", err);
            }
        } finally {
            indexFetchInProgress.current = false;
            if (isInitial && isActiveRef.current) {
                setIndicesLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchIndices(true).then(() => {
                if (isActiveRef.current) {
                    if (indexPollRef.current) clearInterval(indexPollRef.current);
                    indexPollRef.current = setInterval(() => {
                        fetchIndices(false);
                    }, INDEX_POLL_INTERVAL);
            }
        });

        return () => {
            if (indexPollRef.current) clearInterval(indexPollRef.current);
        };
    }, [fetchIndices]);

    useEffect(() => {
        const indexName = INSTRUMENT_INDEX_MAP[currentInstrument.toUpperCase()];
        if (!indexName || indices.length === 0) return;
        const match = indices.find((idx) => idx.symbol === indexName);
        if (match && match.ltp > 0) {
            setUnderlyingLTP(match.ltp);
        }
    }, [indices, currentInstrument]);

    useEffect(() => {
        async function loadExpiries() {
            setExpiryLoading(true);
            setExpiryDates([]);
            setSelectedExpiry("");
            try {
                const data = await getExpiryDates(currentInstrument, currentExchange);
                if (isActiveRef.current && data.expiry_dates.length > 0) {
                    setExpiryDates(data.expiry_dates);
                    setSelectedExpiry(data.expiry_dates[0]);
                } else if (isActiveRef.current) {
                    setExpiryDates([]);
                    setSelectedExpiry("");
                    setChainError("No expiry dates available for this instrument.");
                    setChainLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch expiry dates:", err);
                if (isActiveRef.current) {
                    setExpiryDates([]);
                    setSelectedExpiry("");
                    setChainError("Failed to load expiry dates. Backend may be starting up.");
                    setChainLoading(false);
                }
            } finally {
                if (isActiveRef.current) setExpiryLoading(false);
            }
        }

        loadExpiries();
    }, [currentInstrument, currentExchange]);

    useEffect(() => {
        async function loadLotSize() {
            try {
                const data = await getLotSize(currentInstrument);
                if (isActiveRef.current && data.lot_size) {
                    setLotSize(data.lot_size);
                }
            } catch (err) {
                console.error("Failed to fetch lot size:", err);
            }
        }
        loadLotSize();
    }, [currentInstrument]);

    const fetchOptionChain = useCallback(
        async (symbol: string, expiry: string, exchange: string, isInitial = false) => {
            if (!isActiveRef.current || !expiry) return;
            if (chainFetchInProgress.current && !isInitial) return;
            chainFetchInProgress.current = true;

            if (isInitial) {
                setChainLoading(true);
                setChainError(null);
            }

            try {
                const data = await getOptionChain(symbol, expiry, exchange);
                if (isActiveRef.current) {
                    if (symbol !== currentInstrumentRef.current) {
                        chainFetchInProgress.current = false;
                        return;
                    }

                    if (data.strikes && data.strikes.length > 0) {
                        setStrikes(data.strikes);
                        setUnderlyingLTP(data.underlying_ltp);
                        setPcr(data.pcr);
                        setMaxPain(data.max_pain);
                        setAtmStrike(data.atm_strike);
                        setChainError(null);

                        if (data.lot_size && data.lot_size > 0) {
                            setLotSize(data.lot_size);
                        }

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
            } catch (err: unknown) {
                console.error("Failed to fetch option chain:", err);
                if (isInitial && isActiveRef.current) {
                    const message = err instanceof Error ? err.message : "Failed to load option chain";
                    setChainError(message);
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

    useEffect(() => {
        if (currentInstrument && selectedExpiry) {
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

    const handleSelectInstrument = (inst: Instrument) => {
        if (chainPollRef.current) {
            clearInterval(chainPollRef.current);
            chainPollRef.current = null;
        }
        chainFetchInProgress.current = false;

        setCurrentInstrument(inst.symbol);
        setCurrentExchange(inst.exchange);
        setStrikes([]);
        setChainLoading(true);
        setChainError(null);
        setExpiryLoading(true);
        setExpiryDates([]);
        setSelectedExpiry("");
        setUnderlyingLTP(0);
        setPcr(0);
        setMaxPain(0);
        setAtmStrike(0);
        setStrategyLegs([]);
        setIsStrategyOpen(false);
    };

    const handleExpiryChange = (expiry: string) => {
        if (expiry === selectedExpiry) return;
        setChainLoading(true);
        setChainError(null);
        setStrikes([]);
        setSelectedExpiry(expiry);
    };

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
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0A0B0F" }}>
            <TopBar
                indices={indices}
                indicesLoading={indicesLoading}
                onSelectInstrument={handleSelectInstrument}
                currentInstrument={currentInstrument}
            />

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

            <div className="flex-1 flex overflow-hidden relative">
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
                        Warning: {chainError}
                    </motion.div>
                )}

                {expiryLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 left-0 right-0 z-30 px-6 py-2 text-center text-[10px] font-medium"
                        style={{
                            background: "rgba(0, 200, 255, 0.05)",
                            color: "rgba(0, 200, 255, 0.65)",
                            borderBottom: "1px solid rgba(0, 200, 255, 0.1)",
                        }}
                    >
                        Loading expiry dates...
                    </motion.div>
                )}

                <OptionChainTable
                    strikes={strikes}
                    atmStrike={atmStrike}
                    underlyingLTP={underlyingLTP}
                    maxPain={maxPain}
                    pcr={pcr}
                    loading={chainLoading}
                    onStrikeSelect={handleStrikeSelect}
                />

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
                    expiryDate={selectedExpiry}
                    exchange={currentExchange}
                />
            </div>
        </div>
    );
}
