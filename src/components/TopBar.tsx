import { Wifi, Volume2, VolumeX, Settings, Download, RefreshCw } from 'lucide-react';
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
  onReboot: () => void;
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
  onReboot,
}: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">❄️</span>
        <div>
          <h1 className="text-lg font-bold leading-tight">MRI Chiller Monitor</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Live — {lastUpdated.toLocaleTimeString('th-TH')}
          </div>
        </div>
      </div>

      {/* WiFi */}
      <div className="flex items-center gap-3">
        {wifi.map(b => (
          <div key={b.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wifi className="h-3.5 w-3.5" />
            <span>{b.name}</span>
            <RssiIndicator rssi={b.rssi} />
            <span>{b.rssi} dBm</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Select value={String(refreshInterval)} onValueChange={v => onIntervalChange(Number(v))}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 วินาที</SelectItem>
            <SelectItem value="10">10 วินาที</SelectItem>
            <SelectItem value="30">30 วินาที</SelectItem>
            <SelectItem value="60">1 นาที</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSound}>
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenExport}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onReboot}>
          <RefreshCw className="h-3.5 w-3.5" /> Reboot
        </Button>
      </div>
    </header>
  );
}
