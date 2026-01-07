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
    if (step === 1) return email && password.length >= 6;
    if (step === 2) return firstName && lastName;
    return true;
  };

  const totalSteps = mode === 'register' ? 3 : 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 safe-area-top">
        {step > 1 && mode === 'register' ? (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <HeartPulse className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">TeleMed</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        {/* Mode Tabs - Only show in step 1 */}
        {step === 1 && (
          <div className="flex bg-muted rounded-full p-1 mb-8 max-w-xs mx-auto">
            <button
              onClick={() => { setMode('login'); setStep(1); }}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Ingia
            </button>
            <button
              onClick={() => { setMode('register'); setStep(1); }}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Jisajili
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto w-full">
          {/* LOGIN MODE */}
          {mode === 'login' && step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Karibu Tena!</h1>
                <p className="text-muted-foreground">Ingia kuendelea</p>
              </div>

              {/* Login method selector */}
              <div className="flex gap-2 justify-center mb-6">
                <Button
                  type="button"
                  variant={loginMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoginMethod('email')}
                  className="rounded-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoginMethod('phone')}
                  className="rounded-full"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Simu
                </Button>
              </div>
              
              {loginMethod === 'email' ? (
                <div className="space-y-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                    placeholder="Email yako"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                    placeholder="+255 7XX XXX XXX"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5 pr-12"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !canProceed()}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                {isLoading ? 'Subiri...' : 'Ingia'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 1: Email & Password */}
          {mode === 'register' && step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Unda Akaunti</h1>
                <p className="text-muted-foreground">Email na password yako</p>
              </div>
              
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                placeholder="Email yako"
                required
              />
              
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5 pr-12"
                  placeholder="Password (angalau herufi 6)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceed()}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                Endelea
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 2: Name & Phone */}
          {mode === 'register' && step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Taarifa Zako</h1>
                <p className="text-muted-foreground">Jina lako ni nani?</p>
              </div>
              
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                placeholder="Jina la Kwanza"
                required
              />
              
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                placeholder="Jina la Familia"
                required
              />
              
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 rounded-2xl text-base bg-muted/50 border-0 px-5"
                placeholder="Simu (hiari) +255 7XX XXX XXX"
              />

              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canProceed()}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                Endelea
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* REGISTER MODE - Step 3: Role Selection */}
          {mode === 'register' && step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Chagua Jukumu</h1>
                <p className="text-muted-foreground">Unatumia TeleMed kama nani?</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as Role)}
                      className={`p-4 rounded-2xl transition-all text-center ${
                        isSelected 
                          ? 'bg-primary/10 ring-2 ring-primary' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-full ${r.color} mx-auto mb-2 flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-sm font-medium">{r.label}</p>
                    </button>
                  );
                })}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                {isLoading ? 'Subiri...' : 'Unda Akaunti'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}
        </form>

        {/* Progress Dots */}
        {mode === 'register' && (
          <div className="flex justify-center gap-2 mt-8">
            {[1, 2, 3].map((s) => (
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