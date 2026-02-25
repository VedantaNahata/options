"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Activity,
  BarChart3,
  Layers,
  Zap,
  TrendingUp,
  Shield,
  ChevronRight,
} from "lucide-react";

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

/* ─── Floating Orb Background ─── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)",
          top: "10%",
          right: "-10%",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Cyan accent */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,210,211,0.08) 0%, transparent 70%)",
          bottom: "20%",
          left: "-5%",
        }}
        animate={{
          x: [0, -20, 30, 0],
          y: [0, 30, -20, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Warm accent */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,179,0,0.06) 0%, transparent 70%)",
          top: "50%",
          left: "40%",
        }}
        animate={{
          x: [0, 40, -10, 0],
          y: [0, -20, 40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ─── Grid Lines ─── */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-bg opacity-40" />
      {/* Horizontal scanline */}
      <motion.div
        className="absolute left-0 w-full h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(108,92,231,0.3) 50%, transparent 100%)",
        }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Particle Dots ─── */
function ParticleField() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
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
            background: "rgba(108, 92, 231, 0.4)",
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
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
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative p-6 rounded-2xl glass cursor-default"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(108,92,231,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "rgba(108, 92, 231, 0.12)" }}>
          <Icon size={20} className="text-[#6C5CE7]" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
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
      transition={{ duration: 0.5, delay: index * 0.15 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-3xl font-bold gradient-text mb-1">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: BarChart3,
      title: "Real-Time Option Chains",
      description: "Live option chain data with OI heatmaps, PCR ratios, and Max Pain analysis across all major Indian indices.",
    },
    {
      icon: Activity,
      title: "Greeks & IV Surface",
      description: "Delta, Gamma, Theta, Vega — all in real-time. Visualize the 3D IV surface to spot mispriced options.",
    },
    {
      icon: Layers,
      title: "Strategy Builder",
      description: "Build multi-leg strategies visually. See payoff diagrams, breakevens, and risk metrics before executing.",
    },
    {
      icon: Zap,
      title: "Smart Alerts",
      description: "Unusual OI buildup detection, IV crush alerts, and PCR shift notifications in real-time.",
    },
    {
      icon: TrendingUp,
      title: "Market Pulse",
      description: "Live index tracking with expected move ranges, VIX correlation, and institutional flow analysis.",
    },
    {
      icon: Shield,
      title: "Risk Analytics",
      description: "Portfolio Greeks aggregation, margin requirements, and scenario analysis for complex positions.",
    },
  ];

  const stats = [
    { value: 500, suffix: "+", label: "Strike Prices Tracked" },
    { value: 50, suffix: "ms", label: "Data Latency" },
    { value: 6, suffix: "", label: "Index Coverage" },
    { value: 24, suffix: "/7", label: "Analytics Engine" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0B0F" }}>
      <FloatingOrbs />
      <GridBackground />
      <ParticleField />

      {/* ─── Navbar ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 glass"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)" }}>
              <span className="text-white text-sm font-black tracking-tight">OX</span>
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">
              Opti<span className="text-[#6C5CE7]">X</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Option Chain", href: "/option-chain", external: true },
              { label: "Strategy Lab", href: "#", external: false },
              { label: "Analytics", href: "#", external: false },
              { label: "Docs", href: "#", external: false },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                className="relative px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg group"
                style={{ color: "var(--muted-foreground)" }}
              >
                <span className="relative z-10 group-hover:text-white transition-colors duration-200">
                  {item.label}
                </span>
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
                  style={{ background: "rgba(108, 92, 231, 0.08)" }}
                  layoutId="nav-hover"
                  transition={{ duration: 0.2 }}
                />
              </Link>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/option-chain"
            target="_blank"
            className="hidden md:flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(108,92,231,0.3)]"
            style={{
              background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)",
            }}
          >
            Launch Terminal
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.nav>

      {/* ─── Hero Section ─── */}
      <section ref={heroRef} className="relative pt-40 pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: "rgba(108, 92, 231, 0.1)",
              border: "1px solid rgba(108, 92, 231, 0.2)",
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#00E676" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-medium" style={{ color: "#a29bfe" }}>
              Live Market Data — Powered by Groww API
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-6"
          >
            <span className="text-white">Options </span>
            <span className="gradient-text">Decoded.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
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
              href="/option-chain"
              target="_blank"
              className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(108,92,231,0.4)]"
              style={{
                background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)",
              }}
            >
              <span className="relative z-10">Open Option Chain</span>
              <ArrowUpRight size={16} className="relative z-10" />
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 glass hover:border-[rgba(108,92,231,0.3)]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Explore Features
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </div>

        {/* Hero gradient backdrop */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #6C5CE7 0%, transparent 70%)",
          }}
        />
      </section>

      {/* ─── Stats ─── */}
      <section className="relative py-16 px-6 z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-2xl glass"
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need to{" "}
              <span className="gradient-text">trade smarter</span>
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--muted-foreground)" }}>
              Built for traders who demand precision. Every pixel designed for
              speed and clarity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            className="relative rounded-2xl overflow-hidden glass p-px"
          >
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0D0E13" }}>
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F56" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#27CA40" }} />
                <span className="ml-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  OptiX Terminal — Option Chain
                </span>
              </div>
              {/* Mock table */}
              <div className="p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white px-3 py-1 rounded-md"
                      style={{ background: "rgba(108, 92, 231, 0.2)" }}>
                      NIFTY
                    </span>
                    <span className="text-sm font-bold text-white">22,547.55</span>
                    <span className="text-xs font-medium" style={{ color: "var(--call-green)" }}>
                      +0.42%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span>PCR: <span className="text-white font-semibold">1.24</span></span>
                    <span>Max Pain: <span className="text-[#FFB300] font-semibold">22,500</span></span>
                  </div>
                </div>
                {/* Mock rows */}
                <div className="space-y-0.5">
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
                      transition={{ delay: 0.1 * i }}
                      viewport={{ once: true }}
                      className={`grid grid-cols-9 items-center text-xs py-2 px-3 rounded-lg ${row.isATM ? "atm-row" : ""
                        }`}
                      style={{
                        background: row.isATM ? "var(--atm-highlight)" : "transparent",
                      }}
                    >
                      {/* Call side */}
                      <div style={{ color: "var(--call-green)" }} className="font-medium">{row.callOI}</div>
                      <div className="text-white">{row.callLTP}</div>
                      <div style={{ color: "var(--muted-foreground)" }}>{row.callIV}%</div>
                      <div className="w-full rounded-full h-1 mx-2"
                        style={{
                          background: `linear-gradient(to left, rgba(0,230,118,${parseFloat(row.callOI) / 30
                            }), transparent)`,
                        }}
                      />
                      {/* Strike */}
                      <div className={`text-center font-bold ${row.isATM ? "text-[#6C5CE7]" : "text-white"}`}>
                        {row.strike}
                      </div>
                      {/* Put side */}
                      <div className="w-full rounded-full h-1 mx-2"
                        style={{
                          background: `linear-gradient(to right, rgba(255,82,82,${parseFloat(row.putOI) / 30
                            }), transparent)`,
                        }}
                      />
                      <div style={{ color: "var(--muted-foreground)" }}>{row.putIV}%</div>
                      <div className="text-white">{row.putLTP}</div>
                      <div style={{ color: "var(--put-red)" }} className="font-medium text-right">{row.putOI}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div
              className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[80px] opacity-15 pointer-events-none"
              style={{ background: "#6C5CE7" }}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative py-16 px-6 z-10 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)" }}
            >
              <span className="text-white text-xs font-black">OX</span>
            </div>
            <span className="text-sm font-bold text-white">
              Opti<span className="text-[#6C5CE7]">X</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            © 2026 OptiX. Professional Options Analytics for Indian Markets.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "API"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs transition-colors duration-200 hover:text-white"
                style={{ color: "var(--muted-foreground)" }}
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
