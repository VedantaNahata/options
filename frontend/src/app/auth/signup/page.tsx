"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function SignUpPage() {
    const { signUp } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
            setError(error);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#07080C" }}>
            {/* Background glow */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-15 pointer-events-none"
                style={{
                    background: "radial-gradient(circle, #8B5CF6 0%, #6366F1 40%, transparent 70%)",
                    top: "10%",
                    left: "30%",
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md mx-4"
            >
                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[13px] text-[#6B6D78] hover:text-white/80 transition-colors mb-8"
                >
                    <ArrowLeft size={14} />
                    Back to home
                </Link>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 mb-8">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                                boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
                            }}
                        >
                            <span className="text-white text-[11px] font-bold">FP</span>
                        </div>
                        <span className="text-white text-lg font-medium">
                            Fno<span className="text-[#A78BFA]">Pilot</span>
                        </span>
                    </div>

                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-14 h-14 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                                <Mail size={24} className="text-[#10B981]" />
                            </div>
                            <h2 className="text-xl font-light text-white mb-2">Check your email</h2>
                            <p className="text-[13px] text-[#6B6D78] mb-6">
                                We&apos;ve sent a confirmation link to <strong className="text-white/80">{email}</strong>.
                                Click it to activate your account.
                            </p>
                            <Link
                                href="/auth/signin"
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-medium text-white btn-primary"
                            >
                                Go to Sign In
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-light text-white mb-2 tracking-[-0.02em]">Create an account</h1>
                            <p className="text-[13px] text-[#6B6D78] mb-8">Start analyzing options like a pro.</p>

                            {error && (
                                <div className="mb-4 px-4 py-3 rounded-xl text-[13px] text-red-400 bg-red-500/10 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[12px] font-medium text-[#6B6D78] mb-2">First Name</label>
                                        <div className="relative">
                                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B4D58]" />
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                                placeholder="John"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder-[#4B4D58] bg-white/[0.04] border border-white/[0.08] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-medium text-[#6B6D78] mb-2">Last Name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                            placeholder="Doe"
                                            className="w-full px-4 py-3 rounded-xl text-[13px] text-white placeholder-[#4B4D58] bg-white/[0.04] border border-white/[0.08] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-[12px] font-medium text-[#6B6D78] mb-2">Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B4D58]" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="you@example.com"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder-[#4B4D78] bg-white/[0.04] border border-white/[0.08] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-[12px] font-medium text-[#6B6D78] mb-2">Password</label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B4D58]" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="Min 6 characters"
                                            className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] text-white placeholder-[#4B4D58] bg-white/[0.04] border border-white/[0.08] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B4D58] hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl text-[14px] font-medium text-white btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Creating account..." : "Create Account"}
                                </button>
                            </form>

                            {/* Link to signin */}
                            <p className="mt-6 text-center text-[13px] text-[#6B6D78]">
                                Already have an account?{" "}
                                <Link href="/auth/signin" className="text-[#A78BFA] hover:text-[#C4B5FD] transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
