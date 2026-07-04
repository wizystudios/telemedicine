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
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4 pointer-events-none">
      <div className="mx-auto max-w-2xl pointer-events-auto rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Tunathamini faragha yako 🍪</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tunatumia cookies muhimu ili programu ifanye kazi na cookies za hiari kuboresha huduma. Chagua unayoruhusu.{' '}
                <Link to="/privacy" className="underline text-primary">Sera ya Faragha</Link>
              </p>
            </div>
            <button onClick={() => save({ necessary: true, analytics: false, marketing: false })} className="p-1 -m-1 rounded-lg hover:bg-muted flex-shrink-0" aria-label="Funga">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {details && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Row title="Muhimu (lazima)" desc="Uthibitishaji, usalama, kikao chako." checked disabled />
              <Row title="Uchambuzi" desc="Kutusaidia kuelewa matumizi ya programu." checked={analytics} onChange={setAnalytics} />
              <Row title="Masoko" desc="Kuonyesha maudhui yanayokufaa." checked={marketing} onChange={setMarketing} />
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setDetails(d => !d)}>
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              {details ? 'Ficha' : 'Chagua'}
            </Button>
            <Button variant="outline" size="sm" className="rounded-2xl flex-1 sm:flex-none" onClick={() => save({ necessary: true, analytics: false, marketing: false })}>
              Muhimu tu
            </Button>
            <Button size="sm" className="rounded-2xl flex-1" onClick={() => save({ necessary: true, analytics: details ? analytics : true, marketing: details ? marketing : false })}>
              Kubali {details ? 'chaguzi' : 'zote'}
            </Button>
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
