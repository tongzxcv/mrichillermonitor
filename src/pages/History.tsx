import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SENSOR_CONFIGS } from '@/data/mockSensors';

function generateHistoryData(date: Date) {
  const points = 48; // every 30 min
  return Array.from({ length: points }, (_, i) => {
    const hour = Math.floor(i / 2);
    const min = (i % 2) * 30;
    const timeLabel = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const row: Record<string, string | number> = { time: timeLabel };
    SENSOR_CONFIGS.forEach((cfg, idx) => {
      const base = [10, 12, 10, 12, 10, 12, 8, 12, 8, 12][idx];
      const dayOffset = date.getDay() * 0.3;
      row[cfg.id] = +(base + Math.sin((i + idx * 3) / 6) * 2 + dayOffset + (Math.random() - 0.5)).toFixed(1);
    });
    return row;
  });
}

export default function History() {
  const [date, setDate] = useState<Date>(new Date());

  const chartData = useMemo(() => generateHistoryData(date), [date]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">📊 Temperature History</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-[200px] justify-start text-left text-sm')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card className="p-4 bg-card">
        <h2 className="text-sm font-semibold mb-3">
          อุณหภูมิรายวัน — {format(date, 'dd/MM/yyyy')}
        </h2>
        <div className="rounded-lg bg-foreground/[0.03] p-3">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={5} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="°C" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {SENSOR_CONFIGS.map(cfg => (
                <Line
                  key={cfg.id}
                  type="monotone"
                  dataKey={cfg.id}
                  name={cfg.name}
                  stroke={cfg.color}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
