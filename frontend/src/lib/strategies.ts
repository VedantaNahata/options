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

export async function updateStrategy(
    strategyId: string,
    updates: Partial<{
        name: string;
        legs: StrategyLeg[];
        underlying_ltp: number;
    }>
): Promise<{ data: SavedStrategy | null; error: string | null }> {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.legs) {
        updateData.legs = JSON.parse(JSON.stringify(updates.legs));
    }

    const { data, error } = await supabase
        .from("strategies")
        .update(updateData)
        .eq("id", strategyId)
        .select()
        .single();

    return { data, error: error?.message ?? null };
}

export async function duplicateStrategy(
    strategyId: string,
    userId: string,
    newName?: string
): Promise<{ data: SavedStrategy | null; error: string | null }> {
    // First, fetch the original
    const { data: original, error: fetchError } = await supabase
        .from("strategies")
        .select("*")
        .eq("id", strategyId)
        .single();

    if (fetchError || !original) {
        return { data: null, error: fetchError?.message ?? "Strategy not found" };
    }

    // Insert a copy
    const { data, error } = await supabase
        .from("strategies")
        .insert({
            user_id: userId,
            name: newName || `${original.name} (copy)`,
            instrument: original.instrument,
            exchange: original.exchange,
            expiry_date: original.expiry_date,
            underlying_ltp: original.underlying_ltp,
            lot_size: original.lot_size,
            legs: original.legs,
        })
        .select()
        .single();

    return { data, error: error?.message ?? null };
}
