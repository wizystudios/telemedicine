import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  placeholder?: string;
  /** When provided, called on every (debounced) value change to filter the host page locally. */
  onLocalFilter?: (value: string) => void;
  /** Initial query value */
  initial?: string;
  /** When true, also queries DB across doctors/pharmacies/hospitals/medicines and offers cross-page suggestions */
  global?: boolean;
  className?: string;
}

interface Suggestion {
  type: 'doctor' | 'medicine' | 'pharmacy' | 'hospital' | 'lab';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const norm = (s: string) => s.toLowerCase().trim();

export function UniversalSearch({ placeholder = 'Tafuta...', onLocalFilter, initial = '', global = true, className = '' }: Props) {
  const [value, setValue] = useState(initial);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Cross-page keyword shortcuts so a search like "miadi" or "ujumbe" never returns "nothing"
  const KEYWORD_PAGES: { keys: string[]; title: string; subtitle: string; href: string }[] = [
    { keys: ['miadi', 'appointment', 'booking'], title: 'Fungua Miadi', subtitle: 'Orodha ya miadi yako', href: '/appointments' },
    { keys: ['ujumbe', 'message', 'chat', 'mazungumzo'], title: 'Fungua Ujumbe', subtitle: 'Mazungumzo yako yote', href: '/messages' },
    { keys: ['arifa', 'notification', 'taarifa'], title: 'Fungua Arifa', subtitle: 'Arifa zako zote', href: '/notifications' },
    { keys: ['daktari', 'doctor', 'madaktari'], title: 'Madaktari', subtitle: 'Tafuta na vinjari madaktari', href: '/doctors-list' },
    { keys: ['dawa', 'medicine', 'soko', 'famasi'], title: 'Soko la Dawa', subtitle: 'Vinjari dawa zote', href: '/marketplace' },
    { keys: ['hospital', 'hospitali'], title: 'Hospitali', subtitle: 'Tazama hospitali za karibu', href: '/nearby?type=hospitals' },
    { keys: ['maabara', 'lab'], title: 'Maabara', subtitle: 'Tazama maabara', href: '/nearby?type=laboratories' },
    { keys: ['cart', 'kikapu'], title: 'Kikapu', subtitle: 'Bidhaa zako za ununuzi', href: '/cart' },
    { keys: ['agizo', 'order', 'maagizo'], title: 'Maagizo Yangu', subtitle: 'Hali ya maagizo ya dawa', href: '/my-orders' },
    { keys: ['rekodi', 'record', 'records'], title: 'Rekodi za Afya', subtitle: 'Historia yako ya matibabu', href: '/medical-records' },
    { keys: ['wizy', 'msaidizi', 'ai'], title: 'Wizy', subtitle: 'Msaidizi wako wa AI', href: '#wizy' },
    { keys: ['mimi', 'profile', 'wasifu'], title: 'Mimi', subtitle: 'Akaunti na mipangilio', href: '/profile' },
  ];

  const runSearch = async (q: string) => {
    if (!q || q.length < 2 || !global) { setSuggestions([]); return; }
    setLoading(true);
    const like = `%${q}%`;
    try {
      const [docs, meds, phars, hosps, labs] = await Promise.all([
        supabase.from('doctor_profiles')
          .select('user_id, doctor_type, profiles!doctor_profiles_user_id_fkey(first_name, last_name)')
          .eq('is_verified', true).limit(20),
        supabase.from('pharmacy_medicines')
          .select('id, name, category, pharmacy_id, pharmacies(name)').ilike('name', like).limit(5),
        supabase.from('pharmacies').select('id, name').or(`name.ilike.${like}`).limit(3),
        supabase.from('hospitals').select('id, name').or(`name.ilike.${like}`).limit(3),
        supabase.from('laboratories').select('id, name').or(`name.ilike.${like}`).limit(3),
      ]);
      const out: Suggestion[] = [];
      // Local fuzzy filter on doctors (since name is on profiles)
      const ql = norm(q);
      (docs.data || []).forEach((d: any) => {
        const name = `${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.trim();
        const blob = norm(`${name} ${d.doctor_type || ''}`);
        if (name && blob.includes(ql)) {
          out.push({ type: 'doctor', id: d.user_id, title: `Dk. ${name}`, subtitle: d.doctor_type || 'Daktari', href: `/doctor-profile/${d.user_id}` });
        }
      });
      (meds.data || []).forEach((m: any) => out.push({
        type: 'medicine', id: m.id, title: m.name, subtitle: `${m.pharmacies?.name || 'Famasi'} · Dawa`,
        href: `/marketplace?q=${encodeURIComponent(m.name)}`,
      }));
      (phars.data || []).forEach((p: any) => out.push({ type: 'pharmacy', id: p.id, title: p.name, subtitle: 'Famasi', href: `/pharmacy-profile/${p.id}` }));
      (hosps.data || []).forEach((h: any) => out.push({ type: 'hospital', id: h.id, title: h.name, subtitle: 'Hospitali', href: `/hospital-profile/${h.id}` }));
      (labs.data || []).forEach((l: any) => out.push({ type: 'lab', id: l.id, title: l.name, subtitle: 'Maabara', href: `/laboratory-profile/${l.id}` }));

      // Always append matching keyword-pages (so "miadi", "ujumbe", "wizy" never return "nothing")
      const ql = norm(q);
      KEYWORD_PAGES.forEach((kp) => {
        if (kp.keys.some(k => k.includes(ql) || ql.includes(k))) {
          out.push({ type: 'doctor' as any, id: `kw-${kp.href}`, title: kp.title, subtitle: kp.subtitle, href: kp.href });
        }
      });
      setSuggestions(out.slice(0, 12));
    } finally {
      setLoading(false);
    }
  };

  const onChange = (v: string) => {
    setValue(v);
    setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onLocalFilter?.(v);
      runSearch(v);
    }, 300);
  };

  const clear = () => {
    setValue(''); setSuggestions([]); setOpen(false);
    onLocalFilter?.('');
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-9 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      {value && (
        <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
      {open && global && value.length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 rounded-2xl border border-border bg-popover shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Inatafuta...
            </div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">
              Hakuna majibu. Jaribu jina lingine au neno fupi.
            </div>
          )}
          {suggestions.map(s => (
            <button
              key={`${s.type}-${s.id}`}
              onClick={() => {
                setOpen(false);
                if (s.href === '#wizy') { window.dispatchEvent(new Event('wizy:open')); return; }
                navigate(s.href);
              }}
              className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center justify-between gap-2 border-b border-border/40 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.subtitle}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-primary shrink-0">{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
