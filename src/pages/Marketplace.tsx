import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Pill, ShoppingCart, Search, Plus } from 'lucide-react';

interface MedicineRow {
  id: string;
  name: string;
  price: number | null;
  dosage: string | null;
  in_stock: boolean | null;
  category: string | null;
  pharmacy_id: string;
  pharmacies?: { name: string } | null;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { addToCart, totalCount } = useCart();
  const [items, setItems] = useState<MedicineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pharmacy_medicines')
        .select('id, name, price, dosage, in_stock, category, pharmacy_id, pharmacies(name)')
        .eq('in_stock', true)
        .order('name');
      setItems((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = q
    ? items.filter(i =>
        i.name.toLowerCase().includes(q.toLowerCase()) ||
        i.pharmacies?.name?.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl px-3 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/cart')} className="h-8 text-xs gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Cart {totalCount > 0 && `(${totalCount})`}
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold">Soko la Dawa</h1>
          <p className="text-xs text-muted-foreground">Tafuta na agiza dawa kutoka famasi mbalimbali</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta dawa au famasi..."
            className="pl-9 h-10 text-sm"
          />
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground py-8">Inapakia...</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Hakuna dawa zilizopatikana.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(it => (
            <div key={it.id} className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Pill className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{it.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {it.pharmacies?.name || 'Famasi'}
                  {it.dosage && ` · ${it.dosage}`}
                </p>
                <p className="text-xs font-semibold text-primary mt-0.5">
                  {it.price ? `TSh ${it.price.toLocaleString()}` : 'Bei haijawekwa'}
                </p>
              </div>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
                onClick={() => addToCart(it.id, it.pharmacy_id, 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
