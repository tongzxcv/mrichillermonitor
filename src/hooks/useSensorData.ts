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
