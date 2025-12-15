import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Role = 'patient' | 'doctor' | 'hospital_owner' | 'pharmacy_owner' | 'lab_owner';

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
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('patient');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
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
    if (step === 1) return email && password.length >= 6;
    if (step === 2) return firstName && lastName;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
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
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <HeartPulse className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold">TeleMed</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8 max-w-md mx-auto w-full">
        {/* Mode Tabs */}
        <div className="flex bg-muted rounded-full p-1 mb-8">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Email & Password */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">
                  {mode === 'login' ? 'Karibu Tena!' : 'Unda Akaunti'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {mode === 'login' ? 'Ingia kuendelea' : 'Jisajili kupata huduma za afya'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="email@mfano.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pr-12"
                    placeholder="••••••••"
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
            </div>
          )}

          {/* Step 2: Name (Register only) */}
          {mode === 'register' && step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Taarifa Zako</h1>
                <p className="text-muted-foreground text-sm mt-1">Jina lako ni nani?</p>
              </div>
              
              <div className="space-y-2">
                <Label>Jina la Kwanza</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="John"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Jina la Familia</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="Doe"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Simu (Hiari)</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-xl"
                  placeholder="+255 7XX XXX XXX"
                />
              </div>
            </div>
          )}

          {/* Step 3: Role Selection (Register only) */}
          {mode === 'register' && step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Chagua Jukumu</h1>
                <p className="text-muted-foreground text-sm mt-1">Unatumia TeleMed kama nani?</p>
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
                      className={`p-4 rounded-2xl border-2 transition-all text-center ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
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
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {mode === 'login' ? (
              <Button
                type="submit"
                disabled={isLoading || !canProceed()}
                className="w-full h-12 rounded-xl text-base"
              >
                {isLoading ? 'Subiri...' : 'Ingia'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : step === 3 ? (
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base"
              >
                {isLoading ? 'Subiri...' : 'Unda Akaunti'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="w-full h-12 rounded-xl text-base"
              >
                Endelea
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
          </div>
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
