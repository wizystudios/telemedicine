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
type LoginMethod = 'email' | 'phone';

const roles = [
  { id: 'patient', label: 'Mgonjwa', icon: User, color: 'bg-blue-500' },
  { id: 'doctor', label: 'Daktari', icon: Stethoscope, color: 'bg-green-500' },
  { id: 'hospital_owner', label: 'Hospitali', icon: Building2, color: 'bg-purple-500' },
  { id: 'pharmacy_owner', label: 'Famasi', icon: Pill, color: 'bg-pink-500' },
  { id: 'lab_owner', label: 'Maabara', icon: FlaskConical, color: 'bg-teal-500' },
];

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  
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
        const loginIdentifier = loginMethod === 'email' ? email : phone;
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
      if (loginMethod === 'email') return email && password.length >= 6;
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

  const totalSteps = mode === 'register' ? 6 : 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with back button */}
      <header className="flex items-center p-4 safe-area-top">
        {step > 1 || mode === 'login' ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else navigate('/');
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </header>

      {/* Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo - Centered */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">TeleMed</span>
        </div>

        {/* Mode Tabs - Only show on first step of login or register */}
        {((mode === 'login' && step === 1) || (mode === 'register' && step === 1)) && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => { setMode('login'); setStep(1); }}
              className={`text-sm font-medium pb-1 transition-all ${
                mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Ingia
            </button>
            <button
              onClick={() => { setMode('register'); setStep(1); }}
              className={`text-sm font-medium pb-1 transition-all ${
                mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Jisajili
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
          {/* LOGIN MODE */}
          {mode === 'login' && step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              {/* Login method selector */}
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                    loginMethod === 'email' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                    loginMethod === 'phone' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Simu
                </button>
              </div>
              
              {loginMethod === 'email' ? (
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl text-sm"
                  placeholder="Email yako"
                  required
                />
              ) : (
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl text-sm"
                  placeholder="+255 7XX XXX XXX"
                  required
                />
              )}
              
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl text-sm pr-10"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !canProceed()}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                {isLoading ? 'Subiri...' : 'Ingia'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 1: Email */}
          {mode === 'register' && step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Email yako</p>
              
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-sm"
                placeholder="mfano@email.com"
                required
                autoFocus
              />

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 2: Password */}
          {mode === 'register' && step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Password yako</p>
              
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl text-sm pr-10"
                  placeholder="Angalau herufi 6"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 3: First Name */}
          {mode === 'register' && step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Jina la kwanza</p>
              
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 rounded-xl text-sm"
                placeholder="Jina lako"
                required
                autoFocus
              />

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 4: Last Name */}
          {mode === 'register' && step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Jina la familia</p>
              
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 rounded-xl text-sm"
                placeholder="Jina la ukoo"
                required
                autoFocus
              />

              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 5: Phone (Optional) */}
          {mode === 'register' && step === 5 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Nambari ya simu (hiari)</p>
              
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-xl text-sm"
                placeholder="+255 7XX XXX XXX"
                autoFocus
              />

              <Button
                type="button"
                onClick={nextStep}
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Endelea
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 6: Role Selection */}
          {mode === 'register' && step === 6 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <p className="text-center text-sm text-muted-foreground">Unatumia kama nani?</p>
              
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as Role)}
                      className={`p-3 rounded-xl transition-all text-center ${
                        isSelected 
                          ? 'bg-primary/10 ring-2 ring-primary' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-full ${r.color} mx-auto mb-1.5 flex items-center justify-center`}>
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
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                {isLoading ? 'Subiri...' : 'Maliza'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </form>

        {/* Progress Dots */}
        {mode === 'register' && (
          <div className="flex justify-center gap-1.5 mt-8">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-4 bg-primary' : s < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}