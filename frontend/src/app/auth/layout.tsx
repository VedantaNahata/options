import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In — FnoPilot",
    description: "Sign in to your FnoPilot account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

