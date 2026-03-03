"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    TrendingUp,
    TrendingDown,
    Minus,
    X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Instrument, IndexPrice } from "@/lib/types";

// ─── Local instrument list for instant search (no API call needed) ───
const ALL_INSTRUMENTS: Instrument[] = [
    // ── Indices ──
    { symbol: "NIFTY", name: "Nifty 50", exchange: "NSE", type: "INDEX" },
    { symbol: "BANKNIFTY", name: "Bank Nifty", exchange: "NSE", type: "INDEX" },
    { symbol: "FINNIFTY", name: "Fin Nifty", exchange: "NSE", type: "INDEX" },
    { symbol: "MIDCPNIFTY", name: "Midcap Nifty", exchange: "NSE", type: "INDEX" },
    { symbol: "SENSEX", name: "Sensex", exchange: "BSE", type: "INDEX" },
    { symbol: "BANKEX", name: "Bankex", exchange: "BSE", type: "INDEX" },
    // ── F&O Stocks ──
    { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", type: "STOCK" },
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", type: "STOCK" },
    { symbol: "INFY", name: "Infosys", exchange: "NSE", type: "STOCK" },
    { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", type: "STOCK" },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE", type: "STOCK" },
    { symbol: "ITC", name: "ITC Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "LT", name: "Larsen & Toubro", exchange: "NSE", type: "STOCK" },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever", exchange: "NSE", type: "STOCK" },
    { symbol: "BAJFINANCE", name: "Bajaj Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "MARUTI", name: "Maruti Suzuki", exchange: "NSE", type: "STOCK" },
    { symbol: "TATAMOTORS", name: "Tata Motors", exchange: "NSE", type: "STOCK" },
    { symbol: "TATASTEEL", name: "Tata Steel", exchange: "NSE", type: "STOCK" },
    { symbol: "AXISBANK", name: "Axis Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "WIPRO", name: "Wipro", exchange: "NSE", type: "STOCK" },
    { symbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE", type: "STOCK" },
    { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", exchange: "NSE", type: "STOCK" },
    { symbol: "HCLTECH", name: "HCL Technologies", exchange: "NSE", type: "STOCK" },
    { symbol: "POWERGRID", name: "Power Grid Corporation", exchange: "NSE", type: "STOCK" },
    { symbol: "NTPC", name: "NTPC Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "ONGC", name: "Oil & Natural Gas Corp", exchange: "NSE", type: "STOCK" },
    { symbol: "COALINDIA", name: "Coal India", exchange: "NSE", type: "STOCK" },
    { symbol: "JSWSTEEL", name: "JSW Steel", exchange: "NSE", type: "STOCK" },
    { symbol: "M&M", name: "Mahindra & Mahindra", exchange: "NSE", type: "STOCK" },
    { symbol: "TECHM", name: "Tech Mahindra", exchange: "NSE", type: "STOCK" },
    { symbol: "ASIANPAINT", name: "Asian Paints", exchange: "NSE", type: "STOCK" },
    { symbol: "BAJAJFINSV", name: "Bajaj Finserv", exchange: "NSE", type: "STOCK" },
    { symbol: "TITAN", name: "Titan Company", exchange: "NSE", type: "STOCK" },
    { symbol: "NESTLEIND", name: "Nestle India", exchange: "NSE", type: "STOCK" },
    { symbol: "ULTRACEMCO", name: "UltraTech Cement", exchange: "NSE", type: "STOCK" },
    { symbol: "DRREDDY", name: "Dr. Reddy's Labs", exchange: "NSE", type: "STOCK" },
    { symbol: "CIPLA", name: "Cipla", exchange: "NSE", type: "STOCK" },
    { symbol: "DIVISLAB", name: "Divi's Laboratories", exchange: "NSE", type: "STOCK" },
    { symbol: "APOLLOHOSP", name: "Apollo Hospitals", exchange: "NSE", type: "STOCK" },
    { symbol: "EICHERMOT", name: "Eicher Motors", exchange: "NSE", type: "STOCK" },
    { symbol: "HEROMOTOCO", name: "Hero MotoCorp", exchange: "NSE", type: "STOCK" },
    { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", exchange: "NSE", type: "STOCK" },
    { symbol: "TRENT", name: "Trent Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "SHRIRAMFIN", name: "Shriram Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "BEL", name: "Bharat Electronics", exchange: "NSE", type: "STOCK" },
    { symbol: "HAL", name: "Hindustan Aeronautics", exchange: "NSE", type: "STOCK" },
    { symbol: "TATACONSUM", name: "Tata Consumer Products", exchange: "NSE", type: "STOCK" },
    { symbol: "GRASIM", name: "Grasim Industries", exchange: "NSE", type: "STOCK" },
    { symbol: "INDUSINDBK", name: "IndusInd Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "ADANIPORTS", name: "Adani Ports", exchange: "NSE", type: "STOCK" },
    { symbol: "HINDALCO", name: "Hindalco Industries", exchange: "NSE", type: "STOCK" },
    { symbol: "BPCL", name: "Bharat Petroleum", exchange: "NSE", type: "STOCK" },
    { symbol: "IOC", name: "Indian Oil Corporation", exchange: "NSE", type: "STOCK" },
    { symbol: "VEDL", name: "Vedanta Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "TATAPOWER", name: "Tata Power", exchange: "NSE", type: "STOCK" },
    { symbol: "PNB", name: "Punjab National Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "BANKBARODA", name: "Bank of Baroda", exchange: "NSE", type: "STOCK" },
    { symbol: "CANBK", name: "Canara Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "FEDERALBNK", name: "Federal Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "IDFCFIRSTB", name: "IDFC First Bank", exchange: "NSE", type: "STOCK" },
    { symbol: "DLF", name: "DLF Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "GODREJCP", name: "Godrej Consumer Products", exchange: "NSE", type: "STOCK" },
    { symbol: "DABUR", name: "Dabur India", exchange: "NSE", type: "STOCK" },
    { symbol: "PIDILITIND", name: "Pidilite Industries", exchange: "NSE", type: "STOCK" },
    { symbol: "HAVELLS", name: "Havells India", exchange: "NSE", type: "STOCK" },
    { symbol: "SIEMENS", name: "Siemens", exchange: "NSE", type: "STOCK" },
    { symbol: "ABB", name: "ABB India", exchange: "NSE", type: "STOCK" },
    { symbol: "AMBUJACEM", name: "Ambuja Cements", exchange: "NSE", type: "STOCK" },
    { symbol: "SHREECEM", name: "Shree Cement", exchange: "NSE", type: "STOCK" },
    { symbol: "ACC", name: "ACC Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "INDUSTOWER", name: "Indus Towers", exchange: "NSE", type: "STOCK" },
    { symbol: "ZOMATO", name: "Zomato", exchange: "NSE", type: "STOCK" },
    { symbol: "PAYTM", name: "One97 Communications", exchange: "NSE", type: "STOCK" },
    { symbol: "NYKAA", name: "FSN E-Commerce (Nykaa)", exchange: "NSE", type: "STOCK" },
    { symbol: "DMART", name: "Avenue Supermarts (DMart)", exchange: "NSE", type: "STOCK" },
    { symbol: "LTIM", name: "LTIMindtree", exchange: "NSE", type: "STOCK" },
    { symbol: "PERSISTENT", name: "Persistent Systems", exchange: "NSE", type: "STOCK" },
    { symbol: "COFORGE", name: "Coforge", exchange: "NSE", type: "STOCK" },
    { symbol: "MPHASIS", name: "Mphasis", exchange: "NSE", type: "STOCK" },
    { symbol: "IDEA", name: "Vodafone Idea", exchange: "NSE", type: "STOCK" },
    { symbol: "SAIL", name: "Steel Authority of India", exchange: "NSE", type: "STOCK" },
    { symbol: "NMDC", name: "NMDC Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "BHEL", name: "Bharat Heavy Electricals", exchange: "NSE", type: "STOCK" },
    { symbol: "RECLTD", name: "REC Limited", exchange: "NSE", type: "STOCK" },
    { symbol: "PFC", name: "Power Finance Corporation", exchange: "NSE", type: "STOCK" },
    { symbol: "IRFC", name: "Indian Railway Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "IRCTC", name: "IRCTC", exchange: "NSE", type: "STOCK" },
    { symbol: "LTF", name: "L&T Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "CHOLAFIN", name: "Cholamandalam Inv & Fin", exchange: "NSE", type: "STOCK" },
    { symbol: "MUTHOOTFIN", name: "Muthoot Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "MANAPPURAM", name: "Manappuram Finance", exchange: "NSE", type: "STOCK" },
    { symbol: "VOLTAS", name: "Voltas", exchange: "NSE", type: "STOCK" },
    { symbol: "DIXON", name: "Dixon Technologies", exchange: "NSE", type: "STOCK" },
    { symbol: "POLYCAB", name: "Polycab India", exchange: "NSE", type: "STOCK" },
    { symbol: "PAGEIND", name: "Page Industries", exchange: "NSE", type: "STOCK" },
    { symbol: "MFSL", name: "Max Financial Services", exchange: "NSE", type: "STOCK" },
    { symbol: "SBILIFE", name: "SBI Life Insurance", exchange: "NSE", type: "STOCK" },
    { symbol: "HDFCLIFE", name: "HDFC Life Insurance", exchange: "NSE", type: "STOCK" },
    { symbol: "ICICIPRULI", name: "ICICI Prudential Life", exchange: "NSE", type: "STOCK" },
];

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

    // Instant client-side search — no API call, no debounce needed
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length < 1) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }
        const q = query.toUpperCase();
        const results = ALL_INSTRUMENTS.filter(
            (inst) =>
                inst.symbol.toUpperCase().includes(q) ||
                inst.name.toUpperCase().includes(q)
        ).slice(0, 15);
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
                            <span className="text-white font-semibold">
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
            </div>
        </div>
    );
}
