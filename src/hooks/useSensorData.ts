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

  const refresh = useCallback(() => {
    const newSensors = generateSensorReadings(thresholds);
    setSensors(newSensors);
    setAlerts(prev => {
      const newAlerts = generateAlerts(newSensors);
      return [...newAlerts, ...prev].slice(0, 50);
    });
    setWifi(generateWifiBoards());
    setLastUpdated(new Date());
  }, [thresholds]);

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
  };
}
