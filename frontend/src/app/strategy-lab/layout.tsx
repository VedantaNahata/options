import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";

export const metadata: Metadata = {
    title: "Strategy Lab — FnoPilot",
    description:
        "Build, analyze, and optimize multi-leg options strategies with real-time payoff charts, Greeks, what-if scenarios, and margin estimation.",
};

export default function StrategyLabLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard>{children}</AuthGuard>;
}
