import type { SensorReading } from '@/data/mockSensors';
import { SENSOR_CONFIGS } from '@/data/mockSensors';

const GAS_URL_KEY = 'gas_webapp_url';

export function getGasUrl(): string {
  return localStorage.getItem(GAS_URL_KEY) || '';
}

export function setGasUrl(url: string) {
  localStorage.setItem(GAS_URL_KEY, url.trim());
}

export function isGasConfigured(): boolean {
  return getGasUrl().length > 0;
}

interface GasLatestResponse {
  sensors: SensorReading[];
  timestamp: string | null;
  wifi1?: number;
  wifi2?: number;
  wifi3?: number;
  error?: string;
}

interface GasHistoryResponse {
  date: string;
  data: Record<string, string | number>[];
  error?: string;
}

// Rolling history per sensor (last 50 readings in memory)
const sensorHistory: Record<string, { time: string; value: number }[]> = {};

function fetchViaJsonp(targetUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = 'gasJsonpCb_' + Date.now();
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as any)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    (window as any)[cbName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.src = `${targetUrl}&callback=${cbName}`;
    script.onerror = () => { cleanup(); reject(new Error('JSONP script error')); };
    document.head.appendChild(script);
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

  const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const sensors: SensorReading[] = data.sensors.map((s: { id: string; temp: number | null }) => {
    const config = SENSOR_CONFIGS.find(c => c.id === s.id);
    const temp = typeof s.temp === 'number' && !isNaN(s.temp) ? s.temp : 0;

    // Use user-set threshold if available, fallback to config default
    const threshold = thresholds?.[s.id] ?? config?.threshold ?? 14;

    // Update rolling history
    if (!sensorHistory[s.id]) sensorHistory[s.id] = [];
    sensorHistory[s.id].push({ time: now, value: temp });
    if (sensorHistory[s.id].length > 50) sensorHistory[s.id].shift();

    const hist = sensorHistory[s.id];
    const values = hist.map(h => h.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
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
      status: temp > threshold ? 'critical' : 'normal',
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

export async function fetchHistoryData(date: string): Promise<GasHistoryResponse> {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');
  const targetUrl = `${url}?action=getChartHistory`;
  const data = await fetchViaJsonp(targetUrl);
  return {
    date: date,
    data: Array.isArray(data) ? data : [],
  };
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
