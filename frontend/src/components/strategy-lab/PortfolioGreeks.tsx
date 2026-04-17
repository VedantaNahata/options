"use client";

import { motion } from "framer-motion";

interface PortfolioGreeksProps {
    netDelta: number;
    netGamma: number;
    netTheta: number;
    netVega: number;
}

function greekColorIntensity(value: number, max: number = 1): string {
    const norm = Math.min(Math.abs(value) / max, 1);
    if (value > 0) return `rgba(16, 185, 129, ${0.15 + norm * 0.4})`;
    if (value < 0) return `rgba(239, 68, 68, ${0.15 + norm * 0.4})`;
    return "rgba(255,255,255,0.1)";
}

const greekDefs = [
    {
        key: "delta",
        label: "Delta",
        symbol: "Δ",
        description: "Directional exposure",
        gradient: ["#10B981", "#059669"],
    },
    {
        key: "gamma",
        label: "Gamma",
        symbol: "Γ",
        description: "Rate of delta change",
        gradient: ["#8B5CF6", "#7C3AED"],
    },
    {
        key: "theta",
        label: "Theta",
        symbol: "Θ",
        description: "Time decay per day",
        gradient: ["#F59E0B", "#D97706"],
    },
    {
        key: "vega",
        label: "Vega",
        symbol: "ν",
        description: "IV sensitivity",
        gradient: ["#06B6D4", "#0891B2"],
    },
];

export function PortfolioGreeks({ netDelta, netGamma, netTheta, netVega }: PortfolioGreeksProps) {
    const values = [netDelta, netGamma, netTheta, netVega];

    return (
        <div className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-white">Portfolio Greeks</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA" }}>
                    Aggregate
                </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {greekDefs.map((g, i) => {
                    const val = values[i];
                    const isPositive = val > 0;
                    return (
                        <motion.div
                            key={g.key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.06, duration: 0.3 }}
                            className="relative rounded-xl border p-4 overflow-hidden"
                            style={{
                                borderColor: `rgba(255,255,255,0.06)`,
                                background: "rgba(255,255,255,0.02)",
                            }}
                        >
                            {/* Background glow */}
                            <div
                                className="absolute inset-0 opacity-30"
                                style={{
                                    background: `radial-gradient(circle at 80% 20%, ${greekColorIntensity(val)}, transparent 70%)`,
                                }}
                            />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="text-lg font-bold"
                                            style={{
                                                background: `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})`,
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                            }}
                                        >
                                            {g.symbol}
                                        </span>
                                        <span className="text-[10px] font-medium text-white/50">{g.label}</span>
                                    </div>
                                </div>

                                <div
                                    className="text-lg font-bold tracking-tight"
                                    style={{ color: isPositive ? "#10B981" : val < 0 ? "#EF4444" : "rgba(255,255,255,0.6)" }}
                                >
                                    {isPositive ? "+" : ""}{val.toFixed(4)}
                                </div>

                                {/* Visual gauge bar */}
                                <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(Math.abs(val) * 100, 100)}%` }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        style={{
                                            background: `linear-gradient(90deg, ${g.gradient[0]}, ${g.gradient[1]})`,
                                        }}
                                    />
                                </div>

                                <p className="text-[9px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    {g.description}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
