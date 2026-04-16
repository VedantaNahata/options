import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FnoPilot — Options Analytics Platform",
  description:
    "Professional-grade options analytics for the Indian stock market. Real-time option chains, Greeks, IV surfaces, and strategy building.",
  keywords: [
    "options",
    "analytics",
    "trading",
    "nifty",
    "banknifty",
    "option chain",
    "greeks",
    "implied volatility",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased noise-overlay`}>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
