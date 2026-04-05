export interface SensorConfig {
  id: string;
  name: string;
  color: string;
  threshold: number;
}

export interface SensorReading {
  id: string;
  name: string;
  color: string;
  current: number;
  min: number;
  max: number;
  avg: number;
  threshold: number;
  status: 'normal' | 'critical';
  history: { time: string; value: number }[];
}

export interface AlertEntry {
  id: string;
  time: string;
  sensor: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface WifiBoard {
  name: string;
  rssi: number;
}

export const SENSOR_CONFIGS: SensorConfig[] = [
  { id: 's1', name: 'Chiller Supply', color: '#29b6f6', threshold: 25 },
  { id: 's2', name: 'Chiller Return', color: '#00c897', threshold: 28 },
  { id: 's3', name: 'Room Ambient', color: '#ff7043', threshold: 26 },
  { id: 's4', name: 'MRI Bore', color: '#ab47bc', threshold: 22 },
  { id: 's5', name: 'Compressor In', color: '#ffa726', threshold: 30 },
  { id: 's6', name: 'Compressor Out', color: '#ef5350', threshold: 45 },
  { id: 's7', name: 'Condenser Air', color: '#26c6da', threshold: 35 },
  { id: 's8', name: 'Evaporator', color: '#66bb6a', threshold: 20 },
  { id: 's9', name: 'Helium Comp.', color: '#5c6bc0', threshold: 24 },
  { id: 's10', name: 'Cold Head', color: '#ec407a', threshold: 18 },
];

const SENSOR_BASES = [18, 22, 24, 17, 25, 38, 30, 14, 20, 12];

function randomInRange(base: number, range: number) {
  return +(base + (Math.random() - 0.5) * range).toFixed(1);
}

function generateHistory(base: number, points = 20): { time: string; value: number }[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now - (points - 1 - i) * 60000);
    return {
      time: t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      value: randomInRange(base, 4),
    };
  });
}

export function generateSensorReadings(thresholds?: Record<string, number>): SensorReading[] {
  return SENSOR_CONFIGS.map((cfg, i) => {
    const base = SENSOR_BASES[i];
    const th = thresholds?.[cfg.id] ?? cfg.threshold;
    const history = generateHistory(base);
    const values = history.map(h => h.value);
    const current = values[values.length - 1];
    return {
      id: cfg.id,
      name: cfg.name,
      color: cfg.color,
      current,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
      threshold: th,
      status: current > th ? 'critical' : 'normal',
      history,
    };
  });
}

export function generateAlerts(sensors: SensorReading[]): AlertEntry[] {
  const alerts: AlertEntry[] = [];
  const now = new Date();
  sensors.forEach(s => {
    if (s.status === 'critical') {
      alerts.push({
        id: `alert-${s.id}-${Date.now()}`,
        time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        sensor: s.name,
        value: s.current,
        threshold: s.threshold,
        severity: s.current > s.threshold + 5 ? 'critical' : 'warning',
        message: `${s.name} exceeded threshold: ${s.current}°C > ${s.threshold}°C`,
      });
    }
  });
  // Add some past fake alerts
  for (let i = 0; i < 3; i++) {
    const pastTime = new Date(now.getTime() - (i + 1) * 300000);
    const randomSensor = sensors[Math.floor(Math.random() * sensors.length)];
    alerts.push({
      id: `alert-past-${i}`,
      time: pastTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sensor: randomSensor.name,
      value: randomSensor.threshold + Math.random() * 3,
      threshold: randomSensor.threshold,
      severity: i === 0 ? 'critical' : 'warning',
      message: `${randomSensor.name} exceeded threshold`,
    });
  }
  return alerts;
}

export function generateWifiBoards(): WifiBoard[] {
  return [
    { name: 'Board 1', rssi: -Math.floor(Math.random() * 30 + 40) },
    { name: 'Board 2', rssi: -Math.floor(Math.random() * 30 + 40) },
    { name: 'Board 3', rssi: -Math.floor(Math.random() * 30 + 40) },
  ];
}
