import { Wifi, Volume2, VolumeX, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { WifiBoard } from '@/data/mockSensors';

interface TopBarProps {
  lastUpdated: Date;
  wifi: WifiBoard[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  refreshInterval: number;
  onIntervalChange: (val: number) => void;
  dataSource: 'mock' | 'gas';
  loading: boolean;
  tvMode?: boolean;
  onExitTvMode?: () => void;
}

function rssiToStrength(rssi: number | null) {
  if (rssi === null || !Number.isFinite(rssi)) return 0;
  if (rssi > -50) return 3;
  if (rssi > -65) return 2;
  return 1;
}

function RssiIndicator({ rssi }: { rssi: number | null }) {
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
  dataSource,
  loading,
  tvMode,
  onExitTvMode,
}: TopBarProps) {
  const isMobile = useIsMobile();

  return (
    <header className="flex flex-col gap-3 rounded-lg bg-card p-3 md:p-4 shadow-sm">
      {/* Row 1: Title + Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && <SidebarTrigger className="h-7 w-7 md:h-8 md:w-8 shrink-0" />}
          <span className="text-xl md:text-2xl">❄️</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm md:text-lg font-bold leading-tight truncate tv-title">MRI Chiller Monitor</h1>
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

        {/* Controls */}
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

          {tvMode && onExitTvMode && (
            <Button variant="outline" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs gap-1" onClick={onExitTvMode}>
              <Monitor className="h-3 w-3" /> Exit TV
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: WiFi */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {wifi.map(b => (
          <div key={b.name} className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground whitespace-nowrap shrink-0">
            <Wifi className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span>{b.name}</span>
            <RssiIndicator rssi={b.rssi} />
            <span>{b.rssi === null ? '--' : `${b.rssi} dBm`}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
