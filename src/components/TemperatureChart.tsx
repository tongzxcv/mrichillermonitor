import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { SensorReading } from '@/data/mockSensors';
import type { ChartData } from '@/hooks/useSensorData';
import { SENSOR_CONFIGS } from '@/data/mockSensors';

interface TemperatureChartProps {
  sensors: SensorReading[];
  selectedSensor: string | null;
  onSelectSensor: (id: string | null) => void;
  chartData?: ChartData;
}

export default function TemperatureChart({ sensors, selectedSensor, onSelectSensor, chartData: extChartData }: TemperatureChartProps) {
  const chartData = useMemo(() => {
    if (extChartData && extChartData.labels.length > 0) {
      return extChartData.labels.map((time, i) => {
        const point: Record<string, string | number | null> = { time };
        SENSOR_CONFIGS.forEach((cfg, idx) => {
          const val = extChartData.datasets[idx]?.[i];
          point[cfg.id] = (val !== null && val !== undefined && val > 0) ? val : null;
        });
        return point;
      });
    }
    if (sensors.length === 0) return [];
    const length = sensors[0].history.length;
    return Array.from({ length }, (_, i) => {
      const point: Record<string, string | number> = { time: sensors[0].history[i].time };
      sensors.forEach(s => { point[s.id] = s.history[i]?.value ?? 0; });
      return point;
    });
  }, [sensors, extChartData]);

  return (
    <Card className="p-4 bg-card">
      <h2 className="text-sm font-semibold mb-3">📈 Temperature Trend</h2>
      <div className="rounded-lg bg-foreground/[0.03] p-3">
        <ResponsiveContainer width="100%" height={260} className="md:!h-[320px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="°C" />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            <Legend onClick={(e) => { const id = e.dataKey as string; onSelectSensor(selectedSensor === id ? null : id); }} wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }} />
            {sensors.map(s => (
              <Line key={s.id} type="monotone" dataKey={s.id} name={s.name} stroke={s.color}
                strokeWidth={selectedSensor === null || selectedSensor === s.id ? 2 : 0.5}
                opacity={selectedSensor === null || selectedSensor === s.id ? 1 : 0.2}
                dot={false} activeDot={{ r: 4 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
