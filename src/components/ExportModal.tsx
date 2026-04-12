import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SENSOR_CONFIGS } from '@/data/mockSensors';
import type { SensorReading } from '@/data/mockSensors';
import { getGasUrl } from '@/services/gasApi';

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
    sensors: SensorReading[];
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ExportModal({ open, onClose, sensors }: ExportModalProps) {
    const allIds = SENSOR_CONFIGS.map(s => s.id);
    const [selected, setSelected] = useState<string[]>(allIds);
    const [fromDate, setFromDate] = useState<string>(today());
    const [toDate, setToDate] = useState<string>(today());
    const [loading, setLoading] = useState(false);

  const allSelected = selected.length === allIds.length;

  const toggleAll = () => {
        setSelected(allSelected ? [] : [...allIds]);
  };

  const toggle = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const downloadCsv = (rows: string[][], cols: string[], filename: string) => {
        const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
        setLoading(true);
        const selectedSensors = SENSOR_CONFIGS.filter(s => selected.includes(s.id));
        const cols = ['Timestamp', ...selectedSensors.map(s => s.name)];

        try {
                const gasUrl = getGasUrl();
                const url = `${gasUrl}?action=getExportData&from=${fromDate}&to=${toDate}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('fetch failed');
                const data: Record<string, string | number>[] = await res.json();

          const sensorIdToKey: Record<string, string> = {
                    t1: 't1', t2: 't2', t3: 't3', t4: 't4', t5: 't5',
                    t6: 't6', t7: 't7', t8: 't8', t9: 't9', t10: 't10',
          };

          const rows = data.map(row => {
                    const r = [String(row.time ?? '')];
                    selectedSensors.forEach(s => {
                                const key = sensorIdToKey[s.id] ?? s.id;
                                r.push(String(row[key] ?? ''));
                    });
                    return r;
          });

          downloadCsv(rows, cols, `chiller_export_${fromDate}_to_${toDate}.csv`);
                onClose();
        } catch {
                // Fallback: export from in-memory history
          const rows = sensors[0]?.history.map((_, i) => {
                    const row = [sensors[0].history[i].time];
                    sensors.filter(s => selected.includes(s.id)).forEach(s => {
                                row.push(String(s.history[i]?.value ?? ''));
                    });
                    return row;
          }) ?? [];
                downloadCsv(rows, cols, `chiller_export_local_${today()}.csv`);
                onClose();
        } finally {
                setLoading(false);
        }
  };

  return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
                <DialogContent className="max-w-md">
                        <DialogHeader>
                                  <DialogTitle>📊 Export CSV จาก Google Sheet</DialogTitle>DialogTitle>
                                  <DialogDescription>เลือกช่วงวันที่และเซ็นเซอร์ที่ต้องการ</DialogDescription>DialogDescription>
                        </DialogHeader>DialogHeader>
                
                  {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                              <Label className="text-xs font-semibold text-muted-foreground uppercase">FROM</Label>Label>
                                              <input
                                                              type="date"
                                                              value={fromDate}
                                                              onChange={e => setFromDate(e.target.value)}
                                                              max={toDate}
                                                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            />
                                  </div>div>
                                  <div className="space-y-1">
                                              <Label className="text-xs font-semibold text-muted-foreground uppercase">TO</Label>Label>
                                              <input
                                                              type="date"
                                                              value={toDate}
                                                              onChange={e => setToDate(e.target.value)}
                                                              min={fromDate}
                                                              max={today()}
                                                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            />
                                  </div>div>
                        </div>div>
                
                  {/* Select All */}
                        <div className="border-t pt-2">
                                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-2">
                                              <Checkbox
                                                              checked={allSelected}
                                                              onCheckedChange={toggleAll}
                                                            />
                                              <span>เลือกทั้งหมด (Select All)</span>span>
                                  </label>label>
                        
                          {/* Sensor grid */}
                                  <div className="grid grid-cols-2 gap-1 max-h-[220px] overflow-auto">
                                    {SENSOR_CONFIGS.map(cfg => (
                        <label key={cfg.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                                        <Checkbox
                                                            checked={selected.includes(cfg.id)}
                                                            onCheckedChange={() => toggle(cfg.id)}
                                                          />
                                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                                        <span className="truncate">{cfg.name}</span>span>
                        </label>label>
                      ))}
                                  </div>div>
                        </div>div>
                
                        <DialogFooter>
                                  <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>Button>
                                  <Button size="sm" onClick={handleExport} disabled={selected.length === 0 || loading}>
                                    {loading ? 'Exporting...' : `📥 Export`}
                                  </Button>Button>
                        </DialogFooter>DialogFooter>
                </DialogContent>DialogContent>
        </Dialog>Dialog>
      );
}</DialogContent>
