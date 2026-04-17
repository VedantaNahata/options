"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FolderOpen,
    Search,
    Trash2,
    Copy,
    ExternalLink,
    Clock,
    ChevronRight,
    Save,
    Check,
    X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getUserStrategies, deleteStrategy, duplicateStrategy, saveStrategy } from "@/lib/strategies";
import type { SavedStrategy } from "@/lib/strategies";
import type { StrategyLeg } from "@/lib/types";
import { Input } from "@/components/ui/input";

interface SavedStrategiesProps {
    onLoadStrategy: (strategy: SavedStrategy) => void;
    currentLegs: StrategyLeg[];
    instrumentName: string;
    exchange: string;
    expiryDate: string;
    underlyingLTP: number;
    lotSize: number;
}

function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function SavedStrategies({
    onLoadStrategy,
    currentLegs,
    instrumentName,
    exchange,
    expiryDate,
    underlyingLTP,
    lotSize,
}: SavedStrategiesProps) {
    const { user } = useAuth();
    const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadStrategies = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await getUserStrategies(user.id);
        setStrategies(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        loadStrategies();
    }, [loadStrategies]);

    const handleSave = async () => {
        if (!user || currentLegs.length === 0 || !saveName.trim()) return;
        setSaving(true);
        const { error } = await saveStrategy(
            user.id,
            saveName.trim(),
            instrumentName,
            exchange,
            expiryDate,
            underlyingLTP,
            lotSize,
            currentLegs
        );
        setSaving(false);
        if (!error) {
            setSaved(true);
            setShowSaveInput(false);
            setSaveName("");
            setTimeout(() => setSaved(false), 2000);
            loadStrategies();
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await deleteStrategy(id);
        setDeletingId(null);
        loadStrategies();
    };

    const handleDuplicate = async (id: string) => {
        if (!user) return;
        await duplicateStrategy(id, user.id);
        loadStrategies();
    };

    const filtered = strategies.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.instrument.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2">
                    <FolderOpen size={13} className="text-[#06B6D4]" />
                    <span className="text-xs font-bold text-white">Saved Strategies</span>
                    {strategies.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(6,182,212,0.1)", color: "#06B6D4" }}>
                            {strategies.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 text-[10px] font-medium text-[#10B981]"
                        >
                            <Check size={10} /> Saved!
                        </motion.span>
                    )}
                    {showSaveInput ? (
                        <div className="flex items-center gap-1.5">
                            <Input
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                placeholder="Strategy name..."
                                className="h-7 text-[10px] w-36 bg-white/[0.04] border-white/[0.1]"
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                autoFocus
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving || !saveName.trim()}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                                style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
                            >
                                <Check size={11} />
                            </button>
                            <button
                                onClick={() => { setShowSaveInput(false); setSaveName(""); }}
                                className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/60"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSaveInput(true)}
                            disabled={currentLegs.length === 0}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30"
                            style={{
                                background: "rgba(16,185,129,0.12)",
                                color: "#10B981",
                                border: "1px solid rgba(16,185,129,0.2)",
                            }}
                        >
                            <Save size={10} /> Save Current
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            {strategies.length > 3 && (
                <div className="px-5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search strategies..."
                            className="h-7 text-[10px] pl-7 bg-white/[0.03] border-white/[0.06]"
                        />
                    </div>
                </div>
            )}

            {/* Strategy list */}
            <div className="max-h-[280px] overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FolderOpen size={20} className="text-white/15 mb-2" />
                        <p className="text-[10px] text-white/30">
                            {search ? "No matching strategies" : "No saved strategies yet"}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filtered.map((strategy) => (
                            <motion.div
                                key={strategy.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="group px-5 py-3 hover:bg-white/[0.015] transition-colors cursor-pointer"
                                onClick={() => onLoadStrategy(strategy)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold text-white truncate max-w-[200px]">
                                                {strategy.name}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded"
                                                style={{ background: "rgba(139,92,246,0.08)", color: "#A78BFA" }}>
                                                {(strategy.legs as StrategyLeg[]).length}L
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] text-white/30">{strategy.instrument}</span>
                                            <span className="text-[9px] text-white/20">{strategy.expiry_date}</span>
                                            <span className="flex items-center gap-0.5 text-[9px] text-white/20">
                                                <Clock size={8} />
                                                {timeAgo(strategy.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(strategy.id); }}
                                            className="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-colors"
                                            title="Duplicate"
                                        >
                                            <Copy size={10} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(strategy.id); }}
                                            disabled={deletingId === strategy.id}
                                            className="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                            title="Delete"
                                        >
                                            {deletingId === strategy.id ? (
                                                <div className="w-3 h-3 rounded-full border border-white/20 border-t-white/50 animate-spin" />
                                            ) : (
                                                <Trash2 size={10} />
                                            )}
                                        </button>
                                        <ChevronRight size={12} className="text-white/15 ml-1" />
                                    </div>
                                </div>

                                {/* Leg preview */}
                                <div className="flex items-center gap-1 mt-2">
                                    {(strategy.legs as StrategyLeg[]).slice(0, 4).map((leg, j) => (
                                        <span
                                            key={j}
                                            className="text-[8px] font-mono px-1 py-0.5 rounded"
                                            style={{
                                                background: leg.transaction_type === "BUY" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                                                color: leg.transaction_type === "BUY" ? "#10B981" : "#EF4444",
                                            }}
                                        >
                                            {leg.transaction_type[0]} {leg.strike_price}{leg.option_type}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
