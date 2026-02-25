"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StrikeData, Greeks, StrategyLeg, OptionType, TransactionType } from "@/lib/types";

interface OptionChainTableProps {
    strikes: StrikeData[];
    atmStrike: number;
    underlyingLTP: number;
    maxPain: number;
    pcr: number;
    expectedMoveRange?: [number, number];
    loading: boolean;
    onStrikeSelect: (
        strike: number,
        optionType: OptionType,
        transactionType: TransactionType
    ) => void;
}

/* ─── Helpers ─── */
function formatNumber(n: number | undefined | null): string {
    if (n === null || n === undefined) return "—";
    if (Math.abs(n) >= 10000000) return (n / 10000000).toFixed(2) + "Cr";
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(2) + "L";
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString("en-IN");
}

function formatPrice(n: number | undefined | null): string {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatGreek(n: number | undefined | null, decimals: number = 4): string {
    if (n === null || n === undefined) return "—";
    return n.toFixed(decimals);
}

function getOIIntensity(oi: number, maxOI: number): number {
    if (maxOI === 0) return 0;
    return Math.min(oi / maxOI, 1);
}

function isUnusualOI(oi: number, maxOI: number): boolean {
    return maxOI > 0 && oi / maxOI > 0.7;
}

/* ─── Loading skeleton ─── */
function SkeletonRow() {
    return (
        <TableRow className="border-b border-white/[0.03]">
            {Array.from({ length: 21 }).map((_, i) => (
                <TableCell key={i} className="py-2">
                    <div className="h-3 w-full rounded bg-white/[0.04] animate-shimmer" />
                </TableCell>
            ))}
        </TableRow>
    );
}

/* ─── Column Headers ─── */
const CALL_COLUMNS = ["Delta", "Theta", "IV", "Vol", "OI Chg", "OI", "Ask", "Bid", "Chg%", "LTP"];
const PUT_COLUMNS = ["LTP", "Chg%", "Bid", "Ask", "OI", "OI Chg", "Vol", "IV", "Theta", "Delta"];

export function OptionChainTable({
    strikes,
    atmStrike,
    underlyingLTP,
    maxPain,
    pcr,
    expectedMoveRange,
    loading,
    onStrikeSelect,
}: OptionChainTableProps) {
    const atmRowRef = useRef<HTMLTableRowElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to ATM on load
    useEffect(() => {
        if (atmRowRef.current && !loading && strikes.length > 0) {
            setTimeout(() => {
                atmRowRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 300);
        }
    }, [strikes, atmStrike, loading]);

    // Calculate max OI for heatmap intensity
    const { maxCallOI, maxPutOI } = useMemo(() => {
        let maxC = 0;
        let maxP = 0;
        strikes.forEach((s) => {
            if (s.CE?.open_interest && s.CE.open_interest > maxC) maxC = s.CE.open_interest;
            if (s.PE?.open_interest && s.PE.open_interest > maxP) maxP = s.PE.open_interest;
        });
        return { maxCallOI: maxC, maxPutOI: maxP };
    }, [strikes]);

    // Expected move range
    const inExpectedMove = useCallback(
        (strike: number) => {
            if (!expectedMoveRange) return false;
            return strike >= expectedMoveRange[0] && strike <= expectedMoveRange[1];
        },
        [expectedMoveRange]
    );

    if (loading) {
        return (
            <div className="flex-1 overflow-hidden">
                <div className="option-chain-table">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/[0.06]">
                                <TableHead colSpan={10} className="text-center text-[#00E676]/80 font-bold text-[10px] tracking-widest py-1.5"
                                    style={{ background: "rgba(0, 230, 118, 0.04)" }}>
                                    CALLS
                                </TableHead>
                                <TableHead className="text-center font-bold text-[10px] tracking-widest text-white py-1.5"
                                    style={{ background: "rgba(108, 92, 231, 0.08)" }}>
                                    STRIKE
                                </TableHead>
                                <TableHead colSpan={10} className="text-center text-[#FF5252]/80 font-bold text-[10px] tracking-widest py-1.5"
                                    style={{ background: "rgba(255, 82, 82, 0.04)" }}>
                                    PUTS
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 15 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
            <ScrollArea className="h-full">
                <div className="option-chain-table">
                    <Table>
                        <TableHeader className="sticky top-0 z-20" style={{ background: "#0D0E13" }}>
                            {/* Section headers */}
                            <TableRow className="border-b border-white/[0.06]">
                                <TableHead
                                    colSpan={10}
                                    className="text-center font-bold text-[10px] tracking-[0.15em] py-1.5"
                                    style={{ color: "rgba(0, 230, 118, 0.7)", background: "rgba(0, 230, 118, 0.04)" }}
                                >
                                    CALLS
                                </TableHead>
                                <TableHead
                                    className="text-center font-bold text-[10px] tracking-[0.15em] text-white py-1.5"
                                    style={{ background: "rgba(108, 92, 231, 0.08)" }}
                                >
                                    STRIKE
                                </TableHead>
                                <TableHead
                                    colSpan={10}
                                    className="text-center font-bold text-[10px] tracking-[0.15em] py-1.5"
                                    style={{ color: "rgba(255, 82, 82, 0.7)", background: "rgba(255, 82, 82, 0.04)" }}
                                >
                                    PUTS
                                </TableHead>
                            </TableRow>
                            {/* Column headers */}
                            <TableRow className="border-b border-white/[0.06]" style={{ background: "#0D0E13" }}>
                                {CALL_COLUMNS.map((col) => (
                                    <TableHead key={`c-${col}`} className="text-center whitespace-nowrap px-2">
                                        {col}
                                    </TableHead>
                                ))}
                                <TableHead
                                    className="text-center whitespace-nowrap px-3 font-bold text-white"
                                    style={{ background: "rgba(108, 92, 231, 0.06)" }}
                                >
                                    STRIKE
                                </TableHead>
                                {PUT_COLUMNS.map((col) => (
                                    <TableHead key={`p-${col}`} className="text-center whitespace-nowrap px-2">
                                        {col}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            <AnimatePresence mode="sync">
                                {strikes.map((strike, idx) => {
                                    const isATM = strike.strike_price === atmStrike;
                                    const isMaxPain = strike.strike_price === maxPain;
                                    const isInExpectedMove = inExpectedMove(strike.strike_price);
                                    const callOIIntensity = strike.CE
                                        ? getOIIntensity(strike.CE.open_interest, maxCallOI)
                                        : 0;
                                    const putOIIntensity = strike.PE
                                        ? getOIIntensity(strike.PE.open_interest, maxPutOI)
                                        : 0;
                                    const callUnusual = strike.CE
                                        ? isUnusualOI(strike.CE.open_interest, maxCallOI)
                                        : false;
                                    const putUnusual = strike.PE
                                        ? isUnusualOI(strike.PE.open_interest, maxPutOI)
                                        : false;

                                    // ITM/OTM
                                    const isCallITM = strike.strike_price < underlyingLTP;
                                    const isPutITM = strike.strike_price > underlyingLTP;

                                    return (
                                        <motion.tr
                                            key={strike.strike_price}
                                            ref={isATM ? atmRowRef : undefined}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.5) }}
                                            className={`border-b border-white/[0.03] transition-colors duration-200 hover:bg-white/[0.02] ${isATM ? "atm-row" : ""
                                                }`}
                                            style={{
                                                background: isATM
                                                    ? "var(--atm-highlight)"
                                                    : isInExpectedMove
                                                        ? "rgba(108, 92, 231, 0.03)"
                                                        : undefined,
                                            }}
                                        >
                                            {/* ═══ CALL SIDE ═══ */}
                                            {/* Delta */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatGreek(strike.CE?.greeks?.delta)}
                                            </TableCell>
                                            {/* Theta */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatGreek(strike.CE?.greeks?.theta)}
                                            </TableCell>
                                            {/* IV */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "#48DBFB",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {strike.CE?.greeks?.iv ? `${strike.CE.greeks.iv.toFixed(1)}%` : "—"}
                                            </TableCell>
                                            {/* Volume */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatNumber(strike.CE?.volume)}
                                            </TableCell>
                                            {/* OI Change (placeholder, API doesn't provide directly) */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* OI with heatmap */}
                                            <TableCell
                                                className={`text-center text-[11px] font-medium ${callUnusual ? "animate-pulse-amber" : ""
                                                    }`}
                                                style={{
                                                    color: "var(--call-green)",
                                                    background: isCallITM
                                                        ? `rgba(0, 230, 118, ${0.02 + callOIIntensity * 0.12})`
                                                        : `rgba(0, 230, 118, ${callOIIntensity * 0.12})`,
                                                }}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-default">
                                                            {formatNumber(strike.CE?.open_interest)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="glass text-xs">
                                                        OI: {strike.CE?.open_interest?.toLocaleString() || 0}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            {/* Ask */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* Bid */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* Change % */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* LTP */}
                                            <TableCell
                                                className="text-center text-[11px] font-semibold cursor-pointer hover:text-[#00E676] transition-colors"
                                                style={{
                                                    color: "white",
                                                    background: isCallITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}
                                                onClick={() => onStrikeSelect(strike.strike_price, "CE", "BUY")}
                                            >
                                                {formatPrice(strike.CE?.ltp)}
                                            </TableCell>

                                            {/* ═══ STRIKE ═══ */}
                                            <TableCell
                                                className="text-center px-3 font-bold text-[12px] relative"
                                                style={{
                                                    background: isATM
                                                        ? "rgba(108, 92, 231, 0.15)"
                                                        : "rgba(108, 92, 231, 0.04)",
                                                    color: isATM ? "#a29bfe" : "white",
                                                }}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    {strike.strike_price.toLocaleString("en-IN")}
                                                    {isATM && (
                                                        <span className="text-[8px] font-bold text-[#6C5CE7] ml-1 px-1 py-0.5 rounded"
                                                            style={{ background: "rgba(108, 92, 231, 0.2)" }}>
                                                            ATM
                                                        </span>
                                                    )}
                                                    {isMaxPain && !isATM && (
                                                        <span className="text-[8px] font-bold text-[#FFB300] ml-1 px-1 py-0.5 rounded"
                                                            style={{ background: "rgba(255, 179, 0, 0.15)" }}>
                                                            MP
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* ═══ PUT SIDE ═══ */}
                                            {/* LTP */}
                                            <TableCell
                                                className="text-center text-[11px] font-semibold cursor-pointer hover:text-[#FF5252] transition-colors"
                                                style={{
                                                    color: "white",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}
                                                onClick={() => onStrikeSelect(strike.strike_price, "PE", "BUY")}
                                            >
                                                {formatPrice(strike.PE?.ltp)}
                                            </TableCell>
                                            {/* Change % */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* Bid */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* Ask */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* OI with heatmap */}
                                            <TableCell
                                                className={`text-center text-[11px] font-medium ${putUnusual ? "animate-pulse-amber" : ""
                                                    }`}
                                                style={{
                                                    color: "var(--put-red)",
                                                    background: isPutITM
                                                        ? `rgba(255, 82, 82, ${0.02 + putOIIntensity * 0.12})`
                                                        : `rgba(255, 82, 82, ${putOIIntensity * 0.12})`,
                                                }}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-default">
                                                            {formatNumber(strike.PE?.open_interest)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="glass text-xs">
                                                        OI: {strike.PE?.open_interest?.toLocaleString() || 0}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            {/* OI Change */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                —
                                            </TableCell>
                                            {/* Volume */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatNumber(strike.PE?.volume)}
                                            </TableCell>
                                            {/* IV */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "#48DBFB",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {strike.PE?.greeks?.iv ? `${strike.PE.greeks.iv.toFixed(1)}%` : "—"}
                                            </TableCell>
                                            {/* Theta */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatGreek(strike.PE?.greeks?.theta)}
                                            </TableCell>
                                            {/* Delta */}
                                            <TableCell className="text-center text-[11px]"
                                                style={{
                                                    color: "var(--muted-foreground)",
                                                    background: isPutITM ? "rgba(255,255,255,0.015)" : undefined,
                                                }}>
                                                {formatGreek(strike.PE?.greeks?.delta)}
                                            </TableCell>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>
        </div>
    );
}
