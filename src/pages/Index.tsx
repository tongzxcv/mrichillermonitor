import { getGasUrl } from '@/services/gasApi';
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
    clearAlerts,
  } = useSensorData(refreshInterval);

const handleReboot = async () => {
  const url = getGasUrl();
  if (!url) {
    toast({ title: '❌ Error', description: 'ยังไม่ได้ตั้งค่า GAS URL' });
    return;
  }
  try {
    toast({ title: '⏳ กำลังส่งคำสั่ง...', description: 'กำลัง reboot ทุก Board' });
    // ใช้ JSONP แทน fetch เพราะ GAS ไม่รองรับ CORS
    await new Promise<void>((resolve) => {
      const cbName = 'rebootCb_' + Date.now();
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        delete (window as any)[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(); // timeout แต่ GAS อาจทำงานแล้ว
      }, 10000);
      (window as any)[cbName] = () => {
        clearTimeout(timeout);
        delete (window as any)[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve();
      };
      script.src = `${url}?action=reboot&callback=${cbName}`;
      document.head.appendChild(script);
    });
    toast({ title: '✅ Reboot สำเร็จ', description: 'ส่งคำสั่ง REBOOT แล้ว ESP จะ reboot รอบถัดไป' });
    refresh();
  } catch (e) {
    toast({ title: '❌ Reboot ล้มเหลว', description: 'ไม่สามารถเชื่อมต่อ GAS ได้' });
  }
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
    <div className="min-h-screen bg-background p-4 md:p-6 tv:px-10 tv:py-8 space-y-4 tv:space-y-6 max-w-[1600px] tv:max-w-[1880px] tv-xl:max-w-[2280px] mx-auto">
      <TopBar lastUpdated={lastUpdated} wifi={wifi} soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        refreshInterval={refreshInterval} onIntervalChange={setRefreshInterval}
        onOpenSettings={() => setSettingsOpen(true)} onOpenExport={() => setExportOpen(true)}
        onOpenGasConfig={() => setGasConfigOpen(true)} onReboot={handleReboot}
        dataSource={dataSource} loading={loading} />
      {error && <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">⚠️ GAS Error: {error} — ใช้ mock data แทน</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 tv:grid-cols-5 gap-3 tv:gap-5">
        {sensors.map(s => (
          <SensorCard key={s.id} sensor={s} isSelected={selectedSensor === s.id}
            onClick={() => setSelectedSensor(selectedSensor === s.id ? null : s.id)} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 tv:gap-5">
        <div className="lg:col-span-3">
          <TemperatureChart sensors={sensors} selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor} chartData={chartData} />
        </div>
        <div>
          <AlertsPanel alerts={alerts} soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onClearAlerts={clearAlerts} />
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
