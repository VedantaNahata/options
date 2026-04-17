"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

interface WhatIfSlidersProps {
    underlyingLTP: number;
    spotValue: number;
    onSpotChange: (value: number) => void;
    ivShift: number;
    onIVShiftChange: (value: number) => void;
    daysToExpiry: number;
    maxDTE: number;
    onDTEChange: (value: number) => void;
    onReset: () => void;
}

function formatINR(n: number): string {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function WhatIfSliders({
    underlyingLTP,
    spotValue,
    onSpotChange,
    ivShift,
    onIVShiftChange,
    daysToExpiry,
    maxDTE,
    onDTEChange,
    onReset,
}: WhatIfSlidersProps) {
    const spotMin = Math.round(underlyingLTP * 0.8);
    const spotMax = Math.round(underlyingLTP * 1.2);
    const spotPctChange = ((spotValue - underlyingLTP) / underlyingLTP * 100);

    const handleSpotInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSpotChange(Number(e.target.value));
    }, [onSpotChange]);

    const handleIVInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onIVShiftChange(Number(e.target.value));
    }, [onIVShiftChange]);

    const handleDTEInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onDTEChange(Number(e.target.value));
    }, [onDTEChange]);

    const isModified = spotValue !== underlyingLTP || ivShift !== 0 || daysToExpiry !== maxDTE;

    return (
        <div className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={13} className="text-[#A78BFA]" />
                    <span className="text-xs font-bold text-white">What-If Scenario</span>
                    {isModified && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full animate-pulse"
                            style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                            Modified
                        </span>
                    )}
                </div>
                {isModified && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onReset}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            color: "#EF4444",
                            border: "1px solid rgba(239,68,68,0.15)",
                        }}
                    >
                        <RotateCcw size={10} /> Reset
                    </motion.button>
                )}
            </div>

            <div className="space-y-5">
                {/* Spot Price Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-white/50">Spot Price</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">₹{formatINR(spotValue)}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{
                                    background: spotPctChange >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                    color: spotPctChange >= 0 ? "#10B981" : "#EF4444",
                                }}>
                                {spotPctChange >= 0 ? "+" : ""}{spotPctChange.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={spotMin}
                            max={spotMax}
                            value={spotValue}
                            onChange={handleSpotInput}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-spot"
                            style={{
                                background: `linear-gradient(to right, #EF4444 0%, #F59E0B ${((spotValue - spotMin) / (spotMax - spotMin)) * 100}%, rgba(255,255,255,0.06) ${((spotValue - spotMin) / (spotMax - spotMin)) * 100}%, rgba(255,255,255,0.06) 100%)`,
                            }}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-white/20">₹{formatINR(spotMin)} (-20%)</span>
                            <span className="text-[8px] text-white/20">₹{formatINR(spotMax)} (+20%)</span>
                        </div>
                    </div>
                </div>

                {/* IV Shift Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-white/50">IV Shift</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: "#06B6D4" }}>
                                {ivShift >= 0 ? "+" : ""}{ivShift.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={-50}
                            max={50}
                            value={ivShift}
                            onChange={handleIVInput}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-iv"
                            style={{
                                background: `linear-gradient(to right, rgba(6,182,212,0.3) 0%, #06B6D4 ${((ivShift + 50) / 100) * 100}%, rgba(255,255,255,0.06) ${((ivShift + 50) / 100) * 100}%, rgba(255,255,255,0.06) 100%)`,
                            }}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-white/20">-50% (IV crush)</span>
                            <span className="text-[8px] text-white/20">+50% (IV spike)</span>
                        </div>
                    </div>
                </div>

                {/* DTE Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-white/50">Days to Expiry</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>
                                {daysToExpiry}d
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={0}
                            max={maxDTE}
                            value={daysToExpiry}
                            onChange={handleDTEInput}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-dte"
                            style={{
                                background: `linear-gradient(to right, #F59E0B 0%, rgba(245,158,11,0.3) ${(daysToExpiry / Math.max(maxDTE, 1)) * 100}%, rgba(255,255,255,0.06) ${(daysToExpiry / Math.max(maxDTE, 1)) * 100}%, rgba(255,255,255,0.06) 100%)`,
                            }}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-white/20">0 (Expiry)</span>
                            <span className="text-[8px] text-white/20">{maxDTE}d</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
