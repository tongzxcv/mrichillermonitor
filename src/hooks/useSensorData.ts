import { useState, useEffect, useCallback } from 'react';
import {
  generateSensorReadings,
  generateAlerts,
  generateWifiBoards,
  type SensorReading,
  type AlertEntry,
  type WifiBoard,
  SENSOR_CONFIGS,
} from '@/data/mockSensors';
import { isGasConfigured, fetchLatestData } from '@/services/gasApi';

// Web Audio API - play alarm beep
function playAlarmBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio not supported
  }
}

export function useSensorData(refreshInterval: number) {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [wifi, setWifi] = useState<WifiBoard[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>(
    Object.fromEntries(SENSOR_CONFIGS.map(s => [s.id, s.threshold]))
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dataSource, setDataSource] = useState<'mock' | 'gas'>(isGasConfigured() ? 'gas' : 'mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkDataSource] = useState(() => () => {
    setDataSource(isGasConfigured() ? 'gas' : 'mock');
  });

  const refreshFromGas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass current thresholds so GAS response uses user-set values
      const result = await fetchLatestData(thresholds);
      if (result.error) throw new Error(result.error);
      if (result.sensors && result.sensors.length > 0) {
        setSensors(result.sensors);

        // Play sound if any critical sensor and sound is enabled
        const hasCritical = result.sensors.some(s => s.status === 'critical');
        if (hasCritical && soundEnabled) {
          playAlarmBeep();
        }

        setAlerts(prev => {
          const newAlerts = generateAlerts(result.sensors);
          return [...newAlerts, ...prev].slice(0, 50);
        });
        setLastUpdated(result.timestamp ? new Date(result.timestamp) : new Date());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GAS fetch failed');
      // Fallback to mock
      const newSensors = generateSensorReadings(thresholds);
      setSensors(newSensors);
      setAlerts(prev => {
        const newAlerts = generateAlerts(newSensors);
        return [...newAlerts, ...prev].slice(0, 50);
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [thresholds, soundEnabled]);

  const refreshFromMock = useCallback(() => {
    const newSensors = generateSensorReadings(thresholds);
    setSensors(newSensors);
    setAlerts(prev => {
      const newAlerts = generateAlerts(newSensors);
      return [...newAlerts, ...prev].slice(0, 50);
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
    // Always update wifi from mock (GAS doesn't provide it)
    setWifi(generateWifiBoards());
  }, [dataSource, refreshFromGas, refreshFromMock]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  const updateThreshold = useCallback((sensorId: string, value: number) => {
    setThresholds(prev => ({ ...prev, [sensorId]: value }));
  }, []);

  return {
    sensors,
    alerts,
    wifi,
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
    checkDataSource,
  };
}
