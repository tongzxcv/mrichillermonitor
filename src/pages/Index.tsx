import { lazy, Suspense, useState, useEffect } from 'react';
import { useSensorData } from '@/hooks/useSensorData';
import TopBar from '@/components/TopBar';
import SensorCard from '@/components/SensorCard';
import { useToast } from '@/hooks/use-toast';
import { saveAlarmsToHistory } from '@/lib/alarmHistory';
import { useModalContext } from '@/App';

const TemperatureChart = lazy(() => import('@/components/TemperatureChart'));
const AlertsPanel = lazy(() => import('@/components/AlertsPanel'));
const ThresholdModal = lazy(() => import('@/components/ThresholdModal'));
const ExportModal = lazy(() => import('@/components/ExportModal'));

function SensorCardSkeleton() {
  return <div className="h-[180px] rounded-lg border bg-card animate-pulse" />;
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="rounded-lg bg-foreground/[0.03] p-3">
        <div className="h-[260px] rounded-md animate-pulse bg-muted/60 md:h-[320px]" />
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return <div className="h-[220px] rounded-lg border bg-card animate-pulse" />;
}

const Index = () => {
  const [refreshInterval, setRefreshInterval] = useState(60);
  const {
    settingsOpen,
    setSettingsOpen,
    exportOpen,
    setExportOpen,
  } = useModalContext();
  const { toast } = useToast();

  const {
    sensors, alerts, wifi, chartData, lastUpdated,
    selectedSensor, setSelectedSensor,
    soundEnabled, setSoundEnabled,
    thresholds, updateThreshold, refresh,
    dataSource, loading, error, checkDataSource,
    clearAlerts,
  } = useSensorData(refreshInterval);

  useEffect(() => {
    saveAlarmsToHistory(alerts);
  }, [alerts]);

  const handleSaveThresholds = (newThresholds: Record<string, number>) => {
    Object.entries(newThresholds).forEach(([id, val]) => updateThreshold(id, val));
    toast({ title: 'Saved', description: 'Threshold settings updated' });
  };

  return (
    <div className="min-h-screen max-w-[1600px] mx-auto bg-background p-4 md:p-6 space-y-4">
      <TopBar lastUpdated={lastUpdated} wifi={wifi} soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        refreshInterval={refreshInterval} onIntervalChange={setRefreshInterval}
        dataSource={dataSource} loading={loading} />
      {error && <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">GAS Error: {error}</div>}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sensors.length > 0 ? (
          sensors.map(s => (
            <SensorCard key={s.id} sensor={s} isSelected={selectedSensor === s.id}
              onClick={() => setSelectedSensor(selectedSensor === s.id ? null : s.id)} />
          ))
        ) : (
          Array.from({ length: 10 }, (_, index) => <SensorCardSkeleton key={index} />)
        )}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Suspense fallback={<ChartSkeleton />}>
            <TemperatureChart sensors={sensors} selectedSensor={selectedSensor}
              onSelectSensor={setSelectedSensor} chartData={chartData} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<PanelSkeleton />}>
            <AlertsPanel alerts={alerts} soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onClearAlerts={clearAlerts} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <ThresholdModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
          thresholds={thresholds} onSave={handleSaveThresholds} />
        <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} sensors={sensors} dataSource={dataSource} />
      </Suspense>
    </div>
  );
};

export default Index;
