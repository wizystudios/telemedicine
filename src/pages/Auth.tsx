import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HeartPulse, Eye, EyeOff, User, Stethoscope, Building2, Pill, FlaskConical,
  ChevronLeft, ArrowRight, Phone, Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Role = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner';
type AuthMethod = 'email' | 'phone';

const roles = [
  { id: 'patient', label: 'Mgonjwa', icon: User, color: 'bg-blue-500' },
  { id: 'doctor', label: 'Daktari', icon: Stethoscope, color: 'bg-green-500' },
  { id: 'hospital_owner', label: 'Hospitali', icon: Building2, color: 'bg-purple-500' },
  { id: 'pharmacy_owner', label: 'Famasi', icon: Pill, color: 'bg-pink-500' },
  { id: 'lab_owner', label: 'Maabara', icon: FlaskConical, color: 'bg-teal-500' },
];

export default function Auth() {
  const [mode, setMode] = useState<'select' | 'login' | 'register'>('select');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [loginStep, setLoginStep] = useState(1); // 1=identifier, 2=password
  const [registerStep, setRegisterStep] = useState(1); // 1=method, 2=identifier, 3=password, 4=firstName, 5=lastName, 6=phone(if email), 7=role
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('patient');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalLoginSteps = 2;
  const totalRegisterSteps = authMethod === 'email' ? 7 : 6;

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

  const handleRegister = async () => {
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
      }
      toast({ title: 'Umefanikiwa!', description: 'Akaunti yako imetengenezwa.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Kosa', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (mode === 'select') return navigate('/');
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 safe-area-top">
        {mode !== 'select' && (
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
            <HeartPulse className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl">TeleMed</span>
        </div>

        {/* MODE SELECT */}
        {mode === 'select' && (
          <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-center mb-6">Karibu TeleMed</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Huduma za afya mkononi mwako
            </p>
            <Button
              onClick={() => { setMode('login'); setLoginStep(1); }}
              className="w-full h-12 rounded-xl text-sm font-medium"
            >
              Ingia <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setMode('register'); setRegisterStep(1); }}
              className="w-full h-12 rounded-xl text-sm font-medium"
            >
              Jisajili <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* LOGIN STEP 1: Choose method + enter identifier */}
        {mode === 'login' && loginStep === 1 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Ingia kwenye akaunti yako</h2>
            
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all ${
                  authMethod === 'email' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all ${
                  authMethod === 'phone' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <Phone className="h-4 w-4" /> Simu
              </button>
            </div>

            {authMethod === 'email' ? (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Email yako</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="mfano@email.com"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Nambari ya simu</span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="+255 7XX XXX XXX"
                  autoFocus
                />
              </div>
            )}

            <Button
              onClick={() => setLoginStep(2)}
              disabled={authMethod === 'email' ? !email : !phone}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* LOGIN STEP 2: Password */}
        {mode === 'login' && loginStep === 2 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Weka nenosiri lako</h2>
            <p className="text-xs text-muted-foreground text-center">
              {authMethod === 'email' ? email : phone}
            </p>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Nenosiri</span>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 pr-8 focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading || password.length < 6}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              {isLoading ? 'Subiri...' : 'Ingia'} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Kwa kuendelea, unakubali Masharti na Sera ya Faragha
            </p>
          </div>
        )}

        {/* REGISTER STEP 1: Choose method */}
        {mode === 'register' && registerStep === 1 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Jisajili vipi?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Chagua njia ya kusajili
            </p>

            <div className="space-y-3">
              <button
                onClick={() => { setAuthMethod('email'); setRegisterStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">Sajili kwa email</p>
                </div>
              </button>
              
              <button
                onClick={() => { setAuthMethod('phone'); setRegisterStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Nambari ya Simu</p>
                  <p className="text-xs text-muted-foreground">Sajili kwa simu</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* REGISTER STEP 2: Identifier */}
        {mode === 'register' && registerStep === 2 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">
              {authMethod === 'email' ? 'Email yako' : 'Nambari ya simu'}
            </h2>
            
            {authMethod === 'email' ? (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="mfano@email.com"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Nambari ya simu</span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="+255 7XX XXX XXX"
                  autoFocus
                />
              </div>
            )}

            <Button
              onClick={() => setRegisterStep(3)}
              disabled={authMethod === 'email' ? !email : !phone}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 3: Password */}
        {mode === 'register' && registerStep === 3 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Tengeneza nenosiri</h2>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Nenosiri (angalau herufi 6)</span>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 pr-8 focus-visible:ring-0 focus-visible:border-primary"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={() => setRegisterStep(4)}
              disabled={password.length < 6}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 4: First Name */}
        {mode === 'register' && registerStep === 4 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Jina la kwanza</h2>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Jina lako</span>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                placeholder="Jina"
                autoFocus
              />
            </div>

            <Button
              onClick={() => setRegisterStep(5)}
              disabled={!firstName.trim()}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 5: Last Name */}
        {mode === 'register' && registerStep === 5 && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Jina la familia</h2>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Jina la ukoo</span>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                placeholder="Ukoo"
                autoFocus
              />
            </div>

            <Button
              onClick={() => setRegisterStep(6)}
              disabled={!lastName.trim()}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER STEP 6 (email): Phone optional OR STEP 6 (phone): Role */}
        {mode === 'register' && registerStep === 6 && authMethod === 'email' && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Nambari ya simu</h2>
            <p className="text-xs text-muted-foreground text-center">(Si lazima)</p>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Simu</span>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                placeholder="+255 7XX XXX XXX"
                autoFocus
              />
            </div>

            <Button
              onClick={() => setRegisterStep(7)}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              Endelea <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* REGISTER ROLE STEP (6 for phone, 7 for email) */}
        {mode === 'register' && ((registerStep === 6 && authMethod === 'phone') || (registerStep === 7 && authMethod === 'email')) && (
          <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-lg font-semibold text-center">Unatumia kama nani?</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as Role)}
                    className={`p-4 rounded-xl transition-all text-center ${
                      isSelected 
                        ? 'bg-primary/10 ring-2 ring-primary' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full ${r.color} mx-auto mb-2 flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs font-medium">{r.label}</p>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              {isLoading ? 'Subiri...' : 'Maliza'} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Progress Dots */}
        {mode !== 'select' && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === currentStep ? 'w-6 bg-primary' : s < currentStep ? 'w-2 bg-primary/50' : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
