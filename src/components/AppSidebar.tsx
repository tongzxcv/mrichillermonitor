import { useState } from 'react';
import { LayoutDashboard, History, Bell, Download, Settings, Monitor, Moon, Sun, RefreshCw } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
    isDark: boolean;
    onToggleTheme: () => void;
    tvMode: boolean;
    onToggleTvMode: () => void;
    onOpenSettings: () => void;
    onOpenExport: () => void;
    onReboot: () => void | Promise<void>;
}

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'History', url: '/history', icon: History },
  { title: 'Alarm History', url: '/alarm-history', icon: Bell },
  ];

export function AppSidebar({
    isDark,
    onToggleTheme,
    tvMode,
    onToggleTvMode,
    onOpenSettings,
    onOpenExport,
    onReboot,
}: AppSidebarProps) {
    const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
    const collapsed = state === 'collapsed';
    const [showRebootConfirm, setShowRebootConfirm] = useState(false);

  const closeSidebar = () => {
        if (isMobile) {
                setOpenMobile(false);
                return;
        }
        setOpen(false);
  };

  const handleAction = (action: () => void | Promise<void>) => () => {
        void Promise.resolve(action()).finally(closeSidebar);
  };

  const handleTvModeChange = (checked: boolean) => {
        if (checked !== tvMode) {
                onToggleTvMode();
        }
        closeSidebar();
  };

  return (
        <>
              <Sidebar collapsible="icon">
                      <SidebarHeader className="border-b border-sidebar-border p-2">
                                <div className="flex items-center justify-between">
                                            <SidebarTrigger className="h-8 w-8 shrink-0" />
                                  {!collapsed && <span className="text-sm font-semibold">Menu</span>span>}
                                </div>div>
                      </SidebarHeader>SidebarHeader>
                      <SidebarContent>
                                <SidebarGroup>
                                            <SidebarGroupLabel>Navigation</SidebarGroupLabel>SidebarGroupLabel>
                                            <SidebarGroupContent>
                                                          <SidebarMenu>
                                                            {navItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton asChild>
                                                                      <NavLink
                                                                                                to={item.url}
                                                                                                end={item.url === '/'}
                                                                                                className="hover:bg-muted/50"
                                                                                                activeClassName="bg-primary/10 text-primary font-medium"
                                                                                              >
                                                                                              <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                                                        {!collapsed && <span>{item.title}</span>span>}
                                                                      </NavLink>NavLink>
                                                </SidebarMenuButton>SidebarMenuButton>
                            </SidebarMenuItem>SidebarMenuItem>
                          ))}
                                                          </SidebarMenu>SidebarMenu>
                                            </SidebarGroupContent>SidebarGroupContent>
                                </SidebarGroup>SidebarGroup>
                      
                                <SidebarGroup>
                                            <SidebarGroupLabel>Actions</SidebarGroupLabel>SidebarGroupLabel>
                                            <SidebarGroupContent>
                                                          <SidebarMenu>
                                                                          <SidebarMenuItem>
                                                                                            <SidebarMenuButton onClick={handleAction(onOpenSettings)}>
                                                                                                                <Settings className="mr-2 h-4 w-4 shrink-0" />
                                                                                              {!collapsed && <span>Settings</span>span>}
                                                                                              </SidebarMenuButton>SidebarMenuButton>
                                                                          </SidebarMenuItem>SidebarMenuItem>
                                                                          <SidebarMenuItem>
                                                                                            <SidebarMenuButton onClick={handleAction(onOpenExport)}>
                                                                                                                <Download className="mr-2 h-4 w-4 shrink-0" />
                                                                                              {!collapsed && <span>Export Data</span>span>}
                                                                                              </SidebarMenuButton>SidebarMenuButton>
                                                                          </SidebarMenuItem>SidebarMenuItem>
                                                                          <SidebarMenuItem>
                                                                                            <SidebarMenuButton onClick={() => setShowRebootConfirm(true)}>
                                                                                                                <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
                                                                                              {!collapsed && <span>Reboot All</span>span>}
                                                                                              </SidebarMenuButton>SidebarMenuButton>
                                                                          </SidebarMenuItem>SidebarMenuItem>
                                                          </SidebarMenu>SidebarMenu>
                                            </SidebarGroupContent>SidebarGroupContent>
                                </SidebarGroup>SidebarGroup>
                      </SidebarContent>SidebarContent>
              
                {!collapsed && (
                    <SidebarFooter className="p-4 space-y-3">
                                <Separator />
                                <div className="flex items-center justify-between">
                                              <Label htmlFor="dark-mode" className="text-xs flex items-center gap-2 cursor-pointer">
                                                {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                                                              Dark Mode
                                              </Label>Label>
                                              <Switch id="dark-mode" checked={isDark} onCheckedChange={onToggleTheme} className="scale-90" />
                                </div>div>
                                <div className="flex items-center justify-between">
                                              <Label htmlFor="tv-mode" className="text-xs flex items-center gap-2 cursor-pointer">
                                                              <Monitor className="h-3.5 w-3.5" />
                                                              TV Mode
                                              </Label>Label>
                                              <Switch id="tv-mode" checked={tvMode} onCheckedChange={handleTvModeChange} className="scale-90" />
                                </div>div>
                    </SidebarFooter>SidebarFooter>
                      )}
              </Sidebar>Sidebar>
        
              <AlertDialog open={showRebootConfirm} onOpenChange={setShowRebootConfirm}>
                      <AlertDialogContent>
                                <AlertDialogHeader>
                                            <AlertDialogTitle>ยืนยันการ Reboot?</AlertDialogTitle>AlertDialogTitle>
                                            <AlertDialogDescription>
                                                          การกระทำนี้จะ reboot IoT sensor board ทั้งหมด คุณแน่ใจหรือไม่?
                                            </AlertDialogDescription>AlertDialogDescription>
                                </AlertDialogHeader>AlertDialogHeader>
                                <AlertDialogFooter>
                                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>AlertDialogCancel>
                                            <AlertDialogAction
                                                            onClick={() => {
                                                                              setShowRebootConfirm(false);
                                                                              void Promise.resolve(onReboot()).finally(closeSidebar);
                                                            }}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                          >
                                                          Reboot ทั้งหมด
                                            </AlertDialogAction>AlertDialogAction>
                                </AlertDialogFooter>AlertDialogFooter>
                      </AlertDialogContent>AlertDialogContent>
              </AlertDialog>AlertDialog>
        </>>
      );
}</>
