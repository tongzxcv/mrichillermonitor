import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateSensorReadings,
  generateWifiBoards,
  type SensorReading,
  type AlertEntry,
  type WifiBoard,
  SENSOR_CONFIGS,
} from '@/data/mockSensors';
import {
  isGasConfigured,
  fetchLatestData,
  fetchChartHistory,
  initSensorHistoryFromChart,
} from '@/services/gasApi';

const MAX_CHART_POINTS = 288;
const DASHBOARD_CACHE_KEY = 'dashboard_snapshot_v1';

interface ChartData {
  labels: string[];
  datasets: (number | null)[][];
}

interface DashboardSnapshot {
  sensors: SensorReading[];
  wifi: WifiBoard[];
  chartData: ChartData;
  lastUpdated: string | null;
}

function createEmptyChartData(): ChartData {
  return { labels: [], datasets: Array(10).fill([]) };
}

function loadDashboardSnapshot(): DashboardSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardSnapshot>;
    if (!Array.isArray(parsed.sensors) || !Array.isArray(parsed.wifi) || !parsed.chartData) {
      return null;
    }

    return {
      sensors: parsed.sensors as SensorReading[],
      wifi: parsed.wifi as WifiBoard[],
      chartData: parsed.chartData as ChartData,
      lastUpdated: typeof parsed.lastUpdated === 'string' ? parsed.lastUpdated : null,
    };
  } catch {
    return null;
  }
}

function saveDashboardSnapshot(snapshot: DashboardSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors to avoid blocking dashboard updates.
  }
}

function playAlarmBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < 5; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 2500;
      const startTime = ctx.currentTime + (i * 1.0);
      const stopTime = startTime + 0.5;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.setValueAtTime(0.3, stopTime - 0.01);
      gain.gain.linearRampToValueAtTime(0, stopTime);
      osc.start(startTime);
      osc.stop(stopTime);
    }
  } catch (error) {
    console.log('Audio API error:', error);
  }
}

function buildAlertsFromSensors(sensors: SensorReading[]): AlertEntry[] {
  const time = new Date().toLocaleTimeString('th-TH');
  return sensors
    .filter((sensor) => sensor.current > 0 && sensor.status === 'critical')
    .map((sensor) => ({
      id: `${sensor.id}-${Date.now()}`,
      time,
      sensor: sensor.name,
      value: sensor.current,
      threshold: sensor.threshold,
      severity: 'critical' as const,
      message: `${sensor.name} exceeded threshold: ${sensor.current}°C > ${sensor.threshold}°C`,
    }));
}

function normalizeRssi(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed >= 0) return null;
  return parsed;
}

function buildWifiBoardsFromGas(result: { wifi1?: unknown; wifi2?: unknown; wifi3?: unknown }): WifiBoard[] {
  return [
    { name: 'Board 1', rssi: normalizeRssi(result.wifi1) },
    { name: 'Board 2', rssi: normalizeRssi(result.wifi2) },
    { name: 'Board 3', rssi: normalizeRssi(result.wifi3) },
  ];
}

