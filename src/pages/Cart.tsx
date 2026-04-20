import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Pill, Truck, Store } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalPrice, updateQuantity, removeItem, checkout, loading } = useCart();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fulfillType, setFulfillType] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [phone, setPhone] = useState('');

  const handleCheckout = async () => {
    setSubmitting(true);
    const ok = await checkout(notes, {
      type: fulfillType,
      address: fulfillType === 'delivery' ? address : undefined,
      pickup_time: fulfillType === 'pickup' && pickupTime ? new Date(pickupTime).toISOString() : undefined,
      phone,
    });
    setSubmitting(false);
    if (ok) navigate('/my-orders');
  };

  // Group by pharmacy
  const grouped = items.reduce((acc, it) => {
    const key = it.pharmacy_id;
    if (!acc[key]) acc[key] = { pharmacy: it.pharmacies, items: [] as typeof items };
    acc[key].items.push(it);
    return acc;
  }, {} as Record<string, { pharmacy: any; items: typeof items }>);

  return (
    <div className="min-h-screen bg-background pb-40 md:pb-32">
      <div className="mx-auto max-w-2xl px-3 pt-3 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Cart Yangu</h1>
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground py-8">Inapakia...</p>}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Cart yako ni tupu.</p>
            <Button onClick={() => navigate('/marketplace')} className="mt-4" size="sm">
              Tazama Soko la Dawa
            </Button>
          </div>
        )}

        {Object.entries(grouped).map(([pid, group]) => (
          <div key={pid} className="rounded-2xl border border-border bg-card p-3 space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">
              {group.pharmacy?.name || 'Famasi'}
            </h2>
            {group.items.map(it => (
              <div key={it.id} className="flex items-center gap-3 py-2 border-t border-border first:border-t-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Pill className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{it.pharmacy_medicines?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.pharmacy_medicines?.price ? `TSh ${it.pharmacy_medicines.price.toLocaleString()}` : 'Bei haijawekwa'}
                    {it.pharmacy_medicines?.dosage && ` · ${it.pharmacy_medicines.dosage}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="outline" className="h-7 w-7"
                    onClick={() => updateQuantity(it.id, it.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{it.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7"
                    onClick={() => updateQuantity(it.id, it.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(it.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {items.length > 0 && (
          <>
            <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
              <div>
                <Label className="text-xs font-medium mb-2 block">Aina ya kupokea</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillType('pickup')}
                    className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 transition ${
                      fulfillType === 'pickup' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30'
                    }`}
                  >
                    <Store className="h-4 w-4" />
                    <span className="font-medium">Naja kuchukua</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillType('delivery')}
                    className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 transition ${
                      fulfillType === 'delivery' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">Niletewe</span>
                  </button>
                </div>
              </div>

              {fulfillType === 'delivery' && (
                <div>
                  <Label className="text-xs">Anwani ya kupokea *</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mfano: Sinza, Block A, Nyumba 12" className="h-9 text-sm" />
                </div>
              )}

              {fulfillType === 'pickup' && (
                <div>
                  <Label className="text-xs">Saa ya kuja kuchukua (hiari)</Label>
                  <Input type="datetime-local" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="h-9 text-sm" />
                </div>
              )}

              <div>
                <Label className="text-xs">Simu yako *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..." className="h-9 text-sm" />
              </div>

              <div>
                <Label className="text-xs">Maelekezo (hiari)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mfano: Piga kabla ya kuja..."
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>

            {/* Sticky submit bar — sits ABOVE the mobile bottom nav (h-16) */}
            <div className="fixed left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-40
                            bottom-16 md:bottom-0 safe-area-bottom">
              <div className="mx-auto max-w-2xl flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">Jumla</p>
                  <p className="text-base font-bold text-primary">TSh {totalPrice.toLocaleString()}</p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={submitting || !phone.trim() || (fulfillType === 'delivery' && !address.trim())}
                  className="px-6"
                >
                  {submitting ? 'Inatuma...' : 'Tuma Agizo'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
