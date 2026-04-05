import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SensorReading } from '@/data/mockSensors';

interface SensorCardProps {
  sensor: SensorReading;
  isSelected: boolean;
  onClick: () => void;
}

function CircularGauge({ value, max, color, status }: { value: number; max: number; color: string; status: string }) {
  const pct = Math.min(value / max, 1);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct * 0.75); // 270 degree arc

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-[135deg]">
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-xl font-bold ${status === 'critical' ? 'text-destructive animate-blink' : ''}`}>
          {value}°C
        </span>
      </div>
    </div>
  );
}

export default function SensorCard({ sensor, isSelected, onClick }: SensorCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer p-4 transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      } ${sensor.status === 'critical' ? 'border-destructive/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sensor.color }} />
          <span className="text-sm font-semibold truncate">{sensor.name}</span>
        </div>
        <Badge
          variant={sensor.status === 'critical' ? 'destructive' : 'default'}
          className={`text-[10px] px-1.5 py-0 ${
            sensor.status === 'critical' ? 'animate-blink' : 'bg-accent text-accent-foreground'
          }`}
        >
          {sensor.status === 'critical' ? 'CRITICAL' : 'Normal'}
        </Badge>
      </div>

      <CircularGauge
        value={sensor.current}
        max={sensor.threshold * 1.5}
        color={sensor.status === 'critical' ? 'hsl(var(--destructive))' : sensor.color}
        status={sensor.status}
      />

      <div className="grid grid-cols-3 gap-1 mt-2 text-center text-[11px]">
        <div>
          <div className="text-muted-foreground">MIN</div>
          <div className="font-semibold">{sensor.min}°C</div>
        </div>
        <div>
          <div className="text-muted-foreground">AVG</div>
          <div className="font-semibold">{sensor.avg}°C</div>
        </div>
        <div>
          <div className="text-muted-foreground">MAX</div>
          <div className="font-semibold">{sensor.max}°C</div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground text-center mt-1">
        Threshold: {sensor.threshold}°C
      </div>
    </Card>
  );
}
