"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    TrendingUp,
    TrendingDown,
    Minus,
    X,
    FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getInstruments } from "@/lib/api";
import type { Instrument, IndexPrice } from "@/lib/types";

interface TopBarProps {
    indices: IndexPrice[];
    indicesLoading: boolean;
    onSelectInstrument: (instrument: Instrument) => void;
    currentInstrument: string;
}

export function TopBar({
    indices,
    indicesLoading,
    onSelectInstrument,
    currentInstrument,
}: TopBarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Instrument[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);

    // Fetch full instrument list from backend on mount
    useEffect(() => {
        let cancelled = false;
        getInstruments()
            .then((data) => {
                if (!cancelled && data.instruments) {
                    setAllInstruments(data.instruments);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch instruments:", err);
            });
        return () => { cancelled = true; };
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Client-side search from backend-loaded instrument list
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length < 1) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }
        const q = query.toUpperCase();
        const results = allInstruments.filter(
            (inst) =>
                inst.symbol.toUpperCase().includes(q) ||
                inst.name.toUpperCase().includes(q)
        ).slice(0, 20);
        setSearchResults(results);
        setIsSearchOpen(true);
    };

    const handleSelect = (inst: Instrument) => {
        onSelectInstrument(inst);
        setSearchQuery("");
        setIsSearchOpen(false);
    };

    return (
        <div className="glass border-b" style={{ borderColor: "var(--border)" }}>
            {/* Index ticker */}
            <div
                className="h-9 flex items-center gap-6 px-6 overflow-x-auto text-xs border-b"
                style={{ borderColor: "var(--border)", background: "rgba(10, 11, 15, 0.6)" }}
            >
                {indicesLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 animate-shimmer rounded px-3 py-1"
                        >
                            <div className="w-16 h-3 rounded bg-white/5" />
                            <div className="w-12 h-3 rounded bg-white/5" />
                        </div>
                    ))
                    : indices.map((idx) => (
                        <motion.div
                            key={idx.symbol}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 whitespace-nowrap"
                        >
                            <span style={{ color: "var(--muted-foreground)" }} className="font-medium">
                                {idx.symbol}
                            </span>
                            <span
                                className="font-semibold"
                                style={{
                                    color:
                                        idx.change_perc !== undefined && idx.change_perc !== null
                                            ? idx.change_perc > 0
                                                ? "var(--call-green)"
                                                : idx.change_perc < 0
                                                    ? "var(--put-red)"
                                                    : "white"
                                            : "white",
                                }}
                            >
                                {idx.ltp?.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                }) || "—"}
                            </span>
                            {idx.change_perc !== undefined && idx.change_perc !== null && (
                                <span
                                    className="flex items-center gap-0.5 font-medium"
                                    style={{
                                        color:
                                            idx.change_perc > 0
                                                ? "var(--call-green)"
                                                : idx.change_perc < 0
                                                    ? "var(--put-red)"
                                                    : "var(--muted-foreground)",
                                    }}
                                >
                                    {idx.change_perc > 0 ? (
                                        <TrendingUp size={10} />
                                    ) : idx.change_perc < 0 ? (
                                        <TrendingDown size={10} />
                                    ) : (
                                        <Minus size={10} />
                                    )}
                                    {idx.change_perc > 0 ? "+" : ""}
                                    {idx.change_perc?.toFixed(2)}%
                                </span>
                            )}
                        </motion.div>
                    ))}
            </div>

            {/* Search bar & controls */}
            <div className="h-12 flex items-center gap-4 px-6">
                {/* Current instrument badge */}
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs font-bold border-[#6C5CE7]/30 text-[#6C5CE7] bg-[#6C5CE7]/10"
                    >
                        {currentInstrument || "Select Instrument"}
                    </Badge>
                </div>

                {/* Search */}
                <div ref={searchRef} className="relative flex-1 max-w-md">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--muted-foreground)" }}
                        />
                        <Input
                            type="text"
                            placeholder="Search instrument... (e.g., NIFTY, RELIANCE)"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                            className="pl-9 pr-8 h-8 text-xs bg-white/[0.04] border-white/[0.08] focus:border-[#6C5CE7]/50 rounded-lg"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSearchResults([]);
                                    setIsSearchOpen(false);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                            >
                                <X size={12} style={{ color: "var(--muted-foreground)" }} />
                            </button>
                        )}
                    </div>

                    {/* Search dropdown */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-1.5 z-50 glass rounded-xl overflow-hidden shadow-2xl"
                                style={{ maxHeight: "320px" }}
                            >
                                {searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
                                        No instruments found
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
                                        {searchResults.map((inst, i) => (
                                            <motion.button
                                                key={`${inst.exchange}_${inst.symbol}`}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => handleSelect(inst)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors duration-150"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-white">
                                                        {inst.symbol}
                                                    </span>
                                                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                                        {inst.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0"
                                                        style={{
                                                            borderColor:
                                                                inst.type === "INDEX"
                                                                    ? "rgba(108, 92, 231, 0.3)"
                                                                    : "rgba(0, 210, 211, 0.3)",
                                                            color:
                                                                inst.type === "INDEX" ? "#a29bfe" : "#00D2D3",
                                                        }}
                                                    >
                                                        {inst.type}
                                                    </Badge>
                                                    <span
                                                        className="text-[10px]"
                                                        style={{ color: "var(--muted-foreground)" }}
                                                    >
                                                        {inst.exchange}
                                                    </span>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Strategy Lab link */}
                <Link
                    href="/strategy-lab"
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
                    style={{
                        background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.12))",
                        color: "#A78BFA",
                        border: "1px solid rgba(139,92,246,0.2)",
                    }}
                >
                    <FlaskConical size={13} />
                    Strategy Lab
                </Link>
            </div>
        </div>
    );
}
