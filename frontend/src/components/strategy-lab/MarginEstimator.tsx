"use client";

import { motion } from "framer-motion";
import { Wallet, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MarginEstimate } from "@/lib/types";

interface MarginEstimatorProps {
    estimate: MarginEstimate;
}

function formatINR(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function MarginEstimator({ estimate }: MarginEstimatorProps) {
    const [expanded, setExpanded] = useState(false);

    const chargesBreakdown = [
        { label: "Brokerage", value: estimate.brokerage },
        { label: "STT", value: estimate.stt },
        { label: "Transaction Charges", value: estimate.transactionCharges },
        { label: "GST", value: estimate.gst },
        { label: "SEBI Charges", value: estimate.sebiCharges },
        { label: "Stamp Duty", value: estimate.stampDuty },
    ];

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            {/* Header */}
            <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Wallet size={13} className="text-[#F59E0B]" />
                    <span className="text-xs font-bold text-white">Margin & Charges</span>
                </div>

                {/* Main margin cards */}
                <div className="grid grid-cols-3 gap-3">
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border p-3.5"
                        style={{
                            background: "rgba(245, 158, 11, 0.06)",
                            borderColor: "rgba(245, 158, 11, 0.12)",
                        }}
                    >
                        <div className="text-[9px] font-medium text-white/40 mb-1">SPAN Margin</div>
                        <div className="text-sm font-bold text-[#F59E0B]">{formatINR(estimate.spanMargin)}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-xl border p-3.5"
                        style={{
                            background: "rgba(139, 92, 246, 0.06)",
                            borderColor: "rgba(139, 92, 246, 0.12)",
                        }}
                    >
                        <div className="text-[9px] font-medium text-white/40 mb-1">Exposure</div>
                        <div className="text-sm font-bold text-[#A78BFA]">{formatINR(estimate.exposureMargin)}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-xl border p-3.5"
                        style={{
                            background: "rgba(16, 185, 129, 0.06)",
                            borderColor: "rgba(16, 185, 129, 0.12)",
                        }}
                    >
                        <div className="text-[9px] font-medium text-white/40 mb-1">Total Required</div>
                        <div className="text-sm font-bold text-[#10B981]">{formatINR(estimate.totalMargin)}</div>
                    </motion.div>
                </div>
            </div>

            {/* Charges breakdown toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-3 border-t transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
                <div className="flex items-center gap-1.5">
                    <Receipt size={11} className="text-white/40" />
                    <span className="text-[10px] font-medium text-white/50">Charges Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/70">{formatINR(estimate.totalCharges)}</span>
                    {expanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
                </div>
            </button>

            {/* Expanded charges */}
            {expanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-4 space-y-2"
                >
                    {chargesBreakdown.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1">
                            <span className="text-[10px] text-white/40">{item.label}</span>
                            <span className="text-[10px] font-semibold text-white/60">
                                ₹{item.value.toFixed(2)}
                            </span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <span className="text-[10px] font-bold text-white/60">Total Charges</span>
                        <span className="text-[10px] font-bold text-[#F59E0B]">{formatINR(estimate.totalCharges)}</span>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
