"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, Shield } from "lucide-react";
import type { StrategyAnalysis } from "@/lib/types";

interface StrategyMetricsProps {
    analysis: StrategyAnalysis;
}

function formatINR(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${(n / 100000).toFixed(2)}L`;
    return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const metrics = [
    {
        key: "maxProfit",
        label: "Max Profit",
        icon: TrendingUp,
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.08)",
        border: "rgba(16, 185, 129, 0.15)",
        format: (a: StrategyAnalysis) => `₹${formatINR(a.maxProfit)}`,
        sub: (a: StrategyAnalysis) => `at ₹${formatINR(a.maxProfitSpot)}`,
    },
    {
        key: "maxLoss",
        label: "Max Loss",
        icon: TrendingDown,
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.15)",
        format: (a: StrategyAnalysis) => `₹${formatINR(Math.abs(a.maxLoss))}`,
        sub: (a: StrategyAnalysis) => `at ₹${formatINR(a.maxLossSpot)}`,
    },
    {
        key: "netPremium",
        label: "Net Premium",
        icon: DollarSign,
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.15)",
        format: (a: StrategyAnalysis) => `${a.netPremium >= 0 ? "+" : ""}₹${formatINR(a.netPremium)}`,
        sub: (a: StrategyAnalysis) => a.netPremium >= 0 ? "Credit received" : "Debit paid",
    },
    {
        key: "riskReward",
        label: "Risk : Reward",
        icon: Shield,
        color: "#8B5CF6",
        bg: "rgba(139, 92, 246, 0.08)",
        border: "rgba(139, 92, 246, 0.15)",
        format: (a: StrategyAnalysis) => `1 : ${a.riskRewardRatio.toFixed(2)}`,
        sub: () => "Ratio",
    },
    {
        key: "upperBE",
        label: "Upper Breakeven",
        icon: Target,
        color: "#06B6D4",
        bg: "rgba(6, 182, 212, 0.08)",
        border: "rgba(6, 182, 212, 0.15)",
        format: (a: StrategyAnalysis) => a.upperBreakeven ? `₹${formatINR(a.upperBreakeven)}` : "N/A",
        sub: () => "Spot level",
    },
    {
        key: "lowerBE",
        label: "Lower Breakeven",
        icon: Target,
        color: "#06B6D4",
        bg: "rgba(6, 182, 212, 0.08)",
        border: "rgba(6, 182, 212, 0.15)",
        format: (a: StrategyAnalysis) => a.lowerBreakeven ? `₹${formatINR(a.lowerBreakeven)}` : "N/A",
        sub: () => "Spot level",
    },
    {
        key: "pop",
        label: "Prob. of Profit",
        icon: Percent,
        color: "#A78BFA",
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.15)",
        format: (a: StrategyAnalysis) => `${a.popEstimate.toFixed(1)}%`,
        sub: () => "Estimated",
    },
];

export function StrategyMetrics({ analysis }: StrategyMetricsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {metrics.map((m, i) => {
                const Icon = m.icon;
                return (
                    <motion.div
                        key={m.key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="rounded-xl border p-3.5 flex flex-col gap-1.5"
                        style={{
                            background: m.bg,
                            borderColor: m.border,
                        }}
                    >
                        <div className="flex items-center gap-1.5">
                            <Icon size={12} style={{ color: m.color }} />
                            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                                {m.label}
                            </span>
                        </div>
                        <div className="text-sm font-bold" style={{ color: m.color }}>
                            {m.format(analysis)}
                        </div>
                        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {m.sub(analysis)}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
