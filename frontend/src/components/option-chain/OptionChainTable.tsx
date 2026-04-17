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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StrikeData, OptionType, TransactionType } from "@/lib/types";

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

function formatNumber(n: number | undefined | null): string {
    if (n === null || n === undefined) return "--";
    if (Math.abs(n) >= 10000000) return (n / 10000000).toFixed(2) + "Cr";
    if (Math.abs(n) >= 100000) return (n / 100000).toFixed(2) + "L";
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString("en-IN");
}

function formatPrice(n: number | undefined | null): string {
    if (n === null || n === undefined) return "--";
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatGreek(n: number | undefined | null, decimals: number = 4): string {
    if (n === null || n === undefined) return "--";
    return n.toFixed(decimals);
}

function getOIIntensity(oi: number, maxOI: number): number {
    if (maxOI === 0) return 0;
    return Math.min(oi / maxOI, 1);
}

function isUnusualOI(oi: number, maxOI: number): boolean {
    return maxOI > 0 && oi / maxOI > 0.7;
}

function SkeletonRow() {
    return (
        <TableRow className="border-b border-white/[0.03]">
            {Array.from({ length: 19 }).map((_, i) => (
                <TableCell key={i} className="py-2">
                    <div className="h-3 w-full rounded bg-white/[0.04] animate-shimmer" />
                </TableCell>
            ))}
        </TableRow>
    );
}

const CALL_COLUMNS = ["Rho", "Vega", "Gamma", "Delta", "Theta", "IV", "Vol", "OI", "LTP"];
const PUT_COLUMNS = ["LTP", "OI", "Vol", "IV", "Theta", "Delta", "Gamma", "Vega", "Rho"];

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

    const { maxCallOI, maxPutOI } = useMemo(() => {
        let maxC = 0;
        let maxP = 0;
        strikes.forEach((s) => {
            if (s.CE?.open_interest && s.CE.open_interest > maxC) maxC = s.CE.open_interest;
            if (s.PE?.open_interest && s.PE.open_interest > maxP) maxP = s.PE.open_interest;
        });
        return { maxCallOI: maxC, maxPutOI: maxP };
    }, [strikes]);

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
                <div className="option-chain-table min-w-[1120px]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/[0.06]">
                                <TableHead colSpan={9} className="text-center text-[#00E676]/80 font-bold text-[10px] tracking-widest py-1.5"
                                    style={{ background: "rgba(0, 230, 118, 0.04)" }}>
                                    CALLS
                                </TableHead>
                                <TableHead className="text-center font-bold text-[10px] tracking-widest text-white py-1.5"
                                    style={{ background: "rgba(108, 92, 231, 0.08)" }}>
                                    STRIKE
                                </TableHead>
                                <TableHead colSpan={9} className="text-center text-[#FF5252]/80 font-bold text-[10px] tracking-widest py-1.5"
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
        <div className="flex-1 overflow-auto">
            <div
                className="sticky top-0 z-10 px-4 py-2 border-b flex items-center gap-4 text-[10px]"
                style={{
                    borderColor: "var(--border)",
                    background: "rgba(10, 12, 18, 0.88)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <span style={{ color: "var(--muted-foreground)" }}>Readability Guide:</span>
                <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(108, 92, 231, 0.16)", color: "#a29bfe" }}>ATM</span>
                <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255, 179, 0, 0.15)", color: "#FFB300" }}>MP</span>
                <span style={{ color: "var(--muted-foreground)" }}>PCR {pcr.toFixed(4)}</span>
            </div>

            <div className="option-chain-table min-w-[1120px]">
                <Table>
                    <TableHeader className="sticky top-[33px] z-20" style={{ background: "#0D0E13" }}>
                        <TableRow className="border-b border-white/[0.06]">
                            <TableHead
                                colSpan={9}
                                className="text-center font-bold text-[10px] tracking-[0.15em] py-1.5"
                                style={{ color: "rgba(0, 230, 118, 0.8)", background: "rgba(0, 230, 118, 0.05)" }}
                            >
                                CALLS
                            </TableHead>
                            <TableHead
                                className="text-center font-bold text-[10px] tracking-[0.15em] text-white py-1.5"
                                style={{ background: "rgba(108, 92, 231, 0.10)" }}
                            >
                                STRIKE
                            </TableHead>
                            <TableHead
                                colSpan={9}
                                className="text-center font-bold text-[10px] tracking-[0.15em] py-1.5"
                                style={{ color: "rgba(255, 82, 82, 0.8)", background: "rgba(255, 82, 82, 0.05)" }}
                            >
                                PUTS
                            </TableHead>
                        </TableRow>

                        <TableRow className="border-b border-white/[0.06]" style={{ background: "#0D0E13" }}>
                            {CALL_COLUMNS.map((col) => (
                                <TableHead key={`c-${col}`} className="text-center whitespace-nowrap px-2">
                                    {col}
                                </TableHead>
                            ))}
                            <TableHead
                                className="text-center whitespace-nowrap px-3 font-bold text-white"
                                style={{ background: "rgba(108, 92, 231, 0.08)" }}
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

                                const isCallITM = strike.strike_price < underlyingLTP;
                                const isPutITM = strike.strike_price > underlyingLTP;

                                return (
                                    <motion.tr
                                        key={strike.strike_price}
                                        ref={isATM ? atmRowRef : undefined}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2, delay: Math.min(idx * 0.008, 0.4) }}
                                        className={`border-b border-white/[0.03] transition-colors duration-200 hover:bg-white/[0.03] ${isATM ? "atm-row" : ""}`}
                                        style={{
                                            background: isATM
                                                ? "var(--atm-highlight)"
                                                : isInExpectedMove
                                                    ? "rgba(108, 92, 231, 0.035)"
                                                    : idx % 2 === 0
                                                        ? "rgba(255,255,255,0.01)"
                                                        : undefined,
                                        }}
                                    >
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.CE?.greeks?.rho)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.CE?.greeks?.vega)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.CE?.greeks?.gamma)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.CE?.greeks?.delta)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.CE?.greeks?.theta)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "#48DBFB", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {strike.CE?.greeks?.iv ? `${strike.CE.greeks.iv.toFixed(1)}%` : "--"}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatNumber(strike.CE?.volume)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-center text-[12px] font-medium ${callUnusual ? "animate-pulse-amber" : ""}`}
                                            style={{
                                                color: "var(--muted-foreground)",
                                                background: isCallITM
                                                    ? `rgba(255, 255, 255, ${0.02 + callOIIntensity * 0.06})`
                                                    : `rgba(255, 255, 255, ${callOIIntensity * 0.06})`,
                                            }}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-default">{formatNumber(strike.CE?.open_interest)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="glass text-xs">
                                                    OI: {strike.CE?.open_interest?.toLocaleString() || 0}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell
                                            className="text-center text-[12px] font-semibold cursor-pointer hover:text-[#00E676] transition-colors"
                                            style={{ color: "white", background: isCallITM ? "rgba(255,255,255,0.015)" : undefined }}
                                            onClick={() => onStrikeSelect(strike.strike_price, "CE", "BUY")}
                                        >
                                            {formatPrice(strike.CE?.ltp)}
                                        </TableCell>

                                        <TableCell
                                            className="text-center px-3 font-bold text-[12px] relative"
                                            style={{
                                                background: isATM ? "rgba(108, 92, 231, 0.18)" : "rgba(108, 92, 231, 0.05)",
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

                                        <TableCell
                                            className="text-center text-[12px] font-semibold cursor-pointer hover:text-[#FF5252] transition-colors"
                                            style={{ color: "white", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}
                                            onClick={() => onStrikeSelect(strike.strike_price, "PE", "BUY")}
                                        >
                                            {formatPrice(strike.PE?.ltp)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-center text-[12px] font-medium ${putUnusual ? "animate-pulse-amber" : ""}`}
                                            style={{
                                                color: "var(--muted-foreground)",
                                                background: isPutITM
                                                    ? `rgba(255, 255, 255, ${0.02 + putOIIntensity * 0.06})`
                                                    : `rgba(255, 255, 255, ${putOIIntensity * 0.06})`,
                                            }}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-default">{formatNumber(strike.PE?.open_interest)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="glass text-xs">
                                                    OI: {strike.PE?.open_interest?.toLocaleString() || 0}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatNumber(strike.PE?.volume)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "#48DBFB", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {strike.PE?.greeks?.iv ? `${strike.PE.greeks.iv.toFixed(1)}%` : "--"}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.PE?.greeks?.theta)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.PE?.greeks?.delta)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.PE?.greeks?.gamma)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.PE?.greeks?.vega)}
                                        </TableCell>
                                        <TableCell className="text-center text-[12px]" style={{ color: "var(--muted-foreground)", background: isPutITM ? "rgba(255,255,255,0.015)" : undefined }}>
                                            {formatGreek(strike.PE?.greeks?.rho)}
                                        </TableCell>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
