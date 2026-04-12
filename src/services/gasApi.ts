import type { SensorReading } from '@/data/mockSensors';

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

export async function fetchLatestData(): Promise<GasLatestResponse> {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');
  const targetUrl = `${url}?action=getLatestData`;
  const data = await fetchViaJsonp(targetUrl);
  if (data && data.sensors && Array.isArray(data.sensors)) {
    return {
      sensors: data.sensors,
      timestamp: new Date().toISOString(),
      wifi1: data.wifi1,
      wifi2: data.wifi2,
      wifi3: data.wifi3,
    };
  }
  throw new Error('Invalid response format from GAS');
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
