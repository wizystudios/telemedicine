import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Hospital, Wifi } from 'lucide-react';

function todayStr() { return new Date().toISOString().split('T')[0]; }

interface Slot {
  doctor_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  doctor_type: string | null;
  start_time: string;
  end_time: string;
  hospital_id: string | null;
  hospital_name: string | null;
  polyclinic_id: string | null;
  polyclinic_name: string | null;
  is_online: boolean;
}

/** Compact date + available-doctors panel for the Doctors page left column. */
export function AvailabilityCalendarSidebar() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).rpc('doctors_available_on_date', { _date: date });
      setRows((data as Slot[]) || []);
      setLoading(false);
    })();
  }, [date]);

  const dateLabel = new Date(date).toLocaleDateString('sw-TZ', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <aside className="rounded-3xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Waliopo</h2>
          <p className="text-[11px] text-muted-foreground truncate">{dateLabel}</p>
        </div>
      </div>

      <Input
        type="date"
        value={date}
        min={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        className="h-10 text-xs"
      />

      <div className="space-y-2 max-h-[60vh] overflow-y-auto -mr-1 pr-1">
        {loading && <p className="text-center text-[11px] text-muted-foreground py-4">Inapakia...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-[11px] text-center text-muted-foreground py-4">Hakuna daktari siku hii</p>
        )}
        {!loading && rows.map((r, i) => {
          const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Daktari';
          const initials = `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase();
          const orgName = r.hospital_name || r.polyclinic_name;
          return (
            <div key={`${r.doctor_id}-${i}`} className="rounded-2xl border border-border/60 p-2 space-y-1.5">
              <button
                onClick={() => navigate(`/doctor-profile/${r.doctor_id}`)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{initials || 'DR'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">Dk. {name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.doctor_type || 'Daktari'}</p>
                </div>
                {r.is_online && <Wifi className="h-3 w-3 text-emerald-500 shrink-0" />}
              </button>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" /> {r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}
              </div>
              {orgName && (
                <div className="flex items-center gap-1 text-[10px] text-primary truncate">
                  <Hospital className="h-2.5 w-2.5" /> {orgName}
                </div>
              )}
              <Button
                size="sm"
                className="w-full h-7 text-[10px] rounded-full"
                onClick={() => navigate(`/book-appointment?doctor=${r.doctor_id}&date=${date}`)}
              >
                Panga Miadi
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
