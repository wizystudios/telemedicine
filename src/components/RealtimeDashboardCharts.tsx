import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Activity, Loader2, Radio } from 'lucide-react';

export type ChartScope = 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory' | 'doctor' | 'patient' | 'admin';

interface Props {
  scope: ChartScope;
  orgId?: string;
  days?: number;
}

interface Row {
  day: string;
  appointments: number;
  messages: number;
  orders: number;
  revenue: number;
  visits: number;
}

const fmtDay = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};

const money = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));

export default function RealtimeDashboardCharts({ scope, orgId, days = 14 }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [pulse, setPulse] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('dashboard_timeseries' as any, {
      _scope: scope,
      _org_id: orgId ?? null,
      _days: days,
    } as any);
    if (!error && data) {
      setRows(
        (data as any[]).map((r) => ({
          day: r.day,
          appointments: Number(r.appointments) || 0,
          messages: Number(r.messages) || 0,
          orders: Number(r.orders) || 0,
          revenue: Number(r.revenue) || 0,
          visits: Number(r.visits) || 0,
        })),
      );
    }
    setLoading(false);
  }, [scope, orgId, days]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates — any change to the underlying activity tables refreshes the series
  useEffect(() => {
    const bump = () => {
      setPulse((p) => p + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => load(), 700);
    };

    const channel = supabase
      .channel(`dash-charts-${scope}-${orgId || 'self'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_orders' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_bookings' }, bump)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [scope, orgId, load]);

  if (loading) {
    return (
      <Card className="rounded-3xl p-10 border-0 shadow-sm flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const total = (k: keyof Row) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const showOrders = scope === 'pharmacy' || scope === 'laboratory' || scope === 'admin' || scope === 'patient';
  const showRevenue = scope !== 'patient';

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" /> Mwenendo wa siku {days}
          </p>
          <Badge variant="secondary" className="rounded-xl text-[10px] gap-1">
            <Radio className={`h-3 w-3 ${live ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
            {live ? 'Moja kwa moja' : 'Inaunganisha...'}
            {pulse > 0 && ` • ${pulse}`}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Stat label="Miadi" value={total('appointments')} />
          <Stat label="Ujumbe" value={total('messages')} />
          {showOrders && <Stat label="Maagizo" value={total('orders')} />}
          {showRevenue && <Stat label="Mapato (TZS)" value={money(total('revenue'))} />}
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ left: -22, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gAppt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                labelFormatter={(l) => new Date(l as string).toLocaleDateString('sw-TZ', { dateStyle: 'medium' })}
                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 6px 24px hsl(var(--foreground)/0.12)' }}
              />
              <Area type="monotone" dataKey="appointments" name="Miadi" stroke="hsl(var(--primary))" fill="url(#gAppt)" strokeWidth={2} />
              <Area type="monotone" dataKey="messages" name="Ujumbe" stroke="hsl(var(--muted-foreground))" fill="url(#gMsg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {showOrders && (
          <Card className="rounded-3xl p-5 border-0 shadow-sm">
            <p className="font-semibold text-sm mb-3">Maagizo / Vipimo kwa siku</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ left: -24, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none' }} />
                  <Bar dataKey="orders" name="Maagizo" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {showRevenue && (
          <Card className="rounded-3xl p-5 border-0 shadow-sm">
            <p className="font-semibold text-sm mb-3">Malipo (TZS) kwa siku</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ left: -18, right: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={money} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => `TZS ${Number(v).toLocaleString()}`}
                    contentStyle={{ borderRadius: 16, border: 'none' }}
                  />
                  <Line type="monotone" dataKey="revenue" name="Mapato" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
