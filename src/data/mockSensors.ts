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
  { id: 's1', name: 'Supply MRI', color: '#29b6f6', threshold: 12 },
  { id: 's2', name: 'Return MRI', color: '#66bb6a', threshold: 14 },
  { id: 's3', name: 'Exchange Supply', color: '#ffa726', threshold: 12 },
  { id: 's4', name: 'Exchange Return', color: '#ab47bc', threshold: 14 },
  { id: 's5', name: 'Supply Main Chiller', color: '#7e57c2', threshold: 12 },
  { id: 's6', name: 'Return Main Chiller', color: '#26c6da', threshold: 14 },
  { id: 's7', name: 'Supply OR', color: '#d4e157', threshold: 10 },
  { id: 's8', name: 'Return OR', color: '#00c897', threshold: 14 },
  { id: 's9', name: 'Supply Header', color: '#5c6bc0', threshold: 10 },
  { id: 's10', name: 'Return Header', color: '#ec407a', threshold: 14 },
];

const SENSOR_BASES = [10, 12, 10, 12, 10, 12, 8, 12, 8, 12];

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
