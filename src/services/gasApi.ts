import type { SensorReading } from '@/data/mockSensors';
import { SENSOR_CONFIGS } from '@/data/mockSensors';

const HARDCODED_GAS_URL = 'https://script.google.com/macros/s/AKfycbypCLMU0k37UTqLh0vb0tQEr3YToc3bWwlHOoFaGpyOMUWvtQ2IC7TIPi4KjsH71TiF/exec';
const TRUSTED_GAS_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[-\w]+\/exec$/i;
const REBOOT_AUTH_STORAGE_KEY = 'reboot_auth_token';
const HISTORY_MAX = 288;

type GasQueryParams = Record<string, string | number | boolean | null | undefined>;

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

const sensorHistory: Record<string, { time: string; value: number }[]> = {};

function assertTrustedGasUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (!TRUSTED_GAS_URL_PATTERN.test(trimmed)) {
    throw new Error('Invalid GAS URL. Only trusted Google Apps Script web app URLs are allowed.');
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    throw new Error('Invalid GAS URL host.');
  }

  return parsed.toString();
}

export function getGasUrl(): string {
  return assertTrustedGasUrl(HARDCODED_GAS_URL);
}

export function isGasConfigured(): boolean {
  return true;
}

export function getStoredRebootAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(REBOOT_AUTH_STORAGE_KEY) || '';
}

export function setStoredRebootAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  const normalized = String(token || '').trim();
  if (!normalized) {
    sessionStorage.removeItem(REBOOT_AUTH_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(REBOOT_AUTH_STORAGE_KEY, normalized);
}

function buildGasActionUrl(action: string, params: GasQueryParams = {}): string {
  const gasUrl = getGasUrl();
  const url = new URL(gasUrl);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function fetchViaJsonp<T>(trustedUrl: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `gasJsonpCb_${Date.now()}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as unknown as Record<string, unknown>)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    (window as unknown as Record<string, unknown>)[cbName] = (data: unknown) => {
      cleanup();
      resolve(data as T);
    };

    const separator = trustedUrl.includes('?') ? '&' : '?';
    script.src = `${assertTrustedGasUrl(trustedUrl)}${separator}callback=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP script error'));
    };
    document.head.appendChild(script);
  });
}

export function fetchGasActionJsonp<T>(action: string, params: GasQueryParams = {}): Promise<T> {
  return fetchViaJsonp<T>(buildGasActionUrl(action, params));
}

export function initSensorHistoryFromChart(history: ChartHistoryPoint[]) {
  SENSOR_CONFIGS.forEach((config) => {
    sensorHistory[config.id] = [];
  });

  history.forEach((point) => {
    SENSOR_CONFIGS.forEach((config, index) => {
      const val = point.vals[index];
      if (val !== null && val !== undefined && !isNaN(val as number)) {
        sensorHistory[config.id].push({ time: point.time, value: val as number });
      }
    });
  });
}

export async function fetchLatestData(
  thresholds?: Record<string, number>,
): Promise<GasLatestResponse> {
  const data = await fetchGasActionJsonp<GasLatestResponse>('getLatestData');
  if (!data || !Array.isArray(data.sensors)) {
    throw new Error('Invalid response format from GAS');
  }

  const now = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const sensors: SensorReading[] = data.sensors.map((sensor: { id: string; temp: number | null }) => {
    const config = SENSOR_CONFIGS.find((entry) => entry.id === sensor.id);
    const temp = typeof sensor.temp === 'number' && !isNaN(sensor.temp) ? sensor.temp : 0;
    const threshold = thresholds?.[sensor.id] ?? config?.threshold ?? 14;

    if (!sensorHistory[sensor.id]) sensorHistory[sensor.id] = [];
    if (temp > 0) {
      sensorHistory[sensor.id].push({ time: now, value: temp });
      if (sensorHistory[sensor.id].length > HISTORY_MAX) sensorHistory[sensor.id].shift();
    }

    const history = sensorHistory[sensor.id];
    const values = history.map((item) => item.value).filter((value) => value > 0);
    const minVal = values.length > 0 ? Math.min(...values) : temp;
    const maxVal = values.length > 0 ? Math.max(...values) : temp;
    const avgVal = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : temp;

    return {
      id: sensor.id,
      name: config?.name ?? sensor.id,
      color: config?.color ?? '#888888',
      current: temp,
      min: minVal,
      max: maxVal,
      avg: avgVal,
      threshold,
      status: temp > 0 && temp > threshold ? 'critical' : 'normal',
      history: [...history],
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

export async function fetchChartHistory(): Promise<ChartHistoryPoint[]> {
  const data = await fetchGasActionJsonp<unknown[]>('getChartHistory');
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    time: String(row.time || '--:--'),
    vals: Array.isArray(row.vals) ? row.vals : [],
  }));
}

export async function checkGasConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const data = await fetchGasActionJsonp<GasLatestResponse>('getLatestData');
    if (data && Array.isArray(data.sensors) && data.sensors.length > 0) {
      return { ok: true, message: `Connected! Found ${data.sensors.length} sensors` };
    }
    return { ok: false, message: 'Connected but sensors data invalid' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}

function isSuccessfulActionResponse(data: unknown): boolean {
  if (data === true) return true;

  if (typeof data === 'string') {
    const text = data.trim().toLowerCase();
    return text === 'ok' || text === 'success' || text.includes('reboot');
  }

  if (!data || typeof data !== 'object' || (data as { error?: unknown }).error) {
    return false;
  }

  const result = data as {
    success?: boolean;
    ok?: boolean;
    status?: string;
    result?: string;
    message?: string;
  };

  return result.success === true
    || result.ok === true
    || String(result.status || '').toLowerCase() === 'ok'
    || String(result.result || '').toLowerCase() === 'ok'
    || String(result.message || '').toLowerCase().includes('reboot');
}

function getActionErrorMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    const text = data.trim();
    if (!text) return null;
    return isSuccessfulActionResponse(text) ? null : text;
  }

  if (typeof data !== 'object') return null;

  const result = data as {
    error?: unknown;
    message?: unknown;
    status?: unknown;
  };

  if (typeof result.error === 'string' && result.error.trim()) {
    return result.error.trim();
  }

  if (
    typeof result.message === 'string'
    && result.message.trim()
    && String(result.status || '').toLowerCase() !== 'ok'
    && !isSuccessfulActionResponse(data)
  ) {
    return result.message.trim();
  }

  return null;
}

export async function triggerRebootAll(authToken: string): Promise<void> {
  const normalizedToken = String(authToken || '').trim();
  if (!normalizedToken) {
    throw new Error('Reboot token is required');
  }

  setStoredRebootAuthToken(normalizedToken);

  const actions = ['reboot', 'setRebootCommand'];
  let lastError: Error | null = null;

  for (const action of actions) {
    try {
      const response = await fetchGasActionJsonp<unknown>(action, { authToken: normalizedToken });
      if (isSuccessfulActionResponse(response)) {
        return;
      }

      const actionError = getActionErrorMessage(response);
      if (actionError) {
        throw new Error(actionError);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown GAS error');
    }
  }

  throw lastError ?? new Error('Current GAS deployment does not support secure reboot yet');
}
