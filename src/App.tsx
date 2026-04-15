import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "@/hooks/useTheme";
import { useTvMode } from "@/hooks/useTvMode";
import Index from "./pages/Index.tsx";
import { useState, createContext, useContext, lazy, Suspense } from "react";
import { getStoredRebootAuthToken, triggerRebootAll } from "@/services/gasApi";
import { useToast } from "@/hooks/use-toast";

const History = lazy(() => import("./pages/History.tsx"));
const AlarmHistory = lazy(() => import("./pages/AlarmHistory.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

interface ModalContextType {
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  tvMode: boolean;
  toggleTvMode: () => void;
  rebootAll: () => Promise<void>;
}

export const ModalContext = createContext<ModalContextType>({
  settingsOpen: false,
  setSettingsOpen: () => {},
  exportOpen: false,
  setExportOpen: () => {},
  tvMode: false,
  toggleTvMode: () => {},
  rebootAll: async () => {},
});

export const useModalContext = () => useContext(ModalContext);

function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const { tvMode, toggleTvMode } = useTvMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [rebootToken, setRebootToken] = useState(() => getStoredRebootAuthToken());
  const [rebooting, setRebooting] = useState(false);
  const { toast } = useToast();

  const openRebootDialog = async () => {
    setRebootOpen(true);
  };

  const handleConfirmReboot = async () => {
    try {
      setRebooting(true);
      toast({ title: "Sending reboot...", description: "Rebooting all boards" });
      await triggerRebootAll(rebootToken);
      toast({ title: "Reboot sent", description: "ESP will reboot on next cycle" });
      setRebootOpen(false);
    } catch (error) {
      toast({
        title: "Reboot failed",
        description: error instanceof Error ? error.message : "Cannot connect to GAS",
        variant: "destructive",
      });
    } finally {
      setRebooting(false);
    }
  };

  return (
    <ModalContext.Provider
      value={{
        settingsOpen,
        setSettingsOpen,
        exportOpen,
        setExportOpen,
        tvMode,
        toggleTvMode,
        rebootAll: openRebootDialog,
      }}
    >
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full">
          <AppSidebar
            isDark={isDark}
            onToggleTheme={toggleTheme}
            tvMode={tvMode}
            onToggleTvMode={toggleTvMode}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenExport={() => setExportOpen(true)}
            onReboot={openRebootDialog}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route
                  path="/history"
                  element={<Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading history...</div>}><History /></Suspense>}
                />
                <Route
                  path="/alarm-history"
                  element={<Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading alarm history...</div>}><AlarmHistory /></Suspense>}
                />
                <Route
                  path="*"
                  element={<Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}><NotFound /></Suspense>}
                />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Dialog open={rebootOpen} onOpenChange={setRebootOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Reboot All</DialogTitle>
            <DialogDescription>
              Enter the reboot token to authorize restarting all IoT sensor boards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reboot-token">Reboot token</Label>
            <Input
              id="reboot-token"
              type="password"
              value={rebootToken}
              onChange={(event) => setRebootToken(event.target.value)}
              placeholder="Enter reboot token"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              This token must match the protected value configured in Google Apps Script.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRebootOpen(false)} disabled={rebooting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReboot} disabled={!rebootToken.trim() || rebooting}>
              {rebooting ? "Authorizing..." : "Confirm Reboot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
