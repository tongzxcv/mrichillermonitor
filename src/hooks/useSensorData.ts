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

  const refreshFromGas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLatestData();
      if (result.error) throw new Error(result.error);
      if (result.sensors && result.sensors.length > 0) {
        setSensors(result.sensors);
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
  }, [thresholds]);

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

  const checkDataSource = useCallback(() => {
    setDataSource(isGasConfigured() ? 'gas' : 'mock');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  const updateThreshold = (sensorId: string, value: number) => {
    setThresholds(prev => ({ ...prev, [sensorId]: value }));
  };

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
