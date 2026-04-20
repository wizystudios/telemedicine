import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HeartPulse, Eye, EyeOff,
  ChevronLeft, ArrowRight, Phone, Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Role = 'patient';
type AuthMethod = 'email' | 'phone';

// Public registration is patient-only. All other roles (doctor, hospital, pharmacy, lab, polyclinic)
// are created by Super Admin to ensure proper verification.

export default function Auth() {
  const [mode, setMode] = useState<'select' | 'login' | 'register'>('select');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [loginStep, setLoginStep] = useState(1);
  const [registerStep, setRegisterStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const role: Role = 'patient'; // Public signup is patient-only
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalLoginSteps = 2;
  // Removed role-selection step: patient-only public signup
  const totalRegisterSteps = authMethod === 'email' ? 6 : 5;

  const handleForgotPassword = async () => {
    const id = authMethod === 'email' ? email : phone;
    if (!id || authMethod === 'phone') {
      toast({ title: 'Email inahitajika', description: 'Tumia email kurejesha nenosiri.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tumeshatuma', description: 'Angalia email yako kwa kiungo cha kurejesha nenosiri.' });
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const loginId = authMethod === 'email' ? email : phone;
      const { error } = await signIn(loginId, password);
      if (error) throw error;
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswordStrength = (pw: string): string | null => {
    if (pw.length < 8) return 'Angalau herufi 8';
    if (!/[A-Z]/.test(pw)) return 'Angalau herufi 1 KUBWA';
    if (!/[0-9]/.test(pw)) return 'Angalau namba 1';
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\]/.test(pw)) return 'Angalau alama 1 maalum (!@#$...)';
    return null;
  };

  const handleRegister = async () => {
    const pwError = validatePasswordStrength(password);
    if (pwError) {
      toast({ title: 'Nenosiri dhaifu', description: pwError, variant: 'destructive' });
      setRegisterStep(3);
      return;
    }
    setIsLoading(true);
    try {
      const signUpEmail = authMethod === 'email' ? email : `${phone.replace(/[^0-9]/g, '')}@phone.telemed.tz`;
      const { data, error } = await signUp(signUpEmail, password, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        role
      });
      if (error) throw error;
      if (data?.user) {
        await supabase.from('user_roles').insert([{ user_id: data.user.id, role: role as any }]);
        // Mark password as just set so user is not asked to change immediately
        await supabase.from('profiles').update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        } as any).eq('id', data.user.id);
      }
      toast({ title: 'Umefanikiwa!', description: 'Akaunti yako ya mgonjwa imetengenezwa.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (mode === 'select') return;
    if (mode === 'login') {
      if (loginStep > 1) return setLoginStep(loginStep - 1);
      return setMode('select');
    }
    if (mode === 'register') {
      if (registerStep > 1) return setRegisterStep(registerStep - 1);
      return setMode('select');
    }
  };

  const currentStep = mode === 'login' ? loginStep : registerStep;
  const totalSteps = mode === 'login' ? totalLoginSteps : totalRegisterSteps;

  const inputClass = "h-12 rounded-2xl bg-secondary/50 border-0 px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-card transition-all";

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 safe-area-top h-14 flex items-center">
        {mode !== 'select' && (
          <button onClick={goBack} className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <HeartPulse className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">TeleMed</span>
        </div>

        {/* MODE SELECT */}
        {mode === 'select' && (
          <div className="w-full max-w-sm space-y-4 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold">Karibu TeleMed</h2>
              <p className="text-sm text-muted-foreground mt-1">Afya yako mkononi mwako</p>
            </div>
            <Button
              onClick={() => { setMode('login'); setLoginStep(1); }}
              className="w-full h-12 text-sm font-semibold"
            >
              Ingia <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setMode('register'); setRegisterStep(1); }}
              className="w-full h-12 text-sm font-semibold"
            >
              Jisajili <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* LOGIN STEP 1 */}
        {mode === 'login' && loginStep === 1 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-center">Ingia kwenye akaunti</h2>
            
            <div className="flex gap-2 justify-center">
              {[
                { method: 'email' as AuthMethod, icon: Mail, label: 'Email' },
                { method: 'phone' as AuthMethod, icon: Phone, label: 'Simu' },
              ].map(({ method, icon: Icon, label }) => (
                <button
                  key={method}
                  onClick={() => setAuthMethod(method)}
                  className={`flex items-center gap-2 text-sm px-5 py-2.5 rounded-2xl transition-all font-medium ${
                    authMethod === method ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            {authMethod === 'email' ? (
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Email yako"
                autoFocus
              />
            ) : (
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+255 7XX XXX XXX"
                autoFocus
              />
            )}

            <Button
              onClick={() => setLoginStep(2)}
              disabled={authMethod === 'email' ? !email : !phone}
              className="w-full h-12 text-sm font-semibold"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* LOGIN STEP 2 */}
        {mode === 'login' && loginStep === 2 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold">Nenosiri</h2>
              <p className="text-xs text-muted-foreground mt-1">{authMethod === 'email' ? email : phone}</p>
            </div>
            
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="Nenosiri lako"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleLogin()}
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
              onClick={handleLogin}
              disabled={isLoading || password.length < 6}
              className="w-full h-12 text-sm font-semibold"
            >
              {isLoading ? 'Subiri...' : 'Ingia'}
            </Button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="w-full text-xs text-primary hover:underline font-medium"
            >
              Umesahau nenosiri?
            </button>
          </div>
        )}

        {/* REGISTER STEP 1: Choose method */}
        {mode === 'register' && registerStep === 1 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold">Jisajili</h2>
              <p className="text-sm text-muted-foreground mt-1">Chagua njia ya kusajili</p>
            </div>

            <div className="space-y-2.5">
              {[
                { method: 'email' as AuthMethod, icon: Mail, label: 'Email', desc: 'Sajili kwa email' },
                { method: 'phone' as AuthMethod, icon: Phone, label: 'Simu', desc: 'Sajili kwa simu' },
              ].map(({ method, icon: Icon, label, desc }) => (
                <button
                  key={method}
                  onClick={() => { setAuthMethod(method); setRegisterStep(2); }}
                  className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-accent transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* REGISTER STEP 2: Identifier */}
        {mode === 'register' && registerStep === 2 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-center">
              {authMethod === 'email' ? 'Email yako' : 'Nambari ya simu'}
            </h2>
            
            <Input
              type={authMethod === 'email' ? 'email' : 'tel'}
              value={authMethod === 'email' ? email : phone}
              onChange={(e) => authMethod === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
              className={inputClass}
              placeholder={authMethod === 'email' ? 'mfano@email.com' : '+255 7XX XXX XXX'}
              autoFocus
            />

            <Button
              onClick={() => setRegisterStep(3)}
              disabled={authMethod === 'email' ? !email : !phone}
              className="w-full h-12 text-sm font-semibold"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 3: Password (strong) */}
        {mode === 'register' && registerStep === 3 && (
          <div className="w-full max-w-sm space-y-4 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold">Tengeneza nenosiri</h2>
              <p className="text-xs text-muted-foreground mt-1">8+ herufi, KUBWA, namba, alama</p>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="Nenosiri imara"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-1 text-[11px]">
              {[
                { ok: password.length >= 8, label: '8+ herufi' },
                { ok: /[A-Z]/.test(password), label: '1 herufi KUBWA' },
                { ok: /[0-9]/.test(password), label: '1 namba' },
                { ok: /[!@#$%^&*(),.?":{}|<>_\-+=/\\]/.test(password), label: '1 alama maalum' },
              ].map(r => (
                <p key={r.label} className={r.ok ? 'text-primary' : 'text-muted-foreground'}>
                  {r.ok ? '✓' : '○'} {r.label}
                </p>
              ))}
            </div>
            <Button
              onClick={() => setRegisterStep(4)}
              disabled={!!validatePasswordStrength(password)}
              className="w-full h-12 text-sm font-semibold"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 4: First Name */}
        {mode === 'register' && registerStep === 4 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-center">Jina la kwanza</h2>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="Jina lako"
              autoFocus
            />
            <Button
              onClick={() => setRegisterStep(5)}
              disabled={!firstName.trim()}
              className="w-full h-12 text-sm font-semibold"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 5: Last Name */}
        {mode === 'register' && registerStep === 5 && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-center">Jina la familia</h2>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="Ukoo"
              autoFocus
            />
            <Button
              onClick={() => setRegisterStep(6)}
              disabled={!lastName.trim()}
              className="w-full h-12 text-sm font-semibold"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 6 (email): Phone optional + FINISH (patient-only) */}
        {mode === 'register' && registerStep === 6 && authMethod === 'email' && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold">Nambari ya simu</h2>
              <p className="text-xs text-muted-foreground mt-1">Si lazima — bonyeza Maliza ukikosa</p>
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+255 7XX XXX XXX"
              autoFocus
            />
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full h-12 text-sm font-semibold"
            >
              {isLoading ? 'Subiri...' : 'Maliza Usajili'}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Madaktari, hospitali, famasi & maabara husajiliwa na Msimamizi.
            </p>
          </div>
        )}

        {/* REGISTER STEP 5 (phone): Finish directly (patient-only) */}
        {mode === 'register' && registerStep === 5 && authMethod === 'phone' && (
          <div className="w-full max-w-sm space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-center">Karibu TeleMed!</h2>
            <p className="text-xs text-center text-muted-foreground">
              Bonyeza Maliza kuanza kutumia akaunti yako ya mgonjwa.
            </p>
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full h-12 text-sm font-semibold"
            >
              {isLoading ? 'Subiri...' : 'Maliza Usajili'}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Madaktari, hospitali, famasi & maabara husajiliwa na Msimamizi.
            </p>
          </div>
        )}

        {/* Progress Dots */}
        {mode !== 'select' && (
          <div className="flex justify-center gap-1.5 mt-8">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === currentStep ? 'w-6 bg-primary' : s < currentStep ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
