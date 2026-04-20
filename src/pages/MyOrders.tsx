import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Phone, MapPin, Truck, Clock, CheckCircle2, XCircle, User } from 'lucide-react';

interface Order {
  id: string;
  medicine_name: string;
  quantity: number;
  total_price: number | null;
  status: string;
  fulfillment_type: string;
  delivery_address: string | null;
  delivery_person_name: string | null;
  delivery_person_phone: string | null;
  pickup_time: string | null;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  pharmacies?: { name: string; phone: string | null; address: string } | null;
}

const STATUS_FLOW = [
  { key: 'pending', label: 'Imeombwa', icon: Clock },
  { key: 'confirmed', label: 'Imekubaliwa', icon: CheckCircle2 },
  { key: 'ready', label: 'Iko Tayari', icon: Package },
  { key: 'dispatched', label: 'Imetumwa', icon: Truck },
  { key: 'completed', label: 'Imekamilika', icon: CheckCircle2 },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Inasubiri',
  confirmed: 'Imekubaliwa',
  ready: 'Iko Tayari',
  dispatched: 'Inaletwa',
  completed: 'Imekamilika',
  cancelled: 'Imeghairiwa',
};

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pharmacy_orders')
        .select('*, pharmacies(name, phone, address)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as any) || []);
      setLoading(false);
    })();

    // Realtime updates
    const ch = supabase
      .channel(`my-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pharmacy_orders',
        filter: `patient_id=eq.${user.id}`,
      }, async () => {
        const { data } = await supabase
          .from('pharmacy_orders')
          .select('*, pharmacies(name, phone, address)')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });
        setOrders((data as any) || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const renderTimeline = (o: Order) => {
    if (o.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <XCircle className="h-4 w-4" /> Agizo limeghairiwa
        </div>
      );
    }
    const currentIdx = STATUS_FLOW.findIndex(s => s.key === o.status);
    // For pickup, skip "dispatched" step
    const flow = o.fulfillment_type === 'pickup'
      ? STATUS_FLOW.filter(s => s.key !== 'dispatched')
      : STATUS_FLOW;
    return (
      <div className="flex items-center justify-between mt-2">
        {flow.map((s, i) => {
          const reached = STATUS_FLOW.findIndex(x => x.key === s.key) <= currentIdx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={`text-[9px] mt-1 text-center ${reached ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < flow.length - 1 && (
                <div className={`absolute h-0.5 ${reached ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-3 pt-3 space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Maagizo Yangu</h1>
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground py-8">Inapakia...</p>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Hujaagiza kitu chochote bado.</p>
            <Button onClick={() => navigate('/marketplace')} className="mt-4" size="sm">
              Tazama Soko la Dawa
            </Button>
          </div>
        )}

        {orders.map(o => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{o.medicine_name} × {o.quantity}</p>
                <p className="text-xs text-muted-foreground">{o.pharmacies?.name || 'Famasi'}</p>
                {o.total_price ? (
                  <p className="text-sm font-bold text-primary mt-1">TSh {o.total_price.toLocaleString()}</p>
                ) : null}
              </div>
              <Badge variant={o.status === 'cancelled' ? 'destructive' : o.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {STATUS_LABEL[o.status] || o.status}
              </Badge>
            </div>

            {renderTimeline(o)}

            {/* Fulfillment info */}
            <div className="rounded-xl bg-muted/40 p-2.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                {o.fulfillment_type === 'delivery' ? <Truck className="h-3.5 w-3.5 text-primary" /> : <MapPin className="h-3.5 w-3.5 text-primary" />}
                <span className="font-medium">
                  {o.fulfillment_type === 'delivery' ? 'Kuletewa' : 'Kuchukua famasi'}
                </span>
              </div>
              {o.fulfillment_type === 'delivery' && o.delivery_address && (
                <p className="text-muted-foreground pl-5">📍 {o.delivery_address}</p>
              )}
              {o.fulfillment_type === 'pickup' && o.pharmacies?.address && (
                <p className="text-muted-foreground pl-5">📍 {o.pharmacies.address}</p>
              )}
              {o.pickup_time && (
                <p className="text-muted-foreground pl-5">🕐 {new Date(o.pickup_time).toLocaleString('sw-TZ')}</p>
              )}
            </div>

            {/* Delivery person info (when assigned) */}
            {o.fulfillment_type === 'delivery' && o.delivery_person_name && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <User className="h-3.5 w-3.5" /> Mtoaji wa Huduma
                </div>
                <p className="pl-5">{o.delivery_person_name}</p>
                {o.delivery_person_phone && (
                  <a href={`tel:${o.delivery_person_phone}`} className="pl-5 flex items-center gap-1 text-primary font-medium">
                    <Phone className="h-3 w-3" /> {o.delivery_person_phone}
                  </a>
                )}
              </div>
            )}

            {/* Pharmacy contact */}
            {o.pharmacies?.phone && o.status !== 'cancelled' && (
              <a href={`tel:${o.pharmacies.phone}`} className="flex items-center gap-1 text-xs text-primary font-medium">
                <Phone className="h-3 w-3" /> Piga famasi: {o.pharmacies.phone}
              </a>
            )}

            {o.notes && (
              <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
                "{o.notes}"
              </p>
            )}

            <p className="text-[10px] text-muted-foreground">
              Iliombwa: {new Date(o.created_at).toLocaleString('sw-TZ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
