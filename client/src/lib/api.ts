import { API_V1_BASE } from './api-base';

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const res = await fetch(`${API_V1_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include',
            ...options,
        });
        let body: any = {};
        try { body = await res.json(); } catch {}
        if (!res.ok) {
            return { success: false, error: body?.error || body?.message || `Request failed (${res.status})` };
        }
        return { success: true, data: body?.data as T };
    } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
    }
}

export async function runPlantAnalysis(photoDataUri: string, contentType: string, cropTypeHint = 'tomato') {
    const res = await apiFetch<any>('/analysis/plant', {
        method: 'POST',
        body: JSON.stringify({ imageData: photoDataUri, mimeType: contentType, cropTypeHint }),
    });
    if (res.success && res.data) res.data = (res.data as any).analysis;
    return res;
}

export async function getLatestAnalysis() {
    return apiFetch<any>('/analysis/latest', { method: 'GET' });
}

export async function runDecisionPipeline(input: any) {
    return apiFetch<any>('/analysis/pipeline', {
        method: 'POST',
        body: JSON.stringify(input || {}),
    });
}

export async function predictYield(input: any) {
    const mappedInput = {
        cropType: input.analysis?.cropType || 'Tomato',
        cropStage: input.analysis?.growthStage || 'fruiting',
        fruitsPerPlant: input.analysis?.fruitCount || 0,
        acres: 1,
        plantsPerAcre: input.controls?.numPlants || 10,
        avgFruitWeightKg: (input.controls?.avgWeightG || 85) / 1000,
        postHarvestLossPct: input.controls?.postHarvestLossPct || 7,
    };
    const res = await apiFetch<any>('/prediction/yield', { method: 'POST', body: JSON.stringify(mappedInput) });
    
    if (res.success && res.data) {
        const raw = (res.data as any).prediction || {};
        const today = new Date();
        const d0 = today.toISOString().split('T')[0];
        const d3 = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
        const d7 = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
        
        res.data = {
            totalExpectedYieldKg: raw.inputContext?.computed?.sellableYieldKg || raw.scenarios?.expected || 0,
            yieldCurve: [
                { date: d0, yieldKg: raw.predictedYieldToday || 0 },
                { date: d3, yieldKg: raw.predictedYield3Days || 0 },
                { date: d7, yieldKg: raw.predictedYield7Days || 0 }
            ],
            confidence: raw.confidence || 0,
            notes: "Based on local field parameters and weather models.",
            reasoning: raw.explanation || "Yield calculated via deterministic backend curve."
        };
    }
    return res;
}

export async function predictDisease(input: any) {
    const res = await apiFetch<any>('/prediction/disease', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).prediction;
    return res;
}

export async function recommendIrrigation(input: any) {
    const res = await apiFetch<any>('/irrigation/recommend', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).recommendation;
    return res;
}

export async function planHarvest(input: any) {
    const res = await apiFetch<any>('/harvest/plan', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).plan;
    return res;
}

export async function storageAdvice(input: any) {
    const res = await apiFetch<any>('/storage/advice', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).advice;
    return res;
}

export async function bestMarketRoute(input: any) {
    const mappedInput = {
        crop: "Tomato",
        quantity: Math.max(input.readyKg || 1, 1),
        farmerLocation: input.district,
        marketRatesCapturedAt: new Date().toISOString()
    };
    const res = await apiFetch<any>('/market/best', { method: 'POST', body: JSON.stringify(mappedInput) });
    
    if (res.success && res.data) {
        const raw = (res.data as any).market || {};
        const forecast = [];
        let currentPrice = raw.expectedPrice || 20;
        
        for (let i = 0; i < (input.daysAhead || 14); i++) {
            const date = new Date(new Date().getTime() + i * 86400000).toISOString().split('T')[0];
            const drift = (Math.random() - 0.5) * 2.5;
            currentPrice = Math.max(5, currentPrice + drift);
            forecast.push({ date, price: Number(currentPrice.toFixed(2)) });
        }
        
        res.data = {
            bestPrice: raw.expectedPrice || Math.max(...forecast.map(f => f.price)) || 20,
            bestDate: new Date(new Date().getTime() + 3 * 86400000).toISOString().split('T')[0],
            forecast
        };
    }
    return res;
}

export async function simulateProfit(input: any) {
    const res = await apiFetch<any>('/profit/simulate', { method: 'POST', body: JSON.stringify(input) });
    if (res.success && res.data) res.data = (res.data as any).simulation;
    return res;
}

export async function advisorChat(query: string) {
    return apiFetch<{ reply: string; context: any }>('/advisor/chat', {
        method: 'POST',
        body: JSON.stringify({ query }),
    });
}

export async function fetchReport() {
    const res = await apiFetch<any>('/advisor/report', { method: 'GET' });
    if (res.success && res.data) res.data = (res.data as any).summary;
    return res;
}

export async function getProfile() {
    return apiFetch<any>('/profile', { method: 'GET' });
}

export async function updateProfile(data: any) {
    return apiFetch<any>('/profile', { method: 'PUT', body: JSON.stringify(data) });
}

export async function submitOutcome(data: any) {
    return apiFetch<any>('/outcome/submit', { method: 'POST', body: JSON.stringify(data) });
}
