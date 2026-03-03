/**
 * OptiX WebSocket Feed Client
 * ============================
 * Connects to the backend WebSocket for real-time index values and option LTPs.
 * Auto-reconnects on disconnect.
 */

import type { IndexPrice } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export interface FeedCallbacks {
    onIndexUpdate?: (indices: IndexPrice[]) => void;
    onLTPUpdate?: (data: Record<string, number>) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export class FeedConnection {
    private ws: WebSocket | null = null;
    private callbacks: FeedCallbacks;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isDestroyed = false;
    private url: string;

    constructor(callbacks: FeedCallbacks) {
        this.callbacks = callbacks;
        this.url = `${WS_BASE}/ws/feed`;
    }

    connect() {
        if (this.isDestroyed) return;
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log("[FeedConnection] Connected");
                this.callbacks.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.index_update && this.callbacks.onIndexUpdate) {
                        this.callbacks.onIndexUpdate(msg.index_update);
                    }

                    if (msg.ltp_update && this.callbacks.onLTPUpdate) {
                        this.callbacks.onLTPUpdate(msg.ltp_update);
                    }
                } catch (e) {
                    console.error("[FeedConnection] Parse error:", e);
                }
            };

            this.ws.onclose = () => {
                console.log("[FeedConnection] Disconnected");
                this.callbacks.onDisconnect?.();
                this.scheduleReconnect();
            };

            this.ws.onerror = (err) => {
                console.error("[FeedConnection] Error:", err);
                this.ws?.close();
            };
        } catch (e) {
            console.error("[FeedConnection] Connection failed:", e);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (this.isDestroyed) return;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            console.log("[FeedConnection] Reconnecting...");
            this.connect();
        }, 3000);
    }

    /**
     * Subscribe to option chain LTP updates for given trading symbols.
     * Call this after loading an option chain to get real-time price updates.
     */
    subscribeOptions(symbols: string[], exchange: string = "NSE") {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    action: "subscribe_options",
                    symbols,
                    exchange,
                })
            );
        }
    }

    /**
     * Unsubscribe from option LTP updates.
     */
    unsubscribeOptions() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: "unsubscribe_options" }));
        }
    }

    /**
     * Check if connected.
     */
    get connected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Close the connection permanently.
     */
    destroy() {
        this.isDestroyed = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
        this.ws = null;
    }
}
