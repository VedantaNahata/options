"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/auth/signin");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#07080C" }}>
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                            boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
                        }}
                    >
                        <span className="text-white text-[11px] font-bold">FP</span>
                    </div>
                    <span className="text-xs text-[#A78BFA] tracking-wide">FnoPilot</span>
                    <div className="w-6 h-6 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
