import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "@/hooks/useTheme";
import { useTvMode } from "@/hooks/useTvMode";
import Index from "./pages/Index.tsx";
import History from "./pages/History.tsx";
import AlarmHistory from "./pages/AlarmHistory.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useState, createContext, useContext } from "react";
import { getGasUrl } from "@/services/gasApi";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

interface ModalContextType {
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
}

export const ModalContext = createContext<ModalContextType>({
  settingsOpen: false,
  setSettingsOpen: () => {},
  exportOpen: false,
  setExportOpen: () => {},
});

export const useModalContext = () => useContext(ModalContext);

function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const { tvMode, toggleTvMode } = useTvMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { toast } = useToast();

  const handleReboot = () => {
    const url = getGasUrl();
    if (!url) {
      toast({ title: 'Error', description: 'GAS URL not set' });
      return;
    }
    toast({ title: 'Sending Reboot...' });
  };

  return (
    <ModalContext.Provider value={{ settingsOpen, setSettingsOpen, exportOpen, setExportOpen }}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {!tvMode && (
            <AppSidebar
              isDark={isDark}
              onToggleTheme={toggleTheme}
              tvMode={tvMode}
              onToggleTvMode={toggleTvMode}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenExport={() => setExportOpen(true)}
              onReboot={handleReboot}
            />
          )}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/history" element={<History />} />
                <Route path="/alarm-history" element={<AlarmHistory />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ModalContext.Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
