import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartPulse, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ForcePasswordChange() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = (pw: string): string | null => {
    if (pw.length < 8) return 'Angalau herufi 8';
    if (!/[A-Z]/.test(pw)) return '1 herufi KUBWA';
    if (!/[0-9]/.test(pw)) return '1 namba';
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\]/.test(pw)) return '1 alama maalum';
    return null;
  };

  const checks = [
    { ok: password.length >= 8, label: '8+ herufi' },
    { ok: /[A-Z]/.test(password), label: 'Herufi KUBWA' },
    { ok: /[0-9]/.test(password), label: 'Namba' },
    { ok: /[!@#$%^&*(),.?":{}|<>_\-+=/\\]/.test(password), label: 'Alama maalum' },
  ];

  const handleSubmit = async () => {
    const err = validate(password);
    if (err) {
      toast({ title: 'Nenosiri dhaifu', description: err, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Hayalingani', description: 'Nenosiri na uthibitisho hayalingani.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
      return;
    }
    if (user) {
      await supabase.from('profiles').update({
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      } as any).eq('id', user.id);
    }
    setLoading(false);
    toast({ title: 'Umefanikiwa', description: 'Nenosiri lako limebadilishwa.' });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <HeartPulse className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="font-extrabold text-2xl tracking-tight">TeleMed</span>
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Badilisha nenosiri</p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
              Kwa usalama, tafadhali tengeneza nenosiri jipya imara kabla ya kuendelea.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl bg-secondary/50 border-0 px-4 text-sm pr-10"
              placeholder="Nenosiri jipya"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-12 rounded-2xl bg-secondary/50 border-0 px-4 text-sm"
            placeholder="Thibitisha nenosiri"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {checks.map(c => (
            <p key={c.label} className={c.ok ? 'text-primary' : 'text-muted-foreground'}>
              {c.ok ? '✓' : '○'} {c.label}
            </p>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !!validate(password) || password !== confirm}
          className="w-full h-12 text-sm font-semibold"
        >
          {loading ? 'Inahifadhi...' : 'Hifadhi & Endelea'}
        </Button>

        <button
          onClick={async () => { await signOut(); navigate('/auth'); }}
          className="w-full text-xs text-muted-foreground hover:underline"
        >
          Toka
        </button>
      </div>
    </div>
  );
}
