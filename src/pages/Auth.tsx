import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeartHandshake, Eye, EyeOff, User, Stethoscope, Building, Shield, Pill, TestTube, Hospital } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('patient');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Welcome!', description: 'Successfully logged in' });
        navigate('/dashboard');
      }
    } else {
      // First create auth user
      const { data, error } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        phone
      });
      
      if (error) {
        toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Then insert role into secure user_roles table
      if (data?.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: data.user.id, role: role as any }]);

        if (roleError) {
          console.error('Role insert error:', roleError);
          toast({ title: 'Error', description: 'Failed to set account role', variant: 'destructive' });
        }
      }

      toast({ title: 'Success!', description: 'Account created successfully. Please check your email.' });
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const nextStep = () => {
    if (mode === 'register') {
      if (step === 1 && email && password) setStep(2);
      else if (step === 2 && firstName && lastName) setStep(3);
      else if (step === 3 && role) handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TeleMed Smart</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-full">
              <button
                onClick={() => { setMode('login'); setStep(1); }}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setMode('register'); setStep(1); }}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'register' ? 'bg-blue-600 text-white' : 'text-gray-600'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Email & Password */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Name & Phone (Register only) */}
              {mode === 'register' && step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 rounded-xl"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 rounded-xl"
                      placeholder="Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 rounded-xl"
                      placeholder="+255 123 456 789"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Role Selection (Register only) */}
              {mode === 'register' && step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <Label>Select Your Role</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('patient')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'patient' 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm font-medium">Patient</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('doctor')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'doctor' 
                          ? 'border-green-600 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Stethoscope className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-sm font-medium">Doctor</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('hospital_owner')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'hospital_owner' 
                          ? 'border-purple-600 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Building className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-sm font-medium">Hospital Owner</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('pharmacy_owner')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'pharmacy_owner' 
                          ? 'border-pink-600 bg-pink-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Pill className="w-8 h-8 mx-auto mb-2 text-pink-600" />
                      <p className="text-sm font-medium">Pharmacy Owner</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('lab_owner')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'lab_owner' 
                          ? 'border-teal-600 bg-teal-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <TestTube className="w-8 h-8 mx-auto mb-2 text-teal-600" />
                      <p className="text-sm font-medium">Lab Owner</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('polyclinic_owner')}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        role === 'polyclinic_owner' 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Hospital className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                      <p className="text-sm font-medium">Polyclinic Owner</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {mode === 'login' || step === 3 ? (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                    </Button>
                    {step > 1 && (
                      <Button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        variant="outline"
                        className="w-full h-12 rounded-xl"
                      >
                        Back
                      </Button>
                    )}
                  </>
                )}
              </div>
            </form>

            {/* Progress Dots for Registration */}
            {mode === 'register' && (
              <div className="flex justify-center gap-2 mt-6">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
