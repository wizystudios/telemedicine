import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { disableBiometric, enableBiometric, isBiometricEnrolled, isBiometricSupported } from '@/lib/biometric';

export function BiometricSetting({ displayName }: { displayName?: string }) {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isBiometricSupported().then(setSupported);
    setEnrolled(isBiometricEnrolled());
  }, []);

  if (!supported) return null;

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
    setBusy(false);
  };

  return (
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
      <Button
        variant={enrolled ? 'outline' : 'default'}
        className="w-full rounded-2xl mt-4"
        disabled={busy}
        onClick={toggle}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enrolled ? 'Zima alama ya kidole' : 'Washa alama ya kidole'}
      </Button>
    </Card>
  );
}
