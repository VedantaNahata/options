import { supabase } from "./supabase";
import type { StrategyLeg } from "./types";

export interface SavedStrategy {
    id: string;
    user_id: string;
    name: string;
    instrument: string;
    exchange: string;
    expiry_date: string;
    underlying_ltp: number;
    lot_size: number;
    legs: StrategyLeg[];
    created_at: string;
    updated_at: string;
}

export async function saveStrategy(
    userId: string,
    name: string,
    instrument: string,
    exchange: string,
    expiryDate: string,
    underlyingLtp: number,
    lotSize: number,
    legs: StrategyLeg[]
): Promise<{ data: SavedStrategy | null; error: string | null }> {
    const { data, error } = await supabase
        .from("strategies")
        .insert({
            user_id: userId,
            name,
            instrument,
            exchange,
            expiry_date: expiryDate,
            underlying_ltp: underlyingLtp,
            lot_size: lotSize,
            legs: JSON.parse(JSON.stringify(legs)),
        })
        .select()
        .single();

    return { data, error: error?.message ?? null };
}

export async function getUserStrategies(userId: string): Promise<{ data: SavedStrategy[]; error: string | null }> {
    const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    return { data: data ?? [], error: error?.message ?? null };
}

export async function deleteStrategy(strategyId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from("strategies")
        .delete()
        .eq("id", strategyId);

    return { error: error?.message ?? null };
}
