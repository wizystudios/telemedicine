import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanLine, Search, Check, Phone, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SuccessOverlay } from '@/components/SuccessOverlay';

interface Props {
  pharmacyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

interface Row {
  id: string;
  order_code: string | null;
  medicine_name: string;
  quantity: number;
  status: string;
  fulfillment_type: string | null;
  total_price: number | null;
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_phone: string | null;
  created_at: string;
}

export default function PharmacyPickupScanner({ pharmacyId, open, onOpenChange, onUpdated }: Props) {
  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Search lookup
  useEffect(() => {
    if (mode !== 'search' || !open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('pharmacy_lookup_orders', {
        _pharmacy_id: pharmacyId, _q: query,
      });
      if (error) toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      setRows((data as any) || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, open, pharmacyId]);

  // Scanner lifecycle
  useEffect(() => {
    if (!open || mode !== 'scan') {
      stopScanner();
      return;
    }
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const startScanner = async () => {
    try {
      setScanning(true);
      const el = document.getElementById('pickup-qr-reader');
      if (!el) return;
      const scanner = new Html5Qrcode('pickup-qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          await stopScanner();
          await markPickedUp(decoded.trim());
        },
        () => {},
      );
    } catch (e: any) {
      setScanning(false);
      toast({ title: 'Kamera haipatikani', description: e?.message || 'Tumia utafutaji badala yake', variant: 'destructive' });
      setMode('search');
    }
  };

  const stopScanner = async () => {
    setScanning(false);
    try {
      const s = scannerRef.current;
      if (s) {
        const state = s.getState();
        if (state === 2) await s.stop();
        await s.clear();
      }
    } catch {}
    scannerRef.current = null;
  };

  const markPickedUp = async (code: string) => {
    if (!code) return;
    const { error } = await supabase.rpc('pharmacy_mark_picked_up', {
      _pharmacy_id: pharmacyId, _order_code: code,
    });
    if (error) {
      toast({ title: 'Imeshindikana', description: error.message, variant: 'destructive' });
      // re-start scanner if still in scan mode
      if (mode === 'scan') startScanner();
    } else {
      toast({ title: 'Imefanikiwa ✅', description: `Agizo ${code} limewekwa kuwa "limechukuliwa"` });
      onUpdated?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-4 w-4" /> Thibitisha Kuchukua Agizo
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button size="sm" variant={mode === 'scan' ? 'default' : 'outline'} onClick={() => setMode('scan')}>
            <ScanLine className="h-3.5 w-3.5 mr-1" /> Skani QR
          </Button>
          <Button size="sm" variant={mode === 'search' ? 'default' : 'outline'} onClick={() => setMode('search')}>
            <Search className="h-3.5 w-3.5 mr-1" /> Tafuta
          </Button>
        </div>

        {mode === 'scan' && (
          <div className="space-y-2">
            <div id="pickup-qr-reader" className="w-full overflow-hidden rounded-xl border bg-black/80" style={{ minHeight: 240 }} />
            {scanning && (
              <p className="text-xs text-muted-foreground text-center">Lenga QR ya mteja...</p>
            )}
          </div>
        )}

        {mode === 'search' && (
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Namba ya agizo (ORD-XXXXXX) au jina la mteja"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {loading && <p className="text-xs text-center text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin inline" /></p>}
              {!loading && rows.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">Hakuna matokeo</p>
              )}
              {rows.map(r => (
                <div key={r.id} className="rounded-lg border p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{r.order_code}</span>
                    <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                  </div>
                  <p className="font-medium">{r.medicine_name} × {r.quantity}</p>
                  <p className="text-muted-foreground">
                    {r.patient_first_name || '—'} {r.patient_last_name || ''}{r.patient_phone ? ` • ${r.patient_phone}` : ''}
                  </p>
                  <div className="flex gap-2 pt-1">
                    {r.patient_phone && (
                      <a href={`tel:${r.patient_phone}`} className="flex-1">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] w-full">
                          <Phone className="h-3 w-3 mr-1" /> Piga
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm" className="h-7 text-[11px] flex-1"
                      disabled={!r.order_code || ['completed','cancelled'].includes(r.status)}
                      onClick={() => markPickedUp(r.order_code!)}
                    >
                      <Check className="h-3 w-3 mr-1" /> Mteja amechukua
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="w-full">
          <X className="h-3.5 w-3.5 mr-1" /> Funga
        </Button>
      </DialogContent>
    </Dialog>
  );
}
