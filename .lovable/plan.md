

## Plan: Fix Build Errors + Adjust Mock Data + Add History Page

ตัวเลือกก่อนหน้ามี 4 ข้อ (ไม่มีข้อ 5) ผมจะทำข้อ 1 และ 4 ให้ก่อน:

### Task 1: Fix chart.tsx Build Errors + Adjust Mock Data

**Problem**: `chart.tsx` (shadcn/ui) ใช้ types สำหรับ recharts v2 แต่โปรเจคใช้ recharts v3.8.1 ซึ่ง type definitions เปลี่ยน

**Fix**:
- แก้ `ChartTooltipContent` props type: ใช้ `any` หรือ explicit interface แทน `React.ComponentProps<typeof Tooltip>` ที่ไม่ compatible กับ v3
- แก้ `ChartLegendContent` props type: `Pick<LegendProps, "payload" | "verticalAlign">` ไม่ valid ใน v3 → ใช้ explicit types แทน
- ปรับ `SENSOR_BASES` ใน `mockSensors.ts` ให้บาง sensor อยู่ต่ำกว่า threshold เพื่อแสดง Normal status

### Task 2: Add History Page

- สร้าง `/history` page ใหม่สำหรับดูข้อมูลย้อนหลัง
- เพิ่ม date picker เลือกวัน
- แสดงกราฟ temperature ย้อนหลัง (mock data daily/weekly)
- เพิ่ม navigation link ใน TopBar
- เพิ่ม route ใน App.tsx

### Files to modify:
- `src/components/ui/chart.tsx` — fix recharts v3 type errors
- `src/data/mockSensors.ts` — adjust SENSOR_BASES for realistic values
- `src/pages/History.tsx` — new history page
- `src/App.tsx` — add route
- `src/components/TopBar.tsx` — add navigation link

