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
    type ChartHistoryPoint,
} from '@/services/gasApi';

// Web Audio API - play alarm beep (5 beeps at 2500Hz)
function playAlarmBeep() {
    try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          for (let i = 0; i < 5; i++) {
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
    } catch (e) {
          console.log('Audio API error:', e);
    }
}

// Generate alerts from critical sensors
function buildAlertsFromSensors(sensors: SensorReading[]): AlertEntry[] {
    const time = new Date().toLocaleTimeString('th-TH');
    return sensors
      .filter(s => s.current > 0 && s.status === 'critical')
      .map(s => ({
              id: `${s.id}-${Date.now()}`,
              time: time,
              sensor: s.name,
              value: s.current,
              threshold: s.threshold,
              severity: 'critical' as const,
              message: `${s.name} exceeded threshold: ${s.current}°C > ${s.threshold}°C`,
      }));
}

export interface ChartData {
    labels: string[];
    datasets: (number | null)[][];
}

const MAX_CHART_POINTS = 288;

export function useSensorData(refreshInterval: number) {
    const [sensors, setSensors] = useState<SensorReading[]>([]);
    const [alerts, setAlerts] = useState<AlertEntry[]>([]);
    const [wifi, setWifi] = useState<WifiBoard[]>([]);
    const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: Array(10).fill([]) });
    const [thresholds, setThresholds] = useState<Record<string, number>>(
          Object.fromEntries(SENSOR_CONFIGS.map(s => [s.id, s.threshold]))
        );
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [dataSource, setDataSource] = useState<'mock' | 'gas'>(isGasConfigured() ? 'gas' : 'mock');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const prevCriticalRef = useRef<Set<string>>(new Set());
    const [checkDataSource] = useState(() => () => {
          setDataSource(isGasConfigured() ? 'gas' : 'mock');
    });

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
                          const labels = recentHistory.map(h => h.time);
                          const datasets = SENSOR_CONFIGS.map((_, idx) =>
                                      recentHistory.map(h => {
                                                    const v = h.vals[idx];
                                                    return (v !== null && v !== undefined && !isNaN(v as number) && (v as number) > 0) ? v as number : null;
                                      })
                                                                      );
                          setChartData({ labels, datasets });
                }
        } catch (e) {
                console.log('History load failed:', e);
        }
        setHistoryLoaded(true);
  }, []);

  const refreshFromGas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
                const result = await fetchLatestData(thresholds);
                if (result.error) throw new Error(result.error);
                if (result.sensors && result.sensors.length > 0) {
                          setSensors(result.sensors);
                          const timeLabel = new Date().toLocaleTimeString('th-TH', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                          });
                          setChartData(prev => {
                                      const newLabels = [...prev.labels, timeLabel].slice(-MAX_CHART_POINTS);
                                      const newDatasets = result.sensors.map((s, idx) => {
                                                    const prevDs = prev.datasets[idx] || [];
                                                    return [...prevDs, s.current > 0 ? s.current : null].slice(-MAX_CHART_POINTS);
                                      });
                                      return { labels: newLabels, datasets: newDatasets };
                          });
                          const currentCritical = new Set(result.sensors.filter(s => s.status === 'critical').map(s => s.id));
                          const newCritical = [...currentCritical].filter(id => !prevCriticalRef.current.has(id));
                          if (newCritical.length > 0) {
                                      const newAlerts = buildAlertsFromSensors(result.sensors.filter(s => newCritical.includes(s.id)));
                                      setAlerts(prev => [...newAlerts, ...prev].slice(0, 100));
                                      if (soundEnabled) playAlarmBeep();
                          }
                          prevCriticalRef.current = currentCritical;
                          setLastUpdated(result.timestamp ? new Date(result.timestamp) : new Date());
                }
        } catch (err) {
                setError(err instanceof Error ? err.message : 'GAS fetch failed');
                const newSensors = generateSensorReadings(thresholds);
                setSensors(newSensors);
                setLastUpdated(new Date());
        } finally {
                setLoading(false);
        }
  }, [thresholds, soundEnabled]);

  const refreshFromMock = useCallback(() => {
        const newSensors = generateSensorReadings(thresholds);
        setSensors(newSensors);
        const timeLabel = new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
        });
        setChartData(prev => {
                const newLabels = [...prev.labels, timeLabel].slice(-MAX_CHART_POINTS);
                const newDatasets = newSensors.map((s, idx) => {
                          const prevDs = prev.datasets[idx] || [];
                          return [...prevDs, s.current > 0 ? s.current : null].slice(-MAX_CHART_POINTS);
                });
                return { labels: newLabels, datasets: newDatasets };
        });
        setWifi(generateWifiBoards());
        setLastUpdated(new Date());
  }, [thresholds]);

  const refresh = useCallback(() => {
        if (dataSource === 'gas' && isGasConfigured()) {
                refreshFromGas();
        } else {
                refreshFromMock();
        }
        setWifi(generateWifiBoards());
  }, [dataSource, refreshFromGas, refreshFromMock]);

  useEffect(() => {
        refresh();
        loadHistory();
  }, [loadHistory, refresh]);

  useEffect(() => {
        if (refreshInterval <= 0) return;
        const id = setInterval(refresh, refreshInterval * 1000);
        return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  const updateThreshold = useCallback((sensorId: string, value: number) => {
        setThresholds(prev => ({ ...prev, [sensorId]: value }));
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
