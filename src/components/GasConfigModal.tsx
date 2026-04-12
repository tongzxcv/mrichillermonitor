import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getGasUrl, setGasUrl, isGasConfigured, checkGasConnection } from '@/services/gasApi';

interface GasConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function GasConfigModal({ open, onClose, onSave }: GasConfigModalProps) {
  const [url, setUrl] = useState(getGasUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTest = async () => {
    setTesting(true);
    setStatus('idle');
    try {
      const handleTest = async () => {
  setTesting(true);
  setStatus('idle');
  try {
    const result = await checkGasConnection(url);
    setStatus(result.ok ? 'success' : 'error');
  } catch {
    setStatus('error');
  } finally {
    setTesting(false);
  }
};

  const handleSave = () => {
    setGasUrl(url);
    onSave();
    onClose();
  };

  const handleClear = () => {
    setUrl('');
    setGasUrl('');
    setStatus('idle');
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔗 เชื่อมต่อ Google Apps Script
            {isGasConfigured() && <Badge variant="outline" className="text-accent border-accent">Connected</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="gas-url" className="text-xs">GAS Web App URL</Label>
            <Input
              id="gas-url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={e => { setUrl(e.target.value); setStatus('idle'); }}
              className="text-xs mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleTest} disabled={!url.trim() || testing}>
              {testing ? '⏳ Testing...' : '🧪 ทดสอบ'}
            </Button>
            {status === 'success' && <Badge className="bg-green-600 text-white">✅ เชื่อมต่อสำเร็จ</Badge>}
            {status === 'error' && <Badge variant="destructive">❌ เชื่อมต่อไม่ได้</Badge>}
          </div>

          <p className="text-[10px] text-muted-foreground">
            วาง URL จาก Google Apps Script Deploy → Web app ที่นี่
            ระบบจะดึงข้อมูลจาก Google Sheets แทน mock data
          </p>
        </div>

        <DialogFooter className="gap-2">
          {isGasConfigured() && (
            <Button size="sm" variant="ghost" onClick={handleClear}>ยกเลิกการเชื่อมต่อ</Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!url.trim()}>💾 บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
