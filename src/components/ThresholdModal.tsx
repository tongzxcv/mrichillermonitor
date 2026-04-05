import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SENSOR_CONFIGS } from '@/data/mockSensors';
import { useState, useEffect } from 'react';

interface ThresholdModalProps {
  open: boolean;
  onClose: () => void;
  thresholds: Record<string, number>;
  onSave: (thresholds: Record<string, number>) => void;
}

export default function ThresholdModal({ open, onClose, thresholds, onSave }: ThresholdModalProps) {
  const [local, setLocal] = useState(thresholds);

  useEffect(() => {
    setLocal(thresholds);
  }, [thresholds, open]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⚙️ Threshold Settings</DialogTitle>
          <DialogDescription>ตั้งค่าอุณหภูมิสูงสุดสำหรับแต่ละ sensor</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[400px] overflow-auto pr-2">
          {SENSOR_CONFIGS.map(cfg => (
            <div key={cfg.id} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              <Label className="flex-1 text-xs">{cfg.name}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="w-20 h-8 text-xs text-right"
                  value={local[cfg.id] ?? cfg.threshold}
                  onChange={e => setLocal(prev => ({ ...prev, [cfg.id]: Number(e.target.value) }))}
                />
                <span className="text-xs text-muted-foreground">°C</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onSave(local); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
