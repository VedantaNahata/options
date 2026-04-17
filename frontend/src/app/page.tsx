"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Activity,
  BarChart3,
  Layers,
  Zap,
  TrendingUp,
  Shield,
  ChevronRight,
  Sparkles,
  Globe,
  LineChart,
  Target,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* ─── Animated Counter ─── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration: 2.5, ease: "easeOut" });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

/* ─── Aurora Background (reduced intensity) ─── */
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main aurora blob — reduced opacity */}
      <motion.div
        className="absolute w-[900px] h-[900px] rounded-full animate-aurora"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.03) 40%, transparent 70%)",
          top: "-15%",
          right: "-15%",
        }}
      />
      {/* Rose accent — reduced */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(244,63,94,0.03) 0%, transparent 70%)",
          bottom: "10%",
          left: "-10%",
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Emerald accent — reduced */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.02) 0%, transparent 70%)",
          top: "60%",
          right: "20%",
        }}
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 20, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ─── Grid Lines ─── */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-bg opacity-20" />
      {/* Horizontal scanline — subtler */}
      <motion.div
        className="absolute left-0 w-full h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.1) 30%, rgba(139,92,246,0.15) 50%, rgba(139,92,246,0.1) 70%, transparent 100%)",
        }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Particle Dots ─── */
function ParticleField() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string }[]
  >([]);

  useEffect(() => {
    const colors = [
      "rgba(139, 92, 246, 0.35)",
      "rgba(167, 139, 250, 0.25)",
      "rgba(99, 102, 241, 0.25)",
      "rgba(244, 63, 94, 0.2)",
      "rgba(245, 158, 11, 0.2)",
    ];
    setParticles(
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 12 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
  accentColor,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
  accentColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative p-7 rounded-2xl glass-card cursor-default transition-all duration-500"
    >
      {/* Hover gradient glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accentColor}08 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
          style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}18` }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        <h3 className="text-[15px] font-medium text-white/95 mb-2.5 tracking-[-0.01em]">{title}</h3>
        <p className="text-[13px] leading-[1.7] text-[#6B6D78]">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  value,
  suffix,
  label,
  index,
}: {
  value: number;
  suffix: string;
  label: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      viewport={{ once: true }}
      className="text-center group"
    >
      <div className="text-3xl font-light text-white/90 mb-1.5 tracking-[-0.03em] transition-all duration-300">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4B4D58]">
        {label}
      </div>
    </motion.div>
  );
}

/* ─── Live Ticker ─── */
function LiveTicker() {
  const tickers = [
    { symbol: "NIFTY 50", price: "22,547.55", change: "+0.42%", up: true },
    { symbol: "BANK NIFTY", price: "48,632.10", change: "-0.26%", up: false },
    { symbol: "FIN NIFTY", price: "21,845.90", change: "+0.31%", up: true },
    { symbol: "SENSEX", price: "74,339.44", change: "+0.42%", up: true },
    { symbol: "INDIA VIX", price: "13.25", change: "-2.15%", up: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      className="w-full max-w-4xl mx-auto mt-14"
    >
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {tickers.map((t, i) => (
          <motion.div
            key={t.symbol}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 + i * 0.1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-subtle"
          >
            <span className="text-[11px] font-medium text-[#6B6D78]">{t.symbol}</span>
            <span className="text-[12px] font-medium text-white/90">{t.price}</span>
            <span
              className="text-[11px] font-medium"
              style={{ color: t.up ? "var(--call-green)" : "var(--put-red)" }}
            >
              {t.change}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── User Avatar with Initials ─── */
function UserAvatar({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const firstName = user?.user_metadata?.first_name || "";
  const lastName = user?.user_metadata?.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setShowPopup(!showPopup)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white transition-all duration-200 hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
          boxShadow: "0 0 12px rgba(139, 92, 246, 0.2)",
        }}
      >
        {initials}
      </button>
      {showPopup && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl overflow-hidden shadow-2xl z-50"
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[12px] font-medium text-white">{firstName} {lastName}</p>
            <p className="text-[11px] text-[#6B6D78] truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { setShowPopup(false); onSignOut(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#6B6D78] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const features = [
    {
      icon: BarChart3,
      title: "Real-Time Option Chains",
      description: "Live option chain data with OI heatmaps, PCR ratios, and Max Pain analysis across all major Indian indices.",
      accentColor: "#8B5CF6",
    },
    {
      icon: Activity,
      title: "Greeks & IV Surface",
      description: "Delta, Gamma, Theta, Vega — all in real-time. Visualize the 3D IV surface to spot mispriced options.",
      accentColor: "#6366F1",
    },
    {
      icon: Layers,
      title: "Strategy Builder",
      description: "Build multi-leg strategies visually. See payoff diagrams, breakevens, and risk metrics before executing.",
      accentColor: "#EC4899",
    },
    {
      icon: Zap,
      title: "Smart Alerts",
      description: "Unusual OI buildup detection, IV crush alerts, and PCR shift notifications delivered in real-time.",
      accentColor: "#F59E0B",
    },
    {
      icon: TrendingUp,
      title: "Market Pulse",
      description: "Live index tracking with expected move ranges, VIX correlation, and institutional flow analysis.",
      accentColor: "#10B981",
    },
    {
      icon: Shield,
      title: "Risk Analytics",
      description: "Portfolio Greeks aggregation, margin requirements, and scenario analysis for complex positions.",
      accentColor: "#06B6D4",
    },
  ];

  const stats = [
    { value: 500, suffix: "+", label: "Strike Prices" },
    { value: 50, suffix: "ms", label: "Data Latency" },
    { value: 6, suffix: "", label: "Index Coverage" },
    { value: 24, suffix: "/7", label: "Analytics" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#07080C" }}>
      <AuroraBackground />
      <GridBackground />
      <ParticleField />

      {/* ─── Navbar ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 glass-nav"
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                boxShadow: "0 0 15px rgba(139, 92, 246, 0.2)",
              }}
            >
              <span className="text-white text-[9px] font-bold tracking-tight">FP</span>
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
              />
            </div>
            <span className="text-white text-base font-medium tracking-[-0.02em]">
              FnoPilot
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-0.5">
            {[
              { label: "Option Chain", href: "/option-chain" },
              { label: "Strategy Lab", href: "/strategy-lab" },
              { label: "Analytics", href: "#" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.href.startsWith("/") ? "_blank" : undefined}
                className="relative px-4 py-2 text-[13px] font-normal transition-all duration-200 rounded-lg group text-[#6B6D78] hover:text-white/90"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {authLoading ? (
              <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
            ) : user ? (
              <UserAvatar user={user} onSignOut={signOut} />
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 rounded-xl text-[13px] font-normal text-[#A78BFA] hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-medium text-white btn-primary"
                >
                  Sign Up
                  <ArrowUpRight size={13} />
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero Section ─── */}
      <section ref={heroRef} className="relative pt-36 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8 glass-subtle"
            style={{ border: "1px solid rgba(139, 92, 246, 0.1)" }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[11px] font-normal tracking-wide text-[#A78BFA]">
              Data. Strategy. Edge.
            </span>
          </motion.div>

          {/* Headline — no gradient text */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-extralight tracking-[-0.04em] leading-[0.95] mb-7"
          >
            <span className="text-white">Options</span>
            <br />
            <span className="text-[#A78BFA] font-light">Decoded.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-[16px] md:text-[18px] max-w-xl mx-auto mb-10 leading-[1.7] font-light text-[#6B6D78]"
          >
            Professional-grade options analytics for the Indian stock market.
            Real-time chains, Greeks surfaces, and strategy building — all in one
            terminal.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex items-center justify-center gap-4"
          >
            <Link
              href={user ? "/option-chain" : "/auth/signin"}
              className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[14px] font-medium text-white overflow-hidden btn-primary"
            >
              <span className="relative z-10">Open Option Chain</span>
              <ArrowUpRight size={15} className="relative z-10" />
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-normal transition-all duration-300 glass-card text-[#A78BFA] hover:text-white"
            >
              Explore Features
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Live Ticker */}
          <LiveTicker />
        </div>

        {/* Hero gradient backdrop — reduced */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-8 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #8B5CF6 0%, #6366F1 40%, transparent 70%)",
          }}
        />
      </section>

      {/* ─── Stats ─── */}
      <section className="relative py-16 px-6 z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-2xl glass-card"
          >
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-24 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-6 text-[11px] font-normal tracking-wide text-[#A78BFA] glass-subtle"
              style={{ border: "1px solid rgba(139, 92, 246, 0.1)" }}
            >
              <Sparkles size={12} />
              Platform Features
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-light text-white/95 mb-4 tracking-[-0.03em]">
              Everything you need to{" "}
              <span className="text-[#A78BFA]">trade smarter</span>
            </h2>
            <p className="text-[14px] max-w-lg mx-auto font-light text-[#6B6D78] leading-[1.7]">
              Built for traders who demand precision. Every pixel designed for
              speed and clarity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Terminal Preview ─── */}
      <section className="relative py-24 px-6 z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-light text-white/95 mb-4 tracking-[-0.03em]">
              See it in <span className="text-[#A78BFA]">action</span>
            </h2>
            <p className="text-[14px] font-light text-[#6B6D78]">
              A professional trading terminal, right in your browser
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden glass-card"
          >
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0A0B10" }}>
              {/* Terminal header */}
              <div
                className="flex items-center gap-2 px-5 py-3.5 border-b"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#10B981" }} />
                <span className="ml-4 text-[11px] font-normal text-[#4B4D58]">
                  FnoPilot Terminal — NIFTY Option Chain
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] text-[#4B4D58]">LIVE</span>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </div>
              {/* Mock table */}
              <div className="p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[11px] font-medium text-white px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139,92,246,0.2)" }}
                    >
                      NIFTY
                    </span>
                    <span className="text-sm font-normal text-white/90">22,547.55</span>
                    <span className="text-[11px] font-normal" style={{ color: "var(--call-green)" }}>
                      +0.42%
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-[11px] text-[#4B4D58]">
                    <span>
                      PCR: <span className="text-white/80 font-normal">1.24</span>
                    </span>
                    <span>
                      Max Pain: <span className="text-[#F59E0B] font-normal">22,500</span>
                    </span>
                    <span>
                      IV: <span className="text-[#A78BFA] font-normal">13.2%</span>
                    </span>
                  </div>
                </div>

                {/* Header row */}
                <div className="grid grid-cols-9 items-center text-[10px] uppercase tracking-wider py-2 px-3 text-[#4B4D58] font-normal mb-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>OI</div>
                  <div>LTP</div>
                  <div>IV</div>
                  <div></div>
                  <div className="text-center">Strike</div>
                  <div></div>
                  <div>IV</div>
                  <div>LTP</div>
                  <div className="text-right">OI</div>
                </div>

                {/* Data rows */}
                <div className="space-y-0">
                  {[
                    { strike: "22400", callOI: "12.4L", putOI: "8.2L", callLTP: "247.30", putLTP: "98.15", callIV: "14.2", putIV: "15.1", isATM: false },
                    { strike: "22450", callOI: "18.7L", putOI: "11.3L", callLTP: "212.45", putLTP: "113.60", callIV: "13.8", putIV: "14.6", isATM: false },
                    { strike: "22500", callOI: "24.1L", putOI: "22.8L", callLTP: "178.90", putLTP: "130.25", callIV: "13.2", putIV: "13.9", isATM: true },
                    { strike: "22550", callOI: "15.6L", putOI: "19.4L", callLTP: "148.15", putLTP: "149.80", callIV: "12.9", putIV: "13.5", isATM: false },
                    { strike: "22600", callOI: "9.3L", putOI: "14.7L", callLTP: "119.70", putLTP: "171.45", callIV: "12.6", putIV: "13.1", isATM: false },
                  ].map((row, i) => (
                    <motion.div
                      key={row.strike}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i }}
                      viewport={{ once: true }}
                      className={`grid grid-cols-9 items-center text-[12px] py-2.5 px-3 rounded-lg transition-all duration-300 ${
                        row.isATM ? "glass-subtle" : "hover:bg-[rgba(139,92,246,0.03)]"
                      }`}
                      style={row.isATM ? { border: "1px solid rgba(139,92,246,0.1)" } : undefined}
                    >
                      {/* Call side */}
                      <div style={{ color: "var(--call-green)" }} className="font-normal">{row.callOI}</div>
                      <div className="text-white/85 font-normal">{row.callLTP}</div>
                      <div className="text-[#6B6D78]">{row.callIV}%</div>
                      <div
                        className="w-full rounded-full h-0.5 mx-2"
                        style={{
                          background: `linear-gradient(to left, rgba(16,185,129,${parseFloat(row.callOI) / 30}), transparent)`,
                        }}
                      />
                      {/* Strike */}
                      <div className={`text-center font-medium ${row.isATM ? "text-[#A78BFA]" : "text-white/90"}`}>
                        {row.strike}
                      </div>
                      {/* Put side */}
                      <div
                        className="w-full rounded-full h-0.5 mx-2"
                        style={{
                          background: `linear-gradient(to right, rgba(239,68,68,${parseFloat(row.putOI) / 30}), transparent)`,
                        }}
                      />
                      <div className="text-[#6B6D78]">{row.putIV}%</div>
                      <div className="text-white/85 font-normal">{row.putLTP}</div>
                      <div style={{ color: "var(--put-red)" }} className="font-normal text-right">{row.putOI}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow effect — much reduced */}
            <div
              className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-[150px] rounded-full blur-[100px] opacity-[0.04] pointer-events-none"
              style={{ background: "#8B5CF6" }}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative py-28 px-6 z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-extralight text-white/95 mb-6 tracking-[-0.03em]">
              Ready to trade with{" "}
              <span className="text-[#A78BFA]">precision</span>?
            </h2>
            <p className="text-[15px] font-light text-[#6B6D78] mb-10 max-w-md mx-auto leading-[1.7]">
              Join thousands of traders who use FnoPilot to decode the options market
              every single day.
            </p>
            <Link
              href={user ? "/option-chain" : "/auth/signin"}
              className="group relative inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-[15px] font-medium text-white overflow-hidden btn-primary"
            >
              <span className="relative z-10">Start Trading Now</span>
              <ArrowUpRight size={16} className="relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </Link>
          </motion.div>
        </div>
        {/* Subdued glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[150px] opacity-[0.04] pointer-events-none"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
        />
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative py-12 px-6 z-10 border-t" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)" }}
            >
              <span className="text-white text-[8px] font-bold">FP</span>
            </div>
            <span className="text-[13px] font-normal text-white/60">
              FnoPilot
            </span>
          </div>
          <p className="text-[11px] text-[#4B4D58]">
            © 2026 FnoPilot. Professional Options Analytics for Indian Markets.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "API"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[11px] transition-colors duration-200 text-[#4B4D58] hover:text-white/70"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