export function useSensorData(refreshInterval: number) {
  const cachedSnapshot = loadDashboardSnapshot();

  const [sensors, setSensors] = useState<SensorReading[]>(cachedSnapshot?.sensors ?? []);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [wifi, setWifi] = useState<WifiBoard[]>(
    cachedSnapshot?.wifi ?? [
      { name: 'Board 1', rssi: null },
      { name: 'Board 2', rssi: null },
      { name: 'Board 3', rssi: null },
    ],
  );
  const [chartData, setChartData] = useState<ChartData>(cachedSnapshot?.chartData ?? createEmptyChartData());
  const [thresholds, setThresholds] = useState<Record<string, number>>(
    Object.fromEntries(SENSOR_CONFIGS.map((sensor) => [sensor.id, sensor.threshold])),
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(
    cachedSnapshot?.lastUpdated ? new Date(cachedSnapshot.lastUpdated) : new Date(),
  );
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dataSource, setDataSource] = useState<'mock' | 'gas'>(isGasConfigured() ? 'gas' : 'mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(Boolean(cachedSnapshot?.chartData?.labels?.length));
  const [latestLoaded, setLatestLoaded] = useState(Boolean(cachedSnapshot?.sensors?.length));
  const prevCriticalRef = useRef<Set<string>>(new Set());
  const [checkDataSource] = useState(() => () => {
    setDataSource(isGasConfigured() ? 'gas' : 'mock');
  });

  const persistSnapshot = useCallback((
    nextSensors: SensorReading[],
    nextWifi: WifiBoard[],
    nextChartData: ChartData,
    updatedAt: Date,
  ) => {
    saveDashboardSnapshot({
      sensors: nextSensors,
      wifi: nextWifi,
      chartData: nextChartData,
      lastUpdated: updatedAt.toISOString(),
    });
  }, []);

  const loadHistory = useCallback(async () => {
    if (!isGasConfigured()) {
      setHistoryLoaded(true);
      return;
    }

    try {
      const history = await fetchChartHistory();
      if (history.length > 0) {
        initSensorHistoryFromChart(history);
        const recentHistory = history.slice(-MAX_CHART_POINTS);
        const labels = recentHistory.map((point) => point.time);
        const datasets = SENSOR_CONFIGS.map((_, index) => (
          recentHistory.map((point) => {
            const value = point.vals[index];
            return (
              value !== null
              && value !== undefined
              && !Number.isNaN(value as number)
              && (value as number) > 0
            )
              ? value as number
              : null;
          })
        ));

        const nextChartData = { labels, datasets };
        setChartData(nextChartData);
        persistSnapshot(sensors, wifi, nextChartData, lastUpdated);
      }
    } catch (historyError) {
      console.log('History load failed:', historyError);
    }

    setHistoryLoaded(true);
  }, [lastUpdated, persistSnapshot, sensors, wifi]);

  const refreshFromGas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchLatestData(thresholds);
      if (result.error) throw new Error(result.error);

      if (result.sensors && result.sensors.length > 0) {
        const nextSensors = result.sensors;
        const nextWifi = buildWifiBoardsFromGas(result);
        setSensors(nextSensors);
        setWifi(nextWifi);

        const updatedAt = result.timestamp ? new Date(result.timestamp) : new Date();
        const timeLabel = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setChartData((previousChart) => {
          const newLabels = [...previousChart.labels, timeLabel].slice(-MAX_CHART_POINTS);
          const newDatasets = nextSensors.map((sensor, index) => {
            const previousDataset = previousChart.datasets[index] || [];
            return [...previousDataset, sensor.current > 0 ? sensor.current : null].slice(-MAX_CHART_POINTS);
          });
          const nextChartData = { labels: newLabels, datasets: newDatasets };
          persistSnapshot(nextSensors, nextWifi, nextChartData, updatedAt);
          return nextChartData;
        });

        const currentCritical = new Set(
          nextSensors.filter((sensor) => sensor.status === 'critical').map((sensor) => sensor.id),
        );
        const newCritical = [...currentCritical].filter((id) => !prevCriticalRef.current.has(id));
        if (newCritical.length > 0) {
          const newAlerts = buildAlertsFromSensors(
            nextSensors.filter((sensor) => newCritical.includes(sensor.id)),
          );
          setAlerts((previousAlerts) => [...newAlerts, ...previousAlerts].slice(0, 100));
          if (soundEnabled) playAlarmBeep();
        }

        prevCriticalRef.current = currentCritical;
        setLastUpdated(updatedAt);
        setLatestLoaded(true);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'GAS fetch failed');
    } finally {
      setLoading(false);
    }
  }, [persistSnapshot, soundEnabled, thresholds]);

  const refreshFromMock = useCallback(() => {
    const nextSensors = generateSensorReadings(thresholds);
    const nextWifi = generateWifiBoards();
    setSensors(nextSensors);

    const timeLabel = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const updatedAt = new Date();
    setChartData((previousChart) => {
      const newLabels = [...previousChart.labels, timeLabel].slice(-MAX_CHART_POINTS);
      const newDatasets = nextSensors.map((sensor, index) => {
        const previousDataset = previousChart.datasets[index] || [];
        return [...previousDataset, sensor.current > 0 ? sensor.current : null].slice(-MAX_CHART_POINTS);
      });
      const nextChartData = { labels: newLabels, datasets: newDatasets };
      persistSnapshot(nextSensors, nextWifi, nextChartData, updatedAt);
      return nextChartData;
    });

    setWifi(nextWifi);
    setLastUpdated(updatedAt);
    setLatestLoaded(true);
    setHistoryLoaded(true);
  }, [persistSnapshot, thresholds]);

  const refresh = useCallback(() => {
    if (dataSource === 'gas' && isGasConfigured()) {
      void refreshFromGas();
    } else {
      refreshFromMock();
    }
  }, [dataSource, refreshFromGas, refreshFromMock]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (dataSource !== 'gas' || !latestLoaded || historyLoaded) return;
    void loadHistory();
  }, [dataSource, historyLoaded, latestLoaded, loadHistory]);

  useEffect(() => {
    if (refreshInterval <= 0) return undefined;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  const updateThreshold = useCallback((sensorId: string, value: number) => {
    setThresholds((previousThresholds) => ({ ...previousThresholds, [sensorId]: value }));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    sensors,
    alerts,
    clearAlerts,
    wifi,
    chartData,
    lastUpdated,
    selectedSensor,
    setSelectedSensor,
    soundEnabled,
    setSoundEnabled,
    thresholds,
    updateThreshold,
    refresh,
    dataSource,
    loading,
    error,
    historyLoaded,
    checkDataSource,
  };
}
