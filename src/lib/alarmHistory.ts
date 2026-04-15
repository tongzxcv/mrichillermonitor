import type { AlertEntry } from '@/data/mockSensors';

const STORAGE_KEY = 'alarm-history';

export function loadAlarmHistory(): AlertEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlarmsToHistory(alerts: AlertEntry[]) {
  if (alerts.length === 0) return;
  try {
    const existing = loadAlarmHistory();
    const existingIds = new Set(existing.map((alert) => alert.id));
    const newOnes = alerts.filter((alert) => !existingIds.has(alert.id));
    if (newOnes.length === 0) return;
    const merged = [...newOnes, ...existing].slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // storage full
  }
}

export function clearAlarmHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
