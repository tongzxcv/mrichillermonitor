import type { SensorReading } from '@/data/mockSensors';
import { SENSOR_CONFIGS } from '@/data/mockSensors';

// Hardcoded GAS URL - always connected
const HARDCODED_GAS_URL = 'https://script.google.com/macros/s/AKfycbypCLMU0k37UTqLh0vb0tQEr3YToc3bWwlHOoFaGpyOMUWvtQ2IC7TIPi4KjsH71TiF/exec';
const GAS_URL_KEY = 'gas_webapp_url';

export function getGasUrl(): string {
        return HARDCODED_GAS_URL;
}

export function setGasUrl(url: string) {
        localStorage.setItem(GAS_URL_KEY, url.trim());
}

export function isGasConfigured(): boolean {
        return true;
}

interface GasLatestResponse {
        sensors: SensorReading[];
        timestamp: string | null;
        wifi1?: number;
        wifi2?: number;
        wifi3?: number;
        error?: string;
}

export interface ChartHistoryPoint {
        time: string;
        vals: (number | null)[];
}

// Rolling history per sensor (last 288 readings = 1 day at 5min interval)
const sensorHistory: Record<string, { time: string; value: number }[]> = {};
const HISTORY_MAX = 288;

function fetchViaJsonp(targetUrl: string): Promise<any> {
        // Security: validate that URL belongs to script.google.com only
    try {
                const urlObj = new URL(targetUrl);
                if (urlObj.hostname !== 'script.google.com') {
                                return Promise.reject(new Error('URL must be from script.google.com'));
                }
    } catch {
                return Promise.reject(new Error('Invalid URL'));
    }

    return new Promise((resolve, reject) => {
                const cbName = 'gasJsonpCb_' + Date.now();
                const script = document.createElement('script');
                const timeout = setTimeout(() => {
                                cleanup();
                                reject(new Error('JSONP timeout'));
                }, 15000);
                function cleanup() {
                                clearTimeout(timeout);
                                delete (window as any)[cbName];
                                if (script.parentNode) script.parentNode.removeChild(script);
                }
                (window as any)[cbName] = (data: any) => {
                                cleanup();
                                resolve(data);
                };
                const separator = targetUrl.includes('?') ? '&' : '?';
                script.src = `${targetUrl}${separator}callback=${cbName}`;
                script.onerror = () => {
                                cleanup();
                                reject(new Error('JSONP script error'));
                };
                document.head.appendChild(script);
    });
}

// Pre-fill sensorHistory from GAS chart history (called on init)
export function initSensorHistoryFromChart(history: ChartHistoryPoint[]) {
        if (!Array.isArray(history)) return;
        history.forEach((point) => {
                    SENSOR_CONFIGS.forEach((cfg, idx) => {
                                    const val = point.vals[idx];
                                    if (val !== null && val !== undefined) {
                                                        if (!sensorHistory[cfg.id]) sensorHistory[cfg.id] = [];
                                                        sensorHistory[cfg.id].push({ time: point.time, value: val });
                                    }
                    });
        });
}

export async function fetchLatestFromGas(gasUrl: string): Promise<GasLatestResponse> {
        const data = await fetchViaJsonp(gasUrl);
        if (data && Array.isArray(data.sensors)) {
                    data.sensors.forEach((s: SensorReading) => {
                                    if (!sensorHistory[s.id]) sensorHistory[s.id] = [];
                                    sensorHistory[s.id].push({ time: new Date().toISOString(), value: s.temp });
                                    if (sensorHistory[s.id].length > HISTORY_MAX) {
                                                        sensorHistory[s.id] = sensorHistory[s.id].slice(-HISTORY_MAX);
                                    }
                    });
        }
        return data as GasLatestResponse;
}

export async function checkGasConnection(gasUrl: string): Promise<{ ok: boolean; error?: string }> {
        try {
                    const data = await fetchViaJsonp(gasUrl);
                    if (data && (Array.isArray(data.sensors) || data.timestamp !== undefined)) {
                                    return { ok: true };
                    }
                    return { ok: false, error: 'Unexpected response format' };
        } catch (e) {
                    return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
}

export async function rebootAllSensors(gasUrl: string): Promise<{ ok: boolean; error?: string }> {
        try {
                    const data = await fetchViaJsonp(`${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=reboot`);
                    return { ok: !!data?.ok };
        } catch (e) {
                    return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
}

export function getChartHistory(sensorId: string): { time: string; value: number }[] {
        return sensorHistory[sensorId] ?? [];
}

export function getAllChartHistory(): ChartHistoryPoint[] {
        const times = new Set<string>();
        Object.values(sensorHistory).forEach((arr) => arr.forEach((p) => times.add(p.time)));
        const sorted = Array.from(times).sort();
        return sorted.map((time) => ({
                    time,
                    vals: SENSOR_CONFIGS.map((cfg) => {
                                    const entry = (sensorHistory[cfg.id] ?? []).find((p) => p.time === time);
                                    return entry ? entry.value : null;
                    }),
        }));
}
