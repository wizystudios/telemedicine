import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Search, Calendar, MessageCircle, ShoppingBag,
  Stethoscope, ClipboardCheck, Pencil, CheckCircle2,
  Building2, Users, BarChart3, X,
} from 'lucide-react';

type Role = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner' | 'polyclinic_owner' | 'super_admin' | string;

interface Slide {
  icon: any;
  title: string;
  body: string;
}

const SLIDES: Record<string, Slide[]> = {
  patient: [
    { icon: Search, title: 'Tafuta huduma', body: 'Tumia utafutaji kupata daktari, hospitali, famasi au maabara karibu nawe.' },
    { icon: Calendar, title: 'Weka miadi', body: 'Chagua daktari na tarehe. Utapata thibitisho pindi daktari akikubali.' },
    { icon: MessageCircle, title: 'Mazungumzo & Ushauri', body: 'Ongea na daktari kupitia ujumbe salama, pokea maelekezo na dawa.' },
    { icon: ShoppingBag, title: 'Agiza dawa', body: 'Agiza dawa kutoka famasi iliyothibitishwa na uchukue au ipelekwe.' },
  ],
  doctor: [
    { icon: ClipboardCheck, title: 'Idhinisha maombi', body: 'Kagua maombi ya wagonjwa na kubali au kata rufaa haraka.' },
    { icon: MessageCircle, title: 'Fanya mashauri', body: 'Zungumza na mgonjwa kupitia ujumbe au simu ndani ya jukwaa.' },
    { icon: Pencil, title: 'Andika dawa', body: 'Toa dawa halali kwa dijitali — mgonjwa ataziona na kuagiza.' },
    { icon: CheckCircle2, title: 'Kamilisha miadi', body: 'Weka alama miadi kama imekamilika ili mgonjwa aweze kutoa maoni.' },
  ],
  hospital_owner: [
    { icon: Users, title: 'Simamia madaktari', body: 'Ongeza, thibitisha na simamia madaktari wa hospitali yako.' },
    { icon: Building2, title: 'Huduma & Bima', body: 'Onyesha huduma zako, bei na bima zinazokubalika.' },
    { icon: BarChart3, title: 'Takwimu za moja kwa moja', body: 'Fuatilia wageni, miadi na utendaji wa hospitali kila siku.' },
  ],
  pharmacy_owner: [
    { icon: ShoppingBag, title: 'Simamia dawa', body: 'Ongeza dawa, bei na hali ya hifadhi kwa urahisi.' },
    { icon: ClipboardCheck, title: 'Pokea maagizo', body: 'Kubali maagizo ya wagonjwa na wagawe kwa haraka.' },
    { icon: BarChart3, title: 'Ripoti za moja kwa moja', body: 'Ona mauzo na maagizo mapya kwa muda halisi.' },
  ],
  lab_owner: [
    { icon: Stethoscope, title: 'Vipimo vinavyotolewa', body: 'Onyesha vipimo, bei na muda wa kupata majibu.' },
    { icon: ClipboardCheck, title: 'Kubali maombi', body: 'Kubali maombi ya wagonjwa na waarifu wakati wa kufika.' },
    { icon: CheckCircle2, title: 'Toa majibu', body: 'Weka matokeo salama — mgonjwa ataarifiwa moja kwa moja.' },
  ],
  polyclinic_owner: [
    { icon: Users, title: 'Timu ya madaktari', body: 'Ongeza na thibitisha madaktari wa kliniki yako.' },
    { icon: Building2, title: 'Huduma za kliniki', body: 'Weka huduma, bei na bima zinazokubalika.' },
    { icon: BarChart3, title: 'Takwimu za utendaji', body: 'Fuatilia wageni, miadi na maudhui yaliyochapishwa.' },
  ],
};

function storageKey(userId: string, role: Role) {
  return `telemed_onboarded:${userId}:${role}`;
}

export function shouldShowOnboarding(userId: string | undefined, role: Role | undefined | null) {
  if (!userId || !role) return false;
  if (!(role in SLIDES)) return false;
  try {
    return localStorage.getItem(storageKey(userId, role)) !== '1';
  } catch {
    return false;
  }
}

interface Props {
  userId: string;
  role: Role;
  onDone: () => void;
}

export function RoleOnboarding({ userId, role, onDone }: Props) {
  const slides = SLIDES[role] || SLIDES.patient;
  const [i, setI] = useState(0);

  useEffect(() => {
    // Prevent background scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const finish = () => {
    try { localStorage.setItem(storageKey(userId, role), '1'); } catch { /* noop */ }
    onDone();
  };

  const s = slides[i];
  const Icon = s.icon;
  const isLast = i === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl relative">
        <button
          onClick={finish}
          aria-label="Ruka"
          className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{s.title}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
          </div>

          <div className="flex justify-center gap-1.5 pt-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-6 bg-primary' : idx < i ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2 w-full pt-2">
            {i > 0 && (
              <Button variant="outline" onClick={() => setI(i - 1)} className="flex-1">
                Nyuma
              </Button>
            )}
            <Button
              onClick={() => (isLast ? finish() : setI(i + 1))}
              className="flex-1"
            >
              {isLast ? 'Anza' : 'Endelea'}
            </Button>
          </div>

          {!isLast && (
            <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">
              Ruka utangulizi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
