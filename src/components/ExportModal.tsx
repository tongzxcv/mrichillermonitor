import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SENSOR_CONFIGS } from '@/data/mockSensors';
import type { SensorReading } from '@/data/mockSensors';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sensors: SensorReading[];
}

export default function ExportModal({ open, onClose, sensors }: ExportModalProps) {
  const [selected, setSelected] = useState<string[]>(SENSOR_CONFIGS.map(s => s.id));

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleExport = () => {
    const cols = ['Time', ...sensors.filter(s => selected.includes(s.id)).map(s => s.name)];
    const rows = sensors[0]?.history.map((_, i) => {
      const row = [sensors[0].history[i].time];
      sensors.filter(s => selected.includes(s.id)).forEach(s => {
        row.push(String(s.history[i]?.value ?? ''));
      });
      return row;
    }) ?? [];

    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chiller_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>📥 Export CSV</DialogTitle>
          <DialogDescription>เลือก sensor ที่ต้องการ export</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 max-h-[300px] overflow-auto">
          {SENSOR_CONFIGS.map(cfg => (
            <label key={cfg.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selected.includes(cfg.id)}
                onCheckedChange={() => toggle(cfg.id)}
              />
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.name}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleExport} disabled={selected.length === 0}>
            Export ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
