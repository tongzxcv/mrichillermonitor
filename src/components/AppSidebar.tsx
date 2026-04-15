import { LayoutDashboard, History, Bell, Download, Settings, Monitor, Moon, Sun, RefreshCw } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  tvMode: boolean;
  onToggleTvMode: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onReboot: () => void;
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
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenExport}>
                  <Download className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Export Data</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onReboot}>
                  <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Reboot All</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-4 space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-xs flex items-center gap-2 cursor-pointer">
              {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Dark Mode
            </Label>
            <Switch id="dark-mode" checked={isDark} onCheckedChange={onToggleTheme} className="scale-90" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="tv-mode" className="text-xs flex items-center gap-2 cursor-pointer">
              <Monitor className="h-3.5 w-3.5" />
              TV Mode
            </Label>
            <Switch id="tv-mode" checked={tvMode} onCheckedChange={onToggleTvMode} className="scale-90" />
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
