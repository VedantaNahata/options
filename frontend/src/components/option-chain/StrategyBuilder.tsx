"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Plus,
    Minus,
    ArrowUpDown,
    Trash2,
    TrendingUp,
    Save,
    Check,
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
import { useAuth } from "@/lib/auth-context";
import { saveStrategy } from "@/lib/strategies";
import type { StrategyLeg, TransactionType } from "@/lib/types";

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
    expiryDate?: string;
    exchange?: string;
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
    expiryDate = "",
    exchange = "NSE",
}: StrategyBuilderProps) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!user || legs.length === 0) return;
        setSaving(true);
        const name = `${instrumentName} ${legs
            .map((l) => `${l.transaction_type} ${l.strike_price}${l.option_type}`)
            .join(" / ")}`;

        const { error } = await saveStrategy(
            user.id,
            name,
            instrumentName,
            exchange,
            expiryDate,
            underlyingLTP,
            lotSize,
            legs
        );

        setSaving(false);
        if (!error) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

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
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close strategy builder"
                        className="absolute inset-0 z-30 bg-black/30 lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    <motion.aside
                        initial={{ x: 22, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 22, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute inset-y-0 right-0 z-40 w-full sm:w-[430px] lg:static lg:z-auto lg:flex-shrink-0 border-l overflow-hidden"
                        style={{
                            borderColor: "var(--border)",
                            background: "linear-gradient(180deg, rgba(14,16,24,0.98) 0%, rgba(11,12,18,0.98) 100%)",
                            boxShadow: "-12px 0 32px rgba(0,0,0,0.35)",
                        }}
                    >
                        <button
                            onClick={onClose}
                            className="hidden lg:flex absolute left-[-14px] top-5 z-50 h-7 w-7 items-center justify-center rounded-full border text-white/75 hover:text-white transition-colors"
                            style={{
                                borderColor: "rgba(255,255,255,0.15)",
                                background: "rgba(12, 14, 22, 0.95)",
                            }}
                            aria-label="Close strategy panel"
                        >
                            <X size={14} />
                        </button>

                        <div className="h-full flex flex-col">
                            <div
                                className="flex items-center justify-between px-6 py-5 border-b"
                                style={{
                                    borderColor: "var(--border)",
                                    background: "linear-gradient(90deg, rgba(108, 92, 231, 0.14), rgba(108, 92, 231, 0.04))",
                                }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-7 h-7 rounded-md flex items-center justify-center"
                                        style={{ background: "rgba(108, 92, 231, 0.2)" }}
                                    >
                                        <ArrowUpDown size={12} className="text-[#a29bfe]" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white">Strategy Builder</h3>
                                        {legs.length > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 border-[#6C5CE7]/35 text-[#a29bfe]"
                                            >
                                                {legs.length} leg{legs.length !== 1 ? "s" : ""}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-7 h-7 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div
                                className="px-6 py-4 border-b flex items-center justify-between"
                                style={{
                                    borderColor: "var(--border)",
                                    background: "rgba(108, 92, 231, 0.05)",
                                }}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={11} style={{ color: "#6C5CE7" }} />
                                        <span className="text-xs font-bold text-white">{instrumentName}</span>
                                        <span className="text-xs font-bold text-[#a29bfe]">
                                            Rs {formatINR(underlyingLTP)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                                            Lot Size
                                        </span>
                                        <span className="text-[10px] font-semibold text-[#a29bfe]">
                                            1 Lot = {lotSize.toLocaleString()} units
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                                {legs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-center">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                                            style={{ background: "rgba(108, 92, 231, 0.12)" }}
                                        >
                                            <Plus size={20} className="text-[#6C5CE7]/60" />
                                        </div>
                                        <p className="text-xs font-medium text-white/65 mb-1">No legs added yet</p>
                                        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                                            Click any strike LTP in the option chain to add a leg
                                        </p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {legs.map((leg) => (
                                            <motion.div
                                                key={leg.id}
                                                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                                                layout
                                                transition={{ duration: 0.16, ease: "easeOut" }}
                                            >
                                                <Card
                                                    className="border-white/[0.08]"
                                                    style={{
                                                        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
                                                    }}
                                                >
                                                    <CardContent className="p-4 space-y-3.5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5">
                                                                <Badge
                                                                    className="text-[10px] px-1.5 py-0 font-bold"
                                                                    style={{
                                                                        background:
                                                                            leg.transaction_type === "BUY"
                                                                                ? "rgba(0, 230, 118, 0.16)"
                                                                                : "rgba(255, 82, 82, 0.16)",
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
                                                                className="w-6 h-6 rounded text-white/35 hover:text-[#FF5252] hover:bg-white/[0.05] transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>

                                                        {leg.trading_symbol && (
                                                            <div className="px-1 -mt-0.5">
                                                                <span className="text-[9px] font-mono tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                                                                    {leg.trading_symbol}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2.5">
                                                            <Select
                                                                value={leg.transaction_type}
                                                                onValueChange={(v) =>
                                                                    onUpdateLeg(leg.id, { transaction_type: v as TransactionType })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-7 text-[10px] w-20 bg-white/[0.04] border-white/[0.1]">
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
                                                                    className="w-6 h-6 rounded flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
                                                                >
                                                                    <Minus size={10} className="text-white/70" />
                                                                </button>
                                                                <span className="w-8 text-center text-xs font-bold text-white">{leg.lots}</span>
                                                                <button
                                                                    onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                                                                    className="w-6 h-6 rounded flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
                                                                >
                                                                    <Plus size={10} className="text-white/70" />
                                                                </button>
                                                                <span className="text-[10px] ml-1" style={{ color: "var(--muted-foreground)" }}>
                                                                    lots
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                                                            style={{ background: "rgba(108, 92, 231, 0.08)" }}
                                                        >
                                                            <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                                                                Qty ({leg.lots} x {lotSize})
                                                            </span>
                                                            <span className="text-[10px] font-bold text-[#a29bfe]">
                                                                {(leg.lots * lotSize).toLocaleString()} units
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-3 pt-1.5">
                                                            <div>
                                                                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>LTP</div>
                                                                <div className="text-[10px] font-semibold text-white">Rs {formatINR(leg.ltp)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Delta</div>
                                                                <div className="text-[10px] font-semibold text-white">{leg.greeks?.delta?.toFixed(4) || "--"}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Theta</div>
                                                                <div className="text-[10px] font-semibold text-white">{leg.greeks?.theta?.toFixed(4) || "--"}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>IV</div>
                                                                <div className="text-[10px] font-semibold text-[#48DBFB]">{leg.greeks?.iv?.toFixed(1) || "--"}%</div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            {legs.length > 0 && (
                                <div className="border-t px-5 py-5 space-y-4" style={{ borderColor: "var(--border)" }}>
                                    <Separator className="bg-white/[0.06]" />

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

                                    <div
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{
                                            background: totalPremium >= 0
                                                ? "rgba(0, 230, 118, 0.08)"
                                                : "rgba(255, 82, 82, 0.08)",
                                        }}
                                    >
                                        <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                                            Net Premium
                                        </span>
                                        <span
                                            className="text-sm font-bold"
                                            style={{ color: totalPremium >= 0 ? "var(--call-green)" : "var(--put-red)" }}
                                        >
                                            {totalPremium >= 0 ? "+" : ""}Rs {formatINR(Math.abs(totalPremium))}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onClearAll}
                                            className="h-8 text-xs bg-transparent border-white/[0.1] hover:bg-white/[0.05] hover:border-[#FF5252]/30 text-white/70"
                                        >
                                            <Trash2 size={12} className="mr-1" /> Clear
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSave}
                                            disabled={saving || saved}
                                            className="h-8 text-xs font-bold"
                                            style={{
                                                background: saved
                                                    ? "rgba(16, 185, 129, 0.2)"
                                                    : "rgba(108, 92, 231, 0.22)",
                                                color: saved ? "#10B981" : "#a29bfe",
                                                border: saved
                                                    ? "1px solid rgba(16,185,129,0.3)"
                                                    : "1px solid rgba(108,92,231,0.3)",
                                            }}
                                        >
                                            {saved ? (
                                                <><Check size={12} className="mr-1" /> Saved</>
                                            ) : saving ? (
                                                "Saving..."
                                            ) : (
                                                <><Save size={12} className="mr-1" /> Save</>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 h-8 text-xs font-bold"
                                            style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)" }}
                                        >
                                            Analyze
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
