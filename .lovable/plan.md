

## Plan: Sidebar + TV Mode + Dark Mode (Updated)

ตัดออก: Reboot Log page, GAS Config (ฝังโค้ดอยู่แล้ว)

### 1. Fix Build Error
Remove `onOpenGasConfig` from TopBar.tsx line 54 (not in props interface).

### 2. Dark Mode + TV Mode Hooks
- `src/hooks/useTheme.ts` — toggle `.dark` class on `<html>`, persist to localStorage
- `src/hooks/useTvMode.ts` — toggle TV mode class, larger fonts/cards, auto-hide cursor, persist to localStorage

### 3. Sidebar Navigation
Create `src/components/AppSidebar.tsx` using shadcn Sidebar component with:
- **Dashboard** (/) — main view
- **History** (/history) — existing page
- **Alarm History** (/alarm-history) — new page
- **Export Data** — opens export modal
- **Settings** — opens threshold modal
- Toggles section: Dark Mode switch, TV Mode switch

Slim down TopBar: remove History link, Settings, Reboot → move to sidebar. Keep title, live status, WiFi, sound, refresh interval.

### 4. Alarm History Page
`src/pages/AlarmHistory.tsx` — table of past alerts with date filter (uses alerts from useSensorData or localStorage-persisted log).

### 5. TV Mode Layout
When TV mode is active:
- Hide sidebar
- Remove max-width constraint and reduce padding
- Increase sensor card font sizes and chart height
- Auto-hide cursor after 3s inactivity
- Add floating small toggle button to exit TV mode

### 6. Wire Up
- `src/App.tsx` — add /alarm-history route, wrap layout with SidebarProvider
- `src/pages/Index.tsx` — integrate sidebar, theme, TV mode
- `src/index.css` — add TV mode utility classes

### Files to create:
- `src/hooks/useTheme.ts`
- `src/hooks/useTvMode.ts`
- `src/components/AppSidebar.tsx`
- `src/pages/AlarmHistory.tsx`

### Files to modify:
- `src/components/TopBar.tsx` — fix build error, slim down
- `src/pages/Index.tsx` — sidebar layout, TV mode classes
- `src/App.tsx` — new routes, SidebarProvider
- `src/index.css` — TV mode styles

