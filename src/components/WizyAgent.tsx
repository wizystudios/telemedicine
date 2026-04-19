import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Mic, MicOff, Send, X, Sparkles, Loader2, Stethoscope, Building2, Pill, TestTube, MapPin, Star, Phone, Calendar as CalIcon, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface ToolResult { tool: string; args: any; result: any }
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  results?: ToolResult[];
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const WAKE_WORDS = ['wizy', 'wize', 'wisey'];

export function WizyAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [wakeListening, setWakeListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hideOnRoutes = ['/auth', '/reset-password'];
  const hidden = hideOnRoutes.includes(location.pathname) ||
    (location.pathname === '/messages' && (location.search.includes('doctor=') || location.search.includes('patient=')));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Listen for global "open wizy" events (from BottomNav AI button etc.)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('wizy:open', handler);
    return () => window.removeEventListener('wizy:open', handler);
  }, []);

  // Setup foreground recognition (used while drawer open)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'sw-TZ';
    r.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      setInput(txt);
      setListening(false);
      // Auto-send voice
      setTimeout(() => sendMessage(txt), 100);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, []);

  // Wake word listener (continuous, low-CPU)
  const startWake = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || wakeRecognitionRef.current) return;
    try {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'sw-TZ';
      r.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript.toLowerCase();
          if (WAKE_WORDS.some(w => transcript.includes(w))) {
            setOpen(true);
            try { r.stop(); } catch {}
            wakeRecognitionRef.current = null;
            setWakeListening(false);
            setTimeout(() => startListening(), 400);
            break;
          }
        }
      };
      r.onerror = () => { wakeRecognitionRef.current = null; setWakeListening(false); };
      r.onend = () => { wakeRecognitionRef.current = null; setWakeListening(false); };
      r.start();
      wakeRecognitionRef.current = r;
      setWakeListening(true);
    } catch (e) {
      console.warn('wake word start failed', e);
    }
  };

  const stopWake = () => {
    try { wakeRecognitionRef.current?.stop(); } catch {}
    wakeRecognitionRef.current = null;
    setWakeListening(false);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Sauti haipatikani', description: 'Browser yako haitumii voice input.' });
      return;
    }
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {}
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('wizy-agent', {
        body: { messages: newMessages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data?.reply || '',
        results: Array.isArray(data?.results) ? data.results : [],
      }]);

      // Speak reply (Swahili TTS if available) — but skip auto-navigation (intrusive)
      if ('speechSynthesis' in window && data?.reply) {
        const utt = new SpeechSynthesisUtterance(data.reply);
        utt.lang = 'sw-TZ';
        utt.rate = 1;
        window.speechSynthesis.speak(utt);
      }
    } catch (e: any) {
      toast({ title: 'Wizy', description: e.message || 'Hitilafu', variant: 'destructive' });
      setMessages(prev => [...prev, { role: 'assistant', content: 'Samahani, kuna tatizo. Jaribu tena.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md bg-background rounded-t-3xl md:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[80vh] md:max-h-[600px] animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Wizy</h3>
                  <p className="text-[10px] text-muted-foreground">Msaidizi wako wa AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={wakeListening ? 'default' : 'ghost'}
                  className="h-7 text-[10px] px-2"
                  onClick={() => wakeListening ? stopWake() : startWake()}
                  title='Sema "Wizy" kunifungua'
                >
                  {wakeListening ? '🟢 Wake' : '○ Wake'}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-6 space-y-3">
                  <Bot className="h-10 w-10 mx-auto text-primary/50" />
                  <p>Karibu! Niambie unataka nini.</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[
                      'Tafuta daktari wa moyo',
                      'Onyesha miadi yangu',
                      'Nataka kuagiza Panadol',
                      'Nipeleke famasi za karibu',
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                  {m.content && (
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {m.content}
                    </div>
                  )}
                  {m.role === 'assistant' && m.results && m.results.length > 0 && (
                    <div className="w-full max-w-[95%] space-y-2">
                      {m.results.map((r, idx) => (
                        <ToolResultCard
                          key={idx}
                          tool={r.tool}
                          result={r.result}
                          onNavigate={(path) => { navigate(path); setOpen(false); }}
                          onSend={(t) => sendMessage(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-3.5 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex items-center gap-2">
              <Button
                size="icon"
                variant={listening ? 'destructive' : 'outline'}
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => listening ? stopListening() : startListening()}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                placeholder={listening ? 'Sikiliza...' : 'Andika au sema...'}
                className="flex-1 h-10 px-4 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={loading}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

// ───────── Rich tool-result cards ─────────

function ToolResultCard({
  tool,
  result,
  onNavigate,
  onSend,
}: {
  tool: string;
  result: any;
  onNavigate: (path: string) => void;
  onSend: (text: string) => void;
}) {
  if (!result || result.error) return null;

  if (tool === 'search_doctors' && Array.isArray(result.doctors) && result.doctors.length > 0) {
    return (
      <div className="space-y-1.5">
        {result.doctors.slice(0, 5).map((d: any) => {
          const name = `Dr. ${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.trim();
          const specialty = d.specialties?.name || d.doctor_type || 'Daktari wa jumla';
          return (
            <div key={d.id || d.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
              <Avatar className="h-10 w-10">
                <AvatarImage src={d.profiles?.avatar_url} alt={name} />
                <AvatarFallback>{(d.profiles?.first_name || 'D')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" /> {specialty}
                  {d.rating > 0 && <span className="ml-1 flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{Number(d.rating).toFixed(1)}</span>}
                </p>
              </div>
              <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => onNavigate(`/doctor-profile/${d.user_id}`)}>
                Tazama
              </Button>
            </div>
          );
        })}
        <button
          onClick={() => onNavigate('/doctors-list')}
          className="w-full text-[11px] text-primary hover:underline flex items-center justify-center gap-1 py-1"
        >
          Madaktari wote <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (tool === 'search_facilities' && Array.isArray(result.items) && result.items.length > 0) {
    const Icon = result.type === 'pharmacies' ? Pill : result.type === 'laboratories' ? TestTube : Building2;
    const route = result.type === 'pharmacies' ? '/pharmacy-profile/' : result.type === 'laboratories' ? '/laboratory-profile/' : result.type === 'polyclinics' ? '/polyclinic-profile/' : '/hospital-profile/';
    return (
      <div className="space-y-1.5">
        {result.items.slice(0, 5).map((it: any) => (
          <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {it.logo_url ? <img src={it.logo_url} alt={it.name} className="h-10 w-10 object-cover" /> : <Icon className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{it.name}</p>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {it.address || 'Anwani haijapatikana'}
              </p>
            </div>
            <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => onNavigate(`${route}${it.id}`)}>
              Tazama
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (tool === 'search_medicines' && Array.isArray(result.medicines) && result.medicines.length > 0) {
    return (
      <div className="space-y-1.5">
        {result.medicines.slice(0, 5).map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Pill className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{m.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{m.pharmacies?.name} • {m.price ? `TSh ${m.price}` : 'Bei kwa simu'}</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onSend(`Ongeza ${m.name} kwenye cart`)}>
              <ShoppingCart className="h-3 w-3 mr-1" />Ongeza
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (tool === 'list_my_appointments' && Array.isArray(result.appointments) && result.appointments.length > 0) {
    return (
      <div className="space-y-1.5">
        {result.appointments.slice(0, 5).map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
            <CalIcon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{new Date(a.appointment_date).toLocaleString('sw-TZ')}</p>
              <p className="text-[11px] text-muted-foreground truncate">{a.symptoms || a.consultation_type}</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
          </div>
        ))}
        <button onClick={() => onNavigate('/appointments')} className="w-full text-[11px] text-primary hover:underline flex items-center justify-center gap-1 py-1">
          Miadi yote <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (tool === 'emergency_guidance') {
    return (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm space-y-2">
        <p className="font-bold text-destructive flex items-center gap-2">🚨 Dharura — Piga 112</p>
        <p className="whitespace-pre-line text-foreground/90 text-[12px]">{result.guidance}</p>
        <Button size="sm" variant="destructive" className="h-7 text-[11px] w-full" onClick={() => onNavigate('/nearby')}>
          <MapPin className="h-3 w-3 mr-1" />Hospitali za karibu
        </Button>
      </div>
    );
  }

  if (result.success && result.appointment) {
    return (
      <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm">
        <p className="font-semibold text-green-700 dark:text-green-400">✅ Miadi imewekwa!</p>
        <Button size="sm" className="mt-2 h-7 text-[11px]" onClick={() => onNavigate('/appointments')}>Tazama miadi</Button>
      </div>
    );
  }

  return null;
}
