import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AlertEntry } from '@/data/mockSensors';

interface AlertsPanelProps {
  alerts: AlertEntry[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClearAlerts: () => void;
}

export default function AlertsPanel({ alerts, soundEnabled, onToggleSound, onClearAlerts }: AlertsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? alerts : alerts.slice(0, 5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Recent Alerts ({alerts.length})</h2>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onClearAlerts}>
              🗑️ Clear
            </Button>
          )}
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
        <p className="text-sm text-muted-foreground text-center py-6">No alerts - all sensors normal</p>
      ) : (
        <div className="max-h-64 overflow-y-auto overflow-x-hidden">
          <Table className="hidden md:table table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[42%]">Sensor</TableHead>
                <TableHead className="text-xs w-[22%]">Value</TableHead>
                <TableHead className="text-xs w-[36%]">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map(alert => (
                <TableRow
                  key={alert.id}
                  className={alert.severity === 'critical' ? 'animate-blink bg-destructive/10' : ''}
                >
                  <TableCell className="text-xs font-medium whitespace-normal break-words leading-snug">
                    {alert.sensor}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{alert.value.toFixed(1)}°C</TableCell>
                  <TableCell>
                    <Badge
                      variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {alert.severity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="md:hidden space-y-2">
            {displayed.map(alert => (
              <div
                key={alert.id}
                className={`rounded-md border p-2 text-[11px] space-y-1 ${
                  alert.severity === 'critical'
                    ? 'animate-blink bg-destructive/10 border-destructive/30'
                    : 'border-border'
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium leading-snug">{alert.sensor}</span>
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-[9px] px-1 py-0 shrink-0"
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center justify-between gap-2">
                  <span>{alert.time}</span>
                  <span>{alert.value.toFixed(1)}°C</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
