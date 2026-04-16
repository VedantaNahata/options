import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";

export const metadata: Metadata = {
    title: "Option Chain — OptiX",
    description:
        "Real-time option chain with OI heatmaps, Greeks, PCR ratio, Max Pain, and strategy builder for Indian indices and stocks.",
};

export default function OptionChainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard>{children}</AuthGuard>;
}
