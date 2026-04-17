"use client";

import { motion } from "framer-motion";
import {
    Plus,
    Minus,
    Trash2,
    ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { StrategyLeg, OptionType, TransactionType } from "@/lib/types";

interface LegEditorProps {
    legs: StrategyLeg[];
    onUpdateLeg: (id: string, updates: Partial<StrategyLeg>) => void;
    onRemoveLeg: (id: string) => void;
    onAddCustomLeg: () => void;
    onClearAll: () => void;
    lotSize: number;
    instrumentName: string;
    underlyingLTP: number;
}

function formatINR(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function LegEditor({
    legs,
    onUpdateLeg,
    onRemoveLeg,
    onAddCustomLeg,
    onClearAll,
    lotSize,
    instrumentName,
    underlyingLTP,
}: LegEditorProps) {
    const netPremium = legs.reduce((sum, leg) => {
        const mult = leg.transaction_type === "BUY" ? -1 : 1;
        return sum + leg.ltp * leg.lots * lotSize * mult;
    }, 0);

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{
                    borderColor: "rgba(255,255,255,0.04)",
                    background: "linear-gradient(90deg, rgba(139,92,246,0.08), transparent)",
                }}>
                <div className="flex items-center gap-2">
                    <ArrowUpDown size={13} className="text-[#A78BFA]" />
                    <span className="text-xs font-bold text-white">Strategy Legs</span>
                    {legs.length > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#8B5CF6]/30 text-[#A78BFA]">
                            {legs.length} leg{legs.length !== 1 ? "s" : ""}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {legs.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors text-white/40 hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={onAddCustomLeg}
                        className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                        style={{
                            background: "rgba(139,92,246,0.12)",
                            color: "#A78BFA",
                            border: "1px solid rgba(139,92,246,0.2)",
                        }}
                    >
                        <Plus size={10} /> Add Leg
                    </button>
                </div>
            </div>

            {/* Instrument info */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b"
                style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Underlying</span>
                    <span className="text-[10px] font-bold text-white">{instrumentName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Spot</span>
                    <span className="text-[10px] font-bold text-[#F59E0B]">₹{formatINR(underlyingLTP)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Lot</span>
                    <span className="text-[10px] font-bold text-[#A78BFA]">{lotSize}</span>
                </div>
            </div>

            {/* Legs list */}
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                {legs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                            style={{ background: "rgba(139,92,246,0.1)" }}>
                            <Plus size={18} className="text-[#8B5CF6]/50" />
                        </div>
                        <p className="text-[11px] font-medium text-white/50 mb-1">No legs yet</p>
                        <p className="text-[10px] text-white/30">Add legs manually or use a template above</p>
                    </div>
                ) : (
                    legs.map((leg, idx) => (
                        <motion.div
                            key={leg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {/* Leg number */}
                                <span className="text-[9px] font-bold text-white/20 w-4">L{idx + 1}</span>

                                {/* Buy/Sell toggle */}
                                <Select
                                    value={leg.transaction_type}
                                    onValueChange={(v) => onUpdateLeg(leg.id, { transaction_type: v as TransactionType })}
                                >
                                    <SelectTrigger
                                        className="h-7 text-[10px] w-16 border-white/[0.08]"
                                        style={{
                                            background: leg.transaction_type === "BUY" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                                            color: leg.transaction_type === "BUY" ? "#10B981" : "#EF4444",
                                        }}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass">
                                        <SelectItem value="BUY" className="text-[10px]">BUY</SelectItem>
                                        <SelectItem value="SELL" className="text-[10px]">SELL</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Strike price */}
                                <span className="text-xs font-bold text-white min-w-[60px]">
                                    {leg.strike_price.toLocaleString()}
                                </span>

                                {/* CE/PE badge */}
                                <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0"
                                    style={{
                                        borderColor: leg.option_type === "CE" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                                        color: leg.option_type === "CE" ? "#10B981" : "#EF4444",
                                    }}
                                >
                                    {leg.option_type}
                                </Badge>

                                {/* Lots */}
                                <div className="flex items-center gap-1 ml-auto">
                                    <button
                                        onClick={() => onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                                        className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                                    >
                                        <Minus size={9} className="text-white/60" />
                                    </button>
                                    <span className="text-[10px] font-bold text-white w-6 text-center">{leg.lots}</span>
                                    <button
                                        onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                                        className="w-5 h-5 rounded flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                                    >
                                        <Plus size={9} className="text-white/60" />
                                    </button>
                                </div>

                                {/* LTP */}
                                <span className="text-[10px] font-semibold text-white/70 min-w-[55px] text-right">
                                    ₹{formatINR(leg.ltp)}
                                </span>

                                {/* IV */}
                                <span className="text-[10px] font-semibold min-w-[35px] text-right"
                                    style={{ color: "#06B6D4" }}>
                                    {leg.greeks?.iv?.toFixed(1) || "--"}%
                                </span>

                                {/* Delete */}
                                <button
                                    onClick={() => onRemoveLeg(leg.id)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Footer - Net premium */}
            {legs.length > 0 && (
                <div className="px-5 py-3 border-t flex items-center justify-between"
                    style={{
                        borderColor: "rgba(255,255,255,0.04)",
                        background: netPremium >= 0 ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
                    }}>
                    <span className="text-[10px] font-medium text-white/40">Net Premium</span>
                    <span className="text-sm font-bold"
                        style={{ color: netPremium >= 0 ? "#10B981" : "#EF4444" }}>
                        {netPremium >= 0 ? "+" : ""}₹{formatINR(Math.abs(netPremium))}
                    </span>
                </div>
            )}
        </div>
    );
}
