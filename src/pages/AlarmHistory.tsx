import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AlertEntry } from '@/data/mockSensors';
import { clearAlarmHistory, loadAlarmHistory } from '@/lib/alarmHistory';

export default function AlarmHistory() {
  const [history, setHistory] = useState<AlertEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setHistory(loadAlarmHistory());
  }, []);

  const clearHistory = () => {
    clearAlarmHistory();
    setHistory([]);
  };

  const uniqueSensors = [...new Set(history.map(a => a.sensor))];
  const filtered = filter === 'all' ? history : history.filter(a => a.sensor === filter);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">🔔 Alarm History</h1>
        <Badge variant="outline" className="text-xs">{filtered.length} records</Badge>
        <div className="flex-1" />
        {history.length > 0 && (
          <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive" onClick={clearHistory}>
            <Trash2 className="h-3 w-3" /> Clear All
          </Button>
        )}
      </div>

      {uniqueSensors.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilter('all')}>
            All
          </Button>
          {uniqueSensors.map(s => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <Card className="p-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No alarm history recorded yet</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Sensor</TableHead>
                  <TableHead className="text-xs">Value</TableHead>
                  <TableHead className="text-xs">Threshold</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-xs text-muted-foreground">{alert.time}</TableCell>
                    <TableCell className="text-xs font-medium">{alert.sensor}</TableCell>
                    <TableCell className="text-xs">{alert.value.toFixed(1)}°C</TableCell>
                    <TableCell className="text-xs">{alert.threshold}°C</TableCell>
                    <TableCell>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {alert.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
