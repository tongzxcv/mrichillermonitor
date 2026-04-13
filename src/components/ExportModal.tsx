import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SENSOR_CONFIGS } from '@/data/mockSensors';
import type { SensorReading } from '@/data/mockSensors';
import { getGasUrl } from '@/services/gasApi';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sensors: SensorReading[];
  dataSource: 'mock' | 'gas';
}

function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function thaiToIso(thaiDate: string): string {
  // Convert dd/mm/yyyy to yyyy-mm-dd for GAS
  const parts = thaiDate.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return thaiDate;
}

function fetchViaJsonp(targetUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = 'gasExportCb_' + Date.now();
    const script = document.createElement('script');
    const timeout = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, 30000);
    function cleanup() {
      clearTimeout(timeout);
      delete (window as any)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    (window as any)[cbName] = (data: any) => { cleanup(); resolve(data); };
    script.src = `${targetUrl}&callback=${cbName}`;
    script.onerror = () => { cleanup(); reject(new Error('JSONP script error')); };
    document.head.appendChild(script);
  });
}

export default function ExportModal({ open, onClose, sensors, dataSource }: ExportModalProps) {
  const [selected, setSelected] = useState<string[]>(SENSOR_CONFIGS.map(s => s.id));
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [exporting, setExporting] = useState(false);

  const allSelected = selected.length === SENSOR_CONFIGS.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : SENSOR_CONFIGS.map(s => s.id));
  };

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const downloadCsv = (csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chiller_data_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGas = async () => {
    setExporting(true);
    try {
      const gasUrl = getGasUrl();
      // Map sensor IDs: s1->S01, s2->S02, etc.
      const sensorIds = selected.map(id => {
        const num = id.replace('s', '');
        return 'S' + num.padStart(2, '0');
      });
      const params = new URLSearchParams({
        action: 'exportCsv',
        startDate: thaiToIso(startDate),
        endDate: thaiToIso(endDate),
        sensors: sensorIds.join(','),
      });
      const targetUrl = `${gasUrl}?${params.toString()}`;
      const data = await fetchViaJsonp(targetUrl);
      
      if (Array.isArray(data) && data.length > 0) {
        const csv = data.map((row: any[]) => row.join(',')).join('\n');
        downloadCsv(csv);
      } else {
        alert('ไม่พบข้อมูลในช่วงวันที่ที่เลือก');
      }
    } catch (err: any) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const handleExportMock = () => {
    const filteredSensors = sensors.filter(s => selected.includes(s.id));
    const cols = ['Time', ...filteredSensors.map(s => s.name)];
    const rows = sensors[0]?.history.map((_, i) => {
      const row = [sensors[0].history[i].time];
      filteredSensors.forEach(s => {
        row.push(String(s.history[i]?.value ?? ''));
      });
      return row;
    }) ?? [];

    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(csv);
    onClose();
  };

  const handleExport = () => {
    if (dataSource === 'gas') {
      handleExportGas();
    } else {
      handleExportMock();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📋 Export CSV {dataSource === 'gas' ? 'จาก Google Sheet' : ''}</DialogTitle>
          <DialogDescription>เลือกช่วงวันที่และเซ็นเซอร์ที่ต้องการ</DialogDescription>
        </DialogHeader>

        {/* Date Range */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">FROM:</span>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">TO:</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-8 text-xs" />
          </div>
        </div>

        {/* Select All */}
        <div className="bg-muted/50 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer mb-2 text-primary">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            เลือกทั้งหมด (Select All)
          </label>

          {/* Sensor Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {SENSOR_CONFIGS.map(cfg => (
              <label key={cfg.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                <Checkbox
                  checked={selected.includes(cfg.id)}
                  onCheckedChange={() => toggle(cfg.id)}
                />
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                {cfg.name}
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleExport} disabled={selected.length === 0 || exporting}>
            {exporting ? '⏳ Exporting...' : `📥 Export`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
