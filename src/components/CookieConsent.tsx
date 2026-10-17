import { useEffect, useState } from 'react';
import { Cookie, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'telemed_cookie_consent_v1';

type Consent = { necessary: true; analytics: boolean; marketing: boolean; ts: string };

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const save = async (choice: Omit<Consent, 'ts'>) => {
    const payload: Consent = { ...choice, ts: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
    setShow(false);
    // Log audit trail (best-effort, ignore errors)
    try {
      const { data: userRes } = await supabase.auth.getUser();
      await supabase.from('cookie_consents').insert({
        user_id: userRes?.user?.id ?? null,
        session_id: crypto.randomUUID(),
        necessary: true,
        analytics: choice.analytics,
        marketing: choice.marketing,
        user_agent: navigator.userAgent.slice(0, 500),
      });
    } catch {}
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card shadow-2xl">
        <div className="px-6 pb-6 pt-7">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted sm:hidden" />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
            <Cookie className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-center text-lg font-semibold">Tunathamini faragha yako</h3>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Tunatumia cookies muhimu ili programu ifanye kazi, na za hiari kuboresha huduma. Wewe ndiye unachagua.
          </p>
          <Link to="/privacy" className="mt-1 block text-center text-sm font-medium text-primary">Soma Sera ya Faragha</Link>

          {details && (
            <div className="mt-5 space-y-4 rounded-3xl bg-muted/50 p-4">
              <Row title="Muhimu (lazima)" desc="Uthibitishaji, usalama, kikao chako." checked disabled />
              <Row title="Uchambuzi" desc="Kutusaidia kuelewa matumizi ya programu." checked={analytics} onChange={setAnalytics} />
              <Row title="Masoko" desc="Kuonyesha maudhui yanayokufaa." checked={marketing} onChange={setMarketing} />
            </div>
          )}

          <div className="mt-6 space-y-2">
            <Button className="h-12 w-full rounded-2xl text-base" onClick={() => save({ necessary: true, analytics: details ? analytics : true, marketing: details ? marketing : false })}>
              Kubali {details ? 'chaguzi' : 'zote'}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-2xl" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>
                Muhimu tu
              </Button>
              <Button variant="ghost" className="h-11 rounded-2xl" onClick={() => setDetails(d => !d)}>
                <Shield className="mr-1.5 h-4 w-4" />{details ? 'Ficha' : 'Chagua'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
