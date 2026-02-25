"use client";

import { motion } from "framer-motion";
import { Activity, Target, Gauge, TrendingUp, BarChart3, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsBarProps {
    underlyingLTP: number;
    pcr: number;
    maxPain: number;
    atmStrike: number;
    expiryDates: string[];
    selectedExpiry: string;
    onExpiryChange: (expiry: string) => void;
    totalStrikes: number;
    loading: boolean;
}

function formatINR(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    });
}

export function AnalyticsBar({
    underlyingLTP,
    pcr,
    maxPain,
    atmStrike,
    expiryDates,
    selectedExpiry,
    onExpiryChange,
    totalStrikes,
    loading,
}: AnalyticsBarProps) {
    const maxPainDistance = underlyingLTP > 0
        ? ((maxPain - underlyingLTP) / underlyingLTP) * 100
        : 0;

    const pcrSentiment = pcr > 1.2 ? "Bullish" : pcr < 0.8 ? "Bearish" : "Neutral";
    const pcrColor = pcr > 1.2
        ? "var(--call-green)"
        : pcr < 0.8
            ? "var(--put-red)"
            : "var(--amber-glow)";

    return (
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
            {/* Expiry tabs */}
            <div className="px-6 py-2 flex items-center gap-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mr-4">
                    <Clock size={12} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--muted-foreground)" }}>
                        Expiry
                    </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {expiryDates.length > 0 ? (
                        expiryDates.map((date) => (
                            <button
                                key={date}
                                onClick={() => onExpiryChange(date)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${selectedExpiry === date
                                        ? "text-white"
                                        : "hover:bg-white/[0.04]"
                                    }`}
                                style={{
                                    background:
                                        selectedExpiry === date
                                            ? "rgba(108, 92, 231, 0.2)"
                                            : "transparent",
                                    border:
                                        selectedExpiry === date
                                            ? "1px solid rgba(108, 92, 231, 0.3)"
                                            : "1px solid transparent",
                                    color:
                                        selectedExpiry === date ? "#a29bfe" : "var(--muted-foreground)",
                                }}
                            >
                                {formatDate(date)}
                            </button>
                        ))
                    ) : (
                        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            {loading ? "Loading expiry dates..." : "No expiry dates available"}
                        </span>
                    )}
                </div>
            </div>

            {/* Analytics row */}
            <div className="px-6 py-2.5 flex items-center gap-6 overflow-x-auto">
                {/* Spot price */}
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                >
                    <TrendingUp size={13} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        Spot
                    </span>
                    <span className="text-xs font-bold text-white">
                        {loading ? "—" : `₹${formatINR(underlyingLTP)}`}
                    </span>
                </motion.div>

                <div className="w-px h-5" style={{ background: "var(--border)" }} />

                {/* PCR */}
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex items-center gap-2"
                >
                    <Gauge size={13} style={{ color: pcrColor }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        PCR
                    </span>
                    <span className="text-xs font-bold" style={{ color: pcrColor }}>
                        {loading ? "—" : pcr.toFixed(4)}
                    </span>
                    {!loading && (
                        <Badge
                            className="text-[8px] px-1.5 py-0 font-bold border-none"
                            style={{
                                background:
                                    pcr > 1.2
                                        ? "rgba(0, 230, 118, 0.12)"
                                        : pcr < 0.8
                                            ? "rgba(255, 82, 82, 0.12)"
                                            : "rgba(255, 179, 0, 0.12)",
                                color: pcrColor,
                            }}
                        >
                            {pcrSentiment}
                        </Badge>
                    )}
                </motion.div>

                <div className="w-px h-5" style={{ background: "var(--border)" }} />

                {/* Max Pain */}
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2"
                >
                    <Target size={13} style={{ color: "#FFB300" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        Max Pain
                    </span>
                    <span className="text-xs font-bold text-[#FFB300]">
                        {loading ? "—" : `₹${maxPain.toLocaleString("en-IN")}`}
                    </span>
                    {!loading && underlyingLTP > 0 && (
                        <span
                            className="text-[9px] font-medium"
                            style={{
                                color: maxPainDistance >= 0 ? "var(--call-green)" : "var(--put-red)",
                            }}
                        >
                            ({maxPainDistance >= 0 ? "+" : ""}
                            {maxPainDistance.toFixed(2)}%)
                        </span>
                    )}
                </motion.div>

                <div className="w-px h-5" style={{ background: "var(--border)" }} />

                {/* ATM Strike */}
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2"
                >
                    <Activity size={13} style={{ color: "#6C5CE7" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        ATM
                    </span>
                    <span className="text-xs font-bold text-[#a29bfe]">
                        {loading ? "—" : atmStrike.toLocaleString("en-IN")}
                    </span>
                </motion.div>

                <div className="w-px h-5" style={{ background: "var(--border)" }} />

                {/* Total Strikes */}
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                >
                    <BarChart3 size={13} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        Strikes
                    </span>
                    <span className="text-xs font-bold text-white">
                        {loading ? "—" : totalStrikes}
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
