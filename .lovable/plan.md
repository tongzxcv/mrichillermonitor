
# MRI Chiller Temperature Monitoring — UI Redesign

## แนวคิดการออกแบบใหม่
ปรับ UI ให้ทันสมัยขึ้นด้วย React + Tailwind CSS + shadcn/ui โดยคงฟีเจอร์ทั้งหมดไว้เหมือนเดิม ใช้ Mock Data จำลองสำหรับ demo (พร้อมต่อ Google Apps Script API จริงได้ทีหลัง)

## โครงสร้างหน้า (Single Page)

### 1. Top Bar
- โลโก้ ❄️ + ชื่อระบบ
- สถานะ Live (จุดเขียว + นาฬิกา)
- WiFi Signal แสดง RSSI 3 บอร์ด
- ปุ่ม: Auto-refresh selector, Sound toggle, Settings (Threshold), Export CSV, Reboot

### 2. Sensor Cards Grid (5 คอลัมน์)
- 10 การ์ดสำหรับแต่ละ sensor
- Gauge แบบ circular แสดงอุณหภูมิ พร้อม gradient สี
- แถว MIN / AVG / MAX
- Badge สถานะ Normal (เขียว) / Critical (แดง กระพริบ)
- คลิกการ์ดเพื่อ highlight เส้นในกราฟ

### 3. Temperature Trend Chart
- กราฟเส้น real-time ด้วย Recharts (แทน Chart.js)
- พื้นหลังมืด (dark theme) สำหรับกราฟ
- Legend คลิกได้เพื่อ toggle/focus แต่ละ sensor
- Tooltip แสดงค่าทุก sensor ที่จุดเวลาเดียวกัน

### 4. Recent Alerts Table
- ตารางแจ้งเตือนเรียงเวลา
- แถว critical กระพริบแดง
- ปุ่ม Sound On/Off
- ปุ่ม View All / Show Less

### 5. Modals
- **Threshold Settings**: ตั้งค่าอุณหภูมิสูงสุดแต่ละ sensor
- **Export CSV**: เลือกช่วงวันที่ + เลือก sensor ที่ต้องการ

## Design Tokens
- สีหลัก: ฟ้า (#29b6f6), เขียว (#00c897), แดง (#f44336)
- ฟอนต์: Plus Jakarta Sans
- การ์ดมน 18px, shadow นุ่ม
- Animation: pulse สำหรับ live dot, blink สำหรับ critical

## Mock Data
- สร้าง mock data จำลอง 10 sensors พร้อมค่าอุณหภูมิแบบ random
- Auto-refresh ทุก interval ที่เลือก
- จำลอง critical alerts เมื่ออุณหภูมิเกิน threshold

## ไฟล์หลักที่จะสร้าง
- `src/pages/Index.tsx` — หน้าหลัก Dashboard
- `src/components/TopBar.tsx` — แถบด้านบน
- `src/components/SensorCard.tsx` — การ์ด sensor พร้อม gauge
- `src/components/TemperatureChart.tsx` — กราฟ Recharts
- `src/components/AlertsPanel.tsx` — ตาราง alerts
- `src/components/ThresholdModal.tsx` — modal ตั้งค่า threshold
- `src/components/ExportModal.tsx` — modal export CSV
- `src/hooks/useSensorData.ts` — hook จัดการ mock data + auto-refresh
- `src/data/mockSensors.ts` — ข้อมูลจำลอง sensors
