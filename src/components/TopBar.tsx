import { Wifi, Volume2, VolumeX, Settings, Download, RefreshCw, History, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { WifiBoard } from '@/data/mockSensors';

interface TopBarProps {
  lastUpdated: Date;
  wifi: WifiBoard[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  refreshInterval: number;
  onIntervalChange: (val: number) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenGasConfig: () => void;
  onReboot: () => void;
  dataSource: 'mock' | 'gas';
  loading: boolean;
}

function rssiToStrength(rssi: number) {
  if (rssi > -50) return 3;
  if (rssi > -65) return 2;
  return 1;
}

function RssiIndicator({ rssi }: { rssi: number }) {
  const strength = rssiToStrength(rssi);
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3].map(level => (
        <div
          key={level}
          className={`w-1 rounded-sm transition-colors ${
            level <= strength ? 'bg-accent' : 'bg-muted-foreground/30'
          }`}
          style={{ height: `${level * 5 + 2}px` }}
        />
      ))}
    </div>
  );
}

export default function TopBar({
  lastUpdated,
  wifi,
  soundEnabled,
  onToggleSound,
  refreshInterval,
  onIntervalChange,
  onOpenSettings,
  onOpenExport,
  onOpenGasConfig,
  onReboot,
  dataSource,
  loading,
}: TopBarProps) {
  return (
    <header className="flex flex-col gap-3 rounded-lg bg-card p-3 md:p-4 shadow-sm">
      {/* Row 1: Title + Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl md:text-2xl">❄️</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm md:text-lg font-bold leading-tight truncate">MRI Chiller Monitor</h1>
              {dataSource === 'gas' ? (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-accent text-accent">GAS</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Mock</Badge>
              )}
              {loading && <span className="text-[9px] text-muted-foreground animate-pulse">⏳</span>}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="truncate">Live — {lastUpdated.toLocaleTimeString('th-TH')}</span>
            </div>
          </div>
        </div>

        {/* Controls - icon buttons wrap naturally */}
        <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
          <Select value={String(refreshInterval)} onValueChange={v => onIntervalChange(Number(v))}>
            <SelectTrigger className="h-7 md:h-8 w-20 md:w-28 text-[10px] md:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 นาที</SelectItem>
              <SelectItem value="300">5 นาที</SelectItem>
              <SelectItem value="900">15 นาที</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onToggleSound}>
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onOpenSettings}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 md:h-8 gap-1 px-2" onClick={onOpenExport}>
            <Download className="h-3.5 w-3.5" />
            <span className="text-xs">Export Data</span>
          </Button>
          <Link to="/history">
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
              <History className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs gap-1" onClick={onReboot}>
            <RefreshCw className="h-3 w-3" /> <span className="hidden sm:inline">Reboot</span>
          </Button>
        </div>
      </div>

      {/* Row 2: WiFi - scrollable on mobile */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {wifi.map(b => (
          <div key={b.name} className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground whitespace-nowrap shrink-0">
            <Wifi className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span>{b.name}</span>
            <RssiIndicator rssi={b.rssi} />
            <span>{b.rssi} dBm</span>
          </div>
        ))}
      </div>
    </header>
  );
}
