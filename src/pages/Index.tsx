import { useState } from 'react';
import { useSensorData } from '@/hooks/useSensorData';
import TopBar from '@/components/TopBar';
import SensorCard from '@/components/SensorCard';
import TemperatureChart from '@/components/TemperatureChart';
import AlertsPanel from '@/components/AlertsPanel';
import ThresholdModal from '@/components/ThresholdModal';
import ExportModal from '@/components/ExportModal';
import GasConfigModal from '@/components/GasConfigModal';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [gasConfigOpen, setGasConfigOpen] = useState(false);
  const { toast } = useToast();

  const {
    sensors, alerts, wifi, chartData, lastUpdated,
    selectedSensor, setSelectedSensor,
    soundEnabled, setSoundEnabled,
    thresholds, updateThreshold, refresh,
    dataSource, loading, error, checkDataSource,
  } = useSensorData(refreshInterval);

  const handleReboot = () => {
    toast({ title: '🔄 Rebooting...', description: 'ระบบกำลัง reboot (demo mode)' });
    refresh();
  };
  const handleSaveThresholds = (newThresholds: Record<string, number>) => {
    Object.entries(newThresholds).forEach(([id, val]) => updateThreshold(id, val));
    toast({ title: '✅ บันทึกเรียบร้อย', description: 'Threshold settings updated' });
  };
  const handleGasSave = () => {
    checkDataSource(); refresh();
    toast({ title: '🔗 GAS Config Updated', description: 'ระบบจะดึงข้อมูลจาก Google Sheets' });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <TopBar lastUpdated={lastUpdated} wifi={wifi} soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        refreshInterval={refreshInterval} onIntervalChange={setRefreshInterval}
        onOpenSettings={() => setSettingsOpen(true)} onOpenExport={() => setExportOpen(true)}
        onOpenGasConfig={() => setGasConfigOpen(true)} onReboot={handleReboot}
        dataSource={dataSource} loading={loading} />
      {error && <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">⚠️ GAS Error: {error} — ใช้ mock data แทน</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sensors.map(s => (
          <SensorCard key={s.id} sensor={s} isSelected={selectedSensor === s.id}
            onClick={() => setSelectedSensor(selectedSensor === s.id ? null : s.id)} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TemperatureChart sensors={sensors} selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor} chartData={chartData} />
        </div>
        <div>
          <AlertsPanel alerts={alerts} soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)} />
        </div>
      </div>
      <ThresholdModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        thresholds={thresholds} onSave={handleSaveThresholds} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} sensors={sensors} dataSource={dataSource} />
      <GasConfigModal open={gasConfigOpen} onClose={() => setGasConfigOpen(false)} onSave={handleGasSave} />
    </div>
  );
};

export default Index;
