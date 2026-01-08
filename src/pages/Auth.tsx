import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HeartPulse, 
  Eye, 
  EyeOff, 
  User, 
  Stethoscope, 
  Building2, 
  Pill, 
  FlaskConical,
  ChevronLeft,
  ArrowRight,
  Phone,
  Mail
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState(1);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const loginIdentifier = authMethod === 'email' ? email : phone;
        const { error } = await signIn(loginIdentifier, password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { data, error } = await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
          phone,
          role
        });
        
        if (error) throw error;

        if (data?.user) {
          await supabase.from('user_roles').insert([{ 
            user_id: data.user.id, 
            role: role as any 
          }]);
        }

        toast({ title: 'Umefanikiwa!', description: 'Angalia email yako.' });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ 
        title: 'Kosa', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (mode === 'login') {
      if (authMethod === 'email') return email && password.length >= 6;
      return phone && password.length >= 6;
    }
    if (step === 1) return email;
    if (step === 2) return password.length >= 6;
    if (step === 3) return firstName;
    if (step === 4) return lastName;
    return true;
  };

  const nextStep = () => {
    if (mode === 'register') {
      if (step < 6) setStep(step + 1);
      else handleSubmit();
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back button */}
      <header className="p-4 safe-area-top">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        {/* Logo - centered */}
        <div className="flex items-center gap-2 mb-12">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
            <HeartPulse className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl">TeleMed</span>
        </div>

        {/* Mode Tabs - clean underline style matching screenshot */}
        {((mode === 'login' && step === 1) || (mode === 'register' && step === 1)) && (
          <div className="flex gap-8 mb-6">
            <button
              onClick={() => { setMode('login'); setStep(1); }}
              className={`text-base font-medium pb-2 transition-all ${
                mode === 'login' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setStep(1); }}
              className={`text-base font-medium pb-2 transition-all ${
                mode === 'register' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          {/* LOGIN MODE */}
          {mode === 'login' && step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              {/* Auth method selector - matching screenshot */}
              <div className="flex gap-4 justify-center mb-4">
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex items-center gap-2 text-sm transition-all ${
                    authMethod === 'email' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`flex items-center gap-2 text-sm transition-all ${
                    authMethod === 'phone' 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  Phone
                </button>
              </div>
              
              {/* Input - clean underline style */}
              {authMethod === 'email' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder=""
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">Phone</span>
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="+255 7XX XXX XXX"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Password</span>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-0 border-b border-border rounded-none px-0 pr-8 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder=""
                    required
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

              <p className="text-xs text-muted-foreground text-center pt-4">
                By continuing, you agree to our Terms and Privacy Policy
              </p>

              <Button
                type="submit"
                disabled={isLoading || !canProceed()}
                className="w-full h-11 rounded-xl text-sm font-medium mt-6"
              >
                {isLoading ? 'Subiri...' : 'Ingia'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 1: Email */}
          {mode === 'register' && step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email yako</span>
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="mfano@email.com"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 2: Password */}
          {mode === 'register' && step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Password yako</span>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-0 border-b border-border rounded-none px-0 pr-8 focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="Angalau herufi 6"
                    required
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
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 3: First Name */}
          {mode === 'register' && step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Jina la kwanza</span>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="Jina lako"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 4: Last Name */}
          {mode === 'register' && step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Jina la familia</span>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  placeholder="Jina la ukoo"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 5: Phone (Optional) */}
          {mode === 'register' && step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Nambari ya simu (hiari)</span>
                </div>
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
                type="button"
                onClick={nextStep}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 6: Role Selection */}
          {mode === 'register' && step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <p className="text-sm text-muted-foreground text-center">Unatumia kama nani?</p>
              
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
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                {isLoading ? 'Subiri...' : 'Maliza'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </form>

        {/* Progress Dots */}
        {mode === 'register' && (
          <div className="flex justify-center gap-2 mt-10">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? 'w-6 bg-primary' : s < step ? 'w-2 bg-primary/50' : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
