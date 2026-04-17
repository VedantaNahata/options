"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, Activity, Crosshair } from "lucide-react";
import { STRATEGY_TEMPLATES } from "@/lib/payoff";

interface StrategyTemplatesProps {
    onSelect: (templateId: string) => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    neutral: { label: "Neutral", icon: Crosshair, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    bullish: { label: "Bullish", icon: TrendingUp, color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    bearish: { label: "Bearish", icon: TrendingDown, color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
    volatile: { label: "Volatile", icon: Activity, color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
};

export function StrategyTemplates({ onSelect }: StrategyTemplatesProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const filtered = activeCategory
        ? STRATEGY_TEMPLATES.filter((t) => t.category === activeCategory)
        : STRATEGY_TEMPLATES;

    return (
        <div className="rounded-2xl border border-white/[0.06] p-5"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-[#F59E0B]" />
                    <span className="text-xs font-bold text-white">Strategy Templates</span>
                </div>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveCategory(null)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all"
                    style={{
                        background: activeCategory === null ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        color: activeCategory === null ? "#A78BFA" : "rgba(255,255,255,0.4)",
                        border: `1px solid ${activeCategory === null ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                    }}
                >
                    All
                </button>
                {Object.entries(categoryConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all"
                            style={{
                                background: activeCategory === key ? cfg.bg : "rgba(255,255,255,0.03)",
                                color: activeCategory === key ? cfg.color : "rgba(255,255,255,0.4)",
                                border: `1px solid ${activeCategory === key ? `${cfg.color}30` : "rgba(255,255,255,0.06)"}`,
                            }}
                        >
                            <Icon size={10} />
                            {cfg.label}
                        </button>
                    );
                })}
            </div>

            {/* Template cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <AnimatePresence mode="popLayout">
                    {filtered.map((template, i) => {
                        const cat = categoryConfig[template.category];
                        return (
                            <motion.button
                                key={template.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.03, duration: 0.2 }}
                                onClick={() => onSelect(template.id)}
                                className="group relative text-left rounded-xl border p-3.5 transition-all hover:scale-[1.02]"
                                style={{
                                    borderColor: "rgba(255,255,255,0.06)",
                                    background: "rgba(255,255,255,0.02)",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}40`;
                                    (e.currentTarget as HTMLElement).style.background = cat.bg;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                                }}
                            >
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ background: cat.bg, color: cat.color }}
                                    >
                                        {cat.label}
                                    </span>
                                    <span className="text-[9px] text-white/25">{template.legs.length}L</span>
                                </div>
                                <div className="text-[11px] font-bold text-white mb-1">{template.name}</div>
                                <p className="text-[9px] text-white/35 leading-relaxed">{template.description}</p>

                                {/* Leg indicators */}
                                <div className="flex items-center gap-1 mt-2.5">
                                    {template.legs.map((leg, j) => (
                                        <span
                                            key={j}
                                            className="text-[8px] font-mono px-1 py-0.5 rounded"
                                            style={{
                                                background: leg.transaction_type === "BUY" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                                color: leg.transaction_type === "BUY" ? "#10B981" : "#EF4444",
                                            }}
                                        >
                                            {leg.transaction_type[0]}{leg.option_type}
                                        </span>
                                    ))}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
