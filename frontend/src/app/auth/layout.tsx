import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In — OptiX",
    description: "Sign in to your OptiX account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
