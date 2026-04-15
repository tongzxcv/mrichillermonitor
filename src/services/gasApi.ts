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
    // Clear existing
  SENSOR_CONFIGS.forEach(c => { sensorHistory[c.id] = []; });
    history.forEach(point => {
          SENSOR_CONFIGS.forEach((c, idx) => {
                  const val = point.vals[idx];
                  if (val !== null && val !== undefined && !isNaN(val as number)) {
                            sensorHistory[c.id].push({ time: point.time, value: val as number });
                  }
          });
    });
}

// Accept thresholds from useSensorData so user-set values are respected
export async function fetchLatestData(
    thresholds?: Record<string, number>
  ): Promise<GasLatestResponse> {
    const url = getGasUrl();
    if (!url) throw new Error('GAS URL not configured');
    const targetUrl = `${url}?action=getLatestData`;
    const data = await fetchViaJsonp(targetUrl);
    if (!data || !Array.isArray(data.sensors)) {
          throw new Error('Invalid response format from GAS');
    }
    const now = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
    });
    const sensors: SensorReading[] = data.sensors.map((s: { id: string; temp: number | null }) => {
          const config = SENSOR_CONFIGS.find(c => c.id === s.id);
          const temp = typeof s.temp === 'number' && !isNaN(s.temp) ? s.temp : 0;
          // Use user-set threshold if available, fallback to config default
                                                          const threshold = thresholds?.[s.id] ?? config?.threshold ?? 14;
          // Update rolling history
                                                          if (!sensorHistory[s.id]) sensorHistory[s.id] = [];
          if (temp > 0) {
                  sensorHistory[s.id].push({ time: now, value: temp });
                  if (sensorHistory[s.id].length > HISTORY_MAX) sensorHistory[s.id].shift();
          }
          const hist = sensorHistory[s.id];
          const values = hist.map(h => h.value).filter(v => v > 0);
          const minVal = values.length > 0 ? Math.min(...values) : temp;
          const maxVal = values.length > 0 ? Math.max(...values) : temp;
          const avgVal = values.length > 0
            ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
                  : temp;
          return {
                  id: s.id,
                  name: config?.name ?? s.id,
                  color: config?.color ?? '#888888',
                  current: temp,
                  min: minVal,
                  max: maxVal,
                  avg: avgVal,
                  threshold,
                  status: temp > 0 && temp > threshold ? 'critical' : 'normal',
                  history: [...hist],
          };
    });
    return {
          sensors,
          timestamp: new Date().toISOString(),
          wifi1: typeof data.wifi1 === 'number' ? data.wifi1 : null,
          wifi2: typeof data.wifi2 === 'number' ? data.wifi2 : null,
          wifi3: typeof data.wifi3 === 'number' ? data.wifi3 : null,
    };
}

// Fetch chart history from GAS (action=getChartHistory)
// GAS returns: [{time, vals:[s1,s2,...,s10]}, ...]
export async function fetchChartHistory(): Promise<ChartHistoryPoint[]> {
    const url = getGasUrl();
    if (!url) throw new Error('GAS URL not configured');
    const targetUrl = `${url}?action=getChartHistory`;
    const data = await fetchViaJsonp(targetUrl);
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
          time: String(row.time || '--:--'),
          vals: Array.isArray(row.vals) ? row.vals : [],
    }));
}

export async function checkGasConnection(url: string): Promise<{ ok: boolean; message: string }> {
    try {
          const targetUrl = `${url.trim()}?action=getLatestData`;
          const data = await fetchViaJsonp(targetUrl);
          if (data && data.sensors && Array.isArray(data.sensors) && data.sensors.length > 0) {
                  return { ok: true, message: `Connected! Found ${data.sensors.length} sensors` };
          }
          return { ok: false, message: 'Connected but sensors data invalid' };
    } catch (e: any) {
          return { ok: false, message: e.message || 'Connection failed' };
    }
}

function isSuccessfulActionResponse(data: any): boolean {
    if (data === true) return true;

    if (typeof data === 'string') {
          const text = data.trim().toLowerCase();
          return text === 'ok' || text === 'success' || text.includes('reboot');
    }

    if (!data || typeof data !== 'object' || data.error) {
          return false;
    }

    return data.success === true
      || data.ok === true
      || String(data.status || '').toLowerCase() === 'ok'
      || String(data.result || '').toLowerCase() === 'ok'
      || String(data.message || '').toLowerCase().includes('reboot');
}

export async function triggerRebootAll(): Promise<void> {
    const url = getGasUrl();
    if (!url) throw new Error('GAS URL not configured');

    const actionUrls = [
      `${url}?action=reboot`,
      `${url}?action=setRebootCommand`,
    ];

    let lastError: Error | null = null;

    for (const actionUrl of actionUrls) {
      try {
        const response = await fetchViaJsonp(actionUrl);
        if (isSuccessfulActionResponse(response)) {
          return;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown GAS error');
      }
    }

    throw lastError ?? new Error('Current GAS deployment does not support reboot yet');
}
