import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Loader2, ShieldCheck, RotateCcw, Smartphone, LifeBuoy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  disableBiometric, enableBiometric, isBiometricEnrolled, isBiometricSupported,
  clearBiometric, getStoredBiometric,
} from '@/lib/biometric';

export function BiometricSetting({ displayName }: { displayName?: string }) {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const loadDevices = useCallback(async () => {
    const { data } = await supabase.rpc('my_biometric_devices' as any, {} as any);
    setDevices((data as any[]) || []);
  }, []);

  useEffect(() => {
    isBiometricSupported().then(setSupported);
    setEnrolled(isBiometricEnrolled());
    loadDevices();
  }, [loadDevices]);

  if (!supported && devices.length === 0) return null;

  const stored = getStoredBiometric();
  const otherDevices = devices.filter((d) => d.credential_id !== stored?.credentialId);

  const toggle = async () => {
    setBusy(true);
    if (enrolled) {
      await disableBiometric();
      setEnrolled(false);
      toast({ title: 'Imezimwa', description: 'Alama ya kidole imeondolewa kwenye kifaa hiki.' });
    } else {
      const { error } = await enableBiometric(displayName || 'TeleMed');
      if (error) toast({ title: 'Imeshindwa', description: error, variant: 'destructive' });
      else {
        setEnrolled(true);
        toast({ title: 'Imewashwa', description: 'Sasa unaweza kuingia kwa alama ya kidole.' });
      }
    }
    await loadDevices();
    setBusy(false);
  };

  /** Re-enrol on this device (fixes expired sessions / changed fingerprint sensor). */
  const resync = async () => {
    setRecovering(true);
    clearBiometric();
    const { error } = await enableBiometric(displayName || 'TeleMed');
    if (error) {
      setEnrolled(false);
      toast({ title: 'Imeshindwa kusawazisha', description: error, variant: 'destructive' });
    } else {
      setEnrolled(true);
      toast({ title: 'Imesawazishwa', description: 'Alama ya kidole ya kifaa hiki imesajiliwa upya.' });
    }
    await loadDevices();
    setRecovering(false);
  };

  /** Full recovery: remove every enrolled device from the account. */
  const resetAll = async () => {
    setRecovering(true);
    const { error } = await supabase.rpc('reset_my_biometric' as any, {} as any);
    clearBiometric();
    setEnrolled(false);
    if (error) toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    else toast({ title: 'Vifaa vyote vimeondolewa', description: 'Ingia kwa nenosiri kisha uwashe upya alama ya kidole.' });
    await loadDevices();
    setRecovering(false);
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Fingerprint className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Ingia kwa alama ya kidole</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bila kuandika email na nenosiri kila mara. Inatumika kwenye kifaa hiki pekee.
            </p>
            {enrolled && (
              <p className="text-[11px] text-green-600 mt-1 inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Imewashwa kwenye kifaa hiki
              </p>
            )}
          </div>
        </div>
        {supported && (
          <Button
            variant={enrolled ? 'outline' : 'default'}
            className="w-full rounded-2xl mt-4"
            disabled={busy || recovering}
            onClick={toggle}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enrolled ? 'Zima alama ya kidole' : 'Washa alama ya kidole'}
          </Button>
        )}
      </Card>

      <Card className="rounded-3xl p-5 border-0 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <LifeBuoy className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Urejeshaji wa alama ya kidole</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Umebadilisha simu, umefuta data au alama haitambuliki tena? Sawazisha upya au ondoa vifaa vyote kisha uingie kwa nenosiri.
            </p>
          </div>
        </div>

        {devices.length > 0 && (
          <div className="space-y-1.5">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-2xl bg-muted/30 p-3">
                <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{d.device_label || 'Kifaa'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Kimesajiliwa {new Date(d.created_at).toLocaleDateString('sw-TZ')}
                  </p>
                </div>
                {d.credential_id === stored?.credentialId && (
                  <Badge variant="secondary" className="rounded-xl text-[10px]">Hiki</Badge>
                )}
              </div>
            ))}
            {otherDevices.length > 0 && (
              <p className="text-[11px] text-muted-foreground px-1">
                Vifaa vingine {otherDevices.length} vimesajiliwa kwenye akaunti hii.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {supported && (
            <Button variant="outline" className="flex-1 rounded-2xl" disabled={recovering || busy} onClick={resync}>
              {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-1.5" />Sawazisha</>}
            </Button>
          )}
          <Button
            variant="ghost"
            className="flex-1 rounded-2xl text-destructive hover:text-destructive"
            disabled={recovering || busy || devices.length === 0}
            onClick={resetAll}
          >
            Ondoa vifaa vyote
          </Button>
        </div>
      </Card>
    </div>
  );
}
