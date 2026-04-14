import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { SensorReading } from '@/data/mockSensors';

interface SensorCardProps {
  sensor: SensorReading;
  isSelected: boolean;
  onClick: () => void;
}

function CircularGauge({
  value,
  max,
  color,
  status,
}: {
  value: number;
  max: number;
  color: string;
  status: string;
}) {
  const pct = Math.min(value / max, 1);
  const radius = 40;
  const circumference = 3 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct * 0.75);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        className="-rotate-[135deg] w-16 h-16 sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] tv:w-[128px] tv:h-[128px]"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
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
        <span className={`text-base sm:text-lg md:text-xl tv:text-[2rem] font-bold ${status === 'critical' ? 'animate-temp-blink' : ''}`}>
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
      className={`cursor-pointer transition-all duration-300 hover:shadow-md p-2 sm:p-3 tv:p-4 ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${
        sensor.status === 'critical' ? 'bg-destructive/10 border-destructive/30 animate-card-blink' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1 tv:mb-3">
        <div className="flex items-center gap-1 tv:gap-2 min-w-0">
          <div className="w-2 h-2 tv:w-3 tv:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sensor.color }} />
          <span className="text-[10px] sm:text-xs tv:text-base font-medium truncate max-w-[80px] sm:max-w-none">
            {sensor.name}
          </span>
        </div>
        {sensor.status === 'critical' ? (
          <Badge variant="destructive" className="text-[9px] sm:text-[10px] tv:text-xs px-1 tv:px-2 py-0 tv:py-0.5 animate-critical-badge">
            CRIT
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] sm:text-[10px] tv:text-xs px-1 tv:px-2 py-0 tv:py-0.5 text-green-600 border-green-600">
            NORMAL
          </Badge>
        )}
      </div>

      <CircularGauge value={sensor.current} max={sensor.threshold * 1.5} color={sensor.color} status={sensor.status} />

      <div className="grid grid-cols-3 gap-0.5 tv:gap-2 text-center mt-1 tv:mt-3">
        <div>
          <div className="text-[8px] sm:text-[9px] tv:text-xs text-muted-foreground">MIN</div>
          <div className="text-[9px] sm:text-[10px] tv:text-base font-medium">{sensor.min}°C</div>
        </div>
        <div>
          <div className="text-[8px] sm:text-[9px] tv:text-xs text-muted-foreground">AVG</div>
          <div className="text-[9px] sm:text-[10px] tv:text-base font-medium">{sensor.avg}°C</div>
        </div>
        <div>
          <div className="text-[8px] sm:text-[9px] tv:text-xs text-muted-foreground">MAX</div>
          <div className="text-[9px] sm:text-[10px] tv:text-base font-medium">{sensor.max}°C</div>
        </div>
      </div>

      <div className="text-center mt-0.5 tv:mt-2">
        <div className="text-[8px] sm:text-[9px] tv:text-xs text-muted-foreground">Threshold: {sensor.threshold}°C</div>
      </div>
    </Card>
  );
}
