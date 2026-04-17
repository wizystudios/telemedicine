import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeartPulse, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) setIsRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Umefanikiwa', description: 'Nenosiri limebadilishwa.' });
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <HeartPulse className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="font-extrabold text-2xl tracking-tight">TeleMed</span>
      </div>
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-bold">Weka nenosiri jipya</h2>
          <p className="text-xs text-muted-foreground mt-1">Angalau herufi 6</p>
        </div>
        {!isRecovery && (
          <p className="text-xs text-center text-muted-foreground">
            Fungua kiungo kutoka email yako ili kubadilisha nenosiri.
          </p>
        )}
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-2xl bg-secondary/50 border-0 px-4 text-sm pr-10"
            placeholder="Nenosiri jipya"
            disabled={!isRecovery}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading || password.length < 6 || !isRecovery}
          className="w-full h-12 text-sm font-semibold"
        >
          {loading ? 'Subiri...' : 'Hifadhi'}
        </Button>
      </div>
    </div>
  );
}
