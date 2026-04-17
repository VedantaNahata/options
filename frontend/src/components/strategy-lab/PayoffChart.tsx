"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { PayoffPoint } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PayoffChartProps {
    curve: PayoffPoint[];
    underlyingLTP: number;
    upperBreakeven: number | null;
    lowerBreakeven: number | null;
    spotOverride?: number;
}

interface PlotShape {
    type: string;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    line: { color: string; width: number; dash?: string };
}

interface PlotAnnotation {
    x: number;
    y: number;
    text: string;
    showarrow: boolean;
    arrowhead?: number;
    arrowcolor?: string;
    ax?: number;
    ay?: number;
    font: { color: string; size: number };
    bgcolor: string;
    borderpad: number;
    bordercolor: string;
    borderwidth: number;
}

function formatINR(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

export function PayoffChart({
    curve,
    underlyingLTP,
    upperBreakeven,
    lowerBreakeven,
    spotOverride,
}: PayoffChartProps) {
    const plotData = useMemo(() => {
        if (curve.length === 0) return { traces: [], shapes: [], annotations: [] };

        const spots = curve.map((p) => p.spot);
        const expiryPnL = curve.map((p) => p.pnlAtExpiry);
        const currentPnL = curve.map((p) => p.pnlCurrent);

        // Split expiry into profit/loss for coloring
        const expiryProfit = expiryPnL.map((v) => (v >= 0 ? v : null));
        const expiryLoss = expiryPnL.map((v) => (v < 0 ? v : null));

        const traces = [
            // Profit zone fill
            {
                x: spots,
                y: expiryProfit,
                type: "scatter" as const,
                mode: "lines" as const,
                fill: "tozeroy" as const,
                fillcolor: "rgba(16, 185, 129, 0.08)",
                line: { color: "rgba(16, 185, 129, 0.9)", width: 2.5 },
                name: "Profit at Expiry",
                connectgaps: false,
                hovertemplate: "Spot: ₹%{x:,.0f}<br>P&L: ₹%{y:,.0f}<extra></extra>",
            },
            // Loss zone fill
            {
                x: spots,
                y: expiryLoss,
                type: "scatter" as const,
                mode: "lines" as const,
                fill: "tozeroy" as const,
                fillcolor: "rgba(239, 68, 68, 0.08)",
                line: { color: "rgba(239, 68, 68, 0.9)", width: 2.5 },
                name: "Loss at Expiry",
                connectgaps: false,
                hovertemplate: "Spot: ₹%{x:,.0f}<br>P&L: ₹%{y:,.0f}<extra></extra>",
            },
            // Current date P&L
            {
                x: spots,
                y: currentPnL,
                type: "scatter" as const,
                mode: "lines" as const,
                line: { color: "rgba(139, 92, 246, 0.7)", width: 2, dash: "dot" as const },
                name: "P&L Today",
                hovertemplate: "Spot: ₹%{x:,.0f}<br>P&L Today: ₹%{y:,.0f}<extra></extra>",
            },
        ];

        const minPnL = Math.min(...expiryPnL, ...currentPnL);
        const maxPnL = Math.max(...expiryPnL, ...currentPnL);

        // Vertical lines
        const shapes: PlotShape[] = [
            // Zero line
            {
                type: "line",
                x0: spots[0],
                x1: spots[spots.length - 1],
                y0: 0,
                y1: 0,
                line: { color: "rgba(255,255,255,0.15)", width: 1, dash: "dot" },
            },
            // Current spot vertical
            {
                type: "line",
                x0: spotOverride || underlyingLTP,
                x1: spotOverride || underlyingLTP,
                y0: minPnL * 1.1,
                y1: maxPnL * 1.1,
                line: { color: "rgba(245, 158, 11, 0.6)", width: 1.5, dash: "dash" },
            },
        ];

        const annotations: PlotAnnotation[] = [
            {
                x: spotOverride || underlyingLTP,
                y: maxPnL * 0.95,
                text: `Spot ₹${formatINR(spotOverride || underlyingLTP)}`,
                showarrow: false,
                font: { color: "#F59E0B", size: 10 },
                bgcolor: "rgba(245, 158, 11, 0.1)",
                borderpad: 4,
                bordercolor: "rgba(245, 158, 11, 0.3)",
                borderwidth: 1,
            },
        ];

        // Breakeven markers
        if (lowerBreakeven !== null) {
            shapes.push({
                type: "line",
                x0: lowerBreakeven,
                x1: lowerBreakeven,
                y0: minPnL * 1.1,
                y1: maxPnL * 0.5,
                line: { color: "rgba(6, 182, 212, 0.5)", width: 1, dash: "dot" },
            });
            annotations.push({
                x: lowerBreakeven,
                y: 0,
                text: `BE ₹${formatINR(lowerBreakeven)}`,
                showarrow: true,
                arrowhead: 0,
                arrowcolor: "rgba(6, 182, 212, 0.5)",
                ax: -40,
                ay: -30,
                font: { color: "#06B6D4", size: 9 },
                bgcolor: "rgba(6, 182, 212, 0.08)",
                borderpad: 3,
                bordercolor: "rgba(6, 182, 212, 0.3)",
                borderwidth: 1,
            });
        }

        if (upperBreakeven !== null) {
            shapes.push({
                type: "line",
                x0: upperBreakeven,
                x1: upperBreakeven,
                y0: minPnL * 1.1,
                y1: maxPnL * 0.5,
                line: { color: "rgba(6, 182, 212, 0.5)", width: 1, dash: "dot" },
            });
            annotations.push({
                x: upperBreakeven,
                y: 0,
                text: `BE ₹${formatINR(upperBreakeven)}`,
                showarrow: true,
                arrowhead: 0,
                arrowcolor: "rgba(6, 182, 212, 0.5)",
                ax: 40,
                ay: -30,
                font: { color: "#06B6D4", size: 9 },
                bgcolor: "rgba(6, 182, 212, 0.08)",
                borderpad: 3,
                bordercolor: "rgba(6, 182, 212, 0.3)",
                borderwidth: 1,
            });
        }

        return { traces, shapes, annotations };
    }, [curve, underlyingLTP, upperBreakeven, lowerBreakeven, spotOverride]);

    if (curve.length === 0) {
        return (
            <div className="flex items-center justify-center h-[350px] rounded-2xl border border-white/[0.06]"
                style={{ background: "rgba(14,15,22,0.5)" }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: "rgba(139,92,246,0.1)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <p className="text-xs text-white/40">Add legs to see the payoff diagram</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: "rgba(14,15,22,0.5)" }}>
            <Plot
                data={plotData.traces}
                layout={{
                    autosize: true,
                    height: 350,
                    margin: { l: 60, r: 20, t: 10, b: 45 },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { family: "Inter, system-ui, sans-serif", color: "rgba(255,255,255,0.5)", size: 10 },
                    xaxis: {
                        title: { text: "Spot Price (₹)", font: { size: 10, color: "rgba(255,255,255,0.35)" } },
                        gridcolor: "rgba(255,255,255,0.03)",
                        zerolinecolor: "rgba(255,255,255,0.06)",
                        tickformat: ",",
                        tickfont: { size: 9 },
                    },
                    yaxis: {
                        title: { text: "P & L (₹)", font: { size: 10, color: "rgba(255,255,255,0.35)" } },
                        gridcolor: "rgba(255,255,255,0.03)",
                        zerolinecolor: "rgba(255,255,255,0.1)",
                        tickformat: ",",
                        tickfont: { size: 9 },
                    },
                    shapes: plotData.shapes,
                    annotations: plotData.annotations,
                    legend: {
                        x: 0.01,
                        y: 0.99,
                        bgcolor: "rgba(14,15,22,0.8)",
                        bordercolor: "rgba(255,255,255,0.06)",
                        borderwidth: 1,
                        font: { size: 9, color: "rgba(255,255,255,0.6)" },
                    },
                    hovermode: "x unified",
                    hoverlabel: {
                        bgcolor: "rgba(14,15,22,0.95)",
                        bordercolor: "rgba(139,92,246,0.3)",
                        font: { size: 10, color: "rgba(255,255,255,0.85)", family: "Inter" },
                    },
                }}
                config={{
                    displayModeBar: false,
                    responsive: true,
                }}
                style={{ width: "100%", height: "350px" }}
            />
        </div>
    );
}
