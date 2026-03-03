"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Plus,
    Minus,
    ArrowUpDown,
    Trash2,
    TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { StrategyLeg, OptionType, TransactionType } from "@/lib/types";

interface StrategyBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    legs: StrategyLeg[];
    onUpdateLeg: (id: string, updates: Partial<StrategyLeg>) => void;
    onRemoveLeg: (id: string) => void;
    onClearAll: () => void;
    underlyingLTP: number;
    lotSize: number;
    instrumentName: string;
}

function formatINR(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function StrategyBuilder({
    isOpen,
    onClose,
    legs,
    onUpdateLeg,
    onRemoveLeg,
    onClearAll,
    underlyingLTP,
    lotSize,
    instrumentName,
}: StrategyBuilderProps) {
    // Calculate totals (premium is per unit, multiply by lots × lotSize)
    const totalPremium = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? -1 : 1;
        return sum + leg.ltp * leg.lots * lotSize * mult;
    }, 0);

    const totalDelta = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? 1 : -1;
        return sum + (leg.greeks?.delta || 0) * leg.lots * mult;
    }, 0);

    const totalTheta = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? 1 : -1;
        return sum + (leg.greeks?.theta || 0) * leg.lots * mult;
    }, 0);

    const totalVega = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? 1 : -1;
        return sum + (leg.greeks?.vega || 0) * leg.lots * mult;
    }, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 380, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="h-full border-l overflow-hidden flex-shrink-0"
                    style={{ borderColor: "var(--border)", background: "#0D0E13" }}
                >
                    <div className="w-[380px] h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                                    style={{ background: "rgba(108, 92, 231, 0.15)" }}>
                                    <ArrowUpDown size={12} className="text-[#6C5CE7]" />
                                </div>
                                <h3 className="text-sm font-bold text-white">Strategy Builder</h3>
                                {legs.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#6C5CE7]/30 text-[#a29bfe]">
                                        {legs.length} leg{legs.length !== 1 ? "s" : ""}
                                    </Badge>
                                )}
                            </div>
                            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Underlying info banner */}
                        <div className="px-5 py-2.5 border-b flex items-center justify-between"
                            style={{ borderColor: "var(--border)", background: "rgba(108, 92, 231, 0.04)" }}>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={11} style={{ color: "#6C5CE7" }} />
                                    <span className="text-xs font-bold text-white">
                                        {instrumentName}
                                    </span>
                                    <span className="text-xs font-bold text-[#a29bfe]">
                                        ₹{formatINR(underlyingLTP)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                                        Lot Size
                                    </span>
                                    <span className="text-[10px] font-bold text-[#a29bfe]">
                                        1 Lot = {lotSize.toLocaleString()} units
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Legs */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {legs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                                        style={{ background: "rgba(108, 92, 231, 0.1)" }}>
                                        <Plus size={20} className="text-[#6C5CE7]/50" />
                                    </div>
                                    <p className="text-xs font-medium text-white/60 mb-1">No legs added</p>
                                    <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                                        Click any strike&apos;s LTP to add it here
                                    </p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {legs.map((leg) => (
                                        <motion.div
                                            key={leg.id}
                                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                            layout
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Card className="border-white/[0.06] bg-white/[0.02]">
                                                <CardContent className="p-3 space-y-2">
                                                    {/* Top row */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                className="text-[10px] px-1.5 py-0 font-bold"
                                                                style={{
                                                                    background:
                                                                        leg.transaction_type === "BUY"
                                                                            ? "rgba(0, 230, 118, 0.15)"
                                                                            : "rgba(255, 82, 82, 0.15)",
                                                                    color:
                                                                        leg.transaction_type === "BUY"
                                                                            ? "var(--call-green)"
                                                                            : "var(--put-red)",
                                                                    border: "none",
                                                                }}
                                                            >
                                                                {leg.transaction_type}
                                                            </Badge>
                                                            <span className="text-xs font-bold text-white">
                                                                {leg.strike_price.toLocaleString()}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] px-1.5 py-0"
                                                                style={{
                                                                    borderColor:
                                                                        leg.option_type === "CE"
                                                                            ? "rgba(0, 230, 118, 0.3)"
                                                                            : "rgba(255, 82, 82, 0.3)",
                                                                    color:
                                                                        leg.option_type === "CE"
                                                                            ? "var(--call-green)"
                                                                            : "var(--put-red)",
                                                                }}
                                                            >
                                                                {leg.option_type}
                                                            </Badge>
                                                        </div>
                                                        <button
                                                            onClick={() => onRemoveLeg(leg.id)}
                                                            className="text-white/20 hover:text-[#FF5252] transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Instrument name */}
                                                    {leg.trading_symbol && (
                                                        <div className="px-1 -mt-0.5">
                                                            <span className="text-[9px] font-mono font-medium tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                                                                {leg.trading_symbol}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Controls row */}
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={leg.transaction_type}
                                                            onValueChange={(v) =>
                                                                onUpdateLeg(leg.id, { transaction_type: v as TransactionType })
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 text-[10px] w-20 bg-white/[0.03] border-white/[0.08]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="glass">
                                                                <SelectItem value="BUY" className="text-[10px]">BUY</SelectItem>
                                                                <SelectItem value="SELL" className="text-[10px]">SELL</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <div className="flex items-center gap-1 ml-auto">
                                                            <button
                                                                onClick={() =>
                                                                    onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })
                                                                }
                                                                className="w-6 h-6 rounded flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                                                            >
                                                                <Minus size={10} className="text-white/60" />
                                                            </button>
                                                            <span className="w-8 text-center text-xs font-bold text-white">
                                                                {leg.lots}
                                                            </span>
                                                            <button
                                                                onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                                                                className="w-6 h-6 rounded flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                                                            >
                                                                <Plus size={10} className="text-white/60" />
                                                            </button>
                                                            <span className="text-[10px] ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                                lots
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Quantity display */}
                                                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                                        style={{ background: "rgba(108, 92, 231, 0.06)" }}>
                                                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                            Qty ({leg.lots} × {lotSize})
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[#a29bfe]">
                                                            {(leg.lots * lotSize).toLocaleString()} units
                                                        </span>
                                                    </div>

                                                    {/* Price & greeks */}
                                                    <div className="grid grid-cols-4 gap-2 pt-1">
                                                        <div>
                                                            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                                LTP
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-white">
                                                                ₹{formatINR(leg.ltp)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                                Delta
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-white">
                                                                {leg.greeks?.delta?.toFixed(4) || "—"}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                                Theta
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-white">
                                                                {leg.greeks?.theta?.toFixed(4) || "—"}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                                IV
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-[#48DBFB]">
                                                                {leg.greeks?.iv?.toFixed(1) || "—"}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Summary footer */}
                        {legs.length > 0 && (
                            <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                                <Separator className="bg-white/[0.06]" />

                                {/* Net Greeks */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                                            Net Delta
                                        </div>
                                        <div className="text-xs font-bold text-white">{totalDelta.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                                            Net Theta
                                        </div>
                                        <div className="text-xs font-bold text-white">{totalTheta.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                                            Net Vega
                                        </div>
                                        <div className="text-xs font-bold text-white">{totalVega.toFixed(4)}</div>
                                    </div>
                                </div>

                                {/* Net Premium */}
                                <div className="flex items-center justify-between p-3 rounded-xl"
                                    style={{
                                        background: totalPremium >= 0
                                            ? "rgba(0, 230, 118, 0.06)"
                                            : "rgba(255, 82, 82, 0.06)",
                                    }}>
                                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                                        Net Premium
                                    </span>
                                    <span
                                        className="text-sm font-bold"
                                        style={{
                                            color: totalPremium >= 0 ? "var(--call-green)" : "var(--put-red)",
                                        }}
                                    >
                                        {totalPremium >= 0 ? "+" : ""}₹{formatINR(Math.abs(totalPremium))}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onClearAll}
                                        className="flex-1 h-8 text-xs bg-transparent border-white/[0.08] hover:bg-white/[0.05] hover:border-[#FF5252]/30 text-white/60"
                                    >
                                        <Trash2 size={12} className="mr-1" /> Clear All
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 h-8 text-xs font-bold"
                                        style={{
                                            background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)",
                                        }}
                                    >
                                        Analyze Strategy
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
