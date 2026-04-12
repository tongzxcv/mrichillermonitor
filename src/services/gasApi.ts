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
  error?: string;
}

interface GasHistoryResponse {
  date: string;
  data: Record<string, string | number>[];
  error?: string;
}

export async function fetchLatestData(): Promise<GasLatestResponse> {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  const res = await fetch(`${url}?action=latest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistoryData(date: string): Promise<GasHistoryResponse> {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  const res = await fetch(`${url}?action=history&date=${date}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
