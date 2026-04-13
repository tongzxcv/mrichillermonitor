import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SENSOR_CONFIGS } from '@/data/mockSensors';
import type { SensorReading } from '@/data/mockSensors';
import { getGasUrl } from '@/services/gasApi';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  sensors: SensorReading[];
  dataSource: 'mock' | 'gas';
}

type CsvRow = Record<string, unknown>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toDateValue(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toApiDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function fetchViaJsonp(targetUrl: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cbName = `gasExportCb_${Date.now()}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as Window & Record<string, unknown>)[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    (window as Window & Record<string, unknown>)[cbName] = (data: unknown) => {
      cleanup();
      resolve(data);
    };

    script.src = `${targetUrl}&callback=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP script error'));
    };
    document.head.appendChild(script);
  });
}

function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvFromArrays(rows: unknown[][]) {
  return rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
}

function buildCsvFromObjects(rows: CsvRow[], selectedIds: string[]) {
  const preferredColumns = ['timestamp', 'time'];
  const sensorColumns = selectedIds.filter(id => rows.some(row => row[id] !== undefined));
  const extraColumns = Array.from(new Set(
    rows.flatMap(row => Object.keys(row)).filter(key => !preferredColumns.includes(key) && !sensorColumns.includes(key))
  ));
  const columns = [
    ...preferredColumns.filter(key => rows.some(row => row[key] !== undefined)),
    ...sensorColumns,
    ...extraColumns,
  ];

  if (columns.length === 0) return '';

  return [
    columns.join(','),
    ...rows.map(row => columns.map(column => escapeCsvValue(row[column])).join(',')),
  ].join('\n');
}

function normalizeExportCsv(data: unknown, selectedIds: string[]) {
  if (typeof data === 'string') {
    return data;
  }

  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { rows?: unknown[] }).rows)
      ? (data as { rows: unknown[] }).rows
      : [];

  if (rows.length === 0) return '';

  if (Array.isArray(rows[0])) {
    return buildCsvFromArrays(rows as unknown[][]);
  }

  if (rows[0] && typeof rows[0] === 'object') {
    const firstRowKeys = Object.keys(rows[0] as CsvRow);
    const onlyTimestampColumns = firstRowKeys.length > 0 && firstRowKeys.every(key => key === 'timestamp' || key === 'time');
    if (onlyTimestampColumns) {
      throw new Error('Export response does not include sensor columns. Please update the Google Apps Script backend.');
    }
    return buildCsvFromObjects(rows as CsvRow[], selectedIds);
  }

  return '';
}

export default function ExportModal({ open, onClose, sensors, dataSource }: ExportModalProps) {
  const [selected, setSelected] = useState<string[]>(SENSOR_CONFIGS.map(sensor => sensor.id));
  const [startDate, setStartDate] = useState<Date>(() => toDateValue(todayStr()));
  const [endDate, setEndDate] = useState<Date>(() => toDateValue(todayStr()));
  const [exporting, setExporting] = useState(false);

  const allSelected = selected.length === SENSOR_CONFIGS.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : SENSOR_CONFIGS.map(sensor => sensor.id));
  };

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const downloadCsv = (csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chiller_data_${toApiDate(startDate)}_to_${toApiDate(endDate)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGas = async () => {
    setExporting(true);
    try {
      const gasUrl = getGasUrl();
      const sensorIds = selected.map(id => `S${id.replace('s', '').padStart(2, '0')}`);
      const params = new URLSearchParams({
        action: 'exportCsv',
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
        sensors: sensorIds.join(','),
      });
      const data = await fetchViaJsonp(`${gasUrl}?${params.toString()}`);
      const csv = normalizeExportCsv(data, selected);

      if (!csv) {
        alert('No data found for the selected date range.');
        return;
      }

      downloadCsv(csv);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Export failed: ${message}`);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const handleExportMock = () => {
    const filteredSensors = sensors.filter(sensor => selected.includes(sensor.id));
    const headers = ['time', ...filteredSensors.map(sensor => sensor.id)];
    const rows = sensors[0]?.history.map((_, index) => {
      const row = [sensors[0].history[index].time];
      filteredSensors.forEach(sensor => {
        row.push(String(sensor.history[index]?.value ?? ''));
      });
      return row;
    }) ?? [];

    const csv = [
      ['time', ...filteredSensors.map(sensor => sensor.name)].join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(',')),
    ].join('\n');

    if (headers.length > 0) {
      downloadCsv(csv);
    }
    onClose();
  };

  const handleExport = () => {
    if (dataSource === 'gas') {
      void handleExportGas();
      return;
    }
    handleExportMock();
  };

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export CSV {dataSource === 'gas' ? 'from Google Sheet' : ''}</DialogTitle>
          <DialogDescription>Select a date range and the sensors you want to export.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">FROM:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-8 w-full justify-between text-xs font-normal', !startDate && 'text-muted-foreground')}
                >
                  {format(startDate, 'dd/MM/yyyy')}
                  <CalendarIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (!date) return;
                    setStartDate(date);
                    if (date > endDate) setEndDate(date);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">TO:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('h-8 w-full justify-between text-xs font-normal', !endDate && 'text-muted-foreground')}
                >
                  {format(endDate, 'dd/MM/yyyy')}
                  <CalendarIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (!date) return;
                    setEndDate(date < startDate ? startDate : date);
                  }}
                  disabled={(date) => date > new Date() || date < startDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer mb-2 text-primary">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            Select all sensors
          </label>

          <div className="grid grid-cols-2 gap-1.5">
            {SENSOR_CONFIGS.map(config => (
              <label key={config.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                <Checkbox
                  checked={selected.includes(config.id)}
                  onCheckedChange={() => toggle(config.id)}
                />
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
                {config.name}
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleExport} disabled={selected.length === 0 || exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
