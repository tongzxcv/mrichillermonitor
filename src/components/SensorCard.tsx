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
      <svg width="80" height="80" viewBox="0 0 100 100" className="-rotate-[135deg] w-16 h-16 sm:w-20 sm:h-20 md:w-[100px] md:h-[100px]">
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
        <span className={`text-base sm:text-lg md:text-xl font-bold ${status === 'critical' ? 'text-destructive animate-blink' : ''}`}>
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
      className={`cursor-pointer p-2 sm:p-3 md:p-4 transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      } ${sensor.status === 'critical' ? 'border-destructive/50 animate-blink' : ''}`}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0" style={{ backgroundColor: sensor.color }} />
          <span className="text-[11px] sm:text-xs md:text-sm font-semibold truncate">{sensor.name}</span>
        </div>
        <Badge
          variant={sensor.status === 'critical' ? 'destructive' : 'default'}
          className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 shrink-0 ${
            sensor.status === 'critical' ? 'animate-blink' : 'bg-accent text-accent-foreground'
          }`}
        >
          {sensor.status === 'critical' ? 'CRIT' : 'NORMAL'}
        </Badge>
      </div>

      <CircularGauge
        value={sensor.current}
        max={sensor.threshold * 1.5}
        color={sensor.status === 'critical' ? 'hsl(var(--destructive))' : sensor.color}
        status={sensor.status}
      />

      <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-1 sm:mt-2 text-center text-[9px] sm:text-[11px]">
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

      <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center mt-0.5 sm:mt-1">
        TH: {sensor.threshold}°C
      </div>
    </Card>
  );
}
