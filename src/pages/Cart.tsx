import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Pill } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalPrice, updateQuantity, removeItem, checkout, loading } = useCart();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCheckout = async () => {
    setSubmitting(true);
    const ok = await checkout(notes);
    setSubmitting(false);
    if (ok) navigate('/dashboard');
  };

  // Group by pharmacy
  const grouped = items.reduce((acc, it) => {
    const key = it.pharmacy_id;
    if (!acc[key]) acc[key] = { pharmacy: it.pharmacies, items: [] as typeof items };
    acc[key].items.push(it);
    return acc;
  }, {} as Record<string, { pharmacy: any; items: typeof items }>);

  return (
    <div className="min-h-screen bg-background pb-32">
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
            <Button onClick={() => navigate('/nearby')} className="mt-4" size="sm">
              Tazama Famasi
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
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <label className="text-xs font-medium">Maelekezo (hiari)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mfano: Naja kuchukua mchana..."
                className="text-sm min-h-[60px]"
              />
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3">
              <div className="mx-auto max-w-2xl flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">Jumla</p>
                  <p className="text-base font-bold text-primary">TSh {totalPrice.toLocaleString()}</p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={submitting}
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
