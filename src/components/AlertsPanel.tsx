import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Volume2, VolumeX } from 'lucide-react';
import type { AlertEntry } from '@/data/mockSensors';

interface AlertsPanelProps {
  alerts: AlertEntry[];
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function AlertsPanel({ alerts, soundEnabled, onToggleSound }: AlertsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? alerts : alerts.slice(0, 5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">🔔 Recent Alerts ({alerts.length})</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleSound}>
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          {alerts.length > 5 && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show Less' : `View All (${alerts.length})`}
            </Button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">✅ No alerts — all sensors normal</p>
      ) : (
        <div className="overflow-auto max-h-64">
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
              {displayed.map(a => (
                <TableRow
                  key={a.id}
                  className={a.severity === 'critical' ? 'animate-blink bg-destructive/10' : ''}
                >
                  <TableCell className="text-xs">{a.time}</TableCell>
                  <TableCell className="text-xs font-medium">{a.sensor}</TableCell>
                  <TableCell className="text-xs">{a.value.toFixed(1)}°C</TableCell>
                  <TableCell className="text-xs">{a.threshold}°C</TableCell>
                  <TableCell>
                    <Badge
                      variant={a.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {a.severity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
