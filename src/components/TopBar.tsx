import { Download, History, Link2, RefreshCw, Settings, Volume2, VolumeX, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="flex items-end gap-0.5 h-4 tv:h-5">
      {[1, 2, 3].map(level => (
        <div
          key={level}
          className={`w-1 tv:w-1.5 rounded-sm transition-colors ${
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
    <header className="flex flex-col gap-3 tv:gap-5 rounded-lg bg-card p-3 md:p-4 tv:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 tv:gap-8">
        <div className="flex items-center gap-2 tv:gap-4 min-w-0">
          <span className="text-xl md:text-2xl tv:text-4xl">❄️</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 tv:gap-3">
              <h1 className="text-sm md:text-lg tv:text-3xl font-bold leading-tight truncate">MRI Chiller Monitor</h1>
              {dataSource === 'gas' ? (
                <Badge variant="outline" className="text-[9px] tv:text-xs px-1.5 tv:px-2.5 py-0 tv:py-0.5 border-accent text-accent">
                  GAS
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] tv:text-xs px-1.5 tv:px-2.5 py-0 tv:py-0.5 text-muted-foreground">
                  Mock
                </Badge>
              )}
              {loading && <span className="text-[9px] tv:text-sm text-muted-foreground animate-pulse">⏳</span>}
            </div>
            <div className="flex items-center gap-1.5 tv:gap-2 text-[10px] md:text-xs tv:text-base text-muted-foreground">
              <span className="relative flex h-2 w-2 tv:h-3 tv:w-3 shrink-0">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 tv:h-3 tv:w-3 rounded-full bg-accent" />
              </span>
              <span className="truncate">Live - {lastUpdated.toLocaleTimeString('th-TH')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 tv:gap-3 flex-wrap justify-end">
          <Select value={String(refreshInterval)} onValueChange={v => onIntervalChange(Number(v))}>
            <SelectTrigger className="h-7 md:h-8 tv:h-12 w-20 md:w-28 tv:w-36 text-[10px] md:text-xs tv:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 นาที</SelectItem>
              <SelectItem value="300">5 นาที</SelectItem>
              <SelectItem value="900">15 นาที</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 tv:h-11 tv:w-11" onClick={onToggleSound}>
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 tv:h-5 tv:w-5" /> : <VolumeX className="h-3.5 w-3.5 tv:h-5 tv:w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 tv:h-11 tv:w-11" onClick={onOpenSettings}>
            <Settings className="h-3.5 w-3.5 tv:h-5 tv:w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 tv:h-11 tv:w-11" onClick={onOpenExport}>
            <Download className="h-3.5 w-3.5 tv:h-5 tv:w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 tv:h-11 tv:w-11" onClick={onOpenGasConfig} title="GAS Config">
            <Link2 className="h-3.5 w-3.5 tv:h-5 tv:w-5" />
          </Button>
          <Link to="/history">
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 tv:h-11 tv:w-11">
              <History className="h-3.5 w-3.5 tv:h-5 tv:w-5" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-7 md:h-8 tv:h-12 text-[10px] md:text-xs tv:text-base gap-1 tv:gap-2 px-2 tv:px-4" onClick={onReboot}>
            <RefreshCw className="h-3 w-3 tv:h-4 tv:w-4" />
            <span className="hidden sm:inline">Reboot</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 tv:gap-5 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {wifi.map(board => (
          <div
            key={board.name}
            className="flex items-center gap-1 tv:gap-2 text-[10px] md:text-xs tv:text-base text-muted-foreground whitespace-nowrap shrink-0"
          >
            <Wifi className="h-3 w-3 md:h-3.5 md:w-3.5 tv:h-4 tv:w-4" />
            <span>{board.name}</span>
            <RssiIndicator rssi={board.rssi} />
            <span>{board.rssi} dBm</span>
          </div>
        ))}
      </div>
    </header>
  );
}
