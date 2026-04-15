import { useMemo } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
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

export default function TemperatureChart({
  sensors,
  selectedSensor,
  onSelectSensor,
  chartData: extChartData,
}: TemperatureChartProps) {
  const chartData = useMemo(() => {
    if (extChartData && extChartData.labels.length > 0) {
      return extChartData.labels.map((time, index) => {
        const point: Record<string, string | number | null> = { time };
        SENSOR_CONFIGS.forEach((config, datasetIndex) => {
          const value = extChartData.datasets[datasetIndex]?.[index];
          point[config.id] = (value !== null && value !== undefined && value > 0) ? value : null;
        });
        return point;
      });
    }

    if (sensors.length === 0) return [];

    const length = sensors[0].history.length;
    return Array.from({ length }, (_, index) => {
      const point: Record<string, string | number> = { time: sensors[0].history[index].time };
      sensors.forEach((sensor) => {
        point[sensor.id] = sensor.history[index]?.value ?? 0;
      });
      return point;
    });
  }, [sensors, extChartData]);

  const usablePointCount = useMemo(() => (
    chartData.filter((point) => (
      sensors.some((sensor) => typeof point[sensor.id] === 'number' && Number.isFinite(point[sensor.id]))
    )).length
  ), [chartData, sensors]);

  const yAxisDomain = useMemo(() => {
    const activeSensorIds = selectedSensor ? [selectedSensor] : sensors.map((sensor) => sensor.id);
    const values: number[] = [];

    chartData.forEach((point) => {
      activeSensorIds.forEach((sensorId) => {
        const value = point[sensorId];
        if (typeof value === 'number' && Number.isFinite(value)) {
          values.push(value);
        }
      });
    });

    if (values.length === 0) {
      return [0, 20] as [number, number];
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max(0.5, (maxValue - minValue) * 0.1);
    const domainMin = Math.floor((minValue - padding) * 10) / 10;
    const domainMax = Math.ceil((maxValue + padding) * 10) / 10;

    if (domainMin === domainMax) {
      return [domainMin - 1, domainMax + 1] as [number, number];
    }

    return [domainMin, domainMax] as [number, number];
  }, [chartData, selectedSensor, sensors]);

  return (
    <Card className="p-4 bg-card">
      <h2 className="text-sm font-semibold mb-3">Temperature Trend</h2>
      <div className="rounded-lg bg-foreground/[0.03] p-3">
        {usablePointCount < 2 ? (
          <div className="flex h-[260px] items-center justify-center rounded-md text-sm text-muted-foreground md:h-[320px]">
            กำลังสะสมข้อมูล Temperature Trend...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260} className="md:!h-[320px]">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                unit="ยฐC"
                domain={yAxisDomain}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend
                onClick={(event) => {
                  const id = event.dataKey as string;
                  onSelectSensor(selectedSensor === id ? null : id);
                }}
                wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }}
              />
              {sensors.map((sensor) => (
                <Line
                  key={sensor.id}
                  type="monotone"
                  dataKey={sensor.id}
                  name={sensor.name}
                  stroke={sensor.color}
                  strokeWidth={selectedSensor === null || selectedSensor === sensor.id ? 2 : 0.5}
                  opacity={selectedSensor === null || selectedSensor === sensor.id ? 1 : 0.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
