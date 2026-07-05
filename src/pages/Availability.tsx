import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, Stethoscope,
  Hospital, MessageCircle, Search, Wifi, Star
} from 'lucide-react';

interface DoctorSlot {
  doctor_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  doctor_type: string | null;
  consultation_fee: number | null;
  rating: number | null;
  start_time: string;
  end_time: string;
  location: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  polyclinic_id: string | null;
  polyclinic_name: string | null;
  is_online: boolean;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function Availability() {
  const navigate = useNavigate();
  const [date, setDate] = useState<string>(todayStr());
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('doctors_available_on_date', { _date: date });
      if (!error) setRows((data as DoctorSlot[]) || []);
      setLoading(false);
    })();
  }, [date]);

  const filtered = q
    ? rows.filter(r =>
        `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q.toLowerCase()) ||
        (r.doctor_type ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (r.hospital_name ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (r.polyclinic_name ?? '').toLowerCase().includes(q.toLowerCase()))
    : rows;

  const dateLabel = new Date(date).toLocaleDateString('sw-TZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl px-3 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" /> Madaktari Waliopo
          </h1>
          <p className="text-xs text-muted-foreground">Chagua tarehe uone madaktari waliopo siku hiyo</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <label className="text-xs text-muted-foreground">Tarehe</label>
          <Input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta daktari, aina au hospitali..."
            className="pl-9 h-10 text-sm"
          />
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground py-8">Inapakia...</p>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-muted-foreground">Hakuna daktari aliyeripoti kupatikana siku hii.</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/doctors-list')}>
              Tazama Madaktari Wote
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((r, i) => {
            const name = `Dkt. ${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
            const initials = `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase();
            const orgName = r.hospital_name || r.polyclinic_name;
            const orgPath = r.hospital_id
              ? `/hospital-profile/${r.hospital_id}`
              : r.polyclinic_id
              ? `/polyclinic-profile/${r.polyclinic_id}`
              : null;

            return (
              <div
                key={`${r.doctor_id}-${i}`}
                className="rounded-2xl border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => navigate(`/doctor-profile/${r.doctor_id}`)}
                    className="shrink-0"
                    aria-label={`Fungua wasifu wa ${name}`}
                  >
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>{initials || 'DR'}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/doctor-profile/${r.doctor_id}`)}
                      className="text-sm font-semibold truncate hover:underline text-left w-full"
                    >
                      {name || 'Daktari'}
                    </button>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Stethoscope className="h-3 w-3" />
                      <span className="truncate">{r.doctor_type || 'Daktari wa Jumla'}</span>
                      {r.rating != null && (
                        <span className="flex items-center gap-0.5 ml-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {Number(r.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {orgName && orgPath && (
                      <button
                        onClick={() => navigate(orgPath)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Hospital className="h-3 w-3" />
                        <span className="truncate">{orgName}</span>
                      </button>
                    )}
                  </div>
                  {r.is_online && (
                    <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                      <Wifi className="h-2.5 w-2.5" /> Mtandaoni
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pl-15">
                  <Clock className="h-3 w-3" />
                  <span>{r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}</span>
                  {r.location && <span className="truncate">· {r.location}</span>}
                  {r.consultation_fee != null && r.consultation_fee > 0 && (
                    <span className="ml-auto font-medium text-foreground">
                      TSh {Number(r.consultation_fee).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-full text-xs"
                    onClick={() => navigate(`/book-appointment?doctor=${r.doctor_id}&date=${date}`)}
                  >
                    <CalendarIcon className="mr-1 h-3.5 w-3.5" /> Panga Miadi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full text-xs"
                    onClick={() => navigate(`/messages?doctor=${r.doctor_id}`)}
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Ongea
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
